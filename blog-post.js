const postTitle = document.querySelector('#blog-post-title');
const postCategory = document.querySelector('#blog-post-category');
const postMeta = document.querySelector('#blog-post-meta');
const postContent = document.querySelector('#blog-post-content');
const featuredWrap = document.querySelector('#blog-featured-image');
const featuredImage = document.querySelector('#blog-featured-img');
const tagsWrap = document.querySelector('#blog-post-tags');
const sourceSite = 'https://seattleathome.com';

function plainText(html) {
  const parsed = new DOMParser().parseFromString(html || '', 'text/html');
  parsed.querySelectorAll('script,style,iframe,object,embed,form,svg').forEach((node) => node.remove());
  return parsed.body.textContent.replace(/\s+/g, ' ').trim();
}

function formattedDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function localDraftFor(postId) {
  try {
    const saved = JSON.parse(localStorage.getItem('seattle-at-home-editor-v1'));
    return saved?.pages?.find((page) => page.id === `blog-${postId}`) || null;
  } catch {
    return null;
  }
}

function sanitizeArticle(html, postByPath) {
  const parsed = new DOMParser().parseFromString(html || '', 'text/html');
  parsed.querySelectorAll('script,style,iframe,object,embed,form,svg').forEach((node) => node.remove());
  parsed.body.querySelectorAll('*').forEach((node) => {
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      if (name.startsWith('on') || ['style', 'srcdoc', 'srcset'].includes(name)) node.removeAttribute(attribute.name);
    });
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (/^\s*javascript:/i.test(href) || /^\s*data:/i.test(href)) {
        node.removeAttribute('href');
      } else if (href) {
        try {
          const url = new URL(href, sourceSite);
          const matchingPost = postByPath.get(url.pathname.replace(/\/$/, ''));
          if (matchingPost) node.setAttribute('href', `blog-post.html?slug=${encodeURIComponent(matchingPost.slug)}`);
          else if (url.origin !== location.origin) {
            node.setAttribute('target', '_blank');
            node.setAttribute('rel', 'noopener noreferrer');
          }
        } catch {
          node.removeAttribute('href');
        }
      }
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (src.startsWith('images/')) node.setAttribute('src', `blog/${src}`);
      node.loading = 'lazy';
      node.decoding = 'async';
      if (!node.alt) node.alt = '';
    }
  });
  return parsed.body.innerHTML;
}

async function loadBlogPost() {
  try {
    const response = await fetch('blog/posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Blog archive unavailable');
    const archive = await response.json();
    if (!Array.isArray(archive.posts)) throw new Error('Invalid blog archive');
    const postByPath = new Map(archive.posts.map((post) => {
      const pathname = new URL(post.url, sourceSite).pathname.replace(/\/$/, '');
      return [pathname, post];
    }));
    const slug = new URLSearchParams(location.search).get('slug');
    const post = archive.posts.find((item) => item.slug === slug);
    if (!post) throw new Error('Article not found');
    const localDraft = localDraftFor(post.id);
    if (localDraft) {
      post.titleHtml = escapeHtml(localDraft.headline || plainText(post.titleHtml));
      post.excerptHtml = escapeHtml(localDraft.intro || '');
      post.contentHtml = localDraft.body || '';
      post.featuredImage = localDraft.image || '';
      post.featuredImageAlt = localDraft.imageAlt || '';
    }

    const title = plainText(post.titleHtml);
    const excerpt = plainText(post.excerptHtml) || plainText(post.contentHtml);
    const description = excerpt.length > 160 ? `${excerpt.slice(0, 157).trimEnd()}…` : excerpt;
    const canonical = `https://seattleathome.com/blog-post.html?slug=${encodeURIComponent(post.slug)}`;
    const imagePath = post.featuredImage?.startsWith('images/') ? `blog/${post.featuredImage}` : post.featuredImage;
    updatePageSeo({
      title: `${title} | Seattle At Home`,
      description,
      url: canonical,
      image: imagePath ? new URL(imagePath, 'https://seattleathome.com/').href : undefined,
      article: { headline: title, date: post.date, modified: post.modified },
    });
    postTitle.textContent = title;
    postMeta.textContent = `Emily Hawkins · ${formattedDate(post.date)}`;
    postCategory.textContent = post.categories?.[0]?.name || 'Seattle At Home Journal';
    if (post.featuredImage) {
      featuredImage.src = post.featuredImage.startsWith('images/') ? `blog/${post.featuredImage}` : post.featuredImage;
      featuredImage.alt = post.featuredImageAlt || '';
      featuredWrap.hidden = false;
    }
    postContent.innerHTML = sanitizeArticle(post.contentHtml, postByPath);
    postContent.setAttribute('aria-busy', 'false');
    tagsWrap.replaceChildren();
    (post.tags || []).slice(0, 8).forEach((tag) => {
      const label = document.createElement('span');
      label.textContent = tag.name;
      tagsWrap.append(label);
    });
  } catch {
    document.title = 'Article unavailable | Seattle At Home';
    postTitle.textContent = 'Article unavailable';
    postMeta.textContent = '';
    postContent.textContent = 'This article could not be loaded. Return to the archive and try another post.';
    postContent.setAttribute('aria-busy', 'false');
  }
}

loadBlogPost();