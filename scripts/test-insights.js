// Checks for Progress and insights (all from real activity). Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const I = require('../src/engine/insights.ts');

const today = '2026-10-01';
const exam = { id: 'e1', subjectId: 'stat', subject: 'Statistics', date: X.addDays(today, 2), chapters: ['A', 'B', 'C'] };
const subjects = [{ id: 'stat', name: 'Statistics', color: 'indigo', icon: 'chart', targetGrade: 'A' }];
const plan = X.planExam(exam, X.addDays(today, -6));
const ctx = over => ({ today, subjects, exams: [exam], sessions: plan, tasks: [], ...over });

// Nothing done: no fake numbers.
let p = I.summarizeProgress(ctx(), {});
assert.equal(p.activeDays, 0); assert.equal(p.weekMinutes, 0); assert.equal(p.tasksPct, 0); assert.equal(p.week.length, 7);
assert(p.week.some(d => d.isToday));
// Exam in 2 days with nothing done → at risk first.
let ins = I.generateStudyInsights(ctx(), {});
assert.equal(ins[0].code, 'examAtRisk'); assert.equal(ins[0].days, 2);

// Study this week: rate sessions done recently → readiness up, active days, minutes.
let s = plan;
for (const x of plan.filter(x => x.date < today).slice(0, 4)) s = X.rate(s, x.id, 3, exam, X.addDays(today, -1));
const log = { [today]: 45, [X.addDays(today, -1)]: 30, [X.addDays(today, -3)]: 25, [X.addDays(today, -9)]: 60 };
p = I.summarizeProgress(ctx({ sessions: s, tasks: [{ id: 't', title: 't', due: today, estimateMin: 30, done: true, doneAt: today }] }), log);
assert.equal(p.weekMinutes, 100, 'only the last 7 days count');
assert.equal(p.activeDays, 3); assert.equal(p.tasksPct, 100);
assert(p.subjects[0].readiness > 0);
ins = I.generateStudyInsights(ctx({ sessions: s }), log);
console.log('insights:', ins.map(i => i.code + (i.delta ? '+' + i.delta : '')).join(', '));
assert(ins.some(i => i.code === 'readinessUp' && i.delta >= 5));
assert(ins.some(i => i.code === 'consistency' && i.days === 3));
assert(ins.length <= 3);

// Overdue work surfaces the calm "behind" insight.
ins = I.generateStudyInsights(ctx({ exams: [], sessions: [], tasks: [{ id: 'o', title: 'o', due: X.addDays(today, -2), estimateMin: 30, done: false }] }), {});
assert.equal(ins[0].code, 'behind');
// Empty semester → a single "start" insight.
assert.deepEqual(I.generateStudyInsights(ctx({ exams: [], sessions: [] }), {}).map(i => i.code), ['start']);

console.log('all insight checks passed');
