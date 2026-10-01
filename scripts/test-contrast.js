// WCAG 2.2 contrast audit of the colour pairs the UI actually renders, every accent, light and dark.
// Text ≥ 4.5 (AA), large/bold text and meaningful graphics ≥ 3.0. Run: npm test
require('./register-ts');
const T = require('../src/lib/theme.ts');

const parse = c => {
  if (c.startsWith('#')) return [1, 3, 5].map(i => parseInt(c.slice(i, i + 2), 16)).concat(1);
  const m = c.match(/rgba?\(([^)]+)\)/)[1].split(',').map(Number);
  return [m[0], m[1], m[2], m[3] ?? 1];
};
const over = (fg, bg) => { const a = parse(fg), b = parse(bg); return [0, 1, 2].map(i => a[i] * a[3] + b[i] * (1 - a[3])); };
const lum = rgb => { const [r, g, b] = rgb.map(v => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
// fg may be translucent; bg may be translucent over `base`.
const ratio = (fg, bg, base) => {
  const b = base ? over(bg, base) : over(bg, '#FFFFFF');
  const bHex = '#' + b.map(v => Math.round(v).toString(16).padStart(2, '0')).join('');
  const f = over(fg, bHex);
  const [l1, l2] = [lum(f), lum(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
};

const fails = [];
const check = (name, fg, bg, min, base) => {
  const r = ratio(fg, bg, base);
  if (r < min) fails.push(`${name}: ${r.toFixed(2)} < ${min}`);
  return r;
};

for (const scheme of ['light', 'dark']) {
  for (const key of T.ACCENT_KEYS) {
    const C = T.paletteFor(scheme, key), A = T.makeAccent(scheme, key), tag = `${scheme}/${key}`;
    if (key === 'indigo') {
      for (const s of ['bg', 'card', 'card2']) for (const t of ['ink', 'ink2', 'ink3']) check(`${tag} ${t} on ${s}`, C[t], C[s], 4.5);
      check(`${tag} ink3 on chrome (tab labels)`, C.ink3, C.chrome, 4.5, C.bg);
      check(`${tag} control border on card`, C.control, C.card, 3);
      for (const s of ['success', 'warning', 'danger']) {
        const txt = C[s + 'Text'] ?? C[s];
        check(`${tag} ${s} text on card`, txt, C.card, 4.5);
        check(`${tag} ${s} text on its tint`, txt, C[s + 'Tint'], 4.5, C.card);
        check(`${tag} ${s} text on its tint over bg`, txt, C[s + 'Tint'], 4.5, C.bg);
      }
      check(`${tag} success fill (done check) on card`, C.success, C.card, 3);
      check(`${tag} check mark on success fill`, C.onSuccess, C.success, 3);
      check(`${tag} text on warning fill`, C.onWarning, C.warning, 4.5);
      check(`${tag} overdue border on card`, C.warningText, C.card, 3);
      check(`${tag} onHero2 on hero`, C.onHero2, C.hero, 4.5);
      for (const [k] of Object.entries(T.SUBJECT_COLORS)) {
        const sw = T.swatch(k, scheme);
        check(`${tag} subject ${k} icon on its tint`, sw.fg, sw.tint, 3, C.card);
        check(`${tag} subject ${k} large % on card`, sw.fg, C.card, 3);
      }
    }
    check(`${tag} accent text on bg`, A.fg, C.bg, 4.5);
    check(`${tag} accent text on card`, A.fg, C.card, 4.5);
    check(`${tag} accent strong on tint`, A.strong, A.tint, 4.5, C.card);
    check(`${tag} white on accent button`, C.onAccent, A.a1, 4.5);
    check(`${tag} selected day label (onHero2 on accent)`, C.onHero2, A.a1, 3);
    check(`${tag} progress fill (accent.fg) on card`, A.fg, C.card, 3);
    check(`${tag} progress fill on its track`, A.fg, A.tint, 3, C.card);
  }
}
if (fails.length) { console.log('contrast failures:\n  ' + fails.join('\n  ')); process.exit(1); }
console.log('all contrast checks passed');
