const quizStorageKey = 'seattle-at-home-custom-quizzes-v1';
const quizForm = document.querySelector('#quiz-draft-form');
const questionList = document.querySelector('#quiz-question-list');
const questionTemplate = document.querySelector('#quiz-question-template');
const optionTemplate = document.querySelector('#quiz-option-template');
const quizStatus = document.querySelector('#quiz-studio-status');

function setQuizStatus(message) {
  quizStatus.textContent = message;
}

function slugify(value) {
  return value.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'quiz';
}

function normalizeQuiz(quiz) {
  if (!quiz || typeof quiz !== 'object') return null;
  const questions = Array.isArray(quiz.questions)
    ? quiz.questions.filter((question) => question && typeof question === 'object').map((question) => ({
      question: typeof question.question === 'string' ? question.question.trim() : '',
      options: Array.isArray(question.options)
        ? question.options.filter((option) => typeof option === 'string').map((option) => option.trim()).filter(Boolean)
        : [],
    })).filter((question) => question.question && question.options.length >= 2)
    : [];
  const normalized = {
    id: typeof quiz.id === 'string' ? quiz.id : '',
    title: typeof quiz.title === 'string' ? quiz.title.trim() : '',
    description: typeof quiz.description === 'string' ? quiz.description.trim() : '',
    questions,
    resultTitle: typeof quiz.resultTitle === 'string' ? quiz.resultTitle.trim() : '',
    resultCopy: typeof quiz.resultCopy === 'string' ? quiz.resultCopy.trim() : '',
  };
  return normalized.id && normalized.title && normalized.resultTitle && normalized.questions.length
    ? normalized
    : null;
}

function readQuizzes() {
  try {
    const saved = JSON.parse(localStorage.getItem(quizStorageKey) || '[]');
    return Array.isArray(saved) ? saved.map(normalizeQuiz).filter(Boolean) : [];
  } catch {
    setQuizStatus('Could not read saved quiz drafts. Export or replace the saved data.');
    return [];
  }
}

let quizzes = readQuizzes();

function persistQuizzes(message) {
  try {
    localStorage.setItem(quizStorageKey, JSON.stringify(quizzes));
    setQuizStatus(message);
    renderQuizList();
    return true;
  } catch {
    setQuizStatus('Could not save quiz drafts. Export them or remove large local data.');
    return false;
  }
}

function addOption(container, value = '') {
  const option = optionTemplate.content.firstElementChild.cloneNode(true);
  option.querySelector('[data-option-text]').value = value;
  container.append(option);
  updateOptionLabels(container);
}

function updateOptionLabels(container) {
  [...container.querySelectorAll('[data-quiz-option]')].forEach((option, index) => {
    option.querySelector('[data-option-label]').textContent = `Choice ${index + 1}`;
    option.querySelector('[data-remove-option]').disabled = container.children.length <= 2;
  });
}

function addQuestion(question = { question: '', options: ['', ''] }) {
  const item = questionTemplate.content.firstElementChild.cloneNode(true);
  item.querySelector('[data-question-text]').value = question.question;
  const options = item.querySelector('[data-option-list]');
  question.options.forEach((option) => addOption(options, option));
  item.querySelector('[data-add-option]').addEventListener('click', () => addOption(options));
  item.querySelector('[data-remove-question]').addEventListener('click', () => {
    if (questionList.children.length <= 1) {
      setQuizStatus('A quiz needs at least one question.');
      return;
    }
    item.remove();
    updateQuestionNumbers();
  });
  options.addEventListener('click', (event) => {
    const removeButton = event.target.closest('[data-remove-option]');
    if (!removeButton || options.children.length <= 2) return;
    removeButton.closest('[data-quiz-option]').remove();
    updateOptionLabels(options);
  });
  questionList.append(item);
  updateQuestionNumbers();
}

function updateQuestionNumbers() {
  [...questionList.querySelectorAll('[data-quiz-question]')].forEach((question, index) => {
    question.querySelector('[data-question-number]').textContent = `Question ${index + 1}`;
  });
}

function clearEditor() {
  quizForm.reset();
  document.querySelector('#quiz-id').value = '';
  questionList.replaceChildren();
  addQuestion();
  document.querySelector('#quiz-result-title').value = 'Your next step';
  document.querySelector('#quiz-result-copy').value = 'Use your answers as a starting point for a conversation with Emily.';
  document.querySelector('#delete-quiz').hidden = true;
  document.querySelector('#quiz-title').focus();
}

