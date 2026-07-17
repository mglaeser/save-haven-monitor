"use strict";
// Freeze tripwire for the acceptance suite (the rewrite's parity contract). The suite in
// acceptance/ was written against the CURRENT site, verified 35/0 green, and hash-frozen in
// verify/golden/acceptance-freeze.json. This test fails the build if ANY frozen file changes —
// so the rewrite cannot quietly weaken the tests it must pass. Re-freezing is a deliberate,
// decision-recorded act (bump the manifest hashes) done BEFORE a rewrite phase, never to green a
// failing rewrite. acceptance/adapter.js is intentionally NOT frozen (it is re-pointed at the new
// implementation; its OUTPUT is pinned by the frozen golden files instead).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  t("acceptance suite files match their frozen hashes (no silent weakening)", () => {
    const man = JSON.parse(fs.readFileSync(path.join(REPO, "verify", "golden", "acceptance-freeze.json"), "utf8"));
    for (const [rel, expected] of Object.entries(man.files)) {
      const p = path.join(REPO, rel);
      ok(fs.existsSync(p), `frozen acceptance file missing: ${rel}`);
      const actual = crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex");
      ok(actual === expected, `acceptance freeze drift: ${rel} is ${actual}, frozen ${expected}. Re-freeze only by decision record, before a rewrite phase — never to pass a failing rewrite.`);
    }
  });

  t("the adapter (the one mutable file) is present but NOT frozen", () => {
    const man = JSON.parse(fs.readFileSync(path.join(REPO, "verify", "golden", "acceptance-freeze.json"), "utf8"));
    ok(fs.existsSync(path.join(REPO, "acceptance", "adapter.js")), "acceptance/adapter.js present");
    ok(!("acceptance/adapter.js" in man.files), "adapter.js must NOT be in the freeze manifest (it is re-pointed at the rewrite)");
  });
};
