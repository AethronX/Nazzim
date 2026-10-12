// Grade engine — the load-bearing calculator for the A-level student OS.
//
// One convention, stated once: every `weight` is a PERCENT of the final course grade (25 means 25%), and
// every computed grade is on a 0–100 points scale. A graded assessment contributes
//
//     contribution(points) = (score / maxScore) * weight
//
// which is the spec's `(s/m) * w * 100` with `w` already in percent (so the ×100 and the ÷100 cancel).
//
// The engine never invents data. When weights are missing or contradict each other it says so and refuses to
// print a misleading forecast, because an A-level plan built on a wrong denominator is worse than none.

import type { Assessment } from '../domain/types';
export type { Assessment } from '../domain/types';

export const WEIGHT_EPSILON = 0.01; // floating-point slack when checking whether weights sum to 100

export type DataStatus = 'complete' | 'incomplete' | 'conflict';

export type GradeResult = {
  // Weights
  completedWeight: number;   // Σ weight of graded assessments
  remainingWeight: number;   // Σ weight of not-yet-graded assessments (confirmed + unconfirmed)
  unconfirmedWeight: number; // Σ weight carried by assessments marked source:'unconfirmed'
  knownWeight: number;       // Σ weight of every assessment on record
  missingWeight: number;     // 100 − knownWeight, when positive (weights the student hasn't entered yet)
  // Grades, all in points out of 100
  earned: number;            // E: weighted points banked from graded assessments
  currentOfGraded: number;   // E / completedWeight * 100: average performance so far — NOT the final grade
  maxPossible: number;       // best achievable final grade given what is known (full marks on everything left)
  minPossible: number;       // = earned, if everything remaining scored zero
  projectedIfAverage: number | null; // final grade if remaining scored at the current average; null if none graded
  // Target analysis
  target: number;            // the A (or chosen) threshold, in points
  required: number | null;   // R: average needed on remaining weight to reach target; null when not computable
  verdict: Verdict;
  dataStatus: DataStatus;
  reason?: string;           // why a forecast was withheld, when dataStatus is not 'complete'
};

export type Verdict =
  | 'secured'       // R ≤ 0: target already reached mathematically
  | 'onTrack'       // 0 < R ≤ currentOfGraded (needs no better than current form)
  | 'needsPush'     // currentOfGraded < R ≤ 100
  | 'impossible'    // R > 100
  | 'done'          // no remaining weight; final grade is fixed
  | 'needData';     // weights missing/contradictory — cannot say

const graded = (a: Assessment) => a.status === 'graded' && isNum(a.score) && isNum(a.maxScore) && (a.maxScore as number) > 0;
const isNum = (n: unknown): n is number => typeof n === 'number' && Number.isFinite(n);
const r2 = (n: number) => Math.round(n * 100) / 100;
const clampScore = (a: Assessment) => Math.max(0, Math.min(1, (a.score as number) / (a.maxScore as number)));

/** Points a single graded assessment adds to the final course grade (0 when not graded). */
export function contribution(a: Assessment): number {
  if (!graded(a)) return 0;
  return clampScore(a) * a.weight;
}

/**
 * Compute a subject's grade picture from its assessments and a target threshold (default A = 90 points).
 * `target` is in points out of 100 — the student sets their university's real A cutoff.
 */
export function computeGrade(assessments: Assessment[], target = 90): GradeResult {
  const completedWeight = sum(assessments.filter(graded).map(a => a.weight));
  const knownWeight = sum(assessments.map(a => a.weight));
  const unconfirmedWeight = sum(assessments.filter(a => a.source === 'unconfirmed').map(a => a.weight));
  const remainingWeight = r2(knownWeight - completedWeight);
  const missingWeight = Math.max(0, r2(100 - knownWeight));
  const earned = r2(sum(assessments.filter(graded).map(contribution)));
  const currentOfGraded = completedWeight > 0 ? r2((earned / completedWeight) * 100) : 0;

  // Data integrity first. A forecast on the wrong denominator is a lie dressed as a number.
  let dataStatus: DataStatus = 'complete';
  let reason: string | undefined;
  if (knownWeight > 100 + WEIGHT_EPSILON) { dataStatus = 'conflict'; reason = 'weightsOver100'; }
  else if (missingWeight > WEIGHT_EPSILON || unconfirmedWeight > WEIGHT_EPSILON) { dataStatus = 'incomplete'; reason = unconfirmedWeight > WEIGHT_EPSILON ? 'unconfirmedWeight' : 'missingWeight'; }

  // Max/min achievable finals are only meaningful against a trustworthy total.
  const forecastable = dataStatus === 'complete';
  const maxPossible = forecastable ? r2(earned + remainingWeight) : r2(earned + Math.max(0, remainingWeight - unconfirmedWeight));
  const minPossible = earned;
  const projectedIfAverage = completedWeight > 0 && forecastable
    ? r2(earned + (currentOfGraded / 100) * remainingWeight)
    : null;

  // Required average on the remaining weight: R = (T − E) / Wr × 100.
  let required: number | null = null;
  let verdict: Verdict;
  if (!forecastable) {
    verdict = 'needData';
  } else if (remainingWeight <= WEIGHT_EPSILON) {
    // Nothing left to grade — the final is fixed at `earned`.
    verdict = 'done';
    required = null;
  } else {
    required = r2(((target - earned) / remainingWeight) * 100);
    if (required <= 0) verdict = 'secured';
    else if (required > 100) verdict = 'impossible';
    else if (required <= currentOfGraded + WEIGHT_EPSILON && completedWeight > 0) verdict = 'onTrack';
    else verdict = 'needsPush';
  }

  return {
    completedWeight: r2(completedWeight), remainingWeight, unconfirmedWeight: r2(unconfirmedWeight),
    knownWeight: r2(knownWeight), missingWeight,
    earned, currentOfGraded, maxPossible, minPossible, projectedIfAverage,
    target, required, verdict, dataStatus, reason,
  };
}

/**
 * "What do I need on the next assessment?" — the average required on `nextWeight` points of remaining work to
 * hit the target, holding all other remaining work at `assumeOthers` (default: the current average). Returns
 * null when the inputs cannot answer it (no such weight, or data not forecastable).
 */
export function requiredOn(assessments: Assessment[], nextWeight: number, target = 90, assumeOthers?: number): number | null {
  const g = computeGrade(assessments, target);
  if (g.dataStatus !== 'complete' || nextWeight <= 0 || nextWeight > g.remainingWeight + WEIGHT_EPSILON) return null;
  const others = g.remainingWeight - nextWeight;
  const othersRate = assumeOthers ?? (g.completedWeight > 0 ? g.currentOfGraded : 0);
  const pointsFromOthers = (othersRate / 100) * others;
  const need = target - g.earned - pointsFromOthers;
  return r2((need / nextWeight) * 100);
}

function sum(xs: number[]): number { return xs.reduce((t, x) => t + x, 0); }
