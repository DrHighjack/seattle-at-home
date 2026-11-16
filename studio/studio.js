'use strict';

const REPO = 'DrHighjack/seattle-at-home';
const API = `https://api.github.com/repos/${REPO}`;
const PAGE_FILES = [
  ['Home', 'index.html'], ['About', 'about.html'], ['Buy', 'buy.html'],
  ['Sell', 'sell.html'], ['Client stories', 'stories.html'], ['Story template', 'story.html'],
  ['Start here', 'start-here.html'], ['Videos', 'videos.html'], ['Blog', 'blog.html'],
  ['Article template', 'blog-post.html'], ['Quiz page', 'quiz.html'], ['Contact', 'contact.html'],
  ['Privacy', 'privacy.html'], ['Not found', '404.html'],
];
const DEFAULT_PAGE_FILES = PAGE_FILES.map((entry) => [...entry]);
const RESULT_KEYS = {
  buy: ['incompleteTitle', 'incompleteDescription', 'exploreTitle', 'planTitle', 'readyTitle', 'description', 'contactCopy', 'financingNeeded', 'financingReady', 'costsNeeded', 'costsReady', 'finalStep'],
  sell: ['incompleteTitle', 'incompleteDescription', 'exploreTitle', 'planTitle', 'readyTitle', 'description', 'contactCopy', 'proceedsNeeded', 'proceedsReady', 'paperworkNeeded', 'paperworkReady', 'finalStep'],
  fit: ['otherResourceTitle', 'unclearTitle', 'matchTitle', 'explanation', 'contactCopy'],
  places: ['allTitle', 'shortlistTitle', 'intro', 'explanation', 'contactCopy'],
};
const $ = (selector) => document.querySelector(selector);
const state = {
  token: '', head: '', tree: '', files: new Map(), pages: new Map(), dirty: new Set(),
  uploads: new Map(), kind: 'pages', selected: '', busy: false,
};

function status(message) { $('#status').textContent = message; }
function setBusy(busy) {
  state.busy = busy;
  $('#workspace').inert = busy;
  $('#connect-form button').disabled = busy;
}
function changed(path) {
  state.dirty.add(path);
  $('#publish').disabled = false;
  $('#backup').disabled = false;
  status(`${state.dirty.size} file${state.dirty.size === 1 ? '' : 's'} changed. Publish when ready.`);
}
function escaped(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}
function textFromHtml(value) {
  return new DOMParser().parseFromString(value || '', 'text/html').body.textContent.trim();
}
function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
function bytesToBase64(bytes) {
  let binary = '';
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}
function base64ToText(value) {
  const binary = atob(value.replace(/\s/g, ''));
  return new TextDecoder('utf-8', { fatal: true }).decode(Uint8Array.from(binary, (char) => char.charCodeAt(0)));
}
function validateUrl(value, image = false) {
  const trimmed = value.trim();
  if (!trimmed) return true;
  if (/[\u0000-\u001f\u007f\\]/.test(trimmed) || trimmed.startsWith('//')) return false;
  try {
    const url = new URL(trimmed, 'https://seattleathome.com/');
    return (image ? ['http:', 'https:'] : ['http:', 'https:', 'mailto:', 'tel:']).includes(url.protocol);
  } catch { return false; }
}
async function request(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    redirect: 'error',
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${state.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
    },
  });
  let data;
  try { data = await response.json(); } catch { throw new Error(`GitHub returned an unreadable response (${response.status}).`); }
  if (!response.ok) {
    const error = new Error(`GitHub request failed (${response.status}): ${data.message || 'Unknown error'}`);
    error.status = response.status;
    throw error;
  }
  return data;
}
async function readRepositoryFile(path) {
  let data = await request(`${API}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(state.head)}`);
  if (data.type !== 'file') throw new Error(`Cannot read ${path} from GitHub.`);
  if (data.encoding === 'none' && data.sha) data = await request(`${API}/git/blobs/${data.sha}`);
  if (data.encoding !== 'base64' || typeof data.content !== 'string') {
    throw new Error(`Cannot read ${path} from GitHub.`);
  }
  return base64ToText(data.content);
}
async function readFile(path) {
  if (state.files.has(path)) return state.files.get(path);
  const content = await readRepositoryFile(path);
  state.files.set(path, content);
  return content;
}
async function jsonFile(path, key) {
  const value = await readFile(path);
  if (typeof value !== 'string') return value;
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed[key])) throw new Error(`${path} has an invalid format.`);
  state.files.set(path, parsed);
  return parsed;
}
async function connect(event) {
  event.preventDefault();
  if (!window.isSecureContext && !['localhost', '127.0.0.1'].includes(location.hostname)) {
    status('Use HTTPS or localhost to connect securely.');
    return;
  }
  state.token = $('#token').value.trim();
  if (!state.token) return;
  setBusy(true);
  status('Connecting to GitHub…');
  try {
    const user = await request('https://api.github.com/user');
    const repo = await request(API);
    if (!repo.permissions?.push) throw new Error('This GitHub account or token does not have write access to this repository.');
    if (repo.default_branch !== 'main') throw new Error('The repository default branch is not main. Publishing is disabled until the editor is reconfigured.');
    const ref = await request(`${API}/git/ref/heads/main`);
    const commit = await request(`${API}/git/commits/${ref.object.sha}`);
    state.head = ref.object.sha;
    state.tree = commit.tree.sha;
    const metadata = await jsonFile('content/page-metadata.json', 'pages');
    for (const [file, , , label] of metadata.pages) {
      if (!PAGE_FILES.some(([, path]) => path === file)) PAGE_FILES.push([label, file]);
    }
    $('#username').textContent = user.login;
    $('#token').value = '';
    $('#connection').hidden = true;
    $('#workspace').hidden = false;
    renderList();
    status('Connected. Choose content to edit.');
  } catch (error) {
    state.token = '';
    state.head = '';
    state.tree = '';
    state.files.clear();
    PAGE_FILES.splice(0, PAGE_FILES.length, ...DEFAULT_PAGE_FILES.map((entry) => [...entry]));
    $('#token').value = '';
    status(`Could not connect: ${error.message}`);
  } finally { setBusy(false); }
}
$('#connect-form').addEventListener('submit', connect);

function clearState() {
  state.token = '';
  state.head = '';
  state.tree = '';
  state.files.clear();
  state.pages.clear();
  state.dirty.clear();
  state.uploads.clear();
  state.kind = 'pages';
  state.selected = '';
  PAGE_FILES.splice(0, PAGE_FILES.length, ...DEFAULT_PAGE_FILES.map((entry) => [...entry]));
  $('#content-kind').value = 'pages';
  $('#content-search').value = '';
  $('#page-filter').value = '';
  $('#shared-edit').checked = false;
  $('#publish').disabled = true;
  $('#backup').disabled = true;
  $('#workspace').hidden = true;
  $('#connection').hidden = false;
  status('Disconnected. The token was removed from this tab.');
}
$('#disconnect').addEventListener('click', () => {
  if (state.dirty.size && !confirm('Discard all unpublished changes and disconnect?')) return;
  clearState();
});
window.addEventListener('beforeunload', (event) => {
  if (state.dirty.size) event.preventDefault();
});

