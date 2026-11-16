const previewMessage = 'Preview only — form not connected';

function showStatus(container, message) {
  let status = container.querySelector('.preview-status');
  if (!status) {
    status = document.createElement('p');
    status.className = 'preview-status';
    status.setAttribute('role', 'status');
    container.append(status);
  }
  status.hidden = false;
  status.textContent = message;
}

document.addEventListener('submit', (event) => {
  if (event.target.matches('#newsletter-form')) return;
  event.preventDefault();
  showStatus(event.target, previewMessage);
});

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.querySelector('#main-nav');
function closeMenu() {
  menuButton.setAttribute('aria-expanded', 'false');
  menuButton.querySelector('.menu-label').textContent = 'Menu';
  mainNav.classList.remove('is-open');
}
menuButton.addEventListener('click', () => {
  const expanded = menuButton.getAttribute('aria-expanded') !== 'true';
  menuButton.setAttribute('aria-expanded', String(expanded));
  menuButton.querySelector('.menu-label').textContent = expanded ? 'Close' : 'Menu';
  mainNav.classList.toggle('is-open', expanded);
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && menuButton.getAttribute('aria-expanded') === 'true') {
    closeMenu();
    menuButton.focus();
  }
});
mainNav.addEventListener('click', closeMenu);
matchMedia('(min-width: 1280px)').addEventListener('change', closeMenu);

function curatedReel(entry) {
  if (!entry || typeof entry !== 'object') return null;
  const title = typeof entry.title === 'string' ? entry.title.trim() : '';
  if (!title) return null;
  const localFile = (value, extension) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    try {
      const url = new URL(value, new URL('reels/', location.href));
      if (url.origin !== location.origin || !url.pathname.startsWith(new URL('reels/', location.href).pathname)) return null;
      return extension.test(url.pathname) ? url.href : null;
    } catch { return null; }
  };
  let instagram = null;
  let key = null;
  if (typeof entry.url === 'string') {
    try {
      const url = new URL(entry.url);
      const match = url.pathname.match(/^\/reels?\/([A-Za-z0-9_-]+)\/?$/);
      if (url.protocol === 'https:' && ['instagram.com', 'www.instagram.com'].includes(url.hostname) && match) {
        instagram = `https://www.instagram.com/reel/${match[1]}/`;
        key = `instagram:${match[1]}`;
      }
    } catch {}
  }
  const video = localFile(entry.file, /\.(mp4|webm)$/i);
  if (!instagram && !video) return null;
  return {
    key: key || `file:${new URL(video).pathname}`,
    title,
    instagram,
    video,
    poster: localFile(entry.poster, /\.(jpg|jpeg|png|webp|avif)$/i),
    captions: localFile(entry.captions, /\.vtt$/i),
  };
}

function selectReels(entries, count = 3, random = Math.random) {
  const unique = [];
  const seen = new Set();
  for (const entry of entries) {
    const reel = curatedReel(entry);
    if (!reel) continue;
    const identifiers = [reel.key];
    if (reel.video) identifiers.push(`file:${new URL(reel.video).pathname}`);
    const duplicate = identifiers.some((identifier) => seen.has(identifier));
    identifiers.forEach((identifier) => seen.add(identifier));
    if (!duplicate) unique.push(reel);
  }
  const shuffled = [...unique];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled.slice(0, count);
}

