// Checks for the exam engine. Run: npm run test:engine
require('./register-ts');
const E = require('../src/lib/exams.ts');
const assert = require('assert');
const today = '2026-09-28';
const show = (ss) => ss.map(s => `${s.date.slice(5)} ${s.kind[0]}${s.chapter >= 0 ? s.chapter : '*'}`).join(' | ');
// 1. Ten days, three chapters
let ex = { id: 'e1', subject: 'Physics', date: E.addDays(today, 10), chapters: ['A', 'B', 'C'] };
let ss = E.planExam(ex, today);
console.log('10d/3ch:', ss.length, 'sessions\n ', show(ss));
assert(ss.every(s => s.date >= today && s.date < ex.date), 'all sessions before exam');
assert(ss.filter(s => s.kind === 'learn').length === 3);
assert(ss.some(s => s.kind === 'mock' && s.date === E.addDays(ex.date, -1)));
for (const c of [0, 1, 2]) { const l = ss.find(s => s.chapter === c && s.kind === 'learn'); const r = ss.filter(s => s.chapter === c && s.kind === 'review'); assert(r.every(x => x.date > l.date), 'reviews after learn'); }
// 2. Three days, four chapters (tight)
let ex2 = { id: 'e2', subject: 'Maths', date: E.addDays(today, 3), chapters: ['1', '2', '3', '4'] };
let s2 = E.planExam(ex2, today);
console.log('3d/4ch:', s2.length, 'sessions\n ', show(s2));
assert(s2.every(s => s.date < ex2.date));
const perDay = {}; s2.forEach(s => perDay[s.date] = (perDay[s.date] || 0) + 1); console.log('  per day', perDay);
// 3. Exam today or past → nothing
assert.equal(E.planExam({ ...ex2, date: today }, today).length, 0);
// 4. Rating: Hard adds a review tomorrow, Easy drops next one
const learnA = ss.find(s => s.chapter === 0 && s.kind === 'learn');
let hard = E.rate(ss, learnA.id, 1, ex, today);
assert(hard.some(s => s.chapter === 0 && s.kind === 'review' && s.date === E.addDays(today, 1) && !s.done), 'hard adds tomorrow');
const beforeEasy = ss.filter(s => s.chapter === 0 && s.kind === 'review').length;
let easy = E.rate(ss, learnA.id, 3, ex, today);
assert.equal(easy.filter(s => s.chapter === 0 && s.kind === 'review').length, beforeEasy - 1, 'easy drops one');
// 5. Readiness grows
const r0 = E.readiness(ex, ss), r1 = E.readiness(ex, easy);
console.log('readiness', r0, '->', r1);
assert(r0 === 0 && r1 > 0);
let all = ss; for (const s of ss) all = E.rate(all, s.id, 3, ex, today); console.log('all done, easy:', E.readiness(ex, all.map(s => ({ ...s, done: true, confidence: 3 }))));
// 6. Roll forward: missed yesterday moves to today; past exam dropped
const moved = E.rollForward([{ ...ss[0], date: E.addDays(today, -2) }], [ex], today);
assert.equal(moved[0].date, today);
assert.equal(E.rollForward(ss, [{ ...ex, date: today }], today).length, 0);
console.log('all engine checks passed');
