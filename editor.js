const storageKey = 'seattle-at-home-editor-v1';
const brandPresets = new Set(['ivory', 'navy', 'teal', 'gold', 'terracotta']);
const templateNames = {
  page: 'Standard page',
  neighborhood: 'Neighborhood guide',
  story: 'Blog post / client story',
};

const starterPages = [
  { id: 'home', name: 'Home', slug: 'index', template: 'page', headline: 'Real estate in Seattle. A community that feels like home.', intro: 'I help people buy and sell around Seattle, with thoughtful local guidance and relationships that matter long after moving day.', body: 'Seattle At Home is built around a simple idea: real estate can bring good people together. I want this to feel less like a pipeline and more like a community you’re glad to be part of.', image: 'emily-hawkins.webp', imageAlt: 'Emily Hawkins smiling beside a laptop at a kitchen island', builtIn: true },
  { id: 'about', name: 'About', slug: 'about', template: 'page', headline: 'I believe real estate should make people feel more at home.', intro: 'I’m Emily Hawkins, a Seattle-area real estate broker. I help people make thoughtful moves and build relationships that last beyond the transaction.', body: 'Seattle At Home is shaped by a belief that real estate can be personal, local, and rooted in community. I’d rather know the people I work with well than build a business around volume.\n\nBuying or selling a home is a big deal. My job is to make it feel manageable, be honest about the choices, and stay in your corner after moving day.', image: 'assets/emily-branding/Sade%20Photography/Branding%20Session%20with%20Emily%20(Web%20Size)/Outside%20Lula%27s/DSC_4343.jpg', imageAlt: 'Emily smiling outside Lula’s in a Seattle at Home cap', builtIn: true },
  { id: 'buy', name: 'Buy', slug: 'buy', template: 'page', headline: 'I’ll help you buy with a clear plan and no surprises.', intro: 'First home or fifth, we’ll start with how you want to live, then build the search around it.', body: 'We meet, talk through your goals, and put our working agreement in writing before we tour. I’ll help you compare homes, understand offers, and keep track of the details through closing.', image: '', imageAlt: '', builtIn: true },
  { id: 'sell', name: 'Sell', slug: 'sell', template: 'page', headline: 'I’ll help you sell with honest pricing and marketing people actually watch.', intro: 'We’ll start with what you need from this sale, then build the price, prep and launch around it.', body: 'I’ll show you recent sales, what’s competing with your home, and the price range I’d recommend. We’ll focus on the updates worth doing and plan the launch together.', image: '', imageAlt: '', builtIn: true },
  { id: 'stories', name: 'Client Stories', slug: 'stories', template: 'story', headline: 'Seven moves. Seven different priorities.', intro: 'From a first home to a long-awaited sale, every client needed something different.', body: 'Share the client’s goals, what mattered during the move, and the outcome. Use only details approved for publication.', image: '', imageAlt: '', builtIn: true },
  { id: 'start-here', name: 'Start Here', slug: 'start-here', template: 'page', headline: 'Not sure where to begin? Pick a question.', intro: 'Each quiz is one question at a time and ends with honest next steps.', body: 'Choose a question about fit, buying, selling, or finding places that match your priorities.', image: '', imageAlt: '', builtIn: true },
  { id: 'videos', name: 'Videos', slug: 'videos', template: 'page', headline: 'Watch first. Then let’s talk.', intro: 'I make videos to answer the questions I hear most and show homes the way I see them.', body: 'Add a short introduction to the videos and channels featured on this page.', image: '', imageAlt: '', builtIn: true },
];

const pageList = document.querySelector('#page-list');
const pageSearch = document.querySelector('#page-search');
const pageForm = document.querySelector('#page-form');
const pageName = document.querySelector('#page-name');
const pageSlug = document.querySelector('#page-slug');
const pageTemplate = document.querySelector('#page-template');
const pageBrandPreset = document.querySelector('#page-brand-preset');
const pageHeadline = document.querySelector('#page-headline');
const pageIntro = document.querySelector('#page-intro');
const pageBody = document.querySelector('#page-body');
const pageImage = document.querySelector('#page-image');
const pageImageFile = document.querySelector('#page-image-file');
const pageImageAlt = document.querySelector('#page-image-alt');
const previewPanel = document.querySelector('#preview-panel');
const previewImageWrap = document.querySelector('#preview-image-wrap');
const previewImage = document.querySelector('#preview-image');
const editorStatus = document.querySelector('#editor-status');
const newPageDialog = document.querySelector('#new-page-dialog');

