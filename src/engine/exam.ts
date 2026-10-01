// Exam readiness, explained: where the student stands on one exam, what is left, and what to do next.
// Pure function over the exam's sessions; the Exam screen only renders it.
import type { DateKey, Exam, Session } from '../domain/types';
import { daysBetween, readiness, type Confidence } from '../lib/exams';

export type TopicState = 'notStarted' | 'learning' | 'solid' | 'weak';
export type Topic = {
  index: number; title: string; state: TopicState; confidence?: Confidence;
  done: number; total: number; nextDate?: DateKey;
};
export type ExamStatus = 'onTrack' | 'behind' | 'atRisk' | 'ready' | 'over';
export type ExamPhase = 'learn' | 'review' | 'final';

export type ExamReport = {
  daysLeft: number;
  readiness: number;
  expected: number; // readiness the plan expected by today
  status: ExamStatus;
  phase: ExamPhase;
  topics: Topic[];
  remaining: { sessions: number; minutes: number; perDay: number };
  overdue: number; // planned for a past day and not done
  next?: Session; // the session to do now
  mock?: Session;
  weakest?: Topic;
};

export function examReport(exam: Exam, all: Session[], today: DateKey): ExamReport {
  const mine = all.filter(s => s.examId === exam.id).sort((a, b) => a.date.localeCompare(b.date) || kindOrder(a) - kindOrder(b));
  const daysLeft = daysBetween(today, exam.date);
  const ready = readiness(exam, all);
  // What the plan expected to be done by now (sessions dated before today), as readiness points.
  const due = mine.filter(s => s.date < today).length;
  const expected = mine.length ? Math.round((due / mine.length) * 90) : 0;

  const topics: Topic[] = exam.chapters.map((title, index) => {
    const ch = mine.filter(s => s.chapter === index);
    const doneList = ch.filter(s => s.done);
    const confidence = [...doneList].sort((a, b) => (a.doneAt ?? a.date).localeCompare(b.doneAt ?? b.date)).pop()?.confidence;
    const state: TopicState = !doneList.length ? 'notStarted' : confidence === 1 ? 'weak' : confidence === 3 && doneList.length >= 2 ? 'solid' : 'learning';
    return { index, title, state, confidence, done: doneList.length, total: ch.length, nextDate: ch.find(s => !s.done)?.date };
  });

  const open = mine.filter(s => !s.done);
  const minutes = open.reduce((a, s) => a + s.minutes, 0);
  const overdue = open.filter(s => s.date < today).length;
  const phase: ExamPhase = open.some(s => s.kind === 'learn') ? 'learn' : open.some(s => s.kind === 'review') ? 'review' : 'final';

  let status: ExamStatus;
  if (daysLeft < 0) status = 'over';
  else if (ready >= 85 || (!open.length && mine.length)) status = 'ready';
  else if (daysLeft <= 3 && ready < 50) status = 'atRisk';
  else if (ready < expected - 15 || overdue >= 2) status = 'behind';
  else status = 'onTrack';

  // Weakest: rated Hard first, then the earliest chapter not started.
  const weakest = topics.find(t => t.state === 'weak') ?? topics.find(t => t.state === 'notStarted');

  return {
    daysLeft, readiness: ready, expected, status, phase, topics,
    remaining: { sessions: open.length, minutes, perDay: daysLeft > 0 ? Math.round(minutes / daysLeft) : minutes },
    overdue,
    next: open.find(s => s.date <= today) ?? open[0],
    mock: mine.find(s => s.kind === 'mock'),
    weakest,
  };
}

const kindOrder = (s: Session) => (s.kind === 'learn' ? 0 : s.kind === 'review' ? 1 : 2);
