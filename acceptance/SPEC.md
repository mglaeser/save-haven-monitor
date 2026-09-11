# Acceptance suite — the frozen parity contract for the rewrite

This suite IS the reviewer of the re-implementation. It was written against the CURRENT site,
verified green against it, and then **frozen by hash** (`verify/golden/acceptance-freeze.json`,
enforced by `verify/tests/64-acceptance-freeze.test.js` — the gate goes red if any frozen file
changes). The rewrite (Phase 2) is done when this exact suite is green against the new
implementation. Every assertion traces to `rewrite/01-feature-inventory.json` (121 features +
14 critic contracts, produced by a 7-slice deep-read with adversarial completeness check).

> **Re-freeze R2 (2026-08-28, DR-014 item 1 — Q2/Q13).** This suite was deliberately re-frozen
> ONCE, up front, before any PR that reshapes the served site under the shallow-frontend program
> (`audit/decisions/DR-014-shallow-frontend-program.md`). The re-frozen suite is written against
> the TARGET (shallow) behavior while staying green against the CURRENT (deep) site — see
> §Re-freeze R2 below for exactly what changed and why every changed assertion holds in both
> states. The R1 manifest (frozen 2026-07-16, 35/0) is superseded by decision record, not by drift.

> **Re-freeze R3 (2026-09-10, DR-015).** The `?status-api` query-parameter gate is retired and the
> status-API endpoint is EMBEDDED in the page (`audit/decisions/DR-015-embedded-endpoint.md`). The
> suite now pins BOTH states of the always-on integration — API connected (answered by frozen
> goldens) and API unreachable (the static/default atlas) — see §Re-freeze R3 below. The R2
> manifest (39/0) is superseded by decision record, not by drift.

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
4. **The egress contract is part of the suite** (amended by R2 per DR-014 item 1, and by R3 per
   DR-015): any request that is not **same-origin**, an allowlisted pinned CDN asset, `data:`, or
   **the ONE embedded status-API base the harness derives from the origin with the client's own
   rule** fails the run. The retired R1 framing — "the ungated site is byte-identical and makes
   ZERO network requests" — and the retired R2 framing — "the ungated page requests only
   same-origin relative URLs" — are replaced by the R3 negative contract: **same-origin relative
   URLs plus the derived status-API base, never a third party, never a host named by a query
   parameter**. The harness ANSWERS that base itself (goldens, or a refused connection), so no
   run ever reaches a live API — also under `ACCEPT_BASE_URL`. A rewrite that self-hosts its
   vendor code simply never triggers the CDN rule — no test change needed.
5. Deliberate NON-goals of the frozen suite (Phase-2 work may add non-frozen tests for them):
   pixel screenshots (kept advisory to avoid font-rendering flake), Recharts hover-tooltip
   micro-formats (pinned numerically via `computed-xcorr.json` instead), and network-race timing.

## What is covered

- `tests/01-viewer.js` — the atlas (R3: the five base tabs in order, then `AI Regime` last): chrome/tab bar, Explorer (11 crises, default GFC,
  POTENTIAL banner, per-crisis header data, COVID defaultOff line, state-reset-on-tab-switch),
  Matrix (grid + note panel + blank-cell fallback), Aggregate (header, mode toggle, pair grid),
  Analytics (clock cards, deterministic fan stats as rendered, tail-test table, Markov/BSADF/
  Granger/scoreboard numbers), Playbook (M9 default, veto chips, verdict matrix, phase
  allocations, eToro link contract, expert list counts/scores).
- `tests/02-integration.js` — **(R3)** the CONNECTED contract with NO query parameter: strip
  (role/tabindex attributes), 6th tab last, score/verdict/flags text, AI Regime panels (headline, history,
  changelog, science audit), LIVE BACKFILL card + Fear&Greed block, honest proxy relabeling, LIVE
  badges on the Aggregate overlays and the Analytics window, no demo marker, no activation state,
  "Open the atlas" navigation quirk (lands on default GFC — a faithful rewrite must NOT "fix"
  this), and the retired parameters (`?status-api=demo`, `?status-api=evil.com`,
  `?status-api-off`) asserted inert.
- `tests/03-negative.js` — **(R3)** the UNREACHABLE contract in every mode the harness can
  produce — refused connection, HTTP 500, shape-invalid 200 payloads, a hang past the client's
  6 s timeout, and 503 (the distinct "warming up" state): the static/default atlas — 5 base tabs,
  h1, baked disclaimer, default GFC, no live card, no fabricated reading, `static · Jul 2026
  snapshot` badges, the strip present, non-interactive and reading "unavailable"/"warming up", the
  `AI Regime` tab still offered with the detail panel's own unavailable/warming sentence, the page
  having TRIED the API; plus: a parameter-bearing URL is the same connected page and steers no
  request, page errors empty, egress violations empty.