function showPanel(name) {
  $('#empty').hidden = Boolean(name);
  for (const id of ['page-editor', 'blog-editor', 'reel-editor', 'quiz-editor']) $(`#${id}`).hidden = id !== name;
}
function listEntry(label, id) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  button.setAttribute('aria-current', String(id === state.selected));
  button.addEventListener('click', () => selectItem(id));
  return button;
}
function renderList() {
  const list = $('#content-list');
  list.replaceChildren();
  const filter = $('#content-search').value.trim().toLowerCase();
  let items = [];
  if (state.kind === 'pages') items = PAGE_FILES.map(([name, path]) => ({ id: path, name }));
  if (state.kind === 'blog') items = (state.files.get('blog/posts.json')?.posts || []).map((post) => ({ id: String(post.id), name: textFromHtml(post.titleHtml) }));
  if (state.kind === 'reels') items = (state.files.get('reels/reels.json')?.reels || []).map((reel, index) => ({ id: String(index), name: reel.title || 'Untitled reel' }));
  if (state.kind === 'quizzes') {
    const data = state.files.get('content/quizzes.json');
    if (data) items = [
      ...Object.entries(data.builtIn).map(([id, quiz]) => ({ id: `builtIn:${id}`, name: `${quiz.title} (built-in)` })),
      ...data.custom.map((quiz) => ({ id: `custom:${quiz.id}`, name: quiz.title || 'Untitled quiz' })),
    ];
  }
  items.filter((item) => item.name.toLowerCase().includes(filter)).forEach((item) => list.append(listEntry(item.name, item.id)));
  if (!list.childElementCount) list.textContent = 'No matching content.';
  $('#add-item').hidden = false;
  $('#add-item').disabled = state.kind === 'pages' && !state.selected;
  $('#add-item').textContent = state.kind === 'pages' ? 'Duplicate selected page' : 'Add new';
}
$('#content-search').addEventListener('input', renderList);
$('#content-kind').addEventListener('change', async (event) => {
  if ($('#page-fields :invalid')) {
    event.target.value = state.kind;
    status('Correct the invalid page field before switching content.');
    return;
  }
  state.kind = event.target.value;
  state.selected = '';
  $('#content-search').value = '';
  showPanel('');
  setBusy(true);
  try {
    if (state.kind === 'blog') await jsonFile('blog/posts.json', 'posts');
    if (state.kind === 'reels') await jsonFile('reels/reels.json', 'reels');
    if (state.kind === 'quizzes') {
      const data = await jsonFile('content/quizzes.json', 'custom');
      if (!data.builtIn || typeof data.builtIn !== 'object') throw new Error('Quiz content has an invalid format.');
    }
    renderList();
  } catch (error) { status(`Could not load content: ${error.message}`); }
  finally { setBusy(false); }
});
async function selectItem(id) {
  if ($('#page-fields :invalid')) { status('Correct the invalid page field before switching content.'); return; }
  state.selected = id;
  renderList();
  setBusy(true);
  try {
    if (state.kind === 'pages') await openPage(id);
    if (state.kind === 'blog') openBlog(id);
    if (state.kind === 'reels') openReel(id);
    if (state.kind === 'quizzes') openQuiz(id);
  } catch (error) { showPanel(''); status(`Could not load content: ${error.message}`); }
  finally { setBusy(false); }
}

