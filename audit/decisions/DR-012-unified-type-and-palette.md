# DR-012 — One typeface pair and one palette across every served surface

**Date:** 2026-08-21 · **State:** ACCEPTED · **Author:** unification session (agent) · **Decider:** repo owner ("have a unified font, and style now everywhere including the widget")

## Context

`DR-011` re-coloured the atlas and the console but stopped at the two `src/` files. That left the
served set internally inconsistent in two ways the owner spotted:

- **`widget.html` was never touched.** The iOS JS-Widget still carried the entire pre-`DR-011`
  scheme — navy `#0E1526`, cream ink, gold accent, and the old blue/gold/red action bands — while
  the site it belongs to had moved to navy/lavender/cyan.
- **Three different sans stacks were in play** (`system-ui, -apple-system, 'Segoe UI', sans-serif`
  in the host; `-apple-system, BlinkMacSystemFont, 'Helvetica Neue', sans-serif` in the widget; a
  third variant inside a bubblegauge panel), plus two serif stacks (`Georgia, 'Times New Roman',
  serif` and a bare `Georgia, serif`).

## Decision

### 1. One pair, everywhere

```
sans   -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Helvetica Neue', Helvetica, Arial, sans-serif
serif  Georgia, 'Times New Roman', serif
```

Declared once per surface (`SANS` in `src/bubblegauge.tsx`, `S.page` in `src/dashboard.tsx`,
`--serif` plus the body rule in `widget.html`) and referenced everywhere else. The console sets the
family on its own root so it can never inherit a different stack from the host.

Serif remains reserved for numerals and the verdict sentence; sans carries all chrome.

### 2. The widget joins the palette

Ground `#21252D`, panels `#272C35`, ink `#FFFFFF`, and the same keys — violet `#B79DFF`, cyan
`#29C7E8`, blue `#2E86E8`, rose `#FF6B8A`. Its `--gold` token was **renamed `--violet`**, matching
what `DR-011` did to `C.gold`: a token whose name contradicts its value is the lie the
names-are-claims article forbids.

### 3. Two collapses the blind sweep caused, and one it had missed

Replacing colours by string match is fast and wrong at the edges. Three defects came out of it and
are fixed here:

- The widget's Fear & Greed gradient had **two identical rose stops** — the old `#C0564A` and
  `#E05252` both mapped onto `#FF6B8A`, flattening the fear end of a five-step scale. A distinct
  `#F08AA0` restores the step.
- `FG_COLORS` in `src/bubblegauge.tsx` had **never been swapped at all**: `fear` was still brick
  `#C0564A` and `extreme greed` still teal `#5AA9A3`, so the app and the widget disagreed about what
  the same rating looks like. Both tables now hold the same five values, and the five-zone
  `zoneCols` arrays were aligned to them so the bar cannot contradict the label above it.
- A **lowercase `#e0b458`** survived every map, because the maps were case-sensitive.

### 4. What is deliberately NOT unified

The crisis atlas draws many asset series at once, and those hues are a **categorical palette**: they
exist to be told apart, not to match. Collapsing them into five keys would destroy the charts they
serve. Left untouched: the per-series line colours, the grounding-class colours
(`literature-grounded` / `-adjacent` / `contested`), and the amber `#E8853D` used for *stale* and
*degraded* — a warning colour carries meaning no key colour can.

After the sweep, the only non-canonical literals remaining in the two gated files are exactly those
three grounding-class colours.

**Correction (same day).** This record originally claimed `widget.html` was "fully canonical" after the
sweep. It was not: the widget's ambient glow carried the retired gold as an **rgba triple**
(`rgba(224,180,88,…)`), which a hex-only map cannot see. A 35-agent wide test across all three surfaces
caught it, along with four further defects the sweep caused or left: the Fear & Greed scale was being
painted with **four different ramps** running in **opposite directions** on the console versus the
strip, block, splash and widget; the zone bars contradicted their own `FG_COLORS` table; the widget's
`GREEN`/`RED` tokens held cyan and rose, the same name/value lie this record invokes to justify the
`--gold` rename; the widget had **no `suppressed` band at all** and silently relabelled a withheld
score as HOLD; and the tertiary greys failed 4.5:1 on the new panels. All are fixed, and the F&G ramp
is now a single `FG_RAMP` token that all five surfaces derive from.

## Verification

Both surfaces rendered in headless Chromium and inspected as pixels: the console at 1280×800,
1440×900 and 1920×1080, and the widget at its true 168×168 box. `72-widget-layout` still green — the
head-wrap guard, the IQR `num()` guard and the rating whitelist are untouched by a colour change.

## Consequences

Five shipped components re-attested (C-37) — the first time `widget.html`'s hash has moved since
`DR-009`. No crisis datum, golden hash, gating whitelist or egress allowlist is altered: the sweep
was audited against the data arrays specifically, since blind string replacement could otherwise
have hit a literal inside frozen content.
