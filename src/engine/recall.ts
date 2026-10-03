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
import type { Evidence } from './answer';

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
  lastGrade?: Grade; // what the STUDENT chose — always kept, always what the UI shows
  scoredGrade?: Grade; // what the evidence supports — what `mastery` reads. Written only at grade time.
  evidence?: Evidence; // how that grade was corroborated; absent on cards graded before verification existed
  lastAt?: DateKey;
};

export const EASE_START = 2.3;
const EASE_MIN = 1.3;
const EASE_MAX = 2.8;

/** Cards of a chapter needed for full recall confidence. One card can never stand for a whole chapter. */
export const MIN_CARDS = 3;
/** A self-reported "knew it" is worth half a corroborated one when measuring how much of a chapter was tested. */
export const SELF_WEIGHT = 0.5;
/** No single card is ever fully mastered: certainty about a chapter is not available from one question. */
export const MASTERY_MAX = 0.85;

export function newCard(examId: string, chapter: number, q: string, a: string, id: string, today: DateKey): Card {
  return { id, examId, chapter, q, a, reps: 0, ease: EASE_START, due: today };
}

/** Which grade the evidence supports. A claimed "knew it" that nothing corroborates is scored as "almost". */
const scoredFor = (grade: Grade, evidence?: Evidence): Grade => (grade === 2 && evidence === 'self' ? 1 : grade);

// SM-2 lite. `examDate` compresses the schedule so no interval lands after the exam. `evidence` comes from
// `classify()` in ./answer.ts; when it is absent no verification was attempted and the grade stands as given.
export function review(card: Card, grade: Grade, today: DateKey, examDate?: string, evidence?: Evidence): Card {
  const scored = scoredFor(grade, evidence);
  const reps = scored === 0 ? 0 : card.reps + 1;
  const ease = Math.max(EASE_MIN, Math.min(EASE_MAX, card.ease + (scored === 2 ? 0.1 : scored === 1 ? -0.05 : -0.25)));
  let gap = scored === 0 ? 1 : reps === 1 ? 1 : reps === 2 ? 3 : Math.round((reps - 1) * ease);
  if (examDate) {
    const left = daysBetween(today, examDate);
    if (left >= 1) gap = Math.max(1, Math.min(gap, Math.ceil(left / 2)));
  }
  return { ...card, reps, ease, due: addDays(today, gap), lastGrade: grade, scoredGrade: scored, evidence: evidence ?? card.evidence, lastAt: today };
}

/** The grade the score is built from: the evidence-supported one when there is one, else what was chosen. */
const effectiveGrade = (card: Card): Grade | undefined => card.scoredGrade ?? card.lastGrade;

// How well one card is known, 0..1. A card never attempted contributes nothing and is counted as untested.
// The top of the range is MASTERY_MAX, never 1: repeated success on one question is not certainty.
export function mastery(card: Card): number | undefined {
  const g = effectiveGrade(card);
  if (g === undefined) return undefined;
  if (g === 0) return 0.1;
  if (g === 1) return 0.45;
  return Math.min(MASTERY_MAX, 0.6 + 0.08 * Math.min(card.reps, 3));
}

/**
 * How much of a chapter the student has actually tested, 0..1 — the `q` in the evidence formula.
 *
 * It is a measure of *breadth of testing*, deliberately separate from `chapterRecall`, which measures how
 * well those cards went. One self-graded card gives 0.17; three corroborated ones give 1. This is what stops
 * eight taps on four cards from standing in for a studied syllabus.
 */
export function chapterRecallConfidence(cards: Card[], examId: string, chapter: number): number {
  const graded = cards.filter(c => c.examId === examId && c.chapter === chapter && effectiveGrade(c) !== undefined);
  const weight = graded.reduce((a, c) => a + (c.evidence === 'verified' ? 1 : SELF_WEIGHT), 0);
  return Math.max(0, Math.min(1, weight / MIN_CARDS));
}

export type ExamPhase = 'before' | 'day' | 'after';

/** Where today sits relative to an exam. An unparseable date is treated as still ahead, never as finished. */
export function examPhase(examDate: string, today: DateKey): ExamPhase {
  const left = daysBetween(today, examDate);
  if (!Number.isFinite(left)) return 'before';
  return left > 0 ? 'before' : left === 0 ? 'day' : 'after';
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

/**
 * Cards due today (or overdue), weakest first, capped so a session stays finishable.
 * Pass `examDate` and the list empties once the exam is behind the student: reviewing for an exam already
 * sat is busywork, and leaving the cards permanently due made every exam look unfinished forever.
 * The cards themselves are kept — only their due state ends.
 */
export function dueCards(cards: Card[], examId: string, today: DateKey, limit = 20, examDate?: string): Card[] {
  if (examDate && examPhase(examDate, today) === 'after') return [];
  return cards
    .filter(c => c.examId === examId && c.due <= today)
    .sort((a, b) => (mastery(a) ?? -1) - (mastery(b) ?? -1) || a.due.localeCompare(b.due))
    .slice(0, limit);
}

export type RecallStats = { total: number; due: number; tested: number; untested: number; score?: number };

export function recallStats(cards: Card[], examId: string, today: DateKey, examDate?: string): RecallStats {
  const mine = cards.filter(c => c.examId === examId);
  const tested = mine.filter(c => effectiveGrade(c) !== undefined);
  const over = !!examDate && examPhase(examDate, today) === 'after';
  return {
    total: mine.length,
    due: over ? 0 : mine.filter(c => c.due <= today).length,
    tested: tested.length,
    untested: mine.length - tested.length,
    score: mine.length ? mine.reduce((a, c) => a + (mastery(c) ?? 0), 0) / mine.length : undefined,
  };
}
