# `legal/` — the pages Apple and Google require

Seven static files. No JavaScript, no fonts, no images, no third-party requests — which is what lets the
Privacy Policy honestly say the site does not track anyone.

| File | Published as | Required by |
| --- | --- | --- |
| `index.html` | `/` | — (landing/hub) |
| `privacy.html` · `privacy-ar.html` | `/privacy` · `/privacy-ar` | App Store Connect, Play Console, `expo.extra.privacyPolicyUrl` |
| `terms.html` · `terms-ar.html` | `/terms` · `/terms-ar` | `expo.extra.termsUrl`; EULA field in App Store Connect |
| `delete-account.html` | `/delete-account` | **Google Play** — a deletion path reachable without installing the app |
| `support.html` | `/support` | App Store Connect "Support URL" (mandatory), `expo.extra.supportUrl` |
| `_shared.css` | `/_shared.css` | — |
| `vercel.json` | — | clean URLs, redirects, security headers |

## Deploying

The pages are plain HTML, so any static host works. With Vercel:

```bash
cd app/legal
npx vercel            # preview deployment
npx vercel --prod     # production
```

Or in the Vercel dashboard: import the repo, set **Root Directory** to `app/legal`, framework **Other**, no
build command. Then add the domain `nazzim.app` under Settings → Domains.

`vercel.json` turns on `cleanUrls`, so `privacy.html` is served at `/privacy` — which is exactly what
`app.json` already points at:

```json
"extra": {
  "privacyPolicyUrl": "https://nazzim.app/privacy",
  "termsUrl": "https://nazzim.app/terms",
  "supportUrl": "https://nazzim.app/support"
}
```

If you host somewhere without clean URLs, change those three values to the `.html` paths instead — they are
read at runtime from `expo.extra`, so no rebuild is needed, only `eas update`.

## Before you submit

- [ ] The three URLs open on a phone, in both light and dark mode
- [ ] `privacy@nazzim.app`, `support@nazzim.app` and `legal@nazzim.app` actually receive mail
- [ ] A lawyer has read the Terms and the Privacy Policy. **These are accurate technical drafts written from
      `docs/PRIVACY_DATA_MAP.md`, not legal advice.** Oman's Personal Data Protection Law and, if you take
      EU/UK users, the GDPR, both deserve a professional read before you charge anyone money.
- [ ] The dates at the top of each page are updated if anything changed

## Keeping them true

These pages make specific factual claims about the app. If any of the following changes, the pages are wrong
and must be updated in the same release:

- Planning runs on-device → if an AI call ever leaves the phone, §6 of the Privacy Policy is false
- No advertising identifier, no third-party analytics SDK → §3
- Data stored with Supabase in Mumbai, India → §4
- In-app deletion at More → Account → Delete account → §7 and `delete-account.html`
- Nothing is sold today → §7 of the Terms, which must be rewritten before the first paid plan ships
