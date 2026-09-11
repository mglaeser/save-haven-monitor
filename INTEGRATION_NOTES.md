# bubblegauge integration — discovery findings & adaptation decisions

The `bubblegauge × Crisis Winners` spec was written for a conventional bundled SPA.
This repo was the opposite when the integration was written — a zero-build, in-browser-Babel site
(since replaced by the compiled-ahead `src/*.tsx` + esbuild architecture, DR-006/DR-007) — so the
integration keeps the spec's *intent* and adapts its *mechanics*. This file is the Discovery
Checklist output (spec §1.1) plus every deliberate deviation, kept current where the mechanics moved.

## Discovery findings

> Historical (as found, pre-DR-006): the framework row describes the original Babel/unpkg site;
> today the sources are `src/*.tsx` compiled ahead by esbuild and the vendors are self-hosted.

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

1. **No typed API client.** The spec's `.ts` interfaces are documentation only; `src/bubblegauge.tsx`
   (loosely typed TSX, compiled by esbuild) keeps a boundary validator (`validScore`, `isNum`, `pair`)
   instead of zod/io-ts.
2. **No `lazy()` / dynamic `import()` code-splitting.** The integration is a second compiled
   bundle (`bubblegauge.js`, ~90 KB minified) loaded before `dashboard.js`. **Since DR-015 it is
   always on**: it derives the API base at load and publishes `window.BubbleGauge = { enabled:true,
   apiBase, … }`; `dashboard.js` keeps its defensive `{ enabled:false }` default only for the case
   where the bundle is absent altogether. (The original no-op behind a `?status-api`
   key is retired — see "Endpoint resolution" below.)
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
6. **Offline fixtures live in the frozen acceptance suite, not in the bundle.** The Appendix-B
   golden fixture (score, history, status) and the feed fixture used to ship inside
   `bubblegauge.js` as a `?status-api=demo` mode. DR-015 removed that mode; the same four payloads
   now live in `acceptance/golden/api-*.fixture.json` and the acceptance harness serves them at the
   derived API base, so the suite exercises the real fetch + boundary-validation path (demo mode
   bypassed it) without ever reaching `the bubblegauge API host`. `verify/shot.js` uses the same
   fixtures for local screenshots.

## Endpoint resolution (spec §4.1, as amended by DR-015) — as implemented

- **The endpoint is embedded.** `src/bubblegauge.tsx` (`resolveApiBase`) and `widget.html`
  (`resolveBase`) build the API base as `https://` + `SUB` + `.` + the registrable **apex** the page
  is served from, where `SUB = "api"` is a fixed label validated by `KEY_RE = /^[a-z0-9-]{1,32}$/`
  and the apex is `location.hostname` at load (lower-cased, a trailing dot and a leading `www.`
  stripped): on `<prod-host>` (an apex) that is `https://api.<prod-domain>` — the same origin
  `scripts/generate-fallback.js` derives from `CNAME` at deploy time. `verify/tests/74-endpoint-derivation`
  executes the client, the widget, the acceptance harness and the generator against one host table
  (behind a Proxy that throws on any read but `hostname`, and against hostile query/hash input) and
  proves they agree wherever the client derives a base.
- **No query parameter, no persisted key, no demo mode.** Nothing a visitor controls reaches URL
  construction (`verify/tests/30-static-security`); `?status-api=…` and `?status-api-off` are
  inert (frozen acceptance `02-integration`). `sessionStorage` holds only the splash-seen flag.
- `localhost`/`127.0.0.1`/`*.local` → `http://localhost:8000` (never subdomain-derived).
- **Only an apex names the API.** Any other host — a deeper host such as a `*.github.io` preview, a
  LAN or other IP literal, an IPv6 literal, a bare name, `file://`, or a host under a multi-label
  public suffix such as `example.co.uk` — derives **no base**: nothing is requested and every surface
  takes its unavailable/static branch, the same shape as an unreachable API. Red line 3 (no
  third-party egress) therefore holds on every origin, not only in production. Moving the site to a
  subdomain host would need a decision record and a change to this rule (the deploy-time generator
  keeps a leftmost-strip over the owner-controlled `CNAME`; client and generator agree wherever the
  client derives a base).
- **Fallback rule.** Every visitor's browser tries the API. The static/default content is used
  **only when the API is not reachable** — a network error, the 6 s timeout, a non-2xx status, or a
  payload that fails the boundary validators: the strip shows "gauge unavailable" (non-interactive),
  the detail tab says the gauge is unavailable, the hero/splash/live card/Fear & Greed line do not
  mount, the AI-2026 lines revert to the hardcoded Jul-2026 anchors and the Aggregate/Analytics
  badges read `static · Jul 2026 snapshot`. HTTP 503 is the distinct "warming up" state. The widget
  keeps its badged **sample** state — also for a 2xx body that is not a score payload (no finite
  median, no band, no `computed_at`); it never invents a freshness stamp. The crisis atlas is
  unaffected in every case. The frozen acceptance suite exercises every one of these modes
  (refused, HTTP 500, shape-invalid 200, hang past the timeout, 503).
