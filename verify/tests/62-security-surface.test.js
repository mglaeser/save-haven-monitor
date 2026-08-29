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
//
// AMENDED under DR-014 item 2 (Q3/Q14, ruled a NEUTRAL surface change): the fetch rule now
// permits SAME-ORIGIN RELATIVE content fetches — and, as the Article-IX-style strengthening
// ruled alongside the widening, ENFORCES the response-shape validator's existence wherever such
// a fetch exists (red line 5: a content payload without a disclaimer never commits). The host
// allowlist, the gated API_BASE rule, and the flat-zero undeclared-egress ratchet are unchanged:
// a relative URL names no host, so the widening adds NO egress destination. The content loader
// module (src/content.ts), when it ships, joins every served-source scan and gets its own
// chokepoint contract below. Red line 4 gains its own tripwire: no service worker.
const fs = require("fs");
const path = require("path");
const { REPO, raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const SERVED = ["index.html", "src/dashboard.tsx", "src/bubblegauge.tsx", "widget.html"];
// The content loader (DR-014 item 7 / A2 §2) — bundled into the served JS once the wiring lands.
// Conditional: absent on the pre-wiring site, mandatory in every scan the moment it exists.
const CONTENT_MODULE = "src/content.ts";
const servedAll = () => SERVED.concat(fs.existsSync(path.join(REPO, CONTENT_MODULE)) ? [CONTENT_MODULE] : []);

// The complete declared egress + rendered-link allowlist for the served site.
//  (unpkg.com removed — vendors are now self-hosted under ./vendor/, no third-party runtime egress)
//  www.etoro.com    — a frozen outbound link in the crisis atlas content (dashboard.jsx)
//  www.w3.org       — SVG namespace in the inline favicon (NOT a network call)
//  localhost        — the dev-only status-API fallback (bubblegauge.jsx)
// The live status-API host is CONSTRUCTED from a KEY_RE-whitelisted key (30-static-security),
// never a literal, so it needs no allowlist entry here. Same-origin RELATIVE fetches (DR-014)
// carry no host and therefore never touch this allowlist.
const EGRESS_ALLOW = new Set(["www.etoro.com", "www.w3.org", "localhost"]);

module.exports = function register(t) {
  t("C-08/C-28: no undeclared egress or rendered-link destination in served source", () => {
    for (const f of servedAll()) {
      const src = raw(f);
      const hosts = [...src.matchAll(/https?:\/\/([a-zA-Z0-9.-]+)/g)].map((m) => m[1]);
      for (const h of hosts) ok(EGRESS_ALLOW.has(h), `undeclared egress/link host '${h}' in ${f} — a new destination completes an exfiltration leg (C-08) and escapes residency scope (C-28); add it to the allowlist by decision record or remove it`);
    }
  });

  t("C-08 (amended DR-014 §2): fetches are the gated API_BASE or same-origin relative literals; relative fetches require the shape validator", () => {
    for (const f of SERVED) {
      const src = raw(f);
      // first-argument prefix of every fetch CALL site in the four page sources (paren must
      // follow immediately — call sites only, not prose; the class excludes identifier tails
      // like boundedFetch but still catches a window.fetch( dodge)
      const args = [...src.matchAll(/(?<![A-Za-z0-9_$])fetch\(\s*([^),]*)/g)].map((m) => m[1].trim());
      let contentFetches = 0;
      for (const a of args) {
        if (/^API_BASE\b/.test(a)) continue; // the gated, constructed, KEY_RE-whitelisted base (30-static-security)
        if (/^["'`]\.?\/(?!\/)/.test(a)) {   // same-origin relative literal: "/x" or "./x", never "//host"
          ok(!a.includes("${"), `relative fetch in ${f} must be a plain literal, not an interpolated template: ${a.slice(0, 60)}`);
          contentFetches++;
          continue;
        }
        ok(false, `fetch target in ${f} is neither the gated API_BASE nor a same-origin relative literal: ${a.slice(0, 60)} — an absolute or computed URL re-opens C-08/C-28 (route content loads through ${CONTENT_MODULE}'s chokepoint instead)`);
      }
      if (contentFetches > 0) {
        // Q14 strengthening: the widening is only NEUTRAL because shape validation exists at the consumer.
        ok(/hasDisclaimer|validateContentPayload/.test(src), `${f} makes ${contentFetches} relative content fetch(es) with no response-shape/disclaimer validation idiom — a content payload without a disclaimer must never commit (DR-014 §2 / Q14 / red line 5)`);
      }
    }
    // the contracts that survive the amendment unchanged:
    const bg = raw("src/bubblegauge.tsx");
    ok(/fetch\(\s*API_BASE\b/.test(bg), "bubblegauge.jsx's status fetch must target the constructed, gated API_BASE");
    const widget = raw("widget.html");
    ok(/const\s+KEY_RE\s*=\s*\/\^\[a-z0-9-\]\{1,32\}\$\//.test(widget), "widget.html gates its status-api key with the same KEY_RE whitelist");
    for (const f of servedAll()) {
      const src = raw(f);
      ok(!/\bnew\s+WebSocket\b|\bEventSource\b|navigator\.sendBeacon/.test(src), `unexpected persistent/exfil channel in ${f}`);
    }
  });

  t("DR-014 §2 (Q14 strengthening): the content loader, when present, chokepoints its fetch and validates shape + disclaimer", () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return; // pre-wiring state: no content loader ships yet
    const code = raw(CONTENT_MODULE);
    // 1. single fetch chokepoint, gated by the URL allowlist (call sites only — see class note above)
    const fetches = code.match(/(?<![A-Za-z0-9_$])fetch\(/g) || [];
    ok(fetches.length === 1, `${CONTENT_MODULE} must have exactly ONE fetch call site (the bounded chokepoint), got ${fetches.length}`);
    ok(/fetch\(\s*checked\b/.test(code), "the single fetch must consume only assertContentUrl-checked URLs");
    ok(/assertContentUrl/.test(code) && /isSameOriginRelativeUrl/.test(code), "URL-allowlist chokepoint (assertContentUrl + isSameOriginRelativeUrl) must exist");
    ok(/["']\/\/["']/.test(code), "protocol-relative URLs must be rejected explicitly (A2 §2 same-origin filter)");
    // 2. response-shape validation with a load-bearing disclaimer check (red line 5)
    ok(/function\s+hasDisclaimer/.test(code), "hasDisclaimer validator must exist");
    ok(/function\s+parseFallback[\s\S]{0,900}?hasDisclaimer\s*\(/.test(code), "parseFallback must gate commit on hasDisclaimer — a fallback artifact without the disclaimer never commits");
    ok(/function\s+parseLiveDashboard[\s\S]{0,600}?hasDisclaimer\s*\(/.test(code), "parseLiveDashboard must gate commit on hasDisclaimer — a live payload without the disclaimer never commits");
    // 3. no literal host in the content loader (the fallback URL is relative; live base comes from the gate)
    ok(!/https?:\/\//.test(code), `no literal http(s) host may appear in ${CONTENT_MODULE} — the live base derives from the KEY_RE-gated BubbleGauge apiBase only`);
  });

  t("DR-014 red line 4: no server, no service worker in the served artifact", () => {
    for (const f of servedAll()) {
      const src = raw(f);
      ok(!/serviceWorker|importScripts\s*\(/.test(src), `service-worker idiom in ${f} — red line 4 forbids any server/service-worker in the served artifact (fresh owner decision required)`);
    }
  });

  t("C-05/C-06/C-07/C-21/C-22/C-30/C-32: no runtime model/agent/embedding/vector-store client ships", () => {
    // Match CODE idioms (SDK clients / RAG), never company names — this is an AI-bubble dashboard
    // whose editorial content legitimately discusses AI vendors.
    const AI_CLIENT = /new\s+(OpenAI|Anthropic|CohereClient|MistralClient)\s*\(|\.chat\.completions\.create|\.embeddings\.create|\.messages\.create\s*\(|require\(["'](openai|@anthropic-ai\/sdk|langchain|@pinecone-database\/pinecone|chromadb|weaviate-ts-client|@qdrant\/js-client-rest)|from\s+["'](openai|@anthropic-ai\/sdk|langchain|@pinecone-database\/pinecone|chromadb|weaviate|@qdrant)/;
    for (const f of servedAll()) ok(!AI_CLIENT.test(raw(f)), `runtime AI/RAG client idiom found in ${f} — a runtime model/agent re-opens the Track C runtime taxonomy (C-05..C-08, C-30, C-32)`);
  });

  t("C-23: no remote logging or telemetry sink exists in served source", () => {
    const SINK = /navigator\.sendBeacon|\bSentry\b|datadogRum|datadogLogs|\bgtag\s*\(|analytics\.track|\bmixpanel\.|\bposthog\./;
    for (const f of servedAll()) ok(!SINK.test(raw(f)), `telemetry/logging sink in ${f} — a prompt/PII-capturing sink re-opens C-23; redaction-at-emitter is the door if one is ever added`);
  });

  t("C-04: no credential/PII-capturing input and no client-side personal-data store", () => {
    for (const f of servedAll()) {
      const src = raw(f);
      ok(!/type=["']password["']/i.test(src), `password input in ${f} — the site collects no credentials (C-04)`);
      ok(!/document\.cookie/.test(src), `cookie access in ${f} — the site sets no cookies (C-04)`);
      ok(!/\blocalStorage\b/.test(src), `localStorage in ${f} — the only permitted client store is sessionStorage of the status-API key, not personal data (C-04)`);
    }
  });
};
