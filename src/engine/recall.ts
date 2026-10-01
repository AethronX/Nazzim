// Retrieval practice: the part of studying that actually moves exam performance, and the only evidence
// Nazzim accepts that a student can recall a chapter rather than merely having sat in front of it.
//
// Why this shape:
//  · Testing yourself beats re-reading by a wide margin (Roediger & Karpicke, 2006; Dunlosky et al., 2013),
//    and writing your own cards is itself a strong encoding step — so the student authors them, not an AI.
//  · The answer must be typed before the key is revealed. That is deliberate friction: self-grading is only
//    honest when you have already committed to an answer, and it makes a fake "I knew it" cost more than
//    actually trying.
//  · Spacing is SM-2 shaped but compressed: intervals are clamped to the days left before the exam, because
//    a 10-day interval is useless for an exam in 4 days.
import type { DateKey } from '../domain/types';
import { addDays, daysBetween } from '../lib/exams';

export type Grade = 0 | 1 | 2; // forgot · almost · knew it

export type Card = {
  id: string;
  examId: string;
  chapter: number;
  q: string;
  a: string;
  reps: number; // consecutive successful recalls
  ease: number; // 1.3 … 2.8, how fast the interval grows
  due: DateKey;
  lastGrade?: Grade;
  lastAt?: DateKey;
};

export const EASE_START = 2.3;
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;

export function newCard(examId: string, chapter: number, q: string, a: string, id: string, today: DateKey): Card {
  return { id, examId, chapter, q, a, reps: 0, ease: EASE_START, due: today };
}

// SM-2 lite. `examDate` compresses the schedule so no interval lands after the exam.
export function review(card: Card, grade: Grade, today: DateKey, examDate?: string): Card {
  const reps = grade === 0 ? 0 : card.reps + 1;
  const ease = Math.max(EASE_MIN, Math.min(EASE_MAX, card.ease + (grade === 2 ? 0.1 : grade === 1 ? -0.05 : -0.25)));
  let gap = grade === 0 ? 1 : reps === 1 ? 1 : reps === 2 ? 3 : Math.round((reps - 1) * ease);
  if (examDate) {
    const left = daysBetween(today, examDate);
    if (left >= 1) gap = Math.max(1, Math.min(gap, Math.ceil(left / 2)));
  }
  return { ...card, reps, ease, due: addDays(today, gap), lastGrade: grade, lastAt: today };
}

// How well one card is known, 0..1. A card never attempted contributes nothing and is counted as untested.
export function mastery(card: Card): number | undefined {
  if (card.lastGrade === undefined) return undefined;
  if (card.lastGrade === 0) return 0.15;
  if (card.lastGrade === 1) return 0.5;
  return Math.min(1, 0.65 + 0.15 * Math.min(card.reps, 3)); // repeated success earns the top of the range
}

/**
 * A chapter's recall score, 0..1 — or undefined when the student has never tested themselves on it.
 * Untested cards drag the score down rather than being ignored: a chapter is only as recalled as its
 * weakest known part, and pretending otherwise is how the old readiness number lied.
 */
export function chapterRecall(cards: Card[], examId: string, chapter: number): number | undefined {
  const mine = cards.filter(c => c.examId === examId && c.chapter === chapter);
  if (!mine.length) return undefined;
  const scores = mine.map(mastery);
  if (scores.every(s => s === undefined)) return undefined;
  return scores.reduce((a: number, s) => a + (s ?? 0), 0) / mine.length;
}

/** Cards due today (or overdue), weakest first, capped so a session stays finishable. */
export function dueCards(cards: Card[], examId: string, today: DateKey, limit = 20): Card[] {
  return cards
    .filter(c => c.examId === examId && c.due <= today)
    .sort((a, b) => (mastery(a) ?? -1) - (mastery(b) ?? -1) || a.due.localeCompare(b.due))
    .slice(0, limit);
}

export type RecallStats = { total: number; due: number; tested: number; untested: number; score?: number };

export function recallStats(cards: Card[], examId: string, today: DateKey): RecallStats {
  const mine = cards.filter(c => c.examId === examId);
  const tested = mine.filter(c => c.lastGrade !== undefined);
  return {
    total: mine.length,
    due: mine.filter(c => c.due <= today).length,
    tested: tested.length,
    untested: mine.length - tested.length,
    score: mine.length ? mine.reduce((a, c) => a + (mastery(c) ?? 0), 0) / mine.length : undefined,
  };
}
