// Rescue Mode: when work piles up, rebuild the next days around what the student can actually do.
//
// Rules, in order:
//  1. Nothing is scheduled past its deadline: a study session must happen before its exam, a task by its due date
//     (an already overdue task gets "as soon as possible").
//  2. Earliest deadline first; on ties, overdue tasks, then mock tests, first passes, reviews.
//  3. Each day holds at most `dailyMinutes`. Work only moves later, never earlier, so review spacing is kept.
//  4. If a chapter review cannot fit before its exam and the chapter has another review left, it is dropped
//     (the later review covers it). Anything else that cannot fit goes on its least-loaded allowed day and is
//     reported as tight, so the plan stays honest instead of pretending everything fits.
import { workDay, type AcademicContext, type DateKey } from '../domain/types';
import { addDays, daysBetween } from '../lib/exams';

export type RescueItem = { kind: 'session' | 'task'; id: string; minutes: number; from: DateKey; to: DateKey };
export type RescueDay = { date: DateKey; minutes: number; items: RescueItem[] };
export type RescuePlan = {
  overdue: number; // open tasks whose day has passed
  upcomingExams: number; // exams inside the horizon
  neededMin: number; // all open work inside the horizon
  availableMin: number; // dailyMinutes × days
  moves: RescueItem[]; // only the items whose day changes
  dropped: string[]; // review session ids removed
  tight: string[]; // ids that could not fit under the daily limit
  days: RescueDay[];
  status: 'onTrack' | 'recoverable' | 'tight';
};

export type BehindStatus = {
  behind: boolean;
  overdue: number; // count of overdue tasks (display)
  overdueMin: number; // accumulated overdue minutes — what the trigger actually weighs
  todayMin: number;
  overloadedDays: number;
  deficitRatio: number; // work needed before the nearest exam ÷ capacity available before it
  nearestExamDays: number | null;
  evidenceGap: number; // 1 − evidence completeness of the nearest exam, 0..1
  reason: 'overdue' | 'load' | 'deficit' | 'exam' | null;
};

export const DEFAULT_DAILY_MIN = 120;

// Trigger thresholds. Named, exported and tested so they can be calibrated against real `rescue_opened`
// data later instead of being argued about. The old trigger was `overdueTasks > 0`, which meant one
// forgotten ten-minute task put the student into an emergency screen — the fastest way to teach someone
// to ignore a warning.
export const RESCUE_OVERDUE_MIN = 60; // an hour of work actually left behind, not a count of rows
export const RESCUE_LOAD_RATIO = 1.5; // today is scheduled at more than 1.5× a normal day
export const RESCUE_DEFICIT_RATIO = 1.25; // more work before the nearest exam than hours to do it in
export const RESCUE_EXAM_DAYS = 3; // and, close to an exam…
export const RESCUE_GAP = 0.4; // …evidence this incomplete

/**
 * Is today worth triaging? `evidence` is evidence completeness (0–100) for the nearest exam, passed in so
 * this engine stays pure and so the trigger reads the same number the student sees.
 */
export function assessBehind(ctx: AcademicContext, horizon = 7, evidence?: number): BehindStatus {
  const cap = ctx.dailyMinutes ?? DEFAULT_DAILY_MIN;
  const late = ctx.tasks.filter(t => !t.done && workDay(t) < ctx.today);
  const overdueMin = late.reduce((a, t) => a + t.estimateMin, 0);
  const perDay = (d: DateKey) =>
    ctx.sessions.filter(s => !s.done && s.date === d).reduce((a, s) => a + s.minutes, 0) +
    ctx.tasks.filter(t => !t.done && workDay(t) === d).reduce((a, t) => a + t.estimateMin, 0);
  const days = Array.from({ length: horizon }, (_, i) => addDays(ctx.today, i));
  const todayMin = perDay(ctx.today) + overdueMin;
  const overloadedDays = days.filter(d => perDay(d) > cap * 1.25).length;

  const nextExam = ctx.exams.filter(e => e.date >= ctx.today).sort((a, b) => a.date.localeCompare(b.date))[0];
  const nearestExamDays = nextExam ? daysBetween(ctx.today, nextExam.date) : null;
  // Can the remaining work for that exam fit in the days left at a normal pace?
  let deficitRatio = 0;
  if (nextExam && nearestExamDays !== null && Number.isFinite(nearestExamDays) && nearestExamDays > 0) {
    const need = ctx.sessions.filter(s => !s.done && s.examId === nextExam.id && s.date <= nextExam.date).reduce((a, s) => a + s.minutes, 0);
    deficitRatio = need / Math.max(1, cap * nearestExamDays);
  }
  const evidenceGap = evidence === undefined ? 0 : Math.max(0, Math.min(1, 1 - evidence / 100));

  const reason: BehindStatus['reason'] =
    overdueMin >= RESCUE_OVERDUE_MIN ? 'overdue'
    : todayMin > cap * RESCUE_LOAD_RATIO ? 'load'
    : deficitRatio >= RESCUE_DEFICIT_RATIO ? 'deficit'
    : nearestExamDays !== null && nearestExamDays <= RESCUE_EXAM_DAYS && evidenceGap >= RESCUE_GAP ? 'exam'
    : null;

  return { behind: reason !== null, overdue: late.length, overdueMin, todayMin, overloadedDays, deficitRatio, nearestExamDays, evidenceGap, reason };
}

