# 08 — The standing regime (Phase 5/7) — what keeps this true after the engagement

The deliverable that outlives the engagement. Instantiated in `verify/` + `governance/` + `audit/`.

## Ratchet register (S11) — `verify/golden/ratchet.json`
| Metric | Baseline | Direction | Gate | Blocks |
|---|---|---|---|---|
| pipeline catch rate | 6/6 | up | run.js + calibration | release on any seeded-defect escape |
| mutation score | 1.00 (floor 0.75) | up | mutation.js | CI job below floor |
| required tests | all green | up | run.js + gate.js | release on any fail / golden-hash drift |
| secrets in served source | 0 | flat-zero | tests/30 | any secret idiom |
| open STOP-SHIP | computed | down to 0 | gate.js | production_eligible |

Loosening any threshold requires a decision record and is itself a finding (Article V/XIII).

## Cadence (S12) — enforced now vs owner-to-enable
- **Every change / on push (enforced in CI now):** run.js (all invariants + static security + SRI + pins + gate self-test + claims + governance), mutation.js, gate.js.
- **Weekly (buildable — R-CRON, owner):** full corpus re-injection, SRI online recompute against live unpkg.
- **On-trigger (§9.5):** new egress / new gated path / new external dependency → widen the static corpus and re-run.

## Continuous calibration (S12) — `verify/calibration/corpus.json`
Six seeded defect classes (D1–D6), catch rate 6/6. The corpus grows with every real defect and
incident. A class the pipeline stops catching is a failed gate and freezes releases.

## Decay watch (the ways this dies, each with a detector)
- suppression/threshold creep → ratchet.json + golden hash (a loosened number is a finding)
- gate capture → gate self-test + 60-governance (R-SEP tripwire)
- corpus freeze → calibration re-run on trigger
- name rot → 70-claims + Article X re-extraction
- **abandonment (the most likely death)** → the whole gate is one `cd verify && npm i && node run.js`;
  kept cheap so it is not resented into disuse (mandate §10).

## Executors
- **Gate (Runner-equivalent):** verify/ + CI — deterministic, self-tested.
- **Maintainer:** the code-writing agent — runs the gate before every push (CLAUDE.md).
- **Verifier:** a separate adversarial agent instance (R-VENDOR: single vendor).

## Self-application (§9.10)
CI fails while any required test fails, mutation is below floor, the golden/pin/claims controls drift,
the digest unbinds from the constitution, or the findings file loses integrity. `production_eligible`
is computed and fail-closed; it cannot be asserted true while Track C is unaudited.
