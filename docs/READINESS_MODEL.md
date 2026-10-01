# The readiness model

Readiness is the one number Nazzim asks a student to trust. This document says exactly how it is produced,
why it is built this way, and what would break it.

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

> **A tick is a claim. Readiness is the evidence for it.**

Three independent pieces of evidence, each harder to fake than the last:

| Evidence | Where it comes from | What it can prove |
| --- | --- | --- |
| **Coverage** | sessions ticked done | that the student says they covered it |
| **Effort** | `focusedMin` written by the focus timer when the session ends | that time was actually spent |
| **Recall** | a self-test the student wrote, answered in writing, then graded | that they can retrieve it |

Each chapter's score is `max(coverage × ceiling, recall × 0.9) × decay`, and the ceiling is what caps the
whole thing:

```
ceiling = WEAK_CEILING                                      // 0.35 — ticked, nothing more
        + (EFFORT_CEILING - WEAK_CEILING) × effort          // → 0.70 with the planned minutes focused
        + (1 - EFFORT_CEILING) × recall                     // → 1.00 only with proven recall
```

Measured on the same four-chapter exam as above:

| What the student did | New score |
| --- | --- |
| Tapped done, zero minutes | **32%** |
| Tapped done, focused the full planned minutes | 64% |
| …and proved recall on every chapter | 92% |
| …and only half-recalled them | 78% |

`scripts/test-recall.js` asserts these relationships rather than the exact numbers, so the constants can be
tuned without the guarantees quietly lapsing.

## Decisions worth knowing

**Recall stands on its own.** A chapter with proven recall scores at least `recall × 0.9` even if no session
was ever ticked. A student who revises from a textbook and then demonstrates they can recall the chapter *is*
ready for it. Tying the score only to our own timer would have rewarded opening the app over studying.

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
