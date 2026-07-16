# DR-003 — Correct the "Median max drawdown" fan-stat label

**Date:** 2026-07-16 · **State:** ACCEPTED · **Decider:** repo owner (mandate authorization) · Article X (names are claims)

## Context
`FanTile` (dashboard.jsx:1052) labeled a statistic "Median max drawdown". The value `s.mdd` is
computed in `runFan` as the deepest point **below the fixed entry (100)**, not the maximum decline
from the running peak — the standard meaning of "max drawdown". On the gold fan this understates the
true running-peak drawdown ~3× (−6% shown vs ~−21% true). A false name is a defect of the same class
as a false document, and the next agent trusts the name more, not less.

## Decision
Relabel to **"Median max decline vs entry"** — which is exactly what the number measures. The frozen
computation is unchanged (the number is correct for what it now says). This edits a display string in
a component, not a hashed data constant, so the golden data hash is unaffected.

## Standing control
`verify/tests/70-claims.js` asserts the misleading label does not return (watched blocking a
re-introduced defect: audit/05-verification.md). Alternative considered and rejected: computing true
running-peak MDD — larger behavioral change to frozen output, deferred; the honest relabel closes the
claim now.
