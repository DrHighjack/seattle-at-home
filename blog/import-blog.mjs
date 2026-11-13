import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';

const execFileAsync = promisify(execFile);
const siteOrigin = 'https://seattleathome.com';
const apiOrigin = `${siteOrigin}/wp-json/wp/v2`;
const outputDirectory = path.resolve('blog');
const imageDirectory = path.join(outputDirectory, 'images');
const perPage = 100;
const imageSources = new Map();
const imageJobs = new Map();

async function curlBuffer(url) {
  const { stdout } = await execFileAsync('curl', ['-fsSL', '--retry', '2', '--max-time', '45', url], {
    encoding: 'buffer',
    maxBuffer: 30 * 1024 * 1024,
  });
  return stdout;
}

async function fetchJson(url) {
  return JSON.parse((await curlBuffer(url)).toString('utf8'));
}

function trustedImageUrl(value) {
  try {
    const url = new URL(value);
    return ['seattleathome.com', 'www.seattleathome.com'].includes(url.hostname)
      && url.pathname.startsWith('/wp-content/uploads/')
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function imageExtension(value) {
  const pathname = new URL(value).pathname;
  return path.extname(pathname).toLowerCase() || '.jpg';
}

function planImage(url, filename) {
  const trustedUrl = trustedImageUrl(url);
  if (!trustedUrl) return null;
  if (!imageJobs.has(trustedUrl)) imageJobs.set(trustedUrl, filename);
  return imageJobs.get(trustedUrl);
}

async function fetchAllPosts() {
  const posts = [];
  for (let page = 1; ; page += 1) {
    const params = new URLSearchParams({
      per_page: String(perPage),
      page: String(page),
      _fields: 'id,date,modified,slug,link,title,excerpt,content,featured_media,categories,tags',
    });
    const batch = await fetchJson(`${apiOrigin}/posts?${params}`);
    if (!Array.isArray(batch)) throw new Error(`Unexpected post response on page ${page}`);
    posts.push(...batch);
    if (batch.length < perPage) break;
  }
  return posts;
}

async function fetchTerms(endpoint, ids) {
  const results = new Map();
  const uniqueIds = [...new Set(ids)].filter(Number.isFinite);
  for (let index = 0; index < uniqueIds.length; index += 80) {
    const params = new URLSearchParams({
      include: uniqueIds.slice(index, index + 80).join(','),
      per_page: '100',
      _fields: 'id,name,slug',
    });
    const batch = await fetchJson(`${apiOrigin}/${endpoint}?${params}`);
    for (const term of batch) results.set(term.id, { id: term.id, name: term.name, slug: term.slug });
  }
  return results;
}

async function fetchMedia(ids) {
  const results = new Map();
  const uniqueIds = [...new Set(ids)].filter((id) => Number.isInteger(id) && id > 0);
  for (let index = 0; index < uniqueIds.length; index += 80) {
    const params = new URLSearchParams({
      include: uniqueIds.slice(index, index + 80).join(','),
      per_page: '100',
      _fields: 'id,source_url,alt_text,media_details',
    });
    const batch = await fetchJson(`${apiOrigin}/media?${params}`);
    for (const media of batch) results.set(media.id, media);
  }
  return results;
}

function selectImage(media) {
  const sizes = media.media_details?.sizes || {};
  return sizes.medium_large?.source_url
    || sizes.large?.source_url
    || sizes.medium?.source_url
    || media.source_url;
}

async function rewriteInlineImages(post) {
  let imageIndex = 0;
  const body = post.content?.rendered || '';
  return body.replace(/<img\b[^>]*>/gi, (tag) => tag.replace(/\bsrc=(['"])(.*?)\1/i, (srcAttribute, quote, src) => {
    const trustedUrl = trustedImageUrl(src);
    if (!trustedUrl) return srcAttribute;
    const relativePath = planImage(trustedUrl, `images/inline-${post.id}-${imageIndex++}${imageExtension(trustedUrl)}`);
    return relativePath ? `src=${quote}${relativePath}${quote}` : srcAttribute;
  }));
}

async function downloadImages() {
  await mkdir(imageDirectory, { recursive: true });
  const tasks = [...imageJobs.entries()];
  let completed = 0;
  let failed = 0;
  let next = 0;
  const worker = async () => {
    while (next < tasks.length) {
      const [url, relativePath] = tasks[next++];
      const destination = path.resolve(outputDirectory, relativePath);
      try {
        await stat(destination);
      } catch {
        await mkdir(path.dirname(destination), { recursive: true });
        try {
          await execFileAsync('curl', ['-fLsS', '--retry', '2', '--max-time', '45', url, '-o', destination], {
            maxBuffer: 2 * 1024 * 1024,
          });
        } catch (error) {
          failed += 1;
          console.warn(`Image download failed: ${url} (${error.code || error.message})`);
          continue;
        }
      }
      completed += 1;
    }
  };
  await Promise.all(Array.from({ length: 6 }, worker));
  return { completed, failed };
}

const posts = await fetchAllPosts();
const categoryIds = posts.flatMap((post) => post.categories || []);
const tagIds = posts.flatMap((post) => post.tags || []);
const [categories, tags, media] = await Promise.all([
  fetchTerms('categories', categoryIds),
  fetchTerms('tags', tagIds),
  fetchMedia(posts.map((post) => post.featured_media)),
]);

for (const post of posts) {
  const mediaRecord = media.get(post.featured_media);
  if (!mediaRecord) continue;
  const source = selectImage(mediaRecord);
  const relativePath = planImage(source, `images/featured-${mediaRecord.id}${imageExtension(source)}`);
  if (relativePath) imageSources.set(post.id, relativePath);
}

const records = [];
for (const post of posts) {
  const content = await rewriteInlineImages(post);
  const mediaRecord = media.get(post.featured_media);
  records.push({
    id: post.id,
    slug: post.slug,
    url: post.link,
    date: post.date,
    modified: post.modified,
    titleHtml: post.title?.rendered || '',
    excerptHtml: post.excerpt?.rendered || '',
    contentHtml: content,
    featuredImage: imageSources.get(post.id) || mediaRecord?.source_url || '',
    featuredImageAlt: mediaRecord?.alt_text || '',
    categories: (post.categories || []).map((id) => categories.get(id)).filter(Boolean),
    tags: (post.tags || []).map((id) => tags.get(id)).filter(Boolean),
  });
}

const imageStats = await downloadImages();
await writeFile(path.join(outputDirectory, 'posts.json'), JSON.stringify({
  source: siteOrigin,
  importedAt: new Date().toISOString(),
  total: records.length,
  posts: records,
}, null, 2));

console.log(`Imported ${records.length} posts from ${siteOrigin}.`);
console.log(`Local images: ${imageStats.completed}; failed downloads: ${imageStats.failed}.`);
console.log(`Archive: ${path.join(outputDirectory, 'posts.json')}`);
