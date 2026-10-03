// THE single source of truth for evidence completeness and for "what should I do now?".
//
// Before this file existed the number was computed in five places from four different inputs: Today used
// `overallReadiness` on exams carrying derived recall, the toast in the store used the RAW exam (so it
// reported a different number than the screen the student was looking at), and the notification text was
// built from raw exams too. Every surface now calls in here.
//
// Nothing in this file is React. It takes the academic data and the cards, and returns numbers.
import type { Card } from '../engine/recall';
import { chapterRecall, chapterRecallConfidence, MIN_CARDS } from '../engine/recall';
import {
  chapterScore, daysBetween, readinessDetail,
  type ChapterEvidence, type ExamItem, type ReadinessDetail, type StudySession,
} from './exams';

/** Beyond this many days an exam stops adding urgency; inside it, urgency ramps to 1 on the day. */
export const URGENT_DAYS = 14;
/**
 * An exam this close outranks every exam that is not, whatever the numbers say.
 *
 * Proximity alone could not carry this. It scales the rank between 0.5 and 1 — a factor of two — and
 * `need × gain` routinely differs by five times or more between chapters: a chapter at 0.15 recall thirty
 * days out ranked 5.5× above a chapter at 0.45 recall two days out, so the app would have sent a student
 * away from the exam they sit on Thursday. Pushing the proximity curve hard enough to beat that would make
 * the ordering impossible to explain. A tier is one sentence: an exam inside three days comes first.
 */
export const IMMINENT_DAYS = 3;
/** A chapter whose recall sits below this still has recall work worth doing. */
export const RECALL_TARGET = 0.7;
/** Below this the effort evidence is treated as missing rather than partial. */
export const EFFORT_TARGET = 0.5;
/** What one good new card is assumed to demonstrate, for estimating the gain of a recall session. */
const RECALL_PROSPECT = 0.8;

/**
 * Attach derived recall evidence to exams. The ONLY place `exam.recall` is produced: it is computed from the
 * cards, never stored, so a graded card changes every surface in the same render.
 */
export function withEvidence<T extends ExamItem>(exams: T[], cards: Card[]): T[] {
  if (!cards.length) return exams;
  return exams.map(e => {
    const recall: Record<number, { score: number; at: string; conf: number }> = {};
    e.chapters.forEach((_, i) => {
      const score = chapterRecall(cards, e.id, i);
      if (score === undefined) return;
      const at = cards.filter(c => c.examId === e.id && c.chapter === i && c.lastAt).map(c => c.lastAt!).sort().pop();
      if (at) recall[i] = { score, at, conf: chapterRecallConfidence(cards, e.id, i) };
    });
    return Object.keys(recall).length ? { ...e, recall } : e;
  });
}

/** Evidence completeness for one exam, with every part the UI needs to explain it. */
export function evidenceDetail(exam: ExamItem, sessions: StudySession[], cards: Card[], today: string): ReadinessDetail {
  return readinessDetail(withEvidence([exam], cards)[0], sessions, today);
}

/** Evidence completeness for one exam, 0–100. Every surface that shows a number calls this. */
export function evidenceScore(exam: ExamItem, sessions: StudySession[], cards: Card[], today: string): number {
  return evidenceDetail(exam, sessions, cards, today).score;
}

/** Across the exams still ahead, weighted by size. `undefined` when there is no exam to gather evidence for. */
export function overallEvidence(exams: ExamItem[], sessions: StudySession[], cards: Card[], today: string): number | undefined {
  const ahead = exams.filter(e => e.date >= today);
  if (!ahead.length) return undefined;
  const withR = withEvidence(ahead, cards);
  let sum = 0, weight = 0;
  withR.forEach(e => {
    const w = Math.max(1, e.chapters.length);
    sum += readinessDetail(e, sessions, today).score * w;
    weight += w;
  });
  return Math.round(sum / weight);
}

// ── What to do next ─────────────────────────────────────────────────────────────────────────────

export type EvidenceAction = 'study' | 'focus' | 'recall' | 'mock' | 'ready';

export type EvidenceTarget = {
  kind: EvidenceAction;
  examId: string;
  chapter: number; // -1 for a whole-exam action (mock)
  score: number; // the chapter's evidence now, 0..1
  need: number; // 1 − score
  gain: number; // what the suggested action would add to this chapter, 0..1
  rank: number; // the ordering value within a tier; higher wins
  imminent: boolean; // the exam is inside IMMINENT_DAYS, which outranks everything that is not
  daysLeft: number;
};

/** 0 far from the exam, 1 on the day. Unreadable dates get no urgency rather than infinite urgency. */
export const urgencyFor = (daysLeft: number) =>
  Number.isFinite(daysLeft) ? Math.max(0, Math.min(1, (URGENT_DAYS - daysLeft) / URGENT_DAYS)) : 0;

