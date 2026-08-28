# DR-014 — The shallow-frontend program: omnibus authorization + red lines

**Date:** 2026-08-28 · **Decider:** `mglaeser` (owner) · **Status:** RATIFIED

## Decision

The **shallow-frontend program** is authorized: the served site keeps only
buttons, titles, labels, interaction text and dashboard intros in the page;
all grounded/scientific content is served from APIs — the bubblegauge content
API for live content, and a same-origin **fallback content artifact** on the
Pages origin for key-less visitors and bubblegauge outages. The program's
binding rulings are the owner's one-shot Q&A (2026-08-27/28, questions Q1–Q51,
answered once; recorded in the program's ruling record and cross-referenced
from the bubblegauge repo's `docs/` ruling doc). Agents proceed autonomously
within this DR; the gate arbitrates.

## Controls this DR authorizes amending (each lands via its own gated PR)

1. **Acceptance suite re-freeze (Q2/Q13)** — ONE up-front re-freeze: the new
   frozen suite is written against the *target* (shallow) behavior and lands
   **before any PR that reshapes the served site**, per `acceptance/SPEC.md`
   rule 1. The byte-identical, zero-network ungated baseline is retired by
   this re-freeze; the new negative contract is: no fetch beyond same-origin
   relative content URLs (+ the existing gated status-API fetch).
2. **62-security-surface fetch rule (Q3/Q14)** — widened to permit
   **same-origin relative content fetches with a response-shape validator**;
   ruled a NEUTRAL surface change, and the amended test must *enforce* the
   validator's existence (an Article-IX-style strengthening alongside the
   widening).
3. **Golden atlas split (Q1)** — `src/data/atlas.json` splits into a
   frozen-numeric artifact (new golden hash in `verify/golden/data-hash.json`)
   and a movable-prose artifact that migrates to the content pipeline.
4. **70-claims prose ratchets** — literals that migrate out of
   `src/dashboard.tsx` move their ratchet to the content artifacts; no claim
   text is dropped, only re-homed.
5. **71-perf-budget (Q17)** — `bubblegauge.js` ceiling raised to
   **140,000 bytes** (from 110,000); total-JS budget adjusted accordingly.
   One deliberate ratchet edit, here, on the record.
6. **`build.js --dist` allowlist + `deploy.yml` (Q15/Q16/Q22)** — the deploy
   workflow gains a fallback-content generation step: fetches the bubblegauge
   content API **at deploy time** (host derived from `CNAME` at runtime —
   never a literal, never a committed secret), writes the fallback JSON into
   `dist/` (never committed to the repo), stamps it with a mandatory
   `as_of` date, and a daily scheduled deploy keeps it fresh. If the API is
   unreachable at build time, the previous deploy's artifact remains live
   (deploy proceeds with a logged warning; content freshness = last good sync).
7. **Widget/dashboard content wiring** — `index.html`/`src/*.tsx` may add the
   content-loading path (live API when the status key is present, same-origin
   fallback otherwise, per Q3) with per-slot microcopy placeholders and a
   labeled "offline content" state (Q12); LLM-generated slot text renders
   unlabeled, fallback/stale states stay badged (Q49).

## Red lines — no DR under this program may touch these without a fresh owner decision (Q19)

1. **`KEY_RE` gating** of the status-API key → subdomain derivation stays.
2. **No literal production host** in any repo file (CNAME excepted) — DR-005.
3. **No third-party runtime egress** from served pages (same-origin + the
   gated status-API fetch only).
4. **No server, no backend, no service worker** in the served artifact.
5. **Disclaimers stay hard-baked in the page** and are **always present in
   the fallback content artifact** (Q7/Q50) — no state may show grounded
   content un-disclaimed.

## Process rulings in force

Incremental PRs, each merged/deployed as it lands (Q51); every PR passes the
full gate; the re-freeze precedes reshaping; CDN staleness ≤ 600 s accepted
without purges (Q23); `crash.klee.me` leaves the bubblegauge CORS allowlist
(Q21, bubblegauge-side change). Companion program work in the bubblegauge
repo (content API, message engine) is governed by that repo's own gates and
the owner's merge authority there (Q45).
