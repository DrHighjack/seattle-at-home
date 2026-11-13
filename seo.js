function updatePageSeo({ title, description, url, image, article }) {
  document.title = title;
  const setMeta = (selector, content) => {
    const element = document.head.querySelector(selector);
    if (element) element.content = content;
  };
  setMeta('meta[name="description"]', description);
  setMeta('meta[property="og:title"]', title);
  setMeta('meta[property="og:description"]', description);
  setMeta('meta[property="og:url"]', url);
  setMeta('meta[property="og:type"]', article ? 'article' : 'website');
  setMeta('meta[name="twitter:title"]', title);
  setMeta('meta[name="twitter:description"]', description);
  document.head.querySelector('link[rel="canonical"]').href = url;
  if (image) {
    setMeta('meta[property="og:image"]', image);
    setMeta('meta[name="twitter:image"]', image);
  }
  const structured = document.querySelector('#site-structured-data');
  const data = JSON.parse(structured.textContent);
  const page = data['@graph'].find((node) => node.isPartOf);
  Object.assign(page, { '@id': `${url}#webpage`, url, name: title, description });
  const breadcrumbs = data['@graph'].find((node) => node['@type'] === 'BreadcrumbList');
  if (breadcrumbs) {
    breadcrumbs.itemListElement = [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://seattleathome.com/' },
      { '@type': 'ListItem', position: 2, name: article ? 'Blog' : 'Start here', item: article ? 'https://seattleathome.com/blog.html' : 'https://seattleathome.com/start-here.html' },
      { '@type': 'ListItem', position: 3, name: title.split(' | ')[0], item: url },
    ];
  }
  data['@graph'] = data['@graph'].filter((node) => node['@type'] !== 'BlogPosting');
  if (article) {
    data['@graph'].push({
      '@type': 'BlogPosting',
      '@id': `${url}#article`,
      headline: article.headline,
      description,
      url,
      mainEntityOfPage: { '@id': `${url}#webpage` },
      author: { '@id': 'https://seattleathome.com/#emily-hawkins' },
      publisher: { '@id': 'https://seattleathome.com/#business' },
      ...(image ? { image } : {}),
      // Imported WordPress dates have no timezone; do not invent one.
      ...(article.date ? { datePublished: article.date.slice(0, 10) } : {}),
      ...(article.modified ? { dateModified: article.modified.slice(0, 10) } : {}),
    });
  }
  structured.textContent = JSON.stringify(data);
}
