# NAZZIM — Production Audit

**Audited:** 1 Oct 2026 · **Version:** 1.0.0 (build 1) · **Commit:** see `git log -1`
**Scope:** the Expo app on branch `expo-app`, the Supabase project `vntbusmfohmrarvfkttp`, and the EAS build config.

> **This app is not approved by Apple or Google.** It is *submission-ready and policy-aware*. Final approval is
> decided by each store's review. Items marked **[VERIFY]** could not be confirmed from inside this environment
> and need a human to check them against the current store policies before submitting.

---

## 1. Critical Issues

Issues that would block a submission or break a shipped build. **All of these are now fixed in source**, except
where a Remaining Manual Step is named.

| # | Issue | Status |
|---|---|---|
| C1 | No iOS `bundleIdentifier` and no Android `package` — the build cannot be uploaded to either store | **Fixed.** `com.nazzim.app` on both. Change it before first submit if you own a different domain; after the first upload it is permanent |
| C2 | Subscriptions are recorded by a local flag only (`subscribe()` writes `tier` to AsyncStorage). Anyone can unlock Plus/Pro by editing device storage, and Apple rejects paid features not sold through In-App Purchase | **Open — see M1.** The screen already shows a "demo, no charge" toast, so nothing misleading ships, but **the paid tiers must not be advertised as purchasable until IAP is wired** |
| C3 | Privacy Policy, Terms and Support rows were dead buttons (`onPress={() => {}}`). An app with accounts cannot pass review without a reachable policy | **Fixed in app.** Rows now open `expo.extra.*Url`, and the pages are written in `legal/` (EN + AR). **Only hosting is left — see M2** |
| C4 | `delete-account` must erase server data, not just sign out | **Fixed and verified.** Edge Function `delete-account` (JWT-verified) deletes the auth user; every table cascades from `auth.users` |
| C5 | A production build could silently point at a dev backend | **Fixed.** `src/config/env.ts` + `scripts/test-release.js` fail the build on a localhost URL, a service-role key, or a non-`EXPO_PUBLIC_` variable in `.env` |

## 2. High Priority Issues

| # | Issue | Status |
|---|---|---|
| H1 | iOS had no notification purpose string; iOS shows the system prompt with no explanation | **Fixed.** `NSUserNotificationsUsageDescription` explains the daily reminder and the streak nudge |
| H2 | Android permissions were undeclared, so autolinking could add more than the app needs | **Fixed.** `permissions: ["VIBRATE"]` only; camera, mic, contacts, location and calendar are explicitly blocked |
| H3 | Analytics logged every product event to the device console | **Fixed.** The console sink is attached only when `isDev` |
| H4 | One EAS channel (`main`) for every profile — a preview build could receive a production update | **Fixed.** `development` / `preview` / `production` channels are separate |
| H5 | Splash background (`#0F2257`) did not match the brand navy (`#112357`), so the launch screen flashed a different colour | **Fixed** |
| H6 | No crash reporting | **Open — see M4.** No crash/error reporting is wired. Analytics events exist, but a crash is invisible today |
| H7 | Password reset is not reachable in the app | **Open — see M5.** Supabase supports it; the UI and the redirect URL are missing |

## 3. Medium Priority Issues

| # | Issue | Status |
|---|---|---|
| M-1 | Free-tier limits (2 active exams, 1 insight) are enforced in the client only | **Known limitation.** Acceptable while nothing is sold; must move server-side with payments (see `SUBSCRIPTION_ARCHITECTURE.md`) |
| M-2 | Email confirmation redirects to Supabase's default Site URL (`localhost`) | **Open — see M3.** A confirmed email currently lands on a broken page |
| M-3 | Sync has no explicit "offline" indicator; a failed sync shows "Couldn't sync" without distinguishing offline from server error | Minor. Data is never lost — local state is the source of truth |
| M-4 | No pagination on sync pull. Fine to ~500 rows per collection (the current page size); a four-year account could exceed it | Revisit when a user passes ~2,000 sessions |
| M-5 | `expo-store-review` asks for a rating after the 3rd session; Apple limits prompts to 3/year and the OS enforces it, but the trigger is not throttled by us | Low risk, OS-governed |

## 4. Low Priority Issues

| # | Issue |
|---|---|
| L1 | `src/lib/data.ts` still exports `HABITS` and `WEEK_MINUTES` — unused after the Progress rewrite. Dead code, no user impact |
| L2 | The `grotesk` face name is now a misnomer (it resolves to Inter). Cosmetic, documented in `src/lib/theme.ts` |
| L3 | Web build is not a shipping target; it exists for preview screenshots only |

## 5. Security Findings

Full detail in `SECURITY_AUDIT.md`. Summary:

- **Row-level security verified by execution,** not by reading policy text. A two-user test inside Postgres confirmed:
  user B cannot read, update, insert-as, or delete user A's rows; `anon` sees only `app_config`; a client cannot
  change its own `tier` (column-level `GRANT`).
