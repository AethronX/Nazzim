// Design-system guard. A one-off tidy-up decays; this keeps the scales true.
//
// Before the scales existed the app used 15 font sizes (12, 12.5, 13, 13.5 …), 14 corner radii and no space
// grid. Nobody can see 12.5 against 13; everybody can see that nothing quite lines up. These checks fail the
// build rather than let that creep back one component at a time.
require('./register-ts');
const fs = require('node:fs');
const path = require('node:path');
const { TEXT, RADIUS } = require('../src/lib/theme.ts');

const SRC = path.join(__dirname, '..', 'src');
const files = [];
(function walk(dir) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p);
    else if (e.name.endsWith('.tsx')) files.push(p);
  }
})(SRC);

const rel = f => path.relative(path.join(__dirname, '..'), f);
const problems = [];

const RADII = new Set(Object.values(RADIUS));
const TEXT_ROLES = new Set(Object.keys(TEXT));

for (const f of files) {
  const src = fs.readFileSync(f, 'utf8');
  const lines = src.split('\n');

  lines.forEach((line, i) => {
    const at = `${rel(f)}:${i + 1}`;

    // 1. Font sizes come from the scale. `s={14}` is how the drift started.
    for (const m of line.matchAll(/<T\b[^>]*?\ss=\{(\d+(?:\.\d+)?)\}/g)) {
      problems.push(`${at}  font size ${m[1]} is off the scale — use s="body" | "label" | … (${[...TEXT_ROLES].join(', ')})`);
    }
    for (const m of line.matchAll(/<T\b[^>]*?\ss="([a-z]+)"/g)) {
      if (!TEXT_ROLES.has(m[1])) problems.push(`${at}  unknown type role "${m[1]}"`);
    }

    // 2. Container radii come from the scale. A circle (radius = half the box) is exempt, and so are the
    //    2–5pt details on hairline bars.
    for (const m of line.matchAll(/borderRadius: (\d+)/g)) {
      const v = Number(m[1]);
      if (v <= 5 || RADII.has(v)) continue;
      const circle = new RegExp(`(?:width|height): ${v * 2}\\b`).test(line) || /(?:width|height): size\b/.test(line);
      if (!circle) problems.push(`${at}  borderRadius ${v} is off the scale — use ${Object.entries(RADIUS).map(([k, n]) => `${k}=${n}`).join(', ')}`);
    }
  });
}

// 3. The clock must stay left-to-right. Its minutes, colon and seconds are separate children, so on an
//    Arabic screen an inherited RTL row renders them seconds-first: a 25-minute timer reads "00:25".
const ui = fs.readFileSync(path.join(SRC, 'components', 'ui.tsx'), 'utf8');
const clock = ui.slice(ui.indexOf('export function Clock'));
if (!/direction: 'ltr'/.test(clock.slice(0, clock.indexOf('\n}')))) {
  problems.push("src/components/ui.tsx  Clock must pin direction: 'ltr' or the timer renders mirrored in Arabic");
}

if (problems.length) {
  console.error(`design guard: ${problems.length} problem(s)\n` + problems.map(p => '  ' + p).join('\n'));
  process.exit(1);
}
console.log(`design guard passed — ${files.length} components on ${TEXT_ROLES.size} type steps and ${RADII.size} radii`);
