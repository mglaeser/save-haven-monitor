# Constitution — one-page digest (hash-bound)

**Bound to governance/constitution.md sha256 `d8ef4f89aefbe706e66c2866795f7cd08431b9f83cb56dfa81c880f6e0a714dd`.** If this digest drifts from that file, the
build fails (a digest that misquotes its source is worse than none). Routine sessions may load this;
amendments, repair-lane merges and Article-XIV alerts require the full text.

1. **The gate decides** — verify/ (run.js + mutation.js + gate.js). No model opinion merges. *(advisory on deploy until the owner enables branch protection — R-GATE.)*
2. **Change discipline** — red→green spec-test · smallest change · full suite · mutation ≥0.75 (baseline 1.00) · clone sweep · standing control installed & watched · adversarial verify.
3. **The ratchet** — verify/golden/ratchet.json: catch-rate 9/9 (v2.0), mutation 1.00, zero secrets, zero prod creds, zero provenance drift, zero undeclared egress; loosening is a finding.
4. **The heartbeat** — verify/calibration/corpus.json (9 classes) re-injected; catch rate is an SLI; a drop freezes releases.
5. **Structure over policing** — frozen data by golden hash; KEY_RE-gated URL; no secrets/npm-dep in served source; attested provenance per shipped component (61); two-of-three trifecta + egress allowlist (62) — all enforced by tests.
6. **Names are claims** — verify/tests/70-claims enforces corrected labels.
7. **The user is not an override path** — Article XIV: stop, argue the mechanism, two-key, falsifiable prediction, emojis only there.
8. **Scope** — Production; catalogue v2.0; Track C **audited** (security_scope_audited=true); production_eligible=false (computed) while open blockers remain (Track-C C-02/C-03/C-05/C-06/C-09/C-26 + Part-1 R-GATE/R-SEP/R-VENDOR/R-OBSV).

> *If every human went on holiday for a month, would this still hold? If nobody touches it for a year, will it still be true — and how would anyone find out if it were not?*
