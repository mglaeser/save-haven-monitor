# 03 — Findings (Phase 3 + Phase 3' complete — catalogue v2.0, 119 checks)

79 checks, evidenced against frozen baseline d19556d. Verdicts: FAIL 26, PARTIAL 38, NOT-APPLICABLE 13, NO-EVIDENCE 2, PASS 0.
Adversarial verification overturned 14 of 27 risky (PASS/N-A) verdicts — all recorded in the JSON history.
**0 PASS is correct at Phase 3: a PASS requires a *held* standing control, installed in Phase 5.**

| Check | Band | Verdict | One-line |
|---|---|---|---|
| B-06 | STOP-SHIP | PARTIAL | Make tests/30 actually block (wire the gate to the deploy boundary -- see B-01). Add a nightly full-history se |
| A-01 | BLOCKER-1 | FAIL | Owner must enable branch protection on main requiring the verify check with bypass disabled (the single human  |
| A-02 | BLOCKER-1 | PARTIAL | Add a mutation-testing stage to verify/ (CI-only, exempt from the zero-build ban) mutating dashboard.jsx's pur |
| A-06 | BLOCKER-1 | FAIL | Add a batch-size gate to gate.js (block change sets above a line/file threshold), write and actually execute a |
| A-08 | BLOCKER-1 | PARTIAL | Make the scanners blocking via branch protection (A-01); add full-git-history secret scanning, an SBOM (SPDX/C |
| A-24 | BLOCKER-1 | FAIL | 1) Make detection contain: either switch Pages to the 'GitHub Actions' source so the verify gate gates the act |
| B-01 | BLOCKER-1 | FAIL | Make the gate actually block: convert deployment to an Actions Pages-deploy job gated on gate.js success (stru |
| B-03 | BLOCKER-1 | NO-EVIDENCE | audit/00-system-map.md: 'No server, no backend, no database, no runtime AI/LLM'; production is GitHub Pages se |
| B-04 | BLOCKER-1 | PARTIAL | Pin the harness: run `npm install --package-lock-only`, commit verify/package-lock.json, and change verify.yml |
| B-11 | BLOCKER-1 | PARTIAL | Add an external scheduled health check (e.g., an Action hitting crash.klee.me asserting the app boots + a cont |
| B-20 | BLOCKER-1 | NOT-APPLICABLE | Runtime injection/exfiltration containment presupposes a model that interprets retrieved content and can act ( |
| B-22 | BLOCKER-1 | FAIL | Separate the code-writing identity from the deploy/merge authority: enable branch protection on main requiring |
| A-04 | BLOCKER-2 | PARTIAL | Reverse-engineer a testable specification (Given/When/Then + explicit non-goals) for each feature — the atlas  |
| A-09 | BLOCKER-2 | PARTIAL | Add an egress-allowlist fitness function to verify/tests (enumerate every scheme://host in index.html+bubblega |
| A-10 | BLOCKER-2 | FAIL | System map (audit/00-system-map.md:29-40): 'In-product runtime models: none. No inference call is made by this |
| A-17 | BLOCKER-2 | FAIL | Author an NFR table mapping all nine characteristics for this static SPA, each prioritised one carrying an exe |
| A-22 | BLOCKER-2 | FAIL | Add an automated accessibility gate to verify/ that renders the SPA headless (the site is browser-transpiled,  |
| A-25 | BLOCKER-2 | PARTIAL | Add a property/fuzz test suite in verify/tests over validScore/validHistory/validStatus feeding machine-genera |
| A-33 | BLOCKER-2 | FAIL | Build the missing artifacts (executable spec, mutation-surviving tests, decision records, an agent-instruction |
| A-34 | BLOCKER-2 | FAIL | Enable branch protection on main requiring the verify check with no bypass (flips the advisory gate to blockin |
| B-02 | BLOCKER-2 | PARTIAL | Add a scheduled (nightly cron) job to verify.yml that does a fresh checkout + `npm install` + `node run.js` +  |
| B-05 | BLOCKER-2 | FAIL | audit/00-system-map.md: 'In-product runtime models: none. No inference call is made by this codebase.' grep ov |
| B-07 | BLOCKER-2 | FAIL | audit/00-system-map.md: the product makes no inference call; 'Tools the model can call -- In-product: none (no |
| B-10 | BLOCKER-2 | PARTIAL | grep for gpt-/claude-/gemini/model-id/@latest across the 3 served files returns zero matches. System-map: 'In- |
| B-12 | BLOCKER-2 | PARTIAL | Add a scheduled CI check comparing each pinned CDN version against the latest advisory-clean release and faili |
| B-13 | BLOCKER-2 | PARTIAL | Enable branch protection requiring `verify` (or move Pages to Actions-based deployment) so the exact-pin/SRI d |
| B-15 | BLOCKER-2 | NOT-APPLICABLE | The check governs runtime LLM I/O guardrails — injection classifiers and content filters with measured false-n |
| B-28 | BLOCKER-2 | FAIL | Add a scheduled synthetic monitor (GitHub Actions cron, out-of-band) that GETs https://crash.klee.me, asserts  |
| B-31 | BLOCKER-2 | PARTIAL | Add a scheduled (e.g. weekly) CI job that clones the repo fresh into a clean runner, serves it (python3 -m htt |
| A-05 | MUST-FIX | PARTIAL | Extend verify/ with a boundary fitness function: assert dashboard.jsx never references bubblegauge internals e |
| A-07 | MUST-FIX | FAIL | Add a clone detector to verify/ as a blocking tripwire (fail on new duplicated 5+ line blocks above a baseline |
| A-11 | MUST-FIX | FAIL | System map (audit/00-system-map.md:36-40): 'Tools the model can call — In-product: none (no runtime model).' D |
| A-12 | MUST-FIX | PARTIAL | Add per-module reconstruction artifacts: a spec link (frozen acceptance criteria for the atlas tabs and the ga |
| A-13 | MUST-FIX | FAIL | Add a blocking standards tier to verify.yml: ESLint over the verify/ tooling and a JSX parse/syntax check over |
| A-18 | MUST-FIX | FAIL | audit/00-system-map.md lines 29-30: 'In-product runtime models: none. No inference call is made by this codeba |
| A-19 | MUST-FIX | PARTIAL | If the optional gauge is to be relied upon, add a consumer contract test in verify/ that asserts bubblegauge.j |
| A-21 | MUST-FIX | NOT-APPLICABLE | The check governs retrieval + memory engineered to keep a MODEL inside its effective context, with groundednes |
| A-23 | MUST-FIX | PARTIAL | Record an owning role for the crisis dataset and for the bubblegauge feed in audit/. Promote the implicit sche |
| A-26 | MUST-FIX | PARTIAL | Add a verify test (or ESLint no-empty rule wired into run.js) that fails the build on any new empty catch/`.ca |
| A-27 | MUST-FIX | PARTIAL | No in-product runtime model exists (system-map 'Models and providers': 'In-product runtime models: none. No in |
| A-28 | MUST-FIX | PARTIAL | File a decision record accepting (or mitigating) the unpkg availability SPOF and stating the blast radius; add |
| A-32 | MUST-FIX | PARTIAL | Add a CI step that executes the remaining README commands (start `python3 -m http.server`, curl the served ind |
| A-38 | MUST-FIX | FAIL | Add a blocking license-scan step to verify.yml covering the 5 pinned CDN libs (all permissive/MIT, but verify  |
| B-08 | MUST-FIX | FAIL | There is no model inference, no tool-call path, and no owner-metered/billed API in the system (system map: no  |
| B-09 | MUST-FIX | PARTIAL | Enable branch protection on main requiring the `verify` check (or switch Pages to 'GitHub Actions' deployment) |
| B-17 | MUST-FIX | PARTIAL | Import the two hand-made resources into code: (a) commit a Pages/DNS declaration (e.g. an Actions deploy workf |
| B-19 | MUST-FIX | NOT-APPLICABLE | The check governs services that expose SLIs and whose releases can be frozen by an error budget. This system h |
| B-23 | MUST-FIX | FAIL | Start by logging every maintenance-agent tool call with arguments to an append-only store outside agent write; |
| B-24 | MUST-FIX | NO-EVIDENCE | The served site produces no model-generated output at runtime — all product content is frozen constants in das |
| B-25 | MUST-FIX | NOT-APPLICABLE | The check targets cross-environment credential bleed (staging/dev pointing at a prod DB, vector store, or API  |
| B-27 | MUST-FIX | PARTIAL | Wire the existing gate to actually block deploy: enable branch protection on main requiring the verify workflo |
| B-29 | MUST-FIX | PARTIAL | Add a failure-injection test to verify/ that stubs the bubblegauge API to (a) time out, (b) return 500, (c) re |
| B-33 | MUST-FIX | NOT-APPLICABLE | The system has no retrieval-augmented pipeline: no embeddings, no vector store, no index, and no ingest path.  |
| A-03 | SHOULD-FIX | PARTIAL | If a model-judged check is ever added (e.g. an LLM eval over bubblegauge text), this flips to applicable and m |
| A-14 | SHOULD-FIX | PARTIAL | Write an explicit tool/model policy (which agent/model/prompt for which change class) and promote the implicit |
| A-16 | SHOULD-FIX | PARTIAL | Add a blocking stub-detector to verify/tests: fail on TODO/FIXME/NotImplementedError/raise NotImplementedError |
| A-20 | SHOULD-FIX | PARTIAL | audit/00-audit-surface.json line 41: 'prompts: []'. The product makes no inference call (system-map lines 29-3 |
| A-29 | SHOULD-FIX | PARTIAL | Add a short decision record for the CDN-library build/buy choice capturing TCO (~$0, free CDN) and the exit/po |
| A-30 | SHOULD-FIX | NOT-APPLICABLE | Consistency-vs-availability, replication-vs-cost, isolation level and quorum are properties of backend datasto |
| A-31 | SHOULD-FIX | NOT-APPLICABLE | Unit economics presuppose metered cost per unit of use. This product has none: static hosting (fixed ~$0), fre |
| A-35 | SHOULD-FIX | FAIL | Do not add a human to any queue. Build automatic containment: a synthetic monitor on crash.klee.me that auto-r |
| A-36 | SHOULD-FIX | PARTIAL | Wire corpus.json into CI as a scheduled continuous-injection job that publishes the pipeline and verifier catc |
| B-14 | SHOULD-FIX | PARTIAL | Make the gate preventive via branch protection / Actions deploy. No config-hot-swap path needs closing because |
| B-16 | SHOULD-FIX | NOT-APPLICABLE | The check requires attributing and capping production AI/cloud run-rate (cost per request, per tenant, unit ec |
| B-18 | SHOULD-FIX | FAIL | Progressive delivery on raw GitHub Pages is limited, but achievable: deploy via an Actions workflow to a previ |
| B-21 | SHOULD-FIX | PARTIAL | Remove the unpkg single-point-of-failure by vendoring the five pinned UMD files into the repo and serving them |
| B-26 | SHOULD-FIX | PARTIAL | The feature is off-by-default and per-visitor, so a global 'misbehaving feature' blast radius is bounded — but |
| B-30 | SHOULD-FIX | NOT-APPLICABLE | The check requires load-testing owned compute to its knee and bounding owned inference capacity. This system o |
| B-35 | SHOULD-FIX | FAIL | Two moves, structural first: (1) Extract the policy bundle (verify/gate.js, verify/tests/, verify/golden/, .gi |
| B-36 | SHOULD-FIX | FAIL | grep for runtime model references in product source returns none; system map §Models confirms 'In-product runt |
| A-15 | PLAN | FAIL | Owner enables 'Require status checks to pass -> verify' + 'Do not allow bypassing' on main (one-time command-a |
| A-37 | PLAN | PARTIAL | Assemble a takeover pack and have a non-author execute it for both a fresh agent and a fresh human, recording  |
| A-39 | PLAN | PARTIAL | Add a different-vendor adversarial verifier (a non-Claude model prompted to falsify) into the standing loop wi |
| B-32 | PLAN | PARTIAL | Encode the repo/Pages settings as code or add a scheduled CI assertion (via the GitHub API) that Pages source  |
| B-34 | PLAN | NOT-APPLICABLE | Time-to-first-token and inter-token latency are properties of a generative model producing tokens. This site m |
| B-37 | PLAN | NOT-APPLICABLE | Right-to-erasure requires personal data held in server-side or derived stores. This system collects and stores |
| B-39 | PLAN | PARTIAL | Name the framework(s) explicitly in a design record and apply the AI-specific lenses to the actual architectur |
| A-40 | ASSESS | FAIL | Write a one-page materiality memo: static client-side site, no server/inference at runtime -> runtime energy i |
| B-38 | ASSESS | NOT-APPLICABLE | Inference economics (prompt-cache hit rate, cost-based model routing, cost per unit of value) presuppose paid  |

---

## Track C — Security, Privacy & Assurance (Part 2, catalogue v2.0)

40 checks, assessed against the Phase-0' baseline (work-branch `9a02414`, linked to Part 1's `d19556d`) under **independent adversarial verification** (a separate model instance per band, falsifying objective) — **0 disagreements**. A second, independent 36-agent run corroborated the blocking posture (it rendered C-01 N/A where this run rendered PASS; both agree C-01 is not an open STOP-SHIP).

Verdicts: **PASS 4, PARTIAL 23, NOT-APPLICABLE 13, FAIL 0** (C-37's baseline BLOCKER-1 FAIL was closed by a door built in Phase 5' + a fresh Phase-6' re-run → de-escalated PLAN/PARTIAL; baseline preserved in the record history).

**0 open Track-C STOP-SHIP** (C-01 PASS, C-04 N/A). Open: 3 BLOCKER-1 (C-03, C-05, C-09), 3 BLOCKER-2 (C-02, C-06, C-26) — all honest PARTIALs needing runtime/deploy-admission/second-vendor infrastructure absent by architecture.

| Check | Band | Verdict | One-line |
|---|---|---|---|
| C-01 | STOP-SHIP | PASS | Land verify/ + .github/workflows/verify.yml on main (close R-GATE) so 30-static-security gates t |
| C-04 | STOP-SHIP | NOT-APPLICABLE | To keep N/A self-enforcing (and to define the tripwire that re-opens the check): add a PII/analy |
| C-03 | BLOCKER-1 | PARTIAL | Commit verify/package-lock.json, change the workflow step to `npm ci`, and add a verify/tests te |
| C-05 | BLOCKER-1 | PARTIAL | Add verify/tests/*-llm-taxonomy asserting each of the 10 categories is either controlled-by-name |
| C-07 | BLOCKER-1 | PASS | Hold the standing control. If a runtime model/agent is ever added (making a true injection targe |
| C-09 | BLOCKER-1 | PARTIAL | Add a verify/tests assertion that the Article-50 transparency strings (heuristic/not-a-probabili |
| C-27 | BLOCKER-1 | NOT-APPLICABLE | No action while inapplicable. Re-opens if the owner claims/needs any framework or the data surfa |
| C-37 | PLAN (baseline BLOCKER-1) | PARTIAL | Add a cryptographically-signed per-commit provenance field (model + prompt hash) and a SCHEDULED |
| C-02 | BLOCKER-2 | PARTIAL | Build a golden egress-manifest test in verify/tests/ that enumerates every allowed destination ( |
| C-06 | BLOCKER-2 | PARTIAL | Commit verify/ and .github/workflows/verify.yml to main and require the 'verify' check via branc |
| C-08 | BLOCKER-2 | PASS | None required for the property; keep the egress allowlist current by decision record when a legi |
| C-10 | BLOCKER-2 | PASS | Methodology control is standing; the smallest next step to convert its CI-block into a deploy-bl |
| C-23 | BLOCKER-2 | NOT-APPLICABLE | No action while no log/trace/prompt sink exists. Applicability re-opens the moment any telemetry |
| C-26 | BLOCKER-2 | PARTIAL | Emit a standard-format SBOM (CycloneDX) for the served component set, add a verify/ provenance/S |
| C-11 | MUST-FIX | PARTIAL | None needed for a static site; keep the dev-assurance evidence pipeline standing. Re-opens to a  |
| C-12 | MUST-FIX | PARTIAL | Land verify/ on main and turn on branch protection so the gate self-test is a *blocking* require |
| C-15 | MUST-FIX | PARTIAL | Keep the gate self-test + mutation + calibration standing; the smallest step toward the full ask |
| C-16 | MUST-FIX | PARTIAL | Accept R-SEP as an owner-residual (write-separation impossible here); the standing control to pr |
| C-17 | MUST-FIX | PARTIAL | Keep pin-manifest + SRI standing; ensure CI has egress so 40-sri actually recomputes rather than |
| C-18 | MUST-FIX | PARTIAL | Keep the KEY_RE + subdomain-pin + GET-only + validator controls standing; the smallest add for t |
| C-21 | MUST-FIX | NOT-APPLICABLE | No action. Re-opens the moment a model is trained or fine-tuned for this product — at which poin |
| C-22 | MUST-FIX | NOT-APPLICABLE | No action. Adding any RAG pipeline re-opens this with a required standing control: separate retr |
| C-24 | MUST-FIX | PARTIAL | Keep the no-secrets scan standing. If a runtime model/system prompt is ever added, the required  |
| C-28 | MUST-FIX | NOT-APPLICABLE | No action. Adding any personal-data store re-opens this; the required standing control is a depl |
| C-34 | MUST-FIX | NOT-APPLICABLE | No action for the static product. If a runtime model API is added, the required standing control |
| C-13 | SHOULD-FIX | NOT-APPLICABLE | None required at baseline. If the project ever markets an AI-management-system posture, it becom |
| C-14 | SHOULD-FIX | PARTIAL | Smallest real step: add a periodic second-vendor (non-Anthropic) cross-audit of the adversarial- |
| C-19 | SHOULD-FIX | NOT-APPLICABLE | None owed. Applicability re-opens if a retrieval/memory/vector feature is added; the required st |
| C-20 | SHOULD-FIX | PARTIAL | Smallest real step: write a one-page RAI dimension register marking fairness/contestability/cont |
| C-25 | SHOULD-FIX | PARTIAL | Smallest real step: (1) add a one-paragraph written IP position (US machine-authored code = no c |
| C-29 | SHOULD-FIX | NOT-APPLICABLE | None owed. Re-opens if a generative or user-generated-content surface is introduced; the require |
| C-30 | SHOULD-FIX | NOT-APPLICABLE | None owed. Re-opens on shipping a model-backed feature; required standing control would be a jai |
| C-32 | SHOULD-FIX | NOT-APPLICABLE | None owed. Re-opens if embeddings/a vector store are introduced; required standing control would |
| C-33 | SHOULD-FIX | PARTIAL | Smallest real step: land verify/ on main under the enabled ruleset so the compiled-clause gate i |
| C-36 | SHOULD-FIX | PARTIAL | Smallest real step: add a deterministic test asserting the machine-authorship disclosure in CLAU |
| C-38 | SHOULD-FIX | PARTIAL | Smallest real step: mark the status-feed 'source'/'as_of' provenance in-UI as operator-asserted  |
| C-31 | PLAN | PARTIAL | Write a short ATLAS + agentic-threat-decomposition mapping scoped to the two real surfaces (dev- |
| C-35 | ASSESS | PARTIAL | Close R-GATE: land verify/ on main and require the verify check via branch protection so the val |
| C-39 | ASSESS | NOT-APPLICABLE | No action at baseline. Re-opening tripwire: a C-13 record that claims an AIMS/ISO 42001 manageme |
| C-40 | ASSESS | PARTIAL | Commit a one-page energy/carbon materiality memo: static client-side site, no server/inference a |
