---
name: felix-awesome-commit-message
description: Use when writing a commit message, including as part of committing
---

Write a commit message for the staged changes and return it.

Inspect the staged diff and read the command output before writing.
When the diff is unavailable or nothing is staged, report that instead of a message.

The message:
- covers ALL staged changes
- is concise
- leads with the WHY while still naming the WHAT

Use a ticket ID the user provided.
Otherwise use one only when a single unambiguous ID is in the current context, e.g. the branch name or task.
Without one, omit the prefix; ask only when the user requires a ticket ID.

## Format

```
[<ticket-id>] <imperative summary>

<optional body explaining non-obvious rationale>

<attribution trailers>
```

- `<>`: placeholders; `[]`: literal brackets.
- Subject ends without a period.
- Add a body only for context or rationale the subject cannot carry.

## Attribution

End the message with one trailer block, humans first:

```
Co-authored-by: Jane Doe <jane@example.com>
Co-authored-by: Claude Opus 5.5 <noreply@anthropic.com>
Co-authored-by: GPT-5.5 <noreply@openai.com>
Agent: Claude Code 2.1.4 | claude-opus-5-5 | implementation | 1.2M tokens
Agent: Codex 0.51.0 | gpt-5.5 | security review | 310k tokens
```

- **Humans**: add a `Co-authored-by` for each person the user names as a pairing partner or as credited for
  preliminary work.
  Take the email from the user, else from a single unambiguous match in `git log --format='%an <%ae>'`;
  ask when neither yields one.
- **Agents**: every agent whose work shaped the staged changes counts: you, subagents, delegates,
  and reviewers whose findings were applied.
  Add one `Co-authored-by` per distinct model.
  Use the attribution line the harness provides when there is one, else the model's name with its vendor's noreply
  address; one line per identity, including the harness's own.
- **`Agent` trailers**: one per agent run, as `<harness> <version> | <model ID> | <role> | <tokens>`.
  Read the harness version from its CLI, e.g. `claude --version`.
  Take tokens from a figure the harness or the delegate's result reported for that run, rounded;
  without one, end the line after the role.
