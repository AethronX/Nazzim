// Next-Evidence guard: the ranker must pick the chapter that needs evidence most, across every upcoming exam.
//
// The old implementation walked a fixed ladder with `Array.find`, so it returned the FIRST chapter matching
// a condition — by array index. Executed against a chapter the student had just failed to recall (0.15)
// sitting next to one they knew (0.80), it sent them to the untested chapter in between. Index is not need.
require('./register-ts.js');
const assert = require('node:assert');
const E = require('../src/lib/exams.ts');
const R = require('../src/lib/readiness.ts');
const RC = require('../src/engine/recall.ts');

const today = '2026-10-03';
const exam = (id, inDays, n) => ({ id, subject: id, date: E.addDays(today, inDays), chapters: Array.from({ length: n }, (_, i) => `${id}c${i}`) });
// Fully studied and focused, so coverage and effort are out of the way and recall decides.
const worked = (examId, n) => Array.from({ length: n }, (_, i) => ({ id: `${examId}s${i}`, examId, chapter: i, kind: 'learn', date: today, done: true, doneAt: today, minutes: 40, focusedMin: 40 }));
// Cards that put a chapter's recall at a given level, with full breadth so q = 1.
//
// `due: today` models the student opening the app on the day the cards come back round, which is when a
// re-test is actually available. The ranker will not offer a self-test with nothing due — the live
// walkthrough caught Today saying "self-test Probability" while the recall screen had nothing to show.
const cardsAt = (examId, chapter, score, due = today) => {
  const grade = score < 0.3 ? 0 : score < 0.6 ? 1 : 2;
  return [0, 1, 2].map(k => ({
    ...RC.review(RC.newCard(examId, chapter, 'q', 'a', `${examId}-${chapter}-${k}`, today), grade, today, undefined, 'verified'),
    due,
  }));
};

// ── Case A: three chapters, recall 0.15 / 0.70 / 0.80 → the 0.15 one ──
{
  const ex = exam('A', 10, 3);
  const cards = [...cardsAt('A', 0, 0.15), ...cardsAt('A', 1, 0.7), ...cardsAt('A', 2, 0.8)];
  const t = R.nextEvidence([ex], worked('A', 3), cards, today);
  assert.ok(t, 'a gap must be found');
  assert.equal(t.chapter, 0, `expected chapter 0 (weakest), got ${t.chapter}`);
}

// ── Case B: chapter 0 strong, chapter 1 weak → the weak one, despite its index ──
{
  const ex = exam('B', 10, 2);
  const cards = [...cardsAt('B', 0, 0.8), ...cardsAt('B', 1, 0.2)];
  const t = R.nextEvidence([ex], worked('B', 2), cards, today);
  assert.equal(t.chapter, 1, `index must not win: expected chapter 1, got ${t.chapter}`);
}

// ── Case C: a weak chapter on a far exam vs a middling one on a near exam ──
// The rule is stated, not accidental: proximity scales the rank by 0.5…1, so the far chapter must need
// proportionally more to win. Both ends of the crossover are pinned here.
{
  const near = exam('NEAR', 2, 2);
  const far = exam('FAR', 30, 2);
  const sessions = [...worked('NEAR', 2), ...worked('FAR', 2)];

  // Middling near (0.70 recall → still under RECALL_TARGET? no: 0.7 is the target, so use 0.65) vs weak far.
  const midNear = [...cardsAt('NEAR', 0, 0.45), ...cardsAt('NEAR', 1, 0.8)];
  const weakFar = [...cardsAt('FAR', 0, 0.15), ...cardsAt('FAR', 1, 0.8)];
  const t = R.nextEvidence([near, far], sessions, [...midNear, ...weakFar], today);
  assert.ok(t, 'a gap must be found across two exams');
  const ranked = R.rankEvidence([near, far], sessions, [...midNear, ...weakFar], today);
  assert.ok(ranked.some(x => x.examId === 'NEAR') && ranked.some(x => x.examId === 'FAR'), 'both upcoming exams must be ranked');
  // THE STATED RULE: an exam inside IMMINENT_DAYS comes first, even when a far chapter scores higher on
  // need × gain. By raw rank the far chapter here wins by more than five times; the tier overrides it.
  assert.equal(t.examId, 'NEAR', 'an exam in two days outranks one in thirty, whatever the raw rank says');
  const nearRank = ranked.find(x => x.examId === 'NEAR').rank;
  const farRank = ranked.find(x => x.examId === 'FAR').rank;
  assert.ok(farRank > nearRank, 'the fixture must actually have the far chapter ahead on raw rank');
  assert.ok(ranked[0].imminent && !ranked[ranked.length - 1].imminent, 'imminent targets sort to the front');
  console.log(`  case C → ${t.examId} ch${t.chapter} (${t.kind}); raw ranks near ${nearRank.toFixed(4)} < far ${farRank.toFixed(4)}, tier wins`);

  // Urgency must be monotonic: the same gap on a nearer exam always ranks at least as high.
  const a = R.rankEvidence([exam('X', 2, 1)], worked('X', 1), cardsAt('X', 0, 0.2), today)[0];
  const b = R.rankEvidence([exam('X', 30, 1)], worked('X', 1), cardsAt('X', 0, 0.2), today)[0];
  assert.ok(a.rank > b.rank, `the same gap must rank higher when the exam is nearer: ${a.rank} vs ${b.rank}`);
}

