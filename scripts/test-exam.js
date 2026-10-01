// Checks for the exam report (readiness explained). Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const E = require('../src/engine/exam.ts');

const today = '2026-10-01';
const exam = { id: 'e1', subjectId: 's', subject: 'Statistics', date: X.addDays(today, 6), chapters: ['Probability', 'Sampling', 'Tests', 'Regression'] };
const plan = X.planExam(exam, today);

// Fresh plan: on track, learn phase, all topics not started, next = today's first session.
let r = E.examReport(exam, plan, today);
assert.equal(r.daysLeft, 6); assert.equal(r.status, 'onTrack'); assert.equal(r.phase, 'learn');
assert(r.topics.every(t => t.state === 'notStarted'));
assert.equal(r.next.date, today); assert.equal(r.remaining.sessions, plan.length);
assert.equal(r.remaining.minutes, plan.reduce((a, s) => a + s.minutes, 0));
assert.equal(r.weakest.index, 0); assert.equal(r.mock.kind, 'mock');
console.log('fresh:', r.status, r.phase, r.remaining);

// Three days later with nothing done: behind (overdue sessions), and the next move is overdue work.
const later = X.addDays(today, 3);
r = E.examReport(exam, plan, later);
assert.equal(r.status, 'atRisk'); assert(r.overdue >= 2); assert(r.next.date < later);

// Same, but a week before: plain "behind".
const exam2 = { ...exam, date: X.addDays(today, 14) };
const plan2 = X.planExam(exam2, today);
r = E.examReport(exam2, plan2, X.addDays(today, 5));
assert.equal(r.status, 'behind');

// Rate chapter 1 Hard → weak; all sessions Easy → ready.
let s = X.rate(plan, plan.find(x => x.chapter === 0).id, 1, exam, today);
r = E.examReport(exam, s, today);
assert.equal(r.topics[0].state, 'weak'); assert.equal(r.weakest.index, 0);
let all = plan; for (const x of plan) all = X.rate(all, x.id, 3, exam, today);
r = E.examReport(exam, all.filter(x => x.done), today);
assert.equal(r.status, 'ready'); assert.equal(r.phase, 'final'); assert(r.topics.every(t => t.state === 'solid' || t.state === 'learning'));

// Past exam.
assert.equal(E.examReport(exam, plan, X.addDays(exam.date, 1)).status, 'over');
console.log('all exam report checks passed');