// ── Today triage ────────────────────────────────────────────────────────────────────────────────
//
// The old Rescue was a re-dating pass: it moved every open item inside a seven-day window until each day fit
// under the cap, and reported the moves. That answers "how do I fit everything in", which is not the
// question a student has at 9pm with four days to an exam. This answers theirs: of everything competing for
// tonight, which three are worth the time?
//
// It is a shortlist, not a schedule. The seven-day rebuild still exists below and still runs — it just sits
// underneath the shortlist instead of in front of it.

export type ReasonCode = 'examSoon' | 'evidenceGap' | 'overdue' | 'dueToday';
export type TriageItem = {
  kind: 'session' | 'task' | 'recall';
  id: string;
  examId?: string;
  chapter?: number;
  minutes: number;
  why: ReasonCode;
  value: number; // evidence-equivalent gain per minute; higher first
};
export type RescueTriage = {
  capacityMin: number; // what a normal day holds for this student
  committedMin: number; // what is actually asked of today, overdue included
  deficitMin: number; // the overspill
  now: TriageItem[]; // at most three, and they fit
  later: TriageItem[];
  dropped: string[];
};

/** Minutes assumed for a self-test sitting. Short on purpose: the point is that it is cheap. */
export const RECALL_MIN = 10;
/**
 * What a task with a deadline is worth in the same currency as an evidence gain. A judgement constant, not a
 * derived one: a submitted assignment matters without moving any exam's evidence. Exported so it can be
 * calibrated rather than buried.
 */
export const TASK_VALUE = 0.35;

/** 0 far from a date, 1 on it. */
const urgency = (days: number) => (Number.isFinite(days) ? Math.max(0, Math.min(1, (14 - days) / 14)) : 0);

/**
 * `targets` are the ranked evidence gaps from src/lib/readiness.ts — passed in so this engine stays pure and
 * so triage and Today agree about what is missing.
 */
export function triageToday(
  ctx: AcademicContext,
  targets: { kind: string; examId: string; chapter: number; gain: number; need: number; daysLeft: number }[],
  horizon = 7,
): RescueTriage {
  const cap = ctx.dailyMinutes ?? DEFAULT_DAILY_MIN;
  const { today } = ctx;
  const last = addDays(today, horizon - 1);
  const examById = new Map(ctx.exams.map(e => [e.id, e]));
  const items: TriageItem[] = [];

  // Study blocks: valued by what the evidence model says the matching chapter would gain.
  for (const s of ctx.sessions) {
    if (s.done || s.orphan || s.date > last) continue;
    const exam = examById.get(s.examId);
    if (!exam) continue;
    const days = daysBetween(today, exam.date);
    if (!Number.isFinite(days) || days < 0) continue;
    const target = targets.find(t => t.examId === s.examId && t.chapter === s.chapter && t.kind !== 'recall');
    const gain = target?.gain ?? 0.05;
    const minutes = Math.max(1, s.minutes);
    items.push({
      kind: 'session', id: s.id, examId: s.examId, chapter: s.chapter, minutes,
      why: days <= RESCUE_EXAM_DAYS ? 'examSoon' : 'evidenceGap',
      value: (gain * (0.5 + 0.5 * urgency(days))) / minutes,
    });
  }

  // Self-tests: no scheduled block exists for them, so they come from the evidence ranking directly.
  for (const t of targets) {
    if (t.kind !== 'recall') continue;
    items.push({
      kind: 'recall', id: `${t.examId}:${t.chapter}`, examId: t.examId, chapter: t.chapter, minutes: RECALL_MIN,
      why: t.daysLeft <= RESCUE_EXAM_DAYS ? 'examSoon' : 'evidenceGap',
      value: (t.gain * (0.5 + 0.5 * urgency(t.daysLeft))) / RECALL_MIN,
    });
  }

  // Tasks: deadlines, not evidence.
  for (const t of ctx.tasks) {
    if (t.done) continue;
    const day = workDay(t);
    if (day > last) continue;
    const dueIn = daysBetween(today, t.due);
    if (!Number.isFinite(dueIn)) continue;
    const overdueBoost = dueIn < 0 ? 1 + Math.min(-dueIn, 7) / 7 : 1;
    const minutes = Math.max(1, t.estimateMin);
    items.push({
      kind: 'task', id: t.id, minutes,
      why: dueIn < 0 ? 'overdue' : dueIn === 0 ? 'dueToday' : 'evidenceGap',
      value: (TASK_VALUE * (0.5 + 0.5 * urgency(dueIn)) * overdueBoost) / minutes,
    });
  }

  items.sort((a, b) => b.value - a.value || a.minutes - b.minutes);

  // Greedy fill of one normal day, three items at most. Three because the point is a decision, not a list.
  const now: TriageItem[] = [];
  const later: TriageItem[] = [];
  let used = 0;
  for (const it of items) {
    if (now.length < 3 && used + it.minutes <= cap) { now.push(it); used += it.minutes; }
    else later.push(it);
  }

  const todayLoad = ctx.sessions.filter(s => !s.done && !s.orphan && s.date === today).reduce((a, s) => a + s.minutes, 0)
    + ctx.tasks.filter(t => !t.done && workDay(t) <= today).reduce((a, t) => a + t.estimateMin, 0);

  return { capacityMin: cap, committedMin: todayLoad, deficitMin: Math.max(0, todayLoad - cap), now, later, dropped: [] };
}

