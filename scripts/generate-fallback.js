"use strict";
// scripts/generate-fallback.js — deploy-time fallback content generation (DR-014 section 6;
// rulings Q15/Q16/Q22/Q23). CI-ONLY: deploy.yml's build job runs this AFTER `node build.js --dist`
// and BEFORE the Pages-artifact upload, so the SLSA attestation covers the exact fallback bytes.
// This file is NOT in the served allowlist and never ships to the Pages origin; its only output
// is the data file dist/content/fallback.json.
//
// What it does:
//   1. Derives the content-API origin AT RUNTIME from the CNAME file: fixed subdomain SUB + the
//      CNAME's parent domain, mirroring the client's KEY_RE-validated derivation (the whitelist regex
//      below is byte-identical to the client's — red line 1). No literal host string exists in
//      this file (red line 2); both origins this script contacts are CNAME-derived, and
//      redirect:"error" keeps CI egress pinned to exactly those two origins.
//   2. Fetches /api/v1/content/dashboard, /api/v1/content/dynamic and /api/v1/score, validates
//      the response shapes (PR-0 hardening contract 4), and assembles
//      dist/content/fallback.json = { as_of (YYYY-MM-DD), content_version >= 1, blocks, slots,
//      display } — the exact shape the frozen acceptance contract (06-content checkShape) and
//      the client commit contract (src/content.ts parseFallback) pin.
//   3. Disclaimer write barrier (red line 5 / Q7/Q50): a payload without a non-empty canonical
//      'site.disclaimer' block (the exact slug + phrase the client and the frozen acceptance
//      suite gate on) NEVER commits, on any code path — the check re-runs on the serialized
//      bytes immediately before the atomic rename. A WELL-FORMED API payload that lacks the
//      disclaimer exits 1 and blocks the deploy: that is the content source breaching the
//      program contract, and a human must look.
//   4. Availability never blocks the deploy (Q15): if any fetch fails (unreachable, non-2xx,
//      redirect, timeout, oversized, or unparseable/misshapen JSON), WARN and recover the
//      currently published artifact from the Pages origin so "the previous deploy's artifact
//      remains" survives a full-site republish; its own as_of stamp is preserved, so content
//      freshness = last good sync. If recovery also fails (first deploy, origin outage), WARN
//      and exit 0 with no artifact written — the page's hard-baked disclaimers and the client's
//      labeled offline state cover visitors whose browser cannot reach the API until the next successful sync (daily
//      scheduled deploy, Q22; CDN staleness <= 600 s accepted, Q23).

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const DIST = path.join(ROOT, "dist");
const OUT_DIR = path.join(DIST, "content");
const OUT_FILE = path.join(OUT_DIR, "fallback.json");

const SUB = "api"; // fixed content-API subdomain (Q16) — a fragment, not a host
const KEY_RE = /^[a-z0-9-]{1,32}$/; // IDENTICAL to the client's whitelist (red line 1)
const HOST_RE = /^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/;
// The canonical disclaimer block. IDENTICAL to src/content.ts DISCLAIMER_SLUG and to the frozen
// acceptance contract (acceptance/tests/06-content.js checkShape): the client commits a payload
// ONLY when blocks["site.disclaimer"] carries non-empty text, so the write barrier must demand
// exactly that — an artifact that merely carries the word under another slug would publish fine
// and then never commit client-side (dead content for visitors whose browser cannot reach the API). The token regex below
// is kept as a SECONDARY sweep for logging extra disclaimer blocks, never as the barrier.
const DISCLAIMER_SLUG = "site.disclaimer";
const DISCLAIMER_TEXT_RE = /not investment advice/; // frozen phrase (06-content checkShape)
const DISCLAIMER_SLUG_RE = /(^|[._-])disclaimers?([._-]|$)/;
const FETCH_TIMEOUT_MS = 30000;
const MAX_BODY_BYTES = 5 * 1024 * 1024;

function fail(msg) {
  console.error("::error::" + msg);
  process.exit(1);
}
function warn(msg) {
  console.warn("::warning::" + msg);
}
function isObj(v) {
  return v !== null && typeof v === "object" && !Array.isArray(v);
}

/* ---------- origin derivation (Q16; mirrors the client, spec section 4.1) ---------- */

function deriveOrigins(cnameText) {
  const cname = String(cnameText).trim().toLowerCase();
  if (!HOST_RE.test(cname)) return { error: "CNAME does not contain a plain hostname" };
  if (!KEY_RE.test(SUB)) return { error: "subdomain fails the KEY_RE whitelist" };
  const labels = cname.split(".");
  // Same leftmost-strip the client uses (single-label parent domain; see INTEGRATION_NOTES).
  const parent = labels.length > 2 ? labels.slice(1).join(".") : cname;
  return { api: "https://" + SUB + "." + parent, pages: "https://" + cname };
}

/* ---------- bounded fetch (single retry; no redirect escape) ---------- */