- **No secret ships in the client.** Only the Supabase URL and the *publishable* key, both designed to be public.
  The service-role key exists solely inside the `delete-account` Edge Function's environment.
- **Trigger functions are not callable over the API** (`handle_new_user`, `touch_updated_at`, `focus_keep_max`
  had `EXECUTE` revoked after the first Supabase advisor run flagged them).
- **Supabase security advisor: 0 findings.**
- **Open:** no rate limiting on sync writes; no AI endpoint exists yet, so AI abuse protection is not applicable
  until a remote model is added.

## 6. Privacy Findings

Full detail in `PRIVACY_DATA_MAP.md`. Summary:

- Nazzim collects **no contacts, no location, no camera/mic, no advertising identifier, and does no tracking**
  in Apple's sense (no data is shared with third parties for advertising or cross-app measurement).
- Analytics events carry **ids and counts only** — never a subject name, task title or note. This is enforced by
  the typed `AnalyticsEvent` union in `src/services/analytics.ts`: there is no free-text field to misuse.
- Working signed out is a first-class path: an account adds sync and backup, nothing else.
- Account deletion removes the auth user and cascades to every row, and clears the device.
- **[VERIFY]** Apple's Privacy Nutrition Label and Google's Data Safety form must be filled from
  `PRIVACY_DATA_MAP.md` by a human before submission.

## 7. Performance Findings

- **Fixed:** a running focus timer used to re-render the whole app every second. The store now holds only the
  end time; one timeout completes the session and a shared ticker re-renders the clock alone.
- Measured on device (Expo Go, iPhone, dev build): **UI 60 fps, JS 60 fps, layout 0.6 ms.** Release builds are
  faster than dev builds, so these are a floor, not a ceiling.
