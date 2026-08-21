# DR-010 — Desktop overview hero (inline, API-gated, supersedes the compact Strip at ≥1024px)

**Date:** 2026-08-21 · **State:** ACCEPTED · **Author:** desktop-overview session (agent) · **Decider:** repo owner (specified the placement, the strip supersession, and the "less information, better understanding" brief)

## Context

Small-portrait phones get a rich `Splash`. Desktop gets a single-line `Strip` — the same reading
compressed, on a viewport with an order of magnitude more room. The owner asked for a desktop
equivalent and set the brief explicitly: **more real estate, fewer facts, better understanding, and
only when the API is connected.**

The failure mode to avoid is the obvious one: a wall of live metrics that looks informative and
changes no reader's conclusion. The score payload carries ~60 fields; nearly all of them answer
questions a reader is not asking at a glance, and all of them are one click away in the detail tab.

## Decision

### 1. Placement and gating

A full-width **inline** hero above the atlas — not an overlay. Triple-gated: the `?status-api` gate
is on, the viewport is **≥ 1024px**, and the score endpoint is connected (not loading, warming up or
errored). Any gate closed → the hero renders nothing.

Being inline rather than modal is the reason it carries **no dismiss control**: it is free to scroll
past, so persisted dismiss state would be complexity with no payoff.

### 2. It supersedes the Strip, and the Strip stays mounted

At hero widths the compact Strip is hidden — showing both puts the same score on screen twice. The
Strip remains **mounted and hidden** rather than unmounted, because `acceptance/tests/02-integration`
asserts its `role`/`tabindex` by attribute at a 1280px viewport and performs no visibility check.
That suite is frozen; hiding rather than removing keeps its assertion true without a re-freeze.

### 3. Content contract — eight fields

`action_band` · `trend_states` · `headline_median` · `iqr` · `red_flag_count`/`red_flag_detail` ·
`block_S`/`block_D` value · `judgment_call.text` · `meta.computed_at`/`coverage`.

The hero **never calls the live-metrics feed**, so it adds no egress of its own.

### 4. The verdict is a sentence, and the sentence is a contract

The hero leads with a conclusion in words, chosen by **band × trigger** — because the band alone is
not the answer. A `hold` score with a broken 10-month trend rule is a materially different situation
from a `hold` with both rules intact, and a hero that printed only "HOLD" would conceal exactly the
case a reader most needs to notice.

| band | trigger intact | ≥1 trend rule OUT |
|---|---|---|
| hold | *No action indicated.* | *The score says hold — but the trend rule has broken.* |
| trim | *Trim is warranted — but nothing forces action today.* | *Trim now — the trigger has fired on …* |
| de-risk | *De-risk is warranted; the trigger has not fired.* | *De-risk now — … has broken trend.* |
| suppressed | *Not scored today.* (detail from `COPY.bandOneLiner`) | same |

A **suppressed band is never given an action verb**, and a fired `override_fired` is always stated,
never silently dropped. An unrecognised band falls back to the hold row, matching `bandOf()`.

### 5. Distance to the line that would change the verdict

The hero states how far the score sits from its next threshold (`hold`→45, otherwise 60; `de-risk`
is read downward). A conditional clause names the IQR bound **only when the interval already crosses
a line the point estimate has not** — i.e. exactly when a bare point estimate would mislead. It is
silent otherwise, and silent entirely for a suppressed band: distance to a withheld line is noise.

Uncertainty therefore appears in exactly two places — as prose in this clause, and as the shaded
region on the gauge. Not five.

### 6. Persistence over novelty

`action_band` rarely changes, so a hero reporting only the band would say nothing new on most days
and train readers to skip it. It reports instead how many consecutive readings the band has held —
regime *stability* is the fact — and a break reads loudly without introducing a new colour. Fewer
than three history rows → the line is omitted, never fabricated from a partial tail.

### 7. Non-goals

No live-metrics grid, no Fear & Greed (it does not feed the score and already renders directly
below), no per-indicator sub-scores, no `point_score` (false precision on an uncalibrated
heuristic), no history chart, no second gauge, no animation.

### 8. Nothing is conveyed by colour alone

Trend = glyph + literal `IN`/`OUT` + colour. Override flags = fill + border + literal count. Band =
literal label + numeral + marker position. Direction = glyph + signed number. Remove all colour and
the hero still reads correctly. The verdict headline is deliberately **uncoloured**: it is already
the largest object on the panel, and colouring the verb caused a three-second scan to read the band
and miss the qualifier the sentence exists to deliver.

## Additive check (Article XII)

`verify/tests/73-overview-verdict` derives from §4, §5 and §6 above and enters the suite additively.
It **executes** the shipped `verdictOf`/`distanceOf`/`runOf` against a table rather than pattern-
matching the source, so a reworded-but-correct implementation stays green and a wrong sentence goes
red. Demonstrated red (6 failures) before the hero existed and green after.

## Consequences

`bubblegauge.js` grows from 74,807 to 85,247 bytes against the 95,000 cap (`71-perf-budget`), leaving
~9.7KB. The four shipped components that changed are re-attested in the provenance manifest (C-37).

`bgFetch` gained an **in-flight request map**: it previously deduped only *completed* responses, so
the hero and the hidden Strip requesting the same two endpoints in one tick would have doubled the
page's requests on load and on every window focus. With the map, egress after this change is
identical to before it — a prerequisite of this decision, not an incidental cleanup.

This record states the desktop overview contract only. It does not revise `DR-008`, and does not
alter the frozen crisis data, the gating whitelist, or the egress allowlist.
