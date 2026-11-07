---
name: minifaktur-spec
description: Use only when the user explicitly invokes it or a minifaktur run assigns the spec writer role
---

Convert the request into the `spec` artifact, the single source of truth for implementing and reviewing.
Your only repo changes are your own artifacts, `spec` and your run record, where the store rule keeps them in the repo.
Load `minifaktur-contract` for run artifacts.

## Steps

1. Read repository instructions, the brief, and enough of the relevant code to name real seams and constraints.
2. Write the spec, keeping to what the request asks for; further ideas go in the record as suggestions.
3. When the brief carries spec review findings, resolve each in the spec, or dispute it in the record with evidence.
4. Write the run record.
   A material decision only the user can make ends as `blocked`, naming the decision and its options.

**Done when**: an implementer and a reviewer could each work from the spec alone, without further questions.

## Format

Any spec writer, including a swapped one, produces these sections:

```markdown
# <title>

## Goal
Why this change exists, and the outcome.

## Non-goals
What stays out, including tempting neighbors.

## Requirements
- R1: <observable behavior>. Proof: <expected evidence>.

## Constraints
Limitations accepted, stated assumptions, and existing behavior to preserve.

## Loops
1. <slice>: R1, R2.
```

- **Requirements** state observable behavior rather than implementation, and each one is checkable.
- **Proof** fits the change, e.g. screenshots, an e2e test, a regression test, or a benchmark against a baseline.
- **Loops** are ordered slices that each leave the repo working, every requirement belongs to one, and small work is one
  loop.
- Decide implementation only where the request or a constraint requires it; the rest belongs to the implementer.
