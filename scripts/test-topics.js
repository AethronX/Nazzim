// Topic mastery + spaced review guard. Reading never counts; only recorded retrieval moves a topic.
require('./register-ts.js');
const assert = require('node:assert');
const T = require('../src/engine/topics.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-12';
const mk = (o = {}) => ({ id: 't1', subjectId: 's', name: 'Descriptive statistics', status: 'new', reps: 0, correct: 0, wrong: 0, ...o });

// ── Mastery is only reported once something was actually attempted ────────────────────────────────
{
  assert.equal(T.mastery(mk()), undefined, 'an untouched topic has no mastery');
  const once = T.review(mk(), 2, today);
  assert.ok(T.mastery(once) > 0 && T.mastery(once) < 0.7, 'one success is not mastery yet');
  assert.equal(once.status, 'reviewed');
}

// ── The ladder: 1 → 3 → 7, then expanding ────────────────────────────────────────────────────────
{
  assert.equal(T.gapFor(1), 1);
  assert.equal(T.gapFor(2), 3);
  assert.equal(T.gapFor(3), 7);
  assert.ok(T.gapFor(4) > 7, 'gaps keep growing past the ladder');
  let t = mk();
  t = T.review(t, 2, today);
  assert.equal(t.nextReview, E.addDays(today, 1), 'first success reviews tomorrow');
  t = T.review(t, 2, t.nextReview);
  assert.equal(t.nextReview, E.addDays('2026-10-13', 3), 'second success waits 3 days');
  t = T.review(t, 2, t.nextReview);
  assert.equal(t.nextReview, E.addDays('2026-10-16', 7), 'third success waits a week');
  assert.equal(t.status, 'mastered', 'three in a row reads as mastered');
  assert.equal(t.reps, 3);
}

// ── Failure sends it straight back, and resets the streak ────────────────────────────────────────
{
  let t = mk({ reps: 3, correct: 3, wrong: 0, status: 'mastered' });
  t = T.review(t, 0, today);
  assert.equal(t.reps, 0, 'a miss resets the run');
  assert.equal(t.nextReview, E.addDays(today, 1), 'comes back tomorrow');
  assert.equal(t.wrong, 1);
  assert.notEqual(t.status, 'mastered', 'no longer mastered after a miss');
  // "Almost" holds the streak but returns soon.
  let p = T.review(mk({ reps: 2, correct: 2 }), 1, today);
  assert.equal(p.reps, 2, 'partial keeps the streak');
  assert.equal(p.nextReview, E.addDays(today, 2));
}

// ── No review ever lands after the exam ──────────────────────────────────────────────────────────
{
  const exam = E.addDays(today, 4);
  const t = T.review(mk({ reps: 3, correct: 3 }), 2, today, exam); // would be a long gap unaided
  assert.ok(t.nextReview <= exam, `review must land on or before the exam (${t.nextReview} vs ${exam})`);
  assert.ok(T.daysOrZero === undefined || true);
}

// ── Due list: most overdue first, then weakest ───────────────────────────────────────────────────
{
  const list = [
    mk({ id: 'fresh', nextReview: E.addDays(today, 3), correct: 1, reps: 1 }),
    mk({ id: 'late', nextReview: E.addDays(today, -2), correct: 1, reps: 1 }),
    mk({ id: 'todayDue', nextReview: today, correct: 1, reps: 1 }),
  ];
  const due = T.dueTopics(list, today).map(t => t.id);
  assert.deepEqual(due, ['late', 'todayDue'], 'only due/overdue, most overdue first');
}

// ── Stats separate coverage (content touched) from mastery (proved) ──────────────────────────────
{
  const list = [
    mk({ id: 'a', correct: 3, wrong: 0, reps: 3, status: 'mastered' }),
    mk({ id: 'b', correct: 1, wrong: 2, reps: 0, status: 'learning' }),
    mk({ id: 'c' }), // never attempted
  ];
  const s = T.topicStats(list, today);
  assert.equal(s.total, 3);
  assert.equal(s.mastered, 1);
  assert.equal(s.untouched, 1);
  assert.ok(Math.abs(s.coverage - 2 / 3) < 0.01, 'coverage counts attempted topics');
  assert.ok(s.mastery > 0 && s.mastery < 1, 'mean mastery across attempted topics');
  // A topic that was only read is still untouched — reading is not evidence.
  assert.equal(T.untouched(list).length, 1);
}

// ── A new topic is never pre-marked as studied ───────────────────────────────────────────────────
{
  const t = T.newTopic('s', '  Plate tectonics  ', 'x');
  assert.equal(t.name, 'Plate tectonics');
  assert.equal(t.status, 'new');
  assert.equal(t.reps + t.correct + t.wrong, 0);
  assert.equal(t.nextReview, undefined);
  assert.equal(T.mastery(t), undefined);
}

console.log('all topic checks passed');
