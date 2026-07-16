# 00 — System map (Phase 0 freeze)

**Engagement:** Due-Diligence and Remediation Mandate, Part 1 (catalogue v1.0, 79 active checks).
**Frozen baseline commit:** `d19556d62e80ec3ca1f5285fd610b0dcc379dd12` (branch `main` at freeze; work branch `claude/crisis-winners-github-pages-q279tk`).
**Freeze date:** 2026-07-16.

## What this system is

A **zero-build static single-page site** ("Crisis Winners — and the 2026 AI question"), served by
GitHub Pages from the repository root at the custom domain `https://<prod-host>` (CNAME file).
Deployment is `git push` to `main` — there is no build step, no bundler, no server-side code, no
CI/CD pipeline, and no test suite in the repository at the frozen baseline. Two JSX source files
are transpiled **in the visitor's browser** by Babel Standalone.

Written and maintained end-to-end by AI agents (Anthropic Claude Code sessions). No human reviews
changes. This is the operating model the mandate governs.

## Environments

| Environment | What it is | How it deploys |
|---|---|---|
| Production | GitHub Pages, branch `main`, root; custom domain `<prod-host>` | Any push to `main` — **no admission control of any kind** |
| Local preview | `python3 -m http.server` from repo root | n/a (documented in README) |

There is no staging environment, no canary, no rollout mechanism beyond Pages' single-step deploy.

## Models and providers

- **In-product runtime models: none.** No inference call is made by this codebase. The optional
  bubblegauge integration *consumes* one field of AI-generated text (`judgment_call.text`) from an
  external API and renders it with stale/error provenance labels.
- **Maintenance-time models (the agents that write this code):** Anthropic Claude (Claude Code
  sessions; this engagement runs on `claude-fable-5`). **No pinning, no provenance recording, and
  no second-vendor verifier exists at baseline.**

## Tools the model can call

In-product: **none** (no runtime model). Maintenance-time: the Claude Code session has full
repository write + push via the GitHub integration — **there is no policy bundle and no gate
between an agent's output and production** (see below).

## Data stores

| Store | Location | Contents |
|---|---|---|
| Client `sessionStorage` | visitor browser | one key, `bubblegauge:enabled` (activation key string) |
| In-memory fetch cache | visitor browser (bubblegauge.jsx `cache` object) | API JSON responses, 25-min TTL |
| Git history | GitHub | the only persistence; also the de-facto backup/restore mechanism |

No server-side stores, no databases, no vector stores, no caches beyond the above, no user data,
no analytics or trackers (by CLAUDE.md policy).

## Egress paths (complete)

| Destination | Trigger | Control at baseline |
|---|---|---|
| `unpkg.com` | 5 pinned CDN `<script>` loads on every page view | Exact version pins + sha384 SRI + `crossorigin=anonymous` |
| `the bubblegauge API host` | ONLY when `?status-api=<key>` gate active; GET-only reads | Key whitelist `^[a-z0-9-]{1,32}$`; same-registrable-domain subdomain derivation; demo mode = zero network |
| `www.etoro.com` | user-clicked navigation links (Playbook tab) | `target=_blank rel="noopener noreferrer"`; navigation only |

No other egress exists in the codebase (verified by grep over all source at the frozen commit).

## The policy bundle that gates merges — **DOES NOT EXIST**

Recorded per Phase-0 instruction, and it is the engagement's headline fact:

- **What gates merges/deploys today: nothing.** A push to `main` is production, instantly.
- **Identities that can write to `main`:** the repository owner (`mglaeser`) and any authorized
  Claude Code session (the code-writing agent). **The code-writing identity therefore has
  unrestricted write access to its own (nonexistent) gate** — the exact condition the mandate's
  B-35 escalation describes.
- Session-local verification (Playwright smoke tests, responsive audits, esbuild syntax checks)
  was performed during development **in a scratchpad outside the repository, invoked by the agent
  at its own discretion** — under Rule 1 this is not a control; it is a hope. These mechanisms are
  slated for **replacement** by committed, machine-executed standing controls (user-authorized
  overlap replacement; see DR-001 in `audit/decisions/`).

## Repository class (Article XV)

**Production.** The site serves public traffic at `<prod-host>`. It holds no secrets, no
credentials, no personal data, and has no server — which narrows many checks' applicability
(argued per-check in the findings, never assumed) — but the class, and therefore the regime
obligation, is production.

## Audit surface

The machine-readable denominator of this engagement is `audit/00-audit-surface.json` (every file,
route, dependency, identity, configuration and egress destination). "Thorough" is defined against
that file (coverage ledger `audit/03b-coverage-ledger.md`), not against diligence.