async function fetchBody(url) {
  let lastErr;
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const res = await fetch(url, {
        redirect: "error", // CI egress stays on the two CNAME-derived origins
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
        headers: {
          accept: "application/json",
          "user-agent": "save-haven-monitor fallback generator (deploy.yml build job)",
        },
      });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const text = await res.text();
      if (Buffer.byteLength(text, "utf8") > MAX_BODY_BYTES) {
        throw new Error("response exceeds " + MAX_BODY_BYTES + " bytes");
      }
      return text;
    } catch (e) {
      lastErr = e;
      if (attempt < 2) await new Promise((r) => setTimeout(r, 2000));
    }
  }
  throw lastErr;
}

/* ---------- response-shape validation (PR-0 hardening contract 4) ---------- */

function validateDashboard(o) {
  if (!isObj(o) || !isObj(o.data) || !isObj(o.meta)) return "missing data/meta envelope";
  if (!isObj(o.data.blocks)) return "data.blocks is not an object";
  if (!Number.isInteger(o.data.content_version) || o.data.content_version < 1) return "data.content_version is not a positive integer (frozen artifact contract needs >= 1)";
  for (const [slug, b] of Object.entries(o.data.blocks)) {
    if (!isObj(b) || typeof b.kind !== "string") return "block '" + slug + "' has no string kind";
    if (typeof b.text !== "string" && !Array.isArray(b.items) && b.entries === undefined) return "block '" + slug + "' carries none of text/items/entries";
  }
  return null;
}

function validateDynamic(o) {
  if (!isObj(o) || !isObj(o.data) || !isObj(o.meta)) return "missing data/meta envelope";
  if (!isObj(o.data.slots)) return "data.slots is not an object";
  if (!Number.isInteger(o.data.content_version) || o.data.content_version < 1) return "data.content_version is not a positive integer (frozen artifact contract needs >= 1)";
  for (const [slug, s] of Object.entries(o.data.slots)) {
    if (!isObj(s) || typeof s.text !== "string") return "slot '" + slug + "' has no string text";
  }
  return null;
}

function validateScore(o) {
  if (!isObj(o) || !isObj(o.data)) return "missing data envelope";
  if (!isObj(o.data.display)) return "data.display is not an object (gauge copy deck absent)";
  return null;
}

/* ---------- disclaimer barrier (red line 5) ---------- */

function blockHasContent(b) {
  if (!isObj(b)) return false;
  if (typeof b.text === "string" && b.text.trim().length > 0) return true;
  if (Array.isArray(b.items) && b.items.length > 0) return true;
  if (Array.isArray(b.entries)) return b.entries.length > 0;
  if (isObj(b.entries)) return Object.keys(b.entries).length > 0;
  return false;
}

function findDisclaimerSlugs(blocks) {
  return Object.keys(blocks).filter((slug) => DISCLAIMER_SLUG_RE.test(slug) && blockHasContent(blocks[slug]));
}

// The barrier proper: the canonical block the CLIENT gates its commit on (src/content.ts
// hasDisclaimer) with the frozen phrase the acceptance contract pins. Returns an error string
// or null.
function canonicalDisclaimerError(blocks) {
  const d = blocks[DISCLAIMER_SLUG];
  if (!isObj(d)) return "no '" + DISCLAIMER_SLUG + "' block (the client commits on exactly this slug)";
  if (typeof d.text !== "string" || d.text.trim().length === 0) return "'" + DISCLAIMER_SLUG + "' block has no non-empty text";
  if (!DISCLAIMER_TEXT_RE.test(d.text)) return "'" + DISCLAIMER_SLUG + "' text lacks the frozen disclaimer phrase (06-content contract)";
  return null;
}

/* ---------- the single write path ---------- */

// Write barrier: re-parse the exact bytes about to be published and re-verify the disclaimer is
// inside them. Nothing reaches OUT_FILE without passing this, on any code path. Returns an error
// string (nothing written) or null (committed atomically).
function commit(bytes, label) {
  let parsed;
  try {
    parsed = JSON.parse(bytes);
  } catch (e) {
    return "artifact bytes are not valid JSON";
  }
  if (!isObj(parsed)) return "artifact is not a JSON object";
  // as_of is a DATE (YYYY-MM-DD): DR-014 section 6 mandates an as_of date, and the frozen
  // acceptance contract (06-content checkShape) pins exactly this shape on every served artifact.
  if (typeof parsed.as_of !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(parsed.as_of) || Number.isNaN(Date.parse(parsed.as_of))) {
    return "artifact lacks a YYYY-MM-DD as_of stamp (frozen acceptance contract)";
  }
  if (!Number.isInteger(parsed.content_version) || parsed.content_version < 1) return "artifact lacks an integer content_version >= 1 (frozen acceptance contract)";
  if (!isObj(parsed.blocks)) return "artifact lacks a blocks object";
  const canonErr = canonicalDisclaimerError(parsed.blocks);
  if (canonErr) return canonErr;
  const found = findDisclaimerSlugs(parsed.blocks);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmp = OUT_FILE + ".tmp";
  fs.writeFileSync(tmp, bytes);
  fs.renameSync(tmp, OUT_FILE);
  console.log(
    "fallback: wrote " + path.relative(ROOT, OUT_FILE) + " (" + Buffer.byteLength(bytes, "utf8") +
    " bytes, " + label + "; disclaimer block(s): " + found.join(", ") + ")"
  );
  return null;
}

