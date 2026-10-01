// NAZZIM design tokens — "Calm Intelligence".
// White and slate surfaces, one Indigo accent used for actions and progress (never as a dominant background),
// and semantic colours only where they carry meaning: success = done, warning = needs attention soon,
// danger = overdue or destructive. Subjects get their own soft colour so the semester is easy to scan.
//
// Contrast is checked by scripts/test-contrast.js (npm test) for every accent in both themes.
// Progress fills use `accent.fg` (500 in light, 300 in dark: Indigo 500 on the dark card is only 2.8:1).
// Contrast (WCAG 2.2), light / dark: muted text on bg 4.55 / 6.92, Indigo text on bg 6.01 / 8.9,
// white on Indigo 6.29, Indigo 600 on tint 7.07 / 10.8, success/warning/danger text ≥ 4.5 in both themes,
// control borders ≥ 3.0 (1.4.11), subject icons on their tint ≥ 3.0.

export type Scheme = 'light' | 'dark';

export const INDIGO = {
  50: '#EEF2FF', 100: '#E0E7FF', 200: '#C7D2FE', 300: '#A5B4FC', 400: '#818CF8',
  500: '#4F46E5', 600: '#4338CA', 700: '#3730A3', 800: '#312E81', 900: '#262466', ai: '#6366F1',
} as const;

