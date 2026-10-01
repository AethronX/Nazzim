// NAZZIM design tokens — "Calm Intelligence" in the brand blue.
//
// ── How this palette is built ───────────────────────────────────────────────────────────────
// Every colour here was generated in OKLCH at a fixed set of perceptual tiers, not picked by eye. The
// measurements that forced the rebuild (see docs/COLOR_SYSTEM.md) found the old palette was a custom blue
// with stock Tailwind colours around it:
//
//   · semantic fills sat at lightness 0.53 / 0.63 / 0.77 — amber was so much lighter than the rest that it
//     could not take white text, and a row of status icons looked like one of them was glowing;
//   · subject colours ranged from chroma 0.086 (teal, nearly grey) to 0.247 (violet, shouting);
//   · the brand ramp stepped 0.067 and 0.061 through 500→600→700, making those three near-duplicates, then
//     jumped 0.125 to 800 — a cliff;
//   · neutrals drifted across hues 248–265, so the greys did not belong to the blue.
//
// Now each step is a ROLE at a fixed lightness, the way Radix and Material tonal palettes work: 50 wash,
// 100 chip, 200 border-on-chip, 300 dark-mode text, 400 decorative, 500 solid fill, 600 pressed/strong text,
// 700 text-on-chip, 800 hero surface, 900 deepest. Hue is held constant down each ramp and chroma peaks at
// 500. Because the tiers are shared, a green fill and a blue fill now carry the same visual weight, and
// contrast is met by construction rather than checked afterwards.
//
// #285CE7 (actions) and #112357 (hero) are the brand's own colours and are pinned — never generated.
//
// scripts/test-contrast.js (npm test) still measures every rendered pair in both themes and all four accents.

export type Scheme = 'light' | 'dark';

export const BRAND = {
  50: '#F0F5FF', 100: '#DDE8FE', 200: '#C0D5FE', 300: '#8AAFFF', 400: '#5688FC',
  500: '#285CE7', 600: '#1A47C3', 700: '#103399', 800: '#112357', 900: '#051540', ai: '#3F6FF0',
} as const;

const LIGHT = {
  // Surfaces, back to front
  // Neutrals carry the brand hue (264) at a trace of chroma. They used to drift across 248–265, which is
  // the quiet reason the greys never quite looked like they belonged to the blue.
  bg: '#F8FAFD',
  card: '#FFFFFF',
  card2: '#F3F5F9',
  header: 'rgba(248,250,253,.92)',
  chrome: 'rgba(255,255,255,.94)',
  // Hairlines and inactive fills
  line: '#E2E5EC',
  line2: '#F0F2F7',
  track: '#E2E5EC',
  bar: '#E2E5EC',
  control: '#7B828F', // state borders (off toggle, empty radio/checkbox): 3.70 on bg, was 3.19
  // Text
  ink: '#121927',
  ink2: '#4D5667',
  ink3: '#656D7E',  // 4.97 / 5.20 / 4.76 on bg / card / card2 — the lightest it can be and still clear 4.5
  strike: 'rgba(101,109,126,.55)',
  // Semantic: fill = step 500, text = step 600, tint = step 50 — the same three tiers as the brand, so a
  // done tick, a caution chip and an overdue badge carry identical weight. Amber used to sit 0.24 lighter
  // than the rest in OKLCH, which is why it alone could not take white text; at the shared tier it can.
  success: '#00823A', successText: '#03692E', successTint: '#EEF8F0',
  warning: '#935F05', warningText: '#774C03', warningTint: '#FCF4EA',
  danger: '#C90F1A', dangerFill: '#C90F1A', dangerTint: '#FFF2F0',
  onSuccess: '#FFFFFF', // 4.94 on the success fill
  onWarning: '#FFFFFF', // 5.41 — the old dark-ink exception is gone with the lightness mismatch
  // Brand surface for the few moments that deserve it (launch screen, Pro)
  hero: BRAND[800] as string,
  onHero: '#FFFFFF',
  onHero2: 'rgba(255,255,255,.76)',
  onHero3: 'rgba(255,255,255,.6)',
  onHeroLine: 'rgba(255,255,255,.16)',
  onHeroTrack: 'rgba(255,255,255,.16)',
  onHeroAccent: BRAND[300] as string,
  // Selected / urgent chips
  inv: '#111827',
  onInv: '#FFFFFF',
  onInv3: 'rgba(255,255,255,.6)',
  onAccent: '#FFFFFF',
  // Overlays and elevation (soft, slate-tinted)
  scrim: 'rgba(15,23,42,.4)',
  scrimDialog: 'rgba(15,23,42,.45)',
  shadowSoft: '0 1px 2px rgba(15,23,42,.04), 0 8px 24px -14px rgba(15,23,42,.18)',
  shadowHero: '0 18px 36px -18px rgba(49,46,129,.45)',
  shadowFloat: '0 12px 28px -12px rgba(15,23,42,.35)',
};

