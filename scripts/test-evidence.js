// Evidence-integrity guard: the properties that make the headline number worth showing a student.
//
// These are not "nice to have" assertions. Each one corresponds to a way the number was demonstrably
// inflatable before Phase 1, proved by executing the real functions:
//   · a self-test the student FAILED raised the number (64% → 69%)
//   · four cards and eight taps, with no study and no focus, produced 66%
//   · a chapter proved by self-testing alone never decayed, at any age
//   · one card could carry a whole chapter, and mastery reached 1.0
// If any check here fails, the number is lying again.
require('./register-ts.js');
const assert = require('node:assert');
const E = require('../src/lib/exams.ts');
const R = require('../src/engine/recall.ts');

const today = '2026-10-01';
const exam = (n = 2, inDays = 8) => ({ id: 'e1', subject: 'Stats', date: E.addDays(today, inDays), chapters: Array.from({ length: n }, (_, i) => 'ch' + i) });
// One planned-and-done session per chapter, with `focused` minutes of app focus credited to it.
const sess = (ch, done, focused) => ({ id: 's' + ch, examId: 'e1', chapter: ch, kind: 'learn', date: today, doneAt: done ? today : undefined, minutes: 40, done, focusedMin: focused });
const withRecall = (ex, score, conf) => ({ ...ex, recall: Object.fromEntries(ex.chapters.map((_, i) => [i, { score, at: today, conf }])) });

// ── The neutral point must be the "almost" rung, or the invariant below cannot hold ──
// "Almost" is the grade that settles nothing, so it has to be the grade that moves nothing. If the formula's
// neutral point and the mastery ladder drift apart, answering "almost" silently becomes a penalty.
assert.equal(
  E.R_NEUTRAL,
  R.mastery({ lastGrade: 1, scoredGrade: 1, reps: 1 }),
  'R_NEUTRAL in exams.ts must equal the "almost" rung of mastery() in recall.ts',
);

// ── Test 1. forgot ≤ none ≤ almost ≤ knew, holding study evidence constant ──
// This is THE invariant. Same coverage, same focused minutes, same card confidence; only the grade moves.
{
  const ex = exam(2);
  const worked = [0, 1].map(c => sess(c, true, 40));
  const score = (r, conf = 1) => (r === null ? E.readiness(ex, worked, today) : E.readiness(withRecall(ex, r, conf), worked, today));

  const forgot = score(R.mastery({ lastGrade: 0, scoredGrade: 0, reps: 0 }));
  const none = score(null);
  const almost = score(R.mastery({ lastGrade: 1, scoredGrade: 1, reps: 1 }));
  const knew = score(R.mastery({ lastGrade: 2, scoredGrade: 2, reps: 3 }));

  assert.ok(forgot <= none, `a failed self-test must not raise the number: forgot ${forgot}% vs none ${none}%`);
  assert.ok(forgot < none, `a failed self-test must actually lower it: forgot ${forgot}% vs none ${none}%`);
  assert.ok(none <= almost, `none ${none}% must not exceed almost ${almost}%`);
  assert.ok(almost <= knew, `almost ${almost}% must not exceed knew ${knew}%`);
  console.log(`  invariant: forgot ${forgot}% ≤ none ${none}% ≤ almost ${almost}% ≤ knew ${knew}%`);

  // And it must hold across the whole grid of study evidence, not just the one row above.
  for (const focused of [0, 10, 20, 40]) {
    for (const coverage of [[true, false], [true, true]]) {
      const ss = coverage.map((d, c) => sess(c, d, d ? focused : 0));
      const f = E.readiness(withRecall(ex, 0.1, 1), ss, today);
      const n = E.readiness(ex, ss, today);
      const a = E.readiness(withRecall(ex, 0.5, 1), ss, today);
      const k = E.readiness(withRecall(ex, 0.85, 1), ss, today);
      assert.ok(f <= n && n <= a && a <= k, `ordering broke at focused=${focused} coverage=${coverage}: ${f}/${n}/${a}/${k}`);
    }
  }
}

