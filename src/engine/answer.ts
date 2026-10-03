// Answer classification for retrieval practice.
//
// WHAT THIS IS: deterministic lexical matching, used ONLY to classify evidence as `verified` or `self`.
// WHAT THIS IS NOT: semantic grading. A correct Arabic answer can be worded completely differently from the
// key and will score low here. So this never blocks the student, never contradicts them, and never lowers
// the grade they chose — it only decides whether the app may call that grade *verified*.
//
// The student's own grade is always kept and always shown. The only consequence of a low match is that a
// claimed "knew it" is scored as "almost" (see `review` in ./recall.ts) and the card carries half weight in
// the chapter's recall confidence. That is the honest reading of "I said I knew it; nothing corroborates it".
//
// No network, no AI, no dependency: this runs offline and identically in tests.
import type { Grade } from './recall';

/** Where a graded card's evidence came from. */
export type Evidence = 'self' | 'verified';

/** Lexical overlap at or above this counts as corroboration. Calibratable; see docs/READINESS_MODEL.md. */
export const VERIFY_THRESHOLD = 0.6;

// Arabic marks that carry no lexical information: harakat, sukun, superscript alef, tatweel.
const MARKS = /[ؐ-ًؚ-ٰٟۖ-ۭـ]/g;
// Punctuation, Arabic and Latin. Explicit ranges rather than \p{P}: Hermes cannot be relied on for
// unicode property escapes.
const PUNCT = /["'`^~|\\/_\-–—.,:;!?()[\]{}<>«»…،؛؟٭•*+=@#$%&]/g;

const ARABIC_INDIC = 0x0660; // ٠-٩
const EASTERN_ARABIC_INDIC = 0x06f0; // ۰-۹

/**
 * Fold a free-text answer to its lexical skeleton.
 * Order matters: marks come off before letters are unified, so a diacritic never blocks a fold.
 */
export function normalize(s: string): string {
  if (!s) return '';
  let out = '';
  for (const ch of s.replace(MARKS, '')) {
    const code = ch.codePointAt(0)!;
    // Arabic-Indic and Eastern Arabic-Indic digits → ASCII, so "١٢٣" and "123" are the same token.
    if (code >= ARABIC_INDIC && code <= ARABIC_INDIC + 9) { out += String(code - ARABIC_INDIC); continue; }
    if (code >= EASTERN_ARABIC_INDIC && code <= EASTERN_ARABIC_INDIC + 9) { out += String(code - EASTERN_ARABIC_INDIC); continue; }
    switch (ch) {
      // Hamza forms of alef are spelling choices, not different words.
      case 'أ': case 'إ': case 'آ': case 'ٱ': case 'ا': out += 'ا'; break;
      case 'ى': case 'ي': case 'ئ': out += 'ي'; break;
      case 'ة': case 'ه': out += 'ه'; break;
      case 'ؤ': case 'و': out += 'و'; break;
      case 'ء': break; // a bare hamza carries no stem information
      default: out += ch;
    }
  }
  return out.replace(PUNCT, ' ').replace(/\s+/g, ' ').trim().toLowerCase();
}

/** Content tokens of a normalized answer. Single characters are dropped: they match everything. */
export function tokens(s: string): string[] {
  return normalize(s).split(' ').filter(t => t.length > 1);
}

/**
 * Dice coefficient over the two token sets: 2|A∩B| / (|A|+|B|), in 0..1.
 * Set-based on purpose — repeating a word must not buy similarity.
 */
export function similarity(typed: string, key: string): number {
  const a = new Set(tokens(typed));
  const b = new Set(tokens(key));
  if (!a.size || !b.size) return 0;
  let shared = 0;
  for (const t of a) if (b.has(t)) shared += 1;
  return (2 * shared) / (a.size + b.size);
}

/**
 * Classify the evidence behind one graded card.
 *
 * A grade of "forgot" or "almost" is always `verified`: nobody games a self-test downwards, so a low grade
 * is trustworthy evidence whatever the text says. Only a claimed "knew it" has to be corroborated.
 */
export function classify(typed: string, key: string, grade: Grade): Evidence {
  if (grade !== 2) return 'verified';
  return similarity(typed, key) >= VERIFY_THRESHOLD ? 'verified' : 'self';
}
