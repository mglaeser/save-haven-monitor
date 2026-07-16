# DR-001 — Verification tooling is exempted from the zero-build rule

**Date:** 2026-07-16 · **State:** ACCEPTED · **Author:** audit engagement (agent) · **Decider:** repo owner (mandate authorization: "implement full and realistically and replace existing mechanisms if they would overlap")

## Context
CLAUDE.md forbids `package.json`, `node_modules`, and a build step. That rule protects the
**served site**: deployment must stay `git push` with the browser transpiling the JSX. The
due-diligence mandate (Rule 1, S1–S4) requires a deterministic, machine-executed, adversarially
tested verification gate — which the served site cannot host and which agent-invoked scratchpad
tests do not satisfy (an agent-discretion test is not a control).

## Decision
Introduce `verify/` — a **CI-only** verification harness with its own `package.json` and
`node_modules` (gitignored). It is **not shipped and not referenced by the served site**:
`index.html` loads only the pinned CDN scripts + `bubblegauge.jsx` + `dashboard.jsx`, exactly as
before. The zero-build **deployment** invariant is intact; the zero-build **repository** wording is
narrowed to "the served site is zero-build," which CLAUDE.md now states.

## Why this is not a weakening
It adds a control where there was none (Phase-2 pipeline catch rate 0/6 → 6/6). It removes nothing
from the site. The two tests: *if every human went on holiday for a month, would this still hold?*
— yes, the gate runs in CI without anyone. *If nobody touches it for a year, will it still be true?*
— the golden data hash, pin manifest, and gate self-test all fail red on drift.

## Standing control
`verify/tests/50-gate-selftest.test.js` proves the gate blocks what it claims; the calibration
corpus (`verify/calibration/corpus.json`) re-proves the catch rate. Both run every CI invocation.
