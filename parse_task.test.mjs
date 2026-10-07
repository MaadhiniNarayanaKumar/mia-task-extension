import assert from 'node:assert/strict';
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

console.log('parse_task tests passed');
