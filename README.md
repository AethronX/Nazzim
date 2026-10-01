# Nazzim

NAZZIM (نظِّم) is an academic operating system for students: it understands their semester (subjects, exams, tasks,
time), plans when to do the work, helps them do it, and adapts the plan when they fall behind. Expo (React Native),
English and Arabic (RTL), light and dark.

Core loop: **academic data → understanding → planning → action → tracking → adaptation.**

## Run

```bash
npm install
npx expo start          # press i / a / w for iOS, Android, web
npm run typecheck
npx expo lint
npm test                # exam engine, academic engine, Rescue Mode, Smart Planner, insights, WCAG contrast audit
```

The app uses only modules bundled with Expo Go, so no development build is needed yet.

## Architecture

```
src/domain/types.ts      Academic context: Subject, Task (due + plannedFor), Exam, Session, AcademicContext
src/engine/              Pure, tested logic (no React, no storage, no network; can run on a server later)
  academic.ts            recommendNextAction, agendaFor, analyzeAcademicLoad, subject/semester progress
  rescue.ts              assessBehind, generateRescuePlan (deadline-first, within daily capacity, honest "tight")
  insights.ts            summarizeProgress, generateStudyInsights (all from real activity; no sample numbers)
  exam.ts                examReport: readiness vs plan, status, phase, topics, remaining work, next session
src/lib/exams.ts         Exam engine: spaced reviews, ratings, roll-forward, readiness
src/ai/                  AI orchestration layer. Screens call operations and get structured data back
  index.ts               AcademicAI interface + `ai` switch point (local today; an LLM via an Edge Function later)
  planner.ts             parsePlanRequest (EN/AR sentence → structured request), proposePlan (sessions + reasons)
src/services/analytics.ts Typed product events (no free text), pluggable sinks
src/config/plans.ts      Prices, trial and limits per tier (loaded from the `app_config` table at launch)
src/services/supabase.ts Supabase client (URL + publishable key from .env)
src/services/sync/       core.ts: pure push/pull/merge (tested) · index.ts: auth, sync, events, remote config
supabase/                SQL migrations (schema + RLS) and the delete-account Edge Function
src/lib/store.tsx        State + actions, AsyncStorage (`nazzim.v2`, schema 3, migrations)
src/lib/academic.ts      useAcademic(): builds the AcademicContext once per render
src/components/          Design system: ui (T, Btn, PrimaryBtn, Icon, Toggle), Page/Section/Row/Choice,
                         Academic (SubjectTile, ProgressRing, Bar, SubjectPicker, KindBadge), Agenda, TabBar, Overlays
```

Screens (`src/app/`):

```
(tabs)/index.tsx    Today: YOUR NEXT MOVE, calm Rescue nudge, semester progress, load, next deadline, schedule
(tabs)/plan.tsx     Plan: week strip, the day's agenda, exams
(tabs)/subjects.tsx Subjects with target grade and progress
(tabs)/more.tsx     Profile, upcoming exams, Progress, Rescue, Settings, Plans, Support
account.tsx         Account (optional): sign in / create, sync status, sign out, delete account
welcome.tsx         Onboarding: language, where you study, subjects + target grades, next exam → semester built
planner.tsx         Smart Planner: one sentence → plan preview with reasons → "Add to my plan"
rescue.tsx          Rescue Mode: where things stand, daily capacity, rebuilt week, apply
focus.tsx           Focus linked to the task/session; on finish: rate (→ readiness) or mark task done
subject/[id] · subject/new · task/new · exam/new · exam/[id] · progress · profile · settings · subscription
```

## Design notes

- Colour system (`src/lib/theme.ts`): one blue family, no gradients, no second hue. Neutrals are tinted with the same
  hue (222°) so greys, black and blue read as one material. Red appears only on "Delete account".

  | Role | Light | Dark | Used for |
  |---|---|---|---|
  | Blue 500 | `#2B5CE6` | `#2B5CE6` | primary buttons, active tab, progress, now-line |
  | Blue 900 "midnight" | `#0F2257` | `#16275E` | launch screen, NOW card, exam card, Pro row, toast, mini-timer |
  | Blue 50 / 100 | `#EEF3FF` / `#DCE6FF` | `#13214A` / `#1A2B5E` | selected states, badges, chart bars, timer and XP tracks |
  | Accent text | `#2B5CE6` | `#8EAAF6` (Blue 300) | links, streaks, XP, labels |
  | Ink | `#0B1220` | `#EEF2F8` | text, selected chips |
  | Text 2 / 3 | `#4B5568` / `#5F6B80` | `#B3BCCC` / `#8B95A8` | secondary / done and meta |
  | Surfaces | `#F4F6FA` / `#FFF` / `#F8FAFD` | `#0A0F1A` / `#111827` / `#172033` | screen / cards / inner |
  | Danger | `#C8322B` | `#F0625A` | delete account only |

  WCAG 2.2 AA everywhere: lowest text pair is `ink3` on `bg` at 4.98:1 (light) and 5.39:1 (dark). Control borders
  meet 3:1 (1.4.11) and the weekly chart prints its values. Shadows are tinted midnight, not neutral black.
- Apple HIG: touch targets reach 44pt (Btn `hitSlop` 10), text follows the system text size up to 130%,
  haptics on completing tasks, habits and sessions (`src/lib/feedback.ts`), and a one-time rating request after
  the 3rd finished focus session (never on launch).
