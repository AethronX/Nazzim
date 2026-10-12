// Calendar guard: one merged timeline, no duplicates, unconfirmed dates flagged, past and far-off excluded.
require('./register-ts.js');
const assert = require('node:assert');
const C = require('../src/engine/calendar.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-12';
const base = { today, assessments: [], exams: [], tasks: [], topics: [], errors: [] };

// ── Everything lands on one timeline, in date order ──────────────────────────────────────────────
{
  const cal = C.buildCalendar({
    ...base,
    assessments: [{ id: 'a1', subjectId: 's', name: 'Midterm', weight: 25, status: 'upcoming', source: 'official', due: E.addDays(today, 10) }],
    tasks: [{ id: 't1', subjectId: 's', title: 'Problem set', due: E.addDays(today, 2), estimateMin: 45, done: false }],
    topics: [{ id: 'p1', subjectId: 's', name: 'Descriptive stats', status: 'reviewed', reps: 1, correct: 1, wrong: 0, nextReview: E.addDays(today, 1) }],
    errors: [{ id: 'e1', subjectId: 's', question: 'median vs mean', kind: 'concept', repeats: 0, resolved: false, createdAt: today, retryOn: E.addDays(today, 3) }],
  });
  assert.deepEqual(cal.map(e => e.kind), ['review', 'task', 'retest', 'assessment'], 'merged and sorted by date');
  assert.equal(cal[3].weight, 25, 'an assessment carries what it is worth');
  assert.equal(cal[0].daysAway, 1);
}

// ── Graded, done and resolved items never appear ─────────────────────────────────────────────────
{
  const cal = C.buildCalendar({
    ...base,
    assessments: [{ id: 'a', subjectId: 's', name: 'Quiz', weight: 5, status: 'graded', source: 'official', due: E.addDays(today, 4), score: 8, maxScore: 10 }],
    tasks: [{ id: 't', title: 'done', due: E.addDays(today, 1), estimateMin: 10, done: true }],
    errors: [{ id: 'e', subjectId: 's', question: 'q', kind: 'rushing', repeats: 1, resolved: true, createdAt: today, retryOn: E.addDays(today, 1) }],
  });
  assert.equal(cal.length, 0, 'finished work is not upcoming');
}

// ── The past and beyond the horizon are excluded ─────────────────────────────────────────────────
{
  const cal = C.buildCalendar({
    ...base,
    tasks: [
      { id: 'old', title: 'past', due: E.addDays(today, -1), estimateMin: 10, done: false },
      { id: 'far', title: 'far', due: E.addDays(today, 200), estimateMin: 10, done: false },
      { id: 'ok', title: 'soon', due: E.addDays(today, 5), estimateMin: 10, done: false },
    ],
  });
  assert.deepEqual(cal.map(e => e.title), ['soon']);
  // A shorter horizon is respected.
  assert.equal(C.buildCalendar({ ...base, days: 3, tasks: [{ id: 'x', title: 'd5', due: E.addDays(today, 5), estimateMin: 10, done: false }] }).length, 0);
}

// ── An unconfirmed source is flagged, never shown as certain ─────────────────────────────────────
{
  const cal = C.buildCalendar({
    ...base,
    assessments: [{ id: 'u', subjectId: 's', name: 'Final', weight: 0, status: 'upcoming', source: 'unconfirmed', due: E.addDays(today, 30) }],
  });
  assert.equal(cal[0].unconfirmed, true, 'the UI must be able to mark this as needing confirmation');
}

// ── An exam duplicated by a dated assessment of the same subject is not listed twice ─────────────
{
  const date = E.addDays(today, 7);
  const cal = C.buildCalendar({
    ...base,
    assessments: [{ id: 'a', subjectId: 's', name: 'Midterm', weight: 25, status: 'upcoming', source: 'official', due: date }],
    exams: [{ id: 'x', subject: 'Stats', subjectId: 's', date }],
  });
  assert.equal(cal.length, 1, 'the same sitting appears once');
  assert.equal(cal[0].kind, 'assessment', 'the richer record wins');
}

// ── Grouping by day skips empty days and keeps order ─────────────────────────────────────────────
{
  const cal = C.buildCalendar({
    ...base,
    tasks: [
      { id: 'a', title: 'a', due: E.addDays(today, 1), estimateMin: 10, done: false },
      { id: 'b', title: 'b', due: E.addDays(today, 1), estimateMin: 10, done: false },
      { id: 'c', title: 'c', due: E.addDays(today, 6), estimateMin: 10, done: false },
    ],
  });
  const days = C.byDay(cal);
  assert.equal(days.length, 2, 'only days that have something');
  assert.equal(days[0].items.length, 2);
  assert.equal(days[0].daysAway, 1);
  assert.ok(days[0].date < days[1].date);
  assert.deepEqual(C.byDay([]), [], 'an empty calendar groups to nothing');
}

console.log('all calendar checks passed');
