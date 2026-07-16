# 06 — Residual-risk register (Phase 5)

Every MUST-FIX-or-above that this engagement did not close carries a **compensating control, an
executable tripwire, and an owning role**. A risk with no compensating control and no tripwire is not
accepted — it is ignored. These are the risks Part 1 leaves standing; several require the owner's
*command authority* (a repo setting), never in-the-loop review.

| ID | Risk | Findings | Compensating control | Executable tripwire | Owner |
|---|---|---|---|---|---|
| **R-GATE** | The verify gate is advisory on deploy — a push to unprotected `main` reaches Pages ungated. | A-01, B-01, B-06, B-09 | CI runs the full gate on every push/PR; run-verify-before-push in CLAUDE.md; the gate self-tests and fail-closes. | `verify/tests/60-governance` (gate stays wired) + the gate itself red on any violation on the PR branch. | `mglaeser`: enable branch protection on `main` → "Require status checks → verify" + "disallow bypass". |
| **R-VENDOR** | Verifier fleet is one vendor (Anthropic); Article IV wants ≥2 vendors. UNSETTLED. | A-39, A-03 | Adversarial verification runs as a separate agent instance with a falsifying objective (overturned 14/27 risky verdicts this engagement); the deterministic gate — which no model can argue with — is the real arbiter. | Any finding closed on a model opinion without a deterministic test is a governance finding. | `mglaeser`: add a second vendor to the fleet when available. |
| **R-SEP** | Code-writing identity can write the policy bundle it is gated by (no write-separation). | B-35, A-35 | Gate self-test + `60-governance` detect tampering; git history is public + append-only. | `verify/tests/50` (gate blocks self-serving mutations) + `60-governance`. | `mglaeser`: CODEOWNERS on `verify/` + branch protection, or move the bundle to a separate repo/identity. |
| **R-CRON** | No scheduler → the calibration heartbeat and drills run only on push, not continuously. | A-36, A-24, B-26 | Corpus + gate self-test run every CI invocation; catch rate is checked each run. | A drop below the 6/6 calibration baseline fails the CI job. | `mglaeser`: add a scheduled workflow (weekly) — buildable, non-blocking to install. |
| **R-OBSV** | No runtime observability/SLOs/rollback drills — GitHub Pages hosts no server to observe. | A-24, B-03, B-24, B-18 | Static site, no runtime state; the browser error-capture fallback + SRI + graceful degradation are the runtime safety net; git revert is one-command rollback (B-11). | Load-failure handler (index.html) surfaces a visible message; SRI blocks tampered scripts. | `mglaeser` (accept as architectural: a static site cannot host runtime observability). |
| **R-LEDGER** | No signed Runner-only evidence ledger; git history substitutes. | C-37 (Track C), B-07 | git append-only public history + `audit/` artifacts; every verdict carries produced evidence. | `60-governance` asserts audit artifacts persist. | `mglaeser` (full provenance signing is Track C / Part 2). |

**None of these is a shrug.** Each is a named risk with a watching tripwire and a person in command of
the one action that closes it. The umbrella fact — production is not cleared — is computed and
enforced (`production_eligible: false`), not merely written here.
