"use strict";
// The deterministic policy gate (mandate S1 / Article I). Fail-closed. Makes the merge/
// deploy decision by CODE, not by any model's opinion. It:
//   1. runs the test suite (via run.js exit code — invoked separately in CI) — here it
//      reads the produced results.json;
//   2. enforces findings-file integrity: exactly the active check IDs, no PASS with a null
//      standing_control, no unregistered records;
//   3. recomputes engagement-status.json's computed fields and refuses if production_eligible
//      is asserted true while any STOP-SHIP/BLOCKER-1/BLOCKER-2 is open or Part 2 is not COMPLETE;
//   4. fails the build if the golden data hash test or any invariant failed.
// This file is itself gated by tests (see tests/50-gate-selftest.test.js): it must BLOCK
// what it claims to block. An agent cannot merge by editing its own gate because the gate
// runs from main in CI and B-35 write-separation is a standing control (residual-risk R-B35).
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..");
const AUDIT = path.join(REPO, "audit");
const fail = (msg) => { console.error("GATE BLOCK: " + msg); process.exitCode = 1; blocked.push(msg); };
const blocked = [];

function readJson(p) { return JSON.parse(fs.readFileSync(p, "utf8")); }

// --- 1. test results ---
const resultsPath = path.join(__dirname, ".artifacts", "results.json");
if (!fs.existsSync(resultsPath)) fail("no test results.json — run `node run.js` first");
else {
  const r = readJson(resultsPath);
  if (r.fail > 0) fail(`${r.fail} test(s) failed`);
  // golden hash + core invariants + the deterministic security controls must be PASS (not merely
  // non-fail). These are never "offline", so requiring PASS here is strict but always satisfiable.
  // (In the gate self-test's minimal results.json these files are simply absent → not checked.)
  const mustPass = r.results.filter((x) => /golden|data-invariants|static-security|provenance|security-surface/.test(x.file));
  for (const x of mustPass) if (x.status !== "PASS") fail(`required check not PASS: ${x.file} :: ${x.name} (${x.status})`);
}

// --- 2. findings-file integrity ---
const cat = readJson(path.join(AUDIT, "00-check-catalogue.json"));
const activeIds = new Set(cat.checks.filter((c) => c.status === "active").map((c) => c.id));
const findings = readJson(path.join(AUDIT, "03-findings.json"));
const recIds = new Set(findings.records.map((f) => f.check_id));
if (findings.records.length !== activeIds.size) fail(`findings count ${findings.records.length} != active checks ${activeIds.size}`);
for (const f of findings.records) {
  if (!activeIds.has(f.check_id)) fail(`unregistered finding record: ${f.check_id}`);
  if (f.verdict === "PASS" && !f.standing_control) fail(`PASS with null standing_control: ${f.check_id}`);
  if (f.verdict === "NOT-APPLICABLE" && !f.na_justification) fail(`NOT-APPLICABLE without justification: ${f.check_id}`);
}
for (const id of activeIds) if (!recIds.has(id)) fail(`active check missing a finding record: ${id}`);

// --- 3. engagement-status computed correctness + fail-closed on production ---
const status = readJson(path.join(AUDIT, "engagement-status.json"));
const openBand = (band) => findings.records.filter((f) => f.founding_band === band && ["NO-EVIDENCE", "FAIL", "PARTIAL"].includes(f.verdict)).length;
const ss = openBand("STOP-SHIP"), b1 = openBand("BLOCKER-1"), b2 = openBand("BLOCKER-2");
if (status.open_stop_ship_count !== ss) fail(`status open_stop_ship_count ${status.open_stop_ship_count} != computed ${ss}`);
if (status.open_blocker_1_count !== b1) fail(`status open_blocker_1_count ${status.open_blocker_1_count} != computed ${b1}`);
if (status.open_blocker_2_count !== b2) fail(`status open_blocker_2_count ${status.open_blocker_2_count} != computed ${b2}`);
const eligibleAllowed = status.part1_status === "COMPLETE" && status.part2_status === "COMPLETE" &&
  ss === 0 && b1 === 0 && b2 === 0 && status.constitution_state === "RATIFIED" && status.security_scope_audited === true;
if (status.production_eligible === true && !eligibleAllowed)
  fail("production_eligible=true is not supported by the computed state (Track C unaudited and/or open blockers) — fail closed");
if (status.part1_status === "COMPLETE" && (ss > 0 || b1 > 0 || b2 > 0))
  fail(`part1_status=COMPLETE is false while blockers are open (SS ${ss}, B1 ${b1}, B2 ${b2}) — mandate DoD #3`);
if (status.part2_status === "COMPLETE" && (ss > 0 || b1 > 0 || b2 > 0))
  fail(`part2_status=COMPLETE is false while blockers are open (SS ${ss}, B1 ${b1}, B2 ${b2}) — mandate DoD #3`);
// security_scope_audited asserts Track C carries no NO-EVIDENCE record (the audit actually ran).
{
  const cOpen = findings.records.filter((f) => f.track === "C" && f.verdict === "NO-EVIDENCE").length;
  if (status.security_scope_audited === true && cOpen > 0)
    fail(`security_scope_audited=true but ${cOpen} Track C check(s) are still NO-EVIDENCE`);
}

if (blocked.length === 0) console.log("GATE PASS: findings integrity + status computation + required tests all hold.");
else console.error(`\nGATE BLOCKED on ${blocked.length} condition(s).`);
