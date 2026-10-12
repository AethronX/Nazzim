// Topic mastery and spaced review.
//
// The rule that makes this honest: reading a topic never proves mastery. Only a recorded retrieval attempt
// moves a topic forward. A topic you only opened stays 'learning' with its old mastery.
//
// Intervals follow the spec's ladder — 1 day, 3 days, 7 days — and then keep expanding while the student
// keeps succeeding. A failure sends the topic back to tomorrow. Everything is compressed so no review lands
// after the exam it is meant to prepare for.

import type { DateKey, Topic, TopicStatus } from '../domain/types';
import { addDays, daysBetween } from '../lib/exams';

/** What a retrieval attempt scored: 0 forgot, 1 almost, 2 knew it. Same vocabulary the recall cards use. */
export type Recall = 0 | 1 | 2;

export const LADDER = [1, 3, 7] as const; // first three gaps, in days
export const EASE_UP = 1.9;   // multiplier once past the ladder
export const MASTERED_REPS = 3; // consecutive successes before a topic reads as mastered
export const MASTERY_CAP = 0.95;

/** Mastery 0–1 from recorded attempts only. A topic with no attempt has no mastery to report. */
export function mastery(t: Topic): number | undefined {
  const attempts = t.correct + t.wrong;
  if (attempts === 0) return undefined;
  const accuracy = t.correct / attempts;
  // Consistency outweighs a single lucky answer: one success reads 0.6, two 0.8, three 0.95 (the cap).
  const depth = Math.min(1, t.reps / MASTERED_REPS);
  return Math.min(MASTERY_CAP, accuracy * (0.4 + 0.6 * depth));
}

/** The gap in days before the next review, given how many successes are banked. */
export function gapFor(reps: number): number {
  if (reps <= 0) return 1;
  if (reps <= LADDER.length) return LADDER[reps - 1];
  return Math.round(LADDER[LADDER.length - 1] * Math.pow(EASE_UP, reps - LADDER.length));
}

export function statusFor(t: Pick<Topic, 'reps' | 'correct' | 'wrong'>): TopicStatus {
  if (t.correct + t.wrong === 0) return 'new';
  if (t.reps >= MASTERED_REPS) return 'mastered';
  if (t.reps >= 1) return 'reviewed';
  return 'learning';
}

/**
 * Record one retrieval attempt and schedule the next review.
 * `examDate` compresses the schedule: a 14-day gap is useless for an exam in 4 days.
 */
export function review(t: Topic, grade: Recall, today: DateKey, examDate?: string): Topic {
  const ok = grade === 2;
  const partial = grade === 1;
  const reps = ok ? t.reps + 1 : partial ? t.reps : 0;
  const correct = t.correct + (ok ? 1 : 0);
  const wrong = t.wrong + (ok ? 0 : 1);
  let gap = ok ? gapFor(reps) : partial ? 2 : 1;
  if (examDate) {
    const left = daysBetween(today, examDate);
    if (left >= 1) gap = Math.max(1, Math.min(gap, Math.ceil(left / 2)));
  }
  const next: Topic = {
    ...t, reps, correct, wrong,
    lastStudied: today,
    nextReview: addDays(today, gap),
    lastScore: grade / 2,
    status: statusFor({ reps, correct, wrong }),
  };
  return next;
}

/** Topics whose review is due (or overdue) today, weakest and most overdue first. */
export function dueTopics(topics: Topic[], today: DateKey, subjectId?: string): Topic[] {
  return topics
    .filter(t => (!subjectId || t.subjectId === subjectId) && !!t.nextReview && t.nextReview <= today)
    .sort((a, b) => {
      const overdue = (a.nextReview! < b.nextReview! ? -1 : a.nextReview! > b.nextReview! ? 1 : 0);
      if (overdue !== 0) return overdue;
      return (mastery(a) ?? 0) - (mastery(b) ?? 0);
    });
}

/** Topics never attempted — the content gap, as opposed to the review backlog. */
export function untouched(topics: Topic[], subjectId?: string): Topic[] {
  return topics.filter(t => (!subjectId || t.subjectId === subjectId) && t.correct + t.wrong === 0);
}

export type TopicStats = {
  total: number; mastered: number; due: number; untouched: number;
  coverage: number;  // share of topics with at least one recorded attempt (0–1)
  mastery: number;   // mean mastery across attempted topics (0–1); 0 when none attempted
};

export function topicStats(topics: Topic[], today: DateKey, subjectId?: string): TopicStats {
  const list = subjectId ? topics.filter(t => t.subjectId === subjectId) : topics;
  const attempted = list.filter(t => t.correct + t.wrong > 0);
  const ms = attempted.map(t => mastery(t) ?? 0);
  return {
    total: list.length,
    mastered: list.filter(t => t.status === 'mastered').length,
    due: dueTopics(list, today, subjectId).length,
    untouched: untouched(list, subjectId).length,
    coverage: list.length ? attempted.length / list.length : 0,
    mastery: ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : 0,
  };
}

/** A fresh topic, never pre-marked as studied. */
export function newTopic(subjectId: string, name: string, id: string): Topic {
  return { id, subjectId, name: name.trim(), status: 'new', reps: 0, correct: 0, wrong: 0 };
}
