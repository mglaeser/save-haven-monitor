# DR-002 — A CI verification gate (GitHub Actions) is added and required

**Date:** 2026-07-16 · **State:** ACCEPTED · **Author:** audit engagement (agent) · **Decider:** repo owner (mandate authorization)

## Context
CLAUDE.md said "no GitHub Actions." That blanket ban predates the no-human-reviewer operating
model the mandate governs. Under that model a deterministic CI gate is not optional decoration —
it is the substitution (S1) for the reviewer who does not exist. The mandate's Article I requires
every merge/deploy to be decided by a version-controlled, fail-closed, self-tested policy bundle.

## Decision
Add `.github/workflows/verify.yml`: on every push and PR it installs `verify/` deps, runs the
suite (`node run.js`) and the policy gate (`node gate.js`), and fails the check on any failure.
CLAUDE.md's "no GitHub Actions" is amended to "no GitHub Actions that build or transform the
**deployed** artifacts" — the site still deploys by plain Pages-from-branch; this workflow only
**verifies**, it does not build or deploy.

## Residual risk (honest, with owner) — R-GATE
A GitHub Actions check reports status but does **not block a merge or the Pages deploy** unless the
repository's **branch protection** requires it — a repo *setting* only the owner can toggle, out of
an agent's reach. **Until branch protection requires the `verify` check on `main`, the gate is
advisory, not blocking.**
- **Compensating control:** the gate also runs as a pre-push expectation documented in CLAUDE.md,
  and the workflow is required-by-convention; every agent session runs `verify/` before pushing.
- **Executable tripwire:** `verify/tests/60-governance.test.js` asserts the workflow file exists and
  wires both `run.js` and `gate.js`; if the workflow is deleted or decoupled, CI (where it still
  runs on the PR branch) goes red.
- **Owning role:** repo owner (`mglaeser`) — enable branch protection on `main` requiring `verify`.
- **What flips it to a real control:** owner enables "Require status checks to pass → verify" +
  "Do not allow bypassing" on `main`. Recorded as the one human-set precondition (command authority,
  not in-the-loop review).
