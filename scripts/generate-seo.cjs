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

const pages = [
  ['index.html', 'Seattle Real Estate Advisor | Emily Hawkins | Seattle At Home', 'Thoughtful Seattle real estate guidance from Emily Hawkins of Coldwell Banker Danforth. Explore buying, selling, local stories, and a free introductory call.', 'Home', 'WebPage'],
  ['about.html', 'About Emily Hawkins | Seattle Real Estate Advisor', 'Meet Emily Hawkins, a Seattle real estate broker with an investor’s perspective, personal guidance, and an advice-first approach to your next home decision.', 'About Emily', 'AboutPage'],
  ['buy.html', 'Buy a Home in Seattle | Emily Hawkins | Seattle At Home', 'Explore Emily Hawkins’s six-step homebuying process, from goals and finances to offers and closing. Serving Seattle and surrounding areas.', 'Buying a home', 'WebPage'],
  ['sell.html', 'Sell Your Seattle Home | Emily Hawkins | Seattle At Home', 'Plan your Seattle home sale with Emily Hawkins: thoughtful pricing, selective preparation, photography, video, and clear guidance through closing.', 'Selling a home', 'WebPage'],
  ['stories.html', 'Seattle Real Estate Client Stories | Emily Hawkins', 'Explore seven buyer and seller stories from Seattle, Woodinville, and Kirkland, with property photos and the decisions behind each move.', 'Client stories', 'CollectionPage'],
  ['blog.html', 'Seattle Homes & Neighborhood Blog | Seattle At Home', 'Browse Emily Hawkins’s Seattle At Home journal for local life, neighborhoods, homebuying, selling, and real estate insights. Check each article’s date.', 'Blog', 'CollectionPage'],
  ['blog-post.html', 'Seattle Real Estate Articles | Emily Hawkins', 'Read Emily Hawkins’s Seattle At Home journal. Explore local life, neighborhoods, and real estate decisions with publication dates and context.', 'Article', 'WebPage'],
  ['videos.html', 'Seattle Neighborhood Videos | Emily Hawkins', 'Watch Emily Hawkins’s curated videos on Bainbridge Island, Alki Beach, and exploring a neighborhood, plus Instagram reels and official social links.', 'Videos', 'CollectionPage'],
  ['start-here.html', 'Seattle Home Buying & Selling Quizzes | Emily Hawkins', 'Explore four short quizzes about buying, selling, working with Emily Hawkins, and your housing priorities. See your results without an email gate.', 'Start here', 'CollectionPage'],
  ['quiz.html', 'Seattle Real Estate Priorities Quiz | Emily Hawkins', 'Think through your homebuying, selling, or neighborhood priorities with a short Seattle At Home quiz. Results are informational and available without email.', 'Quiz', 'WebPage'],
  ['contact.html', 'Contact Emily Hawkins | Seattle Real Estate Consultation', 'Call 425-587-8838 or book a free 45-minute introductory video call with Emily Hawkins, Coldwell Banker Danforth, Bellevue office.', 'Contact', 'ContactPage'],
  ['privacy.html', 'Privacy & Accessibility | Seattle At Home', 'Read Seattle At Home’s privacy policy, newsletter and booking information practices, and accessibility contact options for Emily Hawkins.', 'Privacy and accessibility', 'WebPage'],
  ['story.html', 'Client Story Preview | Seattle At Home', 'This client story detail is a preview. Visit the Client Stories page for Emily Hawkins’s seven current buyer and seller property stories.', 'Story preview', 'WebPage'],
  ['404.html', 'Page Not Found | Seattle At Home', 'This page could not be found. Explore Seattle At Home’s buying, selling, client stories, videos, and contact information for Emily Hawkins.', 'Page not found', 'WebPage'],
];

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
