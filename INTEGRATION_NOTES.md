# bubblegauge integration — discovery findings & adaptation decisions

The `bubblegauge × Crisis Winners` spec was written for a conventional bundled SPA.
This repo is the opposite — a zero-build, no-package.json, in-browser-Babel site — so
the integration keeps the spec's *intent* and adapts its *mechanics*. This file is the
Discovery Checklist output (spec §1.1) plus every deliberate deviation.

## Discovery findings

| Question | Finding |
|---|---|
| Framework / bundler | **None.** No `package.json`, no Vite/Next/Webpack. `index.html` loads pinned UMD CDN scripts (React 18.3.1, ReactDOM, prop-types 15.8.1, Recharts 2.12.7, `@babel/standalone` 7.29.7 with SRI), then `<script type="text/babel">` files transpiled in the browser. SPA, client-rendered. |
| Design system | Hand-rolled inline styles. Tokens live in the `S` object in `dashboard.jsx`: bg `#0E1526`, panel `#141D31`, tooltip `#0B111F`, text `#EDE8DC`, dim `#C7CBD6`, muted `#9AA3B5`, faint `#78829a`, gold accent `#E0B458`; serif = Georgia; panel radius 10, border `rgba(237,232,220,0.09)`. `bubblegauge.jsx` mirrors these in its `C`/`BS` objects. |
| Semantic colors | Stress red `#E05252`/`#C0564A`, amber/gold `#E0B458`/`#d9b45c`, safe green/teal `#7fbf94`/`#5AA9A3`, blue `#5B8DEF`. Reused for band + grounding chips; no new palette introduced. |
| Charting | **Recharts 2.12.7**, already a global (`window.Recharts`). Reused — no second charting dep. |
| Routing | Client-side tab state (`useState` in `CrisisWinnersDashboard`, a `TABS` array). The gauge slots in as a 6th tab. |
| Data fetching | None existed. Added a tiny `fetch` + in-memory cache in `bubblegauge.jsx` (no SWR/react-query — they'd need npm). |
| Theme | Dark-only (`theme-color #0E1526`), no toggle. Built dark-only to match. |

## Deviations from the spec (all forced by zero-build or the frozen crisis content)

1. **No TypeScript.** The spec's `.ts` interfaces are documentation only; `bubblegauge.jsx`
   is plain JSX with a boundary validator (`validScore`, `isNum`, `pair`) instead of zod/io-ts.
2. **No `lazy()` / dynamic `import()` code-splitting.** There is no bundler to split. Instead
   `bubblegauge.jsx` is a static second Babel script that **no-ops when the gate is absent**
   (checks `?status-api`, sets `window.BubbleGauge = { enabled:false }`, returns before defining
   anything). Verified: with no param there is **zero DOM footprint, zero network to `*.klee.me`,
   5 tabs, and byte-identical render**. The one relaxation vs the spec's "don't even load the code"
   ideal: the ~30 KB file is still downloaded/parsed once (trivial next to Babel's ~3 MB), then
   immediately skipped.
3. **No SWR/react-query.** Replaced by `useEndpoint` (a `useState`+`useEffect` hook) with a 25-min
   cache, 6 s timeout, focus revalidation, and **HTTP 503 → "warming up"** handling (spec §4.3/§7).
4. **Strip placement.** Mounted as a native element just **above the tab bar** (not literally above
   the `<h1>`), so it never shoves the hero down — the spec's stated goal — while still being the
   first interactive element.
5. **Detail view is a native 6th tab, not an overlay.** The repo owner explicitly lifted the
   "dashboard.jsx is frozen" rule, so the integration adds a real `AI Regime` tab. `dashboard.jsx`
   edits are minimal and marked: one `const BG = window.BubbleGauge …`, a `tabs` list that appends
   `BG.tab` when enabled, the `<BG.Strip>` mount, and a `{tab === "bubblegauge" && …}` render. **No
   crisis data, string, number, or calculation was touched.**
6. **Offline `demo` mode.** `?status-api=demo` (or `fixture`) renders the embedded Appendix-B golden
   fixture with a "demo" badge — for previewing on the live site without a running API, and so the
   integration is testable in a sandbox that can't reach `bubblegauge.klee.me`.

## Gating (spec §4.1) — as implemented

- Activate with `?status-api=<key>` where `<key>` matches `^[a-z0-9-]{1,32}$` (strict whitelist;
  a dot fails it, so `?status-api=evil.com` is rejected — verified). The key is prefixed onto the
  parent registrable domain: on `crash.klee.me` it resolves the API base to `https://<key>.klee.me`.
- `demo`/`fixture` are special keys → embedded fixture, no network.
- `localhost`/`127.0.0.1`/`*.local` → `http://localhost:8000` (never subdomain-derived).
- State persists in `sessionStorage` across param-less SPA navigation; `?status-api-off` clears it.
- **Public-suffix assumption:** the parent-domain derivation is a simple leftmost-label strip,
  correct for `klee.me`. A multi-label public suffix (e.g. `foo.github.io`, `bar.co.uk`) would
  need a public-suffix-list check before this is used on such a host.

## Dashboard feed — live re-anchoring of the AI-2026 panel (bubblegauge ≥ 3.4.0)

Per `DASHBOARD_FEED_SPEC.md` v1.0 (bubblegauge repo), `GET /api/v1/dashboard/feed` serves
12 monthly series (61 points, t−60..t0) + 34 scalar metrics, refreshed twice daily. When the
`?status-api` gate is active and the feed is reachable, the integration:

- **Re-anchors the AI-2026 panel** in the Crisis Explorer: each of the 8 charted lines is
  replaced by its feed series (`qqq`→mkt, `gold`→au, `tbill3m_tr`→cash, `ust10y_tr`→ust,
  `usdchf`→chf *(inverted — the chart shows the franc vs USD)*, `usd_broad_index`→usd,
  `usdjpy`→jpy *(inverted)*, `btc`→btc), rebased client-side exactly like the static anchors.
  Lines are relabeled with their honest proxies (QQQ/GLD/IEF/BIL ETFs; Fed broad dollar
  index — never DXY). The same live anchors drive the **Aggregate tab's 2026 overlays** and
  the **Analytics crisis clock's "today" window** (both documented as computed from the anchors).
- **Adds a LIVE BACKFILL card** under the POTENTIAL banner: anchor month + `anchor_partial`
  state, feed freshness, current scalar readings (CAPE, gold spot, USD/JPY, USD/CHF, BTC +
  drawdown-vs-provider-ATH, HY OAS, top-10 weight, MMF assets) each with `as_of`/source/stale
  in the tooltip, plus the proxy-disclosure line.
- **Falls back per-line**: any series that is `available:false` (or the whole feed being down)
  reverts that line to the hardcoded Jul-2026 anchors with the original label; the card names
  which lines are static. The panel's *written* analysis is always the Jul-2026 editorial
  snapshot — the feed refreshes charts and numbers, not prose.
- Integration seams in `dashboard.jsx` are marked "bubblegauge integration seam" (Explorer,
  Aggregate, Analytics). All feed logic lives in `bubblegauge.jsx` (`useAiLive`, `AiLivePanel`).
- Demo mode (`?status-api=demo`) uses an embedded feed fixture whose series are scaled to the
  real 2026-07-15 capture endpoints and whose metrics are the real capture-#2 values.

## Preconditions & caveats for going live

- **CORS (spec §8) is a change to the *bubblegauge* FastAPI service (a different repo), not this
  one.** Per `DASHBOARD_FEED_SPEC.md` v1.0 the service now allows `https://crash.klee.me`
  (GET-only, no credentials), so the browser integration is unblocked; if a future deployment moves
  the API or tightens origins, browser calls fail the same-origin policy until it is re-added.
  `demo` mode works regardless (no network).
- **Re-verify the payload contract.** This file was built to the documented `service_version 3.1.0`
  contract + the golden fixture. Confirm live shapes against `https://bubblegauge.klee.me/openapi.json`
  and `/docs` before trusting production data — the boundary validator will reject a mismatched
  `/score` payload and fall back to the "unavailable" chip rather than render garbage.
- **Local preview:** `python3 -m http.server 8000` from the repo root, then
  `http://localhost:8000/?status-api=demo`.
