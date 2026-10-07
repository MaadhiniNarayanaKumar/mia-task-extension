import { classifyHeuristic, classifyTask, DEFAULT_CATEGORIES, effectivePriority } from './classify_task.js';
import { CONFIG } from './config.js';
import {
  createTask,
  defaultDue,
  fromDateValue,
  listCategories,
  toDateValue,
} from './firestore.js';
import { parseTaskText } from './parse_task.js';

const form = document.getElementById('form');
const pasteEl = document.getElementById('paste');
const pasteBlock = document.getElementById('pasteBlock');
const pasteCollapsed = document.getElementById('pasteCollapsed');
const titleEl = document.getElementById('title');
const dueEl = document.getElementById('due');
const dueChips = document.getElementById('dueChips');
const priorityEl = document.getElementById('priority');
const priorityDot = document.getElementById('priorityDot');
const priorityNote = document.getElementById('priorityNote');
const categoryEl = document.getElementById('category');
const notesEl = document.getElementById('notes');
const submitEl = document.getElementById('submit');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');
const steps = [...document.querySelectorAll('#steps li')];

let rawText = '';
let categories = DEFAULT_CATEGORIES;
let categoryTouched = false;

const GUESS_FIELDS = {
  title: titleEl,
  due: dueEl,
  priority: priorityEl,
  category: categoryEl,
};

function setStep(n) {
  steps.forEach((li) => {
    const s = Number(li.dataset.step);
    li.classList.toggle('active', s === n);
    li.classList.toggle('done', s < n);
  });
}

function setStatus(message, ok) {
  statusEl.hidden = !message;
  statusEl.textContent = message || '';
  statusEl.className = `status ${ok ? 'ok' : 'err'}`;
}

function clearGuesses() {
  document.querySelectorAll('.guessed').forEach((el) => el.classList.remove('guessed'));
}

function markGuessed(names = []) {
  clearGuesses();
  for (const name of names) {
    const el = GUESS_FIELDS[name];
    if (el) el.classList.add('guessed');
  }
}

function autosizeTitle() {
  titleEl.style.height = 'auto';
  const next = Math.min(44, Math.max(26, titleEl.scrollHeight));
  titleEl.style.height = `${next}px`;
}

function updatePriorityDot() {
  const opt = priorityEl.selectedOptions[0];
  priorityDot.style.background = opt?.dataset.color || '#d97706';
}

function fillCategorySelect() {
  const current = categoryEl.value;
  categoryEl.replaceChildren(new Option('Auto', ''));
  for (const category of categories) {
    const label = category.emoji ? `${category.emoji} ${category.name}` : category.name;
    categoryEl.append(new Option(label, category.id || category.name));
  }
  if ([...categoryEl.options].some((opt) => opt.value === current)) {
    categoryEl.value = current;
  }
}

function selectedCategory() {
  const value = categoryEl.value;
  if (!value) return { categoryId: '', categoryName: '' };
  const match = categories.find((c) => (c.id || c.name) === value);
  if (!match) return { categoryId: '', categoryName: '' };
  return { categoryId: match.id || '', categoryName: match.name };
}

function applyCategory(match, guessed) {
  if (!match?.categoryName || categoryTouched) return guessed;
  const value = match.categoryId || match.categoryName;
  if ([...categoryEl.options].some((opt) => opt.value === value)) {
    categoryEl.value = value;
    guessed.push('category');
  }
  return guessed;
}

function syncDueChips() {
  const selected = dueEl.value;
  const today = new Date();
  dueChips.querySelectorAll('button').forEach((button) => {
    const offset = Number(button.dataset.offset);
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
    button.classList.toggle('active', toDateValue(date) === selected);
  });
}

function refreshEscalation() {
  const chosen = priorityEl.value;
  const due = fromDateValue(dueEl.value);
  const effective = effectivePriority(chosen, due);
  updatePriorityDot();
  if (effective !== chosen) {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dueDay = new Date(due.getFullYear(), due.getMonth(), due.getDate());
    const daysLeft = Math.round((dueDay - start) / 86400000);
    const reason = daysLeft <= 0 ? 'due today or overdue' : 'due within 2 days';
    priorityNote.hidden = false;
    priorityNote.textContent = `Saves as ${effective} — ${reason}`;
  } else {
    priorityNote.hidden = true;
    priorityNote.textContent = '';
  }
  return effective;
}

function collapsePaste(collapsed) {
  pasteBlock.hidden = collapsed;
  pasteCollapsed.hidden = !collapsed;
  if (collapsed) setStep(2);
  else setStep(1);
}

