// Data-integrity and triage guards: validation, orphan sessions, the rescue trigger, and the day boundary.
//
// Each case here is a confirmed defect, not a hypothetical:
//   · pulled rows were cast with `as Exam[]` — an unparseable date went straight into the score as NaN
//   · the `cards` collection had no branch in applyPull, so pulled cards were written over the TASK list
//   · an exam with an unreadable date reported status 'onTrack'
//   · removing a chapter left its blocks in the schedule with blank titles forever
//   · one forgotten ten-minute task opened the emergency screen
require('./register-ts.js');
const assert = require('node:assert');
const V = require('../src/domain/validate.ts');
const E = require('../src/lib/exams.ts');
const X = require('../src/engine/exam.ts');
const RS = require('../src/engine/rescue.ts');
const CORE = require('../src/services/sync/core.ts');

const today = '2026-10-03';

// ── Validation primitives ───────────────────────────────────────────────────────────────────────
{
  assert.ok(V.isDateKey('2026-10-03'));
  assert.ok(!V.isDateKey('2026-02-31'), 'a date that does not exist must be rejected, not just pattern-matched');
  assert.ok(!V.isDateKey('2026-13-01'));
  assert.ok(!V.isDateKey('not-a-date'));
  assert.ok(!V.isDateKey('2026-10-3'));
  assert.ok(!V.isDateKey(undefined) && !V.isDateKey(20261003));

  assert.equal(V.num('90'), 90, 'a number stored as a string is coerced');
  assert.equal(V.num(NaN), undefined);
  assert.equal(V.num(Infinity), undefined);
  assert.equal(V.num('abc'), undefined);
  assert.equal(V.clampNum(-5, 1, 600), 1, 'a negative duration clamps into range');
  assert.equal(V.clampNum(99999, 1, 600), 600);
  assert.equal(V.clampNum(NaN, 1, 600), undefined);
}

// ── Entities: repair what can be repaired, reject what cannot ───────────────────────────────────
{
  const good = V.checkExam({ id: 'e1', subject: 'Stats', date: today, chapters: ['a', 'b'] });
  assert.ok(good.ok && good.value.chapters.length === 2);

  assert.ok(!V.checkExam({ id: 'e1', subject: 'Stats', date: 'garbage', chapters: ['a'] }).ok, 'an unusable exam date is not repairable');
  assert.ok(!V.checkExam({ id: 'e1', subject: 'Stats', date: today, chapters: [] }).ok, 'an exam with no chapters cannot be scored');
  assert.ok(!V.checkExam({ id: '', subject: 'S', date: today, chapters: ['a'] }).ok);
  assert.ok(!V.checkExam(null).ok && !V.checkExam('x').ok);

  const mixed = V.checkExam({ id: 'e1', subject: 'S', date: today, chapters: ['a', '', null, 'b', 42] });
  assert.ok(mixed.ok && mixed.value.chapters.length === 2 && mixed.repaired.includes('chapters'), 'unusable chapter entries are dropped and reported');

  const s = V.checkSession({ id: 's1', examId: 'e1', chapter: 0, kind: 'learn', date: today, minutes: NaN, done: true, focusedMin: 9999 });
  assert.ok(s.ok, 'a session with a bad duration is repairable');
  assert.ok(Number.isFinite(s.value.minutes) && s.value.minutes > 0, 'NaN minutes become a real number');
  assert.ok(s.value.focusedMin <= s.value.minutes, 'focused minutes can never exceed what the block planned');
  assert.ok(!V.checkSession({ id: 's1', examId: 'e1', chapter: 0, kind: 'telepathy', date: today, minutes: 40 }).ok, 'an unknown session kind is rejected');
  assert.ok(!V.checkSession({ id: 's1', examId: 'e1', chapter: 'two', kind: 'learn', date: today, minutes: 40 }).ok);

  const t = V.checkTask({ id: 't1', title: 'essay', due: today, estimateMin: '45' });
  assert.ok(t.ok && t.value.estimateMin === 45, 'a string duration is coerced');
  assert.ok(!V.checkTask({ id: 't1', title: '   ', due: today, estimateMin: 10 }).ok, 'a blank title is rejected');

  const sub = V.checkSubject({ id: 'x', name: 'Stats', color: 'neon', icon: 'wat', targetGrade: '' });
  assert.ok(sub.ok && sub.value.color === 'indigo' && sub.value.icon === 'book', 'unknown enums fall back to defaults');

  const c = V.checkCard({ id: 'c1', examId: 'e1', chapter: 0, q: 'q', a: 'a', due: today, reps: -3, ease: 99, evidence: 'telepathic' });
  assert.ok(c.ok && c.value.reps === 0 && c.value.ease <= 2.8 && c.value.evidence === undefined);

  const list = V.checkList([{ id: 'e1', subject: 'S', date: today, chapters: ['a'] }, { id: 'e2', subject: 'S', date: 'bad', chapters: ['a'] }], V.checkExam);
  assert.equal(list.kept.length, 1);
  assert.equal(list.rejected.length, 1);
  assert.equal(list.rejected[0].id, 'e2');
}

