// Task engine guard: reading a quick task, the smart order, and moving a task without touching its deadline.
require('./register-ts.js');
const assert = require('node:assert');
const T = require('../src/engine/tasks.ts');
const E = require('../src/lib/exams.ts');
const V = require('../src/domain/validate.ts');

const today = '2026-10-03'; // a Saturday
const subjects = [{ id: 'stat', name: 'الإحصاء' }, { id: 'calc', name: 'Calculus' }, { id: 'ds', name: 'هياكل البيانات' }];
const P = (s) => T.parseQuickTask(s, today, subjects);

// ── Reading: Arabic ─────────────────────────────────────────────────────────────────────────────
{
  const a = P('مقال الإحصاء غداً 45 د');
  assert.equal(a.title, 'مقال الإحصاء');
  assert.equal(a.dueIn, 1);
  assert.equal(a.estimateMin, 45);
  assert.equal(a.subjectId, 'stat', 'the subject is linked and stays in the title');

  assert.equal(P('واجب الإحصاء بعد غد').dueIn, 2);
  assert.equal(P('مراجعة بعد يومين').dueIn, 2);
  assert.equal(P('مشروع بعد 3 أيام').dueIn, 3);
  assert.equal(P('مشروع بعد ٣ أيام').dueIn, 3, 'Arabic-Indic digits read the same');
  assert.equal(P('مشروع بعد أسبوع').dueIn, 7);
  assert.equal(P('تلخيص اليوم').dueIn, 0);
  assert.equal(P('تلخيص بكرة').dueIn, 1);

  assert.equal(P('قراءة 90د').estimateMin, 90, 'number glued to its unit');
  assert.equal(P('قراءة ٤٥ دقيقة').estimateMin, 45);
  assert.equal(P('قراءة ساعة').estimateMin, 60);
  assert.equal(P('قراءة ساعتين').estimateMin, 120);
  assert.equal(P('قراءة نص ساعة').estimateMin, 30);
  assert.equal(P('قراءة 1.5 ساعة').estimateMin, 90);
  assert.equal(P('قراءة لمدة 30 د').title, 'قراءة', 'the connector that introduced the duration goes too');

  // Weekdays: next occurrence, never "today" — saying Thursday on a Thursday means next week.
  assert.equal(P('تسليم التقرير يوم الخميس').dueIn, 5, 'Saturday → Thursday is 5 days');
  assert.equal(P('تسليم التقرير يوم الخميس').title, 'تسليم التقرير');
  assert.equal(P('عرض السبت').dueIn, 7, 'the same weekday means next week');

  assert.equal(P('حل التمارين مهم').priority, 'high');
  assert.equal(P('مهمة الإحصاء').priority, undefined, '"مهمة" means a task, not "important" — no false positive');
  assert.equal(P('مهمة الإحصاء').title, 'مهمة الإحصاء');

  // Numbers that are not durations stay in the title.
  assert.equal(P('حل أسئلة الفصل 3').title, 'حل أسئلة الفصل 3');
  assert.equal(P('حل أسئلة الفصل 3').estimateMin, undefined);

  assert.equal(P('مشروع هياكل البيانات غداً').subjectId, 'ds', 'multi-word subject names match');
}

// ── Reading: English ────────────────────────────────────────────────────────────────────────────
{
  const e = P('Calculus problem set tomorrow 1h urgent');
  assert.equal(e.title, 'Calculus problem set');
  assert.equal(e.dueIn, 1);
  assert.equal(e.estimateMin, 60);
  assert.equal(e.priority, 'high');
  assert.equal(e.subjectId, 'calc');
  assert.equal(P('lab report in 4 days').dueIn, 4);
  assert.equal(P('lab report next week').dueIn, 7);
  assert.equal(P('lab report by friday').dueIn, 6);
  assert.equal(P('lab report by friday').title, 'lab report');
  assert.equal(P('read for 30min').estimateMin, 30);
  assert.equal(P('read for 30min').title, 'read');
  assert.equal(P('').title, '');
  assert.deepEqual(P('just a title'), { title: 'just a title' }, 'plain text is just a title');
}

