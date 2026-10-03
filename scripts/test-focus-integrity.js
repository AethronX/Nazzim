// Focus-integrity guard.
//
// `focusedMin` raises a chapter's evidence ceiling from 0.35 to 0.70, which makes it the second way to
// inflate the number after the recall path. It used to be the wall-clock span of the session: starting a
// 40-minute block and putting the phone face down credited all 40 minutes. What the app can actually
// observe is how long it was in the FOREGROUND, and that is all it now credits — and all the copy claims.
//
// The accounting lives in the store (React state + an AppState listener), so these checks model it exactly
// and assert the arithmetic, including the parts a device test could not reach deterministically.
require('./register-ts.js');
const assert = require('node:assert');
const E = require('../src/lib/exams.ts');

// A faithful model of the store's timer accounting: see `creditedMinutes` and the AppState listener there.
function session(totalMin) {
  let t = { total: totalMin * 60, running: true, activeMs: 0, activeSince: 0, now: 0 };
  return {
    advance(ms) { t.now += ms; return this; },
    background() { if (t.activeSince !== null) { t.activeMs += t.now - t.activeSince; t.activeSince = null; } return this; },
    foreground() { if (t.activeSince === null) t.activeSince = t.now; return this; },
    credited() {
      const ms = t.activeMs + (t.activeSince !== null ? t.now - t.activeSince : 0);
      return Math.min(Math.round(t.total / 60), Math.max(0, Math.round(ms / 60000)));
    },
  };
}

// ── Foreground throughout: the full block is credited ──
assert.equal(session(25).advance(25 * 60_000).credited(), 25);

// ── Backgrounded for the whole block: nothing is credited ──
{
  const s = session(25).background().advance(25 * 60_000);
  assert.equal(s.credited(), 0, 'a session the student was never present for credits no minutes');
}

// ── Backgrounded for part of it: only the foreground part counts ──
{
  const s = session(40)
    .advance(10 * 60_000) // 10 min present
    .background()
    .advance(25 * 60_000) // 25 min away — must not count
    .foreground()
    .advance(5 * 60_000); // 5 min back
  assert.equal(s.credited(), 15, `expected 15 credited minutes, got ${s.credited()}`);
}

// ── Repeated switching accumulates correctly and never exceeds the plan ──
{
  const s = session(30);
  for (let i = 0; i < 6; i++) s.advance(60_000).background().advance(4 * 60_000).foreground();
  assert.equal(s.credited(), 6, 'six one-minute foreground stretches credit six minutes');

  const over = session(10).advance(60 * 60_000);
  assert.equal(over.credited(), 10, 'credit is capped at the block’s planned length');
}

// ── And the cap is what the evidence model relies on ──
{
  const exam = { id: 'e1', subject: 'S', date: E.addDays('2026-10-03', 9), chapters: ['a'] };
  const block = (focused) => [{ id: 's0', examId: 'e1', chapter: 0, kind: 'learn', date: '2026-10-03', done: true, doneAt: '2026-10-03', minutes: 40, focusedMin: focused }];

  const away = E.readiness(exam, block(0), '2026-10-03');
  const half = E.readiness(exam, block(20), '2026-10-03');
  const present = E.readiness(exam, block(40), '2026-10-03');
  assert.ok(away < half && half < present, `credited minutes must move the number: ${away} / ${half} / ${present}`);
  assert.ok(away <= Math.round(E.WEAK_CEILING * 100), `no credited focus must not pass the weak ceiling, got ${away}%`);
  console.log(`  credited focus → evidence: 0 min ${away}% · 20 min ${half}% · 40 min ${present}%`);

  // The decisive case: backgrounding the whole session must land on the same number as not focusing at all.
  const s = session(40).background().advance(40 * 60_000);
  assert.equal(E.readiness(exam, block(s.credited()), '2026-10-03'), away, 'a backgrounded session is worth exactly a tick');
}

console.log('all focus-integrity checks passed');
