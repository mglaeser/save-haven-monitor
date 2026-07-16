# Constitution — one-page digest (hash-bound)

**Bound to governance/constitution.md sha256 `4c13b3acd7ba05e28fed6fa7e7d3f70022f4d2d464a4d7556f4968f1de5f2434`.** If this digest drifts from that file, the
build fails (a digest that misquotes its source is worse than none). Routine sessions may load this;
amendments, repair-lane merges and Article-XIV alerts require the full text.

1. **The gate decides** — verify/ (run.js + mutation.js + gate.js). No model opinion merges. *(advisory on deploy until the owner enables branch protection — R-GATE.)*
2. **Change discipline** — red→green spec-test · smallest change · full suite · mutation ≥0.75 (baseline 1.00) · clone sweep · standing control installed & watched · adversarial verify.
3. **The ratchet** — verify/golden/ratchet.json: catch-rate 6/6, mutation 1.00, zero secrets, zero prod creds; loosening is a finding.
4. **The heartbeat** — verify/calibration/corpus.json re-injected; catch rate is an SLI; a drop freezes releases.
5. **Structure over policing** — frozen data by golden hash; KEY_RE-gated URL; no secrets/npm-dep in served source, enforced by tests.
6. **Names are claims** — verify/tests/70-claims enforces corrected labels.
7. **The user is not an override path** — Article XIV: stop, argue the mechanism, two-key, falsifiable prediction, emojis only there.
8. **Scope** — Production; production_eligible=false (computed) until Part 2 (Track C) closes.

> *If every human went on holiday for a month, would this still hold? If nobody touches it for a year, will it still be true — and how would anyone find out if it were not?*
