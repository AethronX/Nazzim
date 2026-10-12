// Wellbeing guard: counting only, no diagnosis, no "more is better", no causal claims.
require('./register-ts.js');
const assert = require('node:assert');
const W = require('../src/engine/wellbeing.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-12';
const at = (back, o) => [E.addDays(today, -back), { date: E.addDays(today, -back), ...o }];

// ── A day counts as logged if anything was recorded — a rest day included ────────────────────────
{
  assert.equal(W.isLogged(undefined), false);
  assert.equal(W.isLogged({ date: today }), false, 'an empty day is not a logged day');
  assert.equal(W.isLogged({ date: today, restDay: true }), true, 'a deliberate rest day is a success, not a gap');
  assert.equal(W.isLogged({ date: today, sleepHours: 7 }), true, 'one field is enough — logging must be cheap');
}

// ── Week summary counts; it does not grade ──────────────────────────────────────────────────────
{
  const logs = Object.fromEntries([
    at(0, { sleepHours: 7, water: 2.5, runMinutes: 30, energy: 3 }),
    at(1, { sleepHours: 6, water: 2, liftMinutes: 45, energy: 2 }),
    at(2, { restDay: true }),
    at(3, { sleepHours: 8, water: 3, energy: 3 }),
  ]);
  const s = W.weekSummary(logs, today);
  assert.equal(s.loggedDays, 4);
  assert.equal(s.trainingDays, 2, 'days with any movement');
  assert.equal(s.restDays, 1);
  assert.equal(s.movementMinutes, 75);
  assert.ok(Math.abs(s.sleepAvg - 7) < 0.01, 'sleep averaged over the days that have it');
  assert.ok(Math.abs(s.waterAvg - 2.5) < 0.01);
  // Nothing in the summary ranks a student or declares a target met.
  assert.equal(Object.prototype.hasOwnProperty.call(s, 'score'), false, 'no wellbeing score exists');
  assert.equal(Object.prototype.hasOwnProperty.call(s, 'goalMet'), false);
}

// ── Empty input must not divide by zero or invent averages ──────────────────────────────────────
{
  const s = W.weekSummary({}, today);
  assert.equal(s.loggedDays, 0);
  assert.equal(s.sleepAvg, undefined, 'no data means no average, not zero');
  assert.equal(s.energyAvg, undefined);
  assert.equal(s.movementMinutes, 0);
}

// ── Observations stay silent without enough paired data ─────────────────────────────────────────
{
  assert.equal(W.observeSleepVsFocus({}, today), null, 'no data, no story');
  const thin = Object.fromEntries([at(0, { sleepHours: 8, focusFelt: 3 }), at(1, { sleepHours: 5, focusFelt: 1 })]);
  assert.equal(W.observeSleepVsFocus(thin, today), null, 'two days is not a pattern');

  const rich = Object.fromEntries([
    at(0, { sleepHours: 8, focusFelt: 3 }), at(1, { sleepHours: 8.5, focusFelt: 3 }), at(2, { sleepHours: 7.5, focusFelt: 3 }),
    at(3, { sleepHours: 5, focusFelt: 1 }), at(4, { sleepHours: 5.5, focusFelt: 1 }), at(5, { sleepHours: 4.5, focusFelt: 2 }),
  ]);
  const o = W.observeSleepVsFocus(rich, today);
  assert.ok(o && o.kind === 'sleepFocus', 'with enough pairs it reports the timing');
  assert.ok(o.betterAfter > o.worseAfter);

  // A flat pattern is reported as nothing rather than as a weak finding.
  const flat = Object.fromEntries([
    at(0, { sleepHours: 8, focusFelt: 2 }), at(1, { sleepHours: 8, focusFelt: 2 }), at(2, { sleepHours: 7, focusFelt: 2 }),
    at(3, { sleepHours: 5, focusFelt: 2 }), at(4, { sleepHours: 5, focusFelt: 2 }), at(5, { sleepHours: 6, focusFelt: 2 }),
  ]);
  assert.equal(W.observeSleepVsFocus(flat, today), null, 'no difference means no claim');
}

// ── Editing a day clears what the student cleared ───────────────────────────────────────────────
{
  const d = W.patchDay({ date: today, sleepHours: 7, water: 2 }, today, { water: undefined, energy: 3 });
  assert.equal(d.sleepHours, 7, 'untouched fields survive');
  assert.equal('water' in d, false, 'a cleared field is removed, not zeroed');
  assert.equal(d.energy, 3);
  assert.equal(d.date, today);
}

console.log('all wellbeing checks passed');
