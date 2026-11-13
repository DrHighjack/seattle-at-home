const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const publicFiles = fs.readdirSync(root).filter((file) => file.endsWith('.html')
  && !['editor.html', 'quiz-studio.html'].includes(file));

test('selected script titles use the supplied self-hosted Eyesome Script font', () => {
  const css = fs.readFileSync(path.join(root, 'styles.css'), 'utf8');
  const face = css.match(/@font-face\s*\{[^}]*font-family: 'Eyesome Script';[^}]*\}/)?.[0];
  assert.ok(face, 'missing Eyesome Script font-face');
  assert.ok(face.includes("url('assets/fonts/eyesome-script.otf') format('opentype')"));
  assert.ok(face.includes('font-weight: 400;'));
  assert.ok(face.includes('font-display: swap;'));
  const font = fs.readFileSync(path.join(root, 'assets/fonts/eyesome-script.otf'));
  assert.equal(font.toString('ascii', 0, 4), 'OTTO');
  assert.ok(css.includes("--script: 'Eyesome Script',"));
  for (const file of publicFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.includes('styles.css?v=seller-questions-1'), `${file} missing refreshed stylesheet`);
  }
});

test('all public footers include the supplied combined brokerage mark', () => {
  const asset = 'assets/coldwell-banker-danforth-global-luxury.webp';
  assert.ok(fs.existsSync(path.join(root, asset)));
  for (const file of publicFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)?.[0];
    assert.ok(footer?.includes(`src="${asset}"`), `${file} missing brokerage mark in footer`);
    assert.ok(footer.includes('alt="Coldwell Banker Danforth — Global Luxury"'));
    assert.equal((footer.match(/class="brokerage-branding"/g) || []).length, 1);
  }
});

test('all public pages have unique static metadata and parseable business schema', () => {
  const titles = new Set();
  const descriptions = new Set();
  assert.equal(publicFiles.length, 14);
  for (const file of publicFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const title = html.match(/<title>(.*?)<\/title>/s)[1];
    const description = html.match(/<meta name="description" content="([^"]+)">/)[1];
    assert.equal(titles.has(title), false, `${file} duplicate title`);
    assert.equal(descriptions.has(description), false, `${file} duplicate description`);
    titles.add(title);
    descriptions.add(description);
    assert.equal((html.match(/<link rel="canonical"/g) || []).length, 1);
    const canonical = html.match(/<link rel="canonical" href="([^"]+)">/)[1];
    assert.equal(canonical, `https://seattleathome.com/${file === 'index.html' ? '' : file}`);
    for (const name of ['og:title', 'og:description', 'og:url', 'og:image', 'twitter:card']) {
      assert.ok(html.includes(`="${name}"`), `${file} missing ${name}`);
    }
    assert.ok(html.includes('content="noindex,nofollow"'));
    const data = JSON.parse(html.match(/<script id="site-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    const business = data['@graph'].find((node) => node['@type'] === 'RealEstateAgent');
    assert.equal(business.telephone, '+1-425-587-8838');
    assert.equal(business.email, 'emily@seattlathome.com');
    assert.equal(business.areaServed.name, 'Seattle and surrounding areas');
    for (const absent of ['address', 'aggregateRating', 'review', 'openingHours', 'geo']) {
      assert.equal(business[absent], undefined);
    }
    assert.ok(html.includes('mailto:emily@seattlathome.com'));
    assert.ok(html.includes('tel:+14255878838'));
  }
});

