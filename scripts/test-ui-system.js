// UI-system guard: the shared states and the button system stay shared.
//
// A hand-rolled primary button is how a screen quietly drifts: a different radius, no disabled state, no
// busy state, a target under 48pt. Primary actions go through Button/PrimaryBtn in components/ui.tsx.
require('./register-ts');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert');
const { TOUCH, semantic, PALETTES, makeAccent } = require('../src/lib/theme.ts');
const { COPY } = require('../src/lib/copy.ts');

const SRC = path.join(__dirname, '..', 'src');
const files = [];
(function walk(d) { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); e.isDirectory() ? walk(p) : p.endsWith('.tsx') && files.push(p); } })(SRC);
const problems = [];

// 1. No hand-rolled primary buttons outside the button system.
for (const f of files) {
  if (f.endsWith(path.join('components', 'ui.tsx'))) continue;
  const src = fs.readFileSync(f, 'utf8');
  if (/backgroundColor: [^,}]*accent\.a1[^}]*boxShadow: [^,}]*accent\.glow/.test(src) && /<T w=\{8?00\} s="body" c=\{[^}]*onAccent/.test(src)) {
    problems.push(`${path.relative(SRC, f)}  hand-rolled primary button — use <PrimaryBtn> or <Button>`);
  }
}

// 2. The button system keeps its touch target and its states.
const ui = fs.readFileSync(path.join(SRC, 'components', 'ui.tsx'), 'utf8');
const button = ui.slice(ui.indexOf('export function Button'), ui.indexOf('export function PrimaryBtn'));
assert.ok(/minHeight: compact \? TOUCH\.min : TOUCH\.comfortable/.test(button), 'Button must keep a 44/48pt minimum height');
assert.ok(/busy: !!loading/.test(button) && /disabled: off/.test(button), 'Button must announce busy and disabled states');
assert.ok(TOUCH.min >= 44 && TOUCH.comfortable >= 48);

// 3. Semantic roles resolve to real colours in both themes.
for (const scheme of ['light', 'dark']) {
  const S = semantic(PALETTES[scheme], makeAccent(scheme, 'indigo'));
  for (const [k, v] of Object.entries(S)) assert.ok(typeof v === 'string' && v.length > 3, `${scheme}.${k} is empty`);
}

// 4. Shared-state copy exists in both languages, and recall keeps the respected override.
for (const k of ['rcCheckT', 'rcOverride', 'offT', 'offS', 'errT', 'errS', 'errRetry', 'subjEmptyT', 'rcEmptyT']) {
  assert.ok(COPY.en[k] && COPY.ar[k], `copy key ${k} missing`);
}
assert.equal(COPY.ar.rcCheckT, 'إجابتك قد تحتاج مراجعة');
assert.equal(COPY.ar.rcOverride, 'إجابتي كانت صحيحة');
assert.equal(COPY.ar.rcGradeHint.length, COPY.ar.rcGrades.length, 'every grade has a hint');
assert.equal(COPY.ar.evBand.length, 3);

if (problems.length) { console.error(problems.join('\n')); process.exit(1); }
console.log('ui-system guard passed — one button system, shared states, semantic roles in both themes');