// ── A big exam must not lose to a small one on chapter count alone ──
// `weight = 1/chapterCount` would have made this fail: 12 chapters tomorrow would rank below 2 chapters
// in ten days. The chapter count is deliberately not in the formula.
{
  const big = exam('BIG', 1, 12);
  const small = exam('SMALL', 10, 2);
  const sessions = [...worked('BIG', 12), ...worked('SMALL', 2)];
  const cards = [...cardsAt('BIG', 0, 0.2), ...cardsAt('SMALL', 0, 0.2)];
  const t = R.nextEvidence([big, small], sessions, cards, today);
  assert.equal(t.examId, 'BIG', `the exam tomorrow must win over one ten days out, got ${t.examId}`);
}

// ── The action ladder: you cannot self-test what you have not studied ──
{
  const ex = exam('L', 8, 3);
  // ch0 untouched, ch1 ticked with no focus, ch2 fully worked and untested
  const sessions = [
    { id: 'l1', examId: 'L', chapter: 1, kind: 'learn', date: today, done: true, doneAt: today, minutes: 40, focusedMin: 0 },
    { id: 'l2', examId: 'L', chapter: 2, kind: 'learn', date: today, done: true, doneAt: today, minutes: 40, focusedMin: 40 },
    { id: 'l0', examId: 'L', chapter: 0, kind: 'learn', date: today, done: false, minutes: 40 },
  ];
  const kinds = Object.fromEntries(R.rankEvidence([ex], sessions, [], today).map(t => [t.chapter, t.kind]));
  assert.equal(kinds[0], 'study', 'an untouched chapter is studied, never self-tested first');
  assert.equal(kinds[1], 'focus', 'a ticked chapter with no app focus needs focus');
  assert.equal(kinds[2], 'recall', 'a worked, untested chapter needs a self-test');
}

// ── A self-test is not offered when nothing is due ──
{
  const ex = exam('Q', 8, 2);
  const sessions = worked('Q', 2);
  const later = E.addDays(today, 3);
  const notDue = [...cardsAt('Q', 0, 0.2, later), ...cardsAt('Q', 1, 0.8, later)];
  const ranked = R.rankEvidence([ex], sessions, notDue, today);
  assert.ok(ranked.every(t => t.kind !== 'recall'), 'no self-test may be suggested while every card is scheduled for later');
  const due = [...cardsAt('Q', 0, 0.2, today), ...cardsAt('Q', 1, 0.8, later)];
  const withDue = R.rankEvidence([ex], sessions, due, today);
  assert.equal(withDue[0].kind, 'recall', 'once a card is due, the self-test is the move');
  assert.equal(withDue[0].chapter, 0);
}

// ── Every suggestion must actually move the number ──
{
  const ex = exam('G', 6, 3);
  for (const t of R.rankEvidence([ex], worked('G', 3), [], today)) {
    assert.ok(t.gain > 0, `${t.kind} on chapter ${t.chapter} was suggested with no evidence gain`);
  }
}

// ── A finished exam is not ranked, and a complete one offers the mock ──
{
  const past = exam('P', -2, 2);
  assert.equal(R.rankEvidence([past], worked('P', 2), [], today).length, 0, 'an exam already sat offers nothing');

  const done = exam('D', 5, 1);
  const cards = cardsAt('D', 0, 0.8);
  const sessions = worked('D', 1);
  const ranked = R.rankEvidence([done], sessions, cards, today);
  assert.ok(ranked.every(t => t.kind !== 'study' && t.kind !== 'focus'), 'studied and focused chapters are not re-offered');
  if (ranked.length) assert.ok(['recall', 'mock'].includes(ranked[0].kind));
}

// ── No exams at all ──
assert.equal(R.nextEvidence([], [], [], today), null, 'nothing to be ready for → no target');

// ── The single source agrees with itself ──
{
  const ex = exam('S', 7, 2);
  const sessions = worked('S', 2);
  const cards = cardsAt('S', 0, 0.8);
  const a = R.evidenceScore(ex, sessions, cards, today);
  const b = R.evidenceDetail(ex, sessions, cards, today).score;
  const c = E.readinessDetail(R.withEvidence([ex], cards)[0], sessions, today).score;
  assert.equal(a, b, 'evidenceScore and evidenceDetail must agree');
  assert.equal(b, c, 'the detail must be the raw model applied to the derived exam');
  assert.ok(R.overallEvidence([ex], sessions, cards, today) >= 0);
  assert.equal(R.overallEvidence([], sessions, cards, today), undefined, 'no upcoming exam → no overall number');
}

console.log('all next-evidence checks passed');
