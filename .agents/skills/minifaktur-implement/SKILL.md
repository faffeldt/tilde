---
name: minifaktur-implement
description: Use only when the user explicitly invokes it or a minifaktur run assigns the implementer role
---

Implement the assigned requirements at the smallest useful scope.
Load `minifaktur-contract` for run artifacts.

## Establish scope

1. Read repository instructions, the brief, the spec, and the relevant code.
   Outside a run, the requirements come from the conversation.
2. Identify the assigned requirements, explicit exclusions, and existing user changes.
3. Find the nearest existing implementation before introducing a new mechanism.
   Required behavior normally receives required dependencies.
   Add compatibility paths, abstractions, or lifecycle APIs only for a current requirement.

## Implement

- Use focused tests at the seam that proves the changed behavior.
  For a bug, show the original failure when practical, then verify the fix.
  Reuse existing lint, typecheck, and test commands rather than duplicating their checks.
- Add the repo evidence the spec names as proof, e.g. tests or benchmarks.
- Files the brief names as prior work come from an interrupted run of this role, so continue from them.
- Treat missing local implementation as unknown when another repository or external system may own it.
  Preserve unrelated behavior and user changes.
- Record scope changes and accepted limitations in the run record; the spec stays with its writer.

## Apply findings

Fix each assigned finding, or dispute it in the record with evidence from the source or a check.
Verify the affected behavior again.

## Verify

1. Run the `validation` rule's command, or the repo's established full check when the rule is absent.
   For documentation-only work, relevant documentation checks are enough.
2. Fix regressions the change caused.
   Tell them apart from environment failures, and retry only after a relevant state change.
   Repeated unchanged failures end as `blocked`, with the concrete cause.
   Leave unrelated services and configuration under their existing owner's control.

## Finish

Done means every assigned requirement and finding is handled and the checks above pass.
Write the run record, separating what you verified from what you assume.
Committing and pushing belong to `minifaktur-publish`.
