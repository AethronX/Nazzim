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

export type BehindStatus = { behind: boolean; overdue: number; todayMin: number; overloadedDays: number };

export const DEFAULT_DAILY_MIN = 120;

// Is the student behind? Overdue tasks, or today/upcoming days well over their usual capacity.
export function assessBehind(ctx: AcademicContext, horizon = 7): BehindStatus {
  const cap = ctx.dailyMinutes ?? DEFAULT_DAILY_MIN;
  const overdue = ctx.tasks.filter(t => !t.done && workDay(t) < ctx.today).length;
  const perDay = (d: DateKey) =>
    ctx.sessions.filter(s => !s.done && s.date === d).reduce((a, s) => a + s.minutes, 0) +
    ctx.tasks.filter(t => !t.done && workDay(t) === d).reduce((a, t) => a + t.estimateMin, 0);
  const days = Array.from({ length: horizon }, (_, i) => addDays(ctx.today, i));
  const todayMin = perDay(ctx.today) + ctx.tasks.filter(t => !t.done && workDay(t) < ctx.today).reduce((a, t) => a + t.estimateMin, 0);
  const overloadedDays = days.filter(d => perDay(d) > cap * 1.25).length;
  return { behind: overdue > 0 || todayMin > cap * 1.5 || overloadedDays >= 2, overdue, todayMin, overloadedDays };
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
