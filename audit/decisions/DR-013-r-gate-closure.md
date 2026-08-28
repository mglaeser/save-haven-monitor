# DR-013 — R-GATE closure: the gate is deploy-blocking on `main`

**Date:** 2026-08-28 · **Decider:** `mglaeser` (owner) · **Status:** RATIFIED

## Decision

The Part-1 owner-command residual **R-GATE** ("the verify gate is advisory on
deploy — a push to unprotected `main` reaches Pages ungated") is **CLOSED**.
Both closure conditions the audit named are now live, and both were observed
directly against the production repository on 2026-08-28:

1. **Branch ruleset on `main`** (owner-actioned, ruleset updated 2026-08-18),
   observed via `GET /repos/mglaeser/save-haven-monitor/rules/branches/main`:
   rules `pull_request`, `required_status_checks` (required contexts: **`gate`**
   and **`acceptance`**), `non_fast_forward`, `deletion`. Direct pushes and
   force-pushes to `main` are refused; a PR cannot merge with either required
   check red. (The 2026-07-16 force-push that kept R-GATE open predates the
   2026-08-18 ruleset update.)
2. **Pages deploys from Actions, not from the branch** (DR-006), observed via
   `GET /repos/mglaeser/save-haven-monitor/pages`: `build_type: "workflow"`.
   The deploy job runs only after the verification suite, mutation oracle and
   policy gate pass — the structural fix B-01 described as "available, not
   taken" is taken.

## Authorization

Closing an owner-command residual is an owner attestation. Authorization is the
owner's Q18 ruling in the shallow-frontend program's one-shot Q&A
(2026-08-27/28, recorded verbatim in the program's ruling record): "Gov PR
first" — the stale R-GATE/engagement-status record is to be corrected before
the frontend program proceeds. TLS enforcement was ruled handled by the
fronting proxy (no Pages-level HTTPS action required).

## Honest scope — what this does NOT close

- **A-01** moves FAIL → PARTIAL, not PASS: the gate and provenance manifest are
  now standing and deploy-blocking, but a *standing, per-change independent
  adversarial verifier* (a model that did not write the change) remains a
  convention, not machinery.
- **B-01** moves FAIL → PARTIAL, not PASS: production is gated at both the
  merge and deploy boundaries, but the mandate's weekly synthetic-failure
  re-proof of blocking behaviour does not exist.
- **B-06** stays PARTIAL (STOP-SHIP count unchanged): secret-scanning controls
  now block via the required checks, but the nightly full-history scan and the
  canary secret remain absent.
- **B-09** stays PARTIAL: unattested artifacts can no longer reach Pages
  directly, but no signing/attestation step exists over the served files.
- Open-band counts in `engagement-status.json` are **unchanged** (FAIL and
  PARTIAL both count as open); `production_eligible` remains `false`.

## Edits carried by this DR

`audit/03-findings.json` (dated history entries + verdict/standing-control
updates for A-01, B-01, B-06, B-09) · `audit/06-residual-risk-register.md`
(R-GATE row closed) · `governance/constitution.md` Article I residual note
(dated closure appended; digest + `.constitution.sha256` +
`engagement-status.constitution_hash` re-bound) ·
`governance/constitution-digest.md` (§1, §8) · `audit/engagement-status.json`
(prose only: `production_eligible_reason`, `part1_status_note`, `computed_at`)
· `audit/09-executive-summary.md` and `audit/04-remediation-plan.md` (living
rows/paragraphs annotated with the dated closure) · `CLAUDE.md` (§status).
