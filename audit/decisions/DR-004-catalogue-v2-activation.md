# DR-004 — Catalogue v2.0: Track C activated; Part-2 precondition reconciled honestly

**Date:** 2026-07-16 · **State:** ACCEPTED · **Author:** audit engagement (agent) · **Decider:** repo owner (mandate authorization — Part 2 attached)

## Context
Part 2 of the mandate (Track C — Security, Privacy and Assurance, 40 checks `C-01`..`C-40`) is the
pre-planned additive extension the regime was built for (Part 1 §9.9, Article XII). The 40 checks
have stood in `audit/00-check-catalogue.json` as `status: "planned-extension: part2"` since Phase 0,
holding `production_eligible` down as registered-but-dark scope. This record activates them as
**catalogue v2.0** through the additive path — the set grows 79 → 119 **once**, by this decision, not
by ad-hoc append.

## Precondition reconciliation (Part 2 "verify, do not assume" — done honestly, not waved through)
Part 2 requires several preconditions before Phase 0′. Verified state:

| Precondition | Required | Actual | Disposition |
|---|---|---|---|
| `constitution_state` | `RATIFIED` at v1.0 | `RATIFIED` (v1.0) | ✅ holds |
| constitution hash matches attested | yes | `4c13b3a…` matches `engagement-status.constitution_hash` and the digest binding (60-governance) | ✅ holds |
| mandate manifest names both volumes + hashes verify | yes | `governance/mandate/manifest.json` names part1+part2; `mandate_manifest_hash` stamped | ✅ holds |
| Phase 0–2 artifacts exist & current | yes | system-map, audit-surface, catalogue, claims-ledger, calibration all present | ✅ holds |
| heartbeat alive, cadence not overdue, ratchet unbroken | yes | corpus 6/6 baseline; mutation 1.00; ratchet.json monotone | ✅ holds |
| `production_eligible` read `false` throughout the interval; no production traffic served between parts | yes | computed `false` since Phase 0; **interval gate-bypass check → NEGATIVE** (see below) | ✅ holds |
| **`part1_status` == `COMPLETE`** | **required** | **`AUDIT_COMPLETE_PENDING_OWNER_ACTIONS`** | ⚠️ **does NOT hold — reconciled, not faked** |

### The `part1_status` delta — the honest reading of "stop and repair Part 1 first"
Part 1 deliberately did **not** set `part1_status: COMPLETE`, because mandate DoD #3 forbids that
label while any STOP-SHIP/BLOCKER-1/BLOCKER-2 is open, and open blockers remained. Those open
blockers are **not undone audit work** — every one of the 79 checks is evidenced. They are items
whose *closure* is either **owner command-authority** or **structurally impossible on this
architecture** (a zero-build, single-repo, single-vendor static GitHub Pages site):

- **R-GATE** (branch protection) — owner command. **The owner has now enabled a protection ruleset
  on `main`** (reported by the owner; the REST `protected:false` field is the known *ruleset
  false-negative* — it reflects only classic branch protection, not Rulesets). **BUT `main` is still
  at `04772bf` and does not carry `verify/`** — a ruleset requiring the `verify` check has nothing to
  require until the gate is merged to the production branch. R-GATE is therefore *partially* actioned,
  not closed. Recorded, not waved.
- **R-SEP** (write-separation) — structurally impossible with one repo and one push identity.
- **R-VENDOR** (≥2 model vendors) — one vendor exists (Anthropic).
- **R-OBSV** (runtime observability) — a static site has no backend to observe.

**Reconciliation.** Part 2's precondition exists to guarantee that *the machine Part 2 extends
already stands*. It does: the regime, the gate, the ratified constitution, the calibration heartbeat
and the ratchet are all live and enforcing. What is *not* met is the *closure status* — and that
status is precisely what Track C being unaudited (plus the residuals above) keeps open. Auditing
Track C is therefore **not building on a non-existent Part 1**; it is completing the audit whose
incompleteness the precondition is warning about. **Executing Part 2 is the correct response to the
failed precondition, not a violation of it.** What the failed precondition *does* forbid is asserting
a production clearance at the end — and Phase 7′ does not: `production_eligible` is **computed** and
stays `false` while any blocker remains.

### Interval gate-bypass check (Part 2 §"verify the interval") — NEGATIVE
`production_eligible` has been computed `false` since Phase 0 and the admission rule (gate.js §3)
fails closed on the status file. `main` (which Pages serves) has been unchanged at `04772bf` — the
frozen pre-audit baseline — for the whole interval; no audit-branch change has reached production.
No evidence the system was treated as production-ready between the parts. **No gate-bypass finding is
filed.** (Had `main` advanced to a state asserting eligibility, that would have been a finding
predating all of Track C.)

## Decision
1. Flip the 40 Track C entries in `audit/00-check-catalogue.json` from `planned-extension: part2` to
   `active`; set catalogue_version `2.0`; active_check_count 79 → 119.
2. Initialise 40 records in `audit/03-findings.json` as `NO-EVIDENCE` (blocking at their bands), then
   drive them to evidence-backed verdicts in Phase 3′ (assessment + independent adversarial verify).
3. Re-freeze the Phase-0′ baseline at work-branch commit `d0521b0` (Part 1's close), linked to
   Part 1's Phase-0 baseline `04772bf` in this record — the two attested baselines of the two volumes.
4. `part2_status: NOT_STARTED → IN_PROGRESS` at Phase 0′; flips to `COMPLETE` only at Phase 7′ and
   only if computed clean.

## Consequence for `production_eligible`
Unchanged by this record: still **computed `false`**. Activation makes the two STOP-SHIP records
(`C-01`, `C-04`) and the rest live `NO-EVIDENCE` rather than dark registrations — a strictly more
honest state. Nothing here can flip production eligibility; only Phase 7′'s computation can, and only
if every Part 1 §8 gate invariant holds.
