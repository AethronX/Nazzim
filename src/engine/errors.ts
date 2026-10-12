// Error log analysis.
//
// Collecting mistakes is easy and useless on its own. What changes a grade is seeing the PATTERN: which kind
// of mistake costs you most, in which subject, and which specific errors keep coming back. The spec is
// explicit that study hours are not the measure of learning — repeated-error counts and re-test outcomes are.

import type { DateKey, ErrorKind, StudyError } from '../domain/types';
import { addDays } from '../lib/exams';

export const ERROR_KINDS: ErrorKind[] = ['concept', 'formula', 'calculation', 'interpretation', 'rushing'];
export const RETRY_GAP = 2;      // days before the first re-test of a logged mistake
export const REPEAT_GAP = 1;     // a mistake that came back again is re-tested sooner
export const CHRONIC_REPEATS = 2; // repeated this many times or more = a pattern, not a slip

export function newError(subjectId: string, question: string, kind: ErrorKind, today: DateKey, id: string, extra: Partial<StudyError> = {}): StudyError {
  return {
    id, subjectId, question: question.trim(), kind,
    repeats: 0, resolved: false, createdAt: today,
    retryOn: addDays(today, RETRY_GAP),
    ...extra,
  };
}

/** The student got it wrong again: it is now a pattern, and comes back sooner. */
export function repeated(e: StudyError, today: DateKey): StudyError {
  return { ...e, repeats: e.repeats + 1, resolved: false, retryOn: addDays(today, REPEAT_GAP) };
}

/** Re-tested correctly. Resolved, but the history (repeats) is kept — it is why the topic is fragile. */
export function resolve(e: StudyError): StudyError {
  return { ...e, resolved: true, retryOn: undefined };
}

/** Mistakes due for a re-test today, most-repeated first so the chronic ones are faced first. */
export function dueErrors(errors: StudyError[], today: DateKey, subjectId?: string): StudyError[] {
  return errors
    .filter(e => !e.resolved && !!e.retryOn && e.retryOn <= today && (!subjectId || e.subjectId === subjectId))
    .sort((a, b) => b.repeats - a.repeats || a.retryOn!.localeCompare(b.retryOn!));
}

export type KindCount = { kind: ErrorKind; count: number; repeats: number };

/** Which kinds of mistake dominate — the report the spec asks for, ranked. */
export function byKind(errors: StudyError[], subjectId?: string): KindCount[] {
  const list = subjectId ? errors.filter(e => e.subjectId === subjectId) : errors;
  return ERROR_KINDS
    .map(kind => {
      const of = list.filter(e => e.kind === kind);
      return { kind, count: of.length, repeats: of.reduce((t, e) => t + e.repeats, 0) };
    })
    .filter(k => k.count > 0)
    .sort((a, b) => b.repeats - a.repeats || b.count - a.count);
}

export type ErrorSummary = {
  total: number; open: number; resolved: number; due: number; chronic: number;
  topKind: ErrorKind | null;
  /** 0–1: share of logged mistakes already re-tested correctly — improvement, not hours studied. */
  resolvedRate: number;
};

export function summarize(errors: StudyError[], today: DateKey, subjectId?: string): ErrorSummary {
  const list = subjectId ? errors.filter(e => e.subjectId === subjectId) : errors;
  const resolved = list.filter(e => e.resolved).length;
  const kinds = byKind(list);
  return {
    total: list.length,
    open: list.filter(e => !e.resolved).length,
    resolved,
    due: dueErrors(list, today, subjectId).length,
    chronic: list.filter(e => e.repeats >= CHRONIC_REPEATS).length,
    topKind: kinds.length ? kinds[0].kind : null,
    resolvedRate: list.length ? resolved / list.length : 0,
  };
}