function serializePage(doc) {
  return '<!doctype html>\n' + doc.documentElement.outerHTML + '\n';
}
async function openPage(path) {
  const metadata = await jsonFile('content/page-metadata.json', 'pages');
  if (!metadata.pages.some((entry) => entry[0] === path)) throw new Error('Page metadata is missing.');
  if (!state.pages.has(path)) {
    const html = await readFile(path);
    const doc = new DOMParser().parseFromString(html, 'text/html');
    if (!doc.querySelector('main') || !doc.querySelector('body')) throw new Error('This page is missing its expected content.');
    state.pages.set(path, doc);
  }
  $('#page-title').textContent = PAGE_FILES.find(([, file]) => file === path)?.[0] || path;
  $('#page-filter').value = '';
  showPanel('page-editor');
  renderSections();
  renderPageFields();
  updatePreview();
}
function pageSections() {
  return [...state.pages.get(state.selected).querySelectorAll('main section, main article')];
}
function renderSections(selected = 0) {
  const select = $('#page-section');
  select.replaceChildren();
  pageSections().forEach((section, index) => {
    const option = document.createElement('option');
    const heading = section.querySelector('h1,h2,h3,h4')?.textContent.trim().replace(/\s+/g, ' ');
    option.value = String(index);
    option.textContent = `${section.tagName === 'ARTICLE' ? 'Card/story' : 'Section'} · ${heading?.slice(0, 65) || section.id || `Item ${index + 1}`}${section.hidden ? ' (hidden)' : ''}`;
    select.append(option);
  });
  select.value = String(Math.min(selected, Math.max(0, select.options.length - 1)));
  updateSectionControls();
}
function selectedSection() { return pageSections()[Number($('#page-section').value)]; }
function updateSectionControls() {
  const section = selectedSection();
  $('#toggle-section').disabled = !section;
  $('#toggle-section').textContent = section?.hidden ? 'Show' : 'Hide';
  $('#duplicate-section').disabled = !section || section.tagName !== 'ARTICLE';
  $('#remove-section').disabled = !section;
  $('#move-section-up').disabled = !section?.previousElementSibling;
  $('#move-section-down').disabled = !section?.nextElementSibling;
}
$('#page-section').addEventListener('change', updateSectionControls);
function canChangePageStructure() {
  if (!$('#page-fields :invalid')) return true;
  status('Correct the invalid page field before changing page sections.');
  return false;
}
function afterSectionChange(section) {
  changed(state.selected);
  renderSections(Math.max(0, pageSections().indexOf(section)));
  renderPageFields();
  updatePreview();
}
$('#toggle-section').addEventListener('click', () => {
  if (!canChangePageStructure()) return;
  const section = selectedSection();
  if (!section) return;
  section.hidden = !section.hidden;
  afterSectionChange(section);
});
$('#duplicate-section').addEventListener('click', () => {
  if (!canChangePageStructure()) return;
  const section = selectedSection();
  if (!section || section.tagName !== 'ARTICLE') return;
  const copy = section.cloneNode(true);
  const ids = new Map();
  [copy, ...copy.querySelectorAll('[id]')].filter((node) => node.id).forEach((node) => {
    const old = node.id;
    node.id = `story-${crypto.randomUUID()}`;
    ids.set(old, node.id);
  });
  for (const node of [copy, ...copy.querySelectorAll('*')]) {
    for (const attribute of ['aria-labelledby', 'aria-describedby', 'aria-controls', 'for']) {
      if (node.hasAttribute(attribute)) node.setAttribute(attribute, node.getAttribute(attribute).split(/\s+/).map((id) => ids.get(id) || id).join(' '));
    }
    if (node.getAttribute('href')?.startsWith('#')) {
      const old = node.getAttribute('href').slice(1);
      if (ids.has(old)) node.setAttribute('href', `#${ids.get(old)}`);
    }
  }
  section.after(copy);
  afterSectionChange(copy);
  status('Story or card duplicated. Update its text, images and links before publishing.');
});
$('#remove-section').addEventListener('click', () => {
  if (!canChangePageStructure()) return;
  const section = selectedSection();
  if (!section || !confirm('Remove this section or story from the page when published?')) return;
  section.remove();
  afterSectionChange(null);
});
$('#move-section-up').addEventListener('click', () => {
  if (!canChangePageStructure()) return;
  const section = selectedSection();
  if (section?.previousElementSibling) { section.previousElementSibling.before(section); afterSectionChange(section); }
});
$('#move-section-down').addEventListener('click', () => {
  if (!canChangePageStructure()) return;
  const section = selectedSection();
  if (section?.nextElementSibling) { section.nextElementSibling.after(section); afterSectionChange(section); }
});
function field(label, value, onInput, type = 'text') {
  const wrap = document.createElement('div');
  wrap.className = 'field';
  const caption = document.createElement('label');
  caption.textContent = label;
  const input = document.createElement(type === 'textarea' ? 'textarea' : 'input');
  if (type !== 'textarea') input.type = type;
  input.value = value;
  caption.append(input);
  wrap.append(caption);
  input.addEventListener('input', () => onInput(input));
  return { wrap, input };
}
function textContext(node) {
  const parent = node.parentElement;
  const section = parent.closest('section, article, header, footer, nav');
  const sectionName = section?.querySelector('h1,h2,h3')?.textContent.trim().slice(0, 60);
  return `${sectionName || section?.tagName.toLowerCase() || 'Page'} · ${parent.tagName.toLowerCase()}`;
}
function renderPageFields() {
  const doc = state.pages.get(state.selected);
  if (!doc) return;
  const container = $('#page-fields');
  container.replaceChildren();
  const filter = $('#page-filter').value.trim().toLowerCase();
  const add = (label, value, onInput, type = 'text') => {
    if (filter && !`${label} ${value}`.toLowerCase().includes(filter)) return null;
    const result = field(label, value, onInput, type);
    container.append(result.wrap);
    return result;
  };
  const pageTitle = doc.querySelector('title');
  if (pageTitle) add('Browser and search title', pageTitle.textContent, (input) => updateMetadata(doc, 'title', input.value));
  const description = doc.querySelector('meta[name="description"]');
  if (description) add('Search description', description.content, (input) => updateMetadata(doc, 'description', input.value), 'textarea');
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!node.nodeValue.trim() || node.parentElement.closest('script,style,noscript,svg,template')) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });
  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  for (const node of nodes) {
    const original = node.nodeValue;
    const leading = original.match(/^\s*/)?.[0] || '';
    const trailing = original.match(/\s*$/)?.[0] || '';
    const value = original.trim();
    const sharedArea = node.parentElement.closest('header,footer')?.tagName;
    const targets = [{ node, path: state.selected }];
    if ($('#shared-edit').checked && sharedArea) {
      for (const [path, page] of state.pages) {
        if (path === state.selected) continue;
        const sharedWalker = page.createTreeWalker(page.body, NodeFilter.SHOW_TEXT);
        while (sharedWalker.nextNode()) {
          const other = sharedWalker.currentNode;
          if (other.nodeValue === original && other.parentElement.tagName === node.parentElement.tagName && other.parentElement.closest('header,footer')?.tagName === sharedArea) targets.push({ node: other, path });
        }
      }
    }
    add(textContext(node), value, (input) => {
      for (const target of targets) { target.node.nodeValue = leading + input.value + trailing; changed(target.path); }
    }, value.length > 100 ? 'textarea' : 'text');
  }
  function updateMetadata(doc, kind, value) {
    const metadata = state.files.get('content/page-metadata.json').pages.find((entry) => entry[0] === state.selected);
    const schema = doc.querySelector('#site-structured-data');
    if (!metadata || !schema) { status('Could not update search metadata: page metadata is missing.'); return; }
    let parsed;
    try { parsed = JSON.parse(schema.textContent); } catch { status('Could not update search metadata: structured data is invalid.'); return; }
    const item = parsed['@graph']?.find((node) => node['@id']?.endsWith('#webpage'));
    if (!item) { status('Could not update search metadata: page schema is missing.'); return; }
    if (kind === 'title') {
      metadata[1] = value;
      doc.querySelector('title').textContent = value;
      for (const meta of doc.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')) meta.content = value;
      item.name = value;
    } else {
      metadata[2] = value;
      for (const meta of doc.querySelectorAll('meta[name="description"], meta[property="og:description"], meta[name="twitter:description"]')) meta.content = value;
      item.description = value;
    }
    schema.textContent = JSON.stringify(parsed).replaceAll('<', '\\u003c');
    changed(state.selected);
    changed('content/page-metadata.json');
  }
  for (const link of doc.querySelectorAll('body a[href]')) {
    const name = link.textContent.trim().replace(/\s+/g, ' ').slice(0, 70) || link.getAttribute('aria-label') || 'Link';
    const sharedArea = link.closest('header,footer')?.tagName;
    const targets = [{ link, path: state.selected }];
    if ($('#shared-edit').checked && sharedArea) {
      for (const [path, page] of state.pages) {
        if (path === state.selected) continue;
        for (const other of page.querySelectorAll(`${sharedArea.toLowerCase()} a[href]`)) {
          if (other.getAttribute('href') === link.getAttribute('href') && other.textContent.trim() === link.textContent.trim()) targets.push({ link: other, path });
        }
      }
    }
    add(`Link · ${name}`, link.getAttribute('href'), (input) => {
      input.setCustomValidity(validateUrl(input.value) ? '' : 'Use a safe web, email, telephone, or relative link.');
      if (input.validity.valid) {
        for (const target of targets) { target.link.setAttribute('href', input.value.trim()); changed(target.path); }
      } else status('This link is invalid. Correct it before switching or publishing.');
    });
  }
  for (const element of doc.querySelectorAll('body [placeholder], body input[type="submit"][value], body input[type="button"][value]')) {
    const attribute = element.hasAttribute('placeholder') ? 'placeholder' : 'value';
    const label = element.closest('label')?.textContent.trim().slice(0, 60) || element.getAttribute('aria-label') || 'Input';
    add(`${attribute === 'value' ? 'Button text' : 'Input hint'} · ${label}`, element.getAttribute(attribute) || '', (input) => {
      element.setAttribute(attribute, input.value);
      changed(state.selected);
    });
  }
  for (const image of doc.querySelectorAll('body img')) {
    const name = image.getAttribute('alt') || 'Image';
    const result = add(`Image path · ${name.slice(0, 60)}`, image.getAttribute('src') || '', (input) => {
      input.setCustomValidity(validateUrl(input.value, true) ? '' : 'Use an HTTPS, HTTP, or relative image path.');
      if (input.validity.valid) { image.setAttribute('src', input.value.trim()); image.removeAttribute('srcset'); changed(state.selected); }
      else status('This image path is invalid. Correct it before switching or publishing.');
    });
    if (!result) continue;
    const alt = document.createElement('input');
    alt.value = image.getAttribute('alt') || '';
    alt.setAttribute('aria-label', `Image description for ${name}`);
    alt.placeholder = 'Image description';
    alt.addEventListener('input', () => { image.alt = alt.value; changed(state.selected); });
    const upload = document.createElement('input');
    upload.type = 'file';
    upload.accept = 'image/jpeg,image/png,image/webp,image/avif';
    upload.setAttribute('aria-label', `Upload replacement for ${name}`);
    upload.addEventListener('change', async () => {
      setBusy(true);
      try {
        const path = await stageImage(upload.files[0]);
        image.setAttribute('src', path);
        image.removeAttribute('srcset');
        result.input.value = path;
        changed(state.selected);
        status('Image added to the unpublished changes. Add a useful image description.');
      } catch (error) { status(`Could not add image: ${error.message}`); }
      upload.value = '';
      setBusy(false);
    });
    result.wrap.append(alt, upload);
  }
  for (const video of doc.querySelectorAll('body video')) {
    const label = video.getAttribute('aria-label') || 'Video';
    if (!video.querySelector('track')) {
      const addTrack = document.createElement('button');
      addTrack.type = 'button';
      addTrack.className = 'secondary';
      addTrack.textContent = `Add captions · ${label}`;
      if (!filter || addTrack.textContent.toLowerCase().includes(filter)) container.append(addTrack);
      addTrack.addEventListener('click', () => {
        if (!canChangePageStructure()) return;
        const track = doc.createElement('track');
        track.kind = 'captions';
        track.srclang = 'en';
        track.label = 'English';
        video.append(track);
        changed(state.selected);
        renderPageFields();
        status('Caption track added. Upload a WebVTT file before publishing.');
      });
    } else {
      const removeTrack = document.createElement('button');
      removeTrack.type = 'button';
      removeTrack.className = 'secondary';
      removeTrack.textContent = `Remove captions · ${label}`;
      if (!filter || removeTrack.textContent.toLowerCase().includes(filter)) container.append(removeTrack);
      removeTrack.addEventListener('click', () => {
        if (!canChangePageStructure()) return;
        video.querySelector('track').remove();
        changed(state.selected);
        renderPageFields();
        status('Caption track removed from unpublished changes.');
      });
    }
    for (const [element, attribute, title] of [[video, 'poster', 'Poster image'], [video.querySelector('source'), 'src', 'Video file'], [video.querySelector('track'), 'src', 'Captions file']]) {
      if (!element) continue;
      const result = add(`${title} · ${label}`, element.getAttribute(attribute) || '', (input) => {
        input.setCustomValidity(validateUrl(input.value, true) ? '' : 'Use a safe web or relative file path.');
        if (input.validity.valid) { element.setAttribute(attribute, input.value.trim()); changed(state.selected); }
        else status('This file path is invalid. Correct it before switching or publishing.');
      });
      if (!result) continue;
      const upload = document.createElement('input');
      upload.type = 'file';
      const kind = title === 'Poster image' ? 'image' : title === 'Video file' ? 'video' : 'captions';
      upload.accept = kind === 'image' ? 'image/jpeg,image/png,image/webp,image/avif' : kind === 'video' ? 'video/mp4,video/webm' : '.vtt,text/vtt';
      upload.setAttribute('aria-label', `Upload ${title.toLowerCase()} for ${label}`);
      upload.addEventListener('change', async () => {
        setBusy(true);
        try {
          const path = await stageFile(upload.files[0], kind, kind === 'image' ? 'assets/uploads' : 'youtube');
          element.setAttribute(attribute, path);
          result.input.value = path;
          changed(state.selected);
          status(`${title} added to unpublished changes.`);
        } catch (error) { status(`Could not add ${title.toLowerCase()}: ${error.message}`); }
        upload.value = '';
        setBusy(false);
      });
      result.wrap.append(upload);
    }
  }
  if (!container.childElementCount) container.textContent = 'No matching fields.';
}
$('#shared-edit').addEventListener('change', async (event) => {
  if ($('#page-fields :invalid')) { event.target.checked = false; status('Correct the invalid page field first.'); return; }
  if (!event.target.checked) { renderPageFields(); return; }
  setBusy(true);
  status('Loading shared headers and footers…');
  try {
    for (const [, path] of PAGE_FILES) {
      if (!state.pages.has(path)) {
        const html = await readFile(path);
        const doc = new DOMParser().parseFromString(html, 'text/html');
        if (!doc.querySelector('main') || !doc.querySelector('body')) throw new Error(`${path} is missing expected content.`);
        state.pages.set(path, doc);
      }
    }
    renderPageFields();
    status('Shared header and footer editing is enabled.');
  } catch (error) {
    event.target.checked = false;
    status(`Could not load shared content: ${error.message}`);
  } finally { setBusy(false); }
});
$('#page-filter').addEventListener('input', (event) => {
  if ($('#page-fields :invalid')) { event.target.value = ''; status('Correct the invalid page field before searching.'); return; }
  renderPageFields();
});
function updatePreview() {
  const doc = state.pages.get(state.selected);
  if (!doc) return;
  const preview = doc.cloneNode(true);
  const base = preview.createElement('base');
  base.href = new URL('../', location.href).href;
  preview.head.prepend(base);
  const imageTypes = { jpg: 'image/jpeg', png: 'image/png', webp: 'image/webp', avif: 'image/avif' };
  for (const element of preview.querySelectorAll('img[src], video[poster]')) {
    const attribute = element.tagName === 'IMG' ? 'src' : 'poster';
    const path = element.getAttribute(attribute);
    const bytes = state.uploads.get(path);
    const type = imageTypes[path?.split('.').pop()];
    if (bytes && type) element.setAttribute(attribute, `data:${type};base64,${bytesToBase64(bytes)}`);
  }
  $('#page-preview').srcdoc = serializePage(preview);
}
$('#refresh-preview').addEventListener('click', updatePreview);