/* ---------- recovery path (Q15: the previous artifact remains) ---------- */

async function recover(origins) {
  let bytes;
  try {
    bytes = await fetchBody(origins.pages + "/content/fallback.json");
  } catch (e) {
    warn(
      "fallback: no previously published artifact could be recovered either (" + e.message +
      ") — this deploy ships WITHOUT dist/content/fallback.json; hard-baked page disclaimers and " +
      "the labeled offline state cover visitors whose browser cannot reach the API until the next successful sync"
    );
    return;
  }
  const err = commit(bytes, "recovered from the live origin; as_of preserved, freshness = last good sync");
  if (err) {
    // A live artifact that fails the barrier (for example, no disclaimer) must NOT be
    // re-published. Shipping without it actively removes the non-conforming file from the origin.
    warn("fallback: the recovered live artifact failed the write barrier (" + err + ") — discarded; this deploy ships without a fallback artifact, removing the non-conforming file from the origin");
  }
}

/* ---------- main ---------- */

async function main() {
  if (!fs.existsSync(DIST)) fail("fallback: dist/ does not exist — run `node build.js --dist` before this script (workflow ordering bug)");

  let cnameText;
  try {
    cnameText = fs.readFileSync(path.join(ROOT, "CNAME"), "utf8");
  } catch (e) {
    fail("fallback: cannot read CNAME (" + e.message + ") — no origin can be derived");
  }
  const origins = deriveOrigins(cnameText);
  if (origins.error) fail("fallback: " + origins.error + " — no origin can be derived");
  console.log("fallback: content-API origin derived from CNAME at runtime: " + origins.api);

  let dashboard, dynamic, score;
  try {
    dashboard = JSON.parse(await fetchBody(origins.api + "/api/v1/content/dashboard"));
    dynamic = JSON.parse(await fetchBody(origins.api + "/api/v1/content/dynamic"));
    score = JSON.parse(await fetchBody(origins.api + "/api/v1/score"));
  } catch (e) {
    warn("fallback: content API unreachable at build time (" + e.message + ") — deploy proceeds (Q15); attempting recovery of the previously published artifact");
    return recover(origins);
  }

  const shapeErrs = [];
  const e1 = validateDashboard(dashboard);
  if (e1) shapeErrs.push("content/dashboard: " + e1);
  const e2 = validateDynamic(dynamic);
  if (e2) shapeErrs.push("content/dynamic: " + e2);
  const e3 = validateScore(score);
  if (e3) shapeErrs.push("score: " + e3);
  if (shapeErrs.length > 0) {
    warn("fallback: content API responded with unexpected shapes (" + shapeErrs.join("; ") + ") — the payload does not commit (PR-0 contract 4); attempting recovery of the previously published artifact");
    return recover(origins);
  }

  // Red line 5, hard case: the shapes are valid but no disclaimer block exists. The content
  // SOURCE is breaching the program contract — block the deploy rather than silently pin an
  // ever-staler recovered artifact forever.
  const hardErr = canonicalDisclaimerError(dashboard.data.blocks);
  if (hardErr) {
    fail("fallback: content/dashboard payload is well-formed but fails the canonical disclaimer contract (" + hardErr + ") — refusing to assemble a fallback from it and BLOCKING the deploy (red line 5; the client commits only on '" + DISCLAIMER_SLUG + "')");
  }

  const dv = dashboard.data.content_version;
  const yv = dynamic.data.content_version;
  if (dv !== yv) {
    warn("fallback: content_version skew across endpoints (dashboard=" + dv + ", dynamic=" + yv + ") — stamping the max; a version bump likely landed mid-fetch and tomorrow's scheduled deploy reconciles it");
  }

  const artifact = {
    as_of: new Date().toISOString().slice(0, 10), // YYYY-MM-DD (DR-014 section 6 "as_of date"; 06-content checkShape pins this shape)
    content_version: Math.max(dv, yv),
    blocks: dashboard.data.blocks,
    slots: dynamic.data.slots,
    display: score.data.display,
  };
  const err = commit(JSON.stringify(artifact, null, 1) + "\n", "fresh, content_version " + artifact.content_version);
  if (err) fail("fallback: write barrier rejected the freshly assembled artifact (" + err + ")");
}

if (require.main === module) {
  main().catch((e) => fail("fallback: unexpected failure (" + ((e && e.stack) || e) + ")"));
}

// Exported for the verify harness (pure functions only; no network, no fs writes).
module.exports = { deriveOrigins, validateDashboard, validateDynamic, validateScore, findDisclaimerSlugs, canonicalDisclaimerError, blockHasContent, KEY_RE, DISCLAIMER_SLUG, DISCLAIMER_TEXT_RE, DISCLAIMER_SLUG_RE };