// ── Test 2. One card cannot master a chapter ──
{
  let c = R.newCard('e1', 0, 'q', 'a', 'c1', today);
  let day = today;
  for (let i = 0; i < 6; i++) { c = R.review(c, 2, day, undefined, 'verified'); day = c.due; }
  assert.ok(R.mastery(c) < 1, `a single card must never reach mastery 1, got ${R.mastery(c)}`);
  assert.ok(R.chapterRecall([c], 'e1', 0) < 1, 'one perfect card must not make a chapter fully recalled');
  assert.ok(R.chapterRecallConfidence([c], 'e1', 0) < 1, `one card must not give full recall confidence, got ${R.chapterRecallConfidence([c], 'e1', 0)}`);
  assert.equal(R.chapterRecallConfidence([c], 'e1', 0), 1 / R.MIN_CARDS, 'one verified card is worth exactly 1/MIN_CARDS');
}

// ── Test 3. Zero focus and zero recall must stay low ──
{
  const ex = exam(2);
  const ticked = [0, 1].map(c => sess(c, true, 0));
  const s = E.readiness(ex, ticked, today);
  assert.ok(s <= Math.round(E.WEAK_CEILING * 100), `ticking alone must stay at or under the weak ceiling, got ${s}%`);
  console.log(`  ticked only, no focus, no recall: ${s}%`);
}

// ── Test 4. Repeated taps on a few cards cannot manufacture evidence ──
// The exact exploit found in the audit: four chapters, one card each, grade "knew it", nothing else.
{
  const ex = exam(4);
  let cards = ex.chapters.map((_, i) => R.newCard('e1', i, 'q', 'a', 'c' + i, today));
  const derive = (cs, at) => ({
    ...ex,
    recall: Object.fromEntries(ex.chapters.map((_, i) => {
      const score = R.chapterRecall(cs, 'e1', i);
      return score === undefined ? [i, undefined] : [i, { score, at, conf: R.chapterRecallConfidence(cs, 'e1', i) }];
    }).filter(([, v]) => v)),
  });

  // Self-reported: nothing in the typed answer corroborated it.
  cards = cards.map(c => R.review(c, 2, today, ex.date, 'self'));
  const once = E.readiness(derive(cards, today), [], today);
  assert.ok(once <= 20, `eight taps with no study must not produce real evidence, got ${once}%`);

  // Keep tapping for a week.
  let day = today;
  for (let k = 0; k < 7; k++) { day = E.addDays(day, 1); cards = cards.map(c => (c.due <= day ? R.review(c, 2, day, ex.date, 'self') : c)); }
  const persistent = E.readiness(derive(cards, day), [], day);
  assert.ok(persistent <= 25, `a week of tapping must not produce real evidence, got ${persistent}%`);
  console.log(`  4 cards, tap-only: ${once}% after one pass, ${persistent}% after a week (was 66% and 83%)`);
}

// ── Test 5. Migration: q = 0 reproduces the old study-evidence behaviour exactly ──
// The old formula, transcribed from git history, for a student with no recall at all.
{
  const old = (cov, eff, decay) => cov * (E.WEAK_CEILING + (E.EFFORT_CEILING - E.WEAK_CEILING) * eff) * decay;
  for (const [n, doneCount, focused] of [[2, 2, 40], [2, 1, 40], [4, 4, 0], [4, 2, 20], [3, 3, 13]]) {
    const ex = exam(n);
    const ss = ex.chapters.map((_, c) => sess(c, c < doneCount, c < doneCount ? focused : 0));
    const d = E.readinessDetail(ex, ss, today);
    const expectedBase = ex.chapters.reduce((a, _, c) => {
      const isDone = c < doneCount;
      return a + old(isDone ? 1 : 0, isDone ? Math.min(1, focused / 40) : 0, 1);
    }, 0) / n;
    assert.equal(d.score, Math.min(100, Math.round(expectedBase * 92)), `q=0 must reproduce the old score for ${n} chapters / ${doneCount} done / ${focused} min`);
    assert.ok(d.chapters.every(c => c.conf === 0), 'no recall entry must give conf 0');
  }
  console.log('  migration: a student with no cards scores identically to before Phase 1');
}

