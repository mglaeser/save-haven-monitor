"use strict";
// Track C standing control — the security-surface tripwire. It asserts, by inspection of the
// served source, the architectural facts that ground Track C's NOT-APPLICABLE and PASS verdicts,
// so those verdicts are backed by a control that BLOCKS the change which would make the check
// apply (DoD #10 — a watched control behind every verdict, not a shrug). It covers:
//   C-08 lethal trifecta  — the "private data" and "extra egress" legs stay empty by construction;
//   C-28 residency/egress — no undeclared network/link destination can be added silently;
//   C-05/C-06/C-07/C-21/C-22/C-30/C-32 — no runtime model/agent/embedding/vector-store idiom exists;
//   C-23 personal-data-in-logs — no remote logging/telemetry sink exists;
//   C-04 privacy — no credential/PII-capturing input or client-side personal-data store exists.
// Every assertion is a tripwire: the day the architecture changes to make a check apply, this
// fails the build and re-opens the finding.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const SERVED = ["index.html", "src/dashboard.tsx", "src/bubblegauge.tsx", "widget.html"];
// The complete declared egress + rendered-link allowlist for the served site.
//  (unpkg.com removed — vendors are now self-hosted under ./vendor/, no third-party runtime egress)
//  www.etoro.com    — a frozen outbound link in the crisis atlas content (dashboard.jsx)
//  www.w3.org       — SVG namespace in the inline favicon (NOT a network call)
//  localhost        — the dev-only status-API fallback (bubblegauge.jsx)
// The live status-API host is CONSTRUCTED from a KEY_RE-whitelisted key (30-static-security),
// never a literal, so it needs no allowlist entry here.
const EGRESS_ALLOW = new Set(["www.etoro.com", "www.w3.org", "localhost"]);

module.exports = function register(t) {
  t("C-08/C-28: no undeclared egress or rendered-link destination in served source", () => {
    for (const f of SERVED) {
      const src = raw(f);
      const hosts = [...src.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)].map((m) => m[1]);
      for (const h of hosts) ok(EGRESS_ALLOW.has(h), `undeclared egress/link host '${h}' in ${f} — a new destination completes an exfiltration leg (C-08) and escapes residency scope (C-28); add it to the allowlist by decision record or remove it`);
    }
  });

  t("C-08: the only network fetch is the gated status-API; no other fetch/socket exists", () => {
    const bg = raw("src/bubblegauge.tsx");
    const dash = raw("src/dashboard.tsx");
    const html = raw("index.html");
    ok(!/\bfetch\s*\(/.test(dash), "dashboard.jsx must make no network call (it renders frozen data)");
    ok(!/\bfetch\s*\(/.test(html), "index.html must make no network call beyond its pinned <script> tags");
    ok(/fetch\(\s*API_BASE\b/.test(bg), "bubblegauge.jsx's single fetch must target the constructed, gated API_BASE");
    // The served JsWidget (widget.html) is STATELESS and its only network calls must be to the SAME
    // gated, constructed API_BASE (subdomain-of-parent, KEY_RE-whitelisted) — never a literal host.
    const widget = raw("widget.html");
    for (const fc of widget.match(/\bfetch\s*\([^)]*/g) || [])
      ok(/fetch\(\s*API_BASE\b/.test(fc), `widget.html fetch must target the gated API_BASE, got: ${fc.slice(0, 40)}`);
    ok(/const\s+KEY_RE\s*=\s*\/\^\[a-z0-9-\]\{1,32\}\$\//.test(widget), "widget.html gates its status-api key with the same KEY_RE whitelist");
    for (const f of SERVED) {
      const src = raw(f);
      ok(!/\bnew\s+WebSocket\b|\bEventSource\b|navigator\.sendBeacon/.test(src), `unexpected persistent/exfil channel in ${f}`);
    }
  });

  t("C-05/C-06/C-07/C-21/C-22/C-30/C-32: no runtime model/agent/embedding/vector-store client ships", () => {
    // Match CODE idioms (SDK clients / RAG), never company names — this is an AI-bubble dashboard
    // whose editorial content legitimately discusses AI vendors.
    const AI_CLIENT = /new\s+(OpenAI|Anthropic|CohereClient|MistralClient)\s*\(|\.chat\.completions\.create|\.embeddings\.create|\.messages\.create\s*\(|require\(["'](openai|@anthropic-ai\/sdk|langchain|@pinecone-database\/pinecone|chromadb|weaviate-ts-client|@qdrant\/js-client-rest)|from\s+["'](openai|@anthropic-ai\/sdk|langchain|@pinecone-database\/pinecone|chromadb|weaviate|@qdrant)/;
    for (const f of SERVED) ok(!AI_CLIENT.test(raw(f)), `runtime AI/RAG client idiom found in ${f} — a runtime model/agent re-opens the Track C runtime taxonomy (C-05..C-08, C-30, C-32)`);
  });

  t("C-23: no remote logging or telemetry sink exists in served source", () => {
    const SINK = /navigator\.sendBeacon|\bSentry\b|datadogRum|datadogLogs|\bgtag\s*\(|analytics\.track|\bmixpanel\.|\bposthog\./;
    for (const f of SERVED) ok(!SINK.test(raw(f)), `telemetry/logging sink in ${f} — a prompt/PII-capturing sink re-opens C-23; redaction-at-emitter is the door if one is ever added`);
  });

  t("C-04: no credential/PII-capturing input and no client-side personal-data store", () => {
    for (const f of SERVED) {
      const src = raw(f);
      ok(!/type=["']password["']/i.test(src), `password input in ${f} — the site collects no credentials (C-04)`);
      ok(!/document\.cookie/.test(src), `cookie access in ${f} — the site sets no cookies (C-04)`);
      ok(!/\blocalStorage\b/.test(src), `localStorage in ${f} — the only permitted client store is sessionStorage of the status-API key, not personal data (C-04)`);
    }
  });
};
