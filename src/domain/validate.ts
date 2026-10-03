// Boundary validation for everything that enters the app from outside its own code: a form, another device
// over sync, or a storage blob written by an older build.
//
// Why hand-written and not a schema library: the job here is not to reject, it is to REPAIR or QUARANTINE.
// A pulled row with 90 minutes stored as "90" should be fixed and applied; a row with an unparseable exam
// date must be set aside without taking the rest of the sync down with it. A parse-or-throw validator would
// still need all of that logic written around it, so a dependency would buy nothing. ~150 lines, no imports
// beyond the project's own date helpers, and it runs in the existing Node test harness unchanged.
import type { Card } from '../engine/recall';
import { fromKey, toKey } from '../lib/exams';
import type { DateKey, Exam, Session, Subject, Task } from './types';

export type Check<T> = { ok: true; value: T; repaired?: string[] } | { ok: false; reason: string };

const fail = (reason: string): Check<never> => ({ ok: false, reason });

// ── Primitives ──────────────────────────────────────────────────────────────────────────────────

/** A real local calendar day. The round-trip rejects '2026-02-31', which the regex alone accepts. */
export function isDateKey(v: unknown): v is DateKey {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = fromKey(v);
  return Number.isFinite(d.getTime()) && toKey(d) === v;
}

export const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

