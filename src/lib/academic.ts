// Glue between the store and the engine: builds the AcademicContext once per render and exposes
// the localized helpers screens need (chapter titles, reason text).
import { useMemo } from 'react';
import type { AcademicContext } from '../domain/types';
import type { NextReason } from '../engine/academic';
import type { Copy } from './copy';
import type { ExamItem, StudySession } from './exams';
import { useNazzim } from './store';

export function useAcademic() {
  const { today, subjects, tasks, exams, study, dailyMinutes, L } = useNazzim();
  const ctx: AcademicContext = useMemo(() => ({ today, subjects, tasks, exams, sessions: study, dailyMinutes }), [today, subjects, tasks, exams, study, dailyMinutes]);
  const chapterTitle = useMemo(() => (s: StudySession, e?: ExamItem) => (s.chapter < 0 ? L.exAll : e?.chapters[s.chapter] ?? ''), [L]);
  const subjectById = useMemo(() => new Map(subjects.map(s => [s.id, s])), [subjects]);
  return { ctx, chapterTitle, subjectById };
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