export type Palette = typeof LIGHT;

const DARK: Palette = {
  // Dark surfaces step evenly in lightness (.175 → .228 → .285) so bg, card and card2 read as real
  // elevation rather than three similar greys, and all of them carry the brand hue.
  bg: '#0C101A',
  card: '#171C28',
  card2: '#242A37',
  header: 'rgba(12,16,26,.92)',
  chrome: 'rgba(23,28,40,.94)',
  line: '#2E3544',
  line2: '#1F242F',
  track: '#2E3544',
  bar: '#313949',
  control: '#778093', // 4.29 on the card
  ink: '#EFF2F7',
  ink2: '#C7CCD7',
  ink3: '#959CA9',
  strike: 'rgba(149,156,169,.55)',
  // Step 300 of each family: light enough to read on the card, same tier for all three.
  success: '#6FC884', successText: '#6FC884', successTint: 'rgba(5,172,79,.13)',
  warning: '#E4A249', warningText: '#E4A249', warningTint: 'rgba(194,127,5,.13)',
  danger: '#F98F84', dangerFill: '#F98F84', dangerTint: 'rgba(232,89,79,.13)',
  onSuccess: '#0C101A', // white on a light green would be 1.7:1
  onWarning: '#0C101A',
  hero: '#112357',
  onHero: '#FFFFFF',
  onHero2: 'rgba(255,255,255,.76)',
  onHero3: 'rgba(255,255,255,.6)',
  onHeroLine: 'rgba(255,255,255,.16)',
  onHeroTrack: 'rgba(255,255,255,.16)',
  onHeroAccent: BRAND[300] as string,
  inv: '#F1F5F9',
  onInv: '#0B1220',
  onInv3: 'rgba(11,18,32,.6)',
  onAccent: '#FFFFFF',
  scrim: 'rgba(0,0,0,.58)',
  scrimDialog: 'rgba(0,0,0,.6)',
  shadowSoft: '0 1px 2px rgba(0,0,0,.3)',
  shadowHero: '0 18px 36px -18px rgba(0,0,0,.7)',
  shadowFloat: '0 12px 28px -12px rgba(0,0,0,.7)',
};

export const PALETTES: Record<Scheme, Palette> = { light: LIGHT, dark: DARK };

// Accent families (Settings › App colour). Indigo is the brand default; the others keep the same roles.
export type AccentKey = 'indigo' | 'rose' | 'violet' | 'teal';
type Family = {
  50: string; 100: string; 300: string; 500: string; 600: string; 700: string; 900: string;
  lightFg: string; darkHero: string; darkTint: string; darkTint2: string;
};
// All four families are generated at the same tiers, so switching the app colour changes the hue and nothing
// else: the same weight, the same contrast, the same relationship to the surfaces. Teal in particular used to
// sit at chroma 0.086 — visibly greyer than violet's 0.247 — which made "App colour" feel like a downgrade.
export const ACCENTS: Record<AccentKey, Family> = {
  // Key stays 'indigo' (saved settings and sync use it); the colour is the brand blue, shown as "Blue".
  indigo: {
    50: BRAND[50], 100: BRAND[100], 300: BRAND[300], 500: BRAND[500], 600: BRAND[600], 700: BRAND[700], 900: BRAND[800],
    lightFg: BRAND[500], darkHero: '#112357', darkTint: '#16233F', darkTint2: '#22345C',
  },
  rose: {
    50: '#FEF1F2', 100: '#FFDFE1', 300: '#F78D9B', 500: '#C7054A', 600: '#A2043B', 700: '#7D002B', 900: '#510019',
    lightFg: '#C7054A', darkHero: '#510019', darkTint: '#3A171D', darkTint2: '#55232B',
  },
  violet: {
    50: '#F6F3FF', 100: '#EAE3FF', 300: '#B99FFA', 500: '#7B43D4', 600: '#652DB6', 700: '#4D1E8E', 900: '#2F1657',
    lightFg: '#7B43D4', darkHero: '#2F1657', darkTint: '#271E3B', darkTint2: '#392C57',
  },
  teal: {
    50: '#EAF9F7', 100: '#CBF1ED', 300: '#14CBC0', 500: '#017D76', 600: '#04645F', 700: '#034C47', 900: '#00302C',
    lightFg: '#017D76', darkHero: '#00302C', darkTint: '#002B28', darkTint2: '#013F3B',
  },
};
export const ACCENT_KEYS: AccentKey[] = ['indigo', 'rose', 'violet', 'teal'];
// Saved by earlier builds; map to the current family.
export const normalizeAccent = (k: string | undefined): AccentKey => (k && k in ACCENTS ? (k as AccentKey) : 'indigo');