async function loadReels() {
  const section = document.querySelector('[data-reels-section]');
  if (!section) return;
  const grid = section.querySelector('[data-reels-grid]');
  const status = section.querySelector('[data-reels-status]');
  try {
    const response = await fetch('reels/reels.json', { cache: 'no-cache' });
    if (!response.ok) throw new Error('Reels list unavailable');
    const manifest = await response.json();
    if (!Array.isArray(manifest.reels)) throw new Error('Invalid reels list');
    const selection = selectReels(manifest.reels);
    if (!selection.length) {
      status.textContent = 'Curated reels coming soon.';
      return;
    }
    for (const reel of selection) {
      const card = document.createElement('article');
      card.className = 'reel-card';
      card.dataset.reelKey = reel.key;
      if (reel.video) {
        const video = document.createElement('video');
        video.controls = true;
        video.preload = 'metadata';
        video.playsInline = true;
        video.src = reel.video;
        video.setAttribute('aria-label', reel.title);
        if (reel.poster) video.poster = reel.poster;
        if (reel.captions) {
          const track = document.createElement('track');
          track.kind = 'captions';
          track.srclang = 'en';
          track.label = 'English';
          track.src = reel.captions;
          video.append(track);
        }
        card.append(video);
      } else {
        const link = document.createElement('a');
        link.className = 'reel-link';
        link.href = reel.instagram;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.setAttribute('aria-label', `${reel.title} — Watch on Instagram (opens a new tab)`);
        if (reel.poster) {
          const image = document.createElement('img');
          image.src = reel.poster;
          image.alt = reel.title;
          image.loading = 'lazy';
          link.append(image);
        }
        const play = document.createElement('span');
        play.className = 'play-icon';
        play.setAttribute('aria-hidden', 'true');
        play.textContent = '▶';
        link.append(play);
        card.append(link);
      }
      const title = document.createElement('h3');
      title.textContent = reel.title;
      card.append(title);
      if (reel.instagram) {
        const link = document.createElement('a');
        link.href = reel.instagram;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Watch on Instagram';
        card.append(link);
      }
      grid.append(card);
    }
    status.hidden = true;
  } catch {
    status.textContent = 'Reels are unavailable right now. Please try again later.';
  } finally {
    grid.setAttribute('aria-busy', 'false');
  }
}
loadReels();

