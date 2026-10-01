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
  const ready = readiness(exam, all, today);
  // What the plan expected by now, expressed in the SAME currency as the score it is compared against.
  //
  // A fixed fraction of 90 used to work when readiness was just a tick count. It cannot now: evidence-based
  // readiness tops out around the effort ceiling for a student who follows the plan perfectly but never
  // self-tests, so a constant bar would mark every diligent student "behind". Instead we simulate the model
  // student — every session due so far done, with the planned minutes actually focused, and no extra
  // self-testing — and score them with the same function. The bar then moves with the formula automatically.
  const modelStudent = mine.map(s =>
    s.date < today ? { ...s, done: true, doneAt: s.date, focusedMin: s.minutes } : { ...s, done: false, focusedMin: undefined });
  const expected = readiness({ ...exam, recall: undefined }, modelStudent, today);

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

  // Thresholds are relative to `expected`, never to an absolute number, for the same reason.
  let status: ExamStatus;
  if (daysLeft < 0) status = 'over';
  else if (!open.length && mine.length && ready >= expected * 0.9) status = 'ready';
  else if (ready >= 85) status = 'ready';
  else if (daysLeft <= 3 && ready < expected * 0.6) status = 'atRisk';
  else if (ready < expected * 0.7 || overdue >= 2) status = 'behind';
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
