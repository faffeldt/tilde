---
name: minifaktur-review-completeness
description: Use only when the user explicitly invokes it or a minifaktur run assigns the completeness role
---

Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

Change nothing in the repo outside the store: your output goes to the store, and throwaway checkouts live outside the
repo.
The brief says whether you review, prove, or both.
If the requirements are insufficient, name the specific gap rather than inventing acceptance criteria.

## Review

- Trace each requirement to the implementation.
  Look for missing, partial, incorrect, or unreachable behavior.
- Check relevant callers, configuration, registration, and packaging boundaries.
  A helper that works in isolation may still be unwired in the actual application.
- Compare changed behavior with the original behavior.
  Identify unrequested changes to query semantics, defaults, errors, output, or documented guarantees.
- Respect explicit exclusions and accepted limitations.
  Distinguish necessary completion work from a separate improvement.
- Check that the tests and checks prove the actual requirement or symptom, and name rollout prerequisites local tests
  cannot establish.
- For documentation, preserve the intended abstraction level and distinguish current behavior from proposals.
  Components absent from this repository may be owned elsewhere.

**Done when**: every requirement is traced, and each gap is a finding or a named question.

## Prove

Write the `proof` artifact, showing the whole change meets the spec through evidence you produced yourself.
Implementer claims are leads to check rather than evidence.

Use the proof the spec names for each requirement, or else what best fits the change:

| Change | Typical proof |
| --- | --- |
| UI | Before + after screenshots or video, e2e tests |
| API or behavior | New tests exercising the behavior |
| Bug fix | Regression test that fails on the base and passes now |
| Performance | Benchmark compared with a baseline |
| Documentation or config | Rendered output, a dry run, or the resulting state |

- Run things yourself, and keep evidence such as screenshots with `proof`, as `minifaktur-contract` describes.
- Get before and baseline evidence from a temporary checkout of the base commit.
- Evidence that belongs in the repo, e.g. a missing test, is a `blocker` for the implementer.
- A requirement that cannot be shown here, e.g. it needs production, is listed as unproven with what would prove it.

`proof` holds:

- the full repo validation command and its result
- a table mapping each requirement to its evidence, and how to reproduce it
- a summary of how the change was implemented, with noteworthy details
- issues and difficulties met, from the run's records, that should be fixed in future

**Done when**: full validation ran, and every requirement has evidence, a finding, or is listed as unproven.
Failed validation is a `blocker` finding; your record's status stays `done`.

## Finish

Write the run record, separating executed checks, code evidence, and assumptions.
If you found nothing, say so and name material coverage gaps.
