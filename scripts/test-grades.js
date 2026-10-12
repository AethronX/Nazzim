// Grade engine guard: the load-bearing calculator. Every mandated edge case from the A-level OS spec.
require('./register-ts.js');
const assert = require('node:assert');
const G = require('../src/engine/grades.ts');

const A = (o) => ({ id: o.id || 'a', subjectId: 's', name: o.name || 'x', weight: o.weight, status: o.status || 'upcoming', source: o.source || 'official', maxScore: o.maxScore, score: o.score });
const graded = (weight, score, maxScore, o = {}) => A({ weight, score, maxScore, status: 'graded', ...o });
const pending = (weight, o = {}) => A({ weight, status: 'upcoming', ...o });
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < 0.02, `${msg}: expected ${b}, got ${a}`);

// ── Contribution: a single graded assessment's points toward the final ──────────────────────────
{
  // The real STAT2101 case: 8/15 on an in-class-quiz block worth 15% → 8/15 * 15 = 8.0 points of 100.
  near(G.contribution(graded(15, 8, 15)), 8.0, 'STAT quiz contribution');
  near(G.contribution(graded(25, 20, 25)), 20, 'full weight at 80%'); // 20/25*25
  assert.equal(G.contribution(pending(25)), 0, 'ungraded contributes nothing');
  // 53.33% raw is NOT the course grade — it is 8 points out of a 100-point course.
  const only = G.computeGrade([graded(15, 8, 15)], 90);
  near(only.currentOfGraded, 53.33, 'average of graded is 53.33%');
  near(only.earned, 8.0, 'earned points so far is 8, not 53');
  assert.notEqual(Math.round(only.earned), 53, 'must not treat raw % as the course grade');
}

// ── STAT2101: full known distribution sums to 100 → forecastable ─────────────────────────────────
{
  const stat = [
    graded(15, 8, 15, { id: 'q1', name: 'Quiz 1' }), // 8 pts banked
    pending(10, { name: 'Lab quizzes' }),
    pending(25, { name: 'Midterm' }),
    pending(5, { name: 'Active learning' }),
    pending(45, { name: 'Final' }),
  ];
  const g = G.computeGrade(stat, 90);
  assert.equal(g.dataStatus, 'complete', 'weights sum to 100');
  near(g.knownWeight, 100, 'known weight');
  near(g.completedWeight, 15, 'completed weight');
  near(g.remainingWeight, 85, 'remaining weight');
  near(g.earned, 8, 'earned');
  near(g.maxPossible, 93, 'max possible final = 8 + 85');
  // R = (90 − 8) / 85 * 100 = 96.47 — needs a big push but still possible.
  near(g.required, 96.47, 'required average on remaining');
  assert.equal(g.verdict, 'needsPush');
}

// ── R edge cases (the spec's four branches) ──────────────────────────────────────────────────────
{
  // secured: already banked enough that zero on the rest still clears target.
  const secured = G.computeGrade([graded(80, 80, 80), pending(20)], 70);
  assert.equal(secured.verdict, 'secured');
  assert.ok(secured.required <= 0, 'R ≤ 0 when target already reached');

  // impossible: target cannot be reached even with full marks remaining.
  const imp = G.computeGrade([graded(50, 10, 50), pending(50)], 90); // earned 10, need 80 on 50 → R=160
  assert.equal(imp.verdict, 'impossible');
  assert.ok(imp.required > 100, 'R > 100 is impossible');
  near(imp.maxPossible, 60, 'max possible = 10 + 50');

  // needsPush vs onTrack boundary.
  const onTrack = G.computeGrade([graded(50, 45, 50), pending(50)], 90); // current 90%, need (90-45)/50*100=90 ≤ 90
  assert.equal(onTrack.verdict, 'onTrack');

  // Wr = 0: nothing remains, grade is fixed — never divide by zero.
  const doneG = G.computeGrade([graded(50, 45, 50), graded(50, 50, 50)], 90); // earned 45+50=95
  assert.equal(doneG.verdict, 'done');
  assert.equal(doneG.required, null, 'no required value when nothing remains');
  near(doneG.earned, 95, 'final is fixed at earned');
  near(doneG.maxPossible, 95, 'max equals earned when done');
}

