import { createTask, defaultDue } from './firestore.js';
import { parseTaskText } from './parse_task.js';

chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'mia-send-selection',
    title: 'Send selection to Mia Tasks',
    contexts: ['selection'],
  });
});

chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  try {
    const selected = (info.selectionText || '').trim();
    if (!selected) return;
    const parsed = parseTaskText(selected);

    await createTask({
      title: parsed?.title || selected.slice(0, 80),
      rawText: selected,
      priority: parsed?.priority || 'medium',
      dueDate: parsed?.dueDate || defaultDue(),
      pageUrl: info.pageUrl || tab?.url || '',
    });

    if (tab?.id != null) {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => {
          const el = document.createElement('div');
          el.textContent = 'Sent to Mia Tasks';
          el.style.cssText =
            'position:fixed;z-index:2147483647;bottom:16px;right:16px;' +
            'background:#4f46e5;color:#fff;padding:10px 14px;border-radius:10px;' +
            'font:600 13px system-ui;box-shadow:0 8px 24px rgba(0,0,0,.2)';
          document.body.appendChild(el);
          setTimeout(() => el.remove(), 1800);
        },
      });
    }
  } catch (err) {
    console.error('Mia task extension error', err);
  }
});
