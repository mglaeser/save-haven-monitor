"use strict";
// Golden characterization test (mandate S3 + S11 ratchet). A single hash over all frozen
// crisis research data. If any number/string/structure in CRISES/MATRIX/CLASSIFICATION
// changes, this goes RED — forcing an intentional baseline update via a decision record,
// exactly the "don't silently change the numbers" guarantee CLAUDE.md asks for but could
// not previously enforce. Baseline lives in verify/golden/data-hash.json.
const fs = require("fs");
const path = require("path");
const { loadDashboard } = require("../lib/load.js");
const { sha256, eq, ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const d = loadDashboard();
  const goldenPath = path.resolve(__dirname, "..", "golden", "data-hash.json");

  t("frozen crisis data matches the recorded golden hash", () => {
    const payload = { CRISES: d.CRISES, MATRIX: d.MATRIX, MX_CRISES: d.MX_CRISES,
                      CLASSIFICATION: d.CLASSIFICATION, CAT: d.CAT, CLS: d.CLS };
    const hash = sha256(payload);
    ok(fs.existsSync(goldenPath), "golden baseline exists (verify/golden/data-hash.json)");
    const golden = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
    eq(hash, golden.data_hash,
      "crisis data hash changed. If intentional: update verify/golden/data-hash.json AND file a decision record (audit/decisions/). If not: a number was silently altered — revert.");
  });
};
