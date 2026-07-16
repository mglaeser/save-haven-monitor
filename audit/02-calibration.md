# 02 — Pipeline calibration (Phase 2)

**The number that matters: the *pipeline's* seeded-defect catch rate — because it is the only
one that survives this engagement.** Measured before trusting any PASS that rests on the suite.

## Method

Six realistic defects (the mandate's canonical classes, adapted to a static JSX site) were seeded
by an independent agent into a scratch copy of the served files (never the repo), then hunted three
ways: (a) the **deterministic pipeline** (`verify/`, the harness built this phase), run against the
seeded copy via `BG_REPO=<calib> node run.js`; (b) an **independent adversarial verifier** — a
separate agent, blind to whether defects existed, with a falsifying objective (S2); (c) baseline
self-review. The corpus is now permanent (`verify/calibration/corpus.json`) and becomes the
regime's heartbeat (§9.3).

## The six seeded defects

| ID | Class | Where | Attack role |
|---|---|---|---|
| D1 | hard-coded credential | `bubblegauge.jsx` — `bg_live_sk_…` sent as `X-API-Key` | secret shipped to every browser |
| D2 | missing-guard clone | `bubblegauge.jsx` — `KEY_RE.test` dropped before base-URL build | attacker-controlled fetch host |
| D3 | nonexistent dependency | `index.html` — `react@18.3.2` with stale SRI | supply-chain tamper / load failure |
| D4 | swallowed exception | `bubblegauge.jsx` — `catch` returns fake `status:200,json:{}` | errors masqueraded as success |
| D5 | vacuous assertion | planted `tests/smoke.test.js` (tautologies, self-mocks) | green-lights the other five |
| D6 | untrusted-text-to-sink | `bubblegauge.jsx` — `dangerouslySetInnerHTML` on API text | DOM XSS from a spoofed API |

The five code defects chain into one attack: D2 points the fetch at an attacker host, D1 sends the
secret there, D4 hides the tamper, D6 turns the malicious response into XSS, D5 keeps CI green.

## Results

| Hunter | Catch rate | Notes |
|---|---|---|
| **Pipeline (`verify/`)** | **6 / 6** | Deterministic, offline. D1→no-secrets · D2→KEY_RE-enforced · D3→pin-manifest (offline) *and* SRI-recompute (online) · D4→no-fabricated-success · D5→no-stray-test-files · D6→no-injection-sinks. |
| Independent adversarial verifier (S2) | 6 / 6 | All with exact file:line; reconstructed the attack chain unprompted (16 min). |
| Self-review | n/a | Not counted — Rule 7 (never grade your own work). |

**Baseline established: pipeline catch rate = 6/6 (100%).** This is above the mandate's floor
("<5/6 → the system has no verification at all"). It becomes the ratchet baseline (§9.1): the
catch rate is a floor that may rise and never fall, and a heartbeat that drops below it freezes
releases (§9.3, Article VI).

## Honest calibration caveats (recorded, not smoothed)

1. **The harness did not exist at the frozen baseline.** Before this phase, the *only* verification
   was agent-invoked Playwright/esbuild runs in a scratchpad outside the repo — under Rule 1 that is
   not a control. So the *pre-engagement* pipeline catch rate was **0/6**: the honest first sentence
   of the executive summary is that the audited system arrived with no standing verification at all.
   This phase replaces that (user-authorized; DR-001).
2. **D3's online SRI-recompute check reports OFFLINE in this sandbox** (unpkg returns 403 through the
   agent proxy). The offline-deterministic pin-manifest check (`verify/tests/35`) is the compensating
   control that catches D3 without egress; the SRI belt re-arms automatically in CI with network. The
   runner records offline checks as `OFFLINE`, never as green (Rule 3).
3. The pipeline is **static-analysis-based** for the security corpus (no server/runtime to exercise).
   That is appropriate for a static site but means the corpus must be widened whenever a new sink,
   egress, or gated code path is added (§9.5 re-run triggers) — a static check only catches the
   shapes it was taught.

---

## Phase 2' — calibration inherited then extended (catalogue v2.0)

Inherited baseline 6/6 (not re-seeded from scratch). Added three Track C seeds → **9/9**:
- **D7** exfiltration-path — a fetch/link to a non-allowlisted host → caught by `62-security-surface` (egress allowlist).
- **D8** unattested-shipped-change — a shipped component edited without re-attesting `provenance-manifest.json` → caught by `61-provenance` (hash drift).
- **D9** personal-data/telemetry sink — `sendBeacon`/`gtag`/`type=password`/`localStorage` in served source → caught by `62-security-surface`.

Each seed was injected into a throwaway `BG_REPO` copy and **watched to block** (audit/05-verification.md). Catch rate 9/9 is the inherited baseline the regime may not degrade.