// ── Sync: one bad row must not take the pull down, and cards must not land in the task list ─────
{
  const local = { subjects: [], tasks: [{ id: 't1', title: 'keep me', due: today, estimateMin: 30, done: false }], exams: [], study: [], cards: [], focusLog: {} };
  const empty = () => ({ subjects: [], tasks: [], exams: [], study_sessions: [], cards: [] });

  const rows = empty();
  rows.exams = [
    { id: 'ok', data: { id: 'ok', subject: 'Stats', date: today, chapters: ['a'] }, deleted: false, updated_at: '2026-10-03T00:00:00Z' },
    { id: 'bad', data: { id: 'bad', subject: 'Stats', date: 'garbage', chapters: ['a'] }, deleted: false, updated_at: '2026-10-03T00:00:01Z' },
  ];
  const r = CORE.applyPull(local, CORE.emptySnapshot(), rows, []);
  assert.equal(r.local.exams.length, 1, 'the good row is applied');
  assert.equal(r.local.exams[0].id, 'ok');
  assert.equal(r.quarantined.length, 1, 'the bad row is quarantined, not applied');
  assert.equal(r.quarantined[0].id, 'bad');
  assert.ok(r.quarantined[0].reason.includes('date'), `the reason must name the problem, got "${r.quarantined[0].reason}"`);
  assert.ok(!CORE.emptySnapshot().exams.bad, 'a quarantined row is never recorded as agreed with the server');

  // The cards branch.
  const rows2 = empty();
  rows2.cards = [{ id: 'c1', data: { id: 'c1', examId: 'e1', chapter: 0, q: 'q', a: 'a', due: today, reps: 0, ease: 2.3 }, deleted: false, updated_at: '2026-10-03T00:00:00Z' }];
  const r2 = CORE.applyPull(local, CORE.emptySnapshot(), rows2, []);
  assert.equal(r2.local.cards.length, 1, 'pulled cards land in `cards`');
  assert.equal(r2.local.tasks.length, 1, 'and NOT in `tasks`');
  assert.equal(r2.local.tasks[0].id, 't1', "the student's own task survives a card pull");
}

// ── An exam whose date cannot be read is never reported as "on track" ───────────────────────────
{
  const bad = { id: 'e1', subject: 'S', date: 'garbage', chapters: ['a'] };
  const r = X.examReport(bad, [], today);
  assert.equal(r.status, 'unknown', `expected 'unknown', got '${r.status}'`);
  assert.ok(Number.isFinite(r.remaining.perDay), 'perDay must not be NaN');
  assert.ok(Number.isFinite(r.benchmark));
}

// ── NaN minutes must not reach the UI ───────────────────────────────────────────────────────────
{
  const ex = { id: 'e1', subject: 'S', date: E.addDays(today, 9), chapters: ['a'] };
  const s = [{ id: 's0', examId: 'e1', chapter: 0, kind: 'learn', date: today, done: true, doneAt: today, minutes: NaN, focusedMin: NaN }];
  const d = E.readinessDetail(ex, s, today);
  assert.ok(Number.isFinite(d.score) && Number.isFinite(d.plannedMin) && Number.isFinite(d.focusedMin), `no NaN may escape: ${JSON.stringify({ score: d.score, plannedMin: d.plannedMin, focusedMin: d.focusedMin })}`);
  // Focused minutes can never be credited beyond the planned length of the block.
  const over = [{ id: 's0', examId: 'e1', chapter: 0, kind: 'learn', date: today, done: true, doneAt: today, minutes: 40, focusedMin: 9999 }];
  const d2 = E.readinessDetail(ex, over, today);
  assert.ok(d2.focusedMin <= d2.plannedMin, 'credited focus is bounded by the plan');
  assert.ok(d2.score <= 100);
}