const RANK = { overdue: 0, mock: 1, learn: 2, task: 3, review: 4 } as const;

export function generateRescuePlan(ctx: AcademicContext, horizon = 7): RescuePlan {
  const { today } = ctx;
  const cap = ctx.dailyMinutes ?? DEFAULT_DAILY_MIN;
  const last = addDays(today, horizon - 1);
  const examById = new Map(ctx.exams.map(e => [e.id, e]));

  type Job = { kind: 'session' | 'task'; id: string; minutes: number; from: DateKey; earliest: DateKey; deadline: DateKey; rank: number; droppable: boolean };
  const jobs: Job[] = [];

  for (const t of ctx.tasks) {
    if (t.done) continue;
    const from = workDay(t);
    if (from > last && t.due > last) continue;
    const isOver = t.due < today;
    jobs.push({
      kind: 'task', id: t.id, minutes: t.estimateMin, from,
      earliest: from < today ? today : from,
      // Overdue: as soon as possible (but it may slip inside the horizon). Otherwise: by its due date.
      deadline: isOver ? last : t.due,
      rank: isOver ? RANK.overdue : RANK.task, droppable: false,
    });
  }
  const open = ctx.sessions.filter(s => !s.done && s.date <= last && examById.has(s.examId));
  for (const s of open) {
    const exam = examById.get(s.examId)!;
    const deadline = addDays(exam.date, -1);
    if (deadline < today) continue; // exam is today or past; nothing left to plan
    const laterReview = open.some(o => o.examId === s.examId && o.chapter === s.chapter && o.kind === 'review' && o.id !== s.id && o.date >= s.date);
    jobs.push({
      kind: 'session', id: s.id, minutes: s.minutes, from: s.date,
      earliest: s.date < today ? today : s.date, deadline,
      rank: RANK[s.kind], droppable: s.kind === 'review' && laterReview,
    });
  }

  jobs.sort((a, b) => a.deadline.localeCompare(b.deadline) || a.rank - b.rank || a.from.localeCompare(b.from));

  const used: Record<DateKey, number> = {};
  const placed: RescueItem[] = [];
  const dropped: string[] = [];
  const tight: string[] = [];

  for (const j of jobs) {
    const span = Math.max(0, daysBetween(j.earliest, j.deadline < j.earliest ? j.earliest : j.deadline));
    let day: DateKey | null = null;
    for (let i = 0; i <= span; i++) {
      const d = addDays(j.earliest, i);
      if ((used[d] ?? 0) + j.minutes <= cap) { day = d; break; }
    }
    if (!day && j.droppable) { dropped.push(j.id); continue; }
    if (!day) {
      // Least-loaded allowed day; flagged so the student sees it honestly.
      day = j.earliest;
      for (let i = 1; i <= span; i++) {
        const d = addDays(j.earliest, i);
        if ((used[d] ?? 0) < (used[day] ?? 0)) day = d;
      }
      tight.push(j.id);
    }
    used[day] = (used[day] ?? 0) + j.minutes;
    placed.push({ kind: j.kind, id: j.id, minutes: j.minutes, from: j.from, to: day });
  }

  const dates = Array.from(new Set(placed.map(p => p.to))).sort();
  const days: RescueDay[] = dates.map(date => {
    const items = placed.filter(p => p.to === date);
    return { date, items, minutes: items.reduce((a, b) => a + b.minutes, 0) };
  });
  const neededMin = jobs.reduce((a, j) => a + j.minutes, 0);
  const behind = assessBehind(ctx, horizon);

  return {
    overdue: behind.overdue,
    upcomingExams: ctx.exams.filter(e => e.date >= today && e.date <= addDays(last, 1)).length,
    neededMin,
    availableMin: cap * horizon,
    moves: placed.filter(p => p.to !== p.from),
    dropped,
    tight,
    days,
    status: tight.length ? 'tight' : behind.behind || dropped.length ? 'recoverable' : 'onTrack',
  };
}
