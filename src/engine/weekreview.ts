// The weekly review: what actually happened, and a study split proposed from risk — never applied silently.
//
// The spec is firm that re-planning must be reviewable and approved by the student. So this module only
// PROPOSES: it returns a split and the reasoning, and the screen asks before anything changes.

import type { SubjectCard, WeekPulse } from './dashboard';

export type StudySplit = {
  subjectId: string;
  subjectName: string;
  minutes: number;
  share: number;     // 0–1 of the week's available study time
  why: 'risk' | 'imminent' | 'backlog' | 'even';
};

export const MIN_BLOCK = 30; // never propose a slice too small to be a real session

/**
 * Split a week's available minutes across subjects by exposure. Subjects with nothing measured share evenly
 * rather than being pushed to the bottom on no evidence.
 */
export function proposeSplit(cards: SubjectCard[], weeklyMinutes: number): StudySplit[] {
  if (!cards.length || weeklyMinutes <= 0) return [];
  const weights = cards.map(c => Math.max(0.05, c.risk)); // a floor, so nothing is starved entirely
  const total = weights.reduce((a, b) => a + b, 0);

  const raw = cards.map((c, i) => {
    const share = weights[i] / total;
    const why: StudySplit['why'] =
      c.daysToNext !== null && c.daysToNext <= 7 ? 'imminent'
      : c.dueReviews + c.dueMistakes > 0 ? 'backlog'
      : c.risk > 0.3 ? 'risk'
      : 'even';
    return { subjectId: c.subject.id, subjectName: c.subject.name, minutes: Math.round((share * weeklyMinutes) / 5) * 5, share, why };
  });

  // Round-off can leave the total short or long; put the remainder on the most exposed subject.
  const assigned = raw.reduce((t, r) => t + r.minutes, 0);
  const drift = weeklyMinutes - assigned;
  if (raw.length && drift !== 0) raw[0].minutes = Math.max(0, raw[0].minutes + drift);
  return raw.filter(r => r.minutes >= MIN_BLOCK || r.minutes > 0);
}

export type WeekReview = {
  pulse: WeekPulse;
  completion: number;        // 0–1 of the week's tasks that got done
  split: StudySplit[];
  /** Facts worth naming, each one derived from a number above — never generic encouragement. */
  highlights: { kind: 'overdue' | 'reviewsPiling' | 'mistakesReturning' | 'lowLogging' | 'strongWeek'; value: number }[];
};

export const PILING = 3;      // reviews due before it counts as piling up
export const RETURNING = 1;   // re-tests due before it is worth naming

export function weekReview(args: { pulse: WeekPulse; cards: SubjectCard[]; weeklyMinutes: number }): WeekReview {
  const { pulse, cards, weeklyMinutes } = args;
  const attempted = pulse.tasksDone + pulse.tasksOpen;
  const completion = attempted > 0 ? pulse.tasksDone / attempted : 0;

  const highlights: WeekReview['highlights'] = [];
  if (pulse.tasksOverdue > 0) highlights.push({ kind: 'overdue', value: pulse.tasksOverdue });
  if (pulse.reviewsDue >= PILING) highlights.push({ kind: 'reviewsPiling', value: pulse.reviewsDue });
  if (pulse.mistakesDue >= RETURNING) highlights.push({ kind: 'mistakesReturning', value: pulse.mistakesDue });
  if (pulse.wellbeing.loggedDays <= 2) highlights.push({ kind: 'lowLogging', value: pulse.wellbeing.loggedDays });
  if (pulse.tasksOverdue === 0 && pulse.tasksDone > 0) highlights.push({ kind: 'strongWeek', value: pulse.tasksDone });

  return { pulse, completion, split: proposeSplit(cards, weeklyMinutes), highlights };
}
