# DR-011 — Full-screen regime console: new palette, full-bleed placement, raised JS budget

**Date:** 2026-08-21 · **State:** ACCEPTED · **Author:** console session (agent) · **Decider:** repo owner (supplied the reference design, authorised the app-wide palette change and the budget raise, and directed screenshot-driven iteration)

## Context

`DR-010` put a compact overview hero above the atlas. The owner then asked for something larger and
more immersive: a **full-screen dashboard, above the fold**, built to the visual language of a
reference dashboard they supplied — deep navy panels, pastel lavender/cyan/blue, gradient strokes
that fade, layered translucent chart fills, soft glow. Their words: *"like a night sky with northern
lights… where each has a function and use."*

Two constraints were surfaced to the owner before building, and both were decided by them:
the app palette lives partly in `src/dashboard.tsx`, whose edit surface is otherwise restricted; and
the compiled bundle had no room for the work.

## Decision

### 1. Palette — app-wide, owner-authorised

The cream/gold scheme is replaced across **both** source files: ground `#21252D`, panels `#272C35`,
ink pure white, and the keys **lavender `#B79DFF`, cyan `#29C7E8`, blue `#2E86E8`, indigo `#6C4FE0`**
(the gradient tail). ~550 colour tokens in total.

Action bands take the reference's keys — hold cyan, trim lavender — but **de-risk keeps a distinct
rose `#FF6B8A`** rather than staying inside the reference's three hues. Losing the danger reading on
the one band that means *sell* would be a semantic loss dressed as a style choice.

This edits `src/dashboard.tsx` beyond its "bubblegauge integration hooks" convention. Colours are
not crisis data, not strings of record, and not calculations, so no frozen content is touched; the
golden data hash is unchanged. Recorded here because the convention was knowingly set aside.

The token formerly named `gold` now holds lavender and was **renamed `C.violet`** — a token whose
name contradicts its value is exactly the class of lie Article "names are claims" forbids.

### 2. Placement — full-bleed, above the fold

The console mounts as the **first child of the page**, outside the 1060px reading column, at
`100vh`. Measured at 1280×800, 1440×900 and 1920×1080: `top = 0`, section height equals viewport
height, no horizontal overflow. The atlas continues below on scroll. Gating is unchanged from
`DR-010`: `?status-api` on, viewport ≥1024px, score API connected; the Strip stays mounted and
hidden, keeping the frozen acceptance assertion true.

### 3. What is on it, and why each thing is there

| Element | Its job |
|---|---|
| Verdict sentence + distance | the conclusion, in words (`DR-010` §4–5) |
| History band chart | level, uncertainty (IQR and 5–95), and the two thresholds |
| Score arc | the number, its band, and the middle half of the model's range |
| Structure / Dynamics | the causal split behind the number |
| Indicator table | the nine weighted inputs, heaviest first |
| Last seven readings | recent direction, each bar tinted by its own band |
| Six live tiles | market context, each with its job named |
| Trigger / override / note | what would change the verdict |

An earlier draft orbited the nine indicators around the arc as glowing nodes. They were **removed**:
their sub-scores cluster in a narrow range, so nine near-identical circles read as decoration, not
signal. A "VIX" legend row showing `multiplier / 2` as a percentage was also removed — an invented
normalisation that meant nothing.

### 4. Motion

Three blurred lights drift behind the composition (26/34/44s) and panels rise in on a 60ms stagger.
Keyframes cannot be expressed in inline styles, so a single `<style id="bg-css">` is injected once —
this is not a CSS framework and adds no fetch. **`prefers-reduced-motion: reduce` disables both.**

### 5. Byte budget raised to 110,000

`bubblegauge.js` moves from 74,807 (pre-`DR-010`) to ~97,400, past the 95,000 ceiling. The budget in
`verify/tests/71-perf-budget` is raised to **110,000**, leaving ~12KB of headroom. Total served JS is
~224KB against the unchanged 950,000 page-weight ceiling.

This raise was deliberately **not** taken twice earlier in the same work: two intermediate versions
came in at 91,646 and 92,929, under the original cap, and the guardrail was restored both times. A
budget raised when it is not needed is a guardrail that no longer guards.

### 6. Egress

The console reads the dashboard feed, which the hero previously avoided. `bgFetch` already gained an
in-flight map in `DR-010`, so the feed is fetched once and shared with the panel that also wants it.
No new endpoint, no new host.

## Verification

Built and screenshotted in headless Chromium at three desktop viewports, reviewed as pixels, and
iterated four times against those images. Defects found and fixed that way: the section sat 324px
down the page and inside the reading column; y-axis numerals were clipped; the gauge overflowed its
card and pushed the legend out of the section's `overflow:hidden`; sparklines read a `live.series`
field that does not exist (the feed exposes `metrics`, `fgSeries` and rebased `a[]`); the indicator
table sliced a row at 800px height.

The screenshot harness (`verify/shot.js`) is a local development tool. It is **not** wired into the
gate: it needs a browser binary and system libraries that CI does not provision.

## Consequences

Four shipped components re-attested (C-37). `DR-010`'s verdict contract and its check
(`73-overview-verdict`) are unchanged and still green — the sentence logic was not touched by any of
this. No frozen crisis datum, gating whitelist or egress allowlist is altered.
