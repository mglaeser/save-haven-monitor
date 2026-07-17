# Architecture review & recommendation (Phase 1 deliverable)

**Task:** an in-depth audit of the current features/functions/constraints and the most adequate
architecture to carry them, followed (Phase 2) by a reset + re-implementation gated by a **frozen**
acceptance suite. This document is the audit + recommendation. The frozen suite is built and green
(see the end). No production code has been rewritten yet.

## Method (evidence, not opinion)

- **Feature inventory** — a 7-slice deep-read of `dashboard.jsx` (1876 lines), `bubblegauge.jsx`
  (1156), `index.html`, plus an adversarial completeness critic. Result: **135 parity items** (121
  features + 14 critic-found contracts) in `rewrite/01-feature-inventory.json`. Everything the viewer
  sees or does today, at the level a black-box test can assert it.
- **Architecture panel** — 4 independent architects (different priors), 3 judges scoring against
  weighted criteria, 1 synthesis, in `rewrite/02-architecture-panel.json`. **All three judges ranked
  the same winner first.**

## What exists today (the thing being preserved)

A public, read-only crisis-research dashboard: 5 tabs (Crisis Explorer · Similarity Matrix ·
Aggregate · Analytics · Playbook) over 11 frozen crises, with deterministic seeded analysis
(mulberry32, sims=1500 → the fan-chart medians, the cross-correlation maxima, the 121-row
aggregate). Plus an **optional** AI-regime integration gated on `?status-api=<key>` (KEY_RE
whitelist, demo/fixture offline mode, sessionStorage persistence, `?status-api-off`, no-op
zero-footprint without the key) that adds a strip, a 6th "AI Regime" tab, live feed re-anchoring of
the AI-2026 panel, and the LIVE BACKFILL card incl. the CNN Fear & Greed gauge.

**How it's built (what "grew historically"):** zero-build — the browser downloads ~3 MB of Babel and
transpiles two ~1000-line JSX files **on every page load** (≈0.7–1.8 s CPU + 661 KB gzip of Babel),
loading 5 pinned UMD CDN scripts from unpkg (with SRI). One `window.BubbleGauge` global bridges the
two files. Inline styles, no modules, no types, no tests of the render layer. A serious agent-only
governance regime sits on top (`verify/` gate, golden data hash, mutation testing, provenance
manifest, egress allowlist, RATIFIED constitution) and **must be carried forward intact.**

### The real pains (why a rewrite is worth it)

1. **Every viewer pays the transpile tax** — 3 MB Babel + ~3000 lines compiled client-side per load.
2. **Two 1000-line untyped monoliths** are hostile to the one reviewer this repo has: other agents.
   Refactor safety is low; the render layer has *no* test characterization (the loader stubs
   `createElement`).
3. **The gate isn't deploy-blocking.** Pages deploys on push; the ruleset does not yet enforce (a
   force-push to `main` succeeded on 2026-07-16). R-GATE / C-26 / B-01 stay open *structurally*.
4. **Runtime unpkg egress** and a **caret-ranged, lockfile-less CI toolchain** (`playwright-core
   ^1.40`, `esbuild` undeclared) — the harness is currently weaker than the site it guards (C-03).

## Recommendation — "Compiled-Ahead, Typed-Endpoint"

The winner is the **least-risky change that fixes all four pains**, not the most modern stack. Move
transpilation from the browser into the CI gate; keep the exact runtime the pixels depend on.