/**
 * The cheapest action that would actually move this chapter, and how much it would move it.
 *
 * The ladder is an eligibility gate, not a preference: you cannot self-test a chapter you have not studied,
 * so `study` comes before `recall` even when the simulated recall gain is larger. The GAIN, though, is not
 * guessed — it is the real formula re-run with the action applied, which is why `chapterScore` is exported.
 */
function actionFor(c: ChapterEvidence, dueNow: number): { kind: EvidenceAction; gain: number } | null {
  const base = { coverage: c.planned ? c.done / c.planned : 0, effort: c.effort, recall: c.recall, conf: c.conf, decay: c.decay };
  const now = c.score;
  const gainOf = (patch: Partial<typeof base>) => Math.max(0, chapterScore({ ...base, ...patch }).score - now);

  if (c.done === 0) {
    const coverage = c.planned ? 1 / c.planned : 1;
    return { kind: 'study', gain: gainOf({ coverage }) };
  }
  if (c.effort < EFFORT_TARGET) return { kind: 'focus', gain: gainOf({ effort: 1 }) };

  const gradedWeight = c.conf * MIN_CARDS;
  if (gradedWeight < MIN_CARDS) {
    const conf = Math.min(1, (gradedWeight + 1) / MIN_CARDS);
    return { kind: 'recall', gain: gainOf({ conf, recall: Math.max(c.recall ?? 0, RECALL_PROSPECT) }) };
  }
  // Breadth is covered, so the only recall work left is re-testing what is due. Suggesting it when nothing
  // is due sends the student to a screen that says "nothing due" — which the live walkthrough did: Today
  // said "self-test Probability" while the recall screen had every card scheduled for tomorrow.
  if ((c.recall ?? 0) < RECALL_TARGET && dueNow > 0) {
    return { kind: 'recall', gain: gainOf({ recall: Math.max(c.recall ?? 0, RECALL_PROSPECT) }) };
  }
  return null; // this chapter has everything the model knows how to ask for
}

/**
 * Every outstanding evidence gap across every exam still ahead, best first.
 *
 *   rank = need × proximity × weight × headroom × staleness
 *
 * `weight` is the chapter's relative importance inside its exam — 1 for every chapter while the model has no
 * per-chapter weights. It is deliberately NOT 1/chapterCount: dividing by the chapter count makes a big exam
 * rank below a small one no matter how close it is. Worked through: a 12-chapter exam tomorrow with a chapter
 * at need 0.9 would score 0.9 × 0.96 × (1/12) × gain, and a 2-chapter exam ten days out would score
 * 0.9 × 0.64 × 0.5 × gain — four times higher. The exam the student sits tomorrow would lose. So the chapter
 * count stays out of it, and urgency decides between exams.
 */
export function rankEvidence(exams: ExamItem[], sessions: StudySession[], cards: Card[], today: string): EvidenceTarget[] {
  const ahead = withEvidence(exams.filter(e => e.date >= today), cards);
  const out: EvidenceTarget[] = [];

  for (const exam of ahead) {
    const detail = readinessDetail(exam, sessions, today);
    const daysLeft = daysBetween(today, exam.date);
    const proximity = 0.5 + 0.5 * urgencyFor(daysLeft);
    const imminent = Number.isFinite(daysLeft) && daysLeft <= IMMINENT_DAYS;

    let open = 0;
    for (const c of detail.chapters) {
      const dueNow = cards.filter(x => x.examId === exam.id && x.chapter === c.chapter && x.due <= today).length;
      const action = actionFor(c, dueNow);
      if (!action) continue;
      open += 1;
      // A gap worth nothing is not a gap worth showing: the action must change the number.
      if (action.gain <= 0.001) continue;
      const need = 1 - c.score;
      const staleness = 1 + (1 - c.decay);
      out.push({
        kind: action.kind, examId: exam.id, chapter: c.chapter,
        score: c.score, need, gain: action.gain, daysLeft, imminent,
        rank: need * proximity * action.gain * staleness,
      });
    }

    // Everything the chapters can offer is done: the mock test is the last piece of evidence left.
    if (!open && detail.chapters.length && !detail.mockDone) {
      out.push({
        kind: 'mock', examId: exam.id, chapter: -1,
        score: detail.score / 100, need: 1 - detail.score / 100, gain: 8 / 100, daysLeft, imminent,
        rank: (1 - detail.score / 100) * proximity * (8 / 100),
      });
    }
  }

  // Tier first, then rank inside the tier. Ties break toward the nearer exam, then the earlier chapter, so
  // the order is fully determined and a test can pin it.
  return out.sort((a, b) =>
    Number(b.imminent) - Number(a.imminent) || b.rank - a.rank || a.daysLeft - b.daysLeft || a.chapter - b.chapter);
}

/**
 * The one thing to do now, across every upcoming exam. `null` means there is nothing with an exam attached —
 * either no exams, or every exam's evidence is as complete as the model knows how to ask for.
 */
export function nextEvidence(exams: ExamItem[], sessions: StudySession[], cards: Card[], today: string): EvidenceTarget | null {
  return rankEvidence(exams, sessions, cards, today)[0] ?? null;
}
