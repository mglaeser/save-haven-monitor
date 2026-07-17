# DR-006 — Compiled-Ahead architecture + Pages deploy from gate-blocked GitHub Actions

**Date:** 2026-07-16 · **State:** ACCEPTED · **Author:** rewrite engagement (agent) · **Decider:** repo owner (explicitly opened the zero-build door and chose GitHub-hosted Actions)

## Context
The site grew as two ~1000-line in-browser-Babel JSX monoliths — every viewer downloads ~3 MB of
Babel and transpiles ~3000 lines per load, the gate is not deploy-blocking (a force-push to `main`
succeeded 2026-07-16), unpkg is a runtime egress, and the CI toolchain was unpinned/lockfile-less
(C-03). A 4-architect / 3-judge panel (see `rewrite/02-architecture-panel.json`) unanimously chose
**"Compiled-Ahead, Typed-Endpoint"**: move transpilation from the browser into the CI gate, keep the
exact runtime the pixels depend on (react-dom 18.3.1 + recharts 2.12.7), self-host vendors
byte-identical, land at typed modules + data-as-JSON, and publish via gate-blocked Actions.

The owner amended the hard "zero-build" rule (CLAUDE.md) to permit a build step **as a CI step whose
output is served** — never in the browser, never a server — and chose **GitHub-hosted Actions** (not a
self-hosted runner / external CI), keeping the deploy-blocking gate and OIDC/SLSA provenance intact.

## Decision (this phase — the deploy flip; no served code moved yet)
1. **CLAUDE.md** zero-build clause superseded by the compiled-ahead direction (served artifact still
   forbids a server/backend/service-worker/trackers/third-party runtime fetch).
2. **C-03 pinning close:** `verify/package.json` pins `esbuild 0.19.12` + `playwright 1.61.1` exact;
   `verify/package-lock.json` committed (registry-only, integrity-hashed); CI installs via
   `npm ci --ignore-scripts`. New standing control `verify/tests/65-lockfile` (registry-only /
   integrity / exact-pin / package-lock↔package.json), calibration seed **D10** (registry swap)
   watched to block; corpus 9/9 → **10/10**. The registry-age/existence SCA remains open, so C-03
   stays PARTIAL — honestly, not flipped.
3. **`verify.yml`** hardened: Node 22, `npm ci --ignore-scripts`, third-party actions **SHA-pinned**,
   plus an `acceptance` job running the frozen parity suite.
4. **`deploy.yml`** added: publishes Pages **from GitHub Actions**, with the verification gate + the
   frozen acceptance suite as **hard job dependencies** (a red gate cannot deploy), a **served-file
   allowlist** (only `index.html`, `dashboard.jsx`, `bubblegauge.jsx`, `.nojekyll`, `CNAME` reach
   Pages — `verify/`, `audit/`, `governance/`, `acceptance/`, `rewrite/`, `.github/` stop being
   published), and **SLSA build-provenance attestation** over the served bytes.

## Owner action required to make it live (one setting)
`Settings → Pages → Source → "GitHub Actions"`. Until then `deploy.yml` builds+verifies but the final
deploy step has nowhere to publish (expected). Full steps: `rewrite/03-pages-setup-guide.md`.

## Consequence for the blockers (closes on merge-to-main + the setting)
- **R-GATE / B-01:** once Pages serves the Actions artifact, publishing is *physically* gate-blocked —
  a structural close, not a procedural ruleset. (An enforcing ruleset + force-push block on `main`
  stays as defense-in-depth.)
- **C-26:** deploy-time signed provenance now exists (SLSA attestation) — advances it toward close.
- **C-03:** pinning/lockfile/registry-integrity done + watched; registry-age SCA still open → PARTIAL.
- `production_eligible` stays **computed `false`** — this record cannot and does not flip it.

## Not in this phase (later migration phases, each behind the frozen `acceptance/` suite)
Self-hosting vendors byte-identical, killing in-browser Babel, data/math extraction to typed modules,
componentization, retargeting the path-coupled `verify/` controls (each re-catching its seed).

## Addendum — vendor self-hosting + in-browser Babel removed (phases 4–5 landed)

The two visible migration phases are now done, each proven behind the **unchanged** frozen
acceptance suite (35/0, byte-behavioral parity, egress ledger clean):

- **Self-hosted vendors:** the 4 runtime UMDs (react, react-dom, prop-types, recharts) are committed
  under `./vendor/`, **byte-identical** to the former unpkg bytes (each sha384 == the integrity that
  was in index.html — proven). `index.html` loads `./vendor/*` with SRI; the unpkg preconnect and all
  5 unpkg tags are gone. **unpkg leaves the egress allowlist entirely** (test 62 tightened).
- **In-browser Babel removed:** `build.js` transpiles the `.jsx` sources with pinned esbuild 0.19.12
  (transpile-only, classic runtime, no bundling/minify/rename; dashboard IIFE-wrapped to preserve its
  per-script eval scope). `index.html` loads the compiled `./bubblegauge.js` + `./dashboard.js`.
  Viewers no longer download ~661 KB gz of Babel or pay ~1–3 s of transpile CPU per load.

Controls retargeted (each re-catching its calibration seed before counting):
- `35-supply-chain` → self-hosted vendor manifest + no-unpkg/Babel guard (seed **D13**).
- `40-sri-recompute` → **offline** sha384 of `./vendor/*` vs index.html + vendor-pins (seed **D11**);
  the suite now runs with **0 offline** — no network dependency.
- `66-compiled-fresh` (new) → committed `.js` is a byte-identical fresh build of the `.jsx` (seed
  **D12**), the bridge that lets every other control keep reasoning about the source.
- `30-static-security` (vendor tags + `.js` app scripts), `61-provenance` (served set re-attested:
  index.html + compiled `.js` + `.jsx` sources + `./vendor/*`), `sbom.json`/`pinned-deps.json`
  (repointed to `./vendor/`, Babel dropped). Corpus 10/10 → **13/13**; mutation 13/13.
- `deploy.yml` build job now runs `node build.js --dist` (fresh compile) and publishes the allowlist
  (index.html, compiled `.js`, `./vendor/*`, .nojekyll, CNAME) — never the `.jsx` sources.

Still not moved (later phases): data/math extraction to typed modules, componentization,
TypeScript. `production_eligible` stays computed `false`.
