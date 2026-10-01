// Academic engine: pure functions over AcademicContext. No React, no storage, no network,
// so they run the same on the phone, in tests and (later) on the server.
import { workDay, type AcademicContext, type DateKey, type Exam, type Subject, type Task } from '../domain/types';
import { addDays, daysBetween, readiness } from '../lib/exams';

// ── "What should I do right now?" ──────────────────────────────────────────────────────────

export type NextReason =
  | { code: 'overdue'; days: number }
  | { code: 'examSoon'; days: number; exam: string }
  | { code: 'dueToday' }
  | { code: 'dueTomorrow' }
  | { code: 'planned' };

export type NextAction =
  | { kind: 'session'; id: string; subjectId?: string; examId: string; title: string; minutes: number; reason: NextReason }
  | { kind: 'task'; id: string; subjectId?: string; title: string; minutes: number; reason: NextReason }
  | { kind: 'addExam' } // nothing scheduled and no exams: the best move is to plan one
  | { kind: 'clear' }; // everything for today is done

type Candidate = { score: number; action: Exclude<NextAction, { kind: 'addExam' } | { kind: 'clear' }> };

// Scores urgency: overdue first, then exams closest in time, then what is due today.
export function recommendNextAction(ctx: AcademicContext, chapterTitle: (s: AcademicContext['sessions'][number], e?: Exam) => string): NextAction {
  const { today } = ctx;
  const examById = new Map(ctx.exams.map(e => [e.id, e]));
  const cands: Candidate[] = [];

  for (const s of ctx.sessions) {
    if (s.done || s.date > today) continue;
    const exam = examById.get(s.examId);
    if (!exam) continue;
    const days = Math.max(0, daysBetween(today, exam.date));
    cands.push({
      score: 100 - days * 8 + (s.kind === 'mock' ? 6 : s.kind === 'learn' ? 4 : 0),
      action: {
        kind: 'session', id: s.id, examId: exam.id, subjectId: exam.subjectId, title: chapterTitle(s, exam), minutes: s.minutes,
        reason: days <= 7 ? { code: 'examSoon', days, exam: exam.subject } : { code: 'planned' },
      },
    });
  }
  for (const t of ctx.tasks) {
    if (t.done || daysBetween(today, workDay(t)) > 1) continue;
    const d = daysBetween(today, t.due);
    const reason: NextReason = d < 0 ? { code: 'overdue', days: -d } : d === 0 ? { code: 'dueToday' } : d === 1 ? { code: 'dueTomorrow' } : { code: 'planned' };
    // A task rescheduled to a later day waits its turn; one planned for today competes as "due today".
    const later = workDay(t) > today;
    cands.push({
      score: later ? 60 : d < 0 ? 120 + Math.min(-d, 10) : d === 0 ? 95 : workDay(t) === today ? 90 : 70,
      action: { kind: 'task', id: t.id, subjectId: t.subjectId, title: t.title, minutes: t.estimateMin, reason },
    });
  }
  if (!cands.length) {
    const upcoming = ctx.exams.some(e => e.date > today);
    return upcoming ? { kind: 'clear' } : { kind: 'addExam' };
  }
  cands.sort((a, b) => b.score - a.score);
  return cands[0].action;
}

// ── Today's agenda ──────────────────────────────────────────────────────────────────────────

export type AgendaItem = {
  key: string; kind: 'session' | 'task' | 'exam'; refId: string; subjectId?: string;
  title: string; detail: string; minutes: number; done: boolean; start?: string; end?: string;
};

