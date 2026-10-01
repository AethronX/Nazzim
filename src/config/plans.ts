// Plans, prices and limits in one place. The app reads them through `planConfig()`, so a remote config
// (admin panel → Supabase table / edge config) can change prices and limits without an app release:
// call `applyRemotePlanConfig()` with what the server returns.
//
// Pricing rationale (USD, before store localisation): students compare against a coffee, not against
// Motion ($19+). Plus at $4.99/mo sits with Todoist/TickTick; the yearly price ($29.99, about 2.50/mo)
// is the one we push because a semester is the natural commitment. Pro doubles Plus for power users.
// Rescue Mode stays free on purpose: paywalling a student at their most stressed moment destroys trust.
export type Tier = 'free' | 'plus' | 'pro';
export type Limits = { activeExams: number; insights: number };
export type PlanConfig = {
  trialDays: number;
  prices: Record<Exclude<Tier, 'free'>, { month: number; year: number }>;
  limits: Record<Tier, Limits>;
};

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  trialDays: 7,
  prices: { plus: { month: 4.99, year: 29.99 }, pro: { month: 9.99, year: 59.99 } },
  limits: {
    free: { activeExams: 2, insights: 1 },
    plus: { activeExams: Infinity, insights: 3 },
    pro: { activeExams: Infinity, insights: 3 },
  },
};

let current: PlanConfig = DEFAULT_PLAN_CONFIG;
export const planConfig = () => current;
export function applyRemotePlanConfig(c: Partial<PlanConfig>) {
  current = { ...current, ...c, prices: { ...current.prices, ...c.prices }, limits: { ...current.limits, ...c.limits } };
}

export const limitsFor = (tier: Tier): Limits => current.limits[tier];
export const canAddExam = (tier: Tier, activeExams: number) => activeExams < limitsFor(tier).activeExams;
export const fmtPrice = (n: number, ar: boolean) => (n === 0 ? (ar ? '0$' : '$0') : ar ? `${n.toFixed(2)}$` : `$${n.toFixed(2)}`);
export const yearlySaving = (t: Exclude<Tier, 'free'>) => {
  const p = current.prices[t];
  return Math.round((1 - p.year / (p.month * 12)) * 100);
};
