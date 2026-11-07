---
name: minifaktur-review-security
description: Use only when the user explicitly invokes it or a minifaktur run assigns the security reviewer role
---

Review the supplied change and its affected execution paths for concrete regressions in confidentiality, integrity, and
availability, and change nothing in the repo outside the store.
This is a scoped change review rather than a repository-wide audit.
Load `minifaktur-contract` for run artifacts and `minifaktur-findings` for findings.

## Inspect

1. Read relevant repository security policy and identify the assets, actors, and trust boundaries touched.
2. Trace plausible attacker-controlled inputs through the changed code and relevant callers to sensitive effects.
   Inspect authentication, authorization, tenant isolation, redirects, parsing, secrets, and logging where affected.
3. Check failure, cancellation, retry, and concurrency paths when they can weaken those boundaries.
   Verify security-relevant defaults and deployment configuration rather than assuming they match local tests.
4. Look for sensitive data introduced into outputs, logs, URLs, artifacts, or error messages.
   Keep evidence redacted.
5. For each candidate, establish the triggering conditions, reachable path, existing mitigations, and impact.
   Use safe local checks when they materially resolve uncertainty.
   Access to production, active exploitation, and external writes require their own authorization.

**Done when**: every affected boundary has a traced result, as a finding, a stated mitigation, or a coverage gap.

## Finish

Write the run record.
Each finding adds its attack preconditions and reachable path, and suggests the smallest correction that restores the
affected property.
Keep unresolved suspicions separate, stating what evidence would resolve them.
Hardening wishes and old-but-not-vulnerable dependencies are at most a `suggestion`.
If you found nothing, say so and name material coverage gaps.
