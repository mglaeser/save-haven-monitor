#!/usr/bin/env node
"use strict";
// One-shot atlas split (DR-014 item 3; rulings Q1 + Q5) — src/data/atlas.json splits into
//   src/data/atlas-frozen.json  the golden-hashed numeric perimeter: series anchors/months,
//                               weights, CAT/CLS domains, MX_CRISES headers, structural
//                               headings/colors, and each series label SPLIT into {name, verdict}
//                               (Q5: static instrument half + ledger-designated verdict suffix);
//   src/data/atlas-prose.json   the movable science prose: crisis cause/highlight/sources,
//                               matrix notes, classification items — a flat map keyed by the
//                               a1-ledger's atlas.* slugs, OUT of the frozen perimeter and bound
//                               for the content pipeline (bubblegauge content API + fallback).
//
// The split is proven lossless before anything is written: the two candidate artifacts are fed
// through src/data/assemble.ts (the ONE reassembly implementation the served bundle and the test
// harness also use) and the result must deep-equal the original atlas value-for-value (key-order
// insensitive — reassembly reorders keys within objects, which no consumer observes; the frozen
// acceptance goldens canonicalize by sorted key for exactly this reason). Any mismatch aborts
// with nothing written.
//
// Modes:
//   node scripts/split-atlas.js                 read src/data/atlas.json, verify the round trip,
//                                               write both artifacts, print the new frozen hash
//   node scripts/split-atlas.js --write-golden  recompute the hash from src/data/atlas-frozen.json
//                                               (atlas.json no longer needed) and rewrite
//                                               verify/golden/data-hash.json
//
// After the default mode, the enabling PR removes src/data/atlas.json (git rm) — src/data.ts and
// verify/lib/load.js read only the split artifacts. This script stays for auditability: the split
// is reconstructible and re-checkable from git history.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { execSync } = require("child_process");

const REPO = path.resolve(__dirname, "..");
const SRC = path.join(REPO, "src", "data", "atlas.json");
const FROZEN = path.join(REPO, "src", "data", "atlas-frozen.json");
const PROSE = path.join(REPO, "src", "data", "atlas-prose.json");
const ASSEMBLE = path.join(REPO, "src", "data", "assemble.ts");
const GOLDEN = path.join(REPO, "verify", "golden", "data-hash.json");

// Ledger-designated verdict suffixes (a1-ledger atlas.series.* STATIC-SCI entries, Q5). The
// static instrument half keeps everything else — provenance parentheticals like "(TR)",
// "(stylized)", "(vs USD)", "(gold shares)", "(GSCI-type)" are part of the instrument name per
// the ledger's KEEP rows; asia/euro/southsea series carry no verdict suffixes at all.
const SHARED_PHASE1 = "— phase 1"; // atlas.series.shared.phase1 — the 7 phase-1 cash series
const SERIES_SUFFIX = {
  "ai2026/mkt": "(feared market)",            // atlas.series.ai2026.mkt.suffix
  "ai2026/au": "— lead regime-matched hedge", // atlas.series.ai2026.au.suffix
  "ai2026/ust": "— challenged",               // atlas.series.ai2026.ust.suffix
  "ai2026/jpy": "(failed this cycle)",        // atlas.series.ai2026.jpy.suffix
  "ai2026/btc": "(risk asset)",               // atlas.series.ai2026.btc.suffix
  "stagflation/oil": "(unique)",              // atlas.series.stagflation.oil.suffix
  "dotcom/au": "(fell — the exception)",      // atlas.series.dotcom.au.suffix
  "covid/btc": "(falsified safe haven)",      // atlas.series.covid.btc.suffix
};

function fail(msg) { console.error("SPLIT ABORT: " + msg); process.exit(1); }

// Load src/data/assemble.ts (the shared reassembly + slug tables) via the pinned esbuild.
function loadAssemble() {
  const esbuild = require(path.join(REPO, "verify", "node_modules", "esbuild"));
  const src = fs.readFileSync(ASSEMBLE, "utf8");
  const js = esbuild.transformSync(src, { loader: "ts", format: "cjs", target: "node16" }).code;
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", js)(mod, mod.exports);
  return mod.exports;
}

