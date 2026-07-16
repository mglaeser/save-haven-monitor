# DR-005 — Production domain redacted from all public repository text

**Date:** 2026-07-16 · **State:** ACCEPTED · **Author:** audit engagement (agent) · **Decider:** repo owner (explicit instruction)

## Context
The owner instructed that the production domain must not be named publicly in this repository.
Occurrences existed in docs (INTEGRATION_NOTES, system map, claims ledger, findings), in JSON
evidence strings, in a code comment, in the verify-harness location stub, and in the constitution
(Article XV).

## Decision
1. All prose/evidence occurrences replaced with neutral placeholders (`<prod-host>`,
   `<prod-domain>`, "the bubblegauge API host"). Semantics of evidence records unchanged.
2. `verify/lib/load.js` stub hostname replaced with the behavior-equivalent `crash.example.com`
   (single-label parent domain — the leftmost-strip derivation under test is unaffected).
3. `governance/constitution.md` Article XV amended (neutral wording); this is a content-neutral
   amendment under Article XIII — hash re-attested in the digest, `engagement-status.json`, and
   `.constitution.sha256` by this record.
4. **Deliberate exception: `CNAME`.** GitHub Pages requires the literal custom domain in this file
   for the site to serve at all — it cannot be redacted without disabling the domain. The domain is
   also inherently discoverable via public DNS. Recorded as the one accepted occurrence.
5. **Standing rule added to CLAUDE.md** (binding on every future session): never write the
   production domain into repository files; use placeholders; `CNAME` is the sole exception.

## Honest limitation
Git history retains pre-redaction file versions. A full scrub would require history rewriting and
force-pushes across branches/PRs — destructive, and pointless while the CNAME/DNS remain public.
Not done; recorded instead.