- `tests/04-responsive.js` — 375px: the small-portrait opening splash (DR-007) shows with the
  API connected, closes through its own control and does not re-open on a same-session reload (the
  re-open control takes its place); no page-level horizontal scroll in either API state; wide content scrolls in its own container (matrix table).
- `tests/05-data-goldens.js` — adapter output vs frozen goldens: canonical dataset sha256,
  fan rows (seeds 7/11/13, sims 1500) full precision, aggregate 121 rows full precision,
  xcorr maxima (dot-com r(0)=0.788, 1929 r(−21)=0.759, Japan r(−12)=0.777).
- `tests/06-content.js` — **(R2)** the content-plane target contract, fixture-driven: fallback
  artifact shape (disclaimer + `as_of` + `content_version` mandatory), disclaimer-gate commit
  rule (a payload without a disclaimer never renders), labeled offline/fallback state, and the
  content-outage path (baked disclaimer survives a 404 of the content artifact).

## Re-freeze R2 — the shallow-frontend target contracts (DR-014)

**What was retired (Q2).** R1's baseline negative contract — the ungated page is byte-identical
to the original atlas and makes zero network requests — is retired. The program moves grounded
content behind same-origin content URLs, so "zero network" stops being a property of a correct
site. The replacement contract is narrower where it matters and looser only where DR-014 rules
it: no request beyond **same-origin relative URLs** + the **gated status-API** (KEY_RE stays a
red line), and no third party, ever.

**The content plane is pinned to a frozen fixture.** The harness serves
`golden/content-fallback.fixture.json` at `/content/fallback.json` on every page (also when
`ACCEPT_BASE_URL` points at the deployed site — the suite is hermetic w.r.t. live-content drift;
live slot text is governed bubblegauge-side, not by this parity contract). Tests may override the
route per page: a poison fixture (shape-valid but WITHOUT a disclaimer) or a forced 404 (outage).
A locally built `dist/content/fallback.json`, when present, is statically shape-checked by
`06-content.js` against the same rules the fixture must satisfy.

**Both-states assertion style.** Every R2 assertion holds against the CURRENT (deep) site and
against the TARGET (shallow) site:
- unconditional contracts hold in both states (5 tabs; hard-baked disclaimer on screen; KEY_RE
  rejection; requests never leave the origin; a disclaimer-less payload's text never in the DOM);
- conditional contracts are implications whose antecedent is "the page consumed the content URL"
  (observable via the harness request ledger). Today the antecedent is false (the deep site makes
  no content fetch) and the assertion is vacuously green; the moment the shallow content path
  lands, the same frozen assertion becomes load-bearing (labeled offline-content state per Q12,
  disclaimer gate per Q7/Q50, shape validation per Q14).

**The fixture bounds the migration.** A prose string may leave the baked page ONLY if the frozen
fixture already serves it (the fixture snapshots today's rendered strings for the migrating
blocks/slots, keyed with A2-consistent slugs). A reshaping PR that moves a string the fixture
does not carry will fail `01-viewer.js`/`02-integration.js` locally — the correct responses are
to keep that string baked, or to open a fresh decision record and re-freeze. This is deliberate:
the freeze, not the reshaping PR, decides what may move.

**The four bubblegauge PR-0 hardening contracts** enter this suite as target-behavior
assertions (`06-content.js` + the harness page-error ledger): disclaimer gate with DOM purge,
last-known-good rendering (a rejected/absent payload never blanks the page), bounded loading
(no uncaught errors on outage), and response-shape validation (a content payload without a
disclaimer never commits).

## Re-freeze R3 — the embedded status-API endpoint (DR-015)

**What was retired (DR-015).** R2's negative contract for the *ungated* page — no strip, five
tabs, no `AI Regime`, no `LIVE BACKFILL`, requests never leave the origin — is retired together
with the gate it described. There is no `?status-api` key any more: the API base is EMBEDDED in
the page (the fixed subdomain label `api` of the page's own parent domain; the loopback dev base
on localhost) and every visitor's browser tries it. The R2 assertions on demo mode, sessionStorage
persistence and `?status-api-off` are retired with the parameter. The KEY_RE contract (red line 1)
survives in its stronger form — the whitelist guards a constant, and `verify/tests/30` + `74`
prove that no query, hash or storage input reaches URL construction — so this suite asserts it
behaviourally instead: a parameter-bearing URL steers no request.

**The API plane is pinned to frozen fixtures, exactly like the content plane.** The harness
derives the base from the origin with the client's own rule (`apiBaseOf`, matched to the shipped
copies by `verify/tests/74`) and answers `/api/v1/score`, `/api/v1/score/history`,
`/api/v1/status` and `/api/v1/dashboard/feed` from `golden/api-*.fixture.json` — the four
fixtures that used to ship inside the bundle as demo mode, lifted out verbatim (extracted by
executing the pre-DR-015 module, not retyped). Unknown API paths answer 404; `opts.api = null`
refuses the connection; `{ status: N }` answers non-2xx (500, or 503 for the warming state);
`"invalid"` answers shape-valid JSON the boundary validators must reject; `"hang"` never answers,
so the client's own 6 s timeout fires. The suite therefore drives the REAL fetch +
boundary-validation path (demo mode bypassed it) in every failure shape DR-015 names, and never
touches a live service, also under `ACCEPT_BASE_URL`. The harness derives the base with the same
apex-only rule as the client (a non-apex origin derives nothing).