test('approved brokerage copy and supplied statistics replace the corresponding placeholders', () => {
  const statement = 'Seattle At Home is an Equal Housing Opportunity brokerage and complies with all federal, state, and local fair housing laws.';
  for (const file of publicFiles) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    const footer = html.match(/<footer\b[^>]*>[\s\S]*?<\/footer>/)[0];
    assert.ok(footer.includes(statement), `${file} missing approved fair-housing statement`);
    assert.ok(footer.includes('<span>Broker</span>'), `${file} missing confirmed title`);
    assert.doesNotMatch(html, /\[WA LICENSE #\]|\[LICENSE #\]|\[EHO|\[CONFIRM TITLE/);
    const schema = JSON.parse(html.match(/<script id="site-structured-data" type="application\/ld\+json">([\s\S]*?)<\/script>/)[1]);
    assert.equal(schema['@graph'].find((node) => node['@type'] === 'Person').jobTitle, 'Broker');
  }
  for (const file of ['index.html', 'about.html', 'sell.html']) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    assert.ok(html.includes('<span class="source-20">8</span><span>Homes sold in 2026 so far</span>'));
    assert.doesNotMatch(html, /Illustrative demo figures only/);
    if (file !== 'sell.html') {
      assert.ok(html.includes('<span class="source-20">2022</span><span>Licensed since</span>'));
      assert.doesNotMatch(html, /3 years licensed|>Years licensed</);
      assert.ok(html.includes('<span class="source-20">4.9</span><span>Stars across 55 reviews</span>'));
    } else {
      assert.ok(html.includes('<span class="source-20">18</span><span>Average days on market in 2025</span>'));
      assert.ok(html.includes('<span class="source-20">99%</span><span>List-to-sale price ratio in 2025</span>'));
      assert.doesNotMatch(html, /Illustrative story outcome|Sold in 18 days with multiple offers/);
      assert.ok(html.includes('Amy Schwab · 5-star Google review'));
    }
  }
  const about = fs.readFileSync(path.join(root, 'about.html'), 'utf8');
  assert.ok(about.includes('<li class="source-136">Licensed since 2022</li>'));
  const privacy = fs.readFileSync(path.join(root, 'privacy.html'), 'utf8');
  assert.doesNotMatch(privacy, /Draft for review|draft privacy policy|This draft describes/);
  assert.ok(privacy.includes('id="accessibility"'));
});

test('sitemap contains only real core pages, built-in quizzes, and archive slugs', () => {
  const xml = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
  const urls = [...xml.matchAll(/<loc>(.*?)<\/loc>/g)].map((match) => match[1].replaceAll('&amp;', '&'));
  assert.equal(urls.length, 139);
  assert.equal(new Set(urls).size, urls.length);
  const archive = JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8'));
  const slugs = new Set(archive.posts.map((post) => post.slug));
  for (const entry of urls) {
    const url = new URL(entry);
    assert.equal(url.origin, 'https://seattleathome.com');
    if (url.pathname === '/blog-post.html') {
      assert.ok(slugs.has(url.searchParams.get('slug')));
    } else if (url.pathname === '/quiz.html') {
      assert.ok(['fit', 'buy', 'sell', 'places'].includes(url.searchParams.get('type')));
    }
    assert.ok(fs.existsSync(path.join(root, url.pathname === '/' ? 'index.html' : url.pathname.slice(1))));
    assert.equal(/\/(?:editor|quiz-studio|404|story)\.html/.test(url.pathname), false);
  }
});

test('preview blocking remains and llms describes confirmed canonical domain', () => {
  assert.match(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'), /User-agent: \*\s+Disallow: \//);
  assert.match(fs.readFileSync(path.join(root, 'robots.txt'), 'utf8'), /Sitemap: https:\/\/seattleathome\.com\/sitemap\.xml/);
  assert.match(fs.readFileSync(path.join(root, 'llms.txt'), 'utf8'), /owner-confirmed canonical production origin is https:\/\/seattleathome\.com/);
});

test('regenerating SEO output is byte-for-byte stable', () => {
  const { execFileSync } = require('node:child_process');
  const outputs = [...publicFiles, 'sitemap.xml'];
  const readOutputs = () => outputs.map((file) => fs.readFileSync(path.join(root, file), 'utf8'));
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-seo.cjs')]);
  const first = readOutputs();
  execFileSync(process.execPath, [path.join(root, 'scripts/generate-seo.cjs')]);
  assert.deepEqual(readOutputs(), first);
});
