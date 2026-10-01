// Exam engine: turns "exam on <date>, chapters A, B, C" into a spaced-review study plan.
//
// Evidence it builds on (Dunlosky et al., 2013; Cepeda et al., 2006): spreading study over days and testing
// yourself beat re-reading. So each chapter gets a first study session, then reviews after 1, 3 and 7 days
// (only those that land before the exam), plus a mock test the day before. After each session the student
// rates it Hard / OK / Easy: Hard adds an extra review tomorrow, Easy drops the next one. Missed sessions
// roll forward to today. Readiness measures what was reviewed and how confident the student felt, not hours.

export type Confidence = 1 | 2 | 3; // Hard, OK, Easy
export type SessionKind = 'learn' | 'review' | 'mock';

export type ExamItem = { id: string; subject: string; date: string; chapters: string[] };
export type StudySession = {
  id: string; examId: string; chapter: number; // -1 = whole exam (mock test)
  kind: SessionKind; date: string; minutes: number; done: boolean; confidence?: Confidence;
  doneAt?: string; // the day it was actually done (feeds consistency and weekly insights)
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

// 0–100: share of each chapter's sessions done, weighted by the last confidence rating; mock test adds 10.
export function readiness(exam: ExamItem, sessions: StudySession[]): number {
  const mine = sessions.filter(s => s.examId === exam.id);
  if (!mine.length || !exam.chapters.length) return 0;
  const conf = { 1: 0.25, 2: 0.65, 3: 1 } as const;
  const chapterScores = exam.chapters.map((_, i) => {
    const ch = mine.filter(s => s.chapter === i);
    if (!ch.length) return 0;
    const done = ch.filter(s => s.done);
    const last = [...done].sort((a, b) => a.date.localeCompare(b.date)).pop();
    return (done.length / ch.length) * 0.7 + (last?.confidence ? conf[last.confidence] * 0.3 : 0);
  });
  const mockDone = mine.some(s => s.kind === 'mock' && s.done) ? 10 : 0;
  return Math.round((chapterScores.reduce((a, b) => a + b, 0) / chapterScores.length) * 90 + mockDone);
}

// Last confidence per chapter (undefined = not rated yet).
export function chapterConfidence(exam: ExamItem, sessions: StudySession[]): (Confidence | undefined)[] {
  return exam.chapters.map((_, i) => sessions
    .filter(s => s.examId === exam.id && s.chapter === i && s.done && s.confidence)
    .sort((a, b) => a.date.localeCompare(b.date)).pop()?.confidence);
}
