import { classifyTask, DEFAULT_CATEGORIES, effectivePriority } from './classify_task.js';
import { CONFIG } from './config.js';
import { createTask, defaultDue, listCategories } from './firestore.js';
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
    const dueDate = parsed?.dueDate || defaultDue();
    let categories = [];
    try {
      categories = await listCategories();
    } catch (_) {}
    if (!categories.length) categories = DEFAULT_CATEGORIES;
    const classified = await classifyTask(
      parsed?.rawText || selected,
      categories,
      CONFIG.geminiApiKey,
    );

    await createTask({
      title: classified.title || parsed?.title || selected.slice(0, 80),
      rawText: parsed?.rawText || selected,
      priority: effectivePriority(parsed?.priority || 'medium', dueDate),
      dueDate,
      pageUrl: info.pageUrl || tab?.url || '',
      categoryId: classified.categoryId,
      categoryName: classified.categoryName || '',
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