function normalizePage(page, index) {
  return {
    id: typeof page.id === 'string' ? page.id : `page-${index + 1}`,
    name: typeof page.name === 'string' ? page.name : 'Untitled page',
    slug: typeof page.slug === 'string' ? page.slug : `page-${index + 1}`,
    template: templateNames[page.template] ? page.template : 'page',
    brandPreset: brandPresets.has(page.brandPreset) ? page.brandPreset : 'ivory',
    headline: typeof page.headline === 'string' ? page.headline : '',
    intro: typeof page.intro === 'string' ? page.intro : '',
    body: typeof page.body === 'string' ? page.body : '',
    image: typeof page.image === 'string' ? page.image : '',
    imageAlt: typeof page.imageAlt === 'string' ? page.imageAlt : '',
    builtIn: Boolean(page.builtIn),
  };
}

function readPages() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (Array.isArray(saved?.pages) && saved.pages.length) return saved.pages.map(normalizePage);
  } catch {}
  return starterPages.map((page) => ({ ...page }));
}

let pages = readPages();
let selectedId = pages[0]?.id;

function currentPage() {
  return pages.find((page) => page.id === selectedId);
}

const allowedEditorTags = new Set(['A', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'FIGCAPTION', 'FIGURE', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6', 'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE', 'SPAN', 'STRONG', 'SUB', 'SUP', 'TABLE', 'TBODY', 'TD', 'TH', 'THEAD', 'TR', 'UL']);

function sanitizeEditorMarkup(markup) {
  const parsed = new DOMParser().parseFromString(markup || '', 'text/html');

  function cleanNode(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE) return document.createDocumentFragment();
    if (['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'SVG', 'VIDEO', 'AUDIO'].includes(node.tagName)) return document.createDocumentFragment();
    const children = [...node.childNodes].map(cleanNode);
    if (!allowedEditorTags.has(node.tagName)) {
      const fragment = document.createDocumentFragment();
      children.forEach((child) => fragment.append(child));
      return fragment;
    }
    const element = document.createElement(node.tagName.toLowerCase());
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (href && !/^\s*(javascript|data):/i.test(href)) {
        element.setAttribute('href', href);
        if (/^https?:/i.test(href)) {
          element.setAttribute('target', '_blank');
          element.setAttribute('rel', 'noopener noreferrer');
        }
      }
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (src && !/^\s*(javascript|data):/i.test(src)) element.setAttribute('src', src.startsWith('images/') ? `blog/${src}` : src);
      element.setAttribute('alt', node.getAttribute('alt') || '');
      element.loading = 'lazy';
      element.decoding = 'async';
    }
    if (node.tagName === 'OL' && node.hasAttribute('start')) element.setAttribute('start', node.getAttribute('start'));
    children.forEach((child) => element.append(child));
    return element;
  }

  const output = document.createDocumentFragment();
  [...parsed.body.childNodes].map(cleanNode).forEach((node) => output.append(node));
  const container = document.createElement('div');
  container.append(output);
  return container.innerHTML;
}

function editorMarkup(value) {
  if (!value) return '';
  if (/<[a-z][\s\S]*>/i.test(value)) return sanitizeEditorMarkup(value);
  return value.split(/\n\s*\n/).map((text) => text.trim()).filter(Boolean)
    .map((text) => `<p>${text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('\n', '<br>')}</p>`)
    .join('');
}

function plainText(html) {
  const parsed = new DOMParser().parseFromString(html || '', 'text/html');
  parsed.querySelectorAll('script,style,iframe,object,embed,form').forEach((node) => node.remove());
  return parsed.body.textContent.replace(/\s+/g, ' ').trim();
}

function setStatus(message) {
  editorStatus.textContent = message;
}

function persist(message = 'Saved in this browser') {
  try {
    localStorage.setItem(storageKey, JSON.stringify({ version: 1, pages }));
    setStatus(message);
  } catch {
    setStatus('Could not save. Export drafts or remove a large uploaded image.');
  }
}

function renderPageList() {
  pageList.replaceChildren();
  const query = pageSearch.value.trim().toLocaleLowerCase();
  const filteredPages = pages.filter((page) => `${page.name} ${page.slug}`.toLocaleLowerCase().includes(query));
  filteredPages.forEach((page) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'editor-page-item';
    button.classList.toggle('is-current', page.id === selectedId);
    button.dataset.pageId = page.id;
    const title = document.createElement('span');
    title.textContent = page.name;
    const meta = document.createElement('small');
    meta.textContent = templateNames[page.template];
    button.append(title, meta);
    button.addEventListener('click', () => {
      selectedId = page.id;
      renderEditor();
    });
    pageList.append(button);
  });
  if (!filteredPages.length) {
    const empty = document.createElement('p');
    empty.className = 'editor-list-empty';
    empty.textContent = 'No matching pages';
    pageList.append(empty);
  }
}

function renderPreview(page) {
  document.querySelector('.editor-preview-page').dataset.brandPreset = page.brandPreset || 'ivory';
  document.querySelector('.editor-preview-page').classList.toggle('has-brand-logo', page.image === 'assets/seattle-at-home-logo.webp');
  document.querySelector('.editor-preview-page').classList.toggle('has-emily-portrait', /(?:^|\/)emily-hawkins\.webp(?:\?|$)/.test(page.image));
  document.querySelector('#selected-page-heading').textContent = page.name;
  document.querySelector('#preview-template').textContent = templateNames[page.template];
  document.querySelector('#preview-eyebrow').textContent = templateNames[page.template];
  document.querySelector('#preview-headline').textContent = page.headline || 'Your headline';
  document.querySelector('#preview-intro').textContent = page.intro;
  document.querySelector('#preview-route').textContent = `/${page.slug || 'untitled'}`;
  previewImageWrap.hidden = !page.image;
  if (page.image) {
    previewImage.src = page.image;
    previewImage.alt = page.imageAlt;
  } else {
    previewImage.removeAttribute('src');
    previewImage.alt = '';
  }
  const previewBody = document.querySelector('#preview-body');
  previewBody.innerHTML = editorMarkup(page.body);
}

function renderEditor() {
  const page = currentPage();
  if (!page) return;
  renderPageList();
  pageName.value = page.name;
  pageSlug.value = page.slug;
  pageTemplate.value = page.template;
  pageBrandPreset.value = page.brandPreset || 'ivory';
  pageHeadline.value = page.headline;
  pageIntro.value = page.intro;
  pageBody.innerHTML = editorMarkup(page.body);
  pageImage.value = page.image.startsWith('data:') ? '' : page.image;
  pageImageAlt.value = page.imageAlt;
  document.querySelector('#delete-page').hidden = page.builtIn;
  renderPreview(page);
}

pageForm.addEventListener('input', (event) => {
  const page = currentPage();
  if (!page || event.target === pageImageFile) return;
  page.name = pageName.value;
  page.slug = pageSlug.value;
  page.template = pageTemplate.value;
  page.brandPreset = pageBrandPreset.value;
  page.headline = pageHeadline.value;
  page.intro = pageIntro.value;
  page.body = pageBody.innerHTML;
  if (event.target === pageImage) page.image = pageImage.value;
  page.imageAlt = pageImageAlt.value;
  renderPageList();
  renderPreview(page);
  persist();
});

pageSearch.addEventListener('input', renderPageList);
pageBrandPreset.addEventListener('change', () => {
  const page = currentPage();
  page.brandPreset = pageBrandPreset.value;
  renderPreview(page);
  persist('Brand preset saved with this draft');
});
document.querySelectorAll('[data-brand-asset]').forEach((button) => {
  button.addEventListener('click', () => {
    const page = currentPage();
    const logo = button.dataset.brandAsset === 'logo';
    page.image = logo ? 'assets/seattle-at-home-logo.webp' : 'emily-hawkins.webp';
    page.imageAlt = logo ? 'Seattle At Home logo' : 'Emily Hawkins, Seattle At Home real estate broker';
    pageImageFile.value = '';
    renderEditor();
    persist('Brand image saved with this draft');
  });
});
document.querySelectorAll('[data-rich-command]').forEach((button) => {
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    pageBody.focus();
    document.execCommand(button.dataset.richCommand, false, button.dataset.richValue || null);
    pageBody.dispatchEvent(new Event('input', { bubbles: true }));
  });
});