// ── Test 6. Recall-only evidence decays ──
{
  const ex = withRecall(exam(1), 0.85, 1);
  const at0 = E.readinessDetail(ex, [], today).chapters[0];
  const at60 = E.readinessDetail(ex, [], E.addDays(today, 60)).chapters[0];
  const at120 = E.readinessDetail(ex, [], E.addDays(today, 120)).chapters[0];
  assert.equal(at0.decay, 1, 'fresh evidence does not decay');
  assert.ok(at60.decay < 1, `recall-only evidence must decay, got ${at60.decay}`);
  assert.ok(at60.decay >= E.DECAY_FLOOR, `decay must not fall below the floor, got ${at60.decay}`);
  assert.equal(at120.decay, E.DECAY_FLOOR, 'decay settles on the floor');
  assert.ok(at120.score < at0.score, 'an abandoned chapter must be worth less than a fresh one');
  console.log(`  recall-only decay: ${at0.decay.toFixed(3)} → ${at60.decay.toFixed(3)} → ${at120.decay.toFixed(3)} (was 1.000 forever)`);
}

// ── Test 7. An exam that is over has no due cards ──
{
  const date = E.addDays(today, 2);
  const c = R.newCard('e1', 0, 'q', 'a', 'c1', today);
  assert.equal(R.examPhase(date, today), 'before');
  assert.equal(R.examPhase(date, date), 'day');
  assert.equal(R.examPhase(date, E.addDays(date, 1)), 'after');

  assert.equal(R.dueCards([c], 'e1', today, 20, date).length, 1, 'before the exam the card is due');
  assert.equal(R.dueCards([c], 'e1', date, 20, date).length, 1, 'on exam day the card is still due');
  assert.equal(R.dueCards([c], 'e1', E.addDays(date, 1), 20, date).length, 0, 'after the exam nothing is due');
  assert.equal(R.recallStats([c], 'e1', E.addDays(date, 1), date).due, 0, 'stats agree with the due list');
  assert.equal(R.recallStats([c], 'e1', E.addDays(date, 1), date).total, 1, 'the card itself is kept, not deleted');
}

// ── Test 8. Mastery never reaches 1 ──
{
  let c = R.newCard('e1', 0, 'q', 'a', 'c1', today);
  assert.equal(R.mastery(c), undefined, 'an unattempted card has no mastery');
  const seen = [];
  let day = today;
  for (let reps = 0; reps <= 6; reps++) {
    c = R.review(c, 2, day, undefined, 'verified');
    const m = R.mastery(c);
    seen.push(m);
    assert.ok(m <= R.MASTERY_MAX, `mastery must stay at or under ${R.MASTERY_MAX}, got ${m} at reps ${c.reps}`);
    assert.ok(m < 1, `mastery must never be 1, got ${m} at reps ${c.reps}`);
    day = c.due;
  }
  assert.ok(R.mastery(R.review(R.newCard('e1', 0, 'q', 'a', 'x', today), 0, today)) < R.mastery(R.review(R.newCard('e1', 0, 'q', 'a', 'y', today), 1, today)));
  console.log(`  mastery by reps: ${seen.map(m => m.toFixed(2)).join(' ')} (cap ${R.MASTERY_MAX})`);
}

// ── Self-reported "knew it" is scored as "almost" ──
{
  const base = R.newCard('e1', 0, 'q', 'a', 'c1', today);
  const claimed = R.review(base, 2, today, undefined, 'self');
  const proved = R.review(base, 2, today, undefined, 'verified');
  assert.equal(claimed.lastGrade, 2, 'the student keeps the grade they chose');
  assert.equal(claimed.scoredGrade, 1, 'an uncorroborated "knew it" is scored as "almost"');
  assert.ok(R.mastery(claimed) < R.mastery(proved), 'self-reported evidence is worth less than corroborated');
  assert.equal(R.chapterRecallConfidence([claimed], 'e1', 0), R.SELF_WEIGHT / R.MIN_CARDS, 'a self card carries half weight');
}

// ── The explainer never promises less than the score it explains ──
{
  for (const r of [0.1, 0.45, 0.5, 0.85]) {
    for (const focused of [0, 20, 40]) {
      const ex = withRecall(exam(2), r, 1);
      const ss = [0, 1].map(c => sess(c, true, focused));
      const d = E.readinessDetail(ex, ss, today);
      assert.ok(d.ceiling >= d.score, `ceiling ${d.ceiling} must not sit below score ${d.score} (r=${r}, focused=${focused})`);
    }
  }
}

console.log('all evidence-integrity checks passed');
