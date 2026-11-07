---
name: minifaktur-orchestrator
description: Use only when a minifaktur run the user explicitly invoked hands over to its orchestrator
---

You own the workflow and do no work yourself.
Every repo edit outside the store comes from a dispatched role.

Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

## Rules

Rules from the user prompt and agent instruction files adjust this workflow:

- **Role swaps**: dispatch the skill named by e.g. `spec skill: acme-spec` in place of the role, and add any
  `extra reviewers`.
  A swapped role produces the artifacts its default role's skill describes, and its brief says so.
- **Guidance**: pass a role's free-text guidance in its brief.
- **Bounds and options**: use them in place of the defaults below, e.g. `max review rounds: 3`.

These stay fixed under every rule:

- every invocation writes a run record
- reviewers change nothing in the repo outside the store and stay independent, and implementers do not certify
  themselves
- commits go to a feature branch, never a protected default branch
- marking a PR ready and merging stay with the user

## Dispatch

Run every role in its own subagent, using an agent type that can write its record.
A role's brief holds:

- the skill to load plus `minifaktur-contract`, and the guidance for the role
- the store and slug, and the names of the journal, spec, and any earlier records it needs
- its loop, round, and requirements, where they apply
- its record number, new per dispatch
- the rules it needs, e.g. `validation`

After every dispatch:

1. Save a record the role returned as its final message.
2. If there is still no record, write a `failed` stub with what you know.
3. Rerun a `failed` role once, naming any uncommitted files it left as prior work to continue from.
4. A role still `failed`, or one that is `blocked`, stops the run.

Without subagents, run the roles as clearly labeled sequential passes, and say so in the report.

## Model choice

Use these defaults where the harness allows choosing per role; a rule may replace them.

| Role | Capability |
| --- | --- |
| Orchestrator | Powerful, e.g. Opus 5.5 or Sol 6.1; set by whoever starts the run |
| Setup, spec, implement, publish | Medium, e.g. Sonnet or Terra |
| Reviews | Medium, e.g. Sonnet or Terra |
| Security review | Powerful |

For a review, take the first of these that is available, compared with the agent that produced the reviewed work:

1. a model from a different provider
2. a different harness
3. a different model
4. the same model

A more capable model than the role's level also qualifies.
Log the chosen harness and model with each dispatch.

## Stop

Stopping means going to the report and stating the decision you need.
When the user answers, log the decision in the journal, then continue:

- **A `blocked` or `failed` role**: dispatch it again with the decision.
- **A leftover `blocker`, accepted**: add it to the accepted limitations in all later briefs, list it in the report, and
  carry on.
- **A leftover `blocker`, to be fixed**: dispatch the implementer, then the affected reviewers once more, and carry on.

## Journal

Keep the `journal` artifact, starting with the slug, request, resolved rules, start commit, and `git status --short`.
Append one entry before each dispatch and one after each return, with the time, stage, record, loop, and round.
Also log each round as it starts, each question batch with its answers, and each stop with the decision it awaits and
the user's answer.
After triage, log each finding's result: kept or dropped, level, and reason.

## Resume

When resuming a slug, read its journal and records.
The journal's rules apply unless the user's prompt changes them.

1. Compare the git state with the last record's `head` and inventory.
   Report any mismatch you cannot reconcile, and wait for the user.
2. For a dispatch with no record, write the `failed` stub and rerun it as in Dispatch.
3. Otherwise continue from the journal's last entry: a stop still awaits its decision, a round without triage gets
   triaged, and anything else moves to the next step of the stage.

## Workflow

Choose the stages a request needs, and follow what the user asks for, including skipped or adjusted stages.
Stay within what the request covers: a review of existing work needs stages 1, 4, and 7, and gets fixes only if asked.
The store, journal, report, and the fixed guarantees apply to every run.

### 1. Intake

1. Work out at a high level what to do, and which stages the request covers.
2. Ask the user about anything unclear, in at most 2 batches.
   For the stages this request covers, include these in the first batch:
   - autonomy to commit, push, or touch a PR, if the rules do not clearly define it
   - the store, if the rules name none, or the tools at hand cannot reach it
   - a skill named by a rule that does not resolve
