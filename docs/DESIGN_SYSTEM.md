# The design system

Three scales, enforced by `scripts/test-design.js`. Everything visual draws from them and nothing else.

## Why they exist

A screen-by-screen pass over the running app found the interface was using:

- **15 distinct font sizes** — 9.5, 10, 10.5, 11, 11.5, 12, 12.5, 13, 13.5, 14, 14.5, 15, 16, 17, 20, 23, 26
- **14 corner radii**, with 11, 12, 13 and 14 all in play on container surfaces
- **padding on no grid at all** — 3, 4, 6, 10, 12, 13, 14, 16, 18, 28

Nobody can see 12.5pt against 13pt. What everybody can see is that nothing quite lines up, on every screen,
which is the whole difference between an app that is carefully built and one that looks it.

## The scales

```ts
TEXT   = { mega: 40, hero: 32, display: 28, title: 22, heading: 18, body: 15.5, label: 13.5, caption: 12, micro: 10.5 }
RADIUS = { xs: 6, sm: 12, md: 16, lg: 20, xl: 24, full: 99 }
SPACE  = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32 }   // 4pt grid
```

`<T>` takes a role, not a number:

```tsx
<T s="heading" w={700}>Statistics</T>      // ✓
<T s={17}>Statistics</T>                   // ✗ — the design guard fails the build
```

281 text sizes and 36 container radii were migrated onto these. Every move was ≤1pt for type and ≤2pt for
radius, so the migration changed no layout while removing the drift.

## What the guard enforces

`npm test` runs `scripts/test-design.js`, which fails on:

1. **A numeric font size on `<T>`** — or a role that is not in the scale.
2. **A container radius off the scale.** Circles are exempt (radius = half the width or height, which the
   check detects), as are the 2–5pt radii on hairline bars.
3. **The clock losing `direction: 'ltr'`.** Its minutes, colon and seconds are separate children, so on an
   Arabic screen an inherited RTL row renders them seconds-first and a 25-minute timer reads **00:25**. That
   was a real bug, found by reading the Arabic focus screen rather than the code.

## Numerals have roles

The face a figure is set in follows what the figure is *for*, not which component happens to render it.

| Role | Prop | Face | Widths | Where |
| --- | --- | --- | --- | --- |
| **Data** | `num="data"` | Inter, LTR | **tabular** | a percentage in a list, a clock, a chart tick, `4/11` |
| **Prose** | *(none)* | the surrounding face | proportional | a figure inside a sentence: "متبقٍ 11 جلسة" |
| **Latin token** | `ltr` | Inter, LTR | proportional | a target grade (A−), a ± stepper — not a figure |

Why it matters, measured: Inter's `1` is 44 units wide against `0` at 69, so a running timer without `tnum`
shifts visibly every second. In the other direction, tabular widths leave a gap around the 1 in running text.
The same font has to do both, and only the role knows which.

The third rule exists because React Native has no font fallback chains. The app previously carried one
`f="grotesk"` face that forced Inter onto everything "numeric", including strings that mix digits with Arabic
words — `7 س 55 د`, `25 د`, `40 دقيقة`. Inter has no Arabic, so those words were rendered by whatever font
the system picked. They are prose now and stay in IBM Plex Sans Arabic.

The design guard fails the build on `f="grotesk"` (retired), and on any element that carries `num`/`ltr`
while its line contains Arabic.

## Arabic is not a translation

`counted()` and `unitOf()` in `src/lib/copy.ts` give counted nouns their proper agreement. English needs two
forms; Arabic needs four, and the app previously used one:

| n | before | after |
| --- | --- | --- |
| 1 | 1 أيام | يوم |
| 2 | 2 أيام | يومين |
| 6 | 6 أيام | 6 أيام |
| 11 | 11 أيام | 11 يوماً |

The dual is stored in the oblique case (`يومين`, not `يومان`) because in this interface it almost always
follows a preposition — "بعد يومين", "خلال جلستين" — where the nominative would be wrong.

`scripts/test-copy.js` asserts the agreement rules, that every unit has 2 English and 4 Arabic forms, and
that the two copy tables have not drifted apart. That last check caught a missing key the moment it appeared.

## Adding something new

- Reach for a role (`s="body"`), a radius token and a 4pt space step before inventing a value.
- If a new value is genuinely needed, add it to the scale with a reason — do not special-case the component.
- Any count shown to a student goes through `counted()` or `unitOf()`.
- Run `npm test` — the design, copy and contrast guards all run there.
