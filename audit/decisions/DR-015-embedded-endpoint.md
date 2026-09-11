# DR-015 — Embedded status-API endpoint; the `?status-api` query-parameter gate is retired

**Date:** 2026-09-10 · **Decider:** `mglaeser` (owner) · **Status:** RATIFIED

## Decision

The bubblegauge integration is **always on**. The API endpoint is **embedded** in the served
page: the fixed subdomain label `api` of the registrable apex the page is served from (or its
`www` alias), derived from `location.hostname` at load — the same origin
`scripts/generate-fallback.js` derives from `CNAME` at deploy time (DR-014 item 6, ruling Q16).
Any other origin — a deeper host such as a `*.github.io` mirror, a LAN or other IP literal, a
multi-label public suffix — derives **nothing**: no request is sent and the static state shows. No literal host enters the repository
(DR-005 / red line 2 hold; the label is a fragment). The `?status-api=<key>` activation
parameter, its `demo`/`fixture` offline keys, the `sessionStorage` persistence of the key and the
`?status-api-off` switch are **removed** from `src/bubblegauge.tsx`, `widget.html` and
`src/content.ts`.

**Fallback rule (the owner's instruction):** the static/default content is used **only when the
API is not reachable**. Every visitor's browser tries the API; on a network error, the 6 s
timeout, a non-2xx status or a payload that fails the boundary validators, each surface takes
its labeled static/unavailable branch — the strip reads "gauge unavailable" and is not
interactive, the detail tab says the gauge is unavailable, the desktop hero / mobile splash /
LIVE BACKFILL card / Fear & Greed line do not mount, the AI-2026 lines revert to the hardcoded
Jul-2026 anchors and the Aggregate/Analytics badges read `static · Jul 2026 snapshot`, the widget
keeps its badged sample state. HTTP 503 remains the distinct "warming up" state. The crisis atlas
is unaffected in every case. No fixture, no cached guess, no fabricated reading is ever shown as
live.

## Why

The site is the public face of the owner's own API; a live gauge reachable only through an
undocumented query key served nobody, and every page view that omitted it silently showed the
July-2026 static snapshot as if it were current. Embedding the endpoint makes the live data the
default and turns an API outage into a visible, labeled degradation instead of an invisible one.

## What changes (one gated change; each item lands under `verify/` + the frozen acceptance suite)

1. **`src/bubblegauge.tsx`** — `resolveActivation` (query key, `KEY_RE` on user input,
   sessionStorage, demo keys, off-switch) is replaced by `resolveApiBase` (constant `SUB`,
   `KEY_RE` on the constant, the hostname and nothing else — executed behind a throwing Proxy in
   test 74; apex or `www.`+apex only; loopback `localhost` / `127.*` / `[::1]` / `0.0.0.0` /
   `*.local` → `http://localhost:8000`; anything else → `null`, which the fetch layer
   short-circuits to the unavailable state without a request). The four embedded demo fixtures
   are removed; `useEndpoint` has no fixture path; `window.BubbleGauge` loses `demo`. Bundle:
   101,177 → 90,570 bytes.
2. **`widget.html`** — the same derivation (`SUB`, `KEY_RE`, apex-only, loopback, fail-closed);
   the sample state is the static/default content and stays, badged, when the API is unreachable —
   now also for a 2xx body that is not a score payload (no finite median, no band, no
   `computed_at`): the widget gained the boundary check the dashboard already had, and never
   invents a freshness stamp.
3. **`src/content.ts`** — `liveBase()` reads the derived `apiBase` (no demo clause); the
   chokepoint, validators and disclaimer gate are untouched (`68-content-disclaimer-behaviour`).
4. **Acceptance re-freeze R3** — the harness derives the API base with the client's rule and
   pins the API plane like the content plane: `acceptance/golden/api-{score,history,status,feed}.fixture.json`
   (the former in-bundle fixtures, extracted by executing the pre-change module) answer the
   documented endpoints — byte-for-byte the former in-bundle fixtures (verified by re-extracting
   and deep-comparing them). Unreachable modes: `opts.api = null` (refused), `{ status: 500 }`,
   `{ status: 503 }` (warming), `"invalid"` (shape-valid JSON the validators reject), `"hang"`
   (past the 6 s timeout). `02-integration` pins the connected state with no parameter and the
   retired parameters inert (the same connected page, the API requested); `03-negative` pins the
   static atlas in every unreachable mode (labeled static badges, the detail panel's own
   unavailable/warming sentence, no fabricated reading, the API tried) and that a parameter-bearing
   URL is the connected page; `01-viewer` pins six tabs with `AI Regime` last; `04-responsive`
   pins the small-portrait opening splash (DR-007), its dismissal and once-per-session on reload;
   `06-content` no longer infers gauge state from a content outage.
   `verify/golden/acceptance-freeze.json` regenerated per `acceptance/SPEC.md`.
5. **`verify/`** — `30-static-security` replaces the query-key `KEY_RE` test with the
   embedded-endpoint contract: on the COMMENT-STRIPPED source, the `KEY_RE` guard is live code, no
   visitor-controlled channel is read anywhere in the module (query string, hash, href, referrer,
   `window.name`, `document.URL`, `localStorage`), `sessionStorage` may touch only the splash-seen
   flag, `API_BASE` is assigned exactly once from the argument-less `resolveApiBase()`, and `SUB`
   is identical across client / generator / widget. New `74-endpoint-derivation` EXECUTES the
   four shipped derivation copies (client, widget, acceptance harness, generator) against one host
   table, behind a Proxy that throws on any read but `hostname`, against real URLs carrying
   hostile query/hash input, and with a `KEY_RE`-invalid label (must derive nothing).
   `63-feargreed-contract` reads the v1.1 fixture contract from the acceptance golden;
   `62-security-surface` wording; `70-claims` gains the D7 guard (the docs may never present the
   retired gate or demo mode as live guidance again); `calibration/corpus.json` D2 re-targeted at
   the new mechanism; `shot.js` answers the API base from the fixtures.
6. **`governance/provenance-manifest.json`** re-attested (v2.4) for `index.html`, `widget.html`,
   `bubblegauge.js`, `src/bubblegauge.tsx`, `src/dashboard.tsx` (seam comments only —
   `dashboard.js` is byte-identical).
7. **Docs** — `CLAUDE.md`, `README.md`, `INTEGRATION_NOTES.md`; claims ledger and residual
   register amended (append-only, below).

## DR-014 red lines — status under this decision

1. **`KEY_RE` gating stays — KEPT, strengthened.** The whitelist now guards a constant, and no
   visitor-controlled value (query string, hash, storage) reaches URL construction at all.
   Executable: `30-static-security` (structure) + `74-endpoint-derivation` (behaviour) + the
   frozen `02`/`03` (a parameter-bearing URL steers no request).
2. **No literal production host — KEPT.** `SUB` is a label; the parent domain is read from the
   page (browser) or from `CNAME` (deploy time). `62-security-surface`'s host scan is unchanged.
3. **No third-party runtime egress — KEPT, on every origin.** The only destination the page
   reaches beyond its origin is the first-party API, constructed from the apex it is served from.
   The pre-DR-015 leftmost-strip would have sent every visitor of a non-apex mirror (a
   `*.github.io` preview, a LAN host) to a host the owner does not control; the client rule is
   therefore deliberately stricter than the generator's — a non-apex origin derives nothing and
   sends nothing (test 74). The egress allowlist and the flat-zero undeclared-egress ratchet are
   unchanged.
4. **No server / service worker — untouched.**
5. **Disclaimers hard-baked and in the fallback artifact — untouched.**

## Consequences accepted (recorded honestly)

- Every page view now issues GET requests to the API host (score, history, feed; status on the
  detail tab; focus revalidation through a 25-minute in-memory cache). Public read API, no
  credentials, no cookies; its per-IP rate limit is the service's own control.
- The API's model-authored free text (`judgment_call.text`) now reaches every visitor, not only
  keyed ones. It is rendered as React text (no injection sink — `30-static-security`) after
  boundary validation; the audit's C-07 compensating-control wording "only appears with
  `?status-api`" is superseded by this record. The risk is the owner's own service misbehaving
  on the owner's own site; the service is governed by its own gate.
- The C-09 compensating control loses its "gated behind a key" leg; the "clearly framed as
  research" leg (hard-baked disclaimers, gauge micro-label, epistemic chips) is unchanged and
  now exercised on every view.
- A page served from any non-apex host (a `*.github.io` preview, a LAN host) derives nothing and
  shows the static state without a request; a site moved to a subdomain host would need a decision
  record and a change to the rule. Local preview on `localhost:8000` shows the static state unless
  a bubblegauge instance answers there.
- Failed responses are not cached, so under a HANGING API each consumer that mounts after the
  first load (a tab badge, the detail panel) settles only after its own 6 s timeout; the strip and
  the first page settle within the first load. HTTP 503 from anything in front of the API also
  reads as "warming up" (accepted).
- `src/content.ts` is not yet imported by any served bundle (dormant; exercised by test 68). When
  the DR-014 item 7 wiring lands it will, under this decision, try the live content API first for
  every visitor (two more GETs) and consult the deploy-time fallback artifact only when the live
  path fails or is rejected — reversing DR-014's "fallback first for key-less visitors" default,
  consistently with the rule above; a hanging API would then delay the fallback content by up to
  the loader's 6 s timeout.
- **Live reachability was not observed from the authoring sandbox** (outbound blocked there), but
  the deploy workflow's daily fallback-generation step performs the SAME derivation from `CNAME`
  and reached the API: run #43 (2026-09-10, scheduled) logged the derived `api.<parent>` origin
  and wrote a fresh `dist/content/fallback.json` (144,122 bytes, `content_version` 1) from it, so
  the `api` label does serve the bubblegauge API on the production parent domain. CORS: the
  service's allowlist names the production origin per `DASHBOARD_FEED_SPEC.md` v1.0 (see
  `INTEGRATION_NOTES.md`; DR-014 ruling Q21 concerns the REMOVAL of a former host from that list,
  not the presence of the current one) — not re-verified here; the first deploy observes the
  connected state in a browser.

