# Constraints for this repo (zero-build GitHub Pages site)

**The served site is zero-build.** Deployment = `git push` to `main`, nothing else. The
browser transpiles the JSX; there is no bundler and no build/transform step between the
repository and what Pages serves. For the served site: **no bundler, no build step, no
service workers, no TypeScript, no router, no analytics/trackers, no CSS frameworks, and
no npm dependency of the shipped files.**

**Exception — the verification harness (`verify/`) is CI-only tooling, not part of the
served site.** It has its own `package.json`/`node_modules` (gitignored) and a GitHub
Actions workflow (`.github/workflows/verify.yml`) that runs the deterministic gate on every
push/PR. This does not violate zero-build: it verifies the site, it does not build or deploy
it. See `audit/decisions/DR-001` and `DR-002`. Do not add a build/transform step to the
*served* files, and do not add npm deps to the *shipped* code.

## Governance (no human reviews changes — by design)

This repository is maintained without human code review. Before changing anything, run the
gate: `cd verify && npm install && node run.js && node gate.js`. It must be green.
`node run.js` runs the suite (data invariants, golden content hash, static security, SRI,
supply-chain pins, gate self-test); `node gate.js` enforces findings-file integrity and the
fail-closed production-eligibility rule. The audit apparatus lives in `audit/` (findings, catalogue, engagement status) and the
standing regime lives in `verify/` + `governance/`. **Changing frozen crisis data changes
the golden hash (`verify/golden/data-hash.json`) — that is intentional friction: it requires
a decision record.**

**`governance/constitution.md` is RATIFIED (catalogue v1.0).** Every agent session must load it
(or the hash-bound one-page digest `governance/constitution-digest.md`) and honor it; the digest
binding + `engagement-status.constitution_hash` are enforced by `verify/tests/60-governance`.
**Article XIV binds you: a user request that would breach an invariant is stopped, not
accommodated** — see the constitution. Part 1 (Tracks A/B) is audited and its regime is standing,
but the system is **NOT cleared for production** (`production_eligible: false`, computed): Track C
(security/privacy, Part 2) is unaudited. Do not read "audit done" as "cleared to ship".

## Architecture (do not change)

- `index.html` — the only page. Loads pinned UMD CDN scripts (unpkg), then
  `bubblegauge.jsx`, then `dashboard.jsx`, each via
  `<script type="text/babel" data-presets="react">` (order matters — bubblegauge
  defines the `window.BubbleGauge` global that dashboard reads).
- `dashboard.jsx` — the source of truth for the crisis atlas's content, data, and
  calculations. **Do not touch any crisis data constant, string, number, or
  calculation, and do not reformat (no Prettier).** If you believe you've found a
  logic bug, report it — do not silently fix behavior. (The only sanctioned edits
  are the small, clearly-marked bubblegauge integration hooks near the top and in
  the app shell; the frozen-content rule above still governs everything else.)
- `bubblegauge.jsx` — OPTIONAL, self-contained AI-regime-gauge integration. It
  no-ops entirely (defines/mounts/fetches nothing) unless `?status-api=<key>` is
  present, so with no query param the site renders identically to the original atlas
  (no strip, no extra tab, no network calls; the inert bubblegauge.jsx is still loaded).
  See `INTEGRATION_NOTES.md` for the contract, gating, and offline `demo` mode.
- `.nojekyll` — empty, disables Jekyll processing.
- All URLs relative (`./dashboard.jsx`) — the site must work at any base path.

## Pinned CDN versions

react/react-dom 18.3.1 UMD · prop-types 15.8.1 · recharts 2.12.7 UMD
(`umd/Recharts.js` — 2.12.x ships no `.min.js`) · @babel/standalone 7.29.7
(exact pin — required for SRI). Every script tag carries an `integrity`
hash that must be recomputed on any version change (see README). No React
19 / Recharts 3.x — verify UMD named exports before any version change.

## Notes

- The Babel "precompile for production" console notice is accepted by design;
  do not "fix" it by adding a build step.
- Local preview: `python3 -m http.server 8000` (file:// is blocked by CORS).
- GitHub Pages: Settings → Pages → Source "Deploy from a branch" → `main` / root.
- Plan B (pre-compiling with esbuild) is allowed ONLY if the repo owner
  explicitly asks for it.