**Two states, both frozen.**
- CONNECTED (`01`, `02`, `04`, `06`): strip with role=button, six tabs with `AI Regime` last, the
  score/verdict/flags text, `LIVE BACKFILL` + Fear & Greed from the feed, `LIVE` badges, the
  small-portrait opening splash shown once per session and dismissable, no demo marker, no
  activation state, and the retired parameters inert (the same connected page, the API requested).
- UNREACHABLE (`03`, `04`; refused / 500 / invalid / hang / 503): the static/default atlas — five
  base tabs and their frozen content, the hard-baked disclaimer, `static · Jul 2026 snapshot`
  badges, no live card, no fabricated reading, no splash, the strip present, non-interactive and
  reading "unavailable" ("warming up" on 503), the `AI Regime` tab still offered with the detail
  panel's own unavailable/warming sentence, and the page having TRIED the API (the fallback is
  exercised, not skipped).

**Both-states style, honestly.** Unlike R2, the always-on assertions cannot hold against the
pre-DR-015 (gated) site under any formulation, because the property they pin — the gate is gone —
is the change itself. DR-015 therefore records that this re-freeze and the reshaping land in ONE
gated change, proven green against the target site with both API states exercised; the retired R2
baseline is superseded by decision record, not by drift.

## Re-freeze procedure (how `verify/golden/acceptance-freeze.json` is regenerated)

Only under a ratified decision record, only BEFORE a reshaping phase (or, as R3 did under DR-015,
together with a reshaping whose retired contract cannot be formulated both-states). From the repo
root:

```bash
# 1. the amended suite must be green against the CURRENT site FIRST — never freeze red
node acceptance/run.js

# 2. regenerate the freeze manifest from the final file set (adapter.js stays excluded)
node -e '
const fs=require("fs"),crypto=require("crypto");
const res=JSON.parse(fs.readFileSync("acceptance/.artifacts/results.json","utf8"));
if(res.fail>0)throw new Error("suite not green ("+res.fail+" fail) — fix before freezing");
const files=["acceptance/SPEC.md","acceptance/run.js","acceptance/lib/harness.js",
 ...fs.readdirSync("acceptance/tests").filter(f=>f.endsWith(".js")).sort().map(f=>"acceptance/tests/"+f),
 ...fs.readdirSync("acceptance/golden").sort().map(f=>"acceptance/golden/"+f)];
const man={note:"FROZEN acceptance-suite manifest (re-freeze R3 under DR-015). These files are the implementation-agnostic parity contract for the always-on, embedded-endpoint site (both API states pinned); verify/tests/64-acceptance-freeze fails the build if any hash drifts. Re-freezing requires a decision record and must happen BEFORE a reshaping phase, never to make a failing phase pass. acceptance/adapter.js is deliberately EXCLUDED — it is the one file re-pointed at the implementation, and its output is pinned by the golden files listed here.",
 frozen_at:new Date().toISOString().slice(0,10),
 refrozen_under:"DR-015 (audit/decisions/DR-015-embedded-endpoint.md)",
 baseline_result:res.pass+" pass · 0 fail against the DR-015 site (API connected + unreachable states)",
 files:Object.fromEntries(files.map(f=>[f,crypto.createHash("sha256").update(fs.readFileSync(f)).digest("hex")]))};
fs.writeFileSync("verify/golden/acceptance-freeze.json",JSON.stringify(man,null,1)+"\n");
console.log("re-froze "+files.length+" files at "+man.frozen_at);'

# 3. prove the tripwire + full gate hold with the new manifest
cd verify && node run.js && node mutation.js && node gate.js && cd ..

# 4. belt & braces: the frozen suite once more, post-freeze
node acceptance/run.js
```

## Running

```
node acceptance/run.js                 # against the local repo (serves index.html)
ACCEPT_BASE_URL=https://… node acceptance/run.js   # against a deployed site
```

Exit code 0 = parity holds. Results in `acceptance/.artifacts/results.json`.
