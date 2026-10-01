// Palette guard: the properties that make the colours a *system* rather than a collection.
//
// scripts/test-contrast.js already proves every pair is legible. That is a floor, and the old palette cleared
// it while still looking incoherent: amber sat 0.24 lighter than the other status colours in OKLCH, teal was
// nearly grey beside violet, and the brand ramp had two near-duplicate steps and one cliff. Legibility is not
// consistency, so this file measures consistency.
require('./register-ts');
const assert = require('node:assert');
const { oklch } = require('./oklch.js');
const { BRAND, PALETTES, ACCENTS, ACCENT_KEYS, SUBJECT_COLORS } = require('../src/lib/theme.ts');

const L = h => oklch(h).L;
const C = h => oklch(h).C;
const H = h => oklch(h).H;
const spread = xs => Math.max(...xs) - Math.min(...xs);
// Hue distance on the wheel.
const hueGap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d; };

const BRAND_HUE = H(BRAND[500]);

// ── 1. The brand's own two colours are never regenerated ──
assert.equal(BRAND[500], '#285CE7', 'the action blue is the brand and must not drift');
assert.equal(BRAND[800], '#112357', 'the hero navy is the brand and must not drift');

// ── 2. The ramp descends with no duplicate-feeling neighbours and no cliff ──
const steps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900];
let prev = Infinity;
const deltas = [];
for (const s of steps) {
  const l = L(BRAND[s]);
  assert.ok(l < prev, `BRAND[${s}] must be darker than the step above it`);
  if (prev !== Infinity) deltas.push(prev - l);
  prev = l;
}
assert.ok(Math.min(...deltas) >= 0.035, `no two steps may sit within 0.035 lightness (worst ${Math.min(...deltas).toFixed(3)})`);
assert.ok(Math.max(...deltas) <= 0.135, `no step may jump more than 0.135 (worst ${Math.max(...deltas).toFixed(3)})`);

// Hue holds down the ramp, and chroma peaks at the solid step.
for (const s of steps) {
  assert.ok(hueGap(H(BRAND[s]), BRAND_HUE) <= 8, `BRAND[${s}] drifts ${hueGap(H(BRAND[s]), BRAND_HUE).toFixed(1)}° off the brand hue`);
}
assert.ok(C(BRAND[500]) >= C(BRAND[400]) && C(BRAND[500]) >= C(BRAND[600]), 'chroma must peak at the solid step');

// ── 3. Status colours share a tier, in both themes ──
for (const [scheme, p] of Object.entries(PALETTES)) {
  const fills = [p.success, p.warning, p.danger].map(L);
  assert.ok(spread(fills) <= 0.08, `${scheme}: status fills spread ${spread(fills).toFixed(3)} in lightness — they must read as one family`);
  const texts = [p.successText, p.warningText, p.dangerText ?? p.danger].map(L);
  assert.ok(spread(texts) <= 0.09, `${scheme}: status text spread ${spread(texts).toFixed(3)}`);
  const tints = [p.successTint, p.warningTint, p.dangerTint].filter(c => c.startsWith('#')).map(L);
  if (tints.length === 3) assert.ok(spread(tints) <= 0.05, `${scheme}: status tints spread ${spread(tints).toFixed(3)}`);
}

// ── 4. Subject colours differ in hue and in nothing else ──
const subjects = Object.values(SUBJECT_COLORS);
assert.ok(spread(subjects.map(s => L(s.fg))) <= 0.09, 'subject icons must share a lightness tier');
assert.ok(spread(subjects.map(s => L(s.tint))) <= 0.05, 'subject tints must share a lightness tier');
// Hues must stay far enough apart to be told apart at a glance.
const hues = subjects.map(s => H(s.fg)).sort((a, b) => a - b);
for (let i = 1; i < hues.length; i++) {
  assert.ok(hueGap(hues[i], hues[i - 1]) >= 25, `two subject colours are only ${hueGap(hues[i], hues[i - 1]).toFixed(1)}° apart`);
}

// ── 5. Swapping the app colour changes the hue and nothing else ──
for (const k of ACCENT_KEYS) {
  const a = ACCENTS[k], base = ACCENTS.indigo;
  for (const step of [50, 100, 300, 500, 600, 700]) {
    const d = Math.abs(L(a[step]) - L(base[step]));
    assert.ok(d <= 0.07, `accent ${k} step ${step} sits ${d.toFixed(3)} off the brand's lightness`);
  }
  const own = H(a[500]);
  for (const step of [100, 300, 500, 600, 700]) {
    assert.ok(hueGap(H(a[step]), own) <= 20, `accent ${k} drifts hue at step ${step}`);
  }
}

// ── 6. Neutrals belong to the brand ──
for (const [scheme, p] of Object.entries(PALETTES)) {
  for (const key of ['bg', 'card2', 'line', 'ink', 'ink2', 'ink3']) {
    const v = p[key];
    if (!v.startsWith('#')) continue;
    if (C(v) < 0.006) continue; // effectively neutral: hue is meaningless
    assert.ok(hueGap(H(v), BRAND_HUE) <= 20, `${scheme}.${key} (${v}) sits ${hueGap(H(v), BRAND_HUE).toFixed(1)}° from the brand hue`);
    assert.ok(C(v) <= 0.05, `${scheme}.${key} carries too much colour for a neutral (${C(v).toFixed(3)})`);
  }
  // Dark surfaces must actually separate, or elevation reads as noise.
  if (scheme === 'dark') {
    assert.ok(L(p.card) - L(p.bg) >= 0.03, 'dark card must lift off the background');
    assert.ok(L(p.card2) - L(p.card) >= 0.03, 'dark card2 must lift off the card');
  }
}

console.log(
  `palette guard passed — ramp Δ ${Math.min(...deltas).toFixed(3)}–${Math.max(...deltas).toFixed(3)}, ` +
  `status fills within ${spread([PALETTES.light.success, PALETTES.light.warning, PALETTES.light.danger].map(L)).toFixed(3)}, ` +
  `${subjects.length} subject hues ≥25° apart`,
);
