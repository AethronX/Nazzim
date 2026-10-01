require('./register-ts.js');
const assert = require('node:assert');
const R = require('../src/engine/recall.ts');
const E = require('../src/lib/exams.ts');

const today = '2026-10-01';
const exam = { id: 'e1', subject: 'G1', date: '2026-10-09', chapters: ['a', 'b'] };
const card = (i, ch) => R.newCard('e1', ch, 'q' + i, 'a' + i, 'c' + i, today);

// A fresh card is due immediately and counts as untested.
let c = card(1, 0);
assert.equal(c.due, today);
assert.equal(R.mastery(c), undefined);
assert.equal(R.chapterRecall([c], 'e1', 0), undefined, 'never attempted → no recall score');

// Knowing it pushes the card out; forgetting brings it back tomorrow and resets the streak.
const knew = R.review(c, 2, today, exam.date);
assert.ok(knew.due > today && knew.reps === 1);
const forgot = R.review(knew, 0, today, exam.date);
assert.equal(forgot.due, '2026-10-02');
assert.equal(forgot.reps, 0, 'forgetting resets the run');
assert.ok(forgot.ease < knew.ease, 'forgetting lowers ease');

// Intervals never jump past the exam.
let far = card(2, 0);
for (let i = 0; i < 6; i++) far = R.review(far, 2, today, exam.date);
assert.ok(E.daysBetween(today, far.due) <= 4, 'interval is clamped to half the days left, got ' + far.due);

// Mastery ordering: forgot < almost < knew, and repeated success earns more.
assert.ok(R.mastery(R.review(card(3, 0), 0, today)) < R.mastery(R.review(card(3, 0), 1, today)));
assert.ok(R.mastery(R.review(card(3, 0), 1, today)) < R.mastery(R.review(card(3, 0), 2, today)));
let twice = R.review(R.review(card(4, 0), 2, today), 2, today);
assert.ok(R.mastery(twice) > R.mastery(R.review(card(4, 0), 2, today)), 'a second success scores higher');

// Untested cards drag the chapter score down — the point of the rewrite.
const strong = R.review(card(5, 0), 2, today);
const alone = R.chapterRecall([strong], 'e1', 0);
const withUntested = R.chapterRecall([strong, card(6, 0)], 'e1', 0);
assert.ok(withUntested < alone, 'an untested card must lower the chapter score');

// Due list puts the weakest first and respects the cap.
const weak = R.review(card(7, 1), 0, today, exam.date);
const due = R.dueCards([strong, weak, card(8, 1)], 'e1', '2026-10-02', 2);
assert.equal(due.length, 2);
assert.equal(due[0].id, 'c8', 'untested comes before merely weak');

const st = R.recallStats([strong, weak, card(9, 1)], 'e1', today);
assert.deepEqual([st.total, st.tested, st.untested], [3, 2, 1]);

console.log('all recall checks passed');

// ── Readiness integration: the properties the rewrite exists to guarantee ──
const exam2 = { id: 'e9', subject: 'Stats', date: '2026-10-09', chapters: ['a', 'b'] };
const sess = (ch, done, focused) => ({ id: 's' + ch, examId: 'e9', chapter: ch, kind: 'learn', date: today, doneAt: done ? today : undefined, minutes: 40, done, confidence: 3, focusedMin: focused });

const tappedOnly = [0, 1].map(c => sess(c, true, 0));
const tappedScore = E.readiness(exam2, tappedOnly, today);
assert.ok(tappedScore <= Math.round(E.WEAK_CEILING * 100), `ticking alone must stay at or under the weak ceiling, got ${tappedScore}%`);

const worked = [0, 1].map(c => sess(c, true, 40));
assert.ok(E.readiness(exam2, worked, today) > tappedScore, 'real minutes must beat a tick');
assert.ok(E.readiness(exam2, worked, today) <= Math.round(E.EFFORT_CEILING * 100) + 1, 'effort alone must not reach the top');

let proven = exam2;
[0, 1].forEach(c => { proven = E.recordRecall(proven, c, 1, today); });
assert.ok(E.readiness(proven, worked, today) > E.readiness(exam2, worked, today), 'proving recall must raise it');

// Recall stands alone: a student who revises elsewhere and proves it is not scored zero.
assert.ok(E.readiness(proven, [], today) > 0, 'proven recall with no logged sessions must still count');

// And a weak self-test must not be worth more than a strong one.
let weakly = exam2;
[0, 1].forEach(c => { weakly = E.recordRecall(weakly, c, 0.3, today); });
assert.ok(E.readiness(weakly, worked, today) < E.readiness(proven, worked, today), 'a weak self-test scores lower');

// The explainer must never promise less than the score it explains.
const d2 = E.readinessDetail(proven, worked, today);
assert.ok(d2.ceiling >= d2.score, 'the reachable ceiling cannot sit below the current score');

console.log('all readiness-integrity checks passed');