function applyParsed(parsed) {
  if (!parsed) {
    setStatus('Paste a task first', false);
    return;
  }
  rawText = parsed.rawText;
  delete titleEl.dataset.touched;
  titleEl.value = parsed.title || '';
  autosizeTitle();
  dueEl.value = toDateValue(parsed.dueDate);
  priorityEl.value = parsed.priority || 'medium';
  categoryTouched = false;
  const guessed = [...(parsed.guessed || ['title', 'due'])];
  const match = classifyHeuristic(parsed.rawText, categories);
  applyCategory(match, guessed);
  markGuessed(guessed);
  syncDueChips();
  refreshEscalation();
  collapsePaste(true);
  setStatus('Review highlighted fields, then Send', true);
  setStep(2);
}

function resetForm() {
  pasteEl.value = '';
  titleEl.value = '';
  delete titleEl.dataset.touched;
  notesEl.value = '';
  rawText = '';
  categoryTouched = false;
  categoryEl.value = '';
  dueEl.value = toDateValue(defaultDue());
  priorityEl.value = 'medium';
  clearGuesses();
  syncDueChips();
  refreshEscalation();
  collapsePaste(false);
  setStatus('', true);
  autosizeTitle();
  setStep(1);
  pasteEl.focus();
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.hidden = false;
  setTimeout(() => {
    toastEl.hidden = true;
  }, 1200);
}

async function loadCategories() {
  try {
    const remote = await listCategories();
    if (remote.length) categories = remote;
  } catch (err) {
    console.error(err);
  }
  fillCategorySelect();
  if (rawText && !categoryTouched) {
    const match = classifyHeuristic(rawText, categories);
    const guessed = [...document.querySelectorAll('.guessed')].map((el) => {
      return Object.keys(GUESS_FIELDS).find((name) => GUESS_FIELDS[name] === el);
    }).filter(Boolean);
    applyCategory(match, guessed);
    markGuessed(guessed);
  }
}

dueEl.value = toDateValue(defaultDue());
fillCategorySelect();
syncDueChips();
refreshEscalation();
setStep(1);
pasteEl.focus();
loadCategories();

pasteEl.addEventListener('paste', () => {
  setTimeout(() => {
    if (pasteEl.value.trim()) applyParsed(parseTaskText(pasteEl.value));
  }, 0);
});

pasteEl.addEventListener('input', () => {
  if (pasteEl.value.trim().length > 8) applyParsed(parseTaskText(pasteEl.value));
});

pasteCollapsed.addEventListener('click', () => {
  collapsePaste(false);
  pasteEl.focus();
});

titleEl.addEventListener('input', () => {
  titleEl.dataset.touched = '1';
  autosizeTitle();
  setStep(2);
});

priorityEl.addEventListener('change', refreshEscalation);
dueEl.addEventListener('change', () => {
  syncDueChips();
  refreshEscalation();
});

categoryEl.addEventListener('change', () => {
  categoryTouched = categoryEl.value !== '';
});

dueChips.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;
  const offset = Number(button.dataset.offset);
  const today = new Date();
  const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + offset);
  dueEl.value = toDateValue(date);
  syncDueChips();
  refreshEscalation();
  setStep(2);
});

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitEl.disabled = true;
  setStatus('Sending…', true);
  setStep(3);

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tabs[0]?.url || '';
    const dueDate = fromDateValue(dueEl.value);
    let category = selectedCategory();
    let title = titleEl.value;

    if (!category.categoryName) {
      const classified = await classifyTask(rawText || title, categories, CONFIG.geminiApiKey);
      category = {
        categoryId: classified.categoryId,
        categoryName: classified.categoryName || '',
      };
      if (classified.title && !titleEl.dataset.touched) title = classified.title;
    }

    const notes = notesEl.value.trim();
    const body = rawText || title;
    await createTask({
      title,
      rawText: notes ? `${body}\n${notes}` : body,
      priority: effectivePriority(priorityEl.value, dueDate),
      dueDate,
      pageUrl,
      categoryId: category.categoryId,
      categoryName: category.categoryName,
    });

    setStatus('', true);
    showToast('Sent to Mia ✓');
    setTimeout(() => {
      resetForm();
      submitEl.disabled = false;
      window.close();
    }, 900);
  } catch (err) {
    console.error(err);
    setStatus(err.message || String(err), false);
    submitEl.disabled = false;
    setStep(2);
  }
});

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault();
    form.requestSubmit();
  }
});
