// Glue between the store and the engine: builds the AcademicContext once per render and exposes
// the localized helpers screens need (chapter titles, reason text).
import { useMemo } from 'react';
import type { AcademicContext } from '../domain/types';
import type { NextReason } from '../engine/academic';
import { STUDY_START } from '../engine/habits';
import { chapterRecall } from '../engine/recall';
import type { Copy } from './copy';
import type { ExamItem, StudySession } from './exams';
import { useNazzim } from './store';

export function useAcademic() {
  const { today, subjects, tasks, exams, study, cards, dailyMinutes, studyTime, L } = useNazzim();
  // Recall is derived from the cards, never stored twice: one source of truth, so a graded card updates
  // readiness everywhere in the same render.
  const withRecall = useMemo(() => exams.map(e => {
    const recall: Record<number, { score: number; at: string }> = {};
    e.chapters.forEach((_, i) => {
      const score = chapterRecall(cards, e.id, i);
      if (score !== undefined) {
        const at = cards.filter(c => c.examId === e.id && c.chapter === i && c.lastAt).map(c => c.lastAt!).sort().pop();
        if (at) recall[i] = { score, at };
      }
    });
    return Object.keys(recall).length ? { ...e, recall } : e;
  }), [exams, cards]);
  const ctx: AcademicContext = useMemo(() => ({ today, subjects, tasks, exams: withRecall, sessions: study, dailyMinutes }), [today, subjects, tasks, withRecall, study, dailyMinutes]);
  const chapterTitle = useMemo(() => (s: StudySession, e?: ExamItem) => (s.chapter < 0 ? L.exAll : e?.chapters[s.chapter] ?? ''), [L]);
  const subjectById = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  // The day's blocks start at the student's chosen study time (implementation intention).
  return { ctx, chapterTitle, subjectById, studyStart: STUDY_START[studyTime] };
}

export function reasonText(r: NextReason, L: Copy) {
  switch (r.code) {
    case 'overdue': return r.days === 1 ? L.rOverdue1 : L.rOverdue.replace('{n}', String(r.days));
    case 'examSoon': return (r.days === 1 ? L.rExamTomorrow : L.rExamSoon.replace('{n}', String(r.days))).replace('{exam}', r.exam);
    case 'dueToday': return L.rDueToday;
    case 'dueTomorrow': return L.rDueTomorrow;
    default: return L.rPlanned;
  }
}

export const hours = (min: number, ar: boolean) => {
  const h = Math.floor(min / 60), m = min % 60;
  if (ar) return h ? `${h} س${m ? ` ${m} د` : ''}` : `${m} د`;
  return h ? `${h}h${m ? ` ${m}m` : ''}` : `${m}m`;
};