const toHM = (min: number) => `${String(Math.floor(min / 60) % 24).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

// Everything for one day, laid out back to back from the student's study start time (default 16:00),
// with a 10-minute break between blocks. Exams sit at the top.
export function agendaFor(ctx: AcademicContext, day: DateKey, label: { exam: string; task: string; kind: (k: 'learn' | 'review' | 'mock') => string }, chapterTitle: (s: AcademicContext['sessions'][number], e?: Exam) => string, startMin = 16 * 60): AgendaItem[] {
  const examById = new Map(ctx.exams.map(e => [e.id, e]));
  const items: AgendaItem[] = [];
  for (const e of ctx.exams.filter(x => x.date === day)) {
    items.push({ key: 'x' + e.id, kind: 'exam', refId: e.id, subjectId: e.subjectId, title: e.subject, detail: label.exam, minutes: 0, done: false });
  }
  const blocks: AgendaItem[] = [];
  for (const s of ctx.sessions.filter(x => x.date === day)) {
    const exam = examById.get(s.examId);
    blocks.push({ key: 's' + s.id, kind: 'session', refId: s.id, subjectId: exam?.subjectId, title: chapterTitle(s, exam), detail: `${exam?.subject ?? ''} · ${label.kind(s.kind)}`, minutes: s.minutes, done: s.done });
  }
  for (const t of ctx.tasks.filter(x => workDay(x) === day)) {
    blocks.push({ key: 't' + t.id, kind: 'task', refId: t.id, subjectId: t.subjectId, title: t.title, detail: label.task, minutes: t.estimateMin, done: t.done });
  }
  let cursor = startMin;
  for (const b of blocks) {
    b.start = toHM(cursor); b.end = toHM(cursor + b.minutes);
    cursor += b.minutes + 10;
  }
  return [...items, ...blocks];
}

// ── Academic load ───────────────────────────────────────────────────────────────────────────

export type LoadLevel = 'light' | 'moderate' | 'heavy';
export type AcademicLoad = { level: LoadLevel; minutesPerDay: number[]; total: number; days: DateKey[] };

// Planned minutes over the next `span` days. Light < 1.5 h/day on average, heavy ≥ 3 h/day or any day ≥ 5 h.
export function analyzeAcademicLoad(ctx: AcademicContext, from: DateKey, span = 7): AcademicLoad {
  const days = Array.from({ length: span }, (_, i) => addDays(from, i));
  const minutesPerDay = days.map(d =>
    ctx.sessions.filter(s => s.date === d && !s.done).reduce((a, s) => a + s.minutes, 0) +
    ctx.tasks.filter(t => workDay(t) === d && !t.done).reduce((a, t) => a + t.estimateMin, 0));
  const total = minutesPerDay.reduce((a, b) => a + b, 0);
  const avg = total / span, peak = Math.max(0, ...minutesPerDay);
  const level: LoadLevel = avg >= 180 || peak >= 300 ? 'heavy' : avg >= 90 ? 'moderate' : 'light';
  return { level, minutesPerDay, total, days };
}

// ── Progress ────────────────────────────────────────────────────────────────────────────────

// Share of a subject's planned work that is done (sessions of its exams + its tasks), 0–100.
export function subjectProgress(ctx: AcademicContext, subjectId: string): number {
  const examIds = new Set(ctx.exams.filter(e => e.subjectId === subjectId).map(e => e.id));
  const sess = ctx.sessions.filter(s => examIds.has(s.examId));
  const tasks = ctx.tasks.filter(t => t.subjectId === subjectId);
  const total = sess.length + tasks.length;
  if (!total) return 0;
  return Math.round(((sess.filter(s => s.done).length + tasks.filter(t => t.done).length) / total) * 100);
}

/**
 * The one headline number: how ready the student is for the exams still ahead, weighted by size.
 * Returns undefined when there is no exam to be ready for, so the UI can say something true instead of 0%.
 *
 * Every screen that shows "how am I doing" shows this. Task completion is a different question and is
 * labelled as such — showing two unlabelled percentages for one subject is what made the old build
 * impossible to trust.
 */
export function overallReadiness(ctx: AcademicContext): number | undefined {
  const upcoming = ctx.exams.filter(e => e.date >= ctx.today);
  if (!upcoming.length) return undefined;
  const weights = upcoming.map(e => Math.max(1, e.chapters.length));
  const sum = upcoming.reduce((a, e, i) => a + readiness(e, ctx.sessions, ctx.today) * weights[i], 0);
  return Math.round(sum / weights.reduce((a, b) => a + b, 0));
}

// Overall semester progress: average of subject progress, weighted by how much work each subject has.
export function semesterProgress(ctx: AcademicContext): number {
  const examIds = new Set(ctx.exams.map(e => e.id));
  const sess = ctx.sessions.filter(s => examIds.has(s.examId));
  const total = sess.length + ctx.tasks.length;
  if (!total) return 0;
  return Math.round(((sess.filter(s => s.done).length + ctx.tasks.filter(t => t.done).length) / total) * 100);
}

export type SubjectSummary = {
  subject: Subject; progress: number; pendingTasks: number; upcomingExams: Exam[];
  nextExam?: Exam; readiness?: number; sessionsThisMonth: number;
};

export function summarizeSubject(ctx: AcademicContext, subject: Subject): SubjectSummary {
  const exams = ctx.exams.filter(e => e.subjectId === subject.id);
  const upcomingExams = exams.filter(e => e.date >= ctx.today).sort((a, b) => a.date.localeCompare(b.date));
  const nextExam = upcomingExams[0];
  const examIds = new Set(exams.map(e => e.id));
  const month = ctx.today.slice(0, 7);
  return {
    subject,
    progress: subjectProgress(ctx, subject.id),
    pendingTasks: ctx.tasks.filter(t => t.subjectId === subject.id && !t.done).length,
    upcomingExams,
    nextExam,
    readiness: nextExam ? readiness(nextExam, ctx.sessions) : undefined,
    sessionsThisMonth: ctx.sessions.filter(s => examIds.has(s.examId) && s.date.startsWith(month)).length,
  };
}

// Open tasks whose day on the schedule has passed (not yet rescheduled); the input to Rescue Mode.
export function overdueTasks(ctx: AcademicContext): Task[] {
  return ctx.tasks.filter(t => !t.done && workDay(t) < ctx.today);
}
