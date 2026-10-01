// Checks for the Smart Planner parser and proposal. Run: npm test
require('./register-ts');
const assert = require('assert');
const X = require('../src/lib/exams.ts');
const P = require('../src/ai/planner.ts');

const today = '2026-10-01'; // a Thursday
const subjects = [
  { id: 'stat', name: 'Statistics', color: 'indigo', icon: 'chart', targetGrade: 'A' },
  { id: 'calc', name: 'Calculus', color: 'green', icon: 'function', targetGrade: 'B+' },
];
const exam = { id: 'e1', subjectId: 'stat', subject: 'Statistics', date: X.addDays(today, 6), chapters: ['Probability', 'Sampling', 'Tests', 'Regression'] };
const ctx = { today, subjects, exams: [exam], sessions: X.planExam(exam, today), tasks: [], dailyMinutes: 120 };
const parse = t => P.parsePlanRequest(t, ctx);

const cases = [
  ['Statistics exam in 6 days, I haven’t started', { subjectId: 'stat', inDays: 6, chapters: 4, replacesExamId: 'e1' }],
  ['عندي اختبار Statistics بعد ٦ أيام ولم أبدأ', { subjectId: 'stat', inDays: 6 }],
  ['Calculus final next week, 5 chapters', { subjectId: 'calc', inDays: 7, chapters: 5 }],
  ['Physics quiz on Thursday', { subjectName: 'Physics', inDays: 7, chapters: 2 }],
  ['physics quiz on monday', { subjectName: 'Physics', inDays: 4 }],
  ['امتحان فيزياء بعد 5 أيام، 3 فصول', { subjectName: 'فيزياء', inDays: 5, chapters: 3 }],
  ['Chemistry midterm tomorrow', { subjectName: 'Chemistry', inDays: 1 }],
  ['نهائي Calculus بعد أسبوعين', { subjectId: 'calc', inDays: 14 }],
  ['Statistics', { subjectId: 'stat', inDays: 6 }], // date taken from the existing exam
];
for (const [text, want] of cases) {
  const r = parse(text);
  assert(r.ok, 'parsed: ' + text + ' ' + JSON.stringify(r));
  for (const [k, v] of Object.entries(want)) assert.equal(r.req[k], v, `${text} → ${k}: ${r.req[k]} ≠ ${v}`);
  console.log('✓', text, '→', r.req.subjectName, r.req.inDays + 'd', r.req.chapters + 'ch');
}

// Missing information is reported, not guessed.
let r = parse('I need help');
assert(!r.ok); assert.deepEqual(r.missing, ['subject', 'date']);
r = parse('Biology exam');
assert(!r.ok); assert.deepEqual(r.missing, ['date']);

// Proposal: sessions all before the exam, reasons explain it, replaced plan excluded from "around".
const prop = P.proposePlan(parse('Statistics exam in 6 days').req, ctx, n => 'Chapter ' + n);
assert.equal(prop.examDate, X.addDays(today, 6));
assert.deepEqual(prop.chapters, exam.chapters); // reuses the existing chapter names
assert(prop.sessions.every(s => s.date < prop.examDate && s.date >= today));
assert.equal(prop.reasons[0].code, 'start');
assert(prop.reasons.some(x => x.code === 'spacing') && prop.reasons.some(x => x.code === 'mock'));
assert(!prop.reasons.some(x => x.code === 'around'));
const per = prop.reasons.find(x => x.code === 'perDay');
console.log('proposal:', prop.days.map(d => `${d.date.slice(5)}:${d.minutes}m`).join(' '), '| per day', per.minutes, 'cap', per.capacity);

const other = P.proposePlan(parse('Calculus final next week').req, ctx, n => 'Chapter ' + n);
assert(other.reasons.some(x => x.code === 'around'));
assert.equal(other.chapters[0], 'Chapter 1');

console.log('all planner checks passed');
