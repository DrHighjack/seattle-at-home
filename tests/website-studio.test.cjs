const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.join(__dirname, '..');
const source = fs.readFileSync(path.join(root, 'studio/studio.js'), 'utf8');

function harness(fetch) {
  const elements = new Map();
  function makeElement() {
    return {
      value: '', textContent: '', disabled: false, hidden: false, checked: false,
      listeners: {},
      addEventListener(name, callback) { this.listeners[name] = callback; },
      setAttribute() {}, replaceChildren() {}, append() {},
    };
  }
  function element(selector) {
    if (!elements.has(selector)) elements.set(selector, makeElement());
    return elements.get(selector);
  }
  const context = vm.createContext({
    document: {
      querySelector: (selector) => selector === '#page-fields :invalid' ? null : element(selector),
      querySelectorAll: () => [],
      createElement: makeElement,
    },
    window: { addEventListener() {}, isSecureContext: true },
    location: { hostname: 'localhost' },
    confirm: () => true,
    fetch,
    TextEncoder,
    TextDecoder,
    URL,
    Uint8Array,
    btoa: (value) => Buffer.from(value, 'binary').toString('base64'),
    atob: (value) => Buffer.from(value, 'base64').toString('binary'),
    console,
  });
  vm.runInContext(source, context);
  return { context, element, state: vm.runInContext('state', context) };
}
const response = (data, status = 200) => ({ ok: status < 400, status, json: async () => data });

test('editor rejects unsafe links and allows common website links', () => {
  const { context } = harness();
  const validate = vm.runInContext('validateUrl', context);
  for (const value of ['javascript:alert(1)', 'data:text/html,test', '//evil.example', 'https://good.example\\@evil.example']) {
    assert.equal(validate(value), false, value);
  }
  for (const value of ['https://example.com', '/about.html', '#reviews', 'mailto:emily@example.com', 'tel:+14255878838']) {
    assert.equal(validate(value), true, value);
  }
  assert.equal(validate('mailto:emily@example.com', true), false);
});

test('GitHub errors are surfaced without including the access token', async () => {
  const { context, state } = harness(async () => response({ message: 'Bad credentials' }, 401));
  state.token = 'secret-token';
  const request = vm.runInContext('request', context);
  await assert.rejects(request('https://api.github.com/user'), (error) => {
    assert.match(error.message, /401.*Bad credentials/);
    assert.doesNotMatch(error.message, /secret-token/);
    return true;
  });
});

test('a changed remote branch stops publishing without writing or discarding edits', async () => {
  const requests = [];
  const { context, element, state } = harness(async (url, options) => {
    requests.push({ url, options });
    return response({ object: { sha: 'new-head' } });
  });
  state.token = 'secret-token';
  state.head = 'old-head';
  state.tree = 'old-tree';
  state.dirty.add('index.html');
  state.pages.set('index.html', { documentElement: { outerHTML: '<html></html>' }, querySelectorAll: () => [] });
  await vm.runInContext('publish()', context);
  assert.equal(requests.length, 1);
  assert.match(element('#status').textContent, /changed since you connected/);
  assert.equal(state.dirty.has('index.html'), true);
});

test('publishing creates one atomic commit and updates the sitemap for custom quizzes', async () => {
  const requests = [];
  const { context, element, state } = harness(async (url, options = {}) => {
    requests.push({ url, options });
    if (url.endsWith('/git/ref/heads/main')) return response({ object: { sha: 'base-head' } });
    if (url.endsWith('/git/blobs')) return response({ sha: `blob-${requests.length}` });
    if (url.endsWith('/git/trees')) return response({ sha: 'new-tree' });
    if (url.endsWith('/git/commits')) return response({ sha: 'new-head' });
    if (url.endsWith('/git/refs/heads/main')) return response({ object: { sha: 'new-head' } });
    throw new Error(`Unexpected API request: ${url}`);
  });
  const quizzes = JSON.parse(fs.readFileSync(path.join(root, 'content/quizzes.json'), 'utf8'));
  quizzes.custom.push({ id: 'my-quiz', title: 'My quiz', resultTitle: 'Next step', questions: [{ question: 'Ready?', options: ['Yes', 'No'] }] });
  state.token = 'secret-token';
  state.head = 'base-head';
  state.tree = 'base-tree';
  state.files.set('content/quizzes.json', quizzes);
  state.files.set('content/page-metadata.json', JSON.parse(fs.readFileSync(path.join(root, 'content/page-metadata.json'), 'utf8')));
  state.files.set('blog/posts.json', { posts: [{ slug: 'my-story' }] });
  state.files.set('sitemap.xml', '<?xml version="1.0"?>\n<urlset>\n  <url><loc>https://seattleathome.com/blog-post.html?slug=old</loc></url>\n</urlset>\n');
  state.dirty.add('content/quizzes.json');
  await vm.runInContext('publish()', context);
  const tree = requests.find(({ url }) => url.endsWith('/git/trees'));
  const treeBody = JSON.parse(tree.options.body);
  assert.equal(treeBody.base_tree, 'base-tree');
  assert.deepEqual(treeBody.tree.map((item) => item.path), ['content/quizzes.json', 'sitemap.xml']);
  const blobs = requests.filter(({ url }) => url.endsWith('/git/blobs'));
  const sitemap = Buffer.from(JSON.parse(blobs[1].options.body).content, 'base64').toString();
  assert.match(sitemap, /quiz\.html\?type=custom-my-quiz/);
  assert.match(sitemap, /blog-post\.html\?slug=my-story/);
  assert.doesNotMatch(sitemap, /slug=old/);
  const commit = JSON.parse(requests.find(({ url }) => url.endsWith('/git/commits')).options.body);
  assert.deepEqual(commit.parents, ['base-head']);
  const ref = JSON.parse(requests.find(({ url }) => url.endsWith('/git/refs/heads/main')).options.body);
  assert.deepEqual(ref, { sha: 'new-head', force: false });
  assert.ok(requests.every(({ options }) => !options.body?.includes('secret-token')));
  assert.equal(state.dirty.size, 0);
  assert.match(element('#status').textContent, /Published to GitHub/);
});

