// Checks for the academic engine (next action, agenda, load, progress). Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const A = require('../src/engine/academic.ts');

const today = '2026-10-01';
const subjects = [{ id: 'stat', name: 'Statistics', color: 'indigo', icon: 'chart', targetGrade: 'A' }, { id: 'calc', name: 'Calculus', color: 'green', icon: 'function', targetGrade: 'B+' }];
const exam = { id: 'e1', subjectId: 'stat', subject: 'Statistics', date: X.addDays(today, 6), chapters: ['Ch 1', 'Ch 2', 'Ch 3', 'Ch 4'] };
const sessions = X.planExam(exam, today);
const title = (s, e) => (s.chapter < 0 ? 'All' : e.chapters[s.chapter]);
const ctx = (over = {}) => ({ today, subjects, exams: [exam], sessions, tasks: [], ...over });

// 1. With only the exam plan, the next move is today's first study session.
let n = A.recommendNextAction(ctx(), title);
assert.equal(n.kind, 'session'); assert.equal(n.reason.code, 'examSoon'); assert.equal(n.reason.days, 6);
console.log('next (plan only):', n.title, n.reason);

// 2. An overdue task outranks the session.
const overdue = { id: 't1', subjectId: 'calc', title: 'Lab report', due: X.addDays(today, -2), estimateMin: 60, done: false };
n = A.recommendNextAction(ctx({ tasks: [overdue] }), title);
assert.equal(n.kind, 'task'); assert.equal(n.reason.code, 'overdue'); assert.equal(n.reason.days, 2);

// 3. Tasks due later than tomorrow are not "now".
n = A.recommendNextAction(ctx({ sessions: [], tasks: [{ ...overdue, due: X.addDays(today, 5) }] }), title);
assert.equal(n.kind, 'clear');
// 4. Nothing at all → suggest adding an exam.
assert.equal(A.recommendNextAction(ctx({ exams: [], sessions: [] }), title).kind, 'addExam');

// 5. Agenda: exam first, blocks back to back from 16:00 with 10 min breaks.
const due = { id: 't2', subjectId: 'stat', title: 'Practice questions', due: today, estimateMin: 45, done: false };
const ag = A.agendaFor(ctx({ tasks: [due] }), today, { exam: 'Exam', task: 'Task', kind: k => k }, title);
assert(ag.length >= 2);
assert.equal(ag[0].start, '16:00');
assert.equal(ag[1].start, A.agendaFor(ctx({ tasks: [due] }), today, { exam: 'Exam', task: 'Task', kind: k => k }, title)[1].start);
console.log('agenda:', ag.map(a => `${a.start}-${a.end} ${a.kind} ${a.title}`).join(' | '));
const examDay = A.agendaFor(ctx(), exam.date, { exam: 'Exam', task: 'Task', kind: k => k }, title);
assert.equal(examDay[0].kind, 'exam');

// 6. Load levels.
const load = A.analyzeAcademicLoad(ctx(), today, 7);
assert.equal(load.days.length, 7); assert.equal(load.total, load.minutesPerDay.reduce((a, b) => a + b, 0));
console.log('load:', load.level, load.minutesPerDay);
const heavy = A.analyzeAcademicLoad(ctx({ tasks: [{ ...due, estimateMin: 320 }] }), today, 7);
assert.equal(heavy.level, 'heavy');
assert.equal(A.analyzeAcademicLoad(ctx({ sessions: [] }), today, 7).level, 'light');

// 7. Progress: completing work moves subject and semester progress.
assert.equal(A.subjectProgress(ctx(), 'stat'), 0);
const half = sessions.map((s, i) => (i % 2 === 0 ? { ...s, done: true } : s));
const p = A.subjectProgress(ctx({ sessions: half }), 'stat');
assert(p > 40 && p < 60, 'about half: ' + p);
assert.equal(A.subjectProgress(ctx(), 'calc'), 0);
assert.equal(A.semesterProgress(ctx({ sessions: [], tasks: [{ ...due, done: true }] })), 100);

// 8. Subject summary + overdue.
const sum = A.summarizeSubject(ctx({ tasks: [due] }), subjects[0]);
assert.equal(sum.pendingTasks, 1); assert.equal(sum.nextExam.id, 'e1'); assert.equal(typeof sum.readiness, 'number');
assert.equal(A.overdueTasks(ctx({ tasks: [overdue, due] })).length, 1);

console.log('all academic engine checks passed');