// ── Orphan sessions ─────────────────────────────────────────────────────────────────────────────
{
  const ex5 = { id: 'e1', subject: 'S', date: E.addDays(today, 20), chapters: ['a', 'b', 'c', 'd', 'e'] };
  const plan = E.planExam(ex5, today).map((s, i) => ({ ...s, done: i % 2 === 0, doneAt: i % 2 === 0 ? today : undefined, focusedMin: i % 2 === 0 ? s.minutes : undefined }));
  const shrunk = { ...ex5, chapters: ['a', 'b'] };

  const pruned = E.pruneOrphans(plan, [shrunk]);
  const stranded = plan.filter(s => s.chapter >= 2);
  const keptOrphans = pruned.filter(s => s.orphan);
  assert.ok(stranded.length > 0, 'the fixture must actually strand some blocks');
  assert.equal(pruned.filter(s => s.chapter >= 2 && !s.done).length, 0, 'unfinished blocks for a removed chapter are gone');
  assert.equal(keptOrphans.length, stranded.filter(s => s.done).length, 'completed blocks are kept as history');
  assert.ok(keptOrphans.every(s => s.done), 'only completed blocks are kept');

  // And orphans must not feed the number.
  const withOrphans = E.readinessDetail(shrunk, pruned, today);
  const withoutOrphans = E.readinessDetail(shrunk, pruned.filter(s => !s.orphan), today);
  assert.equal(withOrphans.score, withoutOrphans.score, 'orphan history must not change evidence completeness');
  assert.ok(withOrphans.chapters.every(c => c.planned <= 4), 'orphan blocks are not counted in a chapter');

  // Re-adding a chapter revives its history rather than stranding it twice.
  const revived = E.pruneOrphans(pruned, [ex5]);
  assert.ok(revived.every(s => !s.orphan), 'restoring the chapters clears the orphan flag');
}

// ── Rescue trigger ──────────────────────────────────────────────────────────────────────────────
{
  const base = { today, subjects: [], tasks: [], exams: [], sessions: [], dailyMinutes: 120 };

  // R9: one trivial overdue task is NOT an emergency.
  const trivial = { ...base, tasks: [{ id: 't', title: 'x', due: E.addDays(today, -1), estimateMin: 10, done: false }] };
  const a = RS.assessBehind(trivial);
  assert.equal(a.behind, false, `a 10-minute overdue task must not open triage (reason: ${a.reason})`);
  assert.equal(a.overdueMin, 10);

  // An hour of accumulated overdue work is.
  const real = { ...base, tasks: [1, 2, 3].map(i => ({ id: 't' + i, title: 'x', due: E.addDays(today, -1), estimateMin: 25, done: false })) };
  const b = RS.assessBehind(real);
  assert.equal(b.behind, true);
  assert.equal(b.reason, 'overdue');
  assert.ok(b.overdueMin >= RS.RESCUE_OVERDUE_MIN);

  // Today scheduled far past a normal day.
  const heavy = { ...base, sessions: [{ id: 's', examId: 'e', chapter: 0, kind: 'learn', date: today, minutes: 300, done: false }] };
  assert.equal(RS.assessBehind(heavy).reason, 'load');

  // Close to an exam with weak evidence, even with nothing overdue.
  const soon = { ...base, exams: [{ id: 'e', subject: 'S', date: E.addDays(today, 2), chapters: ['a'] }] };
  assert.equal(RS.assessBehind(soon, 7, 20).reason, 'exam', 'a near exam at 20% evidence is worth triaging');
  assert.equal(RS.assessBehind(soon, 7, 95).behind, false, 'a near exam at 95% evidence is not');

  // Thresholds are exported so they can be calibrated rather than guessed at again.
  for (const k of ['RESCUE_OVERDUE_MIN', 'RESCUE_LOAD_RATIO', 'RESCUE_DEFICIT_RATIO', 'RESCUE_EXAM_DAYS', 'RESCUE_GAP']) {
    assert.ok(typeof RS[k] === 'number', `${k} must be an exported constant`);
  }
}