## Amendments to standing records (append-only)

- `audit/01-claims-ledger.md` D7 ("no-ops unless `?status-api=<key>`") is **superseded**: the
  claim is re-homed to "always on; static/default only when the API is unreachable", pinned by
  the frozen acceptance suite in both states.
- `audit/06-residual-risk-register.md` C-09 compensating control: the gating leg is retired; the
  C-07 compensating-control wording and the gate-based evidence in B-26, C-01, C-18 and C-19 of
  `audit/03-findings.json` are superseded (append-only; the Phase-2' records stand as baseline).
- `audit/00-system-map.md` egress table: amendment appended; `audit/00-audit-surface.json`
  (`?status-api*` routes, `bubblegauge:enabled` store) is the frozen Phase-0 denominator and stays
  as history.
- `governance/constitution.md` Article IX ("the activation key cannot reach URL construction
  without the `KEY_RE` whitelist") is hash-bound and unchanged: read "activation key" as the
  embedded API subdomain label `SUB`; reword at the next ratification.
- `verify/calibration/corpus.json` D2 re-targeted (same class, new mechanism, same catch).
- `rewrite/` remains the historical record of the gated site.

## Process note

`acceptance/SPEC.md` rule 1 says re-freeze BEFORE reshaping and never to green a failing rewrite.
The contract this decision retires ("no gate → nothing mounts") cannot be green against the
target under any formulation, because its negation is the change itself. As R1 → R2 retired the
"zero network" baseline by decision, R3 retires the "ungated" baseline by decision: re-freeze and
reshaping land in ONE gated PR, proven green against the target with both API states exercised
(verify 93/93 incl. the new 74 and the D7 guard in 70, mutation 13/13, gate PASS, acceptance 47/0
across the connected state and five unreachable modes). The relaxation of SPEC rule 1 is logged as a
finding in `audit/01-claims-ledger.md`, as the ratchet note requires.
