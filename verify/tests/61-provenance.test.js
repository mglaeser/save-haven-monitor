"use strict";
// Track C standing control — C-37 (accountability without a signature) + C-26 (SBOM/AI-BOM).
// Every SHIPPED production component carries an attested provenance chain in
// governance/provenance-manifest.json: a content hash + the frozen spec it derives from, the
// policy bundle that gated it, its test evidence, its adversarial-verification result, and a
// NAMED OWNING ROLE. This test reconstructs the chain on every build: a shipped file that is
// unlisted, or whose bytes drifted from the attested hash, fails the build (an unattested change
// to production = C-37 breach). The SBOM (governance/sbom.json) is asserted to match the pinned
// CDN set and the SRI hashes in index.html, and to ship zero AI components (AI-BOM). This is the
// buildable substitute for a signed per-line provenance ledger (residual R-LEDGER): git history +
// this manifest are the append-only chain, reconstructible by machine on demand.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { REPO, raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const SHIPPED = ["index.html", "dashboard.jsx", "bubblegauge.jsx", ".nojekyll"];
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");

module.exports = function register(t) {
  t("C-37: every shipped component has an attested provenance chain with a matching hash", () => {
    const man = JSON.parse(raw("governance/provenance-manifest.json"));
    const byFile = new Map(man.components.map((c) => [c.file, c]));
    for (const f of SHIPPED) {
      ok(byFile.has(f), `shipped component missing from provenance manifest: ${f} (an unattested production component is a C-37 breach)`);
      const entry = byFile.get(f);
      const actual = sha256(fs.readFileSync(path.join(REPO, f)));
      ok(entry.sha256 === actual, `provenance hash drift for ${f}: manifest ${entry.sha256} != actual ${actual}. A shipped component changed without re-attesting its chain — regenerate the manifest (intentional friction, C-37).`);
      for (const field of ["derives_from_spec", "test_evidence", "adversarial_verification", "owning_role"]) {
        ok(entry[field] && String(entry[field]).trim().length > 0, `provenance chain field '${field}' empty for ${f} — the chain must be reconstructible and owned`);
      }
    }
    // No manifest entry may name a file that is not actually shipped (a phantom attestation).
    for (const c of man.components) ok(SHIPPED.includes(c.file), `provenance manifest names a non-shipped file: ${c.file}`);
  });

  t("C-26: the SBOM matches the pinned CDN set and the SRI hashes in index.html; AI-BOM is empty", () => {
    const sbom = JSON.parse(raw("governance/sbom.json"));
    const pinned = JSON.parse(raw("verify/golden/pinned-deps.json"));
    const sbomUrls = sbom.components.map((c) => c.url).sort();
    const pinnedUrls = pinned.urls.slice().sort();
    ok(JSON.stringify(sbomUrls) === JSON.stringify(pinnedUrls), `SBOM component URLs != pinned-deps.json URLs (SBOM must track the real dependency set)`);
    const html = raw("index.html");
    for (const c of sbom.components) {
      ok(html.includes(c.url), `SBOM lists ${c.url} but index.html does not load it`);
      ok(html.includes(c.integrity), `SBOM integrity for ${c.name} (${c.integrity}) not found in index.html — SBOM drifted from the served SRI`);
    }
    ok(Array.isArray(sbom.runtime_ai_components) && sbom.runtime_ai_components.length === 0,
      "AI-BOM must be empty: the served product ships no model/dataset/adapter/vector-store (guarded by 62-security-surface)");
  });
};