async function initializeQuizzes() {
const quizRoot = document.querySelector('#quiz-root');
const quizGrid = document.querySelector('[data-custom-quizzes]');
if (!quizRoot && !quizGrid && !document.querySelector('[data-quiz-kind]')) return;
const response = await fetch('content/quizzes.json', { cache: 'no-cache' });
if (!response.ok) throw new Error('Quiz content is unavailable.');
const quizContent = await response.json();
const shapes = { buy: [4, 4, 4, 4, 4, 4], sell: [4, 4, 4, 4, 4, 4], fit: [6, 3, 4, 4, 4, 4], places: [5, 6, 5, 6, 4] };
const resultKeys = {
  buy: ['incompleteTitle', 'incompleteDescription', 'exploreTitle', 'planTitle', 'readyTitle', 'description', 'contactCopy', 'financingNeeded', 'financingReady', 'costsNeeded', 'costsReady', 'finalStep'],
  sell: ['incompleteTitle', 'incompleteDescription', 'exploreTitle', 'planTitle', 'readyTitle', 'description', 'contactCopy', 'proceedsNeeded', 'proceedsReady', 'paperworkNeeded', 'paperworkReady', 'finalStep'],
  fit: ['otherResourceTitle', 'unclearTitle', 'matchTitle', 'explanation', 'contactCopy'],
  places: ['allTitle', 'shortlistTitle', 'intro', 'explanation', 'contactCopy'],
};
if (!Array.isArray(quizContent.custom) || !quizContent.builtIn) throw new Error('Quiz content is invalid.');
const quizzes = {};
for (const [kind, lengths] of Object.entries(shapes)) {
  const source = quizContent.builtIn[kind];
  if (!source || typeof source.title !== 'string' || !source.title.trim() || !Array.isArray(source.questions) || source.questions.length !== lengths.length) throw new Error(`The ${kind} quiz is invalid.`);
  if (!source.results || resultKeys[kind].some((key) => typeof source.results[key] !== 'string' || !source.results[key].trim())) throw new Error(`The ${kind} quiz results are invalid.`);
  if (kind === 'places' && (!Array.isArray(source.cards) || source.cards.length !== 6 || source.cards.some((card) => !card || ['name', 'why', 'check'].some((key) => typeof card[key] !== 'string' || !card[key].trim())))) throw new Error('The places quiz cards are invalid.');
  quizzes[kind] = {
    title: source.title,
    questions: source.questions.map((question, index) => {
      if (typeof question.question !== 'string' || !question.question.trim() || !Array.isArray(question.options) || question.options.length !== lengths[index] || question.options.some((option) => typeof option !== 'string' || !option.trim())) throw new Error(`The ${kind} quiz has invalid questions.`);
      return {
        question: question.question,
        options: question.options.map((label, optionIndex) => ({
          label,
          value: optionIndex === question.options.length - 1 ? 'unsure' : (kind === 'buy' || kind === 'sell' ? ['0', '0.5', '1'][optionIndex] : String(optionIndex)),
        })),
      };
    }),
  };
}
const escapeQuizHtml = (value) => String(value).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;').replaceAll("'", '&#39;');

function localCustomQuizzes() {
  try {
    const saved = JSON.parse(localStorage.getItem('seattle-at-home-custom-quizzes-v1') || '[]');
    if (!Array.isArray(saved)) return [];
    return saved.filter((quiz) => quiz
      && typeof quiz.id === 'string'
      && typeof quiz.title === 'string'
      && typeof quiz.resultTitle === 'string'
      && Array.isArray(quiz.questions)
      && quiz.questions.length
      && quiz.questions.every((question) => typeof question.question === 'string'
        && Array.isArray(question.options)
        && question.options.length >= 2
        && question.options.every((option) => typeof option === 'string' && option.trim())));
  } catch {
    return [];
  }
}

function getCustomQuizzes() {
  const local = localCustomQuizzes();
  const ids = new Set(local.map((quiz) => quiz.id));
  const isValid = (quiz) => quiz
    && typeof quiz.id === 'string' && typeof quiz.title === 'string' && typeof quiz.resultTitle === 'string'
    && Array.isArray(quiz.questions) && quiz.questions.length
    && quiz.questions.every((question) => typeof question.question === 'string' && question.question.trim()
      && Array.isArray(question.options) && question.options.length >= 2
      && question.options.every((option) => typeof option === 'string' && option.trim()));
  if (!quizContent.custom.every(isValid)) throw new Error('Published custom quiz data is invalid.');
  const published = quizContent.custom;
  return [...published.filter((quiz) => !ids.has(quiz.id)), ...local];
}

function renderCustomQuizCards() {
  const grid = document.querySelector('[data-custom-quizzes]');
  if (!grid) return;
  const note = document.querySelector('[data-custom-quiz-note]');
  const customQuizzes = getCustomQuizzes();
  grid.replaceChildren();
  customQuizzes.forEach((quiz) => {
    const card = document.createElement('article');
    card.className = 'source-217';
    const count = document.createElement('span');
    count.className = 'source-91';
    count.textContent = `${quiz.questions.length} questions`;
    const heading = document.createElement('h2');
    heading.className = 'source-218';
    heading.textContent = quiz.title;
    const description = document.createElement('p');
    description.className = 'source-36';
    description.textContent = quiz.description || 'A short set of questions with a personal next-step message.';
    const link = document.createElement('a');
    link.className = 'source-219 source-button';
    link.href = `quiz.html?type=${encodeURIComponent(`custom-${quiz.id}`)}`;
    link.textContent = 'Start this quiz';
    card.append(count, heading, description, link);
    grid.append(card);
  });
  note.hidden = localCustomQuizzes().length === 0;
}

renderCustomQuizCards();

document.querySelectorAll('[data-quiz-kind]').forEach((link) => {
  const quiz = quizzes[link.dataset.quizKind];
  const countLabel = link.parentElement.querySelector('span');
  if (quiz && countLabel) countLabel.textContent = `${quiz.questions.length} questions`;
});

function readinessResult(answers, kind) {
  const copy = quizContent.builtIn[kind].results;
  const known = answers.filter((answer) => answer !== 'unsure' && answer !== undefined);
  if (known.length < 4) return { title: copy.incompleteTitle, description: copy.incompleteDescription };
  const ratio = known.reduce((sum, answer) => sum + Number(answer), 0) / known.length;
  const title = ratio < 1 / 3 ? copy.exploreTitle : ratio < 2 / 3 ? copy.planTitle : copy.readyTitle;
  return { title, description: copy.description };
}

function fitResult(answers) {
  const copy = quizContent.builtIn.fit.results;
  if (answers[0] === '4' || answers[1] === '1') return copy.otherResourceTitle;
  if (answers[0] === 'unsure' || answers[1] === 'unsure') return copy.unclearTitle;
  return copy.matchTitle;
}

function renderCustomQuiz(quiz, root) {
  const answers = new Array(quiz.questions.length);
  let questionIndex = 0;

  function focusHeading() {
    root.querySelector('h1')?.focus({ preventScroll: true });
  }

  function renderQuestion(focus = false) {
    const question = quiz.questions[questionIndex];
    root.replaceChildren();
    root.classList.remove('is-result');

    const progressLabel = document.createElement('div');
    progressLabel.className = 'quiz-progress-label';
    const title = document.createElement('strong');
    title.textContent = quiz.title;
    const count = document.createElement('span');
    count.textContent = `Question ${questionIndex + 1} of ${quiz.questions.length}`;
    progressLabel.append(title, count);

    const progress = document.createElement('progress');
    progress.max = quiz.questions.length;
    progress.value = questionIndex + 1;
    progress.setAttribute('aria-label', 'Quiz progress');

    const form = document.createElement('form');
    form.id = 'quiz-question';
    const fieldset = document.createElement('fieldset');
    const legend = document.createElement('legend');
    const heading = document.createElement('h1');
    heading.tabIndex = -1;
    heading.textContent = question.question;
    legend.append(heading);
    fieldset.append(legend);

    const instructions = document.createElement('p');
    instructions.className = 'muted';
    instructions.textContent = 'Pick the answer that feels closest. There are no wrong ones.';
    fieldset.append(instructions);

    const options = document.createElement('div');
    options.className = 'quiz-options';
    question.options.forEach((option, optionIndex) => {
      const label = document.createElement('label');
      label.className = 'quiz-option';
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = 'answer';
      input.value = String(optionIndex);
      input.checked = answers[questionIndex] === input.value;
      input.addEventListener('change', () => { answers[questionIndex] = input.value; });
      const text = document.createElement('span');
      text.textContent = option;
      label.append(input, text);
      options.append(label);
    });
    fieldset.append(options);

    const error = document.createElement('p');
    error.id = 'quiz-error';
    error.setAttribute('role', 'alert');
    error.hidden = true;
    error.textContent = 'Choose an answer before continuing.';

    const actions = document.createElement('div');
    actions.className = 'quiz-actions';
    const back = document.createElement('button');
    back.type = 'button';
    back.className = 'button secondary';
    back.textContent = '← Back';
    back.addEventListener('click', () => {
      if (questionIndex === 0) {
        location.href = 'start-here.html';
        return;
      }
      questionIndex -= 1;
      renderQuestion(true);
    });
    const next = document.createElement('button');
    next.type = 'submit';
    next.className = 'button';
    next.textContent = questionIndex === quiz.questions.length - 1 ? 'See my result' : 'Next →';
    actions.append(back, next);
    form.append(fieldset, error, actions);
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      event.stopPropagation();
      if (answers[questionIndex] === undefined) {
        error.hidden = false;
        options.querySelector('input')?.focus();
        return;
      }
      if (questionIndex < quiz.questions.length - 1) {
        questionIndex += 1;
        renderQuestion(true);
      } else {
        renderResult();
      }
    });
    root.append(progressLabel, progress, form);
    if (focus) focusHeading();
  }

  function renderResult() {
    root.replaceChildren();
    root.classList.add('is-result');
    const eyebrow = document.createElement('p');
    eyebrow.className = 'eyebrow';
    eyebrow.textContent = `Your result · ${quiz.title}`;
    const heading = document.createElement('h1');
    heading.tabIndex = -1;
    heading.textContent = quiz.resultTitle;
    const message = document.createElement('p');
    message.className = 'result-lead';
    message.textContent = quiz.resultCopy || 'Use your answers as a starting point for a conversation with Emily.';
    const note = document.createElement('p');
    note.className = 'muted';
    note.textContent = 'This preview does not save your answers or send contact details.';
    const actions = document.createElement('div');
    actions.className = 'result-actions';
    const book = document.createElement('a');
    book.className = 'button';
    book.href = 'contact.html';
    book.textContent = 'Book a free 45-minute video call';
    const retake = document.createElement('button');
    retake.className = 'text-button';
    retake.type = 'button';
    retake.textContent = 'Retake the quiz';
    retake.addEventListener('click', () => {
      answers.fill(undefined);
      questionIndex = 0;
      renderQuestion(true);
    });
    actions.append(book, retake);
    root.append(eyebrow, heading, message, note, actions);
    focusHeading();
    root.scrollIntoView({ block: 'start' });
  }

  renderQuestion();
}