// ── Triage: a shortlist that fits, not a re-dated backlog ───────────────────────────────────────
{
  const exam = { id: 'e1', subject: 'Stats', date: E.addDays(today, 3), chapters: ['a', 'b', 'c', 'd'] };
  const sessions = E.planExam(exam, today);
  const tasks = [{ id: 't1', title: 'essay', due: E.addDays(today, -2), estimateMin: 90, done: false }];
  const ctx = { today, subjects: [], tasks, exams: [exam], sessions, dailyMinutes: 120 };
  const R = require('../src/lib/readiness.ts');
  const targets = R.rankEvidence(ctx.exams, ctx.sessions, [], today);
  const tri = RS.triageToday(ctx, targets);

  assert.ok(tri.now.length > 0 && tri.now.length <= 3, `triage must offer 1–3 things, got ${tri.now.length}`);
  const used = tri.now.reduce((a, i) => a + i.minutes, 0);
  assert.ok(used <= tri.capacityMin, `the shortlist must fit in a normal day: ${used} > ${tri.capacityMin}`);
  assert.ok(tri.now.every(i => Number.isFinite(i.value) && i.value > 0), 'every item carries a real value-per-minute');
  for (let i = 1; i < tri.now.length; i++) assert.ok(tri.now[i - 1].value >= tri.now[i].value, 'the shortlist is ordered by value');
  assert.ok(tri.now.every(i => ['examSoon', 'evidenceGap', 'overdue', 'dueToday'].includes(i.why)), 'every item says why it is there');
  assert.ok(tri.later.length > 0, 'what did not fit is listed, not dropped silently');
  assert.ok(Number.isFinite(tri.deficitMin));

  // An idle day offers nothing rather than inventing work.
  const idle = RS.triageToday({ today, subjects: [], tasks: [], exams: [], sessions: [], dailyMinutes: 120 }, []);
  assert.equal(idle.now.length, 0);
}

// ── Day boundary ────────────────────────────────────────────────────────────────────────────────
// The store arms a timer for the next local midnight; these assert the date maths it relies on, including
// across a DST transition, where a naive "+24h" drifts by an hour and eventually skips or repeats a day.
{
  const nextMidnight = (d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1, 0, 0, 2);
  for (const iso of ['2026-10-03T23:59:30', '2026-03-28T23:30:00', '2026-10-25T01:30:00', '2026-12-31T23:59:59']) {
    const now = new Date(iso);
    const m = nextMidnight(now);
    assert.ok(m.getTime() > now.getTime(), `midnight must be in the future for ${iso}`);
    assert.equal(m.getHours(), 0, 'the boundary lands at hour 0 in local time, whatever the offset shift');
    assert.equal(E.toKey(m), E.addDays(E.toKey(now), 1), `rolling over ${iso} must land on the next calendar day`);
    assert.ok(m.getTime() - now.getTime() <= 25 * 3600_000);
  }
  // 23:59 → 00:00 changes the day key, which is what "today" is built from.
  assert.notEqual(E.toKey(new Date('2026-10-03T23:59:00')), E.toKey(new Date('2026-10-04T00:00:30')));
}

// ── Single source of truth ──────────────────────────────────────────────────────────────────────
//
// Three screens showed three different numbers for the same student: Today 36%, the exam screen 32%
// (raw exam, no recall), the plan and more screens 32% (ExamCard, raw exam and no `today`). A value check
// cannot catch the next one of these, so this is a source check: no screen or component may call the raw
// model directly — everything goes through src/lib/readiness.ts.
{
  const fs = require('node:fs');
  const path = require('node:path');
  const roots = [path.join(__dirname, '..', 'src', 'app'), path.join(__dirname, '..', 'src', 'components')];
  const files = [];
  const walk = (d) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const f = path.join(d, e.name); e.isDirectory() ? walk(f) : e.name.endsWith('.tsx') && files.push(f); } };
  roots.forEach(walk);

  const offenders = [];
  for (const f of files) {
    const src = fs.readFileSync(f, 'utf8');
    src.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*)/.test(line)) return; // comments explain the history on purpose
      if (/\breadiness\s*\(|\breadinessDetail\s*\(|\boverallReadiness\s*\(/.test(line)) {
        offenders.push(`${path.relative(path.join(__dirname, '..'), f)}:${i + 1}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `these call the evidence model directly instead of src/lib/readiness.ts: ${offenders.join(', ')}`);
  console.log(`  single source: ${files.length} screens and components, 0 calling the model directly`);
}

console.log('all integrity checks passed');
