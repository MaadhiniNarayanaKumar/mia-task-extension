import { CONFIG } from './config.js';

const API_KEY = CONFIG.apiKey;

function authUrl(path) {
  return `https://identitytoolkit.googleapis.com/v1/${path}?key=${API_KEY}`;
}

function firestoreDocUrl(uid) {
  return (
    `https://firestore.googleapis.com/v1/projects/${CONFIG.projectId}` +
    `/databases/(default)/documents/users/${encodeURIComponent(uid)}/tasks`
  );
}

function str(value) {
  return { stringValue: value ?? '' };
}

function ts(value) {
  return { timestampValue: new Date(value).toISOString() };
}

function explainAuthError(status, text) {
  if (text.includes('ADMIN_ONLY_OPERATION')) {
    return (
      'Anonymous sign-in is disabled in Firebase. ' +
      'Either enable it (Console → Authentication → Sign-in method → Anonymous → Enable), ' +
      'or set email + password in config.js and create that user in Firebase Auth.'
    );
  }
  if (text.includes('EMAIL_NOT_FOUND') || text.includes('INVALID_LOGIN_CREDENTIALS')) {
    return (
      'Email/password login failed. Create the user in Firebase Console → Authentication, ' +
      'or fix email/password in config.js.'
    );
  }
  if (text.includes('OPERATION_NOT_ALLOWED')) {
    return (
      'That sign-in method is disabled. Enable Email/Password and/or Anonymous ' +
      'in Firebase Console → Authentication → Sign-in method.'
    );
  }
  return `Auth failed (${status}): ${text}`;
}

async function cacheToken(data) {
  const now = Date.now();
  const expiresInMs = (Number(data.expiresIn) || 3600) * 1000;
  await chrome.storage.local.set({
    idToken: data.idToken,
    tokenExpiry: now + expiresInMs,
  });
  return data.idToken;
}

async function signInWithEmailPassword(email, password) {
  const res = await fetch(authUrl('accounts:signInWithPassword'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      returnSecureToken: true,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(explainAuthError(res.status, text));
  }
  return cacheToken(JSON.parse(text));
}

async function signInAnonymously() {
  const res = await fetch(authUrl('accounts:signUp'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ returnSecureToken: true }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(explainAuthError(res.status, text));
  }
  return cacheToken(JSON.parse(text));
}

/**
 * Firebase Auth → idToken (cached).
 * Prefers email/password from config; otherwise anonymous (must be enabled).
 */
export async function getIdToken({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const stored = await chrome.storage.local.get(['idToken', 'tokenExpiry']);
    const now = Date.now();
    if (
      stored.idToken &&
      stored.tokenExpiry &&
      stored.tokenExpiry > now + 60_000
    ) {
      return stored.idToken;
    }
  } else {
    await chrome.storage.local.remove(['idToken', 'tokenExpiry']);
  }

  const email = (CONFIG.email || '').trim();
  const password = CONFIG.password || '';

  if (email && password) {
    return signInWithEmailPassword(email, password);
  }
  return signInAnonymously();
}

/**
 * Create a task under users/{uid}/tasks.
 * Shape matches Flutter TaskRepository.createTask, plus source=extension.
 * Status stays pendingEnrichment so the app classifies the category.
 */
export async function createTask({
  title,
  rawText,
  priority = 'medium',
  dueDate,
  pageUrl = '',
}) {
  const uid = CONFIG.uid || 'local-guest';
  let token = await getIdToken();
  const due = dueDate ? new Date(dueDate) : defaultDue();

  const body = {
    fields: {
      rawText: str((rawText || title || '').trim()),
      title: str((title || rawText || 'Untitled').trim()),
      priority: str(priority || 'medium'),
      status: str('pendingEnrichment'),
      createdAt: ts(new Date()),
      dueDate: ts(due),
      source: str('extension'),
      pageUrl: str(pageUrl || ''),
    },
  };

  let res = await fetch(firestoreDocUrl(uid), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  if (res.status === 401) {
    token = await getIdToken({ forceRefresh: true });
    res = await fetch(firestoreDocUrl(uid), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
  }

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Firestore write failed (${res.status}): ${text}`);
  }
  return res.json();
}

export function defaultDue(now = new Date()) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
}

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toDateValue(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

export function fromDateValue(dateStr) {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d);
}
