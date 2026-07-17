# Acceptance suite — the frozen parity contract for the rewrite

This suite IS the reviewer of the re-implementation. It was written against the CURRENT site,
verified green against it, and then **frozen by hash** (`verify/golden/acceptance-freeze.json`,
enforced by `verify/tests/64-acceptance-freeze.test.js` — the gate goes red if any frozen file
changes). The rewrite (Phase 2) is done when this exact suite is green against the new
implementation. Every assertion traces to `rewrite/01-feature-inventory.json` (121 features +
14 critic contracts, produced by a 7-slice deep-read with adversarial completeness check).

## Rules of the freeze

1. **Frozen files** (hash-manifested): `SPEC.md`, `run.js`, `lib/harness.js`, `tests/*`, `golden/*`.
   They may not change during the rewrite. A change to any of them requires a decision record and
   re-freezing BEFORE the rewrite starts — never mid-rewrite, and never to make a failing rewrite
   pass. Weakening the suite to green a rewrite is the exact failure mode the freeze exists to stop.
2. **The one mutable file: `adapter.js`.** It extracts the dataset and the deterministic computed
   values from *an implementation* (today: via `verify/lib/load.js` over `dashboard.jsx`; after the
   rewrite: from `src/data/*.json` + `src/lib/*`). Its OUTPUT is pinned by the frozen goldens
   (`golden/atlas-data.sha256`, `golden/computed-fans.json`, `golden/computed-aggregate.json`,
   `golden/computed-xcorr.json`) at full precision — the adapter may change, its answers may not.
3. **Environment knobs only** (no code change): `ACCEPT_BASE_URL` (test a deployed URL instead of
   the local server), `ACCEPT_PORT`, `ACCEPT_MIRRORS` (offline CDN mirrors), `ACCEPT_CHROMIUM`.
4. The egress contract is part of the suite: any request that is not same-origin, an allowlisted
   pinned CDN asset, or `data:` fails the run. A rewrite that self-hosts its vendor code simply
   never triggers the CDN rule — no test change needed.
5. Deliberate NON-goals of the frozen suite (Phase-2 work may add non-frozen tests for them):
   pixel screenshots (kept advisory to avoid font-rendering flake), Recharts hover-tooltip
   micro-formats (pinned numerically via `computed-xcorr.json` instead), and network-race timing.

## What is covered

- `tests/01-viewer.js` — the 5-tab atlas: chrome/tab bar, Explorer (11 crises, default GFC,
  POTENTIAL banner, per-crisis header data, COVID defaultOff line, state-reset-on-tab-switch),
  Matrix (grid + note panel + blank-cell fallback), Aggregate (header, mode toggle, pair grid),
  Analytics (clock cards, deterministic fan stats as rendered, tail-test table, Markov/BSADF/
  Granger/scoreboard numbers), Playbook (M9 default, veto chips, verdict matrix, phase
  allocations, eToro link contract, expert list counts/scores).
- `tests/02-integration.js` — the `?status-api=demo` contract: strip (content + keyboard
  activation), 6th tab, AI Regime panels, LIVE BACKFILL card + Fear&Greed block, demo markers,
  "Open the atlas" navigation quirk (lands on default GFC — a faithful rewrite must NOT "fix"
  this), sessionStorage persistence across param-less navigation, `?status-api-off` clearing.
- `tests/03-negative.js` — zero-footprint without the param (5 tabs, no strip/AI Regime text),
  `?status-api=evil.com` rejected (KEY_RE), page errors empty, egress violations empty.
- `tests/04-responsive.js` — 375px: no page-level horizontal scroll; wide content scrolls in
  its own container (matrix table).
- `tests/05-data-goldens.js` — adapter output vs frozen goldens: canonical dataset sha256,
  fan rows (seeds 7/11/13, sims 1500) full precision, aggregate 121 rows full precision,
  xcorr maxima (dot-com r(0)=0.788, 1929 r(−21)=0.759, Japan r(−12)=0.777).

## Running

```
node acceptance/run.js                 # against the local repo (serves index.html)
ACCEPT_BASE_URL=https://… node acceptance/run.js   # against a deployed site
```

Exit code 0 = parity holds. Results in `acceptance/.artifacts/results.json`.
