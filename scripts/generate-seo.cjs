const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const origin = 'https://seattleathome.com';
const businessId = `${origin}/#business`;
const personId = `${origin}/#emily-hawkins`;
const image = `${origin}/emily-hawkins.webp`;
const escape = (value) => String(value).replace(/[&<>"']/g, (char) => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[char]);
const json = (value) => JSON.stringify(value).replace(/</g, '\\u003c');

const { pages } = JSON.parse(fs.readFileSync(path.join(root, 'content/page-metadata.json'), 'utf8'));

const business = {
  '@type': 'RealEstateAgent',
  '@id': businessId,
  name: 'Seattle At Home - Emily Hawkins',
  url: `${origin}/`,
  description: 'Advice-first real estate guidance for buying, selling, and thoughtful home decisions in Seattle and surrounding areas.',
  telephone: '+1-425-587-8838',
  email: 'emily@seattlathome.com',
  image,
  logo: `${origin}/assets/seattle-at-home-logo.webp`,
  areaServed: { '@type': 'Place', name: 'Seattle and surrounding areas' },
  parentOrganization: { '@type': 'Organization', name: 'Coldwell Banker Danforth' },
  sameAs: [
    'https://www.instagram.com/emilyhawkinshomes/',
    'https://www.youtube.com/@EmilyHawkinsHomes',
  ],
};
const person = {
  '@type': 'Person', '@id': personId, name: 'Emily Hawkins',
  jobTitle: 'Broker', url: `${origin}/about.html`, image,
  worksFor: { '@type': 'Organization', name: 'Coldwell Banker Danforth' },
};

for (const [file, title, description, label, type] of pages) {
  const url = `${origin}/${file === 'index.html' ? '' : file}`;
  const graph = [
    business,
    person,
    {
      '@type': 'WebSite', '@id': `${origin}/#website`, url: `${origin}/`,
      name: 'Seattle At Home', publisher: { '@id': businessId }, inLanguage: 'en-US',
    },
    {
      '@type': type, '@id': `${url}#webpage`, url, name: title, description,
      isPartOf: { '@id': `${origin}/#website` },
      about: { '@id': businessId }, inLanguage: 'en-US',
    },
  ];
  if (file !== 'index.html') {
    graph.push({
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: `${origin}/` },
        { '@type': 'ListItem', position: 2, name: label, item: url },
      ],
    });
  }
  const metadata = `
<!-- seo:start -->
<meta name="description" content="${escape(description)}">
<link rel="canonical" href="${url}">
<meta property="og:type" content="website">
<meta property="og:site_name" content="Seattle At Home">
<meta property="og:locale" content="en_US">
<meta property="og:title" content="${escape(title)}">
<meta property="og:description" content="${escape(description)}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${image}">
<meta property="og:image:alt" content="Emily Hawkins, Seattle At Home real estate broker">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${escape(title)}">
<meta name="twitter:description" content="${escape(description)}">
<meta name="twitter:image" content="${image}">
<script id="site-structured-data" type="application/ld+json">${json({ '@context': 'https://schema.org', '@graph': graph })}</script>
<!-- seo:end -->
`;
  const filename = path.join(root, file);
  let html = fs.readFileSync(filename, 'utf8');
  html = html.replace(/\s*<!-- seo:start -->[\s\S]*?<!-- seo:end -->\s*/g, '');
  html = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${escape(title)}</title>`);
  if (file === 'quiz.html' && !html.includes('src="seo.js?v=1"')) {
    html = html.replace(/<script src="app\.js/, '<script src="seo.js?v=1" defer></script><script src="app.js');
  }
  html = html.replace('</head>', `${metadata}</head>`);
  fs.writeFileSync(filename, html);
}

const archive = JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8'));
const urls = pages
  .filter(([file]) => !['404.html', 'story.html', 'quiz.html', 'blog-post.html'].includes(file))
  .map(([file]) => `${origin}/${file === 'index.html' ? '' : file}`);
for (const kind of ['fit', 'buy', 'sell', 'places']) {
  urls.push(`${origin}/quiz.html?type=${kind}`);
}
const quizContent = JSON.parse(fs.readFileSync(path.join(root, 'content/quizzes.json'), 'utf8'));
for (const quiz of quizContent.custom) {
  urls.push(`${origin}/quiz.html?type=${encodeURIComponent(`custom-${quiz.id}`)}`);
}
for (const post of archive.posts) {
  urls.push(`${origin}/blog-post.html?slug=${encodeURIComponent(post.slug)}`);
}
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((url) => `  <url><loc>${escape(url)}</loc></url>`).join('\n')}
</urlset>
`;
fs.writeFileSync(path.join(root, 'sitemap.xml'), sitemap);
console.log(`Updated ${pages.length} page heads and generated ${urls.length} sitemap URLs. Preview noindex remains unchanged.`);
