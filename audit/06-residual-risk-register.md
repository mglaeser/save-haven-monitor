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

---

## Track C residual-risk register (MUST-FIX and above, open)

Each carries a compensating control, an executable tripwire, and a named owning role (never 'a human reviews it').

- **C-03** (BLOCKER-1, PARTIAL): comp-control = CI-only deps are gitignored, never shipped to visitors, and the harness is offline-deterministic for the load-bearing regex tests (only 40-sri does egress); a compromised playwrigh; tripwire = a diff to verify/package.json version ranges, or a CI `npm install` pulling a version not previously seen — currently NO executable signal watches this (honest ; owner = platform-security / repo owner mglaeser.
- **C-05** (BLOCKER-1, PARTIAL): comp-control = The architecture (no model, no tools, no PII, React-escaped output) makes 9/10 categories vacuously safe today; the risk is future drift, not present exposure.; tripwire = any future import of an LLM SDK / addition of dangerouslySetInnerHTML / new external egress — 30-static-security catches the sink case, nothing watches the 'a m; owner = ai-security.
- **C-09** (BLOCKER-1, PARTIAL): comp-control = The labelling is currently thorough and conspicuous; the gauge is gated behind ?status-api and clearly framed as research, reducing misclassification risk in practice.; tripwire = no executable signal — removal of the disclaimers would pass silently today (honest gap).; owner = privacy / ai-security.
- **C-02** (BLOCKER-2, PARTIAL): comp-control = code is small (2 served JSX files) and machine-authored; a new egress would appear in git diff, but no automated signal fires; tripwire = the honest gap: a new fetch to a novel https host is added and no test goes red — undetected until manual review, which is not a control; owner = platform-security / repo owner mglaeser.
- **C-06** (BLOCKER-2, PARTIAL): comp-control = git history is public append-only provenance; single-vendor (Anthropic) reduces heterogeneous-agent inter-comms risk but concentrates R-VENDOR; tripwire = a push to main that bypasses the (off-main) gate deploys instantly — no executable signal fires; the gate must be on main and required for this to close; owner = ai-security / repo owner mglaeser.
- **C-26** (BLOCKER-2, PARTIAL): comp-control = SRI gives strong load-time integrity for all 5 served deps; the component surface is tiny and fully pinned; tripwire = R-GATE / R-LEDGER: a dependency or served-file change reaches main with no deploy-time provenance verification; only the browser SRI (post-deploy, client-side) ; owner = platform-security / repo owner mglaeser.
- **C-16** (MUST-FIX, PARTIAL): comp-control = no-secrets scan + public hash-chained git history; nothing to steal (no creds exist) and read-only public target; tripwire = introduction of any credential/token into source (30-static-security goes red) or a second automated identity that shares the push key; owner = repo owner mglaeser.
- **C-24** (MUST-FIX, PARTIAL): comp-control = deterministic gate + no-secrets scan; no model context exists that could memorise or leak anything; tripwire = introduction of a runtime model/system prompt (extraction tests then become required) or a secret entering source (30-static-security goes red); owner = ai-security / repo owner mglaeser.
- **C-34** (MUST-FIX, NOT-APPLICABLE): comp-control = public repo (no confidential authoring input) + no runtime provider data path; tripwire = the day the product calls any model provider API with ANY data — a no-train contract term, account setting, and scheduled API assertion then become required; owner = ai-security / repo owner mglaeser.

**R-LEDGER (C-37)**: no signed per-commit model/prompt provenance and no scheduled spot-reconstruction; git history + `provenance-manifest.json` + `61-provenance` (every build) are the attested substitute. Owner: engineering-leadership.