export type Accent = {
  a1: string; // 500 · fills: buttons, active tab, progress, borders
  fg: string; // accent text and icons on page surfaces (300 in dark)
  strong: string; // pressed buttons, accent text on tint
  tint: string; // 50 · selected backgrounds, badges, tracks
  tint2: string; // 100 · chart bars, timer track, pressed tint
  deep: string; // 700 · text on a white button placed on the hero surface
  wash: string; // 50 · pressed state of that white button
  glow: string;
  rgb: (alpha: number) => string;
};

const rgbOf = (hex: string) => [1, 3, 5].map(i => parseInt(hex.slice(i, i + 2), 16)).join(',');

export function makeAccent(scheme: Scheme, key: AccentKey = 'indigo'): Accent {
  const f = ACCENTS[key];
  const rgb = (alpha: number) => `rgba(${rgbOf(f[500])},${alpha})`;
  return scheme === 'dark'
    ? { a1: f[500], fg: f[300], strong: f[300], tint: f.darkTint, tint2: f.darkTint2, deep: f[700], wash: f[50], glow: `0 6px 16px -8px ${rgb(0.4)}`, rgb }
    : { a1: f[500], fg: f.lightFg, strong: f[600], tint: f[50], tint2: f[100], deep: f[700], wash: f[50], glow: `0 6px 16px -8px ${rgb(0.45)}`, rgb };
}

export function paletteFor(scheme: Scheme, key: AccentKey): Palette {
  const f = ACCENTS[key], base = PALETTES[scheme];
  return scheme === 'dark'
    ? { ...base, hero: f.darkHero, onHeroAccent: f[300] }
    : { ...base, hero: f[900], onHeroAccent: f[300], shadowHero: `0 18px 36px -18px rgba(${rgbOf(f[900])},.45)` };
}

// Subject colours: icon/fill on a soft tint. Icon-on-tint contrast ≥ 3:1 in light (graphics, WCAG 1.4.11).
export type SubjectSwatch = { fg: string; tint: string; darkFg: string; darkTint: string };
// Seven hues spread around the wheel, each at the same tiers: icon = 600, tint = 50. Previously these ranged
// from chroma 0.086 (teal) to 0.247 (violet) and lightness 0.46 to 0.56, so some subject cards shouted and
// others looked switched off. Now they differ only in hue, which is the one thing they are meant to encode.
// Subjects sit at the SOLID tier (500), not the text tier: a subject colour is an identity, and identities
// should be vivid enough to pick out of a list at a glance. Status colours use the darker text tier because
// they qualify words. Both still land on one lightness — 0.530 — so no subject card outshines another.
// Every icon clears 4.5:1 on its own tint (4.54–5.38) and on the card (4.94–5.92).
export const SUBJECT_COLORS: Record<'indigo' | 'green' | 'amber' | 'sky' | 'rose' | 'teal' | 'violet', SubjectSwatch> = {
  indigo: { fg: '#285CE7', tint: '#F0F5FF', darkFg: '#8AAFFF', darkTint: 'rgba(86,136,252,.17)' },
  green: { fg: '#00823A', tint: '#EEF8F0', darkFg: '#6FC884', darkTint: 'rgba(5,172,79,.17)' },
  amber: { fg: '#935F05', tint: '#FCF4EA', darkFg: '#E4A249', darkTint: 'rgba(194,127,5,.17)' },
  sky: { fg: '#0574A6', tint: '#ECF7FF', darkFg: '#55BCFA', darkTint: 'rgba(1,154,220,.17)' },
  rose: { fg: '#C7054A', tint: '#FEF1F2', darkFg: '#F78D9B', darkTint: 'rgba(231,85,114,.17)' },
  teal: { fg: '#017D76', tint: '#EAF9F7', darkFg: '#14CBC0', darkTint: 'rgba(8,165,156,.17)' },
  violet: { fg: '#7B43D4', tint: '#F6F3FF', darkFg: '#B99FFA', darkTint: 'rgba(155,114,239,.17)' },
};
export const swatch = (key: keyof typeof SUBJECT_COLORS, scheme: Scheme) => {
  const s = SUBJECT_COLORS[key] ?? SUBJECT_COLORS.indigo;
  return scheme === 'dark' ? { fg: s.darkFg, tint: s.darkTint } : { fg: s.fg, tint: s.tint };
};

