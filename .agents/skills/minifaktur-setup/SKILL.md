---
name: minifaktur-setup
description: Use only when the user explicitly asks to view or change minifaktur rules, or an invoked run has no rules
---

Settle the user's rules for minifaktur and save them as a `## minifaktur` section in an agent instruction file.

## Steps

1. Read the existing sections in the repo's and the global instruction files, and look up what the environment answers,
   e.g. the validation command from the repo's task runner or CI.
2. Ask everything in one batch, showing current values when updating and limiting the batch to what the request covers:
   - **Scope**: global, or this repo.
   - **Commits**: per loop, final only, or never.
   - **Push**: feature branches only, or never.
   - **Pull requests**: create and update as draft, update existing only, or never.
   - **Store**: see below.
   - **Validation**: confirm the discovered command, or ask for it.
3. Write the section to the chosen file, using the file the harness loads, e.g. `AGENTS.md` or `CLAUDE.md`.
   Create or replace only that section, and keep every other line as it was.
4. Show the resulting section, and name which values the other scope overrides.
   Leave committing a changed repo file to the user.
5. Write a run record per `minifaktur-contract`, using `setup` as the slug.

**Done when**: the chosen file holds a section with a value for every key asked, and the record exists.

## Section format

```markdown
## minifaktur
- commits: per loop
- push: feature branches only
- pull requests: create and update as draft
- store: markdown files in `.plans/<slug>/`, git-ignored
- validation: `task world`
```

Users may add lines setup does not ask for, and setup keeps them:

- **Guidance**: `review-ux: follow docs/design.md`.
- **Role swaps**: `spec skill: acme-spec`, `extra reviewers: acme-review-db`.
- **Workflow**: `max review rounds: 3`, `spec review: always`.

## Store

The store holds all of a run's artifacts, including spec and proof, during and after the run.
Present these options, offer no default, and mention the choice can change as the user learns what they prefer.
The rule's value says how to use the location, so name the format, path, or project, and any access details.

| Location | Trade-off |
| --- | --- |
| Repo files, git-ignored | Visible and private, but deleted with a worktree, which defeats resume |
| Repo files, committed | Travels with the branch, but adds records and journal to the diff |
| Global dir | Survives worktrees and enables cross-repo work, but is less visible |
| PR description and comments | Next to the review, but needs a PR, from before the run or the spec commit, and an upload path for screenshots |
| GitHub Issues | Outlives the PR and can be planned ahead, but needs an upload path for screenshots |
| Jira | Fits teams already tracking there, but needs credentials and a Jira integration |
| Custom, e.g. local SQLite | Fits your own tooling, but you describe how to read and write it |

Check that a chosen location is reachable with the tools at hand, and note what it cannot hold, e.g. screenshots.
If a location has no place for artifacts when a run starts, ask whether the spec commit opens it, and which commit,
push, and PR that allows beyond the other answers.
Write the answers into the rule's value, e.g. `the spec commit is pushed and opens the run's draft PR`.
