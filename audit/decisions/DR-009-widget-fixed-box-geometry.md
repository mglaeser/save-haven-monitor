# DR-009 — Fixed-box geometry invariant for the served JS-Widget

**Date:** 2026-08-21 · **State:** ACCEPTED · **Author:** widget layout-fix session (agent) · **Decider:** repo owner (reported the clipped freshness row, and directed that the spec gap be closed inline with the fix)

## Context

`DR-008` added `widget.html` to the served allowlist and specified how it is *delivered* — statelessness,
gated egress, no vendors. It specified nothing about how it is *laid out*. That omission surfaced as a
production defect: the CNN Fear & Greed head row wrapped onto two lines, and because the widget is a
fixed box with hidden overflow, the wrapped row displaced the freshness timestamp out of the widget
entirely. Every other element still rendered plausibly, so the widget looked healthy while silently
dropping the one element that tells the reader how old the reading is.

Two coercion defects in the same render path were found alongside it: an interval bound that was not
checked for numericness before rounding (rounding a null bound yields `0`, i.e. a fabricated interval
on a financial signal), and a rating string used as an object key without validation (reaching
`Object.prototype` members).

Under Article III a fix of a defect class installs a standing control, and that control must derive
from a frozen specification rather than from the code it guards. No such specification existed for
this file. This record supplies it, so the control has an upstream. Under Article XII the new check
enters additively, by this record.

## Decision

The served JS-Widget is authored at the iOS small-widget box and is never downscaled; content is
clipped to that box. The following are requirements of the artifact, stated independently of the
mechanism that achieves them:

1. **Single-line heads.** Every head row (label plus value) occupies exactly one line, for every
   value the feed can supply.
2. **The freshness row is always inside the box.** The reading's age is never the element that
   overflow removes. A widget that cannot show its own freshness is a widget that cannot be trusted.
3. **Graceful degradation.** A head value too wide for the box is shortened visibly — never by
   wrapping, and never by a clip that severs a glyph mid-stroke.
4. **No fabricated numbers.** Numeric cells render rounded. A cell whose inputs are not finite
   numbers is omitted, never coerced: an absent value must be absent, not zero.
5. **Enumerated ratings only.** Rating text is drawn from the fear/greed enum fixed by the feed
   contract (`verify/tests/63-feargreed-contract`). An off-enum value renders no rating and no
   rating-derived colour. Abbreviating an enumerated rating for width is display-only and must not
   change which enum member drives colour.

## Additive check (Article XII)

`verify/tests/72-widget-layout` derives from this record and enters the suite additively. It was
demonstrated red against the pre-fix artifact and green after. The founding catalogue is untouched.

## Scope and consequences

Display-only. No change to the feed contract, the gating whitelist, the egress allowlist, the
provenance SHIPPED set, or any frozen crisis datum. `widget.html`'s attested hash moves with the fix
and is re-attested in `governance/provenance-manifest.json`, as `DR-008` already requires.

This record states geometry requirements only. It does not revise `DR-008`'s prose description of the
widget's visual composition, which is out of scope here.