// Key-order-insensitive deep canonical form (same scheme as acceptance/adapter.js canon()).
function canonical(x) {
  if (Array.isArray(x)) return "[" + x.map(canonical).join(",") + "]";
  if (x && typeof x === "object") {
    return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canonical(x[k])).join(",") + "}";
  }
  return JSON.stringify(x);
}

// House serialization: JSON.stringify(x, null, 1) + "\n" byte-round-trips the original
// src/data/atlas.json, so the split artifacts inherit the exact same style.
function serialize(x) { return JSON.stringify(x, null, 1) + "\n"; }
const sha256 = (buf) => crypto.createHash("sha256").update(buf).digest("hex");

function splitLabel(crisisId, s) {
  const label = s.label;
  if (typeof label !== "string" || !label.length) fail(`series ${crisisId}/${s.key} has no label`);
  const declared = SERIES_SUFFIX[crisisId + "/" + s.key];
  const suffix = declared || (label.endsWith(" " + SHARED_PHASE1) ? SHARED_PHASE1 : null);
  if (!suffix) return { name: label };
  if (!label.endsWith(" " + suffix)) {
    fail(`ledger suffix does not match label: ${crisisId}/${s.key} — label ${JSON.stringify(label)}, suffix ${JSON.stringify(suffix)}`);
  }
  return { name: label.slice(0, label.length - suffix.length - 1), verdict: suffix };
}

function split(atlas, A) {
  const prose = {};
  const addProse = (slug, v) => {
    if (typeof v !== "string" || !v.length) fail(`prose value must be a non-empty string: ${slug}`);
    if (slug in prose) fail(`duplicate prose slug: ${slug}`);
    prose[slug] = v;
  };
  const seenSuffix = new Set();

  const CRISES = atlas.CRISES.map((c) => {
    const out = {};
    for (const [k, v] of Object.entries(c)) {
      if (k === "cause" || k === "highlight" || k === "sources") {
        addProse(`atlas.crises.${c.id}.${k}`, v);
      } else if (k === "series") {
        out.series = v.map((s) => {
          const so = {};
          for (const [sk, sv] of Object.entries(s)) {
            if (sk === "label") {
              const parts = splitLabel(c.id, s);
              so.name = parts.name;
              if (parts.verdict) { so.verdict = parts.verdict; seenSuffix.add(c.id + "/" + s.key); }
            } else so[sk] = sv;
          }
          return so;
        });
      } else out[k] = v;
    }
    return out;
  });
  for (const key of Object.keys(SERIES_SUFFIX)) {
    if (!seenSuffix.has(key)) fail(`declared ledger suffix never matched a series: ${key}`);
  }

  if (atlas.MATRIX.length !== A.MATRIX_ROW_SLUGS.length) fail("MATRIX row count != row slug table");
  if (atlas.MX_CRISES.length !== A.MATRIX_COL_SLUGS.length) fail("MX_CRISES count != column slug table");
  const MATRIX = atlas.MATRIX.map((row, ri) => {
    const out = {};
    for (const [k, v] of Object.entries(row)) {
      if (k === "notes") {
        for (const [ci, note] of Object.entries(v)) {
          const col = A.MATRIX_COL_SLUGS[Number(ci)];
          if (!col) fail(`matrix note in unmapped column ${ci} (row ${row.name})`);
          addProse(`atlas.matrix.${A.MATRIX_ROW_SLUGS[ri]}.${col}`, note);
        }
      } else out[k] = v;
    }
    return out;
  });

  if (atlas.CLASSIFICATION.length !== A.CLASSIFICATION_BUCKET_SLUGS.length) fail("CLASSIFICATION bucket count != bucket slug table");
  const CLASSIFICATION = atlas.CLASSIFICATION.map((b, bi) => {
    const out = {};
    for (const [k, v] of Object.entries(b)) {
      if (k === "items") v.forEach((item, i) => addProse(`atlas.classification.${A.CLASSIFICATION_BUCKET_SLUGS[bi]}.${i}`, item));
      else out[k] = v;
    }
    return out;
  });

  const frozen = { CRISES, MATRIX, MX_CRISES: atlas.MX_CRISES, CLASSIFICATION, CAT: atlas.CAT, CLS: atlas.CLS };
  return { frozen, prose };
}

