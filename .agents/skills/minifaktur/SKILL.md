---
name: minifaktur
description: Use only when the user explicitly invokes minifaktur, to run or resume it, change rules, or run all reviews
---

## Resolve rules

Read the `## minifaktur` section of the repo's and the global agent instruction files, e.g. `AGENTS.md` or `CLAUDE.md`.
Precedence per rule: user prompt, then repo, then global.

## Route

Take the first branch that matches:

1. **The request is about the rules**: load `minifaktur-setup`.
   The run ends when setup finishes.
2. **No section exists anywhere**: load `minifaktur-setup`, resolve the rules again, then continue with this list.
3. **The request resumes a run**: load `minifaktur-orchestrator` and resume the named slug.
4. **Anything else**: load `minifaktur-orchestrator` and hand it the request and the resolved rules.

Stay the same agent through the hand-over; this agent becomes the orchestrator.
