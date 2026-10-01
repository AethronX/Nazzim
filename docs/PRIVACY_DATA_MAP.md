# NAZZIM — Privacy & Data Map

Written so the Apple Privacy Nutrition Label and the Google Play Data Safety form can be filled **accurately**,
field by field, without guessing. Students' academic data is treated as sensitive.

---

## 1. Principle

Nazzim collects what it needs to plan a semester, and nothing else. The app is **fully usable signed out**: an
account adds sync and backup, not features. No data is collected because it is technically possible.

## 2. What is collected

| Data | Why | Where stored | Retention | Optional? |
|---|---|---|---|---|
| Email address | Account identity, sign-in, password reset | Supabase `auth.users` (ap-south-1, India) | Until account deletion | **Yes** — the app works signed out |
| Password | Authentication | Supabase GoTrue, hashed (bcrypt). **Never seen by Nazzim's code** | Until deletion | Yes |
| Name, university, major, year | Greeting, and context for planning | `public.profiles`; device | Until deletion | **Yes** — every field is skippable at onboarding |
| Subjects, exams, tasks, study sessions | The core product — the plan itself | Device first; `public.subjects/exams/tasks/study_sessions` when signed in | Until deletion | Required for the app to do anything |
| Self-test cards (question + answer, written by the student) | Retrieval practice, and the evidence behind exam readiness | Device first; `public.cards` when signed in | Until deletion | Optional — readiness is capped without them, nothing is blocked |
| Focused minutes per day | Progress, consistency, streak | Device; `public.focus_days` | Until deletion | Required for Progress |
| Chosen study time, daily capacity, language, theme, accent | Personalisation of plan and reminders | Device; `profiles` | Until deletion | Yes |
| Product events (names + counts) | Which features help students; see §4 | `public.events` | Until deletion | Signed-out users send none |
| Subscription tier | Entitlement | `profiles.tier` (server-controlled) | Until deletion | N/A while nothing is sold |

## 3. What is **not** collected

Stated explicitly because the absence is the design:

- ❌ Contacts, calendar, photos, camera, microphone, location
- ❌ Advertising identifier (IDFA/AAID) — **no ATT prompt needed**
- ❌ Device fingerprint, IP-based profiling
- ❌ Any third-party advertising or analytics SDK (no Firebase, no Facebook SDK, no AppsFlyer)
- ❌ Free text the student wrote. **Task titles, subject names and notes never enter an analytics event** —
  enforced structurally by the typed event union in `src/services/analytics.ts`, which has no string field
- ❌ Cross-app or cross-site tracking → **"Tracking: No"** on Apple's form

## 4. Analytics events — the full list

Every event in the catalogue, with every property. There are no others; the TypeScript union makes adding an
unlisted one a compile error.

| Event | Properties |
|---|---|
| `app_opened` | — |
| `onboarding_completed` | — |
| `subject_created` | — |
| `task_created` | `hasSubject: boolean` |
| `task_completed` | — |
| `exam_created` | `chapters: number`, `daysAhead: number`, `source: 'manual' \| 'planner'` |
| `plan_generated` | `sessions: number`, `source: 'local' \| 'remote'` |
| `study_session_started` | `kind: string` |
| `study_session_completed` | `confidence: number` |
| `focus_completed` | `minutes: number` |
| `rescue_plan_created` | `moves`, `dropped`, `tight` (all numbers) |
| `reminders_enabled` | — |
| `study_time_set` | `time: 'morning' \| 'afternoon' \| 'evening' \| 'night'` |
| `weekly_recap_opened` | — |
| `subscription_started` | `tier: string`, `period: string` |
| `subscription_cancelled` | — |

Counts and enums only. Nothing here identifies a person or reveals what they study.

## 5. Third parties

| Service | Receives | Purpose | Region |
|---|---|---|---|
| **Supabase** | Everything in §2, when signed in | Database, auth, account deletion | ap-south-1 (Mumbai, India) |
| **Expo / EAS** | Build and OTA update delivery; no user data | App delivery | Global CDN |
| **Apple / Google** | Purchase records **(once IAP ships)** | Payment | Per store |

No data broker, no advertising network, no AI provider (the planner runs **on-device**).

## 6. AI and data use

The Smart Planner, Rescue Mode, readiness and insights are **deterministic functions running on the phone**
(`src/engine/`, `src/ai/`). Nothing is sent to a model provider, and the features work in airplane mode.

**If a remote model is added later**, this section must be updated *before* release, and the student must be
told plainly: what text leaves the device, to which provider, and whether it trains a model. The architecture
already isolates this: `src/ai/index.ts` is the single switch point, so one file changes, and the privacy
statement changes with it.

## 7. User controls (the Privacy Center)

| Control | Where | Works today |
|---|---|---|
| Work without an account | Welcome → "Explore with a sample semester" | ✅ |
| See the account's email | More → Account | ✅ |
| Sign out | More → Account | ✅ |
| **Delete account + all server data** | More → Account → Delete account | ✅ Edge Function, cascades every table |
| **Erase this device's data** (signed out) | Settings → Delete account | ✅ Resets local state |
| Notification controls (per type) | Settings → Reminders | ✅ Daily / exam / focus, each independently |
| Language | Settings, and Welcome | ✅ |
| Privacy Policy / Terms / Support | Settings | ✅ Opens published URL |
| Export my data | — | ⚠️ **Not built.** See §9 |
| Analytics opt-out | — | ⚠️ **Not built.** See §9 |

## 8. Form answers (fill these in verbatim)

**Apple Privacy Nutrition Label**

- *Data Used to Track You:* **None**
- *Data Linked to You:* Contact Info (email); User Content (study plans, subjects, exams, tasks); Identifiers
  (user ID); Usage Data (product events) — all for **App Functionality** and **Analytics**, never Advertising
- *Data Not Linked to You:* none
- *Tracking:* **No** → no `NSUserTrackingUsageDescription`, no ATT prompt

**Google Play Data Safety**

- Collected: Personal info (email, name), App activity (product events), App info & performance (none yet —
  revisit after crash reporting lands), User content (academic data)
- **Encrypted in transit:** Yes (TLS to Supabase)
- **Users can request deletion:** Yes, in-app **and** via a web page **[M2 — must be published]**
- Shared with third parties: **No**
- Data collection is **optional** (the app runs signed out)

## 9. Known gaps

| Gap | Impact | Plan |
|---|---|---|
| No "Export my data" | GDPR portability is best-practice; not a store blocker for this data class | Add a JSON export from the Account screen — the sync layer already serialises everything |
| No analytics opt-out toggle | Events are minimal and non-identifying, but a toggle is the respectful default | Add to Settings → Privacy before a wide EU launch |
| Privacy pages unpublished | **Store blocker** | M2 in `PRODUCTION_AUDIT.md` |
| Play's web-based deletion request page | **Play requirement** | M2 |

## 10. Data flow in one line

```
Student types → device (AsyncStorage, source of truth)
             → [only if signed in] Supabase over TLS, row-level-security isolated
             → [analytics] event name + counts only
             → [AI] never leaves the device
```
