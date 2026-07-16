"use strict";
// Governance tripwire (mandate §9.10 self-application). Asserts the audit apparatus and the
// CI gate remain wired: the workflow exists and invokes both run.js and gate.js; the audit
// artifacts and decision records are present. If an agent quietly removes the gate or an audit
// file, this goes red in CI (which still runs on the branch).
const fs = require("fs");
const path = require("path");
const { REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const read = (rel) => fs.readFileSync(path.join(REPO, rel), "utf8");
  const exists = (rel) => fs.existsSync(path.join(REPO, rel));

  t("CI verify workflow exists and wires run.js + gate.js", () => {
    ok(exists(".github/workflows/verify.yml"), "workflow present");
    const wf = read(".github/workflows/verify.yml");
    ok(/node run\.js/.test(wf), "workflow runs the suite");
    ok(/node gate\.js/.test(wf), "workflow runs the policy gate");
  });

  t("core audit artifacts and decision records are present", () => {
    for (const f of ["audit/00-check-catalogue.json", "audit/03-findings.json",
      "audit/engagement-status.json", "audit/decisions/DR-001-verification-tooling.md",
      "audit/decisions/DR-002-ci-gate.md", "verify/calibration/corpus.json"])
      ok(exists(f), `present: ${f}`);
  });

  t("engagement-status never asserts production_eligible while Track C is unaudited", () => {
    const s = JSON.parse(read("audit/engagement-status.json"));
    if (s.production_eligible === true) ok(s.security_scope_audited === true, "production_eligible requires security scope audited");
  });

  t("constitution + hash-bound digest are present and the digest binding matches the constitution", () => {
    const crypto = require("crypto");
    ok(exists("governance/constitution.md"), "constitution present");
    ok(exists("governance/constitution-digest.md"), "one-page digest present");
    const actual = crypto.createHash("sha256").update(read("governance/constitution.md")).digest("hex");
    const digest = read("governance/constitution-digest.md");
    const m = digest.match(/sha256 `([0-9a-f]{64})`/);
    ok(m, "digest declares a bound sha256");
    ok(m[1] === actual, `digest binding drifted from the constitution: digest says ${m && m[1]}, constitution is ${actual}. Re-generate the digest.`);
    // engagement-status must carry the same attested hash
    const s = JSON.parse(read("audit/engagement-status.json"));
    ok(s.constitution_hash === actual, `engagement-status.constitution_hash (${s.constitution_hash}) != constitution sha256 (${actual})`);
  });
};
