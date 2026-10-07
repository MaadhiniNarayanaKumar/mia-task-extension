import { createTask, defaultDue, fromDateValue, toDateValue } from './firestore.js';
import { parseTaskText } from './parse_task.js';

const form = document.getElementById('form');
const pasteEl = document.getElementById('paste');
const pasteBlock = document.getElementById('pasteBlock');
const pasteCollapsed = document.getElementById('pasteCollapsed');
const titleEl = document.getElementById('title');
const dueEl = document.getElementById('due');
const priorityEl = document.getElementById('priority');
const priorityDot = document.getElementById('priorityDot');
const submitEl = document.getElementById('submit');
const statusEl = document.getElementById('status');
const toastEl = document.getElementById('toast');
const steps = [...document.querySelectorAll('#steps li')];

let rawText = '';

const GUESS_FIELDS = {
  title: titleEl,
  due: dueEl,
  priority: priorityEl,
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
  titleEl.value = parsed.title || '';
  autosizeTitle();
  dueEl.value = toDateValue(parsed.dueDate);
  priorityEl.value = parsed.priority || 'medium';
  updatePriorityDot();
  markGuessed(parsed.guessed || ['title', 'due']);
  collapsePaste(true);
  setStatus('Review highlighted fields, then Send', true);
  setStep(2);
}

function resetForm() {
  pasteEl.value = '';
  titleEl.value = '';
  rawText = '';
  dueEl.value = toDateValue(defaultDue());
  priorityEl.value = 'medium';
  updatePriorityDot();
  clearGuesses();
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

dueEl.value = toDateValue(defaultDue());
updatePriorityDot();
setStep(1);
pasteEl.focus();

pasteEl.addEventListener('paste', () => {
  setTimeout(() => {
    if (pasteEl.value.trim()) {
      applyParsed(parseTaskText(pasteEl.value));
    }
  }, 0);
});

pasteEl.addEventListener('input', () => {
  if (pasteEl.value.trim().length > 8) {
    applyParsed(parseTaskText(pasteEl.value));
  }
});

pasteCollapsed.addEventListener('click', () => {
  collapsePaste(false);
  pasteEl.focus();
});

titleEl.addEventListener('input', () => {
  autosizeTitle();
  setStep(2);
});

priorityEl.addEventListener('change', updatePriorityDot);

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  submitEl.disabled = true;
  setStatus('Sending…', true);
  setStep(3);

  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const pageUrl = tabs[0]?.url || '';
    await createTask({
      title: titleEl.value,
      rawText: rawText || titleEl.value,
      priority: priorityEl.value,
      dueDate: fromDateValue(dueEl.value),
      pageUrl,
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
