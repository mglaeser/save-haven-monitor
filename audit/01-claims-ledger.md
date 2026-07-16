# 01 — Claims ledger (Phase 1)

Every claim the system makes about itself, tested against the frozen baseline
(`d19556d`). Verdicts: **TRUE** (evidence produced this engagement), **FALSE** (a finding),
**STALE** (was true, reality moved), **UNTESTED-HERE** (queued to a named Phase-3 check).
Names are claims (identifier-level entries at the end). **Claims describing a human review
step: none exist in this repository — checked explicitly; nothing to flag.**

## Document claims

| # | Claim | Source | Verdict | Evidence / note |
|---|---|---|---|---|
| D1 | "zero-build static site … transpiled in the browser by Babel Standalone" | README | TRUE | No package.json/lockfile/workflow at baseline (`ls -a`); index.html loads babel + `text/babel` scripts |
| D2 | "`file://` will not work (Babel fetches dashboard.jsx via XHR, blocked by CORS)" | README | TRUE | Architecture: Babel loader XHR; consistent with session tests |
| D3 | Pinned-versions table (react 18.3.1, prop-types 15.8.1, recharts 2.12.7 `umd/Recharts.js`, babel 7.29.7) | README | TRUE | Matches index.html script URLs exactly (grep) |
| D4 | "Every script tag carries a Subresource Integrity hash" | README | TRUE | 5 of 5 CDN script tags carry `integrity=sha384-…` + `crossorigin` (grep count) |
| D5 | "Push to `main` — that's it" (deploy) | README | TRUE | Pages deploy-from-branch; also the engagement's core hazard: **nothing gates that push** |
| D6 | Bump instructions (recompute hash via openssl, verify UMD exports) | README | TRUE | Commands verified executable this engagement |
| D7 | "bubblegauge.jsx … no-ops entirely (defines/mounts/fetches nothing) unless `?status-api=<key>`" | CLAUDE.md | TRUE | Playwright evidence this engagement: 0 DOM footprint, 0 fetches, `BubbleGauge.enabled=false` without param |
| D8 | "with no query param the site is **byte-for-byte** the original atlas" | CLAUDE.md | **FALSE (wording)** | Render/DOM-identical: TRUE (tested). Byte-for-byte: FALSE — index.html always ships the extra `<script src="./bubblegauge.jsx">` (~31KB parsed then no-op'd). **Finding: overclaiming doc; queue for Wave R wording fix** |
| D9 | "The only sanctioned edits are the small, clearly-marked bubblegauge integration hooks" | CLAUDE.md | TRUE | All dashboard.jsx seams carry `bubblegauge integration seam` markers (grep: 5 sites) |
| D10 | "CORS … is NOT present as of 3.1.0 and must be added … browser calls will be blocked" | INTEGRATION_NOTES | **STALE** | bubblegauge shipped CORS (DASHBOARD_FEED_SPEC v1.0 §3: "CORS already allows <prod-host>"). **Finding: doc drift; update** |
| D11 | "Verified: zero footprint, zero network to `*.<prod-domain>`, 5 tabs, byte-identical render" | INTEGRATION_NOTES | TRUE† | †Session-produced Playwright evidence; **but the verification itself is unrepeatable by anyone else — the harness does not live in the repo.** That gap is the subject of Phase 2 |
| D12 | "historical analysis, not investment advice" | index.html meta + UI | TRUE | Present in meta description, header prose, Playbook/Analytics captions, and gauge micro-label |
| D13 | "Research, not advice." rendered with gauge data | bubblegauge.jsx | TRUE | `meta.disclaimer` rendered in DetailTab footer; micro-label always on strip |
| D14 | MIT license claim | README → LICENSE | TRUE | LICENSE is verbatim MIT, holder matches owner |
| D15 | "Local preview: `python3 -m http.server 8000` … from the repo root" | README/CLAUDE.md | TRUE | Verified this engagement (and the wrong-cwd failure mode reproduced) |
| D16 | "Verified Jul 2026 — re-check on platform" (eToro slugs) | dashboard.jsx footer | UNTESTED-HERE | External-surface liveness; honest self-label with date; queued to A-28-analog external-deps check |
| D17 | "demo fixture … scaled to the real 2026-07-15 capture" | bubblegauge.jsx header | TRUE | Fixture endpoints match capture-#2 values (qqq 711.8/711.74 etc., produced this engagement) |
| D18 | "The panel's written analysis remains the Jul 2026 editorial snapshot" | LIVE BACKFILL card | TRUE | Frozen strings unchanged by feed; card states it |

## Identifier-level claims (names are claims — spot sweep; exhaustive sweep is a Phase-3 standing objective)

| # | Name | Asserts | Verdict | Note |
|---|---|---|---|---|
| N1 | `resolveActivation` | resolves gate activation | TRUE | does exactly that, incl. off-switch |
| N2 | `validScore` / `validFeed` | boundary validators | TRUE | structural guards; reject → unavailable path |
| N3 | `StripWarmingUp` | 503 warm-up state | TRUE | rendered only on `notReady` |
| N4 | `GaugeBar` aria-label | "Bubble regime N of 100, IQR…" | TRUE | matches rendered values |
| N5 | "Median max drawdown" (FanTile stat label) | max drawdown from running peak | **FALSE** | Computes deepest dip **below entry=100**, not below running peak; understates gold fan ~3× (−6% shown vs −21% true; verified numerically this engagement). Pre-existing conviction (report-only under old contract). **Finding: label/logic mismatch — the mandate voids the old "frozen strings" exemption for false claims; queue Wave R (label correction), owner: Maintainer** |
| N6 | "Run-up t−60 → peak: history +61%" (Feared-market tile) | representative historical run-up | **PARTIAL/FALSE** | Mathematically correct for the plotted composite; misleading as a representative figure (Euro Stoxx enters t−60 post-collapse; median individual run-up +145%). Verified this engagement. **Finding: queue caveat fix** |
| N7 | `useAiLive` / `AiLivePanel` / `LiveBadge` | live-feed hooks/indicators | TRUE | fetch-driven; fall back to static with labels |
| N8 | `REDFLAG_COPY` names (`semi_runup_ge_150pp` …) | threshold encoded in name | TRUE | copy matches feed-spec thresholds |
| N9 | `rebase`, `interp`, `fmtM`, `mulberry32` | math utilities | TRUE | behavior matches names (re-executed in Node this engagement) |
| N10 | `Expl` "i" buttons `aria-label="What is this?"` | accessible explainer | PARTIAL | label TRUE; no `aria-expanded`/`aria-controls` (known a11y finding, queued to A-22-analog) |

## Convictions summary (feed into Phase 3/4)

1. **D8** — "byte-for-byte" overclaim (CLAUDE.md). Wording fix, Wave R.
2. **D10** — stale CORS precondition (INTEGRATION_NOTES). Doc drift fix.
3. **N5** — "Median max drawdown" mislabel: false claim of the A-16/Article-X class, with real
   magnitude (3× understatement on the gold fan). Label correction, Wave R.
4. **N6** — composite run-up figure invites a false reading; needs an inline caveat.
5. **D11's caveat** — every "verified" claim in the docs rests on out-of-repo, agent-invoked,
   unrepeatable verification. **The system currently has zero standing verification.** This is
   not a claims problem; it is the Phase-2 problem.
