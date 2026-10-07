/**
 * Same category rules and priority bump as the Flutter app
 * (TaskEnrichmentService heuristic + PriorityEscalation).
 */

export const DEFAULT_CATEGORIES = [
  { id: '', name: 'Groceries', emoji: '🛒' },
  { id: '', name: 'Class', emoji: '📚' },
  { id: '', name: 'Job', emoji: '💼' },
  { id: '', name: 'Personal', emoji: '🏠' },
];

const KEYWORD_RULES = [
  ['groceries', ['milk', 'eggs', 'bread', 'grocery', 'groceries', 'store', 'supermarket', 'buy food']],
  ['class', ['homework', 'assignment', 'class', 'lecture', 'exam', 'study', 'school', 'college']],
  ['job', ['work', 'job', 'meeting', 'email', 'boss', 'office', 'client', 'deadline']],
  ['personal', ['personal', 'family', 'friend', 'home', 'doctor', 'gym']],
];

const PRIORITY_ORDER = ['low', 'medium', 'high'];

export function classifyHeuristic(rawText, categories = DEFAULT_CATEGORIES) {
  const names = categories.map((c) => c.name).filter(Boolean);
  const lower = (rawText || '').toLowerCase();
  let matched = null;

  for (const name of names) {
    if (lower.includes(name.toLowerCase())) {
      matched = name;
      break;
    }
  }

  if (!matched) {
    for (const [key, words] of KEYWORD_RULES) {
      if (!words.some((word) => lower.includes(word))) continue;
      matched = matchCategory(key, names);
      if (matched) break;
    }
  }

  const category = findCategory(categories, matched);
  return {
    categoryId: category?.id || '',
    categoryName: category?.name || null,
  };
}

/**
 * Gemini classification when config.geminiApiKey is set.
 * Falls back to the keyword rules on any failure.
 */
export async function classifyTask(rawText, categories = DEFAULT_CATEGORIES, apiKey = '') {
  const heuristic = classifyHeuristic(rawText, categories);
  const key = (apiKey || '').trim();
  if (!key) return { title: null, ...heuristic };

  try {
    const ai = await classifyViaGemini(rawText, categories, key);
    return {
      title: ai.title,
      categoryId: ai.categoryId || heuristic.categoryId,
      categoryName: ai.categoryName || heuristic.categoryName,
    };
  } catch (_) {
    return { title: null, ...heuristic };
  }
}

export function effectivePriority(current, dueDate, now = new Date()) {
  const chosen = normalizePriority(current);
  if (!dueDate) return chosen;

  const start = startOfDay(now);
  const dueDay = startOfDay(dueDate);
  const daysLeft = Math.round((dueDay - start) / 86400000);
  const fromDue = daysLeft <= 0 ? 'high' : daysLeft <= 2 ? 'medium' : 'low';
  return PRIORITY_ORDER.indexOf(chosen) >= PRIORITY_ORDER.indexOf(fromDue)
    ? chosen
    : fromDue;
}

function normalizePriority(value) {
  const lower = String(value || '').toLowerCase();
  return PRIORITY_ORDER.includes(lower) ? lower : 'medium';
}

function matchCategory(value, categoryNames) {
  if (!value || value === 'null') return null;
  const needle = value.trim().toLowerCase();
  if (!needle) return null;
  for (const name of categoryNames) {
    if (name.toLowerCase() === needle) return name;
  }
  for (const name of categoryNames) {
    const lower = name.toLowerCase();
    if (lower.includes(needle) || needle.includes(lower)) return name;
  }
  return null;
}

function findCategory(categories, name) {
  if (!name) return null;
  const needle = name.toLowerCase();
  return categories.find((c) => c.name.toLowerCase() === needle) || null;
}

async function classifyViaGemini(rawText, categories, apiKey) {
  const names = categories.map((c) => c.name).filter(Boolean);
  const prompt = `You extract a short task title and classify the task into one category.

Return ONLY valid JSON, no markdown fences, no explanation, in this exact shape:
{"title": "short imperative title under 8 words", "category": "exact category name from the list or null"}

Rules:
- title should be a short clean task title.
- category MUST be exactly one of these names when possible: ${JSON.stringify(names)}
- If none fit well, use null.
- Prefer the closest match. Examples: milk/eggs → Groceries, homework → Class, meeting/email → Job.

Voice input: "${rawText}"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { responseMimeType: 'application/json' },
      }),
    },
  );
  if (!response.ok) throw new Error(`Enrichment failed: ${response.status}`);
  const data = await response.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  const cleaned = text.replace(/```json|```/g, '').trim();
  const parsed = JSON.parse(cleaned);
  const categoryName = matchCategory(parsed.category?.toString(), names);
  const category = findCategory(categories, categoryName);
  const title = (parsed.title || '').trim();
  return {
    title: title || null,
    categoryId: category?.id || '',
    categoryName: category?.name || null,
  };
}

function startOfDay(date) {
  const d = new Date(date);
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
