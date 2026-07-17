# DR-008 — Serve the AI-Bubble iOS JS-Widget from GitHub Pages (stateless, gated egress)

**Date:** 2026-07-17 · **State:** ACCEPTED · **Author:** rewrite engagement (agent) · **Decider:** repo owner (explicitly chose "Widget in save-haven-monitor-Pages" and accepted the security-gate adjustment)

## Context

The owner wants the companion **iOS JS-Widget** ("AI Bubble Monitor", built to the WidgetWeb /
`github.com/Villy21/JsWidget` spec — a self-contained HTML page an iOS app renders as a homescreen
widget) served from this repo's Pages deployment, so it has a first-class URL on the production host.
The widget shows the same "where we stand on the AI bubble" reading as the mobile splash (regime score
on a 270° gauge, the flipped CNN Fear & Greed bar, a few live stats), in the crisis-atlas design.

Serving it here touches two Track-C security controls (`verify/tests/62-security-surface`), so it is
recorded rather than slipped in.

## Decision

`widget.html` is added to the **served-file allowlist** (`build.js --dist` copies it into `dist/`
alongside `index.html` / `./vendor/*` / `.nojekyll` / `CNAME`), to the **provenance manifest** +
`61-provenance` SHIPPED set (hash-attested like every other served file), and to `62-security-surface`'s
scanned `SERVED` set. Two properties keep the security controls intact rather than weakened:

1. **Stateless — C-04 unchanged.** The served widget uses **no cookies, no `localStorage`, no
   `sessionStorage`**, and captures no input. The JsWidget spec's cookie-state is only a *SHOULD*; the
   "restore same appearance on reload" *MUST* is met because live data re-fetches and the fallback
   sample is constant. So `62`'s C-04 tripwire (`no document.cookie`, `no localStorage`, no password
   input) holds for the widget verbatim — the standalone `?api=`/cookie variant (delivered as a file
   for hosting elsewhere) is intentionally **not** the version served here.

2. **Gated egress — C-08/C-28 preserved, not broadened.** The widget's **only** network calls are to
   the **same constructed, KEY_RE-whitelisted `API_BASE`** the dashboard uses: `?status-api=<key>` →
   `"https://" + key + "." + parent` (subdomain of the widget's own host; no host/domain literal in
   source, so the egress regex captures nothing new). `62` is extended to assert that every `fetch(` in
   `widget.html` targets `API_BASE` and that the widget carries the same `KEY_RE`. Without a valid key
   the widget makes **no** network call (embedded sample). So the declared egress set is unchanged: the
   single gated status-API host, plus the existing `www.etoro.com` / `www.w3.org` / `localhost` allow.

The widget ships **no vendors** (self-contained inline SVG/CSS/JS — respects the 30 MB widget memory
budget), so the SBOM / AI-BOM (`C-26`) are unchanged and remain empty of runtime AI components.

## Consequences / non-consequences

- No crisis data / golden hash touched; the **frozen acceptance suite is unaffected** (the widget is
  not part of the atlas parity suite) and stays 35/0.
- `62`/`61` now cover the widget; a future edit that gave it a cookie, a literal egress host, a
  telemetry sink, or an ungated fetch fails the build — the controls got **stronger coverage**, not
  weaker.
- Install: host is the production Pages origin; the app's JS-Widget URL is `…/widget.html` (append
  `?status-api=<key>` for live, or `?status-api=demo` to preview the sample offline).
- `production_eligible` stays **computed `false`** — this record cannot and does not flip it.