// Bottom tab bar: 8 top pad + 4 + 30 icon + 4 gap + ~13 label = 59 above the home-indicator padding.
export const TAB_BAR_CONTENT = 59;

export type Weight = 400 | 500 | 600 | 700 | 800;

// ── Scales ───────────────────────────────────────────────────────────────────────────────────
//
// Before these existed the app used 15 distinct font sizes (12, 12.5, 13, 13.5, 14, 14.5 …), 14 corner
// radii and padding on no grid at all. No one can see the difference between 12.5pt and 13pt; what they can
// see is that nothing quite lines up, everywhere, which is the gap between a careful app and a polished one.
//
// Seven type steps, six radii, one 4pt space grid. Every screen draws from these and nothing else, so a
// change to density or rhythm happens once rather than in 155 places.

/** Type scale. Each step is a role, not a number — `heading` stays a heading if the scale is retuned. */
export const TEXT = {
  mega: 40,    // the one biggest figure on a screen
  hero: 32,    // a readiness percentage, a price — the number the screen is about
  display: 28, // screen titles
  title: 22,   // card headlines, big numbers
  heading: 18, // section and list-item titles
  body: 15.5,  // primary reading text
  label: 13.5, // secondary text, buttons, most UI
  caption: 12, // meta, timestamps, helper text
  micro: 10.5, // eyebrows, badges, chart ticks
} as const;
export type TextRole = keyof typeof TEXT;

/** Corner radii. `full` is a pill; everything else steps with the element's size. */
export const RADIUS = { xs: 6, sm: 12, md: 16, lg: 20, xl: 24, full: 99 } as const;
export type RadiusRole = keyof typeof RADIUS;

/** 4pt space grid, for padding and gaps. */
export const SPACE = { '0.5': 2, 1: 4, 2: 8, 3: 12, 4: 16, 5: 20, 6: 24, 7: 28, 8: 32 } as const;


// Line-height scale by role, not by language. Arabic has deeper descenders than Latin, so a single ratio
// clips at display sizes and over-breathes at number sizes. Encode once; use everywhere.
export const LH = { display: 1.15, heading: 1.25, body: 1.5, micro: 1.4, number: 1 } as const;
export type LhRole = keyof typeof LH;
export type Face = 'body' | 'display' | 'grotesk';

// React Native has no font fallback chains, so pick the face per language:
// 'body'    = 'Plus Jakarta Sans','IBM Plex Sans Arabic'
// 'display' = 'Space Grotesk','IBM Plex Sans Arabic'
// 'grotesk' = 'Space Grotesk' only (numbers, clocks, Latin labels)
// Numbers (grotesk face) use Inter everywhere, with tabular-nums applied in the T component. This matches
// the calm, humanist look of Apple Fitness / Linear / Notion, not the geometric "ticker" look of Space Grotesk.
// Display headlines use Inter too, so the whole app reads as one coherent family.
export function font(face: Face, weight: Weight, ar: boolean): string {
  // Arabic script: IBM Plex Sans Arabic (numbers in an Arabic string still use Inter: see 'grotesk' below).
  if (ar && face !== 'grotesk') {
    const w = Math.min(weight, 700) as 400 | 500 | 600 | 700;
    return { 400: 'IBMPlexSansArabic_400Regular', 500: 'IBMPlexSansArabic_500Medium', 600: 'IBMPlexSansArabic_600SemiBold', 700: 'IBMPlexSansArabic_700Bold' }[w];
  }
  // Latin or numbers: Inter.
  return {
    400: 'Inter_400Regular', 500: 'Inter_500Medium', 600: 'Inter_600SemiBold',
    700: 'Inter_700Bold', 800: 'Inter_800ExtraBold',
  }[weight];
}
