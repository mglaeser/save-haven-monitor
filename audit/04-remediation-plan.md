# 04 — Remediation plan & structural ledger (Phase 4)

## The single root cause
Across the 64 open findings, the dominant root is **one missing structural property: nothing is
deploy-blocking, because `main` has no branch protection and Pages deploys on push.** Most BLOCKER-1/2
items (A-01, B-01, B-06, B-35, …) are instances of it. The second cluster is **capabilities a static,
single-vendor, push-deployed site cannot have** (multi-vendor verifier fleet, runtime observability,
signed provenance ledger, scheduler-driven drills). Neither is closable by an agent alone.

## Waves
- **Wave 0 (structural, taken):** the doors that make defect classes unrepresentable — frozen-data
  golden hash, KEY_RE-gated URL construction, no-secrets/no-npm-dep-in-served-source, pin manifest.
  These are the fix, not a policing control (Article IX / S13).
- **Wave 1 (STOP-SHIP + BLOCKER-1 core):** commission the gate (verify/ + CI) in observe-only →
  enforcing; mutation testing (A-02, closed); calibration heartbeat (A-36 corpus). Deploy-blocking
  enforcement is **owner-gated (R-GATE)** — installed up to the branch-protection line.
- **Wave R (names/claims):** the "Median max drawdown" mislabel (DR-003), the byte-for-byte and stale
  CORS doc claims — corrected, each with a red→green standing test (verify/tests/70-claims).
- **Waves 2–4 (BLOCKER-2 → ASSESS):** structural doors already cover most; the remainder are
  residualized (register 06) where they need the owner or infrastructure a static site lacks.

## Structural ledger (the 44 structural-fix checks — taken vs policed)
| Door (S13) | Taken? | Mechanism / why |
|---|---|---|
| Frozen crisis data unrepresentably mutable | **Taken** | golden hash (verify/tests/20) — a silent number change cannot pass |
| Activation key → URL without whitelist | **Taken** | KEY_RE enforced at both sites (verify/tests/30); a crafted key returns null before base derivation |
| Secret in served source | **Taken** | no-secrets/idiom test (verify/tests/30); calibration D1 |
| npm dependency in served site | **Taken** | pin manifest (verify/tests/35) + SRI recompute (verify/tests/40) |
| Suite that cannot fail | **Taken** | mutation testing (verify/mutation.js), floor 0.75, measured 1.00 |
| Deploy admission without ratified constitution/evidence | **Partial** | engagement-status computed + gate fail-closed; deploy-*blocking* needs owner branch protection (R-GATE) |
| Model/tool/telemetry/prompt gateways, tenancy DAL, credential broker | **N/A** | no runtime model, tools, tenancy, credentials, or server exist (system map) — the doors have no room to close |

A `no` arrived at by default is a finding; every declined door above is declined **by architecture**
(the capability does not exist) or **residualized to the owner**, never by omission.

---

## Track C waves (Phase 4'/5')

**Wave C-α — doors built (closed by fresh Phase-6' re-run; baseline verdicts preserved):**
- **C-37** (baseline BLOCKER-1 FAIL): built `governance/provenance-manifest.json` + `governance/sbom.json` + `verify/tests/61-provenance` (attested chain per shipped component, hash-verified, reconstruct-on-demand). Escalation cleared → de-escalated to PLAN/PARTIAL. Structural-ledger: baseline_affected_checks=[C-37,C-26]; door_built_by_change=61-provenance+manifest; checks_requiring_fresh_rerun=[C-37]; initial_verdict_preserved=true; current_verification_reference=verify/tests/61.
- **C-08** (baseline PARTIAL): built `verify/tests/62-security-surface` asserting the two-of-three trifecta property + egress allowlist → PASS. Structural-ledger: door_built_by_change=62-security-surface; initial_verdict_preserved=true; current_verification_reference=verify/tests/62.

**Wave C-β — open blockers, buildable next step named (not faked closed):**
- C-03 (BLOCKER-1): commit `verify/package-lock.json`; `npm ci --ignore-scripts` in CI; add a package-existence/registry-age gate for the CI-only deps.
- C-05 (BLOCKER-1): commit a 10-category LLM-risk matrix mapping each category to a control+test (9/10 justified N/A by no-runtime-LLM), bound by a claims-style check.
- C-09 (BLOCKER-1): build the Article-50 disclosure UI test for the AI-regime panel; keep the (not-high-risk) classification current from the generated inventory.
- C-02 (BLOCKER-2): commit `governance/threat-model.md` (DFD+STRIDE) + a new-boundary detector test (extend 62 to diff egress against a threat-entry manifest).
- C-06 (BLOCKER-2): commit the agentic-taxonomy matrix scoped to the dev-pipeline agent (no runtime agent in the product).
- C-26 (BLOCKER-2): move Pages to a CI-artifact deploy with a fail-closed provenance-verify admission step (the only way to verify *at deploy* on this host).
