---
name: minifaktur-review-ux
description: Use only when the user explicitly invokes it or a minifaktur run assigns the UX reviewer role
---

Review the supplied user-facing change as its users would meet it, and change nothing in the repo outside the store.
Read the project's design system, style guide, and neighboring screens first; they take precedence over generic taste.
Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

## Inspect

Run the changed surface when the project allows it, and keep any screenshots or videos with your record, as
`minifaktur-contract` describes.

- **Accessibility**: keyboard use and focus order, labels and semantics for assistive technology, contrast, and text
  scaling.
- **Coherence**: components, spacing, typography, color, and wording match the rest of the project, including dark mode or
  other themes it supports.
- **Clarity**: the user can tell what happened and what to do next, with plain labels and useful error messages.
- **States**: loading, empty, error, disabled, and long-content states exist and hold up.
- **Layout**: the supported viewport sizes work without clipped or overlapping content.

**Done when**: every changed surface has been checked against the list above, by running it or by reading its code, and
the record says which.

## Finish

Write the run record.
Each finding names the affected users or task, and points at the existing project pattern to follow where there is one.
Personal taste with no effect on users stays out, and broader redesign ideas are a `suggestion`.
If you found nothing, say so and name material coverage gaps.
