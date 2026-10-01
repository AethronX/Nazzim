// Progress and insights: everything here is computed from what the student actually did. No sample numbers.
//
// Deliberate choices (lessons from other study apps):
//  · "Active days this week" instead of a breakable streak: streaks drive anxiety and churn the day they reset.
//  · Insights are few (max 3), specific and actionable; each one points at a screen that helps.
import type { AcademicContext, DateKey, Exam } from '../domain/types';
import { addDays, daysBetween, fromKey, readiness } from '../lib/exams';
import { analyzeAcademicLoad, semesterProgress, subjectProgress } from './academic';

export type FocusLog = Record<DateKey, number>;

export type ProgressSummary = {
  semester: number; // 0–100
  activeDays: number; // days with any study in the last 7 (including today)
  consistency: number; // activeDays / 7 as %
  tasksDone: number; tasksTotal: number; tasksPct: number;
  weekMinutes: number; // focused minutes, last 7 days
  week: { date: DateKey; minutes: number; isToday: boolean; future: boolean }[]; // the calendar week (Sun–Sat)
  subjects: { id: string; progress: number; readiness?: number; exam?: Exam }[];
};

export type Insight =
  | { code: 'readinessUp'; exam: string; delta: number; examId: string }
  | { code: 'examAtRisk'; exam: string; days: number; readiness: number; examId: string }
  | { code: 'heavierNextWeek'; next: number; current: number }
  | { code: 'consistency'; days: number }
  | { code: 'behind'; overdue: number }
  | { code: 'start' };

// Days with any recorded study: focus minutes, a finished session or a finished task.
export function activeDaySet(ctx: AcademicContext, log: FocusLog): Set<DateKey> {
  const days = new Set<DateKey>(Object.keys(log).filter(d => log[d] > 0));
  ctx.sessions.forEach(s => s.done && s.doneAt && days.add(s.doneAt));
  ctx.tasks.forEach(t => t.done && t.doneAt && days.add(t.doneAt));
  return days;
}

export function summarizeProgress(ctx: AcademicContext, log: FocusLog): ProgressSummary {
  const { today } = ctx;
  const last7 = Array.from({ length: 7 }, (_, i) => addDays(today, -i));
  const active = activeDaySet(ctx, log);
  const activeDays = last7.filter(d => active.has(d)).length;
  const tasksDone = ctx.tasks.filter(t => t.done).length;
  const start = addDays(today, -fromKey(today).getDay());
  return {
    semester: semesterProgress(ctx),
    activeDays,
    consistency: Math.round((activeDays / 7) * 100),
    tasksDone, tasksTotal: ctx.tasks.length,
    tasksPct: ctx.tasks.length ? Math.round((tasksDone / ctx.tasks.length) * 100) : 0,
    weekMinutes: last7.reduce((a, d) => a + (log[d] ?? 0), 0),
    week: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(start, i);
      return { date, minutes: log[date] ?? 0, isToday: date === today, future: date > today };
    }),
    subjects: ctx.subjects.map(s => {
      const exam = ctx.exams.filter(e => e.subjectId === s.id && e.date >= today).sort((a, b) => a.date.localeCompare(b.date))[0];
      return { id: s.id, progress: subjectProgress(ctx, s.id), exam, readiness: exam ? readiness(exam, ctx.sessions) : undefined };
    }),
  };
}

// Up to three insights, most useful first.
export function generateStudyInsights(ctx: AcademicContext, log: FocusLog, max = 3): Insight[] {
  const { today } = ctx;
  const out: Insight[] = [];
  const weekAgo = addDays(today, -6);
  const upcoming = ctx.exams.filter(e => e.date > today).sort((a, b) => a.date.localeCompare(b.date));

  // An exam close by with low readiness is the most important thing to say.
  for (const e of upcoming) {
    const days = daysBetween(today, e.date), r = readiness(e, ctx.sessions);
    if (days <= 3 && r < 50) { out.push({ code: 'examAtRisk', exam: e.subject, days, readiness: r, examId: e.id }); break; }
  }
  const overdue = ctx.tasks.filter(t => !t.done && (t.plannedFor ?? t.due) < today).length;
  if (overdue) out.push({ code: 'behind', overdue });

  // Readiness gained from sessions done in the last 7 days.
  let best: Insight | null = null;
  for (const e of upcoming) {
    const before = readiness(e, ctx.sessions.map(s => (s.examId === e.id && s.done && s.doneAt && s.doneAt >= weekAgo ? { ...s, done: false, confidence: undefined } : s)));
    const delta = readiness(e, ctx.sessions) - before;
    if (delta >= 5 && (!best || (best.code === 'readinessUp' && delta > best.delta))) best = { code: 'readinessUp', exam: e.subject, delta, examId: e.id };
  }
  if (best) out.push(best);

  const current = analyzeAcademicLoad(ctx, today, 7).total;
  const next = analyzeAcademicLoad(ctx, addDays(today, 7), 7).total;
  if (next >= 120 && next > current * 1.3) out.push({ code: 'heavierNextWeek', next, current });

  const active = activeDaySet(ctx, log);
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, -i)).filter(d => active.has(d)).length;
  if (days >= 3) out.push({ code: 'consistency', days });

  if (!out.length) out.push({ code: 'start' });
  return out.slice(0, max);
}