- App colour (Settings › General): Blue (default), Pink, Violet or Teal. Each is a full tonal scale in `ACCENTS`
  (`src/lib/theme.ts`) with its own hero surface, contrast-checked in light and dark. The native splash and the app
  icon stay blue.
- Dark mode: follows the phone by default, or pick System / Light / Dark in Progress › Appearance.
- Reminders (`src/lib/reminders.ts`, local notifications, no server): daily habit check-in at 08:00, 20:00 or 22:00,
  exam eve at 19:00 for each exam in the plan, and a notification when a running focus session ends (so it works with
  the app closed). Permission is asked only when the user turns Reminders on in Progress. Tapping a reminder opens its
  screen. They follow the app language and reschedule when settings, language or the plan change. Not available on web.
- iPad: `supportsTablet` is on and all orientations are allowed. Content is one centred column up to 680pt wide.
- Fonts: Plus Jakarta Sans (body), Space Grotesk (display and numbers), IBM Plex Sans Arabic (Arabic).
- Arabic switches layout with the `direction` style, so no app reload is needed. Numbers stay left-to-right.
- The progress, habits, XP, language and plan choice are saved on the device. The focus timer uses the wall clock, so it stays correct in the background.

## Exam engine (`src/lib/exams.ts`)

Turns "exam on <date>, chapters A, B, C" into a spaced-review plan, based on the two study methods with the
strongest evidence (spaced practice and self-testing; Dunlosky et al., 2013):

- Each chapter gets a first study session (40 min) in the first ~60% of the window, then reviews (20 min) after
  1, 3 and 7 days if they land before the exam, and a mock test (60 min) the day before. Max 4 sessions a day.
- After a session the student rates it Hard / OK / Easy. Hard adds a review tomorrow; Easy drops the next one.
- Missed sessions roll forward to today when the app opens or returns to the foreground.
- Readiness (0–100) = sessions done per chapter, weighted by the last rating, plus 10 for the mock test.
- Exams and sessions persist on the device (`exams`, `study` in the store). The Plan week strip uses real dates;
  exam-eve reminders use the real exam dates. The "+" sheet's demo plan now creates a real Physics exam.
- Tests: `npm run test:engine` (plan shape, spacing, ratings, roll-forward, readiness).

## App icon

The mark is the Arabic letter ن (noon), the first letter of نظّم: a white bowl (echoing the focus ring) with a
Blue 300 dot ("now") on midnight `#0F2257`. Sources: `assets/brand/nazzim-icon.svg` (full icon) and
`assets/brand/nazzim-mark.svg` (mark only, used on the splash). The PNGs in `assets/` are rendered from them:
`icon.png` 1024² (iOS), Android adaptive foreground/background/monochrome (mark inside the 66% safe zone),
`splash-icon.png` (brand asset), and `favicon.png`. The native splash is plain midnight (`splash-blank.png`);
the in-app launch screen (`Splash` in `src/components/Overlays.tsx`, mark in `src/components/Logo.tsx`) then draws
the ن: the bowl is traced, the dot drops in, and the name and tagline rise in (about 2.3s, tap to skip, static when
Reduce Motion is on).

## Accounts and sync

Optional by design: the app is fully usable signed out and offline. Signing in adds backup and multi-device sync.

- **Backend:** Supabase project `nazzim` (ref `vntbusmfohmrarvfkttp`, region ap-south-1). Schema in `supabase/migrations/`.
- **Security:** row-level security on every table (verified with a two-user test: no cross-user reads or writes; anon sees
  only `app_config`). Clients cannot change their `tier` (column privilege); only the server (payments webhook) can.
- **Sync:** local-first. Push = diff against the last synced snapshot; pull = rows with `updated_at` (server time) after the
  cursor, with a 10 s overlap. Same id → last write wins; deletes are soft (`deleted = true`). Focus minutes never decrease.
- **Delete account:** Edge Function `delete-account` (JWT-verified) deletes the auth user; rows cascade.
- **Events:** analytics events are batched into `events` (insert-only) with each sync, for the admin dashboard.

**Before launch, in the Supabase dashboard (Authentication):**
1. *URL Configuration → Site URL*: set it to the app's web URL (or deep link). Confirmation emails redirect there.
2. *Sign In / Providers → Email*: keep "Confirm email" on (the app shows "check your inbox"), or turn it off for instant sign-up.
3. *SMTP Settings*: add a custom SMTP sender; the built-in one is rate-limited and meant for testing.
4. Add *Sign in with Apple* (required by App Store 4.8 once any third-party login is added).

## Not yet real

- **Payments.** Choosing a plan only records it locally (the toast says "demo, no charge"). Next: RevenueCat, feature gating by `tier`, prices and limits from remote config so they change without a release.
- **Admin panel** (users, MRR, churn, AI usage, feature flags, pricing) is not built yet; the analytics events it will read are in place.
- **Limits** are enforced in the app (Free: 2 active exams, 1 insight); a server-side check belongs with payments.
- **Password reset** is not in the app yet (needs the Site URL above).
- **Privacy / Terms / Support / Restore** links are UI only.
- **Bundle identifier** is not set. Set `ios.bundleIdentifier` / `android.package` in `app.json` before running `eas build`.
