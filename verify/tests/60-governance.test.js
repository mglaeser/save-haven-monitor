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
};
