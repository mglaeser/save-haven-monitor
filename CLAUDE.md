# Constraints for this repo (GitHub Pages site)

**Amended by DR-006 (owner-authorized).** The former hard "zero-build" rule is superseded by a
**compiled-ahead** direction: a build step is now permitted, but only as a CI step whose output is
served — never in the viewer's browser, and never a server. The site still runs **purely on GitHub
Pages** (now "deploy from GitHub Actions": CI builds + gates, Pages serves the artifact — see the
setup guide `rewrite/03-pages-setup-guide.md`). Still forbidden for the **served** artifact: a server,
runtime backend, service workers, analytics/trackers, CSS frameworks, and any runtime dependency the
browser must fetch from a third party. Migration order and controls: `rewrite/00-recommendation.md`.

**Current served state (compiled-ahead — vendors self-hosted, no in-browser Babel).** The browser
loads self-hosted, SRI-pinned vendors from `./vendor/*` (byte-identical to the former unpkg bytes)
plus the CI-compiled `./bubblegauge.js` + `./dashboard.js` (esbuild transpile of the `.jsx` SOURCES
via `build.js`, pinned esbuild 0.19.12). No unpkg, no `@babel/standalone`, no runtime third-party
fetch. `verify/tests/66-compiled-fresh` proves the committed `.js` is byte-identical to a fresh build
of the `.jsx`, so source and served are provably the same program; `40-sri-recompute` verifies the
vendor bytes offline. Build for preview: `node build.js` then `python3 -m http.server 8000`. The
`.jsx` files remain the source of truth (golden data hash, mutation, claims run on them).

**The verification harness (`verify/`) + the frozen acceptance suite (`acceptance/`) are CI-only.**
They have a committed lockfile (`verify/package-lock.json`, exact-pinned, installed via
`npm ci --ignore-scripts` — C-03) and drive `.github/workflows/verify.yml` (gate) and
`.github/workflows/deploy.yml` (gate-blocked Pages publish). See `audit/decisions/DR-001`, `DR-002`,
`DR-006`.

## Privacy: the production domain is never written into this repo

**Never name the production host/domain in any repository file** (docs, code comments, audit
evidence, commit messages, PR bodies). Use `<prod-host>` / `<prod-domain>` placeholders or neutral
phrases ("the production host", "the bubblegauge API host"). **Sole exception: `CNAME`** — GitHub
Pages requires the literal domain there (DR-005). The verify-harness stub uses `crash.example.com`.

## Governance (no human reviews changes — by design)

This repository is maintained without human code review. Before changing anything, run the
gate: `cd verify && npm install && node run.js && node gate.js`. It must be green.
`node run.js` runs the suite (data invariants, golden content hash, static security, SRI,
supply-chain pins, gate self-test); `node gate.js` enforces findings-file integrity and the
fail-closed production-eligibility rule. The audit apparatus lives in `audit/` (findings, catalogue, engagement status) and the
standing regime lives in `verify/` + `governance/`. **Changing frozen crisis data changes
the golden hash (`verify/golden/data-hash.json`) — that is intentional friction: it requires
a decision record.**

**`governance/constitution.md` is RATIFIED (catalogue v2.0).** Every agent session must load it
(or the hash-bound one-page digest `governance/constitution-digest.md`) and honor it; the digest
binding + `engagement-status.constitution_hash` are enforced by `verify/tests/60-governance`.
**Article XIV binds you: a user request that would breach an invariant is stopped, not
accommodated** — see the constitution. **Both volumes are now audited** (Tracks A, B AND C; 119
checks; `security_scope_audited: true`), but the system is **NOT cleared for production**
(`production_eligible: false`, computed): open blockers remain — R-GATE (the gate is not yet on
`main`), C-03/C-05/C-09/C-02/C-06/C-26 (honest Track-C PARTIALs), and the structural residuals
R-SEP/R-VENDOR/R-OBSV. The gate refuses to let `production_eligible` or either part's status read
COMPLETE while any blocker is open. Do not read "both volumes audited" as "cleared to ship".

