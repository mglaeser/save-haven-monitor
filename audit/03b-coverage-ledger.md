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
