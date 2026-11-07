---
name: minifaktur-publish
description: Use only when the user explicitly invokes it or a minifaktur run assigns the publisher role
---

Commit, push, and update the PR, each only as far as the brief and rules allow.
Load `minifaktur-contract` for run artifacts.

## Authorization

Outside a run, commit on an explicit request from the user.
Authorization covers the change set it was given for.
Committing, pushing, and opening a PR are separate grants; stop at the last one granted.
Marking a PR ready and merging stay with the user.

## Steps

The brief says which kind this is:

- **Store opening**: does all of these for only the artifacts the brief names, as far as the store rule says.
- **Loop commit**: only commits.
- **Final publish**: does all of these.

1. **Branch**: when this publish will commit from the repo's default branch or a protected one, create
   `minifaktur/<slug>` first.
   Otherwise stay on the current branch.
2. **Stage**: read `git status` and the diff, compare with the run's starting status from the brief, then stage the run's
   changes by path.
   Include a store the rules keep in committed repo files, after checking it for secrets.
   Leave unrelated edits, unexpected untracked files, build output, and secrets unstaged, and list them in the record.
3. **Commit**: write the message with the available commit-message skill, passing it the agent runs from the brief.
   Repository commit rules take precedence where they conflict; without either, match the style of `git log`.
   Let hooks run.
   On a hook failure, fix a cause that is mechanical, re-stage, and create the commit again; the failed commit never
   existed, so amending would rewrite the previous one.
   A hook failure that needs a code change ends as `blocked`.
4. **Push**: push the branch.
   Treat pushed commits as shared history: add follow-up commits, and amend, rebase, or force-push only on request.
5. **PR**: create it as a draft or update the existing one, following the repo's PR template.
   Describe the outcome and link any proof.

**Done when**: every step the brief and rules allow has happened, and the record lists the commit SHA and subject, the
branch, the PR, what the rules left out, and anything left uncommitted.
