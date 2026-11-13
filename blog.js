const grid = document.querySelector('#blog-card-grid');
const searchInput = document.querySelector('#blog-search');
const categorySelect = document.querySelector('#blog-category');
const countStatus = document.querySelector('#blog-result-count');
const emptyStatus = document.querySelector('#blog-empty');
const pagination = document.querySelector('#blog-pagination');
const pageSize = 12;
let allPosts = [];
let currentPage = 1;

function safeText(html) {
  const documentFragment = new DOMParser().parseFromString(html || '', 'text/html');
  documentFragment.querySelectorAll('script,style,iframe,object,embed,form,svg').forEach((node) => node.remove());
  return documentFragment.body.textContent.replace(/\s+/g, ' ').trim();
}

function formatDate(value) {
  const date = new Date(value);
  if (Number.isNaN(date.valueOf())) return '';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'long', day: 'numeric' }).format(date);
}

function blogPostUrl(post) {
  return `blog-post.html?slug=${encodeURIComponent(post.slug)}`;
}

function escapeHtml(value) {
  return String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');
}

function applyLocalDrafts(posts) {
  try {
    const saved = JSON.parse(localStorage.getItem('seattle-at-home-editor-v1'));
    const drafts = new Map((saved?.pages || []).map((draft) => [draft.id, draft]));
    return posts.map((post) => {
      const draft = drafts.get(`blog-${post.id}`);
      if (!draft) return post;
      return {
        ...post,
        titleHtml: escapeHtml(draft.headline || plainText(post.titleHtml)),
        excerptHtml: escapeHtml(draft.intro || ''),
        contentHtml: draft.body || '',
        featuredImage: draft.image || '',
        featuredImageAlt: draft.imageAlt || '',
      };
    });
  } catch {
    return posts;
  }
}

function cardFor(post) {
  const card = document.createElement('article');
  card.className = 'blog-card scroll-reveal';
  const category = post.categories?.[0]?.name || 'Seattle At Home';
  if (post.featuredImage) {
    const figure = document.createElement('a');
    figure.className = 'blog-card-image';
    figure.href = blogPostUrl(post);
    figure.setAttribute('aria-label', `Read ${safeText(post.titleHtml)}`);
    const image = document.createElement('img');
    image.src = post.featuredImage.startsWith('images/') ? `blog/${post.featuredImage}` : post.featuredImage;
    image.alt = post.featuredImageAlt || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    figure.append(image);
    card.append(figure);
  }
  const copy = document.createElement('div');
  copy.className = 'blog-card-copy';
  const label = document.createElement('p');
  label.className = 'blog-card-category';
  label.textContent = category;
  const title = document.createElement('h2');
  const link = document.createElement('a');
  link.href = blogPostUrl(post);
  link.textContent = safeText(post.titleHtml);
  title.append(link);
  const date = document.createElement('time');
  date.className = 'blog-card-date';
  date.dateTime = post.date;
  date.textContent = formatDate(post.date);
  const excerpt = document.createElement('p');
  excerpt.className = 'blog-card-excerpt';
  excerpt.textContent = safeText(post.excerptHtml) || safeText(post.contentHtml).slice(0, 220);
  const readLink = document.createElement('a');
  readLink.className = 'blog-read-link';
  readLink.href = blogPostUrl(post);
  readLink.textContent = 'Read article';
  copy.append(label, title, date, excerpt, readLink);
  card.append(copy);
  return card;
}

function filteredPosts() {
  const query = searchInput.value.trim().toLocaleLowerCase();
  const category = categorySelect.value;
  return allPosts.filter((post) => {
    const categoryMatch = !category || post.categories?.some((term) => term.slug === category);
    const searchable = `${safeText(post.titleHtml)} ${safeText(post.excerptHtml)} ${post.categories?.map((term) => term.name).join(' ') || ''}`.toLocaleLowerCase();
    return categoryMatch && (!query || searchable.includes(query));
  });
}

function renderArchive() {
  const matches = filteredPosts();
  const pages = Math.ceil(matches.length / pageSize);
  currentPage = Math.max(1, Math.min(currentPage, pages || 1));
  const start = (currentPage - 1) * pageSize;
  grid.replaceChildren(...matches.slice(start, start + pageSize).map(cardFor));
  grid.setAttribute('aria-busy', 'false');
  countStatus.textContent = `${matches.length} ${matches.length === 1 ? 'post' : 'posts'}`;
  emptyStatus.hidden = matches.length > 0;
  pagination.hidden = pages <= 1;
  document.querySelector('#blog-page-status').textContent = `Page ${currentPage} of ${pages || 1}`;
  document.querySelector('#blog-previous').disabled = currentPage <= 1;
  document.querySelector('#blog-next').disabled = currentPage >= pages;
}

async function loadBlogArchive() {
  try {
    const response = await fetch('blog/posts.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Blog archive unavailable');
    const archive = await response.json();
    if (!Array.isArray(archive.posts)) throw new Error('Invalid blog archive');
    allPosts = applyLocalDrafts(archive.posts);
    const categories = new Map();
    allPosts.forEach((post) => post.categories?.forEach((term) => categories.set(term.slug, term.name)));
    [...categories.entries()].sort((a, b) => a[1].localeCompare(b[1])).forEach(([slug, name]) => {
      const option = document.createElement('option');
      option.value = slug;
      option.textContent = name;
      categorySelect.append(option);
    });
    renderArchive();
  } catch {
    grid.setAttribute('aria-busy', 'false');
    countStatus.textContent = 'Blog archive unavailable';
    emptyStatus.hidden = false;
    emptyStatus.textContent = 'The blog archive could not be loaded. Please try again later.';
  }
}

searchInput.addEventListener('input', () => { currentPage = 1; renderArchive(); });
categorySelect.addEventListener('change', () => { currentPage = 1; renderArchive(); });
document.querySelector('#blog-previous').addEventListener('click', () => { currentPage -= 1; renderArchive(); });
document.querySelector('#blog-next').addEventListener('click', () => { currentPage += 1; renderArchive(); });
loadBlogArchive();