# Crisis Winners — and the 2026 AI question

[![AI Audit Mandate: Level 2, Governed](https://raw.githubusercontent.com/mglaeser/ai-audit-mandate/main/assets/badges/level-2-governed.svg)](https://github.com/mglaeser/ai-audit-mandate)

An interactive atlas — five crisis tabs plus an always-on AI Regime tab — of assets that rose when markets collapsed — ten historical crises on a
common t−60 → t+60 month scale, plus the potential 2026 AI-bubble configuration, an algorithmic
battery, and an ex-ante identification playbook.

> **Disclaimer:** historical/analytical synthesis, not investment advice; eToro links are navigation,
> not endorsement.

## Architecture (compiled-ahead, served purely by GitHub Pages)

The site runs **purely on GitHub Pages**, but it is **not** a runtime build any more (see the
deprecation note below). The `.tsx`/`.ts`/`.json` sources under `src/` are transpiled and bundled
**ahead of time in CI** by pinned esbuild (`build.js`) into two self-contained IIFE bundles,
`dashboard.js` and `bubblegauge.js`. `index.html` loads **self-hosted, SRI-pinned** vendor runtimes
from `./vendor/*` (React / ReactDOM 18.3.1, prop-types 15.8.1, Recharts 2.12.7 — byte-identical to
their former unpkg bytes) and then the two compiled bundles. There is **no in-browser transpiler, no
unpkg, no third-party runtime fetch, no server, and no service worker.**

- Sources of truth: `src/dashboard.tsx` (view), `src/lib/math.ts` (typed, tsc-strict, mutation-tested
  pure math), `src/data/atlas.json` (the frozen, golden-hashed crisis data, loaded via `src/data.ts`),
  `src/bubblegauge.tsx` (the always-on AI-regime integration with its embedded API endpoint).
- All URLs are relative, so the atlas works at any base path. The AI-regime gauge derives its API only from a
  registrable apex custom domain it is served from (or its `www` alias); on a `*.github.io` preview or a LAN
  host it sends no API request and shows its static state (see `INTEGRATION_NOTES.md`, Endpoint resolution).

## Preview locally

```
node build.js            # compile src/ → dashboard.js + bubblegauge.js
python3 -m http.server 8000
```

then open <http://localhost:8000> (`file://` is blocked by CORS). On localhost the embedded API
base is `http://localhost:8000`, so with nothing answering there the preview shows the
**static/unavailable state** of the gauge (the atlas itself is complete). To see the connected
state offline, `node verify/shot.js` renders the page with the API base answered from the frozen
acceptance fixtures (`acceptance/golden/api-*.fixture.json`).

## Deploy (GitHub Pages, from GitHub Actions)

Deployment is **gate-blocked and served from GitHub Actions**, not from a branch:

1. **Settings → Pages → Source: “GitHub Actions”** (one-time; see `rewrite/03-pages-setup-guide.md`).
2. Push to `main`. `.github/workflows/deploy.yml` runs the verification gate **and** the frozen
   acceptance suite as hard preconditions, then `node build.js --dist`, then publishes the built
   artifact to Pages with SLSA build-provenance attestation. A red gate cannot deploy.

## Vendored runtime (self-hosted, SRI-pinned)

| Package | Version | Served from |
|---|---|---|
| react / react-dom (UMD, production) | 18.3.1 | `./vendor/*` |
| prop-types | 15.8.1 | `./vendor/*` |
| recharts (UMD — `umd/Recharts.js`; 2.12.x publishes no `.min.js`) | 2.12.7 | `./vendor/*` |

Every `<script>` for a vendor carries a Subresource Integrity hash; `verify/tests/40-sri-recompute`
recomputes them offline against `./vendor/*` on every build. To bump a version, replace the vendored
file **and** recompute its `sha384` (`openssl dgst -sha384 -binary <file> | openssl base64 -A`,
prefixed `sha384-`). For a React/Recharts major bump, first confirm the new UMD bundle still exposes
the same globals/named exports (React 19 dropped UMD; Recharts 3.x changes exports).

## AI-regime gauge (always on, embedded endpoint)

A self-contained integration (`src/bubblegauge.tsx` → `bubblegauge.js`) surfaces a forward-looking
“AI bubble regime” gauge — a top strip, a desktop overview, a compact CNN Fear & Greed status line, a
mobile portrait opening splash, and a detail tab — fed by the `bubblegauge` REST API. Since DR-015
the **API endpoint is embedded**: the page derives it as the fixed `api` subdomain of its own parent
domain (no query parameter, no activation key, no demo mode), and every visitor's browser tries it.
**Only when the API is not reachable does the site fall back to its static/default content**: the
strip reads “gauge unavailable” (HTTP 503 reads “warming up”), the 2026 lines revert to the hardcoded Jul-2026
anchors and the Aggregate/Analytics badges read `static · Jul 2026 snapshot`, no live card or splash mounts, and
the atlas is unaffected. Both
states are pinned by the frozen acceptance suite (the harness answers the derived API base from
frozen fixtures or refuses it). The same-origin iOS widget (`widget.html`) follows the same rule and
keeps its badged sample state when the API is down. See
[`INTEGRATION_NOTES.md`](./INTEGRATION_NOTES.md).

## ⚠️ Deprecated: the original zero-build / in-browser-Babel front end

The site was originally a **zero-build** static page that shipped `.jsx` sources and transpiled them
**in the browser** with `@babel/standalone` loaded from unpkg. **That architecture is deprecated and no
longer maintained** (owner-authorized; DR-006 opened the build door, DR-007 records the deprecation).
It was replaced by the compiled-ahead architecture above: transpilation moved into the CI gate, vendors
are self-hosted, and there is no in-browser Babel and no unpkg. The `.jsx` sources were removed in the
module migration. Do **not** reintroduce `@babel/standalone`, `type="text/babel"`, unpkg runtime
tags, or an in-browser transpile step — standing guards (`verify/tests/35-supply-chain`,
`62-security-surface`, `66-compiled-fresh`) fail the build if they return. Historical context lives in
`rewrite/` and `audit/decisions/DR-006*`.

## Governance

This repository is maintained without human code review, behind a deterministic gate. Before changing
anything: `cd verify && npm install && node run.js && node gate.js` (must be green), and honor
`governance/constitution.md`. See `CLAUDE.md` and `audit/` for the full standing regime.

## License

MIT — see [LICENSE](./LICENSE).