async function stageFile(file, kind, folder) {
  if (!file) throw new Error('Choose a file.');
  const types = {
    image: { extensions: { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/avif': 'avif' }, limit: 5_000_000 },
    video: { extensions: { 'video/mp4': 'mp4', 'video/webm': 'webm' }, limit: 25_000_000 },
    captions: { extensions: { 'text/vtt': 'vtt', '': 'vtt' }, limit: 1_000_000 },
  };
  const config = types[kind];
  if (!config || !Object.hasOwn(config.extensions, file.type) || (kind === 'captions' && !/\.vtt$/i.test(file.name))) throw new Error('Unsupported file type.');
  if (file.size > config.limit) throw new Error(`File is over ${config.limit / 1_000_000} MB.`);
  if (kind === 'captions' && !/^\uFEFF?WEBVTT(?:\s|$)/.test(await file.text())) throw new Error('Captions must be a valid WebVTT file.');
  const path = `${folder}/${crypto.randomUUID()}.${config.extensions[file.type]}`;
  state.uploads.set(path, new Uint8Array(await file.arrayBuffer()));
  return path;
}
function stageImage(file) { return stageFile(file, 'image', 'assets/uploads'); }

const allowedTags = new Set(['A', 'BLOCKQUOTE', 'BR', 'CODE', 'DIV', 'EM', 'H2', 'H3', 'H4', 'HR', 'I', 'IMG', 'LI', 'OL', 'P', 'PRE', 'SPAN', 'STRONG', 'UL']);
function safeArticle(markup) {
  const doc = new DOMParser().parseFromString(markup, 'text/html');
  function clean(node) {
    if (node.nodeType === Node.TEXT_NODE) return document.createTextNode(node.textContent);
    if (node.nodeType !== Node.ELEMENT_NODE || ['SCRIPT', 'STYLE', 'IFRAME', 'OBJECT', 'EMBED', 'FORM', 'SVG', 'VIDEO', 'AUDIO'].includes(node.tagName)) return document.createDocumentFragment();
    const children = [...node.childNodes].map(clean);
    const output = allowedTags.has(node.tagName) ? document.createElement(node.tagName.toLowerCase()) : document.createDocumentFragment();
    if (node.tagName === 'A') {
      const href = node.getAttribute('href') || '';
      if (validateUrl(href) && href) output.setAttribute('href', href);
    }
    if (node.tagName === 'IMG') {
      const src = node.getAttribute('src') || '';
      if (validateUrl(src, true) && src) output.setAttribute('src', src);
      output.setAttribute('alt', node.getAttribute('alt') || '');
    }
    children.forEach((child) => output.append(child));
    return output;
  }
  const output = document.createElement('div');
  [...doc.body.childNodes].map(clean).forEach((node) => output.append(node));
  return output.innerHTML;
}
function currentPost() {
  return state.files.get('blog/posts.json').posts.find((post) => String(post.id) === state.selected);
}
function openBlog(id) {
  const post = state.files.get('blog/posts.json').posts.find((item) => String(item.id) === id);
  if (!post) throw new Error('Article not found.');
  $('#blog-heading').textContent = textFromHtml(post.titleHtml) || 'New article';
  $('#blog-title').value = textFromHtml(post.titleHtml);
  $('#blog-slug').value = post.slug;
  $('#blog-date').value = post.date.slice(0, 10);
  $('#blog-excerpt').value = textFromHtml(post.excerptHtml);
  $('#blog-categories').value = (post.categories || []).map((term) => term.name).join(', ');
  $('#blog-tags').value = (post.tags || []).map((term) => term.name).join(', ');
  $('#blog-body').innerHTML = safeArticle(post.contentHtml || '');
  $('#blog-image').value = post.featuredImage || '';
  $('#blog-alt').value = post.featuredImageAlt || '';
  showPanel('blog-editor');
}
$('#blog-editor').addEventListener('input', (event) => {
  if (['blog-upload', 'blog-inline-upload', 'blog-inline-alt'].includes(event.target.id)) return;
  const post = currentPost();
  const id = event.target.id;
  if (id === 'blog-title') { post.titleHtml = escaped(event.target.value); $('#blog-heading').textContent = event.target.value || 'New article'; renderList(); }
  if (id === 'blog-slug') { post.slug = event.target.value; post.url = `https://seattleathome.com/${event.target.value}/`; }
  if (id === 'blog-date') post.date = `${event.target.value}T12:00:00`;
  if (id === 'blog-excerpt') post.excerptHtml = `<p>${escaped(event.target.value)}</p>`;
  if (id === 'blog-categories' || id === 'blog-tags') {
    const key = id === 'blog-categories' ? 'categories' : 'tags';
    const existing = state.files.get('blog/posts.json').posts.flatMap((item) => item[key] || []);
    const names = [...new Set(event.target.value.split(',').map((name) => name.trim()).filter(Boolean))];
    post[key] = names.map((name) => existing.find((term) => term.name.toLocaleLowerCase() === name.toLocaleLowerCase()) || {
      id: crypto.randomUUID(), name, slug: slugify(name) || `term-${crypto.randomUUID()}`,
    });
  }
  if (id === 'blog-body') post.contentHtml = safeArticle(event.target.innerHTML);
  if (id === 'blog-image') post.featuredImage = event.target.value;
  if (id === 'blog-alt') post.featuredImageAlt = event.target.value;
  post.modified = new Date().toISOString();
  changed('blog/posts.json');
});
document.querySelectorAll('[data-command]').forEach((button) => {
  button.addEventListener('mousedown', (event) => event.preventDefault());
  button.addEventListener('click', () => {
    $('#blog-body').focus();
    document.execCommand(button.dataset.command, false, button.dataset.value || null);
    $('#blog-body').dispatchEvent(new Event('input', { bubbles: true }));
  });
  $('#blog-link').addEventListener('mousedown', (event) => event.preventDefault());
  $('#blog-link').addEventListener('click', () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed || !$('#blog-body').contains(selection.anchorNode)) {
      status('Select the article text you want to link first.');
      return;
    }
    const url = prompt('Enter a website, email, telephone, or relative link:');
    if (url === null) return;
    if (!url.trim() || !validateUrl(url)) { status('That link is not valid.'); return; }
    document.execCommand('createLink', false, url.trim());
    $('#blog-body').dispatchEvent(new Event('input', { bubbles: true }));
  });
});
$('#blog-body').addEventListener('paste', (event) => {
  event.preventDefault();
  document.execCommand('insertText', false, event.clipboardData.getData('text/plain'));
});
$('#blog-body').addEventListener('drop', (event) => event.preventDefault());
$('#blog-upload').addEventListener('change', async (event) => {
  setBusy(true);
  try {
    const path = await stageImage(event.target.files[0]);
    $('#blog-image').value = path;
    $('#blog-image').dispatchEvent(new Event('input', { bubbles: true }));
    status('Image added to the unpublished changes. Add a useful image description.');
  } catch (error) { status(`Could not add image: ${error.message}`); }
  event.target.value = '';
  setBusy(false);
});
$('#blog-inline-upload').addEventListener('change', async (event) => {
  setBusy(true);
  try {
    const alt = $('#blog-inline-alt').value.trim();
    if (!alt) throw new Error('Add an image description first.');
    const path = await stageImage(event.target.files[0]);
    const image = document.createElement('img');
    image.src = path;
    image.setAttribute('src', path);
    image.alt = alt;
    $('#blog-body').append(image);
    $('#blog-body').dispatchEvent(new Event('input', { bubbles: true }));
    $('#blog-inline-alt').value = '';
    status('Image added at the end of the article. It will appear after publishing.');
  } catch (error) { status(`Could not add image: ${error.message}`); }
  event.target.value = '';
  setBusy(false);
});
$('#delete-blog').addEventListener('click', () => {
  if (!confirm('Delete this article when the changes are published?')) return;
  const archive = state.files.get('blog/posts.json');
  archive.posts = archive.posts.filter((post) => String(post.id) !== state.selected);
  archive.total = archive.posts.length;
  state.selected = '';
  changed('blog/posts.json');
  renderList();
  showPanel('');
});