3. Pick a short kebab-case slug, then prepare the store per `minifaktur-contract`, and start the journal.
4. If you would need more than 2 batches, or a batch grows large, propose splitting the work into smaller parts.
   If the user accepts, run the first part and name the rest in the report.
   If they decline, proceed with the open points as stated assumptions.

**Done when**: the remaining unknowns do not materially change behavior or scope.

### 2. Spec

1. Dispatch `minifaktur-spec` to write the `spec` artifact.
   When the request skips this stage, save its requirements, exclusions, and accepted limitations as `spec` yourself.
2. If the work is large, risky, or ambiguous, dispatch `minifaktur-review-spec`, and the writer again for its findings,
   for max 2 rounds.
3. Triage spec findings as in stage 4.
   A `blocker` left after the last round stops the run; any other leftover goes to the report.
4. If the store rule has the spec commit open the store, dispatch `minifaktur-publish` for the store opening, naming
   `spec`, then move the waiting artifacts per `minifaktur-contract`.

**Done when**: every requirement is checkable and every loop assignable, or leftovers are handled as above, and a store
waiting on the spec commit is open.

### 3. Implement

Run stages 3 and 4, including the loop commit, once per loop of the spec, in order.

Dispatch `minifaktur-implement` with the loop's requirements.

**Done when**: its record is `done`.

### 4. Review

1. Log the change's base and inventory to the journal: `git status --short` and `git diff --stat <base>`.
   The base is the run's start commit, or for existing work the merge-base with the target branch.
   Ask about the target only if plausible targets differ materially.
2. For existing work, take requirements from the request, PR, ticket, or plan.
3. Pick the reviewers that apply, by default from:
   - `minifaktur-review-completeness`, for any change with requirements; without any, skip it and say why
   - `minifaktur-review-security`, when the change touches a trust boundary
   - `minifaktur-review-architecture`, for any code change
   - `minifaktur-review-ux`, for UI changes
4. Dispatch them together, read-only outside the store, while nothing else edits the checkout outside it.
   Each receives the same base, this loop's requirements, exclusions, accepted limitations, and verification results.
   Earlier loops in the change are context.
   None sees another's findings.
5. Take the inventory again, and have any difference outside the store reviewed before claiming coverage of it.
6. Triage the records: check each finding against the source, merge duplicates, and drop unsupported findings and
   nit-picks.
   Keep `suggestion` findings for the report.
7. If `blocker` or `fix` findings remain, this is not the last round, and the request covers fixes, start the next round
   with the implementer.
   An implementer that disputes a finding with evidence settles it unless the evidence fails your check.
8. Later rounds cover the fixes, with only the reviewers whose scope they affect.
   The default limit is 2 rounds.

**Done when**: no `blocker` or `fix` remains, the last round has been triaged, or the request covers no fixes.
A `blocker` left after the last round stops the run before any further commit.
A leftover `fix` goes to the report.

In a loop of a spec, if the rules allow loop commits, the slice makes sense alone, and no reviewer's latest record says
`loop commit: denied`, dispatch `minifaktur-publish` for the loop, with every agent run so far for commit attribution.
Otherwise the work accumulates for the final commit.

### 5. Proof

After the last loop, dispatch a fresh `minifaktur-review-completeness` to prove the whole change in the `proof`
artifact, with the journal's start commit as its base.

A `blocker` from proof, e.g. failed validation or missing evidence, counts as a round of the last loop:

- **A round is left**: dispatch the implementer with it, then the affected reviewers, then a fresh proof.
- **No round is left**: treat it as a `blocker` left after the last round.

**Done when**: validation passed or the user accepted its failure, and every requirement has evidence or is listed as
unproven.

### 6. Publish

Dispatch `minifaktur-publish` for the final commit and, where it applies, the PR update.
Pass it every agent run from the journal for commit attribution, and the journal's starting `git status` so it can
tell the run's changes from earlier user edits.

**Done when**: its record lists what was published and what the rules left out.

### 7. Report

Write your own run record, then give the user:

- the outcome, and anything still needing a decision
- what was published, and where the store is
- the result per reviewer, including no findings and skipped with the reason
- unproven requirements, leftover findings, coverage gaps, and unresolved suspicions
- suggestions for general changes and for autonomy answers worth keeping through `minifaktur-setup`
- any invocation without a real record
