// One timeline: lectures, assessments, revision sessions, reviews and re-tests, merged and de-duplicated.
//
// Everything carries where it came from, so an entry whose date the student has not confirmed can say so
// instead of looking as certain as a syllabus date.

import type { Assessment, DateKey, Exam, StudyError, Task, Topic } from '../domain/types';
import { daysBetween } from '../lib/exams';

export type CalKind = 'assessment' | 'exam' | 'task' | 'session' | 'review' | 'retest';
export type CalEntry = {
  id: string;
  kind: CalKind;
  date: DateKey;
  title: string;
  subjectId?: string;
  /** Marked when the underlying record is not confirmed, so the UI can flag it rather than imply certainty. */
  unconfirmed?: boolean;
  weight?: number;   // for assessments: what it is worth
  daysAway: number;
};

export type CalendarInput = {
  today: DateKey;
  assessments: Assessment[];
  exams: Pick<Exam, 'id' | 'subject' | 'subjectId' | 'date'>[];
  tasks: Task[];
  topics: Topic[];
  errors: StudyError[];
  /** How far ahead to look. */
  days?: number;
};

export const DEFAULT_HORIZON = 60;

export function buildCalendar(input: CalendarInput): CalEntry[] {
  const { today, assessments, exams, tasks, topics, errors } = input;
  const horizon = input.days ?? DEFAULT_HORIZON;
  const within = (d?: string) => {
    if (!d) return false;
    const n = daysBetween(today, d);
    return Number.isFinite(n) && n >= 0 && n <= horizon;
  };
  const out: CalEntry[] = [];
  const push = (e: Omit<CalEntry, 'daysAway'>) => out.push({ ...e, daysAway: daysBetween(today, e.date) });

  for (const a of assessments) {
    if (a.status === 'graded' || !within(a.due)) continue;
    push({ id: `as-${a.id}`, kind: 'assessment', date: a.due!, title: a.name, subjectId: a.subjectId, weight: a.weight, unconfirmed: a.source === 'unconfirmed' });
  }
  // An exam that already has a dated assessment of the same name would double up; key on date+subject.
  const assessmentKeys = new Set(out.map(e => `${e.subjectId ?? ''}|${e.date}`));
  for (const e of exams) {
    if (!within(e.date) || assessmentKeys.has(`${e.subjectId ?? ''}|${e.date}`)) continue;
    push({ id: `ex-${e.id}`, kind: 'exam', date: e.date, title: e.subject, subjectId: e.subjectId });
  }
  for (const t of tasks) {
    if (t.done || !within(t.due)) continue;
    push({ id: `tk-${t.id}`, kind: 'task', date: t.due, title: t.title, subjectId: t.subjectId });
  }
  for (const t of topics) {
    if (!within(t.nextReview)) continue;
    push({ id: `tp-${t.id}`, kind: 'review', date: t.nextReview!, title: t.name, subjectId: t.subjectId });
  }
  for (const e of errors) {
    if (e.resolved || !within(e.retryOn)) continue;
    push({ id: `er-${e.id}`, kind: 'retest', date: e.retryOn!, title: e.question, subjectId: e.subjectId });
  }

  const order: Record<CalKind, number> = { exam: 0, assessment: 1, task: 2, retest: 3, review: 4, session: 5 };
  return out.sort((a, b) => a.date.localeCompare(b.date) || order[a.kind] - order[b.kind] || a.title.localeCompare(b.title));
}

/** Group a calendar into days, in order, skipping empty days. */
export function byDay(entries: CalEntry[]): { date: DateKey; daysAway: number; items: CalEntry[] }[] {
  const map = new Map<DateKey, CalEntry[]>();
  for (const e of entries) {
    const list = map.get(e.date);
    if (list) list.push(e);
    else map.set(e.date, [e]);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, items]) => ({ date, daysAway: items[0].daysAway, items }));
}
