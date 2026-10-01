# NAZZIM — Deployment

Every command needed to run, build, ship, update and roll back. Run them from the app directory.

```bash
cd nazzim-app      # the clone of github.com/AethronX/nazzim, branch expo-app
```

---

## 0. One-time setup

```bash
npm install
npm install -g eas-cli
eas login                       # account: zoro0077
```

Project is already linked (`extra.eas.projectId` in `app.json`). `eas init` is **not** needed again.

## 1. Environments

| Profile | Channel | Backend | Use |
|---|---|---|---|
| `development` | `development` | Supabase prod | Dev client, debugging |
| `preview` | `preview` | Supabase prod | Internal testing, TestFlight-style |
| `production` | `production` | Supabase prod | Store releases |

> Each profile sets `APP_ENV`, read by `src/config/env.ts`. `scripts/test-release.js` fails the build if a
> production config points at localhost or carries a non-public key. **A separate staging Supabase project is
> recommended before launch** — today all three profiles share one database.

## 2. Run development

```bash
npx expo start                  # Expo Go; press i / a / w
npx expo start --clear          # after changing fonts, config or native deps
npx expo start --tunnel         # phone and computer on different networks
```

## 3. Checks (run before every build)

```bash
npm test                        # 10 suites: engines, sync, contrast, release guards
npx tsc --noEmit                # types
npx expo lint                   # lint
npx expo-doctor                 # dependency/config health
```

## 4. Preview build (internal testers)

```bash
eas build --platform ios --profile preview
eas build --platform android --profile preview
```

Installs via the EAS link. iOS requires the tester's device UDID to be registered (`eas device:create`).

## 5. Production builds

```bash
eas build --platform ios --profile production          # .ipa for App Store Connect
eas build --platform android --profile production      # .aab for Play Console
eas build --platform all --profile production          # both
```

`autoIncrement` raises the iOS build number and Android versionCode automatically. Raise the user-facing
`version` in `app.json` by hand for each release (semver).

## 6. Submit to the stores

Fill `eas.json` → `submit.production` first: `ascAppId`, `appleTeamId`, and the Play service-account JSON.

```bash
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

Then, in each console: attach screenshots, the description, the privacy policy URL, the Data Safety / Nutrition
Label answers, and the App Review notes (`STORE_RELEASE_CHECKLIST.md`).

## 7. Update a shipped app (OTA)

JavaScript, styles and assets ship without a store review. **Native changes (new native module, permissions,
app icon, splash, SDK upgrade) require a new build and a new submission.**

```bash
eas update --branch production --message "Fix exam readiness rounding"
eas update --branch preview    --message "Try the new planner copy"
npm run publish                                        # shorthand: --branch main --auto
```

Automatic publishing is wired: pushing to `expo-app` runs `.github/workflows/eas-update.yml`, which publishes
once the repository secret `EXPO_TOKEN` exists. Without the secret the workflow skips quietly.

## 8. Roll back a bad release

**OTA update (fast, minutes):**

```bash
eas update:list --branch production              # find the last good update's ID
eas update:republish --group <GROUP_ID>          # re-publish it as the newest
```

Rolling back an OTA is "publish the old bundle again" — the newest update always wins.

```bash
eas channel:edit production --branch <other-branch>   # or point the channel elsewhere entirely
```

**Native build (slow, store-dependent):**
- **iOS:** App Store Connect → Phased Release → *Pause*. To go further back, submit the previous build again
  (binaries cannot be "un-released"; the fix is a new submission).
- **Android:** Play Console → Release → *Halt rollout*, then promote the previous release. Staged rollout
  (e.g. 10%) is strongly recommended so a bad build reaches few users.

**Rule:** if the problem is JavaScript, OTA-fix it in minutes. If it is native, halt the rollout first, then
build a fix. Never leave a crashing build at 100% rollout while you work on it.

## 9. Backend

```bash
# Migrations live in supabase/migrations/ and are applied in order.
supabase link --project-ref vntbusmfohmrarvfkttp
supabase db push

# Edge Functions
supabase functions deploy delete-account
supabase secrets set --env-file ./supabase/.env     # service-role key etc. — never in the app
```

After any schema change, re-run the advisors:

```bash
supabase inspect db                                  # or the dashboard: Advisors → Security / Performance
```

## 10. Release sequence

1. `npm test && npx tsc --noEmit && npx expo lint` — all green
2. Bump `version` in `app.json`
3. `eas build --platform all --profile production`
4. Install the artefacts and test **on real devices**, both languages, both themes
5. `eas submit` both platforms
6. Fill the store listings; answer privacy forms from `PRIVACY_DATA_MAP.md`
7. Submit for review
8. After approval, release with a **staged rollout** on Android, **phased release** on iOS
9. Watch crash reports for 48 h before going to 100%