if (quizRoot) {
  const kind = new URLSearchParams(location.search).get('type') || 'buy';
  const customQuiz = kind.startsWith('custom-')
    ? getCustomQuizzes().find((quiz) => `custom-${quiz.id}` === kind)
    : null;
  if (!quizzes[kind] && !customQuiz) {
    document.title = 'Quiz not found | Seattle At Home';
    quizRoot.innerHTML = '<h1>Quiz not found.</h1><a href="start-here.html">Choose a question</a>';
  } else if (customQuiz) {
    document.title = `${customQuiz.title} | Emily Hawkins · Seattle At Home`;
    renderCustomQuiz(customQuiz, quizRoot);
  } else {
    const quiz = quizzes[kind];
    const answers = new Array(quiz.questions.length);
    let questionIndex = 0;
    let showingResults = false;
    let showingAllPlaces = false;
    const descriptions = {
      fit: 'Explore how Emily Hawkins works and whether her advice-first Seattle real estate approach fits your needs. No email required to see your result.',
      buy: 'Think through budget, timing, and preparation with Emily Hawkins’s homebuying readiness quiz. Informational results, without an email gate.',
      sell: 'Review your timing, home preparation, and next steps with Emily Hawkins’s selling readiness quiz. See informational results without sharing your email.',
      places: 'Explore your housing and day-to-day priorities with a Seattle At Home quiz. Area examples are preview placeholders, not approved recommendations.',
    };
    updatePageSeo({
      title: `${quiz.title} | Seattle At Home`,
      description: descriptions[kind],
      url: `https://seattleathome.com/quiz.html?type=${kind}`,
    });
    const headingFocus = () => quizRoot.querySelector('h1')?.focus({ preventScroll: true });
    function renderQuestion(focus = false) {
      showingResults = false;
      const question = quiz.questions[questionIndex];
      quizRoot.classList.remove('is-result');
      quizRoot.innerHTML = `
        <div class="quiz-progress-label"><strong>${escapeQuizHtml(quiz.title)}</strong><span>Question ${questionIndex + 1} of ${quiz.questions.length}</span></div>
        <progress max="${quiz.questions.length}" value="${questionIndex + 1}" aria-label="Quiz progress"></progress>
        <form id="quiz-question" novalidate>
          <fieldset><legend><h1 tabindex="-1">${escapeQuizHtml(question.question)}</h1></legend>
          <p class="muted">Pick the answer that feels closest. There are no wrong ones.</p>
          <div class="quiz-options">${question.options.map((option) => `<label class="quiz-option ${option.value === 'unsure' ? 'unsure-option' : ''}"><input type="radio" name="answer" value="${option.value}" ${answers[questionIndex] === option.value ? 'checked' : ''}><span>${escapeQuizHtml(option.label)}${option.value === 'unsure' ? '<span class="option-help">That’s fine. We’ll figure it out together.</span>' : ''}</span></label>`).join('')}</div>
          </fieldset><p id="quiz-error" role="alert" hidden>Choose an answer, or select “I’m not sure”.</p>
          <div class="quiz-actions"><button class="button secondary" type="button" data-back>← Back</button><button class="button" type="submit">${questionIndex === quiz.questions.length - 1 ? 'See my result' : 'Next →'}</button></div>
        </form>`;
      const questionForm = quizRoot.querySelector('form');
      questionForm.addEventListener('change', (event) => { answers[questionIndex] = event.target.value; });
      questionForm.addEventListener('submit', (event) => {
        event.preventDefault();
        event.stopPropagation();
        if (answers[questionIndex] === undefined) {
          quizRoot.querySelector('#quiz-error').hidden = false;
          quizRoot.querySelector('input').focus();
          return;
        }
        if (questionIndex < quiz.questions.length - 1) {
          questionIndex += 1;
          renderQuestion(true);
        } else renderResult();
      });
      quizRoot.querySelector('[data-back]').addEventListener('click', () => {
        if (questionIndex === 0) location.href = 'start-here.html';
        else { questionIndex -= 1; renderQuestion(true); }
      });
      if (focus) headingFocus();
    }
    function resultActions() {
      return '<div class="result-actions"><a class="button" href="contact.html">Book a free 45-minute video call</a><button class="text-button" type="button" data-edit>Edit my answers</button><button class="text-button" type="button" data-retake>Retake the quiz</button></div>';
    }
    function contactForm() {
      return `<section class="result-contact"><h2>Rather I reach out? (optional)</h2><p>${escapeQuizHtml(quizContent.builtIn[kind].results.contactCopy)}</p><form data-preview-form><label>Email address<input type="email" name="email" placeholder="you@example.com" required autocomplete="email"></label><button class="button" type="submit">Ask Emily to contact me</button><p class="muted">I’ll only use your email to reply. <a href="privacy.html">Privacy policy</a></p></form></section>`;
    }
    function placeCards(numbers) {
      const cards = quizContent.builtIn.places.cards;
      return `<div class="place-grid">${numbers.map((number) => `<article class="place-card"><figure class="quiz-editorial-photo"><img src="assets/emily-services/selling.webp" width="960" height="640" loading="lazy" decoding="async" alt="Emily walking along a Seattle sidewalk with a coffee"><figcaption>Seattle life with Emily; not a photo of a matched area.</figcaption></figure><div class="place-copy"><h2>${escapeQuizHtml(cards[number - 1].name)}</h2><strong>Why it matched</strong><p>${escapeQuizHtml(cards[number - 1].why)}</p><strong>What to check</strong><p>${escapeQuizHtml(cards[number - 1].check)}</p></div></article>`).join('')}</div>`;
    }
    function renderResult() {
      showingResults = true;
      quizRoot.classList.add('is-result');
      let title;
      let content;
      const copy = quizContent.builtIn[kind].results;
      if (kind === 'places') {
        const primary = answers[quiz.questions.length - 1];
        const groups = { '0': [1, 2, 3], '1': [2, 4, 5], '2': [3, 5, 6] };
        const numbers = showingAllPlaces || primary === 'unsure' ? [1, 2, 3, 4, 5, 6] : groups[primary];
        title = numbers.length === 6 ? copy.allTitle : copy.shortlistTitle;
        content = `<p class="result-lead">${escapeQuizHtml(copy.intro)}</p><p class="muted">${escapeQuizHtml(copy.explanation)}</p>` + placeCards(numbers) + '<button type="button" class="text-button" data-all-places>See all the areas I cover</button>';
      } else if (kind === 'fit') {
        title = fitResult(answers);
        const update = quiz.questions[3].options.find((option) => option.value === answers[3]).label;
        content = `<div class="result-explanation"><h2>Why you got this result</h2><p>${escapeQuizHtml(copy.explanation)} Your preferred routine updates: ${escapeQuizHtml(update)}. Your timing and communication preferences never disqualify you.</p></div><h2>Your next three steps</h2><ol class="next-steps"><li>Think about the questions you’d like to ask.</li><li><a href="about.html">See how I work.</a></li><li>Book a call with me.</li></ol>`;
      } else {
        const result = readinessResult(answers, kind);
        title = result.title;
        const buyer = kind === 'buy';
        const costsNeedReview = answers[0] !== '1' || answers[2] !== '1';
        const financingNeedReview = answers[1] !== '1';
        const proceedsNeedReview = answers[2] !== '1';
        const paperworkNeedReview = answers[5] !== '1';
        const steps = buyer ? [
          financingNeedReview ? copy.financingNeeded : copy.financingReady,
          costsNeedReview ? copy.costsNeeded : copy.costsReady,
          copy.finalStep,
        ] : [
          proceedsNeedReview ? copy.proceedsNeeded : copy.proceedsReady,
          paperworkNeedReview ? copy.paperworkNeeded : copy.paperworkReady,
          copy.finalStep,
        ];
        content = `<div class="result-explanation"><h2>Why you got this result</h2><p>${escapeQuizHtml(result.description)}</p></div><h2>Your next three steps</h2><ol class="next-steps">${steps.map((step) => `<li>${escapeQuizHtml(step)}</li>`).join('')}</ol>`;
      }
      quizRoot.innerHTML = `<p class="eyebrow">Your result · ${escapeQuizHtml(quiz.title)}</p><h1 tabindex="-1">${escapeQuizHtml(title)}</h1>${content}${resultActions()}${contactForm()}`;
      quizRoot.querySelector('[data-edit]').addEventListener('click', () => { questionIndex = 0; renderQuestion(true); });
      quizRoot.querySelector('[data-retake]').addEventListener('click', () => { answers.fill(undefined); showingAllPlaces = false; questionIndex = 0; renderQuestion(true); });
      quizRoot.querySelector('[data-all-places]')?.addEventListener('click', () => { showingAllPlaces = true; renderResult(); });
      headingFocus();
      quizRoot.scrollIntoView({ block: 'start' });
    }
    renderQuestion();
  }
}
}
initializeQuizzes().catch((error) => {
  console.error('Unable to load quizzes:', error);
  const root = document.querySelector('#quiz-root');
  if (root) root.textContent = 'Quizzes are unavailable right now. Please try again later.';
  const note = document.querySelector('[data-custom-quiz-note]');
  if (note) { note.hidden = false; note.textContent = 'Quizzes are unavailable right now. Please try again later.'; }
});

const scrollRevealTargets = document.querySelectorAll(
  'main > .source-1 > .source-section:not(:first-child), ' +
  'main > .source-1 > .story-map-section, ' +
  '.source-217, .client-story, .transaction-item, .source-41, .source-152, .place-card'
);
let previousScrollY = window.scrollY;

scrollRevealTargets.forEach((target) => target.classList.add('scroll-reveal'));

function revealTargetsInViewport() {
  const viewportBottom = window.innerHeight * 0.94;
  scrollRevealTargets.forEach((target) => {
    if (target.classList.contains('is-scroll-visible')) return;
    const bounds = target.getBoundingClientRect();
    if (bounds.top < viewportBottom && bounds.bottom > 0) {
      target.classList.add('is-scroll-visible');
    }
  });
}

window.addEventListener('scroll', () => {
  const currentScrollY = window.scrollY;
  if (currentScrollY > previousScrollY) revealTargetsInViewport();
  previousScrollY = currentScrollY;
}, { passive: true });