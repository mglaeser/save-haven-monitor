# 07 — Substitution ledger (Phase 5)

Every control a conventional audit discharges with "a human reviews it", and the mechanism (S1–S13)
that replaces the reviewer here — with the evidence it works.

| Classical control | Substitution | Mechanism (evidence) |
|---|---|---|
| Reviewer approves the merge | **S1** policy-as-code | `verify/gate.js`, fail-closed, self-tested (verify/tests/50 blocks null-standing-control PASS, production lie, count drift, failed test — watched). *R-GATE: deploy-blocking owner-gated.* |
| Second pair of eyes | **S2** adversarial independence | Separate agent, falsifying objective; overturned 14/27 risky verdicts (audit/03-findings.json history). *R-VENDOR: single vendor.* |
| Reading the diff | **S3** executable proof | Data invariants, golden hash, static-security regexes, pin manifest, SRI recompute (verify/tests/*). |
| Knowing the tests are any good | **S4** mutation testing | `verify/mutation.js`: 13 mutants, floor 0.75, measured 1.00 — the suite proven able to fail. |
| Sign-off on irreversible actions | **S5** reversibility | No irreversible capability exists (no server/tools); git revert is one-command rollback. |
| "Someone would notice" (blast radius) | **S6** caps | Static site: no spend/send/delete capability; egress is 3 fixed destinations, 2 gated. |
| N-version for high-stakes | **S7** | Adversarial re-generation of risky verdicts; deterministic arbiter. *R-VENDOR.* |
| "Watch the dashboard after deploy" | **S8** progressive exposure | N/A — Pages has no canary; graceful client degradation + error capture substitute (R-OBSV). |
| Name on the approval | **S9** attested provenance | git history (public, append-only) + `audit/` evidence; hash-attested constitution/mandate. *R-LEDGER: unsigned.* |
| On-call as a control | **S10** out-of-band break-glass | The owner's branch-protection + halt are command, not a counted control. |
| Senior engineer notices standards slipping | **S11** ratchet | `verify/golden/ratchet.json`: catch-rate, mutation, zero-secrets floors that rise, never fall. |
| Trust the pipeline still works | **S12** continuous calibration | `verify/calibration/corpus.json`: 6 seeded defects, 6/6 caught; a stopped catch is a failed gate. |
| The reviewer AND the control that replaced them | **S13** unrepresentability | Frozen data (golden hash), KEY_RE-gated URL, no-secret/no-npm-dep served source — the defect class removed, not policed. |

**A gap here is a gap in the operating model.** The three UNSETTLED substitutions (S2/S7 single-vendor,
S8 no canary, S9 unsigned) are the residual register's R-VENDOR / R-OBSV / R-LEDGER — named, tripwired, owned.

---

## Track C substitutions (S2/S5/S6/S9/S13)

Where a check would classically end in a person, the mechanism that replaces them:
- **S13 (structure)**: C-01 KEY_RE-whitelist-before-URL (unrepresentable SSRF); C-08 trifecta two-of-three asserted by `62`; C-37 attested provenance manifest + `61`; C-04/C-23 no-PII/no-telemetry surface tripwire (`62`).
- **S2 (independent verifier ≠ generator)**: every Track C verdict attacked by a separate model instance with a falsifying objective (0 disagreements); a second independent 36-agent run corroborated the blocking posture. Residual R-VENDOR: one vendor — the deterministic gate is the arbiter no model can talk out of.
- **S5/S6 (deterministic validator + least agency)**: C-06/C-12 — no runtime agent; the dev-pipeline agent is bounded by the gate; irreversible-action wrapping is N/A (no runtime tools).
- **S9 (provenance/evidence emitted by the pipeline)**: C-11/C-26/C-37 — the audit tree + provenance manifest + SBOM are emitted/verified by CI, not assembled before an audit.
- **S1 (policy compiled into the bundle)**: C-33 — machine-relevant CLAUDE.md/constitution clauses (no build step, frozen data, SRI pins, gate-must-pass) are enforced by `verify/` tests, not merely published.