function currentReel() { return state.files.get('reels/reels.json').reels[Number(state.selected)]; }
function openReel(id) {
  const reel = state.files.get('reels/reels.json').reels[Number(id)];
  if (!reel) throw new Error('Reel not found.');
  for (const key of ['title', 'url', 'file', 'poster', 'captions']) $(`#reel-${key}`).value = reel[key] || '';
  $('#reel-heading').textContent = reel.title || 'New reel';
  showPanel('reel-editor');
}
$('#reel-editor').addEventListener('input', (event) => {
  const key = event.target.id.replace('reel-', '');
  if (!['title', 'url', 'file', 'poster', 'captions'].includes(key)) return;
  currentReel()[key] = event.target.value.trim();
  if (key === 'title') { $('#reel-heading').textContent = event.target.value || 'New reel'; renderList(); }
  changed('reels/reels.json');
});
for (const [id, fieldId, kind] of [
  ['reel-video-upload', 'reel-file', 'video'],
  ['reel-poster-upload', 'reel-poster', 'image'],
  ['reel-captions-upload', 'reel-captions', 'captions'],
]) {
  $(`#${id}`).addEventListener('change', async (event) => {
    setBusy(true);
    try {
      const path = await stageFile(event.target.files[0], kind, 'reels');
      $(`#${fieldId}`).value = path.slice('reels/'.length);
      $(`#${fieldId}`).dispatchEvent(new Event('input', { bubbles: true }));
      status('File added to unpublished changes.');
    } catch (error) { status(`Could not add file: ${error.message}`); }
    event.target.value = '';
    setBusy(false);
  });
}
$('#delete-reel').addEventListener('click', () => {
  if (!confirm('Remove this reel when the changes are published?')) return;
  state.files.get('reels/reels.json').reels.splice(Number(state.selected), 1);
  state.selected = '';
  changed('reels/reels.json');
  renderList();
  showPanel('');
});
function currentQuiz() {
  const data = state.files.get('content/quizzes.json');
  const [type, id] = state.selected.split(':');
  return type === 'builtIn' ? data.builtIn[id] : data.custom.find((quiz) => quiz.id === id);
}
function openQuiz() {
  const quiz = currentQuiz();
  if (!quiz) throw new Error('Quiz not found.');
  const builtIn = state.selected.startsWith('builtIn:');
  $('#quiz-heading').textContent = quiz.title || 'New quiz';
  $('#quiz-title').value = quiz.title || '';
  $('#custom-quiz-fields').hidden = builtIn;
  $('#add-question').hidden = builtIn;
  $('#delete-quiz').hidden = builtIn;
  $('#quiz-notice').textContent = builtIn
    ? 'Built-in quiz scoring depends on the existing question and answer order. Keep the meaning of each answer the same.'
    : 'This quiz has one shared result message. It does not collect contact details.';
  $('#quiz-description').value = quiz.description || '';
  $('#quiz-result-title').value = quiz.resultTitle || '';
  $('#quiz-result-copy').value = quiz.resultCopy || '';
  renderQuizQuestions();
  renderQuizResults();
  showPanel('quiz-editor');
}
function renderQuizResults() {
  const builtIn = state.selected.startsWith('builtIn:');
  $('#built-in-results').hidden = !builtIn;
  const fields = $('#quiz-result-fields');
  const cards = $('#quiz-place-cards');
  fields.replaceChildren();
  cards.replaceChildren();
  if (!builtIn) return;
  const quiz = currentQuiz();
  const labels = {
    incompleteTitle: 'Incomplete answers: heading', incompleteDescription: 'Incomplete answers: message',
    exploreTitle: 'Explore result: heading', planTitle: 'Planning result: heading', readyTitle: 'Ready result: heading',
    description: 'Result explanation', contactCopy: 'Optional contact form message',
    financingNeeded: 'Financing needs review: next step', financingReady: 'Financing reviewed: next step',
    costsNeeded: 'Costs need review: next step', costsReady: 'Costs reviewed: next step',
    proceedsNeeded: 'Proceeds need review: next step', proceedsReady: 'Proceeds reviewed: next step',
    paperworkNeeded: 'Paperwork needs review: next step', paperworkReady: 'Paperwork reviewed: next step',
    finalStep: 'Final next step', otherResourceTitle: 'Referral result: heading', unclearTitle: 'Unclear plans: heading',
    matchTitle: 'Fit result: heading', explanation: 'Result explanation', allTitle: 'All areas: heading',
    shortlistTitle: 'Shortlist: heading', intro: 'Places result introduction',
  };
  for (const [key, value] of Object.entries(quiz.results || {})) {
    const item = field(labels[key] || key, value, (input) => { quiz.results[key] = input.value; changed('content/quizzes.json'); }, value.length > 100 ? 'textarea' : 'text');
    fields.append(item.wrap);
  }
  for (const [index, card] of (quiz.cards || []).entries()) {
    const group = document.createElement('fieldset');
    group.className = 'quiz-question';
    const legend = document.createElement('legend');
    legend.textContent = `Place ${index + 1}`;
    group.append(legend);
    for (const [key, label] of [['name', 'Place name'], ['why', 'Why it matched'], ['check', 'What to check']]) {
      const item = field(label, card[key], (input) => { card[key] = input.value; changed('content/quizzes.json'); }, key === 'name' ? 'text' : 'textarea');
      group.append(item.wrap);
    }
    cards.append(group);
  }
}
function renderQuizQuestions() {
  const quiz = currentQuiz();
  const builtIn = state.selected.startsWith('builtIn:');
  const container = $('#quiz-questions');
  container.replaceChildren();
  quiz.questions.forEach((question, index) => {
    const group = document.createElement('fieldset');
    group.className = 'quiz-question';
    const legend = document.createElement('legend');
    legend.textContent = `Question ${index + 1}`;
    group.append(legend);
    const questionField = field('Question', question.question, (input) => { question.question = input.value; changed('content/quizzes.json'); });
    group.append(questionField.wrap);
    question.options.forEach((option, optionIndex) => {
      const optionField = field(`Answer ${optionIndex + 1}`, option, (input) => { question.options[optionIndex] = input.value; changed('content/quizzes.json'); });
      group.append(optionField.wrap);
      if (!builtIn) {
        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'danger';
        remove.textContent = `Remove answer ${optionIndex + 1}`;
        remove.disabled = question.options.length <= 2;
        remove.addEventListener('click', () => { question.options.splice(optionIndex, 1); changed('content/quizzes.json'); renderQuizQuestions(); });
        group.append(remove);
      }
    });
    if (!builtIn) {
      const add = document.createElement('button');
      add.type = 'button';
      add.className = 'secondary';
      add.textContent = 'Add answer';
      add.addEventListener('click', () => { question.options.push(''); changed('content/quizzes.json'); renderQuizQuestions(); });
      const removeQuestion = document.createElement('button');
      removeQuestion.type = 'button';
      removeQuestion.className = 'danger';
      removeQuestion.textContent = 'Remove question';
      removeQuestion.disabled = quiz.questions.length <= 1;
      removeQuestion.addEventListener('click', () => { quiz.questions.splice(index, 1); changed('content/quizzes.json'); renderQuizQuestions(); });
      group.append(add, document.createTextNode(' '), removeQuestion);
    }
    container.append(group);
  });
}
$('#quiz-editor').addEventListener('input', (event) => {
  const key = { 'quiz-title': 'title', 'quiz-description': 'description', 'quiz-result-title': 'resultTitle', 'quiz-result-copy': 'resultCopy' }[event.target.id];
  if (!key) return;
  currentQuiz()[key] = event.target.value;
  if (key === 'title') { $('#quiz-heading').textContent = event.target.value || 'New quiz'; renderList(); }
  changed('content/quizzes.json');
});
$('#add-question').addEventListener('click', () => {
  currentQuiz().questions.push({ question: '', options: ['', ''] });
  changed('content/quizzes.json');
  renderQuizQuestions();
});
$('#delete-quiz').addEventListener('click', () => {
  if (!confirm('Delete this quiz when the changes are published?')) return;
  const data = state.files.get('content/quizzes.json');
  data.custom = data.custom.filter((quiz) => `custom:${quiz.id}` !== state.selected);
  state.selected = '';
  changed('content/quizzes.json');
  renderList();
  showPanel('');
});
async function duplicatePage() {
  if (!state.selected || !state.pages.has(state.selected) || !canChangePageStructure()) return;
  const name = prompt('Name the new page:')?.trim();
  if (!name) return;
  const slug = prompt('Choose a short URL name using lowercase letters, numbers and hyphens:', slugify(name))?.trim();
  if (!slug) return;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) { status('The page URL must contain lowercase letters, numbers and hyphens only.'); return; }
  const path = `${slug}.html`;
  if (PAGE_FILES.some(([, file]) => file === path) || ['editor.html', 'quiz-studio.html'].includes(path)) { status('That page URL is already in use.'); return; }
  const addNavigation = confirm('Add this page to the navigation on every existing page?');
  setBusy(true);
  try {
    try {
      await request(`${API}/contents/${encodeURIComponent(path)}?ref=${encodeURIComponent(state.head)}`);
      throw new Error('That page URL is already in use.');
    } catch (error) {
      if (error.status !== 404) throw error;
    }
    if (addNavigation) {
      for (const [, file] of PAGE_FILES) {
        if (!state.pages.has(file)) {
          const html = await readFile(file);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          if (!doc.querySelector('#main-nav')) throw new Error(`Navigation is missing from ${file}.`);
          state.pages.set(file, doc);
        }
        if (!state.pages.get(file).querySelector('#main-nav')) throw new Error(`Navigation is missing from ${file}.`);
      }
    }
    const source = state.pages.get(state.selected);
    const doc = source.cloneNode(true);
    const sourceMetadata = state.files.get('content/page-metadata.json').pages.find((entry) => entry[0] === state.selected);
    const title = `${name} | Seattle At Home`;
    const description = sourceMetadata[2];
    const url = `https://seattleathome.com/${path}`;
    const schema = doc.querySelector('#site-structured-data');
    const structured = JSON.parse(schema.textContent);
    const pageData = structured['@graph'].find((node) => node['@id']?.endsWith('#webpage'));
    if (!pageData) throw new Error('The original page is missing structured data.');
    Object.assign(pageData, { '@type': 'WebPage', '@id': `${url}#webpage`, url, name: title, description });
    structured['@graph'] = structured['@graph'].filter((node) => node['@type'] !== 'BreadcrumbList');
    structured['@graph'].push({ '@type': 'BreadcrumbList', itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: 'https://seattleathome.com/' },
      { '@type': 'ListItem', position: 2, name, item: url },
    ] });
    schema.textContent = JSON.stringify(structured).replaceAll('<', '\\u003c');
    doc.querySelector('title').textContent = title;
    for (const meta of doc.querySelectorAll('meta[property="og:title"], meta[name="twitter:title"]')) meta.content = title;
    doc.querySelector('link[rel="canonical"]').href = url;
    doc.querySelector('meta[property="og:url"]').content = url;
    doc.querySelectorAll('#main-nav [aria-current]').forEach((link) => link.removeAttribute('aria-current'));
    if (addNavigation) {
      for (const [file, page] of [...state.pages, [path, doc]]) {
        const nav = page.querySelector('#main-nav');
        const link = page.createElement('a');
        link.href = path;
        link.textContent = name;
        if (file === path) link.setAttribute('aria-current', 'page');
        nav.append(link);
        if (file !== path) changed(file);
      }
    }
    state.pages.set(path, doc);
    state.files.get('content/page-metadata.json').pages.push([path, title, description, name, 'WebPage']);
    PAGE_FILES.push([name, path]);
    changed(path);
    changed('content/page-metadata.json');
    state.selected = path;
    renderList();
    await openPage(path);
    status('Page duplicated. Replace its copied content and search description before publishing.');
  } catch (error) { status(`Could not duplicate page: ${error.message}`); }
  finally { setBusy(false); }
}
$('#add-item').addEventListener('click', () => {
  if (state.kind === 'pages') {
    duplicatePage();
  } else if (state.kind === 'blog') {
    const archive = state.files.get('blog/posts.json');
    const post = { id: crypto.randomUUID(), slug: '', url: '', date: new Date().toISOString(), modified: new Date().toISOString(), titleHtml: '', excerptHtml: '', contentHtml: '<p></p>', featuredImage: '', featuredImageAlt: '', categories: [], tags: [] };
    archive.posts.unshift(post);
    archive.total = archive.posts.length;
    changed('blog/posts.json');
    selectItem(String(post.id));
  } else if (state.kind === 'reels') {
    const reels = state.files.get('reels/reels.json').reels;
    reels.push({ title: '', url: '', file: '', poster: '', captions: '' });
    changed('reels/reels.json');
    selectItem(String(reels.length - 1));
  } else if (state.kind === 'quizzes') {
    const quiz = { id: crypto.randomUUID(), title: '', description: '', resultTitle: '', resultCopy: '', questions: [{ question: '', options: ['', ''] }] };
    state.files.get('content/quizzes.json').custom.push(quiz);
    changed('content/quizzes.json');
    selectItem(`custom:${quiz.id}`);
  }
});

