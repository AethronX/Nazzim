require('./register-ts');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { COPY, counted } = require('../src/lib/copy.ts');
const { en, ar } = { en: COPY.en, ar: COPY.ar };

// Arabic counted-noun agreement — the rule most translated apps get wrong.
const d = n => counted(n, 'day', ar, true);
assert.equal(d(1), 'يوم', 'one takes the singular with no number');
assert.equal(d(2), 'يومين', 'the dual is oblique: it follows a preposition in nearly every string');
assert.equal(d(3), '3 أيام');
assert.equal(d(10), '10 أيام');
assert.equal(d(11), '11 يوماً', 'eleven and up take the accusative singular');
assert.equal(d(25), '25 يوماً');
assert.equal(d(103), '103 أيام', 'the 3–10 rule repeats every hundred');
assert.equal(d(111), '111 يوماً');
assert.equal(d(100), '100 يوماً');

// English stays simple, and 1 is still singular.
assert.equal(counted(1, 'session', en, false), '1 session');
assert.equal(counted(4, 'session', en, false), '4 sessions');

// Every unit is defined in both languages, with the right number of forms.
for (const u of Object.keys(en.units)) {
  assert.equal(en.units[u].length, 2, `en.units.${u} needs 2 forms`);
  assert.equal(ar.units[u].length, 4, `ar.units.${u} needs 4 forms`);
  assert.ok(ar.units[u].every(Boolean), `ar.units.${u} has an empty form`);
}

// The two tables must not drift apart.
const missing = Object.keys(en).filter(k => !(k in ar));
assert.deepEqual(missing, [], 'Arabic is missing keys: ' + missing.join(', '));
const extra = Object.keys(ar).filter(k => !(k in en));
assert.deepEqual(extra, [], 'Arabic has keys English does not: ' + extra.join(', '));

console.log('all copy checks passed');

// unitOf(): the noun alone, for layouts that print the number separately (the rescue tiles).
const { unitOf } = require('../src/lib/copy.ts');
// Zero takes a singular genitive in Arabic — '0 مهمة', not '0 مهام'.
assert.equal(unitOf(0, 'task', ar, true), 'مهمة');
assert.equal(unitOf(1, 'task', ar, true), 'مهمة');
assert.equal(unitOf(2, 'exam', ar, true), 'امتحانين');
assert.equal(unitOf(5, 'exam', ar, true), 'امتحانات');
assert.equal(unitOf(12, 'exam', ar, true), 'امتحاناً');
assert.equal(unitOf(1, 'task', en, false), 'task');
assert.equal(unitOf(3, 'task', en, false), 'tasks');
// counted() drops the numeral for one and two in Arabic, and never in English.
assert.equal(counted(1, 'task', ar, true), 'مهمة');
assert.equal(counted(1, 'task', en, false), '1 task');
console.log('all unit checks passed');

// ── Numeral roles ───────────────────────────────────────────────────────────────────────────
// The face follows the role, not the other way round. A figure that is compared or watched change takes
// Inter; a figure inside a sentence takes the sentence's face, so a mixed string stays in one font.
const { font } = require('../src/lib/theme.ts');

assert.ok(font('body', 700, true).startsWith('IBMPlexSansArabic'), 'Arabic prose takes the Arabic face');
assert.ok(font('body', 700, true, true).startsWith('Inter'), 'a data figure takes Inter even on an Arabic screen');
assert.ok(font('body', 700, false).startsWith('Inter'), 'English prose takes Inter');
assert.ok(font('display', 800, true).startsWith('IBMPlexSansArabic'), 'Arabic display text stays Arabic');
// The Arabic face stops at 700; asking for 800 must not fall off the end of the table.
assert.ok(font('body', 800, true).startsWith('IBMPlexSansArabic'), 'weight 800 clamps to the heaviest Arabic cut');
assert.equal(font('body', 800, false), 'Inter_800ExtraBold');

console.log('all numeral-role checks passed');

// ── The number must never be sold as a probability ───────────────────────────────────────────────
//
// Evidence completeness measures how strong the collected evidence is. It has never been calibrated against
// a real exam result, so any phrasing that reads as "X% chance of passing" is a claim the product cannot
// support. This check fails the build on that phrasing rather than trusting everyone to remember.
const FORBIDDEN = [
  'فرصة نجاح', 'احتمال نجاح', 'احتمال A', 'جاهز بنسبة', 'ستنجح بنسبة', 'فرصتك في النجاح',
  'probability of passing', 'chance of success', 'chance of passing', 'likely to pass', 'you will pass',
];
{
  const raw = fs.readFileSync(path.join(__dirname, '..', 'src', 'lib', 'copy.ts'), 'utf8');
  const hay = raw.toLowerCase();
  const hits = FORBIDDEN.filter(p => hay.includes(p.toLowerCase()));
  assert.equal(hits.length, 0, `copy must not promise a probability of success: found ${JSON.stringify(hits)}`);
  console.log(`no-promise guard passed — ${FORBIDDEN.length} forbidden phrasings absent from both languages`);
}
