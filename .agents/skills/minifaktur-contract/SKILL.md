---
name: minifaktur-contract
description: Use only when a user-invoked minifaktur run or role reads or saves run artifacts, including its run record
---

How minifaktur artifacts are kept, whatever the tracking backend.
Each role's skill defines what its own artifacts hold.

## Store

The store holds a run's artifacts under the run's slug.
The `store` rule says what it is and how to use it, e.g. markdown files in a dir, an issue with a comment per artifact,
or a local SQLite table.
The form follows the backend, and every field and section below keeps its meaning in any form.

- Refer to artifacts by name, e.g. `spec`, `journal`, or `record 03-implement`, rather than by location.
- Pass names in briefs and records rather than contents.
- Keep a store inside the repo out of git by adding it to `$(git rev-parse --git-common-dir)/info/exclude`, unless it is
  already ignored or the rule says it is committed.
- When the rule has the spec commit open the store, e.g. by opening a PR, create `~/.local/state/minifaktur/<slug>/` at
  the start of the run.
  Artifacts with no place yet wait there, and move to the store once it opens.
- Keep evidence the store cannot hold, e.g. a video, in a local dir outside the checkout, and name its path in the
  artifact.
- Redact secrets and personal data, since artifacts may be published.
- A role that cannot reach the store returns its artifacts as its final message, for the orchestrator to save.

A brief names the store and slug.
Outside a run, take the store from the rules, ask the user if there is none, and pick a short kebab-case slug for the task.

## Run record

Every invocation ends by saving its run record, `record <NN>-<role>`, whatever the outcome.
`NN` comes from the brief; outside a run, use the next free number.

Fields:

| Field | Value |
| --- | --- |
| `role` | The role's short name, e.g. `implement` |
| `status` | `done` when the role's completion criterion holds, `blocked` when it needs a decision or input it cannot get, `failed` when something broke |
| `started`, `ended` | ISO 8601 timestamps |
| `loop`, `round` | Omitted when they do not apply |
| `inputs` | Names of the artifacts it worked from |
| `base`, `head` | The commits at the start and end of the invocation |
| `harness` | Name and version |
| `model` | Model ID |
| `session` | Harness session ID |
| `tokens` | The figure the harness reported |

Write `unknown` for a field the harness does not reveal.

Body: what was done, decisions taken, commands and their results, problems met, and what should happen next.
A role that edited the checkout adds an inventory: a short summary of what changed, plus `git status --short` output.
