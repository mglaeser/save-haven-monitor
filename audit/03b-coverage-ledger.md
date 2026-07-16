# 03b — Coverage ledger (Phase 3)

Every audit-surface item mapped to the checks that examined it. 'Thorough' is defined here.
All 79 active checks produced evidence (77 evidenced verdicts + 2 NO-EVIDENCE, themselves banded as failures). No inventory item is uncovered.

| Audit-surface item | Checks that touched it (by evidence) |
|---|---|
| `index.html` | A-05, A-09, A-12, A-16, A-28, A-38, B-04, B-05, B-09, B-10, B-12, B-13, B-14, B-21, B-25, B-27, B-33, B-34, B-36 |
| `dashboard.jsx` | A-05, A-06, A-09, A-11, A-12, A-16, A-23, A-27, A-32, A-39, A-40, B-05, B-10, B-14, B-24, B-25, B-27, B-33, B-34, B-35 |
| `bubblegauge.jsx` | A-05, A-09, A-10, A-11, A-12, A-16, A-18, A-19, A-20, A-21, A-22, A-25, A-26, A-27, A-28, A-30, B-05, B-06, B-07, B-08, B-10, B-15, B-20, B-21, B-24, B-25, B-26, B-29, B-33, B-34, B-35, B-37, B-38 |
| `CLAUDE.md` | A-04, A-13, A-14, A-17, A-22, A-29, A-32, A-33, A-37, B-02, B-03, B-09, B-11, B-12, B-17, B-37, B-39 |
| `README.md` | A-17, A-19, A-24, A-37, B-39 |
| `INTEGRATION_NOTES.md` | A-04, A-17, A-37, B-39 |
| `LICENSE` | A-38 |
| `.nojekyll` | B-17 |
| `CNAME` | B-17, B-32 |
| `.claude/settings.local.json` | (covered transitively by cross-cutting checks A-01/B-01/B-06) |
| `git history / branch protection` | A-01, A-02, A-06, A-08, A-09, A-15, A-17, A-21, A-23, A-24, A-25, A-30, A-32, A-33, A-34, A-39, A-40, B-01, B-02, B-03, B-04, B-06, B-09, B-11, B-13, B-14, B-15, B-17, B-18, B-22, B-23, B-25, B-27, B-31, B-32, B-35, B-36, B-37 |
| `GitHub Pages deploy` | A-01, A-06, A-09, A-15, A-24, A-31, A-37, B-01, B-03, B-08, B-09, B-11, B-12, B-13, B-16, B-17, B-18, B-19, B-22, B-25, B-27, B-28, B-30, B-31, B-32 |
| `external egress (unpkg/bubblegauge/etoro)` | A-09, A-11, A-22, A-24, A-25, A-28, A-29, A-31, B-03, B-04, B-08, B-10, B-13, B-16, B-18, B-20, B-21 |

**Note:** every check ran against the whole repo tree; the table shows *explicit* references in produced evidence. Cross-cutting governance checks (A-01 gate, B-06 secrets, B-35 separation) examine the entire surface, so items without a direct mention are still covered.

Items without an explicit evidence mention (covered transitively): `.claude/settings.local.json`.

---

## Phase 6' closing sample (catalogue v2.0)

**15 checks = 12.6% of 119** (mandate floor 10%), ≥1 per severity band, ≥1 per track (A:3, B:3, C:9). Deterministic re-verification: PASS ⇒ a held standing control exists now; N/A ⇒ architecture-grounded justification present; every referenced `verify/tests/NN` exists. **Result: 0 disagreements → no widening to 30% required.**

| Check | Track | Band | Verdict | Re-verified |
|---|---|---|---|---|
| B-06 | B | STOP-SHIP | PARTIAL | test 30 exists=True |
| C-01 | C | STOP-SHIP | PASS | PASS<-held control exists_now=True; test 30 exists=True |
| A-01 | A | BLOCKER-1 | FAIL | evidence stands |
| B-01 | B | BLOCKER-1 | FAIL | evidence stands |
| C-37 | C | PLAN | PARTIAL | test 61 exists=True |
| A-04 | A | BLOCKER-2 | PARTIAL | evidence stands |
| B-07 | B | BLOCKER-2 | FAIL | evidence stands |
| C-08 | C | BLOCKER-2 | PASS | PASS<-held control exists_now=True; test 62 exists=True |
| A-16 | A | SHOULD-FIX | PASS | PASS<-held control exists_now=True; test 70 exists=True |
| C-16 | C | MUST-FIX | PARTIAL | evidence stands |
| C-24 | C | MUST-FIX | PARTIAL | evidence stands |
| C-14 | C | SHOULD-FIX | PARTIAL | test 10 exists=True |
| C-33 | C | SHOULD-FIX | PARTIAL | evidence stands |
| C-31 | C | PLAN | PARTIAL | evidence stands |
| C-40 | C | ASSESS | PARTIAL | evidence stands |

Coverage: every Track C check maps to at least one audit-surface item or an architecture-grounded N/A; the two new controls (`61-provenance`, `62-security-surface`) extend coverage to the shipped-component provenance chain and the egress/trifecta/PII surface.
