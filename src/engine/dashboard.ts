// The dashboard model: one place that answers the ten questions, without collapsing them into one number.
//
// The spec is explicit — content progress, proved mastery, the academic grade and schedule risk are four
// different things and must never be merged into a single misleading percentage. This module computes them
// side by side and says, for each, whether the data behind it is complete enough to trust.

import type { Assessment, AcademicContext, DateKey, DayLog, StudyError, Subject, Topic } from '../domain/types';
import { computeGrade, type GradeResult } from './grades';
import { dueErrors } from './errors';
import { dueTopics, topicStats, type TopicStats } from './topics';
import { daysBetween } from '../lib/exams';
import { weekSummary, type WeekWellbeing } from './wellbeing';

export type SubjectCard = {
  subject: Subject;
  grade: GradeResult;       // the academic grade — earned, required, data status
  topics: TopicStats;       // coverage and proved mastery, kept apart from the grade
  dueReviews: number;
  dueMistakes: number;
  daysToNext: number | null; // days until this subject's next assessment, null when none is dated
  nextName: string | null;
  /** 0–1 risk of falling behind. An estimate from measured signals — never presented as a probability of failing. */
  risk: number;
};

export const RISK_SOON_DAYS = 14;

/**
 * Risk is built only from things the student can act on: marks still undecided, how close the next
 * assessment is, proved weakness, and the backlog. It is an attention ranking, not a prediction.
 */
export function riskOf(args: { grade: GradeResult; topics: TopicStats; daysToNext: number | null; backlog: number }): number {
  const { grade, topics, daysToNext, backlog } = args;
  const stakes = Math.min(1, grade.remainingWeight / 100);
  const proximity = daysToNext === null ? 0 : Math.max(0, 1 - Math.max(0, daysToNext) / RISK_SOON_DAYS);
  const attempted = topics.total - topics.untouched;
  const weakness = attempted > 0 ? 1 - topics.mastery : 0;
  const uncovered = topics.total > 0 ? topics.untouched / topics.total : 0;
  const shortfall = grade.required !== null && grade.required > 0 ? Math.min(1, grade.required / 100) : 0;
  const raw = 0.3 * stakes * proximity + 0.25 * weakness + 0.2 * uncovered + 0.15 * shortfall + 0.1 * backlog;
  return Math.max(0, Math.min(1, raw));
}

export function subjectCards(args: {
  subjects: Subject[]; assessments: Assessment[]; topics: Topic[]; errors: StudyError[];
  gradeTargets: Record<string, number>; defaultTarget: number; today: DateKey;
}): SubjectCard[] {
  const { subjects, assessments, topics, errors, gradeTargets, defaultTarget, today } = args;
  return subjects
    .map(subject => {
      const mine = assessments.filter(a => a.subjectId === subject.id);
      const grade = computeGrade(mine, gradeTargets[subject.id] ?? defaultTarget);
      const ts = topicStats(topics, today, subject.id);
      const dueReviews = dueTopics(topics, today, subject.id).length;
      const dueMistakes = dueErrors(errors, today, subject.id).length;
      // The next dated assessment that has not been graded yet.
      const next = mine
        .filter(a => a.status !== 'graded' && !!a.due && a.due >= today)
        .sort((a, b) => a.due!.localeCompare(b.due!))[0];
      const daysToNext = next?.due ? daysBetween(today, next.due) : null;
      const backlog = Math.min(1, (dueReviews + dueMistakes) / 5);
      return {
        subject, grade, topics: ts, dueReviews, dueMistakes,
        daysToNext: daysToNext !== null && Number.isFinite(daysToNext) ? daysToNext : null,
        nextName: next?.name ?? null,
        risk: riskOf({ grade, topics: ts, daysToNext: next?.due ? daysBetween(today, next.due) : null, backlog }),
      };
    })
    .sort((a, b) => b.risk - a.risk);
}

export type WeekPulse = {
  tasksDone: number; tasksOpen: number; tasksOverdue: number;
  focusMinutes: number;
  reviewsDue: number; mistakesDue: number;
  wellbeing: WeekWellbeing;
};

export function weekPulse(args: {
  ctx: AcademicContext; topics: Topic[]; errors: StudyError[];
  focusLog: Record<string, number>; dayLogs: Record<string, DayLog>; today: DateKey;
}): WeekPulse {
  const { ctx, topics, errors, focusLog, dayLogs, today } = args;
  const weekAgo = addDaysLocal(today, -6);
  const focusMinutes = Object.entries(focusLog)
    .filter(([day]) => day >= weekAgo && day <= today)
    .reduce((t, [, m]) => t + m, 0);
  return {
    tasksDone: ctx.tasks.filter(t => t.done && t.doneAt && t.doneAt >= weekAgo).length,
    tasksOpen: ctx.tasks.filter(t => !t.done).length,
    tasksOverdue: ctx.tasks.filter(t => !t.done && t.due < today).length,
    focusMinutes,
    reviewsDue: dueTopics(topics, today).length,
    mistakesDue: dueErrors(errors, today).length,
    wellbeing: weekSummary(dayLogs, today),
  };
}

// Local copy to avoid importing the date helpers' whole surface into the dashboard model.
function addDaysLocal(key: DateKey, n: number): DateKey {
  const [y, m, d] = key.split('-').map(Number);
  const dt = new Date(y, m - 1, d + n);
  const p = (x: number) => String(x).padStart(2, '0');
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}
