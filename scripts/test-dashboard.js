// Dashboard guard: four indicators stay separate, risk ranks attention, and nothing is merged or predicted.
require('./register-ts.js');
const assert = require('node:assert');
const D = require('../src/engine/dashboard.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-12';
const subj = (id, name) => ({ id, name, color: 'indigo', icon: 'chart', targetGrade: 'A' });
const as = (subjectId, o) => ({ id: 'a' + Math.random(), subjectId, name: o.name || 'x', weight: o.weight, status: o.status || 'upcoming', source: o.source || 'official', maxScore: o.maxScore, score: o.score, due: o.due });
const tp = (subjectId, o = {}) => ({ id: 't' + Math.random(), subjectId, name: 'topic', status: 'new', reps: 0, correct: 0, wrong: 0, ...o });

// ── The four indicators are computed separately and never merged ─────────────────────────────────
{
  const s = subj('s1', 'Stats');
  const cards = D.subjectCards({
    subjects: [s],
    assessments: [as('s1', { weight: 15, maxScore: 15, score: 8, status: 'graded' }), as('s1', { weight: 85, due: E.addDays(today, 10) })],
    topics: [tp('s1', { correct: 2, wrong: 0, reps: 2, status: 'reviewed' }), tp('s1')],
    errors: [],
    gradeTargets: {}, defaultTarget: 90, today,
  });
  const c = cards[0];
  // Grade: 8/15 of a 15% block = 8 points, not 53%.
  assert.ok(Math.abs(c.grade.earned - 8) < 0.01, 'academic grade is weighted points');
  // Coverage and mastery are their own numbers, unrelated to the grade.
  assert.ok(Math.abs(c.topics.coverage - 0.5) < 0.01, 'half the topics attempted');
  assert.ok(c.topics.mastery > 0 && c.topics.mastery < 1);
  assert.notEqual(Math.round(c.topics.mastery * 100), Math.round(c.grade.earned), 'mastery is not the grade');
  assert.equal(c.daysToNext, 10, 'days to the next dated assessment');
  assert.equal(c.nextName, 'x');
  assert.ok(c.risk >= 0 && c.risk <= 1, 'risk stays in range');
  // No combined score field exists anywhere on the card.
  for (const banned of ['overall', 'total', 'successChance', 'prediction']) {
    assert.equal(Object.prototype.hasOwnProperty.call(c, banned), false, `no merged "${banned}" indicator`);
  }
}

// ── Risk ranks attention: more at stake and sooner beats comfortable and distant ──────────────────
{
  const soon = D.riskOf({ grade: { remainingWeight: 90, required: 95 }, topics: { total: 4, untouched: 3, mastery: 0.2 }, daysToNext: 2, backlog: 1 });
  const calm = D.riskOf({ grade: { remainingWeight: 10, required: 20 }, topics: { total: 4, untouched: 0, mastery: 0.9 }, daysToNext: 60, backlog: 0 });
  assert.ok(soon > calm, 'the exposed subject ranks higher');
  assert.ok(soon <= 1 && calm >= 0);
  // No dated assessment means proximity contributes nothing rather than guessing.
  const undated = D.riskOf({ grade: { remainingWeight: 90, required: 95 }, topics: { total: 0, untouched: 0, mastery: 0 }, daysToNext: null, backlog: 0 });
  assert.ok(undated < soon, 'an undated subject is not treated as imminent');
}

// ── Cards are ordered by risk, so the most exposed subject is first ───────────────────────────────
{
  const cards = D.subjectCards({
    subjects: [subj('calm', 'Calm'), subj('hot', 'Hot')],
    assessments: [
      as('calm', { weight: 100, maxScore: 100, score: 95, status: 'graded' }),
      as('hot', { weight: 100, due: E.addDays(today, 1) }),
    ],
    topics: [tp('hot'), tp('hot')],
    errors: [],
    gradeTargets: {}, defaultTarget: 90, today,
  });
  assert.equal(cards[0].subject.id, 'hot', 'the subject at risk leads');
  assert.equal(cards[1].grade.verdict, 'done', 'the finished subject reports a fixed final');
}

// ── Incomplete weights stay flagged on the dashboard too ──────────────────────────────────────────
{
  const cards = D.subjectCards({
    subjects: [subj('s', 'Unknown')],
    assessments: [as('s', { weight: 0, source: 'unconfirmed' })],
    topics: [], errors: [], gradeTargets: {}, defaultTarget: 90, today,
  });
  assert.equal(cards[0].grade.dataStatus, 'incomplete');
  assert.equal(cards[0].grade.verdict, 'needData', 'no forecast without official weights');
}

// ── Week pulse counts what happened, including an empty week ──────────────────────────────────────
{
  const ctx = {
    today, subjects: [], exams: [], sessions: [],
    tasks: [
      { id: 'a', title: 'a', due: today, estimateMin: 30, done: true, doneAt: today },
      { id: 'b', title: 'b', due: E.addDays(today, -2), estimateMin: 30, done: false },
      { id: 'c', title: 'c', due: E.addDays(today, 3), estimateMin: 30, done: false },
    ],
  };
  const p = D.weekPulse({ ctx, topics: [], errors: [], focusLog: { [today]: 50, [E.addDays(today, -20)]: 999 }, dayLogs: {}, today });
  assert.equal(p.tasksDone, 1);
  assert.equal(p.tasksOpen, 2);
  assert.equal(p.tasksOverdue, 1);
  assert.equal(p.focusMinutes, 50, 'only the last 7 days count');
  assert.equal(p.wellbeing.loggedDays, 0);

  const empty = D.weekPulse({ ctx: { today, subjects: [], exams: [], sessions: [], tasks: [] }, topics: [], errors: [], focusLog: {}, dayLogs: {}, today });
  assert.equal(empty.tasksDone, 0);
  assert.equal(empty.focusMinutes, 0);
}

console.log('all dashboard checks passed');
