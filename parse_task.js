/**
 * Pull a title, due date, and priority out of freeform task text.
 * Category stays empty so the Flutter app can enrich it.
 *
 * @param {string} raw
 * @param {Date} [now]
 */
export function parseTaskText(raw, now = new Date()) {
  const text = (raw || '').trim();
  if (!text) return null;

  const guessed = new Set(['title']);
  let working = text.replace(/\s+/g, ' ').trim();

  let priority = 'medium';
  const highRe = /\b(?:urgent|asap|high(?:\s+priority)?|important)\b|!{2,}/gi;
  const lowRe = /\b(?:low(?:\s+priority)?|whenever|someday|no rush)\b/gi;
  if (highRe.test(working)) {
    priority = 'high';
    guessed.add('priority');
    working = working.replace(highRe, ' ');
  } else if (lowRe.test(working)) {
    priority = 'low';
    guessed.add('priority');
    working = working.replace(lowRe, ' ');
  }

  const due = extractDue(working, now);
  let dueDate = due?.date ?? null;
  if (due) {
    guessed.add('due');
    working = working.replace(due.pattern, ' ');
  } else {
    dueDate = addDays(startOfDay(now), 1);
    guessed.add('due');
  }

  let title = working
    .replace(/\s+/g, ' ')
    .replace(/^[\s,.\-–—:]+|[\s,.\-–—:]+$/g, '')
    .trim();

  if (!title) {
    title = text.replace(/\s+/g, ' ').trim();
  }

  return {
    title,
    rawText: text,
    priority,
    dueDate,
    guessed: [...guessed],
  };
}

const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
];

const MONTHS = [
  'january',
  'february',
  'march',
  'april',
  'may',
  'june',
  'july',
  'august',
  'september',
  'october',
  'november',
  'december',
];

const MONTHS_SHORT = MONTHS.map((m) => m.slice(0, 3));

function extractDue(text, now) {
  const patterns = [
    {
      re: /\b(?:due\s+|by\s+|on\s+|before\s+)?tonight\b/i,
      toDate: () => startOfDay(now),
    },
    {
      re: /\b(?:due\s+|by\s+|on\s+|before\s+)?today\b/i,
      toDate: () => startOfDay(now),
    },
    {
      re: /\b(?:due\s+|by\s+|before\s+)?tomorrow\b/i,
      toDate: () => addDays(startOfDay(now), 1),
    },
    {
      re: /\bnext week\b/i,
      toDate: () => addDays(startOfDay(now), 7),
    },
    {
      re: new RegExp(
        `\\bnext\\s+(${WEEKDAYS.join('|')})\\b`,
        'i',
      ),
      toDate: (match) => nextWeekday(now, match[1], true),
    },
    {
      re: new RegExp(
        `\\b(?:due\\s+|by\\s+|on\\s+|before\\s+)?(${WEEKDAYS.join('|')})\\b`,
        'i',
      ),
      toDate: (match) => nextWeekday(now, match[1], false),
    },
    {
      re: new RegExp(
        `\\b(?:due\\s+|by\\s+|on\\s+|before\\s+)?(${MONTHS.join('|')}|${MONTHS_SHORT.join('|')})\\s+(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?\\b`,
        'i',
      ),
      toDate: (match) => monthDay(now, match[1], Number(match[2]), match[3]),
    },
    {
      re: /\b(?:due\s+|by\s+|on\s+|before\s+)?(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
      toDate: (match) =>
        monthDay(now, Number(match[1]), Number(match[2]), match[3], true),
    },
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern.re);
    if (!match) continue;
    const date = pattern.toDate(match);
    if (!date || Number.isNaN(date.getTime())) continue;
    return { date, pattern: pattern.re };
  }
  return null;
}

function nextWeekday(now, name, forceNextWeek) {
  const target = WEEKDAYS.indexOf(String(name).toLowerCase());
  if (target < 0) return null;
  const today = startOfDay(now);
  let delta = (target - today.getDay() + 7) % 7;
  if (forceNextWeek || delta === 0) delta += 7;
  return addDays(today, delta);
}

function monthDay(now, monthOrName, day, yearText, numericMonth = false) {
  let month;
  if (numericMonth) {
    month = Number(monthOrName);
  } else {
    const name = String(monthOrName).toLowerCase();
    month = MONTHS.indexOf(name);
    if (month < 0) month = MONTHS_SHORT.indexOf(name.slice(0, 3));
    month += 1;
  }
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  let year = yearText ? Number(yearText) : now.getFullYear();
  if (year < 100) year += 2000;
  let date = new Date(year, month - 1, day);
  if (date.getMonth() !== month - 1) return null;
  if (!yearText) {
    const today = startOfDay(now);
    if (date < today) date = new Date(year + 1, month - 1, day);
  }
  return date;
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