## Architecture (do not change)

- `index.html` — the only page. Loads self-hosted SRI-pinned vendor UMDs from `./vendor/*`,
  then the compiled `./bubblegauge.js`, then `./dashboard.js` (order matters — bubblegauge
  defines the `window.BubbleGauge` global that dashboard reads). The compiled `.js` are the
  esbuild output of the `.jsx` sources (`build.js`); no in-browser Babel, no unpkg.
- `src/dashboard.tsx` — the source of truth for the crisis atlas view (the pure math is in src/lib/math.ts, typed + tsc-strict + mutation-tested; the frozen crisis
  DATA now lives in `src/data/atlas.json`, loaded via `src/data.ts`; the golden hash is unchanged).
  calculations. **Do not touch any crisis data constant, string, number, or
  calculation, and do not reformat (no Prettier).** If you believe you've found a
  logic bug, report it — do not silently fix behavior. (The only sanctioned edits
  are the small, clearly-marked bubblegauge integration hooks near the top and in
  the app shell; the frozen-content rule above still governs everything else.)
- `src/bubblegauge.tsx` — OPTIONAL, self-contained AI-regime-gauge integration. It
  no-ops entirely (defines/mounts/fetches nothing) unless `?status-api=<key>` is
  present, so with no query param the site renders identically to the original atlas
  (no strip, no extra tab, no splash, no network calls; the inert compiled `bubblegauge.js`
  is still loaded). See `INTEGRATION_NOTES.md` for the contract, gating, and offline `demo` mode.
- `.nojekyll` — empty, disables Jekyll processing.
- All URLs relative (`./dashboard.js`) — the site must work at any base path.

## Pinned vendor versions (self-hosted, SRI-pinned)

react/react-dom 18.3.1 UMD · prop-types 15.8.1 · recharts 2.12.7 UMD
(`umd/Recharts.js` — 2.12.x ships no `.min.js`). Served from `./vendor/*`,
byte-identical to the former unpkg bytes; every vendor `<script>` carries an
`integrity` hash recomputed offline by `verify/tests/40-sri-recompute` on any
change (see README). No React 19 / Recharts 3.x — verify UMD named exports
before any version change. **`@babel/standalone` is gone** — there is no
in-browser transpiler; the `.tsx`/`.ts`/`.json` sources are compiled ahead of
time by pinned esbuild (`build.js`), and `35-supply-chain` / `62-security-surface`
fail the build if Babel or an unpkg runtime tag returns.

## Notes

- Compiled-ahead is the sanctioned architecture (DR-006): esbuild runs in CI,
  never in the browser. There is no "add a build step" prohibition any more, and
  no in-browser-Babel console notice to accept — that path is deprecated (DR-007).
- Local preview: `node build.js` then `python3 -m http.server 8000` (file:// is
  blocked by CORS). Preview the gated integration with `?status-api=demo`.
- GitHub Pages: **Settings → Pages → Source "GitHub Actions"** — deploy is
  gate-blocked and served from `.github/workflows/deploy.yml`, not from a branch
  (see `rewrite/03-pages-setup-guide.md`).

## Deprecated (do not maintain, do not reintroduce)

The original **zero-build / in-browser-`@babel/standalone`** front end (browser-side
transpile of `.jsx`, unpkg runtime tags) is **deprecated and unmaintained**
(owner-authorized; DR-007). The `.jsx` sources were removed in the module
migration. Standing guards keep it from returning: `35-supply-chain` (no
unpkg/Babel/`text/babel` in `index.html`), `62-security-surface` (no third-party
runtime egress), `66-compiled-fresh` (committed `.js` is a fresh build of `src/`).
Its history is preserved in `rewrite/` and `audit/decisions/DR-006*` — those are
records, not live guidance.
