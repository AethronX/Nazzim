# The evidence model

Evidence completeness is the one number Nazzim asks a student to trust. This document says exactly how it is
produced, why it is built this way, and what would break it.

> **It is not a prediction.** The number describes how strong the evidence is that the student is prepared.
> It has never been calibrated against a real exam result, so the interface must never phrase it as a chance
> of passing. `scripts/test-copy.js` fails the build on that phrasing.

## The problem it was built to fix

The first implementation scored a chapter from `done / planned` sessions, weighted by a self-reported
confidence rating. Running the real function against a four-chapter exam:

| What the student did | Minutes actually studied | Old score |
| --- | --- | --- |
| Tapped "done" on four sessions, rated them Easy | **0** | **90%** |
| Studied for hours without ticking anything | hours | 0% |

A student could reach 90% readiness in four taps. Worse, the app then told them they were ready. For the
student who most needs an honest signal — the one quietly avoiding a subject — the product was an instrument
for self-deception, and the failure would surface on exam day, where it cannot be recovered.

## The rule

> **A tick is a claim. Evidence completeness is the evidence for it.**

The identifiers `readinessDetail()`, `readiness()` and the `/readiness/[id]` route keep their names for now:
renaming them is a mechanical change across the app and belongs with the Today rebuild, not here.

Three independent pieces of evidence, each harder to fake than the last:

| Evidence | Where it comes from | What it can prove |
| --- | --- | --- |
| **Coverage** | sessions ticked done | that the student says they covered it |
| **Effort** | `focusedMin` written by the focus timer when the session ends | that time was actually spent |
| **Recall** | a self-test the student wrote, answered in writing, then graded | that they can retrieve it |

Recall carries a second input, `q`: how much of the chapter was actually tested. Breadth of testing and
quality of testing are different things, and conflating them is what let four cards stand in for a syllabus.

```
covEff = max(cov, q × r)                      // demonstrated recall counts as coverage, weighted by breadth
study  = covEff × (W + (E − W) × eff)         // 0 … 0.70 — identical to the previous formula when q = 0
m      = 1 + q × (r − R_NEUTRAL) / R_NEUTRAL  // the directional term
gated  = study × clamp(m, PENALTY_MIN, 1)     // ≤ study: recall can only REDUCE the study evidence here
bonus  = q × max(0, r − R_NEUTRAL) / (1 − R_NEUTRAL) × (1 − E)   // only strong recall buys the top band
score  = clamp01(gated + bonus) × decay
```

`clamp(m, …, 1)` is the whole point. The previous formula combined the two paths with `max()`, so recall
could only ever raise the number: executing it showed a chapter worth 64% rising to **69%** when the student
pressed *forgot*. The app rewarded proving you could not remember. Now the multiplier bites below
`R_NEUTRAL` and the reward for strong recall lives in a separate term that failure cannot reach.

`R_NEUTRAL` must equal the *almost* rung of `mastery()`. "Almost" is the grade that settles nothing, so it
has to be the grade that moves nothing; if the two constants drift apart, answering "almost" silently
becomes a penalty. `scripts/test-evidence.js` asserts they are equal.

Measured on the same four-chapter exam as above:

| What the student did | Score |
| --- | --- |
| Tapped done, zero minutes | **32%** |
| Tapped done, spent the full planned minutes in focus | 64% |
| …then pressed *forgot* on every chapter | **16%** |
| …then pressed *almost* | 64% |
| …then proved recall on three cards per chapter | 84% |
| Four cards, eight taps, no study at all | **2%** *(was 66%)* |

`scripts/test-evidence.js` asserts the ordering `forgot ≤ none ≤ almost ≤ knew` across the whole grid of
coverage and effort, rather than the exact numbers, so the constants can be tuned without the guarantees
quietly lapsing. It also asserts that a student with no cards scores exactly what they scored before — the
property the migration rests on.

## Decisions worth knowing

**Recall stands on its own, in proportion to breadth.** A chapter with demonstrated recall earns coverage
(`q × r`) even if no session was ever ticked: a student who revises from a textbook and then demonstrates
they can recall the chapter has evidence for it, and tying the score only to our own timer would reward
opening the app over studying. But `q` is what keeps that honest — one card gives `q = 1/3`, so the
textbook route needs three cards per chapter, not one.

**Self-reported and corroborated evidence are different.** The student types their answer before the reveal.
`src/engine/answer.ts` folds both strings (Arabic diacritics, alef and ya forms, ta-marbuta, digit systems)
and takes a Dice coefficient over the tokens. This is **lexical classification, never semantic grading**: a
correct Arabic answer worded differently will score low, so it never blocks the student, never contradicts
them, and never changes the grade they chose. Its only effect is that a claimed *knew it* with no overlap is
recorded as `self` — scored as *almost*, and worth half weight toward `q`. A grade of *forgot* or *almost* is
always taken at face value: nobody games a self-test downwards.

**Nothing is ever fully mastered.** `mastery()` caps at 0.84. Repeated success on one question is not
certainty about a chapter, and a number that can reach 100% invites being read as a guarantee.

**Confidence no longer feeds the score.** "Easy" is a feeling, and feelings are exactly what retrieval
practice exists to correct. Confidence still shapes the *plan* — Hard adds a review tomorrow, Easy drops one
— which is what it is good for.

**Knowledge decays.** A chapter untouched for a while is discounted toward `DECAY_FLOOR` (0.75) over
`DECAY_DAYS` (60). It never decays to nothing: work done is still work done.

**The mock test must be sat, not ticked.** Its 8-point bonus requires at least half its planned minutes in
the focus timer.

**The bar moves with the formula.** `examReport` does not compare readiness against a constant. It simulates
a model student — every session due so far done, with the planned minutes focused, no extra self-testing —
and scores *them* with the same function. "Behind" means below 70% of that bar. Without this, tightening the
formula would have marked every diligent student as failing, which is the standard way a metric change
destroys trust.

## The number explains itself

`readinessDetail()` returns the parts, and `/readiness/[id]` renders them: the current score, the ceiling
reachable on current evidence, the three tracks, the per-chapter breakdown, and `nextEvidence()` — the single
most useful next action. A student who disagrees with the number can see precisely which input they dispute.

This is deliberate. An auditable number survives disagreement; an opaque one is abandoned the first time it
feels wrong.

## What would break this

- **Writing `focusedMin` from anywhere but a finished focus session.** It is the only input the student
  cannot produce by tapping, and it is credited in `completeSession` at the moment the time is spent.
- **Letting a self-test reveal the answer before something is typed.** Retrieval practice without the
  retrieval is re-reading, and self-grading before committing to an answer is not evidence of anything.
- **Reintroducing a second unlabelled percentage per subject.** Readiness is the headline everywhere —
  Today, Subjects, Progress, the exam screen. Work completed is a different question and always carries its
  own words.
- **Raising readiness as a reward.** It is a measurement. The moment it becomes an incentive it stops being
  either.
