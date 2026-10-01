# NAZZIM — Subscription Architecture

**Status: designed, not implemented.** Nothing is sold today. The subscription screen records a choice locally
and the toast says *"demo, no charge"*. This document is the plan to make it real, plus the rule that must never
be broken.

> **Do not submit to either store with the paid tiers presented as purchasable until §4 is done.** Selling
> digital features outside In-App Purchase is an automatic rejection, and a local boolean is not an entitlement.

---

## 1. The rule

```
❌ NEVER:  if (tier === 'pro') { unlockFeature() }      // where tier came from the device
✅ ALWAYS: server verifies the receipt → writes profiles.tier → client caches it for offline use
```

`profiles.tier` is **already locked server-side** (see `SECURITY_AUDIT.md` §3):

```sql
revoke update on public.profiles from authenticated, anon;
grant update (name, university, major, year, lang, daily_minutes) on public.profiles to authenticated;
```

A client cannot raise its own tier. The webhook (service role) is the only writer. That foundation is in place
before any money moves, which is the hard part done.

## 2. Tiers

| | Free | Plus | Pro |
|---|---|---|---|
| Today / next move | ✅ | ✅ | ✅ |
| Subjects, tasks, focus | ✅ | ✅ | ✅ |
| **Rescue Mode** | ✅ **free on purpose** | ✅ | ✅ |
| Smart Planner | 2 active exams | Unlimited | Unlimited |
| Progress insights | 1 | All | All |
| Exam/daily reminders | — | ✅ | ✅ |
| Calendar sync *(not built)* | — | — | ✅ |
| AI study coach *(not built)* | — | — | ✅ |

**Rescue Mode stays free deliberately.** Paywalling a student at their most stressed moment is the fastest way
to lose trust and earn one-star reviews. It is also the best advertisement for Plus.

Prices (`src/config/plans.ts`, overridable from the `app_config` table without a release):
Plus **$4.99/mo or $29.99/yr**, Pro **$9.99/mo or $59.99/yr**, 7-day trial.

## 3. Recommended stack: RevenueCat

| | RevenueCat | Raw StoreKit 2 + Play Billing |
|---|---|---|
| Both stores, one API | ✅ | ❌ two implementations |
| Receipt validation, renewals, refunds, grace periods | ✅ handled | ❌ you build and maintain it |
| Webhook to Supabase | ✅ one endpoint | ❌ Apple S2S + Google RTDN separately |
| Cost | Free under ~$2.5k/mo tracked revenue, then ~1% | Free |
| Lock-in | Moderate | None |

**Recommendation: RevenueCat.** At this stage the engineering time saved on edge cases (refunds, billing
retry, upgrade/downgrade proration, family sharing) is worth far more than the 1%. Revisit past ~$50k MRR.

## 4. Implementation plan

**Step 1 — Store products.** App Store Connect and Play Console: create auto-renewable subscriptions in one
group (`nazzim_plus_monthly`, `nazzim_plus_yearly`, `nazzim_pro_monthly`, `nazzim_pro_yearly`) so upgrades
prorate correctly. Attach a 7-day free trial as an introductory offer.

**Step 2 — Client.** `npx expo install react-native-purchases` (needs a development build; Expo Go cannot do
IAP). New file `src/services/payments.ts` as the single boundary:

```ts
export type Entitlement = { tier: Tier; expiresAt: string | null; willRenew: boolean; inGracePeriod: boolean };
export async function configure(userId: string | null): Promise<void>;
export async function getEntitlement(): Promise<Entitlement>;   // cached, offline-safe
export async function purchase(plan: PlanId): Promise<Entitlement>;
export async function restore(): Promise<Entitlement>;          // Apple requires this button
export function onEntitlementChange(cb: (e: Entitlement) => void): () => void;
```

Nothing outside this file may import `react-native-purchases`, so the provider stays swappable.

**Step 3 — Webhook.** A Supabase Edge Function `revenuecat-webhook`:
1. Verify the `Authorization` header against a shared secret stored in Edge Function env — **reject unsigned
   calls** (this is the first webhook in the system; signature verification is mandatory from day one).
2. Map the RevenueCat event to a tier (`INITIAL_PURCHASE`, `RENEWAL`, `PRODUCT_CHANGE` → tier;
   `CANCELLATION`, `EXPIRATION` → `free` at period end; `BILLING_ISSUE` → keep tier during grace;
   `REFUND` → `free` immediately).
3. `update public.profiles set tier = $1 where id = $2` using the service role.

**Step 4 — Client trusts the server.** `profiles.tier` already arrives on every sync (`src/services/sync`). The
local value becomes a **cache**: used while offline, overwritten by the server whenever they disagree.

**Step 5 — Gate server-side too.** Once tiers are paid, the free limits must also be enforced in Postgres, so a
patched client gains nothing:

```sql
create policy "free tier: at most 2 active exams" on public.exams for insert to authenticated
with check (
  (select tier from public.profiles where id = auth.uid()) <> 'free'
  or (select count(*) from public.exams e where e.user_id = auth.uid() and not e.deleted) < 2
);
```

## 5. Subscription states to handle

| State | App behaviour |
|---|---|
| Never subscribed | Free limits; paywall at the limit moment, not at launch |
| Trial active | Full tier; show the end date plainly |
| Active | Full tier |
| Cancelled, not expired | **Keep access to the end of the period** — a common and costly bug |
| Expired | Drop to free; keep all data, lock only the paid features |
| Billing retry / grace | **Keep access.** Show a calm "update your payment method" note |
| Refunded | Drop to free immediately |
| Revoked (family sharing) | Drop to free |
| Restored on a new device | `restore()` → entitlement returns → tier applied |

**Data is never deleted when a subscription ends.** A student who lapses mid-semester must not lose their plan.

## 6. Current gating (honest statement)

Today `src/config/plans.ts` enforces free limits **in the client only**:
- `canAddExam(tier, activeExams)` → 2 for Free
- `limitsFor(tier).insights` → 1 for Free

This is acceptable *only because nothing is sold*. The limits exist to shape the product, not to protect
revenue. The moment IAP ships, Step 5 is mandatory.

## 7. Store rules not to break

- **Apple 3.1.1:** digital content must use IAP. No external payment link, no "subscribe on our website" button.
- **Apple 3.1.2:** price, period, renewal terms and a link to Terms and Privacy must be visible *before*
  purchase. The current screen already shows all of these.
- **Restore Purchases** must be reachable without an account.
- **Play:** same, via Google Play Billing.
- Subscription management must link to the OS-level page (`StoreKit`'s manage-subscriptions sheet / Play's
  subscription centre), never a custom cancellation flow.
