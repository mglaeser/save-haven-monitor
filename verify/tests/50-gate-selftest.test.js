"use strict";
// Gate self-test (mandate S12 / Article I "self-tested against synthetic violations").
// Proves the deterministic gate BLOCKS what it claims to block — a gate never seen to
// refuse anything is decorative. Runs gate.js against tampered copies of the audit files
// in a temp dir and asserts a non-zero exit each time.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { ok } = require("../lib/assert.js");

const REPO = path.resolve(__dirname, "..", "..");
const GATE = path.join(__dirname, "..", "gate.js");

function runGateWith(mutate) {
  // stage a throwaway repo tree with the real audit/ + verify artifacts, apply a mutation, run gate
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "gate-selftest-"));
  fs.cpSync(path.join(REPO, "audit"), path.join(tmp, "audit"), { recursive: true });
  fs.mkdirSync(path.join(tmp, "verify", ".artifacts"), { recursive: true });
  // clean passing results baseline
  fs.writeFileSync(path.join(tmp, "verify", ".artifacts", "results.json"),
    JSON.stringify({ total: 1, pass: 1, fail: 0, offline: 0,
      results: [{ file: "10-data-invariants.test.js", name: "x", status: "PASS" },
                { file: "20-golden-content.test.js", name: "x", status: "PASS" }] }));
  fs.copyFileSync(GATE, path.join(tmp, "verify", "gate.js"));
  fs.copyFileSync(path.join(REPO, "verify", "lib", "assert.js"), path.join(tmp, "verify", "lib_assert_placeholder.txt")); // not needed by gate but keep tree sane
  mutate(tmp);
  let code = 0;
  try { execFileSync("node", [path.join(tmp, "verify", "gate.js")], { cwd: tmp, stdio: "pipe" }); }
  catch (e) { code = e.status || 1; }
  fs.rmSync(tmp, { recursive: true, force: true });
  return code;
}

module.exports = function register(t) {
  t("gate PASSES on the clean, unmutated tree", () => {
    const code = runGateWith(() => {});
    ok(code === 0, `clean tree should pass, exit=${code}`);
  });

  t("gate BLOCKS a PASS verdict with null standing_control", () => {
    const code = runGateWith((tmp) => {
      const p = path.join(tmp, "audit", "03-findings.json");
      const f = JSON.parse(fs.readFileSync(p, "utf8"));
      f.records[0].verdict = "PASS"; f.records[0].standing_control = null;
      fs.writeFileSync(p, JSON.stringify(f));
    });
    ok(code !== 0, "gate must block PASS-without-standing-control");
  });

  t("gate BLOCKS production_eligible=true while blockers are open", () => {
    const code = runGateWith((tmp) => {
      const p = path.join(tmp, "audit", "engagement-status.json");
      const s = JSON.parse(fs.readFileSync(p, "utf8"));
      s.production_eligible = true; // lie
      fs.writeFileSync(p, JSON.stringify(s));
    });
    ok(code !== 0, "gate must fail closed on an asserted production clearance");
  });

  t("gate BLOCKS a findings count that drifts from the active catalogue", () => {
    const code = runGateWith((tmp) => {
      const p = path.join(tmp, "audit", "03-findings.json");
      const f = JSON.parse(fs.readFileSync(p, "utf8"));
      f.records.pop(); // drop one → count mismatch
      fs.writeFileSync(p, JSON.stringify(f));
    });
    ok(code !== 0, "gate must block a findings/catalogue count mismatch");
  });

  t("gate BLOCKS when a required test failed", () => {
    const code = runGateWith((tmp) => {
      const p = path.join(tmp, "verify", ".artifacts", "results.json");
      fs.writeFileSync(p, JSON.stringify({ total: 1, pass: 0, fail: 1, offline: 0,
        results: [{ file: "10-data-invariants.test.js", name: "x", status: "FAIL", error: "seeded" }] }));
    });
    ok(code !== 0, "gate must block on a failed required test");
  });
};
