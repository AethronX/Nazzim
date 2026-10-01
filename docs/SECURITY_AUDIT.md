# NAZZIM — Security Audit

**Date:** 1 Oct 2026 · **Backend:** Supabase project `vntbusmfohmrarvfkttp` (ap-south-1)
**Method:** static review of the client, plus **executed** tests against the live database.

---

## 1. Threat model

| Asset | Who must never reach it |
|---|---|
| A student's subjects, exams, tasks, study sessions, focus minutes | Any other user; anonymous visitors |
| A student's email and profile | Any other user |
| Subscription tier | **The user themselves** (self-upgrade must be impossible) |
| Service-role key | The mobile client, under any circumstance |
| Product events | Other users |

## 2. Row-level security — verified by execution

Policies were not merely read; they were tested. A transaction created two real `auth.users`, impersonated each
via `set_config('request.jwt.claims', ...)`, attempted cross-user access, then raised an exception to roll
everything back. Confirmed afterwards: `users = 0, subjects = 0, events = 0`.

| Test | Result |
|---|---|
| Profile row auto-created on signup (trigger) | ✅ 2 of 2 |
| User A updates own profile | ✅ 1 row |
| **User A sets own `tier` to `pro`** | ✅ **Denied** (`insufficient_privilege`) |
| User B reads A's subjects | ✅ 0 rows |
| User B reads A's profile | ✅ Sees only their own (1) |
| User B updates A's subject | ✅ 0 rows affected |
| User B inserts a row *as* A (`user_id = A`) | ✅ Denied |
| User B deletes A's subject | ✅ 0 rows affected |
| `anon` reads subjects | ✅ 0 rows |
| `anon` reads `app_config` (prices) | ✅ 1 row — intended, public pricing |

**Isolation model.** Every synced table carries `user_id uuid default auth.uid()` with four policies scoped to
`user_id = (select auth.uid())`. The `default auth.uid()` means a client cannot even *name* another user's id on
insert, and the `with check` clause rejects it if they try.

## 3. Tier integrity (entitlement protection)

The client can edit every column of its profile **except** `tier`:

```sql
revoke update on public.profiles from authenticated, anon;
grant update (name, university, major, year, lang, daily_minutes) on public.profiles to authenticated;
```

`tier` is therefore writable only by the service role — i.e. by a payment webhook. This is the foundation the
IAP work (`SUBSCRIPTION_ARCHITECTURE.md`) builds on; the column is already locked before any money moves.

**Current gap, accepted and documented:** the app also keeps a local `tier` for offline gating. Because nothing
is sold yet, the only thing a tampered local value unlocks is a feature we are not charging for. **Before IAP
ships, local `tier` must become a cache of the server value, never a source of truth.**

## 4. Secrets

| Secret | Where it lives | Client sees it? |
|---|---|---|
| Supabase URL | `.env` → `EXPO_PUBLIC_SUPABASE_URL` | Yes — by design |
| Supabase **publishable** key | `.env` → `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Yes — by design, RLS is the control |
| Supabase **service-role** key | Edge Function environment only | **No** |
| Expo access token | GitHub Actions secret `EXPO_TOKEN` | No |

`scripts/test-release.js` fails the build if `.env` gains a `service_role`/`SUPABASE_SERVICE` value, or any
variable not prefixed `EXPO_PUBLIC_`. Run as part of `npm test`.

## 5. Database function hardening

The first Supabase advisor run flagged `handle_new_user` as a `SECURITY DEFINER` function callable by `anon`
and `authenticated` over `/rest/v1/rpc/`. Fixed:

```sql
revoke execute on function public.handle_new_user()  from public, anon, authenticated;
revoke execute on function public.touch_updated_at() from public, anon, authenticated;
revoke execute on function public.focus_keep_max()   from public, anon, authenticated;
```

All three are trigger-only. Every function also sets `search_path = ''` to prevent search-path hijacking.
**Second advisor run: 0 findings.**

## 6. Input validation (server-side)

Constraints hold even if a malicious client bypasses the app:

| Table | Constraint |
|---|---|
| `profiles` | name ≤ 80, university/major ≤ 120, year ≤ 40, `lang in ('en','ar')`, `daily_minutes between 15 and 600`, `tier in ('free','plus','pro')` |
| synced entities | `id` ≤ 64 chars, `data` ≤ 20 KB per row |
| `focus_days` | `minutes between 0 and 1440` |
| `events` | `name ~ '^[a-z_]{2,48}$'`, `props` ≤ 2 KB |

The `events.name` regex means a client cannot inject arbitrary strings into the analytics table.

## 7. Authentication

- Passwords are never handled by Nazzim's code — `supabase.auth.signInWithPassword` sends them straight to
  GoTrue over TLS. No raw password is stored, logged, or cached.
- Sessions live in AsyncStorage via the Supabase client's own storage adapter, auto-refreshed in the foreground
  only (`startAutoRefresh`/`stopAutoRefresh` on `AppState`) — the recommended React Native pattern.
- Minimum 8 characters enforced client-side; Supabase enforces its own policy server-side.
- `delete-account` resolves the caller **from their own JWT** (`auth.getUser()`), never from a request body, so
  a crafted body cannot delete someone else's account.

## 8. Findings and status

| Severity | Finding | Status |
|---|---|---|
| High | `SECURITY DEFINER` functions callable over the API | **Fixed** (revoked) |
| Medium | Tier was client-writable in an early schema draft | **Fixed** before any data existed (column GRANT) |
| Medium | No rate limiting on sync writes | **Open.** Supabase applies platform limits; a per-user quota belongs with the AI/payment work |
| Low | No AI endpoint abuse protection | **N/A today** — the AI engine runs locally on-device; revisit when a remote model is added |
| Low | No audit log of admin actions | **N/A today** — no admin panel exists |

## 9. Not yet applicable

Honest scoping — these are real requirements that do **not** apply to the current build, and must be revisited
when the named feature lands:

- **AI endpoint protection** — no server AI endpoint exists; `src/ai/` is deterministic, local and offline.
- **File upload validation** — the app accepts no uploads.
- **Admin access control** — no admin surface exists.
- **Webhook signature verification** — no webhooks yet (first one will be the IAP receipt webhook).

## Entitlements (added after the readiness rewrite)

**Finding.** `subscribe(tier)` wrote the tier straight into local state: the client granted itself Plus or Pro
with one tap. This is the `isPremium = true` pattern the brief forbids, and it is why a test device showed a
"Pro" badge without any purchase.

**Fix.** `subscribe()` no longer has any path that sets a tier. It calls the store adapter, and the tier
arrives only from the server on the next sync, via `entitlementFromServer()`. The server's answer now wins
in both directions, so a lapsed subscription actually lapses and a locally forged tier does not survive a
sync. `src/services/billing.ts` carries the rule in a comment at the top of the file.

**Already correct, verified again.** `grant update (name, university, major, year, lang, daily_minutes) on
public.profiles to authenticated` — `tier` is absent from the column grant, so the database refuses a
client-side write regardless of what the app sends. The client-side hole was the only one.

**Still required before charging anyone (M-series, unchanged).** A store adapter must be registered, and an
Edge Function must validate the Apple/Google receipt before writing `profiles.tier` with the service role.
Until that exists `purchasesAvailable` is false, the paywall says so in plain language, and nothing is sold.