| Decision | Choice | Why |
|---|---|---|
| Language | **TypeScript 5.x strict** (verbatim JSX→TSX port; types at module boundaries) | Types encode what `10-data-invariants` asserts; the audit's only reviewer is machines. |
| UI runtime | **react/react-dom 18.3.1 — EXACT, unchanged** | React 19 changes act/ref/flush semantics = parity risk, zero upside. |
| Charts | **recharts 2.12.7 — EXACT, self-hosted** | Fan charts + matrix + ~15 custom tooltips are the deepest drift surface; version identity is the cheapest insurance. No Recharts 3.x. |
| Build | **esbuild `0.19.12`** (the exact version the verify harness already runs), transpile-only at first (`jsx:transform`, classic runtime), bundling added later | A pinned, deterministic, double-build-diffable transform an agent can keep green. Vite is the documented *future* phase-2, not the vehicle. |
| Vendors | **Self-host the 4 UMD files, byte-identical** (sha384 provably equal to today's SRI) → **unpkg leaves the egress allowlist entirely** | Strongest supply-chain claim available: hash-equal to what ships today, verifiable offline forever. ~170 KB gzip total (measured — the size fear that drove half the debate was wrong by ~40×). |
| Data | **Frozen crisis data → canonical JSON**, extracted from the existing loader; CI asserts old-hash === new-JSON-hash === golden `5c0c3a20…` before the monolith is deleted | "No silent number change," now type-checked. |
| Styling | **Inline styles, values copied verbatim** | The look is frozen content, not a thing to modernize. No Tailwind/CSS-modules. |
| bubblegauge | `window.BubbleGauge` bridge → **typed module contract**; the whole gating logic becomes a **pure `activation.ts`** (unit-testable truth table); loaded as a **lazy chunk only when `?status-api` is present** — today's inert 74 KB file is always downloaded; after, nothing bubblegauge is fetched at all. | Preserves the contract clause-for-clause; strictly improves the zero-footprint guarantee. |
| Deploy | **Pages "deploy from GitHub Actions"**: `deploy.yml` runs the full gate + the frozen acceptance suite as hard job dependencies, then builds, then **SLSA provenance-attests** the artifact and publishes. A red gate **physically cannot deploy.** | **Closes R-GATE / C-26 / B-01 structurally** (evidence, not argument) — and this happens FIRST, while code is still untouched, isolating deploy-mechanism risk from rewrite risk. |

**Rejected (with reasons in the JSON):** Astro islands (re-baselines the golden hash; Playbook-shell
conflict) · native-ESM + htm (rewrites 3000 render lines into the dialect agents are *least* fluent
in; CSP claim fails on its own inline scripts) · Vite-as-vehicle (re-bundles Recharts from npm ESM —
trades byte-identity for version-approximation on the deepest drift surface; adopted as the *future*
phase-2 once the frozen suite has proven itself) · React 19 / Recharts 3.x / hand-rolled SVG /
preact-compat / Stryker — all trade parity certainty for zero required pull.

## Migration plan (each phase is a single-cause, bisectable delta the frozen suite adjudicates)

0. **Freeze the reviewer** ← *done in this deliverable* (acceptance suite green 35/0, hash-frozen).
1. Decision records only: architecture DR, CLAUDE.md zero-build-clause amendment (owner has opened
   the door), DR noting `gate.js`'s coupling to test *filenames* and the `connect-src` privacy limit.
2. Harden CI supply chain in place (no served-code change): root `package.json` + **committed
   lockfile**, `npm ci --ignore-scripts`, SHA-pin all actions, Node 22 — **closes C-03**.
3. **Flip Pages to Actions** serving the *unchanged* site, gate + acceptance as hard deps, enforcing
   ruleset + force-push block — **closes R-GATE / B-01 / C-26** before any code moves.
4. Self-host vendors byte-identical; drop the unpkg preconnect — **unpkg leaves egress**.
5. Kill in-browser Babel (esbuild transpile-only of the byte-identical sources) — **−661 KB, −1–3 s/load**.
6. Data → typed JSON with triple-hash identity proof.
7. Math → `src/lib/*.ts` (byte-preserving bodies) + mutation harness rewired (13/13 must still kill).
8. Componentize tab-by-tab, then bubblegauge as a lazy chunk; retire the global bridge only after
   acceptance passes with it in place.
9. Controls sweep: retarget every `verify/` test (filenames frozen), regenerate the two-layer
   provenance manifest, grow the calibration corpus 9→13, and **every retargeted control must
   re-catch its seed before its DR closes** (the guard against vacuous-green retargeting).

## Top risks (full list + mitigations in `rewrite/02-architecture-panel.json`)

1. **The frozen suite is the only reviewer — anything it fails to pin can drift silently.** → It is
   built, green, and hash-frozen (this deliverable); every later phase is a single-cause delta.
2. **Render drift where the harness has no history** (the loader stubs `createElement`). → The
   Babel→esbuild swap runs on byte-identical sources so any acceptance diff has exactly one cause;
   componentization is one tab per commit (~300-line bisect).
3. **Vacuous-green control decay** — ~7 verify tests + mutation + manifests are path/regex-coupled to
   the 3-file layout; `gate.js`'s required set couples to test *filenames*. → Iron rule: re-catch the
   seed before a retarget counts; filenames frozen; one control per commit.
4. **Frozen-number coupling breaks during extraction.** → Identity transform + CI triple-hash equality
   before the monolith is deleted; mutation's 13 literal find-strings preserved byte-for-byte.
5. **The Actions pipeline becomes a new SPOF / supply-chain surface.** → SHA-pinned actions,
   `npm ci --ignore-scripts` from a lockfile, dependency budget, double-build determinism check, SLSA
   attestation, documented break-glass back to branch-deploy.

## The frozen acceptance suite (the contract for Phase 2)

`acceptance/` — runs today **35 pass · 0 fail** against the current site, egress ledger clean.

- `tests/01-viewer.js` — 5-tab atlas: chrome, 11 crises (default GFC), POTENTIAL banner, COVID
  default-off line, tab-switch state reset, matrix, aggregate modes, the deterministic Analytics
  numbers (fan stats, Markov/BSADF/Granger/scoreboard), Playbook (M9 default, veto chips, verdict
  matrix, phases, **eToro link hrefs + hardening**, expert list).
- `tests/02-integration.js` — the full `?status-api=demo` contract incl. Fear & Greed, the
  "Open the atlas" navigation quirk (a faithful rewrite must **not** "fix" it), sessionStorage
  persistence, `?status-api-off`.
- `tests/03-negative.js` — zero-footprint without the key; `?status-api=evil.com` rejected.
- `tests/04-responsive.js` — 375 px: no page-level horizontal scroll; wide content self-contained.
- `tests/05-data-goldens.js` — canonical dataset sha256 + fan/aggregate/xcorr goldens at full
  precision (implementation-agnostic, via the one mutable file `adapter.js`).

**The freeze is enforced by the gate:** `verify/tests/64-acceptance-freeze` hashes every suite file
against `verify/golden/acceptance-freeze.json` and fails the build on any change — so the tests
cannot be weakened to green a bad rewrite. `adapter.js` is the single unfrozen file (re-pointed at
the new implementation; its answers stay pinned by the frozen goldens).

## Recommended decision

Proceed to Phase 2 with **Compiled-Ahead, Typed-Endpoint**, in the phase order above — starting with
the deploy flip (phases 1–3) that closes three long-standing blockers *before* any code moves. Each
phase merges only when the frozen `acceptance/` suite and the `verify/` gate are both green.
