// Exam engine: turns "exam on <date>, chapters A, B, C" into a spaced-review study plan.
//
// Evidence it builds on (Dunlosky et al., 2013; Cepeda et al., 2006): spreading study over days and testing
// yourself beat re-reading. So each chapter gets a first study session, then reviews after 1, 3 and 7 days
// (only those that land before the exam), plus a mock test the day before. After each session the student
// rates it Hard / OK / Easy: Hard adds an extra review tomorrow, Easy drops the next one. Missed sessions
// roll forward to today. Readiness measures what was reviewed and how confident the student felt, not hours.

export type Confidence = 1 | 2 | 3; // Hard, OK, Easy
export type SessionKind = 'learn' | 'review' | 'mock';

// A chapter's last retrieval-practice result: the only evidence that the student can actually recall it.
// `conf` is how much of the chapter was actually tested (0..1). It is derived from the cards in
// src/lib/academic.ts; absent means "assume fully tested", which is what `recordRecall` records.
export type Recall = { score: number; at: string; conf?: number }; // score 0..1, `at` = day of the attempt
export type ExamItem = {
  id: string; subject: string; date: string; chapters: string[];
  recall?: Record<number, Recall>; // chapter index → latest self-test result
};
export type StudySession = {
  id: string; examId: string; chapter: number; // -1 = whole exam (mock test)
  kind: SessionKind; date: string; minutes: number; done: boolean; confidence?: Confidence;
  doneAt?: string; // the day it was actually done (feeds consistency and weekly insights)
  // Minutes the app was in the FOREGROUND during a focus session credited to this block. Never inferred from
  // `minutes`, and deliberately not called "study time": we can measure app focus, not attention.
  focusedMin?: number;
  // The chapter this block belonged to no longer exists. Kept for the student's history and their focus log,
  // excluded from evidence, the agenda and Next Evidence. See pruneOrphans().
  orphan?: boolean;
};

export const REVIEW_GAPS = [1, 3, 7];
export const MINUTES: Record<SessionKind, number> = { learn: 40, review: 20, mock: 60 };
const MAX_PER_DAY = 4;

// ── Local calendar dates as 'YYYY-MM-DD' (no time zones involved) ──
const pad = (n: number) => String(n).padStart(2, '0');
export const toKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const fromKey = (k: string) => { const [y, m, d] = k.split('-').map(Number); return new Date(y, m - 1, d); };
export const todayKey = () => toKey(new Date());
export const addDays = (k: string, n: number) => { const d = fromKey(k); d.setDate(d.getDate() + n); return toKey(d); };
export const daysBetween = (a: string, b: string) => Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86400000);

let seq = 0;
export const newId = (p: string) => `${p}${Date.now().toString(36)}${(seq++).toString(36)}`;