pageImageFile.addEventListener('change', () => {
  const file = pageImageFile.files?.[0];
  const page = currentPage();
  if (!file || !page) return;
  if (file.size > 1_000_000) {
    setStatus('Image is over 1 MB. Use a smaller web-sized image.');
    pageImageFile.value = '';
    return;
  }
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    page.image = String(reader.result);
    pageImage.value = '';
    renderPreview(page);
    persist();
    pageImageFile.value = '';
  });
  reader.readAsDataURL(file);
});

document.querySelector('#save-draft').addEventListener('click', () => persist('Draft saved in this browser'));
document.querySelector('#toggle-preview').addEventListener('click', (event) => {
  const hidden = previewPanel.hidden;
  previewPanel.hidden = !hidden;
  event.currentTarget.textContent = hidden ? 'Hide preview' : 'Show preview';
  event.currentTarget.setAttribute('aria-pressed', String(hidden));
  document.querySelector('#editor-content-grid').classList.toggle('preview-hidden', !hidden);
});

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'new-page';
}

function starterBodyFor(template) {
  if (template === 'neighborhood') return '<h2>At a glance</h2><p>[Describe the neighborhood and what makes it distinctive.]</p><h2>Getting around</h2><p>[Add transit, commute, and walkability details.]</p><h2>Local favorites</h2><p>[Add parks, cafes, and community spots.]</p>';
  if (template === 'story') return '<h2>The goal</h2><p>[What did the client want to accomplish?]</p><h2>What mattered</h2><p>[Which decisions, details, or challenges shaped the story?]</p><h2>The result</h2><p>[Add the approved outcome and client perspective.]</p>';
  return '<p>[Write the page content here.]</p>';
}

