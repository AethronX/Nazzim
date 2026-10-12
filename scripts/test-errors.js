// Error-log guard: classification, repeat tracking, re-test scheduling, and the pattern report.
require('./register-ts.js');
const assert = require('node:assert');
const X = require('../src/engine/errors.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-12';
let n = 0;
const mk = (kind, o = {}) => ({ ...X.newError('s', 'Q' + ++n, kind, today, 'e' + n), ...o });

// ── A new mistake schedules its own re-test ──────────────────────────────────────────────────────
{
  const e = X.newError('s', '  Why is the median robust?  ', 'concept', today, 'e0');
  assert.equal(e.question, 'Why is the median robust?');
  assert.equal(e.repeats, 0);
  assert.equal(e.resolved, false);
  assert.equal(e.retryOn, E.addDays(today, X.RETRY_GAP), 're-test scheduled, not left to memory');
}

// ── Repeating pulls it closer; resolving clears it but keeps the history ─────────────────────────
{
  let e = X.newError('s', 'q', 'formula', today, 'e1');
  e = X.repeated(e, today);
  assert.equal(e.repeats, 1);
  assert.equal(e.retryOn, E.addDays(today, X.REPEAT_GAP), 'a repeat comes back sooner');
  e = X.repeated(e, today);
  assert.equal(e.repeats, 2, 'repeats accumulate');
  const r = X.resolve(e);
  assert.equal(r.resolved, true);
  assert.equal(r.retryOn, undefined, 'resolved mistakes leave the queue');
  assert.equal(r.repeats, 2, 'history is kept — it is why the topic is fragile');
}

// ── Due queue: only unresolved and due, most-repeated first ──────────────────────────────────────
{
  const list = [
    mk('concept', { id: 'later', retryOn: E.addDays(today, 3) }),
    mk('calculation', { id: 'chronic', retryOn: today, repeats: 3 }),
    mk('rushing', { id: 'onceOff', retryOn: E.addDays(today, -1), repeats: 0 }),
    mk('concept', { id: 'fixed', retryOn: today, resolved: true }),
  ];
  const due = X.dueErrors(list, today).map(e => e.id);
  assert.deepEqual(due, ['chronic', 'onceOff'], 'chronic first, resolved and future excluded');
}

// ── The pattern report: which kind of mistake costs most ─────────────────────────────────────────
{
  const list = [
    mk('calculation', { repeats: 3 }),
    mk('calculation', { repeats: 1 }),
    mk('concept', { repeats: 0 }),
    mk('concept', { repeats: 0 }),
    mk('concept', { repeats: 0 }),
  ];
  const kinds = X.byKind(list);
  assert.equal(kinds[0].kind, 'calculation', 'ranked by repeats, not raw count');
  assert.equal(kinds[0].count, 2);
  assert.equal(kinds[0].repeats, 4);
  assert.equal(kinds[1].kind, 'concept');
  assert.equal(kinds.length, 2, 'kinds with no errors are not listed');
}

// ── Summary measures improvement, not hours ──────────────────────────────────────────────────────
{
  const list = [
    mk('concept', { resolved: true }),
    mk('concept', { resolved: true }),
    mk('rushing', { repeats: 2, retryOn: today }),
    mk('formula', { retryOn: E.addDays(today, 5) }),
  ];
  const s = X.summarize(list, today);
  assert.equal(s.total, 4);
  assert.equal(s.resolved, 2);
  assert.equal(s.open, 2);
  assert.equal(s.due, 1, 'only the one due today');
  assert.equal(s.chronic, 1, 'repeats ≥ 2 is a pattern');
  assert.ok(Math.abs(s.resolvedRate - 0.5) < 0.001);
  assert.ok(X.ERROR_KINDS.includes(s.topKind));
  // An empty log must not divide by zero.
  const empty = X.summarize([], today);
  assert.equal(empty.resolvedRate, 0);
  assert.equal(empty.topKind, null);
}

// ── Scoping by subject ───────────────────────────────────────────────────────────────────────────
{
  const list = [mk('concept'), { ...mk('formula'), subjectId: 'other' }];
  assert.equal(X.summarize(list, today, 's').total, 1, 'subject scope filters the log');
}

console.log('all error-log checks passed');