// Build the full plan for one exam, starting today.
export function planExam(exam: ExamItem, today: string): StudySession[] {
  const window = daysBetween(today, exam.date); // study days are today … exam - 1
  if (window <= 0 || exam.chapters.length === 0) return [];
  const n = exam.chapters.length;
  // First passes use the first ~60% of the window so there is room for reviews before the exam.
  const learnSpan = Math.max(1, Math.ceil(window * 0.6));
  const load: Record<string, number> = {};
  const out: StudySession[] = [];
  const place = (date: string, s: Omit<StudySession, 'id' | 'date' | 'done'>) => {
    let d = date;
    while ((load[d] ?? 0) >= MAX_PER_DAY && daysBetween(d, exam.date) > 1) d = addDays(d, 1);
    load[d] = (load[d] ?? 0) + 1;
    out.push({ ...s, id: newId('s'), date: d, done: false });
    return d;
  };
  exam.chapters.forEach((_, i) => {
    const learnDay = addDays(today, Math.min(window - 1, Math.floor((i * learnSpan) / n)));
    const placed = place(learnDay, { examId: exam.id, chapter: i, kind: 'learn', minutes: MINUTES.learn });
    for (const gap of REVIEW_GAPS) {
      const d = addDays(placed, gap);
      if (daysBetween(d, exam.date) < 1) break;
      place(d, { examId: exam.id, chapter: i, kind: 'review', minutes: MINUTES.review });
    }
  });
  if (window >= 2) place(addDays(exam.date, -1), { examId: exam.id, chapter: -1, kind: 'mock', minutes: MINUTES.mock });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

// Record a rating and adapt the chapter's remaining reviews.
export function rate(sessions: StudySession[], id: string, confidence: Confidence, exam: ExamItem, today: string): StudySession[] {
  const s = sessions.find(x => x.id === id);
  if (!s) return sessions;
  let next = sessions.map(x => (x.id === id ? { ...x, done: true, confidence, doneAt: today } : x));
  if (s.chapter < 0) return next;
  const pending = next.filter(x => x.examId === s.examId && x.chapter === s.chapter && !x.done && x.kind === 'review')
    .sort((a, b) => a.date.localeCompare(b.date));
  const tomorrow = addDays(today, 1);
  if (confidence === 1 && daysBetween(tomorrow, exam.date) >= 1 && !pending.some(x => x.date === tomorrow)) {
    next = [...next, { id: newId('s'), examId: s.examId, chapter: s.chapter, kind: 'review', date: tomorrow, minutes: MINUTES.review, done: false }];
  }
  if (confidence === 3 && pending.length >= 2) next = next.filter(x => x.id !== pending[0].id);
  return next.sort((a, b) => a.date.localeCompare(b.date));
}

// Missed sessions move to today; sessions of exams that are over are dropped.
export function rollForward(sessions: StudySession[], exams: ExamItem[], today: string): StudySession[] {
  const examDate = Object.fromEntries(exams.map(e => [e.id, e.date]));
  return sessions
    .filter(s => examDate[s.examId] && (s.done || daysBetween(today, examDate[s.examId]) >= 1))
    .map(s => (!s.done && s.date < today ? { ...s, date: today } : s));
}

// ── Evidence completeness ────────────────────────────────────────────────────────────────────
//
// This number does NOT estimate whether the student will pass. It measures how strong the evidence is that
// they are prepared. Ticking a box is the weakest possible evidence, so a tick alone can never carry a
// chapter past WEAK_CEILING. Minutes actually spent in the app during a focus session raise it; proving
// recall in a self-test raises it the rest of the way. Knowledge fades, so old evidence is discounted.
//
// The rule we refuse to break: every rise and every fall must be explainable, and nothing here may be moved
// by tapping. In particular a self-test that goes badly LOWERS the chapter — the previous formula combined
// the study and recall paths with Math.max(), so a failed recall could only ever raise the number, which is
// the opposite of what a self-test means.
//
// `readinessDetail` returns the parts so the UI can always show *why*, and `nextEvidence` says what would
// move it. The maths is documented in docs/READINESS_MODEL.md.

export const WEAK_CEILING = 0.35; // W — ticked done, nothing else
export const EFFORT_CEILING = 0.7; // E — ticked done + the planned minutes actually spent in the app
// The recall score that neither corroborates nor contradicts the study evidence. It MUST equal the "almost"
// rung of `mastery()` in src/engine/recall.ts: "almost" is by definition the grade that settles nothing, so
// if the two drift apart, answering "almost" starts counting as a failure and the ordering invariant
// (forgot ≤ none ≤ almost ≤ knew) breaks. scripts/test-evidence.js asserts they are equal.
export const R_NEUTRAL = 0.45;
export const PENALTY_MIN = 0.25; // a failed self-test discounts the study evidence, it never erases it
export const DECAY_FLOOR = 0.75; // knowledge fades, but earned evidence never drops below three quarters
export const DECAY_DAYS = 60; // days over which an untouched chapter decays to the floor

export type ChapterEvidence = {
  chapter: number;
  planned: number; // sessions planned for this chapter
  done: number; // sessions ticked done
  plannedMin: number; // minutes planned by the done sessions
  focusedMin: number; // minutes of app focus credited to them
  effort: number; // 0..1 focusedMin / plannedMin
  recall?: number; // 0..1 latest self-test score, undefined = never tested
  conf: number; // 0..1 how much of the chapter was tested (q); 0 = not tested at all
  decay: number; // 0..1 recency multiplier
  score: number; // 0..1 this chapter's contribution
  ceiling: number; // 0..1 the most this chapter can reach on current evidence
};

export type ReadinessDetail = {
  score: number; // 0–100, what the UI shows
  ceiling: number; // 0–100, the most reachable without new evidence
  coverage: number; // 0–100, share of chapters with any work done
  focusedMin: number;
  plannedMin: number;
  untested: number; // chapters never self-tested
  mockDone: boolean;
  chapters: ChapterEvidence[];
};

const clamp01 = (n: number) => Math.max(0, Math.min(1, n));
/** A minute count that can be added. Anything non-finite or negative contributes nothing instead of NaN. */
const safeMin = (n: number | undefined) => (typeof n === 'number' && Number.isFinite(n) && n > 0 ? n : 0);

/**
 * Drop blocks whose chapter no longer exists, and keep the completed ones as history.
 *
 * Policy, and why: an UNFINISHED block for a removed chapter can never be done, and leaving it produced rows
 * with a blank title in the agenda forever — so it goes. A COMPLETED block is a record of work the student
 * actually did, and its minutes feed the focus log that streaks and the weekly recap are built from, so
 * deleting it would erase real history to tidy up a list. It is marked `orphan` instead: invisible to
 * evidence, the agenda and Next Evidence, still present in the student's own record.
 */
export function pruneOrphans<T extends StudySession>(sessions: T[], exams: ExamItem[]): T[] {
  const chapterCount = new Map(exams.map(e => [e.id, e.chapters.length]));
  const out: T[] = [];
  for (const s of sessions) {
    const n = chapterCount.get(s.examId);
    if (n === undefined) { out.push(s); continue; } // the exam itself is gone; rollForward owns that case
    const inRange = s.chapter < 0 || s.chapter < n;
    if (inRange) { out.push(s.orphan ? { ...s, orphan: undefined } : s); continue; }
    if (s.done) out.push({ ...s, orphan: true });
  }
  return out;
}

/** The inputs one chapter's score is built from, already reduced to 0..1 quantities. */
export type ChapterInput = {
  coverage: number; // share of this chapter's planned blocks ticked done
  effort: number; // share of the planned minutes the app was in the foreground for
  recall?: number; // latest self-test quality, undefined = never tested
  conf: number; // how much of the chapter was tested (q)
  decay: number; // recency multiplier
};

/**
 * The six steps, in one place, so the ranker that asks "what would the next action add?" runs exactly the
 * same arithmetic the score does. Two implementations of this would drift within a release.
 */
export function chapterScore({ coverage, effort, recall, conf, decay }: ChapterInput): { score: number; ceiling: number } {
  // 1. Demonstrated recall counts as coverage, weighted by how much of the chapter was tested.
  const covEff = Math.max(coverage, recall === undefined ? 0 : conf * recall);
  // 2. Study evidence — identical to the pre-Phase-1 formula whenever conf is 0.
  const study = covEff * (WEAK_CEILING + (EFFORT_CEILING - WEAK_CEILING) * effort);
  // 3. Directional multiplier, clamped at 1 so recall can only REDUCE the study evidence here.
  const m = recall === undefined ? 1 : 1 + (conf * (recall - R_NEUTRAL)) / R_NEUTRAL;
  const gated = study * Math.min(1, Math.max(PENALTY_MIN, m));
  // 4. Only recall above R_NEUTRAL buys the band above the effort ceiling.
  const gain = recall === undefined ? 0 : Math.max(0, recall - R_NEUTRAL) / (1 - R_NEUTRAL);
  const bonus = conf * gain * (1 - EFFORT_CEILING);
  return {
    score: clamp01(gated + bonus) * decay,
    ceiling: clamp01(WEAK_CEILING + (EFFORT_CEILING - WEAK_CEILING) * effort + bonus),
  };
}

// Per chapter, in six steps. Nothing here can be raised by tapping, and a failed self-test lowers it.
export function readinessDetail(exam: ExamItem, sessions: StudySession[], today = todayKey()): ReadinessDetail {
  const mine = sessions.filter(s => s.examId === exam.id);
  const empty: ReadinessDetail = { score: 0, ceiling: 0, coverage: 0, focusedMin: 0, plannedMin: 0, untested: exam.chapters.length, mockDone: false, chapters: [] };
  if (!exam.chapters.length) return empty;

  const chapters: ChapterEvidence[] = exam.chapters.map((_, i) => {
    // Orphan blocks belonged to a chapter that has since been removed: they keep the student's history but
    // must not feed the number. A non-finite minute total is dropped rather than propagated as NaN.
    const ch = mine.filter(s => s.chapter === i && !s.orphan);
    const done = ch.filter(s => s.done);
    const plannedMin = done.reduce((a, s) => a + safeMin(s.minutes), 0);
    const focusedMin = done.reduce((a, s) => a + Math.min(safeMin(s.focusedMin), safeMin(s.minutes)), 0);
    // `plannedMin > 0` rather than a truthiness test: a NaN total must read as "no effort evidence",
    // not propagate into the score.
    const effort = plannedMin > 0 ? clamp01(focusedMin / plannedMin) : 0;

    const rec = exam.recall?.[i];
    const recall = rec ? clamp01(rec.score) : undefined;
    // q: how much of the chapter was tested. No recall entry at all means q = 0, which makes every recall
    // term below vanish — that is the property the migration rests on.
    const conf = rec ? clamp01(rec.conf ?? 1) : 0;

    const coverage = ch.length ? done.length / ch.length : 0;

    // Recency, measured from the last evidence of ANY kind. A chapter proved by self-testing alone used to
    // be exempt from decay forever, because the condition was on logged sessions.
    const touched = [...done.map(s => s.doneAt ?? s.date), rec?.at].filter(Boolean).sort().pop();
    const hasEvidence = done.length > 0 || recall !== undefined;
    const idle = touched ? Math.max(0, daysBetween(touched, today)) : 0;
    const decay = hasEvidence && Number.isFinite(idle) ? Math.max(DECAY_FLOOR, 1 - idle / DECAY_DAYS) : 1;

    const { score, ceiling } = chapterScore({ coverage, effort, recall, conf, decay });
    return { chapter: i, planned: ch.length, done: done.length, plannedMin, focusedMin, effort, recall, conf, decay, ceiling, score };
  });

  const n = chapters.length;
  const mock = mine.find(s => s.kind === 'mock' && s.done);
  // The mock test only counts when it was actually sat, not merely ticked.
  const mockDone = !!mock && (mock.focusedMin ?? 0) >= mock.minutes * 0.5;
  const bonus = mockDone ? 8 : 0;

  const base = chapters.reduce((a, c) => a + c.score, 0) / n;
  const ceil = chapters.reduce((a, c) => a + c.ceiling, 0) / n;
  return {
    score: Math.min(100, Math.round(base * 92 + bonus)),
    ceiling: Math.min(100, Math.round(ceil * 92 + 8)),
    coverage: Math.round((chapters.filter(c => c.done > 0).length / n) * 100),
    focusedMin: chapters.reduce((a, c) => a + c.focusedMin, 0) + (mock?.focusedMin ?? 0),
    plannedMin: chapters.reduce((a, c) => a + c.plannedMin, 0),
    untested: chapters.filter(c => c.recall === undefined).length,
    mockDone,
    chapters,
  };
}

// 0–100. Kept as the one number every screen shows.
export function readiness(exam: ExamItem, sessions: StudySession[], today = todayKey()): number {
  return readinessDetail(exam, sessions, today).score;
}

export type EvidenceGap = { kind: 'study' | 'focus' | 'recall' | 'mock' | 'ready'; chapter?: number };

// The single most useful thing the student could do next to make the number mean more.
export function nextEvidence(exam: ExamItem, sessions: StudySession[], today = todayKey()): EvidenceGap {
  const d = readinessDetail(exam, sessions, today);
  const untouched = d.chapters.find(c => c.done === 0);
  if (untouched) return { kind: 'study', chapter: untouched.chapter };
  const lowEffort = d.chapters.find(c => c.effort < 0.5);
  if (lowEffort) return { kind: 'focus', chapter: lowEffort.chapter };
  const untested = d.chapters.find(c => c.recall === undefined);
  if (untested) return { kind: 'recall', chapter: untested.chapter };
  const weakest = [...d.chapters].sort((a, b) => a.score - b.score)[0];
  if (weakest && (weakest.recall ?? 1) < 0.7) return { kind: 'recall', chapter: weakest.chapter };
  if (!d.mockDone) return { kind: 'mock' };
  return { kind: 'ready' };
}

// Record a self-test result for one chapter. Returns a new exam — nothing is mutated.
// `conf` is how much of the chapter the result covers; it defaults to 1 because a caller passing a bare
// score is asserting a complete result. The app does not use this path: it derives both from the cards
// (src/lib/academic.ts), where confidence is counted rather than assumed.
export function recordRecall<T extends ExamItem>(exam: T, chapter: number, score: number, today = todayKey(), conf = 1): T {
  return { ...exam, recall: { ...(exam.recall ?? {}), [chapter]: { score: clamp01(score), at: today, conf: clamp01(conf) } } };
}

// Last confidence per chapter (undefined = not rated yet).
export function chapterConfidence(exam: ExamItem, sessions: StudySession[]): (Confidence | undefined)[] {
  return exam.chapters.map((_, i) => sessions
    .filter(s => s.examId === exam.id && s.chapter === i && s.done && s.confidence)
    .sort((a, b) => a.date.localeCompare(b.date)).pop()?.confidence);
}
