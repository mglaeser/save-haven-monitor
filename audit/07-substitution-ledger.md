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
