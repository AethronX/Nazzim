// Tasks: understanding what the student typed, and putting their tasks in an order they can trust.
//
// Two pure functions, no React, no storage — so both run identically on the phone and in tests.
//
//  · parseQuickTask: "مقال الإحصاء غداً 45 د" → title "مقال الإحصاء", due tomorrow, 45 minutes, subject
//    Statistics. Word-by-word rather than one big regex: Arabic has no \b word boundary in JavaScript regex,
//    and Hermes cannot be relied on for lookbehind or unicode property escapes.
//
//  · rankTasks: the smart order. Every position is explainable in one phrase, and that phrase is returned
//    with the task so the screen can say *why* a task sits where it does instead of asking to be trusted.
import { workDay, type DateKey, type Exam, type Subject, type Task, type TaskPriority } from '../domain/types';
import { addDays, daysBetween, fromKey } from '../lib/exams';

// ── Reading a quick task ────────────────────────────────────────────────────────────────────────

export type ParsedTask = {
  title: string; // what is left once dates, durations and priority words are taken out
  dueIn?: number; // days from today
  estimateMin?: number;
  subjectId?: string;
  priority?: TaskPriority;
};

const MARKS = /[ً-ٰٟـ]/g; // harakat, superscript alef, tatweel
const EDGE_PUNCT = /^[«"'(\[]+|[»"')\].,،؛:!؟?]+$/g;

/** Fold one word for matching: digits to ASCII, alef/ya/ta-marbuta forms unified, marks and edge punctuation off. */
function fold(w: string): string {
  let out = '';
  for (const ch of w.replace(MARKS, '')) {
    const c = ch.codePointAt(0)!;
    if (c >= 0x0660 && c <= 0x0669) out += String(c - 0x0660);
    else if (c >= 0x06f0 && c <= 0x06f9) out += String(c - 0x06f0);
    else if ('أإآٱ'.includes(ch)) out += 'ا';
    else if (ch === 'ى') out += 'ي';
    else if (ch === 'ة') out += 'ه';
    else out += ch;
  }
  return out.toLowerCase().replace(EDGE_PUNCT, '');
}

const num = (w: string): number | undefined => {
  const n = Number(w.replace(',', '.'));
  return w !== '' && Number.isFinite(n) && n > 0 ? n : undefined;
};

const TODAY = new Set(['اليوم', 'today', 'tonight', 'الليله']);
const TOMORROW = new Set(['غدا', 'بكره', 'بكرا', 'tomorrow', 'tmr', 'tmrw']);
const DAY_WORDS = new Set(['يوم', 'ايام', 'يوما', 'day', 'days']);
const MIN_WORDS = new Set(['د', 'دق', 'دقيقه', 'دقائق', 'دقايق', 'min', 'mins', 'minute', 'minutes', 'm']);
const HOUR_WORDS = new Set(['س', 'ساعه', 'ساعات', 'h', 'hr', 'hrs', 'hour', 'hours']);
// Words that only introduce a date or a duration ("for 45 min", "by Friday", "يوم الخميس", "لمدة ساعة").
const CONNECTORS = new Set(['يوم', 'on', 'by', 'for', 'لمده', 'مده', 'في', 'خلال', 'قبل', 'before']);
// "مهمة" (a task) folds to "مهمه", which is also "important" in the feminine — so only the masculine and
// unambiguous words count, or every task the student called a task would be marked important.
const HIGH = new Set(['مهم', 'عاجل', 'ضروري', 'urgent', 'important', '!', '!!', '!!!']);
const LOW = new Set(['اختياري', 'optional', 'someday']);

// Sunday = 0, matching Date.getDay().
const WEEKDAYS: Record<string, number> = {
  'الاحد': 0, 'احد': 0, sunday: 0, sun: 0,
  'الاثنين': 1, 'اثنين': 1, 'الاتنين': 1, monday: 1, mon: 1,
  'الثلاثاء': 2, 'ثلاثاء': 2, 'الثلاثا': 2, tuesday: 2, tue: 2, tues: 2,
  'الاربعاء': 3, 'اربعاء': 3, 'الاربعا': 3, wednesday: 3, wed: 3,
  'الخميس': 4, 'خميس': 4, thursday: 4, thu: 4, thurs: 4,
  'الجمعه': 5, 'جمعه': 5, friday: 5, fri: 5,
  'السبت': 6, 'سبت': 6, saturday: 6, sat: 6,
};

/** Days until the next given weekday, 1…7: "Thursday" said on a Thursday means next week, not today. */
function daysUntil(weekday: number, today: DateKey): number {
  const d = (weekday - fromKey(today).getDay() + 7) % 7;
  return d === 0 ? 7 : d;
}

/** A number glued to its unit, e.g. "45د", "1.5h", "30min". */
function glued(w: string): { n: number; unit: string } | undefined {
  const m = w.match(/^(\d+(?:[.,]\d+)?)(\D+)$/);
  if (!m) return undefined;
  const n = num(m[1]);
  return n === undefined ? undefined : { n, unit: m[2] };
}

export function parseQuickTask(text: string, today: DateKey, subjects: Pick<Subject, 'id' | 'name'>[] = []): ParsedTask {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const f = words.map(fold);
  const used = new Set<number>();
  const out: ParsedTask = { title: '' };
  const take = (...idx: number[]) => idx.forEach(i => used.add(i));

  for (let i = 0; i < f.length; i++) {
    if (used.has(i)) continue;
    const w = f[i], n1 = f[i + 1], n2 = f[i + 2];

    // ── dates ──
    if (out.dueIn === undefined) {
      if (TODAY.has(w)) { out.dueIn = 0; take(i); continue; }
      if (TOMORROW.has(w)) { out.dueIn = 1; take(i); continue; }
      if (w === 'بعد' && (n1 === 'غد' || n1 === 'بكره' || n1 === 'بكرا')) { out.dueIn = 2; take(i, i + 1); continue; }
      if (w === 'بعد' && n1 === 'يومين') { out.dueIn = 2; take(i, i + 1); continue; }
      if (w === 'بعد' && (n1 === 'اسبوع' || n1 === 'اسبوعين')) { out.dueIn = n1 === 'اسبوع' ? 7 : 14; take(i, i + 1); continue; }
      if ((w === 'بعد' || w === 'in') && n1 !== undefined && num(n1) !== undefined && n2 !== undefined && DAY_WORDS.has(n2)) {
        out.dueIn = Math.round(num(n1)!); take(i, i + 1, i + 2); continue;
      }
      if (w === 'in' && n1 === 'a' && n2 === 'week') { out.dueIn = 7; take(i, i + 1, i + 2); continue; }
      if (w === 'next' && n1 === 'week') { out.dueIn = 7; take(i, i + 1); continue; }
      if (w === 'day' && n1 === 'after' && n2 === 'tomorrow') { out.dueIn = 2; take(i, i + 1, i + 2); continue; }
      if (w in WEEKDAYS) { out.dueIn = daysUntil(WEEKDAYS[w], today); take(i); continue; }
    }

    // ── durations ──
    if (out.estimateMin === undefined) {
      const g = glued(w);
      if (g && (MIN_WORDS.has(g.unit) || HOUR_WORDS.has(g.unit))) {
        out.estimateMin = Math.round(HOUR_WORDS.has(g.unit) ? g.n * 60 : g.n); take(i); continue;
      }
      const n = num(w);
      if (n !== undefined && n1 !== undefined && (MIN_WORDS.has(n1) || HOUR_WORDS.has(n1))) {
        out.estimateMin = Math.round(HOUR_WORDS.has(n1) ? n * 60 : n); take(i, i + 1); continue;
      }
      if ((w === 'نص' || w === 'نصف') && n1 === 'ساعه') { out.estimateMin = 30; take(i, i + 1); continue; }
      if (w === 'ربع' && n1 === 'ساعه') { out.estimateMin = 15; take(i, i + 1); continue; }
      if (w === 'ساعتين' || w === 'ساعتان') { out.estimateMin = 120; take(i); continue; }
      if (w === 'ساعه') { out.estimateMin = 60; take(i); continue; }
      if (w === 'half' && n1 === 'an' && n2 === 'hour') { out.estimateMin = 30; take(i, i + 1, i + 2); continue; }
      if ((w === 'an' || w === 'one') && n1 === 'hour') { out.estimateMin = 60; take(i, i + 1); continue; }
    }

    // ── priority ──
    if (out.priority === undefined && HIGH.has(w)) { out.priority = 'high'; take(i); continue; }
    if (out.priority === undefined && LOW.has(w)) { out.priority = 'low'; take(i); continue; }
  }

  // A connector is dropped only when it introduced something we took ("for" before "45 min", "يوم" before
  // "الخميس"); anywhere else it is part of the title and stays.
  for (let i = 0; i < f.length; i++) {
    if (!used.has(i) && CONNECTORS.has(f[i]) && used.has(i + 1)) used.add(i);
  }

  // Subject: the longest subject name that appears as whole words. It stays in the title — "Statistics
  // essay" reads better than "essay" — and only links the task.
  const foldedText = ' ' + f.join(' ') + ' ';
  const match = subjects
    .map(s => ({ s, key: s.name.trim().split(/\s+/).map(fold).join(' ') }))
    .filter(x => x.key && foldedText.includes(' ' + x.key + ' '))
    .sort((a, b) => b.key.length - a.key.length)[0];
  if (match) out.subjectId = match.s.id;

  out.title = words.filter((_, i) => !used.has(i)).join(' ').replace(/[\s,،\-–—:]+$/, '').trim();
  if (out.estimateMin !== undefined) out.estimateMin = Math.max(5, Math.min(600, out.estimateMin));
  if (out.dueIn !== undefined) out.dueIn = Math.max(0, Math.min(365, out.dueIn));
  return out;
}

// ── The smart order ─────────────────────────────────────────────────────────────────────────────

export type TaskGroup = 'overdue' | 'today' | 'soon' | 'later' | 'done';
export type TaskReason =
  | 'overdue' | 'dueToday' | 'plannedToday' | 'examSoon' | 'highPriority' | 'dueTomorrow' | 'quickWin' | 'dueLater' | 'done';

export type RankedTask = {
  task: Task;
  group: TaskGroup;
  score: number;
  reason: TaskReason;
  dueIn: number; // days until the real deadline; negative = past it
  examIn?: number; // days until the nearest exam of the same subject, when there is one within EXAM_WINDOW
};

export const GROUP_ORDER: TaskGroup[] = ['overdue', 'today', 'soon', 'later', 'done'];
/** How much the student's own "important" outweighs the arithmetic. Their call should be able to win a tie, not a deadline. */
export const PRIORITY_WEIGHT: Record<TaskPriority, number> = { high: 1.5, normal: 1, low: 0.6 };
/** A task for a subject with an exam inside this window is pulled forward. */
export const EXAM_WINDOW = 7;
/** Tasks this short get a small nudge: clearing them is cheap and frees attention. */
export const QUICK_MIN = 15;
/** Beyond this many days a task is "later". */
export const SOON_DAYS = 7;

export type TaskSort = 'smart' | 'due';

/**
 * Order tasks the way a careful student would if they had the time to think about it.
 *
 * Groups first, and the groups are fixed: past their date → today → this week → later → done. Nothing the
 * score does can move a task across groups, so "past its date" can never sink below "later" however the
 * weights are tuned. Inside a group:
 *
 *   score = priority × (urgency + examPull) + quickWin
 *     urgency  = 1 / (1 + days until it is due)          today 1 · tomorrow 0.5 · in 3 days 0.25
 *                (past due: 1 + days late / 7, capped at 2)
 *     examPull = 0.5 × (1 − daysToExam / 8)              a task for a subject sitting its exam soon
 *     quickWin = 0.1 if it takes ≤ 15 minutes
 *     priority = high 1.5 · normal 1 · low 0.6
 *
 * Ties break toward the earlier deadline, then the shorter task, then the title, so the order is fully
 * determined and the same list never reshuffles between renders.
 */
export function rankTasks(tasks: Task[], exams: Pick<Exam, 'subjectId' | 'date'>[], today: DateKey, sort: TaskSort = 'smart'): RankedTask[] {
  const nearestExam = new Map<string, number>();
  for (const e of exams) {
    if (!e.subjectId) continue;
    const d = daysBetween(today, e.date);
    if (!Number.isFinite(d) || d < 0) continue;
    const prev = nearestExam.get(e.subjectId);
    if (prev === undefined || d < prev) nearestExam.set(e.subjectId, d);
  }

  const ranked = tasks.map((task): RankedTask => {
    const dueIn = daysBetween(today, task.due);
    const due = Number.isFinite(dueIn) ? dueIn : 0;
    if (task.done) return { task, group: 'done', score: 0, reason: 'done', dueIn: due };

    // Where it sits on the calendar: the day the student chose to work on it, never later than the deadline.
    const plannedIn = task.plannedFor ? daysBetween(today, task.plannedFor) : due;
    const effIn = Math.min(Number.isFinite(plannedIn) ? plannedIn : due, due);
    const group: TaskGroup = due < 0 ? 'overdue' : effIn <= 0 ? 'today' : effIn <= SOON_DAYS ? 'soon' : 'later';

    const urgency = due < 0 ? 1 + Math.min(-due, 7) / 7 : 1 / (1 + Math.max(0, effIn));
    const examIn = task.subjectId !== undefined ? nearestExam.get(task.subjectId) : undefined;
    const pull = examIn !== undefined && examIn <= EXAM_WINDOW ? 0.5 * (1 - examIn / (EXAM_WINDOW + 1)) : 0;
    const weight = PRIORITY_WEIGHT[task.priority ?? 'normal'];
    const quick = task.estimateMin <= QUICK_MIN ? 0.1 : 0;
    const score = weight * (urgency + pull) + quick;

    // The one phrase that explains the position, most decisive factor first.
    const reason: TaskReason =
      due < 0 ? 'overdue'
      : due === 0 ? 'dueToday'
      : effIn <= 0 ? 'plannedToday'
      : pull > 0 ? 'examSoon'
      : task.priority === 'high' ? 'highPriority'
      : due === 1 ? 'dueTomorrow'
      : quick ? 'quickWin'
      : 'dueLater';

    return { task, group, score, reason, dueIn: due, ...(pull > 0 ? { examIn } : {}) };
  });

  const g = (r: RankedTask) => GROUP_ORDER.indexOf(r.group);
  return ranked.sort((a, b) => {
    if (g(a) !== g(b)) return g(a) - g(b);
    if (a.group === 'done') return (b.task.doneAt ?? '').localeCompare(a.task.doneAt ?? '') || a.task.title.localeCompare(b.task.title);
    if (sort === 'due') return a.task.due.localeCompare(b.task.due) || b.score - a.score || a.task.title.localeCompare(b.task.title);
    return b.score - a.score || a.task.due.localeCompare(b.task.due) || a.task.estimateMin - b.task.estimateMin || a.task.title.localeCompare(b.task.title);
  });
}

/** Move a task's working day without touching its deadline. Never past the deadline, never into the past. */
export function moveTo(task: Task, day: DateKey, today: DateKey): Task {
  // Clamp both ways. Pushing the working day beyond the deadline would only hide a task that is still due —
  // if the deadline itself moved, the student edits the due date, which is a different, deliberate act.
  const latest = task.due < today ? today : task.due;
  const target = day < today ? today : day > latest ? latest : day;
  return { ...task, plannedFor: target === task.due ? undefined : target };
}

/**
 * Whether "do it tomorrow" would change anything: the task must be sitting on today (or earlier) and its
 * deadline must allow tomorrow. A task already due tomorrow is already on tomorrow — offering the button
 * there produced a confirmation for a move that did not happen.
 */
export const canMoveToTomorrow = (task: Task, today: DateKey) => !task.done && task.due > today && workDay(task) <= today;

/** "Do it tomorrow": the working day moves; the deadline the student has to meet does not. */
export const moveToTomorrow = (task: Task, today: DateKey) => moveTo(task, addDays(today, 1), today);

/** The working day a task is scheduled on — re-exported so screens need one import. */
export { workDay };