function writeGolden() {
  if (!fs.existsSync(FROZEN)) fail("src/data/atlas-frozen.json not found — run the split first");
  const bytes = fs.readFileSync(FROZEN);
  const hash = sha256(bytes);
  let commit = "UNCOMMITTED";
  try { commit = execSync("git rev-parse --short HEAD", { cwd: REPO, stdio: ["ignore", "pipe", "ignore"] }).toString().trim(); } catch (_) { /* no git */ }
  let supersedes;
  if (fs.existsSync(GOLDEN)) {
    const prev = JSON.parse(fs.readFileSync(GOLDEN, "utf8"));
    supersedes = prev.data_hash === hash ? prev.supersedes
      : `${prev.data_hash} (recorded ${prev.recorded}${prev.frozen_commit ? " @ " + prev.frozen_commit : ""})`;
  }
  const golden = {
    data_hash: hash,
    recorded: new Date().toISOString().slice(0, 10),
    frozen_commit: commit,
    covers: "raw bytes of src/data/atlas-frozen.json ONLY — numeric series anchors/months, weights, CAT/CLS domains, MX_CRISES headers, structural headings/colors, and the split series labels {name, verdict} (Q5). The movable science prose (crisis cause/highlight/sources, matrix notes, classification items) lives in src/data/atlas-prose.json keyed by the a1-ledger's atlas.* slugs, OUTSIDE this hash per DR-014 item 3 — it is governed by the content-pipeline controls (20-golden companion assertions + 70-claims re-homed ratchets), not by this baseline.",
    update_rule: "Changing this requires a decision record in audit/decisions/ (weakening/altering frozen research data is a finding per CLAUDE.md + Article X). Regenerate only via `node scripts/split-atlas.js --write-golden`.",
  };
  if (supersedes) golden.supersedes = supersedes;
  fs.writeFileSync(GOLDEN, serialize(golden));
  console.log("golden re-baselined: verify/golden/data-hash.json");
  console.log("data_hash: " + hash);
}

function main() {
  if (process.argv.includes("--write-golden")) return writeGolden();

  if (!fs.existsSync(SRC)) fail("src/data/atlas.json not found (already split? use --write-golden to re-baseline)");
  const atlas = JSON.parse(fs.readFileSync(SRC, "utf8"));
  const A = loadAssemble();
  const { frozen, prose } = split(atlas, A);

  // Round-trip proof BEFORE writing: assemble(frozen, prose) must reproduce the original atlas
  // value-for-value. This is the same assemble implementation src/data.ts bundles and
  // verify/lib/load.js evaluates — so what is proven here is what ships.
  const reassembled = A.assembleAtlas(frozen, prose);
  const want = {
    CRISES: atlas.CRISES, MATRIX: atlas.MATRIX, MX_CRISES: atlas.MX_CRISES,
    CLASSIFICATION: atlas.CLASSIFICATION, CAT: atlas.CAT, CLS: atlas.CLS,
  };
  if (canonical(reassembled) !== canonical(want)) {
    for (const k of Object.keys(want)) {
      if (canonical(reassembled[k]) !== canonical(want[k])) console.error("  round-trip mismatch in: " + k);
    }
    fail("round trip is NOT lossless — nothing written");
  }

  const frozenBytes = serialize(frozen);
  fs.writeFileSync(FROZEN, frozenBytes);
  fs.writeFileSync(PROSE, serialize(prose));
  const nSlugs = Object.keys(prose).length;
  console.log("split OK (round trip proven lossless):");
  console.log("  src/data/atlas-frozen.json  " + Buffer.byteLength(frozenBytes, "utf8") + " bytes, sha256 " + sha256(frozenBytes));
  console.log("  src/data/atlas-prose.json   " + nSlugs + " atlas.* slugs");
  console.log("next: node scripts/split-atlas.js --write-golden && git rm src/data/atlas.json && node build.js");
}

main();
