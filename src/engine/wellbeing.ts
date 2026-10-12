// Sleep, training and energy — placed beside study, never on top of it.
//
// Three rules keep this honest, and they are the whole design:
//   1. No diagnosis, no targets dressed as medicine. The student sets what they aim for; we only count.
//   2. More is not better. A rest day is a logged, successful day; extra training is not scored higher.
//   3. Timing is not cause. The weekly summary may say "your best focus days followed 7h+ nights" — it never
//      says sleep caused the focus, because the data cannot support that claim.

import type { DateKey, DayLog } from '../domain/types';
import { addDays } from '../lib/exams';

/** A day counts as logged if the student recorded anything at all — including declaring it a rest day. */
export function isLogged(d: DayLog | undefined): boolean {
  if (!d) return false;
  return d.restDay === true || [d.sleepHours, d.water, d.runMinutes, d.liftMinutes, d.energy, d.focusFelt, d.sleepQuality, d.chessMinutes, d.podcastMinutes]
    .some(v => v !== undefined && v !== null);
}

export function lastDays(logs: Record<DateKey, DayLog>, today: DateKey, days: number): DayLog[] {
  const out: DayLog[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addDays(today, -i);
    const d = logs[key];
    if (d) out.push(d);
  }
  return out;
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : undefined);
const defined = (xs: (number | undefined)[]) => xs.filter((x): x is number => typeof x === 'number' && Number.isFinite(x));

export type WeekWellbeing = {
  loggedDays: number;
  sleepAvg?: number;
  waterAvg?: number;
  trainingDays: number;   // days with any run or lift recorded
  restDays: number;
  energyAvg?: number;
  movementMinutes: number;
};

export function weekSummary(logs: Record<DateKey, DayLog>, today: DateKey): WeekWellbeing {
  const week = lastDays(logs, today, 7);
  return {
    loggedDays: week.filter(isLogged).length,
    sleepAvg: mean(defined(week.map(d => d.sleepHours))),
    waterAvg: mean(defined(week.map(d => d.water))),
    trainingDays: week.filter(d => (d.runMinutes ?? 0) > 0 || (d.liftMinutes ?? 0) > 0).length,
    restDays: week.filter(d => d.restDay).length,
    energyAvg: mean(defined(week.map(d => d.energy))),
    movementMinutes: week.reduce((t, d) => t + (d.runMinutes ?? 0) + (d.liftMinutes ?? 0), 0),
  };
}

/**
 * A timing observation, stated as timing and nothing more. Returns null unless there is enough logged data
 * on both sides to say anything at all — silence is better than a story.
 */
export type Observation = { kind: 'sleepFocus'; betterAfter: number; worseAfter: number } | null;

export const MIN_PAIRS = 3; // days needed on each side before any pattern is mentioned

export function observeSleepVsFocus(logs: Record<DateKey, DayLog>, today: DateKey, days = 14): Observation {
  const window = lastDays(logs, today, days);
  const pairs = window.filter(d => typeof d.sleepHours === 'number' && typeof d.focusFelt === 'number');
  if (pairs.length < MIN_PAIRS * 2) return null;
  const sorted = [...pairs].sort((a, b) => a.sleepHours! - b.sleepHours!);
  const half = Math.floor(sorted.length / 2);
  const low = sorted.slice(0, half), high = sorted.slice(sorted.length - half);
  if (low.length < MIN_PAIRS || high.length < MIN_PAIRS) return null;
  const lowFocus = mean(low.map(d => d.focusFelt!))!;
  const highFocus = mean(high.map(d => d.focusFelt!))!;
  if (Math.abs(highFocus - lowFocus) < 0.3) return null; // no difference worth mentioning
  return { kind: 'sleepFocus', betterAfter: Math.round(highFocus * 10) / 10, worseAfter: Math.round(lowFocus * 10) / 10 };
}

/** Merge a partial edit into a day, dropping keys the student cleared. */
export function patchDay(current: DayLog | undefined, date: DateKey, patch: Partial<DayLog>): DayLog {
  const next: DayLog = { ...(current ?? { date }), ...patch, date };
  for (const k of Object.keys(patch) as (keyof DayLog)[]) if (patch[k] === undefined) delete next[k];
  return next;
}