- **Timing under a hang.** Failed responses are never cached, so a consumer that mounts after the
  first load (a tab's badge, the detail panel) re-tries and settles only after the client's 6 s
  timeout when the API hangs; the strip and the first page settle within the first load. HTTP 503
  from anything in front of the API also reads as "warming up" (accepted).

## Dashboard feed — live re-anchoring of the AI-2026 panel (bubblegauge ≥ 3.4.0)

Per `DASHBOARD_FEED_SPEC.md` v1.0 (bubblegauge repo), `GET /api/v1/dashboard/feed` serves
12 monthly series (61 points, t−60..t0) + 34 scalar metrics, refreshed twice daily. When the
feed is reachable, the integration:

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
- Integration seams in `src/dashboard.tsx` are marked "bubblegauge integration seam" (Explorer,
  Aggregate, Analytics). All feed logic lives in `src/bubblegauge.tsx` (`useAiLive`, `AiLivePanel`).
- The acceptance feed fixture (`acceptance/golden/api-feed.fixture.json`, served by the harness at
  the derived base) carries series scaled to the real 2026-07-15 capture endpoints and the real
  capture-#2 metric values.

## Preconditions & caveats for going live

- **CORS (spec §8) is a change to the *bubblegauge* FastAPI service (a different repo), not this
  one.** Per `DASHBOARD_FEED_SPEC.md` v1.0 the service now allows `https://<prod-host>`
  (GET-only, no credentials), so the browser integration is unblocked; if a future deployment moves
  the API or tightens origins, browser calls fail the same-origin policy until it is re-added — and
  since DR-015 that failure is what every visitor sees as the static/unavailable state, so it is
  visible on the first page view rather than hidden behind a key.
- **Re-verify the payload contract.** This file was built to the documented `service_version 3.1.0`
  contract + the golden fixture. Confirm live shapes against `https://<api-host>/openapi.json`
  and `/docs` before trusting production data — the boundary validator will reject a mismatched
  `/score` payload and fall back to the "unavailable" chip rather than render garbage.
- **Local preview:** `node build.js`, then `python3 -m http.server 8000` from the repo root and
  open `http://localhost:8000/`. On loopback the embedded base is `http://localhost:8000`, so the
  gauge shows its static/unavailable state unless a bubblegauge instance answers there;
  `node verify/shot.js` renders the connected state from the acceptance fixtures.

## Feed delta v1.1 (service ≥ 3.7.0) — CNN Fear & Greed

`GET /api/v1/dashboard/feed` gains `fear_greed` in both sections (13 series + 35 metrics; additive
only). The integration renders it inside the LIVE BACKFILL card (AI-2026 panel, Crisis Explorer):

- **Gauge** — `metrics.fear_greed.value` (0–100, 1 dp) on a horizontal band gauge with zone edges at
  25/45/55/75, labeled with `detail.rating` (rating-colored); tooltip carries as_of/source/timestamp
  and the provenance caveat (*unofficial CNN endpoint; non-scoring context for the bubble score*).
- **Delta row** — `detail.previous_close/_1_week/_1_month/_1_year`; **null ≠ zero**: a null
  comparison is skipped, never rendered as 0.
- **History strip** — `series.fear_greed` (61-month grid, `kind: "sentiment_index"`, the first
  non-price kind) plotted on its **own 0–100 axis** with faint zone lines; **never rebased** with the
  price/TR series (it is deliberately not in `AI_MAP`). Nulls (~48 leading — CNN's payload carries
  only ~13 months) render as gaps, never interpolated.
- **Failure shape** — `available:false` / invalid payload drops the block only; the rest of the card
  is unaffected. Boundary contract: value finite 0–100 + rating ∈ CNN's five-value enum, enforced by
  `validFearGreed` and pinned by `verify/tests/63-feargreed-contract`.
- The browser **never** calls CNN (UA-gated, no CORS): the bubblegauge service snapshots it
  server-side; test 63 + the egress allowlist (test 62) both fail the build on a direct CNN call.

### Top-strip F&G status (compact surface)

In addition to the detailed block inside the LIVE BACKFILL card, a compact **CNN Fear & Greed
status** line renders in the top strip area (directly under the AI-regime strip, above the tab bar)
whenever the feed is reachable and carries a valid `fear_greed` metric. It shows the current
reading + `detail.rating` on the same 0–100 zone gauge, plus **the last three readings**
(`previous_close` / `previous_1_week` / `previous_1_month` — the three most recent CNN reference
values, null-safe: a null comparison is skipped, never shown as 0). It is `BG.FearGreedStrip`
(own `aria-label="CNN Fear and Greed status"`, distinct from the regime strip), reads the feed
through the shared 25-min `useEndpoint` cache (no extra request), and no-ops entirely when the
metric is absent or invalid — so when the feed is unreachable there is zero footprint (the frozen
acceptance unreachable-state contract pins this), and a feed failure drops only this line. Same axis
discipline as the block: own 0–100 scale, never rebased, never in `AI_MAP`; value is the
server-side snapshot (the browser still never calls CNN).