test('built-in quiz data preserves question and answer counts used by scoring', () => {
  const data = JSON.parse(fs.readFileSync(path.join(root, 'content/quizzes.json'), 'utf8'));
  const counts = Object.fromEntries(Object.entries(data.builtIn).map(([name, quiz]) => [name, quiz.questions.map((question) => question.options.length)]));
  assert.deepEqual(counts, { buy: [4, 4, 4, 4, 4, 4], sell: [4, 4, 4, 4, 4, 4], fit: [6, 3, 4, 4, 4, 4], places: [5, 6, 5, 6, 4] });
  assert.ok(Object.values(data.builtIn).every((quiz) => quiz.questions.every((question) => question.question && question.options.every(Boolean))));
});

test('restoring an older backup discards unpublished page metadata', async () => {
  const metadata = fs.readFileSync(path.join(root, 'content/page-metadata.json'), 'utf8');
  const { context, element, state } = harness(async (url) => {
    assert.match(url, /content\/page-metadata\.json\?ref=base-head$/);
    return response({ type: 'file', encoding: 'base64', content: Buffer.from(metadata).toString('base64') });
  });
  state.head = 'base-head';
  const modifiedMetadata = JSON.parse(metadata);
  modifiedMetadata.pages.push(['unpublished.html', 'New page', 'Description', 'New page', 'WebPage']);
  state.files.set('content/page-metadata.json', modifiedMetadata);
  state.dirty.add('content/page-metadata.json');
  const backup = { baseCommit: 'base-head', files: { 'blog/posts.json': JSON.stringify({ posts: [] }) }, uploads: {} };
  const event = { target: { value: 'backup.json', files: [{ size: 100, text: async () => JSON.stringify(backup) }] } };
  await element('#restore').listeners.change(event);
  const pageFiles = vm.runInContext('PAGE_FILES.map(([, path]) => path)', context);
  assert.equal(pageFiles.includes('unpublished.html'), false);
  assert.equal(state.files.has('content/page-metadata.json'), false);
  assert.deepEqual([...state.dirty], ['blog/posts.json']);
  assert.match(element('#status').textContent, /Backup restored/);
});

test('failed backup restore preserves unpublished changes', async () => {
  const { element, state } = harness(async () => response({ message: 'Not available' }, 503));
  state.head = 'base-head';
  state.files.set('content/page-metadata.json', { pages: [['unpublished.html']] });
  state.dirty.add('content/page-metadata.json');
  const backup = { baseCommit: 'base-head', files: {}, uploads: {} };
  await element('#restore').listeners.change({ target: { value: 'backup.json', files: [{ size: 100, text: async () => JSON.stringify(backup) }] } });
  assert.equal(state.dirty.has('content/page-metadata.json'), true);
  assert.match(element('#status').textContent, /Could not restore backup.*503/);
});

test('studio sitemap matches generated sitemap including added pages and quizzes', async () => {
  const { context, state } = harness();
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'content/page-metadata.json'), 'utf8'));
  const quizzes = JSON.parse(fs.readFileSync(path.join(root, 'content/quizzes.json'), 'utf8'));
  const archive = JSON.parse(fs.readFileSync(path.join(root, 'blog/posts.json'), 'utf8'));
  metadata.pages.push(['community-guide.html', 'Community guide', 'Description', 'Community guide', 'WebPage']);
  quizzes.custom.push({ id: 'my-quiz' });
  state.files.set('content/page-metadata.json', metadata);
  state.files.set('content/quizzes.json', quizzes);
  state.files.set('blog/posts.json', archive);
  state.dirty.add('content/page-metadata.json');
  await vm.runInContext('prepareSitemap()', context);
  const generated = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8')
    .replace('  <url><loc>https://seattleathome.com/quiz.html?type=fit</loc></url>', '  <url><loc>https://seattleathome.com/community-guide.html</loc></url>\n  <url><loc>https://seattleathome.com/quiz.html?type=fit</loc></url>')
    .replace('  <url><loc>https://seattleathome.com/blog-post.html?', '  <url><loc>https://seattleathome.com/quiz.html?type=custom-my-quiz</loc></url>\n  <url><loc>https://seattleathome.com/blog-post.html?');
  assert.equal(state.files.get('sitemap.xml'), generated);
});
