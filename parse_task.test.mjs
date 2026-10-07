import assert from 'node:assert/strict';
import { classifyHeuristic, effectivePriority } from './classify_task.js';
import { atEndOfDay, defaultDue, fromDateValue } from './firestore.js';
import { parseTaskText } from './parse_task.js';

const now = new Date(2026, 9, 7); // Wednesday, Oct 7 2026

function day(date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

const milk = parseTaskText('Buy milk tomorrow', now);
assert.equal(milk.title, 'Buy milk');
assert.equal(milk.priority, 'medium');
assert.equal(day(milk.dueDate), '2026-10-8');
assert.ok(milk.guessed.includes('due'));

const email = parseTaskText('Email the professor by Friday, high priority', now);
assert.equal(email.title, 'Email the professor');
assert.equal(email.priority, 'high');
assert.equal(day(email.dueDate), '2026-10-9');

const urgent = parseTaskText('Submit the assignment ASAP', now);
assert.equal(urgent.priority, 'high');
assert.equal(urgent.title, 'Submit the assignment');
assert.equal(day(urgent.dueDate), '2026-10-8');

const low = parseTaskText('Call mom whenever', now);
assert.equal(low.priority, 'low');
assert.equal(low.title, 'Call mom');

const month = parseTaskText('Pay rent on October 15', now);
assert.equal(month.title, 'Pay rent');
assert.equal(day(month.dueDate), '2026-10-15');

const slash = parseTaskText('Doctor visit 10/20', now);
assert.equal(slash.title, 'Doctor visit');
assert.equal(day(slash.dueDate), '2026-10-20');

const plain = parseTaskText('Read chapter 4', now);
assert.equal(plain.title, 'Read chapter 4');
assert.equal(plain.priority, 'medium');
assert.equal(day(plain.dueDate), '2026-10-8');

assert.equal(parseTaskText('   ', now), null);

const voiced = parseTaskText('Hey Mia, can you add a task buy milk tomorrow', now);
assert.equal(voiced.title, 'buy milk');
assert.equal(day(voiced.dueDate), '2026-10-8');
assert.equal(voiced.priority, 'medium');

const school = parseTaskText('high school homework tomorrow', now);
assert.equal(school.priority, 'medium');
assert.equal(school.title, 'high school homework');

const categories = [
  { id: 'g', name: 'Groceries', emoji: '🛒' },
  { id: 'c', name: 'Class', emoji: '📚' },
  { id: 'j', name: 'Job', emoji: '💼' },
  { id: 'p', name: 'Personal', emoji: '🏠' },
];
assert.deepEqual(classifyHeuristic('buy milk and eggs', categories), {
  categoryId: 'g',
  categoryName: 'Groceries',
});
assert.equal(classifyHeuristic('email the professor', categories).categoryName, 'Job');
assert.equal(classifyHeuristic('finish the homework', categories).categoryName, 'Class');
assert.equal(classifyHeuristic('doctor appointment', categories).categoryName, 'Personal');

assert.equal(effectivePriority('low', new Date(2026, 9, 7), now), 'high');
assert.equal(effectivePriority('low', new Date(2026, 9, 8), now), 'medium');
assert.equal(effectivePriority('low', new Date(2026, 9, 9), now), 'medium');
assert.equal(effectivePriority('low', new Date(2026, 9, 10), now), 'low');
assert.equal(effectivePriority('low', new Date(2026, 9, 15), now), 'low');
assert.equal(effectivePriority('high', new Date(2026, 9, 20), now), 'high');

function savedDue(text) {
  return atEndOfDay(parseTaskText(text, now).dueDate);
}

const todaySaved = savedDue('buy milk today');
assert.equal(day(todaySaved), '2026-10-7');
assert.equal(todaySaved.getHours(), 23);
assert.equal(todaySaved.getMinutes(), 59);
assert.equal(effectivePriority('low', todaySaved, now), 'high');

const tonightSaved = savedDue('call mom tonight');
assert.equal(day(tonightSaved), '2026-10-7');
assert.equal(tonightSaved.getHours(), 23);
assert.equal(effectivePriority('medium', tonightSaved, now), 'high');

const tomorrowSaved = savedDue('buy milk tomorrow');
assert.equal(day(tomorrowSaved), '2026-10-8');
assert.equal(tomorrowSaved.getHours(), 23);
assert.equal(tomorrowSaved.getMinutes(), 59);
assert.equal(effectivePriority('low', tomorrowSaved, now), 'medium');

const fridaySaved = savedDue('Email the professor by Friday');
assert.equal(day(fridaySaved), '2026-10-9');
assert.equal(fridaySaved.getHours(), 23);
assert.equal(effectivePriority('low', fridaySaved, now), 'medium');

const weekSaved = savedDue('read chapter 4 next week');
assert.equal(day(weekSaved), '2026-10-14');
assert.equal(weekSaved.getHours(), 23);
assert.equal(effectivePriority('low', weekSaved, now), 'low');

const picked = fromDateValue('2026-10-07');
assert.equal(picked.getHours(), 23);
assert.equal(picked.getMinutes(), 59);

const fallback = defaultDue(now);
assert.equal(day(fallback), '2026-10-8');
assert.equal(fallback.getHours(), 23);
assert.equal(fallback.getMinutes(), 59);

console.log('parse_task tests passed');
