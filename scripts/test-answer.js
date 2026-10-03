// Answer-classification guard.
//
// This is deliberately a weak instrument: lexical overlap, no semantics. What these checks protect is that
// it stays honest about being weak — it classifies evidence, it never grades, and it never contradicts the
// student. The Arabic folding matters most: without it "الإحتمال" and "الاحتمال" are different words, and
// every Arabic answer would be classified self-reported.
require('./register-ts.js');
const assert = require('node:assert');
const A = require('../src/engine/answer.ts');

// ── Normalization: Arabic orthography variants fold to one skeleton ──
{
  // Alef forms.
  assert.equal(A.normalize('أحمد'), A.normalize('احمد'));
  assert.equal(A.normalize('إحمد'), A.normalize('احمد'));
  assert.equal(A.normalize('آحمد'), A.normalize('احمد'));
  // Ya and ta-marbuta.
  assert.equal(A.normalize('على'), A.normalize('علي'));
  assert.equal(A.normalize('عينة'), A.normalize('عينه'));
  // Diacritics and tatweel carry no lexical information.
  assert.equal(A.normalize('اَلْعَيِّنَة'), A.normalize('العينه'));
  assert.equal(A.normalize('عـــينة'), A.normalize('عينه'));
  // Digits: Arabic-Indic, Eastern Arabic-Indic and ASCII are the same number.
  assert.equal(A.normalize('١٢٣'), '123');
  assert.equal(A.normalize('۱۲۳'), '123');
  assert.equal(A.normalize('123'), '123');
  // Punctuation and whitespace.
  assert.equal(A.normalize('التوزيع، الطبيعي!'), 'التوزيع الطبيعي');
  assert.equal(A.normalize('  a   b  '), 'a b');
  assert.equal(A.normalize('ABC'), 'abc');
  assert.equal(A.normalize(''), '');
  assert.equal(A.normalize(undefined), '');
}

// ── Similarity ──
{
  assert.equal(A.similarity('', 'anything'), 0, 'an empty answer matches nothing');
  assert.equal(A.similarity('anything', ''), 0);
  assert.equal(A.similarity('التوزيع الطبيعي', 'التوزيع الطبيعي'), 1, 'identical answers match fully');
  // Orthography must not cost the student a match.
  assert.equal(A.similarity('توزيع العينة', 'توزيع العينه'), 1, 'ta-marbuta must not break a match');
  assert.equal(A.similarity('الإحتمال المشروط', 'الاحتمال المشروط'), 1, 'hamza must not break a match');
  // Repetition buys nothing: the comparison is set-based.
  assert.equal(A.similarity('توزيع توزيع توزيع', 'توزيع'), 1);
  assert.ok(A.similarity('توزيع العينة والخطأ المعياري', 'توزيع العينة') > 0.5, 'a longer correct answer still matches');
  assert.ok(A.similarity('لا اعرف', 'توزيع العينة والانحراف المعياري') < A.VERIFY_THRESHOLD, 'an unrelated answer falls below the threshold');
  for (const s of [A.similarity('a b', 'b c'), A.similarity('x', 'y'), A.similarity('التوزيع', 'الانحراف')]) {
    assert.ok(s >= 0 && s <= 1, 'similarity stays in 0..1');
  }
}

// ── Classification: the only thing this engine is allowed to decide ──
{
  const key = 'توزيع متوسطات العينة يقترب من التوزيع الطبيعي';

  // A claimed "knew it" with real overlap is corroborated.
  assert.equal(A.classify('توزيع متوسطات العينة يقترب من التوزيع الطبيعي', key, 2), 'verified');
  assert.equal(A.classify('توزيع متوسطات العينه يقترب من التوزيع الطبيعى', key, 2), 'verified', 'orthography must not downgrade the evidence');

  // A claimed "knew it" with nothing in common is self-reported — but NOT rejected.
  assert.equal(A.classify('نعم اعرفها', key, 2), 'self');
  assert.equal(A.classify('', key, 2), 'self');

  // Grades the student cannot gain from are always taken at face value.
  assert.equal(A.classify('', key, 0), 'verified', 'nobody games a self-test downwards');
  assert.equal(A.classify('', key, 1), 'verified');
  assert.equal(A.classify('لا شيء', key, 0), 'verified');

  // The threshold is the only tuning knob, and it is exposed for calibration.
  assert.ok(A.VERIFY_THRESHOLD > 0 && A.VERIFY_THRESHOLD < 1);
}

console.log('all answer-classification checks passed');
