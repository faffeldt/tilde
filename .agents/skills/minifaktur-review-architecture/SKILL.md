---
name: minifaktur-review-architecture
description: Use only when the user explicitly invokes it or a minifaktur run assigns the architecture reviewer role
---

Review the supplied change for architectural fit, minimality, and clean code, and change nothing in the repo outside the
store.
Read relevant repository standards and ADRs, then compare neighboring implementations and affected callers.
Repository conventions take precedence over generic design preferences.
Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

## Inspect

- For each new abstraction, compatibility path, optional dependency, or lifecycle callback, identify the current
  requirement or caller that needs it and compare the nearest existing mechanism.
  Prefer a simpler design when it satisfies the same requirements with fewer concepts or states.
- Check that this is the minimal change achieving the requirements, naming anything that could go.
- Keep domain decisions owned by the domain.
  Metrics, logging, transport, and presentation should consume outcomes rather than define business meaning.
- Check whether the change duplicates an existing concept or spreads one decision across unrelated modules.
  Suggest consolidation only when the shared responsibility is real; similar syntax alone is insufficient.
- Examine interfaces, types, and failure handling for unclear ownership or invalid states callers can construct.
  Required behavior normally receives required dependencies.
- Check comments and documentation for the decisions they explain, and for claims that exceed the implementation.
  Preserve distinct conceptual, process, and infrastructure views when they serve different readers.
- Leave style that tooling enforces to the tooling.
  Focus on judgment calls that change comprehension, correctness, or the cost of future changes.

**Done when**: every new concept in the change has been justified or turned into a finding.

## Finish

Write the run record.
Each finding names the concrete maintenance or correctness consequence and a smaller or better-fitting direction, and
says whether it violates a documented standard or is a design judgment.
Refactorings beyond the change's responsibility are a `suggestion`, and speculative future requirements stay out.
If you found nothing, say so and name material coverage gaps.
