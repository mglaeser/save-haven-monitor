"use strict";
// Frozen acceptance-suite runner. No test framework — same house style as verify/run.js.
// Each tests/*.js exports async (t, h) => {}; t(name, fn) registers an assertion case,
// h is the shared harness session. Cases run sequentially (they share pages deliberately —
// tab navigation without reloads is part of what is under test).
const fs = require("fs");
const path = require("path");
const { launch } = require("./lib/harness.js");

async function main() {
  const dir = path.join(__dirname, "tests");
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".js")).sort();
  const h = await launch();
  const results = [];
  let pass = 0, fail = 0;
  for (const f of files) {
    const register = require(path.join(dir, f));
    const cases = [];
    const t = (name, fn) => cases.push({ name, fn });
    try { await register(t, h); } catch (e) {
      results.push({ file: f, name: "(register)", status: "FAIL", error: String(e && e.message || e) }); fail++;
      console.log(`FAIL ${f} :: (register) — ${e.message}`); continue;
    }
    for (const c of cases) {
      const rec = { file: f, name: c.name };
      try { await c.fn(); rec.status = "PASS"; pass++; }
      catch (e) { rec.status = "FAIL"; rec.error = String(e && e.message || e).slice(0, 500); fail++; }
      results.push(rec);
      console.log(`${rec.status === "PASS" ? "ok  " : "FAIL"} ${f} :: ${c.name}${rec.error ? "\n       " + rec.error.split("\n")[0] : ""}`);
    }
  }
  // the egress/pageerror ledger is itself an assertion surface
  if (h.violations.length) {
    fail++; results.push({ file: "(harness)", name: "no egress violations / page errors", status: "FAIL", error: h.violations.join(" | ").slice(0, 800) });
    console.log("FAIL (harness) :: violations:\n  " + h.violations.join("\n  "));
  } else {
    pass++; results.push({ file: "(harness)", name: "no egress violations / page errors", status: "PASS" });
    console.log("ok   (harness) :: no egress violations / page errors");
  }
  await h.close();
  fs.mkdirSync(path.join(__dirname, ".artifacts"), { recursive: true });
  fs.writeFileSync(path.join(__dirname, ".artifacts", "results.json"),
    JSON.stringify({ generated: new Date().toISOString().slice(0, 10), pass, fail, results }, null, 1));
  console.log(`\nACCEPTANCE: ${pass} pass · ${fail} fail`);
  process.exit(fail > 0 ? 1 : 0);
}
main().catch((e) => { console.error("RUNNER CRASH:", e); process.exit(2); });
