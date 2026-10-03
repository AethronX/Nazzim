import { isDev } from '../config/env';
// Product analytics: one typed event catalogue, one track() call, pluggable sinks.
// Events carry ids and counts only, never titles, notes or other free text the student typed.
export type AnalyticsEvent =
  | { name: 'app_opened' }
  | { name: 'onboarding_completed' }
  | { name: 'subject_created' }
  | { name: 'task_created'; props: { hasSubject: boolean } }
  | { name: 'task_completed' }
  | { name: 'exam_created'; props: { chapters: number; daysAhead: number; source: 'manual' | 'planner' } }
  | { name: 'plan_generated'; props: { sessions: number; source: 'local' | 'remote' } }
  | { name: 'study_session_started'; props: { kind: string } }
  | { name: 'study_session_completed'; props: { confidence: number } }
  | { name: 'focus_completed'; props: { minutes: number } }
  | { name: 'rescue_plan_created'; props: { moves: number; dropped: number; tight: number } }
  // Retrieval practice: the evidence loop behind readiness
  | { name: 'card_added' }
  | { name: 'card_graded'; props: { grade: number } }
  | { name: 'recall_session_completed'; props: { cards: number; correct: number } }
  // Fires when the explainer screen is opened, which is what the name says. It used to fire on the recall
  // button inside that screen, so it measured intent to self-test and was named after reading an explanation.
  | { name: 'evidence_explainer_opened' }
  // Monetisation funnel (so the paywall can be measured rather than guessed at)
  | { name: 'paywall_viewed'; props: { trigger: string } }
  | { name: 'paywall_dismissed'; props: { trigger: string } }
  | { name: 'purchase_started'; props: { tier: string; period: string } }
  | { name: 'purchase_failed'; props: { reason: string } }
  | { name: 'subscription_started'; props: { tier: string; period: string } }
  | { name: 'subscription_cancelled' }
  // Stability. `where` is a component name and `message` an error class — never user content.
  | { name: 'app_error'; props: { where: string; message: string; fatal: boolean } }
  // Retention loops (measure each mechanism's effect on D7 / D30)
  | { name: 'reminders_enabled' }
  | { name: 'study_time_set'; props: { time: string } }
  | { name: 'weekly_recap_opened' };

export type Sink = (e: AnalyticsEvent & { at: number }) => void;

const sinks: Sink[] = [];
const buffer: (AnalyticsEvent & { at: number })[] = [];

// Register a sink (e.g. PostHog or a Supabase `events` table). Buffered events are flushed to it.
export function addSink(sink: Sink) {
  sinks.push(sink);
  buffer.splice(0).forEach(e => sink(e));
}

export function track(event: AnalyticsEvent) {
  const e = { ...event, at: Date.now() };
  if (!sinks.length) { if (buffer.length < 200) buffer.push(e); return; }
  for (const s of sinks) { try { s(e); } catch {} }
}

// Development sink: readable log in the Metro console. Never attached in preview or production builds, so no
// product event is written to the device log on a shipped app.
if (isDev) addSink(e => console.log('[analytics]', e.name, 'props' in e ? e.props : ''));
