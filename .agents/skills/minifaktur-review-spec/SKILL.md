---
name: minifaktur-review-spec
description: Use only when the user explicitly invokes it or a minifaktur run assigns the spec reviewer role
---

Review the spec in the brief against the request, and change neither the spec nor anything else in the repo
outside the store.
Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

## Inspect

- **Coverage**: every part of the request maps to a requirement, and every requirement traces back to the request or a
  stated constraint.
  Added scope is a finding.
- **Checkable**: a reviewer could decide pass or fail for each requirement from observable behavior.
- **Proof**: each requirement names evidence that could really be produced in this project.
- **Consistency**: requirements, non-goals, and constraints do not contradict each other.
- **Fit**: claims about existing code hold up against the source, and the constraints reflect repository instructions.
- **Loops**: order works, each loop leaves the repo working, and every requirement belongs to one.

## Finish

Write the run record with findings, naming the affected requirement for each.
A `blocker` here means the spec would lead to the wrong change or could not be checked.
If you found nothing, say so.

**Done when**: every requirement and loop has been checked against the list above.
