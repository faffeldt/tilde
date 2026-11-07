---
name: minifaktur-findings
description: Use only when a user-invoked minifaktur reviewer reports findings, or its orchestrator triages them
---

List findings in the run record's body, each with its level, file and line, consequence, and correction direction.

| Level | Meaning |
| --- | --- |
| `blocker` | Violates a requirement, or causes a concrete defect or security issue |
| `fix` | Worth correcting within the change's scope |
| `suggestion` | General change or refactoring beyond this change |

Report what changes correctness, comprehension, or future cost; nit-picks stay out.
A reviewer that finds a slice cannot stand alone as a commit, e.g. it leaves the repo broken, adds `loop commit: denied`
and the reason.
