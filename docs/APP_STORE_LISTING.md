# Nazzim — App Store Connect listing & privacy answers

Ready-to-paste metadata for the first submission (MVP). Written from the app's actual behaviour.
Review the legal/privacy wording with a professional before you publish; store rules change, so
re-check the current App Store Review Guidelines at submission time.

---

## 1. App information

| Field | Value |
|---|---|
| App name | Nazzim |
| Bundle ID | com.nazzim.app |
| Primary category | Education |
| Secondary category | Productivity |
| Primary language | Arabic |
| Also localized | English |
| Age rating | 4+ (no objectionable content — confirm via the questionnaire) |
| Copyright | © 2026 Nazzim |
| Price | Free |

Do **not** mark any Kids-category options: the app targets university/older students.

---

## 2. URLs (must resolve before review)

| Field | Value |
|---|---|
| Support URL | https://nazzim.app/support |
| Privacy Policy URL | https://nazzim.app/privacy |
| Marketing URL (optional) | https://nazzim.app |

> BLOCKED until the domain is live. These three links already ship in the app (app.json → ios.privacyPolicyUrl, extra.*). A link that does not open during review is a common rejection. Either publish the site on `nazzim.app`, or change the URLs in `app.json` and `src/app/settings.tsx` to a domain you own.

---

## 3. Listing copy

### English

- **Subtitle (30 chars max):** Are you ready for the exam?
- **Promotional text (170):** Nazzim measures whether you're truly ready for each exam and tells you the single next step — not just another to-do list.
- **Keywords (100 chars, comma, no spaces):**
  `study,exam,planner,student,revision,flashcards,focus,university,recall,schedule,GPA,semester`
- **Description:**

```
Most study apps organize your schedule. Nazzim answers the one question that matters: am I actually ready for this exam?

Add your exam and its chapters, and Nazzim builds the plan. It measures your "evidence completeness" — an honest readiness number built on real studying and self-testing, not on ticked boxes. Then it shows you the single next step, so you never stare at a blank to-do list wondering where to start.

• Evidence completeness — one honest readiness number per exam
• The next step — the one thing to do now, chosen for you
• Self-testing — flashcards that make you recall before you reveal
• Focus sessions — timed study tied to each task
• Triage your day — when everything piles up, just three things worth your time
• Arabic-first, with full right-to-left support

Nazzim works entirely on your device. An account is optional and only syncs your own data across your devices. No ads. Your data is yours.
```

### Arabic (العربية)

- **العنوان الفرعي (30):** هل أنت جاهز للامتحان؟
- **النص الترويجي (170):** نظِّم يقيس استعدادك الحقيقي لكل امتحان ويقول لك الخطوة التالية — لا مجرد قائمة مهام أخرى.
- **الكلمات المفتاحية (100، بفواصل بلا مسافات):**
  `مذاكرة,امتحان,منظم,طالب,مراجعة,بطاقات,تركيز,جامعة,استرجاع,جدول,اختبار,فصل`
- **الوصف:**

```
معظم تطبيقات المذاكرة ترتّب مواعيدك. نظِّم يجيب عن السؤال الوحيد المهم: هل أنا جاهز فعلاً لهذا الامتحان؟

أضف امتحانك وفصوله، ويبني نظِّم الخطة. يقيس «اكتمال الدليل» — رقم استعداد صادق مبني على مذاكرة واختبار ذاتي حقيقيين، لا على علامات صح. ثم يعرض لك الخطوة التالية الواحدة، فلا تقف أمام قائمة فارغة تتساءل من أين تبدأ.

• اكتمال الدليل — رقم استعداد صادق لكل امتحان
• الخطوة التالية — الشيء الواحد الذي تفعله الآن، مختاراً لك
• الاختبار الذاتي — بطاقات تجعلك تسترجع قبل أن تكشف الإجابة
• جلسات التركيز — مذاكرة مؤقّتة مرتبطة بكل مهمة
• ترتيب اليوم — حين يتراكم كل شيء، ثلاثة أشياء فقط تستحق وقتك
• عربي أولاً، بدعم كامل لليمين إلى اليسار

يعمل نظِّم بالكامل على جهازك. الحساب اختياري ويزامن بياناتك أنت فقط بين أجهزتك. بلا إعلانات. بياناتك لك.
```

---

## 4. App Privacy ("nutrition label") — answers

Match these to the app exactly. The app's analytics catalogue carries ids and counts only
(`src/services/analytics.ts`); it never sends titles, notes, card text, grades, or university name.

**Does this app collect data?** Yes.

| Data type | Collected? | Linked to the user? | Used for tracking? | Purpose |
|---|---|---|---|---|
| Contact Info → **Email address** | Yes (only if the user creates an account) | Linked | No | App Functionality (sign-in) |
| User Content → **Other user content** (subjects, exams, tasks, flashcards, notes) | Yes (only with an account, for sync) | Linked | No | App Functionality |
| Usage Data → **Product Interaction** (anonymous events) | Yes | **Not** linked | No | Analytics, App Functionality |
| Diagnostics → **Crash Data** (`app_error`: screen name + error class) | Yes | **Not** linked | No | App Functionality, Analytics |

- **Tracking:** NO. The app shows no ATT prompt and no tracking domains (declared in `app.json` → ios.privacyManifests → NSPrivacyTracking=false).
- Without an account, nothing leaves the device — reflect this in the privacy policy text.
- If you later add a Meta/ads SDK, you must add App Tracking Transparency and update this label.

---

## 5. Export compliance

- `ITSAppUsesNonExemptEncryption` = **false** (already set in app.json). The app uses only standard
  HTTPS, which is exempt. Confirm the answer on the first submission.

---

## 6. Review notes (paste into "Notes for the reviewer")

```
An account is optional — the reviewer can use the entire app without signing in; tap "Explore with a sample semester" on the welcome screen to load sample data. Sign-in (email + password, via Supabase) only syncs the user's own data across devices. There are no in-app purchases in this version; "Pro" is shown as "coming soon" with no purchase flow.
```

If you want synced features reviewed, create one demo account and add its email/password here.

---

## 7. Still blocking the submission (outside this file)

1. Publish the site so the three URLs resolve (or repoint them to a domain you own).
2. Verify Supabase Row Level Security so no user can read another user's rows. (Critical, server-side — verify manually.)
3. Apple Developer Program membership active.
4. Screenshots for the required device sizes + 1024×1024 icon.
5. EAS build tested on a real device.