/** Coerce a number that may have been stored as a string, rejecting NaN and Infinity either way. */
export function num(v: unknown): number | undefined {
  if (isFiniteNum(v)) return v;
  if (typeof v === 'string' && v.trim() !== '') {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  return undefined;
}

export const inRange = (v: unknown, min: number, max: number): v is number => isFiniteNum(v) && v >= min && v <= max;
export const isId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 64;
export const isText = (v: unknown, max = 500): v is string => typeof v === 'string' && v.trim().length > 0 && v.length <= max;
export const oneOf = <T extends string>(v: unknown, allowed: readonly T[]): v is T => typeof v === 'string' && (allowed as readonly string[]).includes(v);

/** Clamp into range, or undefined when there is no number at all to clamp. */
export function clampNum(v: unknown, min: number, max: number): number | undefined {
  const n = num(v);
  return n === undefined ? undefined : Math.min(max, Math.max(min, n));
}

// ── Domain limits. Deliberately generous: these catch corruption, not unusual study habits. ──
export const LIMITS = {
  minutes: [1, 600] as const, // one session or task
  chapters: [1, 80] as const,
  textLen: 500,
  notesLen: 2000,
  examDays: [-3650, 3650] as const, // ten years either side of today; beyond that the date is noise
};

const COLORS = ['indigo', 'green', 'amber', 'sky', 'rose', 'teal', 'violet'] as const;
const ICONS = ['chart', 'function', 'atom', 'code', 'book', 'flask', 'globe', 'pen'] as const;
const KINDS = ['learn', 'review', 'mock'] as const;
const PRIORITIES = ['high', 'normal', 'low'] as const;

// ── Entities ────────────────────────────────────────────────────────────────────────────────────

export function checkSubject(v: unknown): Check<Subject> {
  if (!v || typeof v !== 'object') return fail('not an object');
  const r = v as Record<string, unknown>;
  if (!isId(r.id)) return fail('bad id');
  if (!isText(r.name, LIMITS.textLen)) return fail('empty name');
  const repaired: string[] = [];
  let color = r.color as Subject['color'];
  if (!oneOf(r.color, COLORS)) { color = 'indigo'; repaired.push('color'); }
  let icon = r.icon as Subject['icon'];
  if (!oneOf(r.icon, ICONS)) { icon = 'book'; repaired.push('icon'); }
  const targetGrade = isText(r.targetGrade, 8) ? (r.targetGrade as string) : 'A';
  if (targetGrade !== r.targetGrade) repaired.push('targetGrade');
  const difficulty = inRange(r.difficulty, 1, 3) ? (Math.round(r.difficulty as number) as 1 | 2 | 3) : undefined;
  return { ok: true, value: { id: r.id, name: (r.name as string).trim(), color, icon, targetGrade, ...(difficulty ? { difficulty } : {}) }, repaired };
}

export function checkTask(v: unknown): Check<Task> {
  if (!v || typeof v !== 'object') return fail('not an object');
  const r = v as Record<string, unknown>;
  if (!isId(r.id)) return fail('bad id');
  if (!isText(r.title, LIMITS.textLen)) return fail('empty title');
  if (!isDateKey(r.due)) return fail(`bad due date ${JSON.stringify(r.due)}`);
  const repaired: string[] = [];
  let estimateMin = clampNum(r.estimateMin, LIMITS.minutes[0], LIMITS.minutes[1]);
  if (estimateMin === undefined) { estimateMin = 30; repaired.push('estimateMin'); }
  else if (estimateMin !== r.estimateMin) repaired.push('estimateMin');
  const plannedFor = isDateKey(r.plannedFor) ? r.plannedFor : undefined;
  if (r.plannedFor !== undefined && plannedFor === undefined) repaired.push('plannedFor');
  const doneAt = isDateKey(r.doneAt) ? r.doneAt : undefined;
  // Unknown priorities fall back to normal rather than rejecting the row: it is a preference, not identity.
  const priority = oneOf(r.priority, PRIORITIES) && r.priority !== 'normal' ? r.priority : undefined;
  if (r.priority !== undefined && r.priority !== 'normal' && priority === undefined) repaired.push('priority');
  const notes = typeof r.notes === 'string' && r.notes.trim() ? r.notes.trim().slice(0, LIMITS.notesLen) : undefined;
  return {
    ok: true,
    value: {
      id: r.id, title: (r.title as string).trim(), due: r.due, estimateMin: Math.round(estimateMin),
      done: r.done === true, ...(isId(r.subjectId) ? { subjectId: r.subjectId } : {}),
      ...(doneAt ? { doneAt } : {}), ...(plannedFor ? { plannedFor } : {}),
      ...(priority ? { priority } : {}), ...(notes ? { notes } : {}),
    },
    repaired,
  };
}

export function checkExam(v: unknown): Check<Exam> {
  if (!v || typeof v !== 'object') return fail('not an object');
  const r = v as Record<string, unknown>;
  if (!isId(r.id)) return fail('bad id');
  if (!isText(r.subject, LIMITS.textLen)) return fail('empty subject');
  // An exam with no usable date cannot be planned, scored or sorted: there is nothing to repair it to.
  if (!isDateKey(r.date)) return fail(`bad exam date ${JSON.stringify(r.date)}`);
  if (!Array.isArray(r.chapters)) return fail('chapters is not an array');
  const chapters = r.chapters.filter(c => isText(c, LIMITS.textLen)).map(c => (c as string).trim()).slice(0, LIMITS.chapters[1]);
  if (!chapters.length) return fail('no usable chapters');
  const repaired = chapters.length !== r.chapters.length ? ['chapters'] : [];
  return { ok: true, value: { id: r.id, subject: (r.subject as string).trim(), date: r.date, chapters, ...(isId(r.subjectId) ? { subjectId: r.subjectId } : {}) }, repaired };
}

export function checkSession(v: unknown): Check<Session> {
  if (!v || typeof v !== 'object') return fail('not an object');
  const r = v as Record<string, unknown>;
  if (!isId(r.id) || !isId(r.examId)) return fail('bad id');
  if (!isDateKey(r.date)) return fail(`bad date ${JSON.stringify(r.date)}`);
  if (!oneOf(r.kind, KINDS)) return fail(`unknown kind ${JSON.stringify(r.kind)}`);
  const chapter = num(r.chapter);
  if (chapter === undefined || !Number.isInteger(chapter) || chapter < -1) return fail(`bad chapter ${JSON.stringify(r.chapter)}`);
  const repaired: string[] = [];
  let minutes = clampNum(r.minutes, LIMITS.minutes[0], LIMITS.minutes[1]);
  if (minutes === undefined) { minutes = 30; repaired.push('minutes'); }
  else if (minutes !== r.minutes) repaired.push('minutes');
  // Focused minutes can never exceed what the block planned: that is the one bound the integrity rests on.
  const focusedMin = clampNum(r.focusedMin, 0, minutes);
  if (r.focusedMin !== undefined && focusedMin !== r.focusedMin) repaired.push('focusedMin');
  const confidence = inRange(r.confidence, 1, 3) ? (Math.round(r.confidence as number) as 1 | 2 | 3) : undefined;
  return {
    ok: true,
    value: {
      id: r.id, examId: r.examId, chapter, kind: r.kind, date: r.date,
      minutes: Math.round(minutes), done: r.done === true,
      ...(confidence ? { confidence } : {}), ...(isDateKey(r.doneAt) ? { doneAt: r.doneAt } : {}),
      ...(focusedMin !== undefined ? { focusedMin } : {}), ...(r.orphan === true ? { orphan: true } : {}),
    },
    repaired,
  };
}

export function checkCard(v: unknown): Check<Card> {
  if (!v || typeof v !== 'object') return fail('not an object');
  const r = v as Record<string, unknown>;
  if (!isId(r.id) || !isId(r.examId)) return fail('bad id');
  if (!isText(r.q, LIMITS.textLen) || !isText(r.a, LIMITS.textLen)) return fail('empty question or answer');
  if (!isDateKey(r.due)) return fail(`bad due date ${JSON.stringify(r.due)}`);
  const chapter = num(r.chapter);
  if (chapter === undefined || !Number.isInteger(chapter) || chapter < -1) return fail(`bad chapter ${JSON.stringify(r.chapter)}`);
  const repaired: string[] = [];
  let reps = clampNum(r.reps, 0, 999);
  if (reps === undefined) { reps = 0; repaired.push('reps'); }
  let ease = clampNum(r.ease, 1.3, 2.8);
  if (ease === undefined) { ease = 2.3; repaired.push('ease'); }
  const grade = (x: unknown) => (inRange(x, 0, 2) && Number.isInteger(x) ? (x as 0 | 1 | 2) : undefined);
  return {
    ok: true,
    value: {
      id: r.id, examId: r.examId, chapter, q: (r.q as string).trim(), a: (r.a as string).trim(),
      reps: Math.round(reps), ease, due: r.due,
      ...(grade(r.lastGrade) !== undefined ? { lastGrade: grade(r.lastGrade) } : {}),
      ...(grade(r.scoredGrade) !== undefined ? { scoredGrade: grade(r.scoredGrade) } : {}),
      ...(oneOf(r.evidence, ['self', 'verified'] as const) ? { evidence: r.evidence } : {}),
      ...(isDateKey(r.lastAt) ? { lastAt: r.lastAt } : {}),
    },
    repaired,
  };
}

/** Run a checker over a list: keep what is usable, report what is not. Nothing is thrown away silently. */
export function checkList<T>(rows: unknown[], check: (v: unknown) => Check<T>): { kept: T[]; rejected: { id?: string; reason: string }[]; repaired: number } {
  const kept: T[] = [];
  const rejected: { id?: string; reason: string }[] = [];
  let repaired = 0;
  for (const row of rows) {
    const r = check(row);
    if (r.ok) {
      kept.push(r.value);
      if (r.repaired?.length) repaired += 1;
    } else {
      const id = row && typeof row === 'object' ? (row as { id?: unknown }).id : undefined;
      rejected.push({ ...(typeof id === 'string' ? { id } : {}), reason: r.reason });
    }
  }
  return { kept, rejected, repaired };
}