// ── Full marks and zero ──────────────────────────────────────────────────────────────────────────
{
  const perfect = G.computeGrade([graded(40, 40, 40), pending(60)], 90);
  near(perfect.currentOfGraded, 100, 'perfect so far');
  near(perfect.required, 83.33, '(90-40)/60*100');
  const zero = G.computeGrade([graded(40, 0, 40), pending(60)], 90);
  near(zero.earned, 0, 'zero earns zero');
  assert.equal(zero.verdict, 'impossible', '90 on 60 remaining weight is impossible'); // (90-0)/60*100=150
}

// ── ERSC2101: 90% known + a real 10% unconfirmed block → must NOT forecast, must NOT spread the 10% ──
{
  const ersc = [
    graded(2.5, 9, 10, { name: 'Quiz 1' }),
    pending(20, { name: 'Midterm' }),
    pending(2.5, { name: 'Quiz 2' }),
    pending(20, { name: 'Lab exam' }),
    pending(45, { name: 'Final' }),
    A({ id: 'u', name: 'Unconfirmed component', weight: 10, status: 'upcoming', source: 'unconfirmed' }),
  ];
  const g = G.computeGrade(ersc, 90);
  near(g.knownWeight, 100, 'known weight includes the unconfirmed block, not spread away');
  near(g.unconfirmedWeight, 10, 'the 10% is tracked as unconfirmed');
  assert.equal(g.dataStatus, 'incomplete', 'unconfirmed weight blocks a clean forecast');
  assert.equal(g.reason, 'unconfirmedWeight');
  assert.equal(g.verdict, 'needData', 'no misleading R while 10% is unconfirmed');
  assert.equal(g.required, null);
}

// ── SOCY1005 / ECCE2000: weights not entered at all → incomplete, no forecast ────────────────────
{
  const socy = [A({ id: 'f', name: 'Final', weight: 0, status: 'upcoming', source: 'unconfirmed' })];
  const g = G.computeGrade(socy, 90);
  assert.equal(g.dataStatus, 'incomplete', 'missing weight → incomplete');
  assert.equal(g.reason, 'missingWeight');
  assert.equal(g.verdict, 'needData');
  near(g.missingWeight, 100, 'the whole 100% is still unknown');
}

// ── Conflict: weights sum above 100 ──────────────────────────────────────────────────────────────
{
  const bad = G.computeGrade([graded(60, 30, 60), pending(60)], 90); // 120 total
  assert.equal(bad.dataStatus, 'conflict');
  assert.equal(bad.reason, 'weightsOver100');
  assert.equal(bad.verdict, 'needData');
}

// ── Target is configurable (A is not always 90) ──────────────────────────────────────────────────
{
  const a85 = G.computeGrade([graded(50, 40, 50), pending(50)], 85); // earned 40, need (85-40)/50*100=90
  near(a85.required, 90, 'target 85 changes the requirement');
  const a95 = G.computeGrade([graded(50, 40, 50), pending(50)], 95);
  assert.equal(a95.verdict, 'impossible', 'target 95 needs 110 on remaining');
}

// ── "What do I need on the next assessment?" ─────────────────────────────────────────────────────
{
  const stat = [graded(15, 8, 15), pending(10), pending(25), pending(5), pending(45)];
  // Holding other remaining work at the current 53.33% average, what must the Midterm (25%) score?
  const r = G.requiredOn(stat, 25, 90);
  assert.ok(r !== null && r > 100, 'reaching A needs more than full marks on the midterm alone at current form');
  // If the rest is assumed at 100%, the midterm requirement drops.
  const r2 = G.requiredOn(stat, 25, 90, 100);
  assert.ok(r2 !== null && r2 < r, 'assuming stronger other results lowers the midterm bar');
  // No answer when data is not forecastable.
  const bad = G.requiredOn([A({ weight: 0, source: 'unconfirmed', status: 'upcoming' })], 25, 90);
  assert.equal(bad, null, 'no what-if on incomplete data');
}

console.log('all grade-engine checks passed');
