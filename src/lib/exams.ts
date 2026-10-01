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
export type Recall = { score: number; at: string }; // score 0..1, `at` = day of the attempt
export type ExamItem = {
  id: string; subject: string; date: string; chapters: string[];
  recall?: Record<number, Recall>; // chapter index → latest self-test result
};
export type StudySession = {
  id: string; examId: string; chapter: number; // -1 = whole exam (mock test)
  kind: SessionKind; date: string; minutes: number; done: boolean; confidence?: Confidence;
  doneAt?: string; // the day it was actually done (feeds consistency and weekly insights)
  focusedMin?: number; // minutes actually spent in the focus timer on this block — never inferred from `minutes`
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

// ── Readiness ────────────────────────────────────────────────────────────────────────────────
//
// Readiness answers one question: *how likely is this student to perform on the day?* Ticking a box is the
// weakest possible evidence for that, so a tick alone can never carry a chapter past WEAK_CEILING. Real
// minutes in the focus timer raise the ceiling; proving recall in a self-test raises it the rest of the way.
// Knowledge also fades, so a chapter last touched weeks ago is discounted.
//
// The rule we refuse to break: the number must be hard to inflate and easy to explain. `readinessDetail`
// returns the parts so the UI can always show *why*, and `nextEvidence` says what would move it.

export const WEAK_CEILING = 0.35; // ticked done, nothing else
export const EFFORT_CEILING = 0.7; // ticked done + the planned minutes actually focused
const DECAY_FLOOR = 0.75; // knowledge fades, but earned evidence never drops below three quarters
const DECAY_DAYS = 60; // days over which an untouched chapter decays to the floor

export type ChapterEvidence = {
  chapter: number;
  planned: number; // sessions planned for this chapter
  done: number; // sessions ticked done
  plannedMin: number; // minutes planned by the done sessions
  focusedMin: number; // minutes actually focused on them
  effort: number; // 0..1 focusedMin / plannedMin
  recall?: number; // 0..1 latest self-test score, undefined = never tested
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

// Per chapter: coverage × evidence ceiling × decay. Nothing here can be raised by tapping alone.
export function readinessDetail(exam: ExamItem, sessions: StudySession[], today = todayKey()): ReadinessDetail {
  const mine = sessions.filter(s => s.examId === exam.id);
  const empty: ReadinessDetail = { score: 0, ceiling: 0, coverage: 0, focusedMin: 0, plannedMin: 0, untested: exam.chapters.length, mockDone: false, chapters: [] };
  if (!exam.chapters.length) return empty;

  const chapters: ChapterEvidence[] = exam.chapters.map((_, i) => {
    const ch = mine.filter(s => s.chapter === i);
    const done = ch.filter(s => s.done);
    const plannedMin = done.reduce((a, s) => a + s.minutes, 0);
    const focusedMin = done.reduce((a, s) => a + (s.focusedMin ?? 0), 0);
    const effort = plannedMin ? clamp01(focusedMin / plannedMin) : 0;
    const recall = exam.recall?.[i]?.score;

    // The ceiling rises only with evidence the student cannot fake by tapping.
    let ceiling = WEAK_CEILING;
    ceiling += (EFFORT_CEILING - WEAK_CEILING) * effort;
    if (recall !== undefined) ceiling = Math.max(ceiling + (1 - EFFORT_CEILING) * clamp01(recall), clamp01(recall) * 0.9);

    // Recency: measured from the last thing that actually happened on this chapter.
    const touched = [...done.map(s => s.doneAt ?? s.date), exam.recall?.[i]?.at].filter(Boolean).sort().pop();
    const idle = touched ? Math.max(0, daysBetween(touched, today)) : 0;
    const decay = done.length ? Math.max(DECAY_FLOOR, 1 - idle / DECAY_DAYS) : 1;

    const coverage = ch.length ? done.length / ch.length : 0;
    // Proven recall stands on its own. A student who revises from a book and then demonstrates they can
    // recall the chapter is ready for it, whether or not they ran our timer — and tying the score only to
    // our own sessions would reward ticking boxes, which is the behaviour this rewrite exists to remove.
    const fromSessions = coverage * ceiling;
    const fromRecall = recall === undefined ? 0 : clamp01(recall) * 0.9;
    return { chapter: i, planned: ch.length, done: done.length, plannedMin, focusedMin, effort, recall, decay, ceiling, score: Math.max(fromSessions, fromRecall) * decay };
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
export function recordRecall<T extends ExamItem>(exam: T, chapter: number, score: number, today = todayKey()): T {
  return { ...exam, recall: { ...(exam.recall ?? {}), [chapter]: { score: clamp01(score), at: today } } };
}

// Last confidence per chapter (undefined = not rated yet).
export function chapterConfidence(exam: ExamItem, sessions: StudySession[]): (Confidence | undefined)[] {
  return exam.chapters.map((_, i) => sessions
    .filter(s => s.examId === exam.id && s.chapter === i && s.done && s.confidence)
    .sort((a, b) => a.date.localeCompare(b.date)).pop()?.confidence);
}