function validateChanges() {
  if ($('#page-fields :invalid')) throw new Error('A page link or image path is invalid. Correct it before publishing.');
  if (state.dirty.has('content/page-metadata.json')) {
    for (const [, title, description] of state.files.get('content/page-metadata.json').pages) {
      if (!title.trim() || !description.trim()) throw new Error('Every page needs a search title and description.');
    }
  }
  for (const [path, doc] of state.pages) {
    if (state.dirty.has(path) && [...doc.querySelectorAll('video track')].some((track) => !track.getAttribute('src')?.trim())) throw new Error(`Add a captions file or remove the empty captions track on ${path}.`);
  }
  if (state.dirty.has('blog/posts.json')) {
    const posts = state.files.get('blog/posts.json').posts;
    const slugs = new Set();
    for (const post of posts) {
      if (!textFromHtml(post.titleHtml) || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(post.slug) || !/^\d{4}-\d{2}-\d{2}/.test(post.date)) throw new Error('Every blog article needs a title, valid URL slug, and publication date.');
      if (slugs.has(post.slug)) throw new Error(`Blog URL slug "${post.slug}" is used more than once.`);
      if (!validateUrl(post.featuredImage || '', true)) throw new Error(`The image for "${textFromHtml(post.titleHtml)}" has an invalid URL.`);
      slugs.add(post.slug);
    }
  }
  if (state.dirty.has('reels/reels.json')) {
    for (const reel of state.files.get('reels/reels.json').reels) {
      const validInstagram = /^https:\/\/(?:www\.)?instagram\.com\/reels?\/[A-Za-z0-9_-]+\/?$/.test(reel.url || '');
      const validFile = /^[^/\\]+\.(?:mp4|webm)$/i.test(reel.file || '');
      if (!reel.title?.trim() || (!validInstagram && !validFile)) throw new Error('Every reel needs a title and a valid Instagram reel URL or local video filename.');
      if (reel.poster && !/^[^/\\]+\.(?:jpg|jpeg|png|webp|avif)$/i.test(reel.poster)) throw new Error('Reel poster must be a local image filename.');
      if (reel.captions && !/^[^/\\]+\.vtt$/i.test(reel.captions)) throw new Error('Reel captions must be a local .vtt filename.');
    }
  }
  if (state.dirty.has('content/quizzes.json')) {
    const data = state.files.get('content/quizzes.json');
    const shapes = { buy: [4, 4, 4, 4, 4, 4], sell: [4, 4, 4, 4, 4, 4], fit: [6, 3, 4, 4, 4, 4], places: [5, 6, 5, 6, 4] };
    for (const [kind, lengths] of Object.entries(shapes)) {
      const quiz = data.builtIn[kind];
      if (!quiz?.title?.trim() || quiz.questions.length !== lengths.length || quiz.questions.some((question, index) => !question.question.trim() || question.options.length !== lengths[index] || question.options.some((option) => !option.trim()))) throw new Error(`The built-in ${kind} quiz has incomplete questions or answers.`);
      if (!quiz.results || RESULT_KEYS[kind].some((key) => typeof quiz.results[key] !== 'string' || !quiz.results[key].trim())) throw new Error(`The built-in ${kind} quiz has incomplete result text.`);
      if (kind === 'places' && (!Array.isArray(quiz.cards) || quiz.cards.length !== 6 || quiz.cards.some((card) => ['name', 'why', 'check'].some((key) => !card[key]?.trim())))) throw new Error('All six place cards need a name, reason, and check.');
    }
    for (const quiz of data.custom) {
      if (!quiz.title.trim() || !quiz.resultTitle.trim() || !quiz.questions.length || quiz.questions.some((question) => !question.question.trim() || question.options.length < 2 || question.options.some((option) => !option.trim()))) throw new Error('Every custom quiz needs a title, result heading, and complete questions with at least two answers each.');
    }
  }
}
$('#backup').addEventListener('click', () => {
  const files = {};
  for (const path of state.dirty) files[path] = state.pages.has(path) ? serializePage(state.pages.get(path)) : JSON.stringify(state.files.get(path), null, 2);
  const uploads = {};
  for (const [path, bytes] of state.uploads) uploads[path] = bytesToBase64(bytes);
  const blob = new Blob([JSON.stringify({ baseCommit: state.head, files, uploads }, null, 2)], { type: 'application/json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = 'seattle-at-home-unpublished-backup.json';
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  status('Backup downloaded. It contains content and uploaded media, never the GitHub token.');
});
$('#restore').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (state.dirty.size && !confirm('Replace the current unpublished changes with this backup?')) { event.target.value = ''; return; }
  setBusy(true);
  try {
    if (file.size > 100_000_000) throw new Error('The backup is over 100 MB.');
    const backup = JSON.parse(await file.text());
    if (backup.baseCommit !== state.head) throw new Error('This backup was made from a different repository version. Do not restore it over newer content; copy and reapply the changes instead.');
    if (!backup.files || typeof backup.files !== 'object' || Array.isArray(backup.files) || !backup.uploads || typeof backup.uploads !== 'object' || Array.isArray(backup.uploads)) throw new Error('The backup format is invalid.');
    const backupMetadata = backup.files['content/page-metadata.json']
      ? JSON.parse(backup.files['content/page-metadata.json'])
      : JSON.parse(await readRepositoryFile('content/page-metadata.json'));
    if (!Array.isArray(backupMetadata?.pages)) throw new Error('The backup has no valid page metadata.');
    if (backupMetadata.pages.some((entry) => !Array.isArray(entry) || entry.length < 5 || entry.some((value) => typeof value !== 'string'))) throw new Error('The backup has invalid page metadata.');
    const pageNames = backupMetadata.pages.map((entry) => entry[0]);
    if (new Set(pageNames).size !== pageNames.length || DEFAULT_PAGE_FILES.some(([, path]) => !pageNames.includes(path))) throw new Error('The backup has missing or duplicate pages.');
    if (pageNames.some((name) => typeof name !== 'string' || !/^[a-z0-9]+(?:-[a-z0-9]+)*\.html$/.test(name) || ['editor.html', 'quiz-studio.html'].includes(name))) throw new Error('The backup contains an invalid page name.');
    const allowed = new Set([...pageNames, 'content/page-metadata.json', 'content/quizzes.json', 'blog/posts.json', 'reels/reels.json', 'sitemap.xml']);
    const restoredPages = new Map();
    const restoredFiles = new Map();
    for (const [path, content] of Object.entries(backup.files)) {
      if (!allowed.has(path) || typeof content !== 'string') throw new Error(`The backup contains an unsupported file: ${path}.`);
      if (pageNames.includes(path)) {
        const doc = new DOMParser().parseFromString(content, 'text/html');
        if (!doc.querySelector('main') || !doc.querySelector('body')) throw new Error(`The backup page ${path} is invalid.`);
        restoredPages.set(path, doc);
      } else if (path === 'sitemap.xml') {
        restoredFiles.set(path, content);
      } else {
        const parsed = JSON.parse(content);
        const key = path === 'blog/posts.json' ? 'posts' : path === 'reels/reels.json' ? 'reels' : path === 'content/quizzes.json' ? 'custom' : 'pages';
        if (!Array.isArray(parsed[key]) || (path === 'content/quizzes.json' && !parsed.builtIn)) throw new Error(`The backup file ${path} is invalid.`);
        restoredFiles.set(path, parsed);
      }
    }
    const restoredUploads = new Map();
    for (const [path, content] of Object.entries(backup.uploads)) {
      if (!/^(?:assets\/uploads|reels|youtube)\/[0-9a-f-]{36}\.(?:jpg|png|webp|avif|mp4|webm|vtt)$/i.test(path) || typeof content !== 'string' || !/^[A-Za-z0-9+/]*={0,2}$/.test(content)) throw new Error(`The backup upload ${path} is invalid.`);
      const binary = atob(content);
      restoredUploads.set(path, Uint8Array.from(binary, (char) => char.charCodeAt(0)));
    }
    state.files.clear();
    state.pages.clear();
    state.dirty.clear();
    state.uploads.clear();
    for (const [path, doc] of restoredPages) { state.pages.set(path, doc); state.dirty.add(path); }
    for (const [path, content] of restoredFiles) { state.files.set(path, content); state.dirty.add(path); }
    for (const [path, bytes] of restoredUploads) state.uploads.set(path, bytes);
    PAGE_FILES.splice(0, PAGE_FILES.length, ...DEFAULT_PAGE_FILES.map((entry) => [...entry]));
    for (const [file, , , label] of backupMetadata.pages) {
      if (!PAGE_FILES.some(([, path]) => path === file)) PAGE_FILES.push([label, file]);
    }
    state.selected = '';
    state.kind = 'pages';
    $('#content-kind').value = 'pages';
    $('#content-search').value = '';
    $('#shared-edit').checked = false;
    $('#publish').disabled = state.dirty.size === 0;
    $('#backup').disabled = state.dirty.size === 0;
    showPanel('');
    renderList();
    status('Backup restored in this tab. Review the changes before publishing.');
  } catch (error) { status(`Could not restore backup: ${error.message}`); }
  finally { event.target.value = ''; setBusy(false); }
});
async function prepareSitemap() {
  if (!state.dirty.has('blog/posts.json') && !state.dirty.has('content/quizzes.json') && !state.dirty.has('content/page-metadata.json')) return;
  const archive = await jsonFile('blog/posts.json', 'posts');
  const quizzes = await jsonFile('content/quizzes.json', 'custom');
  const metadata = await jsonFile('content/page-metadata.json', 'pages');
  const urls = [
    ...metadata.pages.filter(([file]) => !['404.html', 'story.html', 'quiz.html', 'blog-post.html'].includes(file)).map(([file]) => `https://seattleathome.com/${file === 'index.html' ? '' : file}`),
    ...['fit', 'buy', 'sell', 'places'].map((kind) => `https://seattleathome.com/quiz.html?type=${kind}`),
    ...quizzes.custom.map((quiz) => `https://seattleathome.com/quiz.html?type=${encodeURIComponent(`custom-${quiz.id}`)}`),
    ...archive.posts.map((post) => `https://seattleathome.com/blog-post.html?slug=${encodeURIComponent(post.slug)}`),
  ];
  state.files.set('sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map((url) => `  <url><loc>${escaped(url)}</loc></url>`).join('\n')}\n</urlset>\n`);
  state.dirty.add('sitemap.xml');
}
async function publish() {
  if (state.busy || !state.dirty.size) return;
  try { validateChanges(); } catch (error) { status(`Cannot publish: ${error.message}`); return; }
  if (!confirm('Publish these changes to the website repository? If hosting is connected, it will build and deploy them.')) return;
  setBusy(true);
  status('Publishing to GitHub…');
  try {
    const latest = await request(`${API}/git/ref/heads/main`);
    if (latest.object.sha !== state.head) throw new Error('The website changed since you connected. Your changes have not been published; download a backup, reconnect, and reapply your changes.');
    await prepareSitemap();
    const entries = [];
    for (const path of state.dirty) {
      const file = state.files.get(path);
      const value = state.pages.has(path) ? serializePage(state.pages.get(path)) : typeof file === 'string' ? file : JSON.stringify(file, null, 2) + '\n';
      const blob = await request(`${API}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: bytesToBase64(new TextEncoder().encode(value)), encoding: 'base64' }) });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    for (const [path, bytes] of state.uploads) {
      const blob = await request(`${API}/git/blobs`, { method: 'POST', body: JSON.stringify({ content: bytesToBase64(bytes), encoding: 'base64' }) });
      entries.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
    }
    const tree = await request(`${API}/git/trees`, { method: 'POST', body: JSON.stringify({ base_tree: state.tree, tree: entries }) });
    const commit = await request(`${API}/git/commits`, { method: 'POST', body: JSON.stringify({ message: 'Update website content', tree: tree.sha, parents: [state.head] }) });
    await request(`${API}/git/refs/heads/main`, { method: 'PATCH', body: JSON.stringify({ sha: commit.sha, force: false }) });
    state.head = commit.sha;
    state.tree = tree.sha;
    state.dirty.clear();
    state.uploads.clear();
    $('#publish').disabled = true;
    $('#backup').disabled = true;
    status('Published to GitHub. If hosting is connected, the update appears after its build completes; check the live site.');
  } catch (error) { status(`Could not publish: ${error.message}`); }
  finally { setBusy(false); }
}
$('#publish').addEventListener('click', publish);