function editQuiz(quiz) {
  document.querySelector('#quiz-id').value = quiz.id;
  document.querySelector('#quiz-title').value = quiz.title;
  document.querySelector('#quiz-description').value = quiz.description;
  document.querySelector('#quiz-result-title').value = quiz.resultTitle;
  document.querySelector('#quiz-result-copy').value = quiz.resultCopy;
  questionList.replaceChildren();
  quiz.questions.forEach(addQuestion);
  document.querySelector('#delete-quiz').hidden = false;
  document.querySelector('#quiz-title').focus();
}

function renderQuizList() {
  const list = document.querySelector('#quiz-draft-list');
  list.replaceChildren();
  if (!quizzes.length) {
    const empty = document.createElement('p');
    empty.className = 'editor-list-empty';
    empty.textContent = 'No custom quiz drafts yet.';
    list.append(empty);
    return;
  }
  quizzes.forEach((quiz) => {
    const item = document.createElement('div');
    item.className = 'quiz-studio-saved-item';
    const title = document.createElement('strong');
    title.textContent = quiz.title;
    const count = document.createElement('small');
    count.textContent = `${quiz.questions.length} question${quiz.questions.length === 1 ? '' : 's'}`;
    const actions = document.createElement('div');
    const edit = document.createElement('button');
    edit.type = 'button';
    edit.className = 'editor-secondary';
    edit.textContent = 'Edit';
    edit.addEventListener('click', () => editQuiz(quiz));
    const preview = document.createElement('a');
    preview.className = 'editor-view-site';
    preview.href = `quiz.html?type=${encodeURIComponent(`custom-${quiz.id}`)}`;
    preview.textContent = 'Preview';
    actions.append(edit, preview);
    item.append(title, count, actions);
    list.append(item);
  });
}

document.querySelector('#new-quiz').addEventListener('click', clearEditor);
document.querySelector('#add-quiz-question').addEventListener('click', () => addQuestion());

quizForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const questions = [...questionList.querySelectorAll('[data-quiz-question]')].map((question) => ({
    question: question.querySelector('[data-question-text]').value.trim(),
    options: [...question.querySelectorAll('[data-option-text]')].map((option) => option.value.trim()).filter(Boolean),
  }));
  if (questions.some((question) => !question.question || question.options.length < 2)) {
    setQuizStatus('Add question text and at least two answer choices to each question.');
    questionList.querySelector('[data-question-text]:invalid, [data-option-text]:invalid')?.focus();
    return;
  }
  const title = document.querySelector('#quiz-title').value.trim();
  const quiz = normalizeQuiz({
    id: document.querySelector('#quiz-id').value || `custom-${slugify(title)}-${Date.now()}`,
    title,
    description: document.querySelector('#quiz-description').value,
    questions,
    resultTitle: document.querySelector('#quiz-result-title').value,
    resultCopy: document.querySelector('#quiz-result-copy').value,
  });
  if (!quiz) {
    setQuizStatus('Complete the quiz title, at least one question, and a result heading.');
    return;
  }
  const existingIndex = quizzes.findIndex((candidate) => candidate.id === quiz.id);
  if (existingIndex < 0) quizzes.push(quiz);
  else quizzes[existingIndex] = quiz;
  if (persistQuizzes('Quiz draft saved in this browser')) {
    document.querySelector('#quiz-id').value = quiz.id;
    document.querySelector('#delete-quiz').hidden = false;
  }
});

document.querySelector('#delete-quiz').addEventListener('click', () => {
  const id = document.querySelector('#quiz-id').value;
  if (!id || !window.confirm('Delete this quiz draft from this browser?')) return;
  quizzes = quizzes.filter((quiz) => quiz.id !== id);
  if (persistQuizzes('Quiz draft deleted')) clearEditor();
});

document.querySelector('#export-quizzes').addEventListener('click', () => {
  const blob = new Blob([JSON.stringify({ version: 1, quizzes }, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const download = document.createElement('a');
  download.href = url;
  download.download = 'seattle-at-home-quiz-drafts.json';
  download.click();
  URL.revokeObjectURL(url);
  setQuizStatus('Quiz drafts exported');
});

document.querySelector('#import-quizzes').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    try {
      const imported = JSON.parse(String(reader.result));
      if (!Array.isArray(imported.quizzes)) throw new Error('Quiz list missing');
      const normalized = imported.quizzes.map(normalizeQuiz);
      if (!normalized.length || normalized.some((quiz) => !quiz)) throw new Error('Quiz data invalid');
      const byId = new Map(quizzes.map((quiz) => [quiz.id, quiz]));
      normalized.forEach((quiz) => byId.set(quiz.id, quiz));
      quizzes = [...byId.values()];
      persistQuizzes('Quiz drafts imported');
      clearEditor();
    } catch {
      setQuizStatus('Could not import that file. Choose a valid Seattle At Home quiz draft JSON.');
    }
    event.target.value = '';
  });
  reader.readAsText(file);
});

renderQuizList();
clearEditor();
