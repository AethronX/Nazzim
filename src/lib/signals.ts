// Turning what the app has measured into the signals the priority engine understands.
//
// Every signal is derived from recorded evidence — graded assessments, retrieval attempts, logged mistakes.
// A subject the student has never tested themselves on contributes nothing, so the order falls back to
// deadlines instead of pretending to know where they are weak.

import type { Assessment, DateKey, StudyError, Subject, SubjectSignal, Topic } from '../domain/types';
import { CHRONIC_REPEATS, dueErrors } from '../engine/errors';
import { dueTopics, topicStats } from '../engine/topics';

/** How many pending reviews + chronic mistakes it takes before backlog counts as "full". */
export const BACKLOG_FULL = 5;

export function subjectSignals(args: {
  subjects: Subject[]; assessments: Assessment[]; topics: Topic[]; errors: StudyError[]; today: DateKey;
}): Record<string, SubjectSignal> {
  const { subjects, assessments, topics, errors, today } = args;
  const out: Record<string, SubjectSignal> = {};

  for (const s of subjects) {
    const mine = assessments.filter(a => a.subjectId === s.id);
    // Marks still undecided: the weight of everything not yet graded. 45% of a course riding on one final
    // is exactly the situation that should pull its work forward.
    const undecided = mine.filter(a => a.status !== 'graded').reduce((t, a) => t + a.weight, 0);
    const stakes = Math.max(0, Math.min(1, undecided / 100));

    // Weakness only exists where mastery was actually attempted.
    const st = topicStats(topics, today, s.id);
    const attempted = st.total - st.untouched;
    const weakness = attempted > 0 ? 1 - st.mastery : 0;

    // Backlog: reviews that came due and mistakes that keep returning.
    const chronic = errors.filter(e => e.subjectId === s.id && !e.resolved && e.repeats >= CHRONIC_REPEATS).length;
    const pending = dueTopics(topics, today, s.id).length + dueErrors(errors, today, s.id).length + chronic;
    const backlog = Math.min(1, pending / BACKLOG_FULL);

    if (stakes || weakness || backlog) out[s.id] = { stakes, weakness, backlog };
  }
  return out;
}
