# The colour system

Every colour in Nazzim is generated in OKLCH at a fixed set of perceptual tiers. Two colours are pinned and
never generated: **#285CE7** (actions) and **#112357** (hero), because those are the brand.

## What the measurements found

The previous palette passed every contrast check and still looked incoherent. Contrast is a floor, not
consistency. Measuring it in OKLCH showed why:

| Problem | Measured |
| --- | --- |
| Status fills had nothing in common | lightness **0.53 / 0.63 / 0.77** for brand / success / warning. Amber sat 0.24 lighter than the rest — which is *why* it alone could not take white text and needed an `onWarning: '#111827'` exception |
| Subject colours were unequal | chroma **0.086** (teal, almost grey) to **0.247** (violet, shouting); lightness 0.46–0.56. Some subject cards popped, others looked switched off |
| The brand ramp had duplicates and a cliff | ΔL of **0.067, 0.061** through 500→600→700 (three near-identical steps), then a **0.125** jump to 800 |
| Neutrals did not belong to the blue | greys drifted across hues **248–265** |
| Tints were uneven | chroma 0.017 (brand) to 0.058 (amber) — the brand's own chip was the palest thing on screen |

The diagnosis in one line: a custom brand blue with **stock Tailwind colours arranged around it**
(`#16A34A`, `#F59E0B`, `#EF4444`, slate) — which is what makes an interface read as generic even when every
individual colour is fine.

## What successful systems actually do

- **Radix Colors** — 12 steps where each step is a *role* (1–2 backgrounds, 3–5 component fills, 6–8 borders,
  9–10 solid, 11–12 text), tuned so step *n* has the same apparent weight in every hue. You can swap a hue and
  the design holds.
- **Material 3 (HCT)** — tonal palettes at fixed tone values, so contrast is guaranteed by construction
  rather than audited afterwards.
- **Tailwind v4** — moved its default palette to OKLCH precisely so ramps are perceptually even.
- **Linear, Stripe, Vercel** — a very tight neutral ramp carrying a trace of the brand hue, one accent, and
  semantic colours harmonised into the same lightness band rather than borrowed from a stock set.

The transferable principle is the same in all of them: **fixed lightness tiers shared across every hue.**
That is what this palette now does.

## The tiers

| Step | Lightness | Role |
| --- | --- | --- |
| 50 | 0.970 | wash, chip background |
| 100 | 0.930 | track, selected chip |
| 200 | 0.870 | border on a chip, chart bar |
| 300 | 0.760 | accent text in dark mode |
| 400 | 0.650 | decorative |
| **500** | **0.530** | solid fill — **#285CE7** |
| 600 | 0.455 | pressed, strong text |
| 700 | 0.375 | text on a chip |
| **800** | **0.277** | hero surface — **#112357** |
| 900 | 0.215 | deepest |

The light end is deliberately compressed and the mid-range deliberately wide: that is where tints live and
where fills must separate. Hue is held constant down each ramp; chroma peaks at 500.

## What changed, measured

| | before | after |
| --- | --- | --- |
| Status fill lightness spread | 0.239 | **0.001** |
| Amber needs a dark-text exception | yes | **no** — white reads at 5.41 on it |
| Brand ramp step range | 0.039 – 0.125 | **0.040 – 0.120**, monotonic, no duplicates |
| Subject icon lightness spread | 0.092 | **≤ 0.09**, hues ≥25° apart |
| Neutral hue drift | 248–265 | **all within 20° of 264** |
| Dark surfaces | bg/card/card2 at 0.14/0.19/0.24 | 0.175/0.228/0.285 — each lifts at least 0.03 |

Every contrast target still passes, most with more headroom than before (tertiary ink went from 4.55 to 4.97
on the background).

## The guards

`npm test` runs two colour checks, and they do different jobs:

- **`test-contrast.js`** — every rendered pair, in both themes, across all four accents. The legal floor.
- **`test-palette.js`** — the system properties: the ramp is monotonic with no step under 0.035 or over
  0.135, hue holds within 8° down the ramp, chroma peaks at 500, status colours share a tier in both themes,
  subject hues sit ≥25° apart at one lightness, every accent matches the brand's lightness within 0.07, and
  the neutrals stay within 20° of the brand hue. It also asserts #285CE7 and #112357 are untouched.

The second guard is the one that matters for keeping this coherent. Pasting a stock Tailwind amber back in
fails it immediately with `status fills spread 0.239 in lightness`.

## Adding a colour

Generate it; do not pick it. `scripts/oklch.js` has the conversion. Choose the hue, take the lightness and
chroma from the tier table, and let the gamut clipping handle the rest — some hues (teal, sky) cannot reach
the chroma target in sRGB, and clipping while holding lightness and hue exactly is the right answer.
