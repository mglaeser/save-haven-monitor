# DR-007 — Deprecate the legacy zero-build / in-browser-Babel front end + add a gated mobile opening splash

**Date:** 2026-07-17 · **State:** ACCEPTED · **Author:** rewrite engagement (agent) · **Decider:** repo owner (explicitly authorized both: "deprecate the old babel/style front end … mark it as deprecated everywhere", and the mobile splash feature)

## Context

Two owner-authorized changes, both behind the unchanged frozen `acceptance/` suite and the unchanged
golden data hash:

1. **Deprecation.** DR-006 already moved transpilation out of the browser (compiled-ahead: pinned
   esbuild in CI, self-hosted SRI-pinned vendors, no unpkg, no `@babel/standalone`) and the `.jsx`
   sources were removed in the module migration. What remained was **stale documentation** presenting
   the zero-build / in-browser-Babel path as the current, supported architecture (`README.md` in full;
   `CLAUDE.md` "Pinned CDN versions" + "Notes"; scattered `.jsx` references). The owner authorized
   formally deprecating that path and marking it deprecated everywhere.

2. **Mobile opening splash.** A gated, mobile-portrait-only "opening" splash that showcases the live
   bubble state (regime score + band, CNN Fear & Greed, and a few decision-relevant live stats) with a
   tasteful on-brand illustration and a small close affordance.

## Decision — deprecation (docs only; guards kept, nothing removed that still does work)

- **`README.md`** rewritten to the compiled-ahead reality (esbuild-in-CI, self-hosted vendors,
  deploy-from-GitHub-Actions) with an explicit **"⚠️ Deprecated"** section for the zero-build/Babel era.
- **`CLAUDE.md`**: "Pinned CDN versions" → "Pinned vendor versions (self-hosted, SRI-pinned)" (drops
  `@babel/standalone`); "Notes" updated (no "don't add a build step", deploy-from-Actions); a new
  **"Deprecated (do not maintain, do not reintroduce)"** section; stale `.jsx` references corrected.
- **Guards are intentionally KEPT, not removed.** The user permitted removing "dependencies, tests, CI"
  tied to the old path, but the standing guards that *enforce* the deprecation are the mechanism that
  keeps it deprecated: `verify/tests/35-supply-chain` (no unpkg/Babel/`text/babel` in `index.html`),
  `62-security-surface` (no third-party runtime egress), `66-compiled-fresh` (committed `.js` == fresh
  build of `src/`). Removing them would *weaken* the deprecation and the gate — in a no-human-review
  repo that is exactly the wrong direction, so they stay. There is **no** Babel-specific dependency,
  test, or CI job left to remove — the migration already deleted the `.jsx`, dropped `@babel/standalone`
  from the vendor/pin/SBOM set, and retargeted every control. Historical records in `rewrite/` and
  `audit/decisions/DR-006*` are preserved as records, not edited into pretending the past didn't happen.

## Decision — mobile opening splash (gated integration; zero footprint when off)

- **`BG.Splash`** added to `src/bubblegauge.tsx` (feed/score-sourced, error-boundaried), mounted via one
  marked, gated seam in `src/dashboard.tsx`. It is a full-viewport, edge-to-edge fixed overlay showing a
  dedicated title, the regime score + action band on a 0–100 gauge, the CNN Fear & Greed status, a few
  live stats, an on-brand SVG bubble illustration, a plain-language read, the standing "heuristic, not a
  probability, research not advice" disclaimer, and a small top-right **X close** (≥40px hit area,
  `aria-label="Close"`). After the splash is shown and closed, a small **re-open icon** (gold gauge
  glyph, `aria-label="Open AI bubble monitor"`) persists top-right **in portrait only** (reactive to
  rotation via `matchMedia`) so the reading can be reopened; it too is gated (portrait + dismissed +
  API-connected) and absent with no `?status-api`, on desktop, and before the first close.
- **Triple-gated, opening-only:** renders only when (a) the `?status-api` gate is on **and** the API is
  connected (score data present — not loading/warming/error), (b) the viewport is a **small screen in
  portrait** (`matchMedia("(max-width: 640px) and (orientation: portrait)")`), and (c) it has not been
  dismissed this session (`sessionStorage["bubblegauge:splash-seen"]`). With no `?status-api` there is
  **zero footprint** (nothing mounts), so the frozen negative/parity contracts are untouched; on desktop
  viewports (the acceptance default 1280×950, and the 375px responsive cases which use **no** API param)
  it never appears.

## Consequences / non-consequences

- Frozen `acceptance/` suite **unchanged** and green (35/0); golden data hash **unchanged**; the splash
  and deprecation touch only gated integration + docs, never crisis data/strings/numbers/calculations.
- Provenance manifest re-attested for the changed served files (`index.html` comment, `dashboard.js`,
  `bubblegauge.js`, `src/dashboard.tsx`, `src/bubblegauge.tsx`); compiled `.js` rebuilt byte-fresh
  (`66-compiled-fresh`).
- `production_eligible` stays **computed `false`** — this record cannot and does not flip it.