- Lists are short by nature (a semester's subjects/exams). No virtualisation needed yet; revisit if a student
  passes ~200 visible rows on one screen.
- All engine functions are pure and synchronous over small arrays; no expensive work happens during render.

## 8. App Store Findings

| Requirement | State |
|---|---|
| App icon, splash | ✅ Present, brand navy, adaptive icon for Android |
| Bundle identifier | ✅ `com.nazzim.app` **[VERIFY you own this domain or change it]** |
| Version / build strategy | ✅ `version` semver + `autoIncrement` on the production profile |
| Permission purpose strings | ✅ Notifications only, explained |
| Permission timing | ✅ Requested after the first finished session, never at launch |
| Onboarding | ✅ 3 steps, skippable, plus "Explore with a sample semester" |
| Account create / login / logout / delete | ✅ All four present (5.1.1(v) delete is real) |
| Privacy Policy URL | ⚠️ Wired in-app; page written (`legal/privacy.html`, `legal/privacy-ar.html`); **must be hosted (M2)** |
| Terms | ⚠️ Same |
| Sign in with Apple | N/A today (no third-party login). **Required if Google/Facebook login is ever added** |
| In-App Purchase | ❌ **Not implemented. Do not submit with purchasable tiers until M1 is done** |
| Restore purchases | ❌ Button exists, no StoreKit behind it (M1) |
| Demo account for review | ⚠️ See "App Review Notes" in `STORE_RELEASE_CHECKLIST.md` — the sample-semester path means a reviewer needs no account at all, which is the strongest answer |
| Guideline 4.2 (minimum functionality) | ✅ Real engine, offline-capable, not a web wrapper |

## 9. Google Play Findings

| Requirement | State |
|---|---|
| Application ID | ✅ `com.nazzim.app` |
| Adaptive icon, splash | ✅ |
| Target SDK | ✅ Managed by Expo SDK 57 **[VERIFY against Play's current target-API deadline at submission time]** |
| Permissions | ✅ `VIBRATE` only; sensitive ones explicitly blocked |
| Data Safety form | ⚠️ Prepare from `PRIVACY_DATA_MAP.md` |
| Account deletion (in-app + web) | ⚠️ In-app ✅. Web page written (`legal/delete-account.html`, bilingual); **must be hosted (M2)** |
| Play Billing | ❌ Same as M1 |
| Content rating | ⚠️ Questionnaire to complete; expected "Everyone" — no UGC, ads, or sensitive content |
| AAB build | ✅ `eas build -p android --profile production` produces an AAB by default |

## 10. Remaining Manual Steps

These need an account, a domain, or a human decision. They are **not** code problems.

| # | Step | Why it cannot be done from here |
|---|---|---|
| **M1** | Wire In-App Purchase (RevenueCat or raw StoreKit 2 + Play Billing) and server-side entitlement | Needs an Apple Developer account, App Store Connect products, and a RevenueCat/Play account. Architecture is specified in `SUBSCRIPTION_ARCHITECTURE.md` |
| **M2** | Host `legal/` at `nazzim.app` so `/privacy`, `/terms`, `/support` and `/delete-account` resolve | Pages are written and verified (7 files, EN + AR, no third-party requests). `legal/vercel.json` gives the clean URLs. Only the domain + deploy is left. Have a lawyer review before commercial launch |
| **M3** | Supabase → Authentication → URL Configuration: set Site URL to the real app/web URL, and add a custom SMTP sender | Needs dashboard access; the built-in mailer is rate-limited and for testing only |
| **M4** | Add crash reporting (Sentry via `@sentry/react-native`, or EAS Insights) | Needs a project DSN. Wire `src/services/crash.ts` as the single entry point when the DSN exists |
| **M5** | Password reset UI + redirect URL | Depends on M3's Site URL |
| **M6** | Apple: create the App ID, provisioning, App Store Connect record; fill the Privacy Nutrition Label | Needs the developer account |
| **M7** | Google: create the Play Console app, upload a signing key, fill Data Safety + content rating | Needs the Play account |
| **M8** | Replace `REPLACE_WITH_*` in `eas.json` `submit.production` with the real `ascAppId` and `appleTeamId` | Comes from App Store Connect |
| **M9** | **[VERIFY]** Re-read Apple's current review guidelines and Play's current policy pages at submission time | Store policies change; this audit reflects the state of the code, not a live policy read |

---

## Audit method

What was actually executed, not assumed:

- `grep` sweep for `TODO`, `FIXME`, `console.*`, `localhost`, `service_role`, `onPress={() => {}}` across `src/`.
- Row-level security proven by running a two-user transaction inside Postgres (`auth.users` + `set_config` to
  impersonate each user), then rolled back; row counts verified at zero afterwards.
- Supabase security advisor run twice: once found two `SECURITY DEFINER` functions callable over the API
  (fixed by revoking `EXECUTE`), the second run returned zero findings.
- 10 automated suites pass: exam engine, academic engine, rescue, planner, exam report, insights, habits, sync,
  WCAG contrast, release guards.
- WCAG 2.2 contrast measured for every rendered colour pair in both themes and all four accent families;
  four real failures were found and fixed.
- iOS and web bundles exported successfully.
- End-to-end browser runs of: onboarding (ar + en), rescue flow, planner, focus completion, plan limit,
  account error states, weekly recap.

---

## Round 2 — integrity audit (1 October 2026)

Triggered by a screen-by-screen review against the running app. Each finding was reproduced by executing the
real code, not by reading it.

| # | Finding | Evidence | Fix |
| --- | --- | --- | --- |
| **R1** | Readiness could be driven to 90% with four taps and zero minutes studied | ran `readiness()` on a four-chapter exam | Rewritten as an evidence model. Tapping now caps a chapter at 35%. See `READINESS_MODEL.md` |
| **R2** | Three screens showed different numbers for one subject (67% / 72% / 31%), none labelled | screenshots of Subjects, More, Progress | One headline everywhere — readiness — each with its own words. Work completed is stated in a sentence, never as a bare second percentage |
| **R3** | "This week" meant planned minutes on Today and focused minutes on Progress — 11h10m vs 1m | `analyzeAcademicLoad` vs `weekMinutes` | Relabelled "Planned ahead" and "Actually focused" |
| **R4** | "Semester progress 31%" sat beside "310/1000 XP"; a game score and an academic one at equal weight | Progress screen | Headline is readiness; XP moved to a quiet line at the foot of the card |
| **R5** | The streak counted a tapped session as a study day | `activeDaySet` | A revision block now needs real focused minutes. Tasks still count on being ticked |
| **R6** | The client granted itself any tier | `subscribe: tier => set({ tier })` | Removed; see `SECURITY_AUDIT.md` |
| **R7** | No error boundary — a render crash meant a white screen and a silent uninstall | — | `ErrorBoundary` at root and screen level, reporting `app_error` with no user content |
| **R8** | Weekly chart drew a 1-minute day as an invisible bar in a 132pt frame | Progress screen | Scales to the week's own best day, with a visible floor for any real study |
| **R9** | Greeting wrapped mid-phrase ("مساء الخير، / Osama") | Today screen | Greeting and name are separate lines by design |
| **R10** | Subjects with no exam were dead cards: 0%, "nothing due", no action | Subjects tab | Each now offers "Add exam" |
| **R11** | Status thresholds were calibrated against the old, inflated readiness | — | `expected` is now simulated with the same function, so the bar moves with the formula |
| **R12** | Web splash logged a React DOM error on every launch | console | Static mark on web; the stroke animation stays on native |

**Not a defect.** The blue circle at the bottom-left of the reported screenshots is Expo Go's own dev-menu
bubble, not a Nazzim element.

**Still open and unchanged:** the M-series manual steps. Nothing above makes the app sellable — see
`SUBSCRIPTION_ARCHITECTURE.md` for what receipt validation still requires.
