// Entitlements. The one rule this file exists to enforce:
//
//   THE CLIENT NEVER GRANTS ITSELF A TIER.
//
// A paid tier may only arrive from the server, which sets it after validating a store receipt with Apple or
// Google. `profiles.tier` is not writable by the user's own row (see supabase/migrations) — so even a fully
// compromised client that writes `tier: 'pro'` into local storage gains nothing the server will honour, and
// loses it on the next sync. The local value is a cache for offline rendering, never an authority.
//
// The purchase SDK itself is a native module, so it is loaded lazily and absent in Expo Go. Nothing here
// crashes without it: `purchase()` reports `unavailable`, the paywall says so, and no tier changes.
import { track } from './analytics';

export type Tier = 'free' | 'plus' | 'pro';
export type Period = 'month' | 'year';

export type PurchaseResult =
  | { ok: true } // the store accepted it; the server decides the tier on the next sync
  | { ok: false; reason: 'unavailable' | 'cancelled' | 'failed' | 'offline' };

/**
 * A store adapter. Implemented by the native purchase module on a development/production build and left
 * unset in Expo Go. Registered at startup so this module never imports a native package directly.
 */
export type StoreAdapter = {
  buy(tier: Exclude<Tier, 'free'>, period: Period): Promise<'purchased' | 'cancelled' | 'failed'>;
  restore(): Promise<boolean>;
};

let adapter: StoreAdapter | null = null;
export function registerStore(a: StoreAdapter) { adapter = a; }
export const purchasesAvailable = () => adapter !== null;

export async function purchase(tier: Exclude<Tier, 'free'>, period: Period): Promise<PurchaseResult> {
  if (!adapter) { track({ name: 'purchase_failed', props: { reason: 'unavailable' } }); return { ok: false, reason: 'unavailable' }; }
  track({ name: 'purchase_started', props: { tier, period } });
  try {
    const r = await adapter.buy(tier, period);
    if (r === 'purchased') return { ok: true };
    if (r === 'cancelled') return { ok: false, reason: 'cancelled' };
    track({ name: 'purchase_failed', props: { reason: 'store' } });
    return { ok: false, reason: 'failed' };
  } catch {
    track({ name: 'purchase_failed', props: { reason: 'exception' } });
    return { ok: false, reason: 'failed' };
  }
}

export async function restore(): Promise<PurchaseResult> {
  if (!adapter) return { ok: false, reason: 'unavailable' };
  try { return (await adapter.restore()) ? { ok: true } : { ok: false, reason: 'failed' }; }
  catch { return { ok: false, reason: 'failed' }; }
}

/**
 * The only function allowed to produce a paid tier, and it takes its answer from the server's profile row.
 * Anything the client believes locally is discarded here on purpose.
 */
export function entitlementFromServer(serverTier: string | undefined): Tier {
  return serverTier === 'plus' || serverTier === 'pro' ? serverTier : 'free';
}