// ── The smart order ─────────────────────────────────────────────────────────────────────────────
const task = (id, o = {}) => ({ id, title: id, due: today, estimateMin: 30, done: false, ...o });
const ids = (r) => r.map(x => x.task.id);
{
  const tasks = [
    task('later', { due: E.addDays(today, 20) }),
    task('done', { done: true, doneAt: today }),
    task('soon', { due: E.addDays(today, 3) }),
    task('today', { due: today }),
    task('late', { due: E.addDays(today, -2) }),
  ];
  const r = T.rankTasks(tasks, [], today);
  assert.deepEqual(ids(r), ['late', 'today', 'soon', 'later', 'done'], 'groups are fixed: past date → today → week → later → done');
  assert.deepEqual(r.map(x => x.group), ['overdue', 'today', 'soon', 'later', 'done']);
  assert.equal(r[0].reason, 'overdue');

  // A low-priority overdue task still beats a high-priority task due later: groups cannot be crossed.
  const r2 = T.rankTasks([task('vip', { due: E.addDays(today, 10), priority: 'high' }), task('late', { due: E.addDays(today, -1), priority: 'low' })], [], today);
  assert.deepEqual(ids(r2), ['late', 'vip']);

  // Inside a group, the student's priority decides.
  const r3 = T.rankTasks([task('a', { due: E.addDays(today, 2) }), task('b', { due: E.addDays(today, 2), priority: 'high' })], [], today);
  assert.deepEqual(ids(r3), ['b', 'a']);
  assert.equal(r3[0].reason, 'highPriority');

  // An exam coming up for that subject pulls its tasks forward.
  const exams = [{ subjectId: 'stat', date: E.addDays(today, 2) }];
  const r4 = T.rankTasks([task('other', { due: E.addDays(today, 4) }), task('statwork', { due: E.addDays(today, 4), subjectId: 'stat' })], exams, today);
  assert.deepEqual(ids(r4), ['statwork', 'other']);
  assert.equal(r4[0].reason, 'examSoon');
  assert.equal(r4[0].examIn, 2);

  // Quick wins break a tie.
  const r5 = T.rankTasks([task('long', { estimateMin: 90 }), task('short', { estimateMin: 10 })], [], today);
  assert.deepEqual(ids(r5), ['short', 'long']);

  // Sooner deadline beats later inside the week.
  const r6 = T.rankTasks([task('d4', { due: E.addDays(today, 4) }), task('d1', { due: E.addDays(today, 1) })], [], today);
  assert.deepEqual(ids(r6), ['d1', 'd4']);
  assert.equal(r6[0].reason, 'dueTomorrow');

  // "By due date" mode is purely chronological inside a group.
  const r7 = T.rankTasks([task('vip', { due: E.addDays(today, 5), priority: 'high' }), task('early', { due: E.addDays(today, 2) })], [], today, 'due');
  assert.deepEqual(ids(r7), ['early', 'vip']);

  // Deterministic: same input, same order, every time.
  const big = Array.from({ length: 30 }, (_, i) => task('t' + i, { due: E.addDays(today, i % 9 - 2), estimateMin: 10 + (i * 7) % 60, priority: ['high', 'normal', 'low'][i % 3] }));
  assert.deepEqual(ids(T.rankTasks(big, [], today)), ids(T.rankTasks([...big].reverse(), [], today)), 'input order must not change the result');
}

// ── Planned day vs deadline ─────────────────────────────────────────────────────────────────────
{
  const t = task('essay', { due: E.addDays(today, 5) });
  const moved = T.moveToTomorrow(t, today);
  assert.equal(moved.plannedFor, E.addDays(today, 1), 'the working day moves');
  assert.equal(moved.due, t.due, 'the deadline does not');
  assert.equal(T.rankTasks([moved], [], today)[0].group, 'soon', 'moved out of today');

  // A planned day that already passed brings the task back to today.
  const missed = task('m', { due: E.addDays(today, 4), plannedFor: E.addDays(today, -1) });
  assert.equal(T.rankTasks([missed], [], today)[0].group, 'today');
  assert.equal(T.rankTasks([missed], [], today)[0].reason, 'plannedToday');

  // Never past the deadline, never into the past.
  const dueToday = task('x', { due: today });
  assert.equal(T.canMoveToTomorrow(dueToday, today), false);
  assert.equal(T.canMoveToTomorrow(task('y', { due: E.addDays(today, 1) }), today), false, 'already on tomorrow: nothing to move');
  assert.equal(T.canMoveToTomorrow(task('z', { due: E.addDays(today, 4), plannedFor: today }), today), true, 'planned for today, due later: can move');
  assert.equal(T.canMoveToTomorrow(moved, today), false, 'once moved, the offer disappears');
  assert.equal(T.moveTo(dueToday, E.addDays(today, 3), today).plannedFor, undefined, 'clamped to the deadline');
  assert.equal(T.moveTo(t, E.addDays(today, -4), today).plannedFor, today, 'clamped to today');
  assert.equal(T.moveTo(t, t.due, today).plannedFor, undefined, 'planning on the deadline itself needs no separate day');
}

// ── Validation keeps the new fields, and repairs what it can ────────────────────────────────────
{
  const ok = V.checkTask({ id: 't', title: 'x', due: today, estimateMin: 30, priority: 'high', notes: '  chapter 3, 4 and the appendix  ' });
  assert.ok(ok.ok && ok.value.priority === 'high' && ok.value.notes === 'chapter 3, 4 and the appendix', 'priority and notes survive a sync round-trip');
  const normal = V.checkTask({ id: 't', title: 'x', due: today, estimateMin: 30, priority: 'normal' });
  assert.ok(normal.ok && normal.value.priority === undefined, 'normal is stored as absent');
  const bad = V.checkTask({ id: 't', title: 'x', due: today, estimateMin: 30, priority: 'mega' });
  assert.ok(bad.ok && bad.value.priority === undefined && bad.repaired.includes('priority'));
  assert.ok(!V.checkTask({ id: 't', title: 'x', due: '2026-02-31', estimateMin: 30 }).ok, 'an impossible date is refused');
}

console.log('all task checks passed');
