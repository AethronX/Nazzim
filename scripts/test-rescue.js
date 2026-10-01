// Checks for Rescue Mode. Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const R = require('../src/engine/rescue.ts');
const A = require('../src/engine/academic.ts');

const today = '2026-10-01';
const exam = { id: 'e1', subjectId: 'stat', subject: 'Statistics', date: X.addDays(today, 6), chapters: ['Ch 1', 'Ch 2', 'Ch 3', 'Ch 4'] };
const sessions = X.planExam(exam, today);
const task = (id, dueIn, min) => ({ id, subjectId: 'calc', title: id, due: X.addDays(today, dueIn), estimateMin: min, done: false });
const ctx = over => ({ today, subjects: [], exams: [exam], sessions, tasks: [], dailyMinutes: 120, ...over });

// 1. A light week is on track: nothing moves.
let plan = R.generateRescuePlan(ctx());
assert.equal(R.assessBehind(ctx()).behind, false);
console.log('light week:', plan.status, 'moves', plan.moves.length, 'need', plan.neededMin, 'of', plan.availableMin);

// 2. Three overdue tasks: the student is behind; every overdue task lands today or later, no day over capacity
//    unless flagged tight, and no session after its exam.
const piled = ctx({ tasks: [task('a', -3, 60), task('b', -2, 50), task('c', -1, 45), task('d', 2, 30)] });
const st = R.assessBehind(piled);
assert.equal(st.behind, true); assert.equal(st.overdue, 3);
plan = R.generateRescuePlan(piled);
assert.equal(plan.overdue, 3);
assert(plan.status === 'recoverable' || plan.status === 'tight');
const placed = plan.days.flatMap(d => d.items);
for (const id of ['a', 'b', 'c']) { const it = placed.find(p => p.id === id); assert(it && it.to >= today, 'overdue placed ' + id); }
for (const d of plan.days) if (!d.items.some(i => plan.tight.includes(i.id))) assert(d.minutes <= 120, 'cap ' + d.date + ' ' + d.minutes);
for (const it of placed.filter(p => p.kind === 'session')) assert(it.to < exam.date, 'session before exam');
const dTask = placed.find(p => p.id === 'd'); assert(dTask.to <= X.addDays(today, 2), 'task by its due date');
console.log('rescue:', plan.status, 'moves', plan.moves.length, 'dropped', plan.dropped.length, 'tight', plan.tight.length);
console.log(plan.days.map(d => `${d.date.slice(5)} ${d.minutes}m`).join(' | '));

// 3. Work never moves earlier than it was planned (keeps review spacing).
for (const it of placed) if (it.from >= today) assert(it.to >= it.from, 'no earlier ' + it.id);

// 4. After applying, the rescued tasks are no longer overdue for the engine.
const applied = {
  ...piled,
  tasks: piled.tasks.map(t => { const m = placed.find(p => p.id === t.id); return m ? { ...t, plannedFor: m.to } : t; }),
  sessions: sessions.filter(s => !plan.dropped.includes(s.id)).map(s => { const m = placed.find(p => p.id === s.id); return m ? { ...s, date: m.to } : s; }),
};
assert.equal(A.overdueTasks(applied).length, 0);
assert.equal(R.assessBehind(applied).overdue, 0);

// 5. Impossible load is reported as tight rather than hidden.
plan = R.generateRescuePlan(ctx({ dailyMinutes: 30, tasks: [task('big', 0, 200)] }));
assert.equal(plan.status, 'tight'); assert(plan.tight.includes('big'));

console.log('all rescue checks passed');
