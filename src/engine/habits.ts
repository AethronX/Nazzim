// Habit engine: the science of coming back, used for the student's benefit (no dark patterns).
//
//  · Study streak with grace: one rest day per rolling week is forgiven automatically. Loss aversion keeps a streak
//    motivating; a single missed day breaking it is what makes people quit (the "what-the-hell" effect).
//  · Implementation intention (Gollwitzer): the student picks *when* they study; the schedule and reminders follow.
//  · Activation checklist: endowed progress + goal gradient. The first step is already done when it appears.
//  · Weekly recap on the first day of the week: the fresh-start effect (Dai, Milkman & Riis, 2014).
import type { AcademicContext, DateKey } from '../domain/types';
import { addDays, fromKey } from '../lib/exams';
import { activeDaySet, type FocusLog } from './insights';

export type StudyTime = 'morning' | 'afternoon' | 'evening' | 'night';
export const STUDY_START: Record<StudyTime, number> = { morning: 9 * 60, afternoon: 16 * 60, evening: 19 * 60, night: 21 * 60 };

// ── Streak ───────────────────────────────────────────────────────────────────────────────────
export type Streak = {
  days: number; // study days in the current run
  studiedToday: boolean;
  restUsed: boolean; // a rest day inside the run was forgiven
  atRisk: boolean; // studied yesterday (or rested), not yet today: today keeps it alive
};

// Counts back from today (or yesterday, if today has no study yet). One missed day per 7 is a rest day;
// a second miss inside the same 7-day window ends the run.
export function studyStreak(ctx: AcademicContext, log: FocusLog): Streak {
  const active = activeDaySet(ctx, log);
  const today = ctx.today;
  const studiedToday = active.has(today);
  let day = studiedToday ? today : addDays(today, -1);
  let days = 0;
  const misses: DateKey[] = [];
  for (let i = 0; i < 400; i++) {
    if (active.has(day)) days++;
    else {
      // A rest is forgiven only if no other rest happened in the previous 6 days and the run continues before it.
      const recent = misses.some(m => Math.abs((fromKey(m).getTime() - fromKey(day).getTime()) / 86400000) < 7);
      if (recent || !active.has(addDays(day, -1))) break;
      misses.push(day);
    }
    day = addDays(day, -1);
  }
  return { days, studiedToday, restUsed: misses.length > 0, atRisk: days > 0 && !studiedToday };
}

// ── Activation checklist ─────────────────────────────────────────────────────────────────────
export type ChecklistStep = 'semester' | 'focus' | 'rate' | 'reminders' | 'account';
export type Checklist = { steps: { id: ChecklistStep; done: boolean }[]; done: number; total: number; complete: boolean };

export function activationChecklist(ctx: AcademicContext, log: FocusLog, flags: { reminders: boolean; account: boolean }): Checklist {
  const steps: Checklist['steps'] = [
    { id: 'semester', done: ctx.subjects.length > 0 }, // done at onboarding: endowed progress
    { id: 'focus', done: Object.values(log).some(m => m > 0) },
    { id: 'rate', done: ctx.sessions.some(s => s.done && !!s.confidence && !!s.doneAt) || ctx.tasks.some(t => t.done) },
    { id: 'reminders', done: flags.reminders },
    { id: 'account', done: flags.account },
  ];
  const done = steps.filter(s => s.done).length;
  return { steps, done, total: steps.length, complete: done === steps.length };
}

// ── Weekly recap ─────────────────────────────────────────────────────────────────────────────
export type WeeklyRecap = { weekKey: DateKey; minutes: number; activeDays: number; sessions: number; tasks: number; nextWeekMin: number };

// Last calendar week (Sun–Sat) in numbers. Shown on the first two days of a new week, if anything happened.
export function weeklyRecap(ctx: AcademicContext, log: FocusLog): WeeklyRecap | null {
  const dow = fromKey(ctx.today).getDay();
  if (dow > 1) return null;
  const thisWeek = addDays(ctx.today, -dow);
  const start = addDays(thisWeek, -7);
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const inWeek = (d?: DateKey) => !!d && d >= start && d < thisWeek;
  const active = activeDaySet(ctx, log);
  const recap: WeeklyRecap = {
    weekKey: thisWeek,
    minutes: days.reduce((a, d) => a + (log[d] ?? 0), 0),
    activeDays: days.filter(d => active.has(d)).length,
    sessions: ctx.sessions.filter(s => s.done && inWeek(s.doneAt)).length,
    tasks: ctx.tasks.filter(t => t.done && inWeek(t.doneAt)).length,
    nextWeekMin: Array.from({ length: 7 }, (_, i) => addDays(thisWeek, i)).reduce((a, d) =>
      a + ctx.sessions.filter(s => !s.done && s.date === d).reduce((x, s) => x + s.minutes, 0), 0),
  };
  return recap.activeDays || recap.minutes ? recap : null;
}

// ── When to remind ───────────────────────────────────────────────────────────────────────────
// The reminder goes out 15 minutes before the student's chosen study time, never in quiet hours (22:00–07:00).
export function reminderTime(studyTime: StudyTime): { hour: number; minute: number } {
  const t = Math.min(Math.max(STUDY_START[studyTime] - 15, 7 * 60), 21 * 60 + 45);
  return { hour: Math.floor(t / 60), minute: t % 60 };
}
