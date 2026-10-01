# NAZZIM — Store Release Checklist

Tick each line before submitting. `✅` = done in the repo. `⬜` = needs a human, an account, or a device.
Items marked **[VERIFY]** must be re-checked against the stores' current policies at submission time.

---

## iOS — App Store

### Build and identity
- ✅ Production environment (`APP_ENV=production` via the EAS `production` profile)
- ✅ Bundle identifier `com.nazzim.app` — ⬜ **confirm you own the domain, or change before first upload (permanent)**
- ✅ App icon (`assets/icon.png`, brand navy ن mark)
- ✅ Splash screen, light and dark, brand navy
- ✅ Version `1.0.0` + build number auto-incremented
- ⬜ Production signing (EAS manages certificates; needs the Apple Developer account)
- ⬜ `eas.json` → `submit.production.ios`: real `ascAppId` and `appleTeamId`

### Permissions and privacy
- ✅ Notifications are the only permission requested
- ✅ `NSUserNotificationsUsageDescription` explains *why*, in plain language
- ✅ Permission asked **after** the first finished session, never at launch
- ✅ No tracking, no IDFA → **no ATT prompt required**
- ✅ `ITSAppUsesNonExemptEncryption: false` (standard HTTPS only)
- ⬜ Privacy Nutrition Label filled from `PRIVACY_DATA_MAP.md` §8
- ⬜ Privacy Policy URL live at `nazzim.app/privacy`
- ⬜ Terms URL live at `nazzim.app/terms`

### Accounts
- ✅ Create account, sign in, sign out
- ✅ **Delete account** in-app, erases server data (Guideline 5.1.1(v))
- ⬜ Password reset (needs the Site URL — M3/M5)
- N/A Sign in with Apple — **required only if a third-party login is added**

### Payments
- ⬜ **StoreKit / IAP not implemented.** Either complete `SUBSCRIPTION_ARCHITECTURE.md` §4, **or** remove the
  purchase buttons from the first submission and ship Nazzim free
- ⬜ Restore Purchases wired to a real receipt check
- ⬜ Subscription states handled (cancelled, expired, grace, refunded, restored)

### Review
- ✅ **No demo account needed** — the Welcome screen's *"Explore with a sample semester"* gives a reviewer the
  full product in one tap, with no sign-up. State this in the review notes
- ⬜ App Review Notes (draft below)
- ✅ Main functionality reachable without obstacles
- ✅ No placeholder screens, no dead buttons, no lorem ipsum

### Quality
- ✅ 10 automated suites pass
- ✅ WCAG contrast verified for every rendered pair, both themes, all accents
- ✅ Real RTL (not mirrored English): layout direction, writing direction, per-script fonts and line heights
- ⬜ Crash reporting (M4)
- ⬜ Release build tested on a physical iPhone

---

## Android — Google Play

### Build and identity
- ✅ Production environment
- ✅ Application ID `com.nazzim.app`
- ✅ Adaptive icon (foreground, background, monochrome) + splash
- ✅ `versionCode` auto-incremented
- ⬜ Production signing (Play App Signing; EAS can generate the upload key)
- ⬜ AAB built and installed on a physical device

### Policy
- ✅ Permissions: `VIBRATE` only; camera/mic/contacts/location/calendar explicitly blocked
- ⬜ **[VERIFY]** target SDK meets Play's current requirement (managed by Expo SDK 57)
- ⬜ Data Safety form from `PRIVACY_DATA_MAP.md` §8
- ⬜ Content rating questionnaire (expected *Everyone*)
- ⬜ Privacy Policy URL in the listing
- ✅ Account deletion in-app — ⬜ **plus the web-accessible deletion page Play requires**
- ⬜ Play Billing if subscriptions ship (same decision as iOS)
- ✅ No deceptive UI, no fake system dialogs, no hidden functionality

### Listing
- ⬜ Title, short and full description (English + Arabic)
- ⬜ Screenshots (phone, both languages; 7-inch and 10-inch tablet if declared)
- ⬜ Feature graphic
- ⬜ App access instructions: *"No login required — tap 'Explore with a sample semester' on the first screen."*

---

## App Review Notes (draft — paste into both consoles)

> **Nazzim — an academic planner for university students (English and Arabic).**
>
> **No account is required to review the app.** On the first screen, tap **"Explore with a sample semester"**.
> This loads a realistic semester (3 subjects, 1 exam with a full study plan, 3 tasks) and every feature becomes
> reachable immediately.
>
> **What to try**
> 1. **Today** — "Your next move" shows the single most important task, with the reason. Tap *Start session*.
> 2. **Focus** — the timer counts the session; *Finish session* asks how it went, which updates exam readiness.
> 3. **Plan** — the week, with the day's schedule as a timeline.
> 4. **Smart Planner** (Plan → *Smart plan*) — type *"Chemistry midterm in 5 days, 3 chapters"* and it produces
>    a day-by-day study plan with its reasoning. **This runs entirely on the device; no AI service is called.**
> 5. **Rescue Plan** (More → Rescue plan) — rebuilds the week when work piles up.
> 6. **Language** — Settings → Language switches the whole app to Arabic with full right-to-left layout.
>
> **Accounts.** Optional, and used only for backup and multi-device sync (Supabase). Create one with any email,
> or skip entirely. Account deletion is at More → Account → Delete account and erases all server data.
>
> **Notifications.** Requested only after the first completed focus session, used for the daily study reminder.
>
> **Privacy.** No tracking, no advertising identifier, no third-party analytics. Academic content never leaves
> the device except to the user's own synced account.
>
> *(If submitting without IAP: "Subscription tiers are shown for information only and are not purchasable in
> this version.")*

---

## Final gate

Do not submit until:
- [ ] `npm test` passes (includes the release guards)
- [ ] A production build has been installed and used on a **real device**, in **both languages**
- [ ] Privacy Policy and Terms are **live URLs**, opening correctly from Settings
- [ ] Either IAP is complete **or** the purchase buttons are removed
- [ ] Crash reporting is receiving events
- [ ] The Remaining Manual Steps in `PRODUCTION_AUDIT.md` §10 are each resolved or consciously deferred
