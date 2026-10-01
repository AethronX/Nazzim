// Checks for the habit engine. Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const H = require('../src/engine/habits.ts');

const today = '2026-10-01'; // Thursday
const d = n => X.addDays(today, n);
const ctx = (over = {}) => ({ today, subjects: [{ id: 's', name: 'S', color: 'indigo', icon: 'book', targetGrade: 'A' }], exams: [], sessions: [], tasks: [], ...over });
const log = days => Object.fromEntries(days.map(n => [d(n), 25]));

// Streak: 5 days in a row including today.
let s = H.studyStreak(ctx(), log([0, -1, -2, -3, -4]));
assert.equal(s.days, 5); assert(s.studiedToday); assert(!s.atRisk); assert(!s.restUsed);
// Not yet today: the run counts from yesterday and is "at risk" (today keeps it).
s = H.studyStreak(ctx(), log([-1, -2, -3]));
assert.equal(s.days, 3); assert(s.atRisk);
// One rest day is forgiven...
s = H.studyStreak(ctx(), log([0, -1, -3, -4]));
assert.equal(s.days, 4); assert(s.restUsed);
// ...but two misses in the same week end the run.
s = H.studyStreak(ctx(), log([0, -2, -4, -5]));
assert.equal(s.days, 2);
// Yesterday missed (the week's rest day), today not yet: still alive and at risk, today keeps it.
s = H.studyStreak(ctx(), log([-2, -3]));
assert.equal(s.days, 2); assert(s.restUsed); assert(s.atRisk);
// Two days in a row without study: the run is over.
assert.equal(H.studyStreak(ctx(), log([-3, -4])).days, 0);
// Rated sessions and finished tasks count as study days.
s = H.studyStreak(ctx({ tasks: [{ id: 't', title: 't', due: today, estimateMin: 10, done: true, doneAt: today }] }), log([-1]));
assert.equal(s.days, 2);

// Checklist: semester is pre-done (endowed progress).
let c = H.activationChecklist(ctx(), {}, { reminders: false, account: false });
assert.equal(c.done, 1); assert.equal(c.total, 5); assert(!c.complete);
c = H.activationChecklist(ctx({ tasks: [{ id: 't', title: 't', due: today, estimateMin: 10, done: true, doneAt: today }] }), log([0]), { reminders: true, account: true });
assert(c.complete);

// Weekly recap only on Sunday/Monday, about the previous Sun–Sat.
assert.equal(H.weeklyRecap(ctx(), log([-1])), null); // Thursday
const sunday = '2026-10-04';
const r = H.weeklyRecap({ ...ctx(), today: sunday }, { '2026-09-28': 30, '2026-09-30': 45, '2026-10-04': 20 });
assert(r); assert.equal(r.minutes, 75); assert.equal(r.activeDays, 2);
assert.equal(H.weeklyRecap({ ...ctx(), today: sunday }, {}), null); // nothing happened: no recap

// Reminder 15 min before study time, never in quiet hours.
assert.deepEqual(H.reminderTime('afternoon'), { hour: 15, minute: 45 });
assert.deepEqual(H.reminderTime('night'), { hour: 20, minute: 45 });
assert.deepEqual(H.reminderTime('morning'), { hour: 8, minute: 45 });
console.log('all habit checks passed');
