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

## Addendum — history rewrite executed (owner instruction)

The owner subsequently instructed the full scrub. `git filter-branch` rewrote all refs, applying
the same replacement scheme to every historical blob (CNAME excluded — it necessarily carries the
domain at every point, see above); backup refs purged, reflog expired, gc'd. Verified: the domain
appears in no blob of any commit except `CNAME`. All commit SHAs changed; attested baseline
references were remapped in the current audit files:

| Old (attested at the time) | New (post-rewrite) |
|---|---|
| `d19556d` (Part 1 Phase-0 frozen baseline / old `main` tip) | `04772bf` |
| `9a02414` (Part 2 Phase-0′ baseline) | `d0521b0` |
| `82565b6` (Phase 0-1 commit) | `2aa7838` |

Honest limits that remain: GitHub retains unreachable objects until its own GC (old SHAs may stay
fetchable for a while), and the closed PRs #1–#5 keep their server-side `refs/pull/*` snapshots and
rendered diffs, which predate the redaction — removing those requires GitHub Support (or deleting
the repository). The force-push removes the domain from everything a clone of the branches sees.