document.querySelector('#add-page').addEventListener('click', () => {
  document.querySelector('#new-page-name').value = '';
  newPageDialog.showModal();
  document.querySelector('#new-page-name').focus();
});
document.querySelector('#cancel-new-page').addEventListener('click', () => newPageDialog.close());
document.querySelector('#new-page-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const name = document.querySelector('#new-page-name').value.trim();
  const template = document.querySelector('#new-page-template').value;
  const baseSlug = slugify(name);
  let slug = baseSlug;
  let suffix = 2;
  while (pages.some((page) => page.slug === slug)) slug = `${baseSlug}-${suffix++}`;
  const page = normalizePage({
    id: `draft-${Date.now()}`,
    name,
    slug,
    template,
    headline: name,
    intro: '',
    body: starterBodyFor(template),
    image: '',
    imageAlt: '',
    builtIn: false,
  }, pages.length);
  pages.push(page);
  selectedId = page.id;
  newPageDialog.close();
  renderEditor();
  persist('New draft created');
});

document.querySelector('#delete-page').addEventListener('click', () => {
  const page = currentPage();
  if (!page || page.builtIn) return;
  pages = pages.filter((candidate) => candidate.id !== page.id);
  selectedId = pages[0]?.id;
  renderEditor();
  persist('Draft deleted');
});

document.querySelector('#export-drafts').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, pages }, null, 2)], { type: 'application/json' });
  const download = document.createElement('a');
  download.href = URL.createObjectURL(blob);
  download.download = 'seattle-at-home-content-drafts.json';
  download.click();
  URL.revokeObjectURL(download.href);
  setStatus('Drafts exported');
});

document.querySelector('#import-drafts').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = JSON.parse(String(reader.result));
      if (!Array.isArray(imported.pages) || imported.pages.length === 0) throw new Error('No pages found');
      pages = imported.pages.map(normalizePage);
      selectedId = pages[0].id;
      renderEditor();
      persist('Drafts imported');
    } catch {
      setStatus('Could not import that file. Choose a Seattle At Home draft JSON.');
    }
    event.target.value = '';
  });
  reader.readAsText(file);
});

renderEditor();

async function loadImportedBlogDrafts() {
  try {
    const response = await fetch('blog/posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Blog archive unavailable');
    const archive = await response.json();
    if (!Array.isArray(archive.posts)) throw new Error('Invalid blog archive');
    const existingIds = new Set(pages.map((page) => page.id));
    const importedPages = archive.posts.map((post, index) => {
      const title = plainText(post.titleHtml) || 'Untitled article';
      const featuredImage = post.featuredImage?.startsWith('images/') ? `blog/${post.featuredImage}` : post.featuredImage || '';
      return normalizePage({
        id: `blog-${post.id}`,
        name: title,
        slug: post.slug,
        template: 'story',
        headline: title,
        intro: plainText(post.excerptHtml),
        body: (post.contentHtml || '').replace(/(src=["'])images\//g, '$1blog/images/'),
        image: featuredImage,
        imageAlt: post.featuredImageAlt || '',
        builtIn: true,
      }, index);
    }).filter((page) => !existingIds.has(page.id));
    pages.push(...importedPages);
    renderPageList();
    setStatus(`${importedPages.length} imported blog drafts available`);
  } catch {
    setStatus('Blog archive unavailable; local pages are still editable');
  }
}

loadImportedBlogDrafts();