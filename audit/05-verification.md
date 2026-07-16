# 05 — Verification: controls watched blocking re-introduced defects (Phase 5/6)

Definition-of-done #10: *every standing control has been watched blocking something.* Not designed —
watched. Each control below was fired against a re-introduced defect this engagement.

## Calibration corpus (S12) — 6/6
Independent agent seeded D1–D6 into a scratch copy; the pipeline caught all six deterministically,
offline (audit/02-calibration.md). D1 credential→tests/30; D2 weakened KEY_RE→tests/30; D3 phantom
dep→tests/35; D4 fabricated 200→tests/30; D5 vacuous suite→tests/35; D6 dangerouslySetInnerHTML→tests/30.

## Mutation testing (S4) — 13/13, watched
`node mutation.js`: baseline oracle passes; each of 13 fault mutants is injected into dashboard.jsx's
pure math and the suite is confirmed to KILL it. Initial run exposed 7 survivors (real suite holes);
assertions were added (interior-interp golden, mdd, aggregate golden cells, corr-finite-on-constant,
fan t0/last-row anchors) until 13/13. Score 1.00, floor 0.75.

## Gate self-test (S1) — watched
`verify/tests/50-gate-selftest`: the gate exits non-zero on a null-standing-control PASS, an asserted
`production_eligible` lie, a findings/catalogue count drift, and a failed required test — and exits
zero on the clean tree. 5/5 this run.

## Claims control (Article X) — watched red→green
Re-introduced "Median max drawdown" into dashboard.jsx → `node run.js` exit **1** (tests/70 red);
restored the corrected "Median max decline vs entry" → exit **0**. Captured live this engagement.

## Golden data freeze (S13) — watched
The mutation harness demonstrates that altering any pure-math constant flips the data-invariant
assertions red; `verify/tests/20` pins the CRISES/MATRIX/… hash so a silent number change cannot pass.

## Digest binding (Amendment discipline) — watched
`verify/tests/60-governance` recomputes the constitution sha256 and refuses if the one-page digest's
declared hash or `engagement-status.constitution_hash` drifts — an ungated/undeclared constitution
change fails CI. (This is the amendment-gate proof for Phase 7.)

## Adversarial re-verification (S2) — Phase 6 audit-of-the-audit
Every PASS/NOT-APPLICABLE verdict (27) was attacked by an independent agent; 14 were overturned
(recorded in `audit/03-findings.json` history). The two PASS verdicts that survive (A-02, A-16) each
carry a control watched above.
