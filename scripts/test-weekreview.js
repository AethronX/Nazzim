// Weekly review guard: proposes a split, never applies one; highlights come from numbers, not encouragement.
require('./register-ts.js');
const assert = require('node:assert');
const R = require('../src/engine/weekreview.ts');

const card = (id, o = {}) => ({ subject: { id, name: id }, risk: 0.3, daysToNext: null, dueReviews: 0, dueMistakes: 0, grade: {}, topics: {}, ...o });
const pulse = (o = {}) => ({ tasksDone: 0, tasksOpen: 0, tasksOverdue: 0, focusMinutes: 0, reviewsDue: 0, mistakesDue: 0, wellbeing: { loggedDays: 7 }, ...o });

// ── The split follows exposure, and the whole budget is allocated ────────────────────────────────
{
  const split = R.proposeSplit([card('hot', { risk: 0.9, daysToNext: 3 }), card('calm', { risk: 0.1 })], 600);
  assert.equal(split[0].subjectId, 'hot', 'the exposed subject gets more');
  assert.ok(split[0].minutes > split[1].minutes);
  assert.equal(split.reduce((t, s) => t + s.minutes, 0), 600, 'the whole budget is allocated, no drift');
  assert.equal(split[0].why, 'imminent', 'and it says why');
}

// ── Nothing is starved to zero on no evidence ────────────────────────────────────────────────────
{
  const split = R.proposeSplit([card('a', { risk: 0 }), card('b', { risk: 0 })], 600);
  assert.equal(split.length, 2);
  assert.ok(split.every(s => s.minutes > 0), 'a subject with no data still gets time');
  assert.ok(split.every(s => s.why === 'even'));
}

// ── Degenerate inputs ────────────────────────────────────────────────────────────────────────────
{
  assert.deepEqual(R.proposeSplit([], 600), []);
  assert.deepEqual(R.proposeSplit([card('a')], 0), [], 'no budget, no plan');
}

// ── Highlights are facts tied to counts ──────────────────────────────────────────────────────────
{
  const bad = R.weekReview({ pulse: pulse({ tasksDone: 1, tasksOpen: 3, tasksOverdue: 2, reviewsDue: 4, mistakesDue: 2, wellbeing: { loggedDays: 1 } }), cards: [card('a')], weeklyMinutes: 300 });
  const kinds = bad.highlights.map(h => h.kind);
  assert.ok(kinds.includes('overdue') && kinds.includes('reviewsPiling') && kinds.includes('mistakesReturning') && kinds.includes('lowLogging'));
  assert.ok(!kinds.includes('strongWeek'), 'a week with overdue work is not called strong');
  assert.ok(Math.abs(bad.completion - 0.25) < 0.001);

  const good = R.weekReview({ pulse: pulse({ tasksDone: 5, tasksOpen: 0 }), cards: [card('a')], weeklyMinutes: 300 });
  assert.deepEqual(good.highlights.map(h => h.kind), ['strongWeek']);
  assert.equal(good.completion, 1);

  // An empty week must not divide by zero or invent a verdict.
  const empty = R.weekReview({ pulse: pulse({ wellbeing: { loggedDays: 0 } }), cards: [], weeklyMinutes: 300 });
  assert.equal(empty.completion, 0);
  assert.ok(!empty.highlights.some(h => h.kind === 'strongWeek'), 'doing nothing is not a strong week');
  assert.deepEqual(empty.split, []);
}

console.log('all week-review checks passed');
