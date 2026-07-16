SCOPE: TRACKS A/B (CATALOGUE v1.0) COMPLETE — TRACK C (SECURITY, PRIVACY, ASSURANCE) NOT YET AUDITED — NOT CLEARED FOR PRODUCTION TRAFFIC UNTIL PART 2 CLOSES

# 09 — Executive summary (Part 1)

**What is still broken, first.**

1. **Nothing is deploy-blocking.** GitHub Pages deploys from `main` on push; there is no branch
   protection, so a change can reach production entirely ungated. The verify gate exists, self-tests,
   and fail-closes — but until the owner enables "Require status checks → verify, disallow bypass" on
   `main`, it is advisory on the deploy. This one setting (R-GATE) is the single most important open
   item and it is the owner's command to give. It is the root of most open BLOCKER-1/2 findings
   (A-01, B-01, B-06, B-35).
2. **The verifier is one vendor.** Independence (Article IV) is met by a separate adversarial agent
   instance and a deterministic arbiter, not by a second vendor — UNSETTLED (R-VENDOR).
3. **No write-separation** between the code-writing identity and the gate it is gated by (R-SEP);
   **no scheduler** for continuous calibration (R-CRON); **no runtime observability** (R-OBSV, and a
   static site structurally cannot host it); **no signed evidence ledger** — git history substitutes
   (R-LEDGER, full signing is Track C).
4. **Two NO-EVIDENCE checks** (B-03, B-24) — runtime-observability properties with no runtime to
   observe; banded as failures, honestly.

**What will break next, and what is watching for it.** If a future agent silently changes a crisis
number, the golden hash goes red. If it plants a secret, weakens the key whitelist, adds an npm
dependency, fabricates a success on error, or renders API text into an HTML sink, the static-security
tests go red (calibration proves 6/6). If it weakens the test suite, mutation testing (floor 0.75)
goes red. If it edits the constitution without re-binding the digest, CI goes red. **If nobody enables
branch protection, none of that red stops the deploy** — that is R-GATE, and it is the thing to fix.

**Numbers (produced this engagement, not rounded up).**
- 79 checks evidenced. Verdicts: 2 PASS, 26 FAIL, 36 PARTIAL, 13 NOT-APPLICABLE, 2 NO-EVIDENCE.
- Open: 1 STOP-SHIP (B-06, PARTIAL — no secrets exist and the control blocks the CI check; not
  deploy-blocking → R-GATE), 9 BLOCKER-1, 16 BLOCKER-2. **These do not clear at Part 1 and are
  honestly residualized, not faked closed.**
- Pipeline seeded-defect catch rate: **6/6**. Mutation score: **1.00** (floor 0.75). Pre-engagement
  verification: **0/6** (there was none).
- Adversarial verification overturned **14 of 27** risky (PASS/N-A) verdicts.

**The machine you are leaving.** `verify/` (deterministic gate, mutation testing, calibration corpus,
gate self-test), `.github/workflows/verify.yml`, the ratchet register, the frozen-data + claims +
supply-chain controls — each watched blocking a re-introduced defect (audit/05-verification.md). The
constitution is in force (`IN_FORCE_PROVISIONAL`), hash-attested, digest hash-bound.

**The one line this volume may not write:** that the system is cleared for production. It is not.
`audit/engagement-status.json` reads `production_eligible: false` — computed — held down by the two
unaudited Track C STOP-SHIP checks (C-01, C-04). Schedule Part 2. Do not read "Part 1 done" anywhere
as "cleared to ship".