const LIGHT = {
  // Surfaces, back to front
  bg: '#F8FAFC',
  card: '#FFFFFF',
  card2: '#F8FAFC',
  header: 'rgba(248,250,252,.92)',
  chrome: 'rgba(255,255,255,.94)',
  // Hairlines and inactive fills
  line: '#E2E8F0',
  line2: '#F1F5F9',
  track: '#E2E8F0',
  bar: '#E2E8F0',
  control: '#8391A7', // state borders (off toggle, empty radio/checkbox): 3.19:1
  // Text
  ink: '#111827',
  ink2: '#475569',
  ink3: '#64748B',
  strike: 'rgba(100,116,139,.55)',
  // Semantic: fill (icons, bars), text (on white/tint) and tint (chip backgrounds)
  success: '#16A34A', successText: '#15803D', successTint: '#DCFCE7',
  warning: '#F59E0B', warningText: '#B45309', warningTint: '#FEF3C7',
  danger: '#B91C1C', dangerFill: '#EF4444', dangerTint: '#FEE2E2', // red-700 text: 5.0 on its tint
  onSuccess: '#FFFFFF', // check mark on the success fill
  onWarning: '#111827', // text on the amber fill (white would be 2.1:1)
  // Brand surface for the few moments that deserve it (launch screen, Pro)
  hero: INDIGO[800] as string,
  onHero: '#FFFFFF',
  onHero2: 'rgba(255,255,255,.76)',
  onHero3: 'rgba(255,255,255,.6)',
  onHeroLine: 'rgba(255,255,255,.16)',
  onHeroTrack: 'rgba(255,255,255,.16)',
  onHeroAccent: INDIGO[300] as string,
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
  bg: '#0B1220',
  card: '#111827',
  card2: '#1A2333',
  header: 'rgba(11,18,32,.92)',
  chrome: 'rgba(17,24,39,.94)',
  line: '#263244',
  line2: '#1C2636',
  track: '#263244',
  bar: '#2A3548',
  control: '#64748B',
  ink: '#F1F5F9',
  ink2: '#CBD5E1',
  ink3: '#94A3B8',
  strike: 'rgba(148,163,184,.55)',
  success: '#4ADE80', successText: '#4ADE80', successTint: 'rgba(74,222,128,.14)',
  warning: '#FBBF24', warningText: '#FBBF24', warningTint: 'rgba(251,191,36,.14)',
  danger: '#F87171', dangerFill: '#F87171', dangerTint: 'rgba(248,113,113,.14)',
  onSuccess: '#0B1220', // white on light green would be 1.7:1
  onWarning: '#0B1220',
  hero: '#23205E',
  onHero: '#FFFFFF',
  onHero2: 'rgba(255,255,255,.76)',
  onHero3: 'rgba(255,255,255,.6)',
  onHeroLine: 'rgba(255,255,255,.16)',
  onHeroTrack: 'rgba(255,255,255,.16)',
  onHeroAccent: INDIGO[300] as string,
  inv: '#F1F5F9',
  onInv: '#0B1220',
  onInv3: 'rgba(11,18,32,.6)',
  onAccent: '#FFFFFF',
  scrim: 'rgba(0,0,0,.55)',
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
export const ACCENTS: Record<AccentKey, Family> = {
  indigo: {
    50: INDIGO[50], 100: INDIGO[100], 300: INDIGO[300], 500: INDIGO[500], 600: INDIGO[600], 700: INDIGO[700], 900: INDIGO[800],
    lightFg: INDIGO[500], darkHero: '#23205E', darkTint: '#191C47', darkTint2: '#22265E',
  },
  rose: {
    50: '#FCEFF3', 100: '#F8DEE7', 300: '#F59BBC', 500: '#D6336C', 600: '#B42759', 700: '#8E1F47', 900: '#4A0F2C',
    lightFg: '#B42759', darkHero: '#5C1638', darkTint: '#2F1529', darkTint2: '#431931',
  },
  violet: {
    50: '#F4F0FD', 100: '#E8E2FB', 300: '#B39CF5', 500: '#7048E8', 600: '#5B37C9', 700: '#482BA3', 900: '#26145E',
    lightFg: '#7048E8', darkHero: '#301A70', darkTint: '#1C193F', darkTint2: '#271F54',
  },
  teal: {
    50: '#ECF5F4', 100: '#D8EBEA', 300: '#6FD3C6', 500: '#0C8579', 600: '#0A6E64', 700: '#08574F', 900: '#06332F',
    lightFg: '#0A6E64', darkHero: '#0B403B', darkTint: '#0A242B', darkTint2: '#0B3035',
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
export const SUBJECT_COLORS: Record<'indigo' | 'green' | 'amber' | 'sky' | 'rose' | 'teal' | 'violet', SubjectSwatch> = {
  indigo: { fg: '#4F46E5', tint: '#EEF2FF', darkFg: '#A5B4FC', darkTint: 'rgba(99,102,241,.18)' },
  green: { fg: '#15803D', tint: '#DCFCE7', darkFg: '#4ADE80', darkTint: 'rgba(74,222,128,.14)' },
  amber: { fg: '#B45309', tint: '#FEF3C7', darkFg: '#FBBF24', darkTint: 'rgba(251,191,36,.14)' },
  sky: { fg: '#0369A1', tint: '#E0F2FE', darkFg: '#7DD3FC', darkTint: 'rgba(125,211,252,.14)' },
  rose: { fg: '#BE123C', tint: '#FFE4E6', darkFg: '#FDA4AF', darkTint: 'rgba(253,164,175,.14)' },
  teal: { fg: '#0F766E', tint: '#CCFBF1', darkFg: '#5EEAD4', darkTint: 'rgba(94,234,212,.14)' },
  violet: { fg: '#7C3AED', tint: '#EDE9FE', darkFg: '#C4B5FD', darkTint: 'rgba(196,181,253,.14)' },
};
export const swatch = (key: keyof typeof SUBJECT_COLORS, scheme: Scheme) => {
  const s = SUBJECT_COLORS[key] ?? SUBJECT_COLORS.indigo;
  return scheme === 'dark' ? { fg: s.darkFg, tint: s.darkTint } : { fg: s.fg, tint: s.tint };
};

// Bottom tab bar: 8 top pad + 4 + 30 icon + 4 gap + ~13 label = 59 above the home-indicator padding.
export const TAB_BAR_CONTENT = 59;

export type Weight = 400 | 500 | 600 | 700 | 800;
export type Face = 'body' | 'display' | 'grotesk';

// React Native has no font fallback chains, so pick the face per language:
// 'body'    = 'Plus Jakarta Sans','IBM Plex Sans Arabic'
// 'display' = 'Space Grotesk','IBM Plex Sans Arabic'
// 'grotesk' = 'Space Grotesk' only (numbers, clocks, Latin labels)
export function font(face: Face, weight: Weight, ar: boolean): string {
  if (face === 'grotesk' || (face === 'display' && !ar)) {
    const w = Math.min(Math.max(weight, 500), 700);
    return { 500: 'SpaceGrotesk_500Medium', 600: 'SpaceGrotesk_600SemiBold', 700: 'SpaceGrotesk_700Bold' }[w as 500 | 600 | 700];
  }
  if (ar) {
    const w = Math.min(weight, 700) as 400 | 500 | 600 | 700;
    return { 400: 'IBMPlexSansArabic_400Regular', 500: 'IBMPlexSansArabic_500Medium', 600: 'IBMPlexSansArabic_600SemiBold', 700: 'IBMPlexSansArabic_700Bold' }[w];
  }
  return {
    400: 'PlusJakartaSans_400Regular', 500: 'PlusJakartaSans_500Medium', 600: 'PlusJakartaSans_600SemiBold',
    700: 'PlusJakartaSans_700Bold', 800: 'PlusJakartaSans_800ExtraBold',
  }[weight];
}
