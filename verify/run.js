"use strict";
// Deterministic test runner (mandate: the suite is the backstop, so it runs the same way
// for every agent and in CI — never at an agent's discretion). No framework. Discovers
// tests/*.test.js, runs each registered case, aggregates, writes verify/.artifacts/results.json,
// and exits non-zero on any failure. "offline" failures (egress-blocked SRI recompute) are
// reported distinctly so the gate can apply Rule-3 banding rather than a false green.
const fs = require("fs");
const path = require("path");

const TESTS_DIR = path.join(__dirname, "tests");
const ART = path.join(__dirname, ".artifacts");

async function main() {
  const files = fs.readdirSync(TESTS_DIR).filter((f) => f.endsWith(".test.js")).sort();
  const results = [];
  let pass = 0, fail = 0, offline = 0;

  for (const f of files) {
    const register = require(path.join(TESTS_DIR, f));
    const cases = [];
    register((name, fn) => cases.push({ name, fn }));
    for (const c of cases) {
      const rec = { file: f, name: c.name };
      try {
        await c.fn();
        rec.status = "PASS"; pass++;
      } catch (e) {
        if (e && e.offline) { rec.status = "OFFLINE"; rec.error = e.message; offline++; }
        else { rec.status = "FAIL"; rec.error = e && e.message || String(e); fail++; }
      }
      results.push(rec);
      const mark = rec.status === "PASS" ? "ok  " : rec.status === "OFFLINE" ? "off " : "FAIL";
      console.log(`${mark} ${f} :: ${c.name}${rec.error ? "\n       " + rec.error.split("\n")[0] : ""}`);
    }
  }

  fs.mkdirSync(ART, { recursive: true });
  const summary = { generated: new Date().toISOString().slice(0, 10), total: results.length, pass, fail, offline, results };
  fs.writeFileSync(path.join(ART, "results.json"), JSON.stringify(summary, null, 1));
  console.log(`\n${pass} pass · ${fail} fail · ${offline} offline / ${results.length} total`);
  if (fail > 0) process.exit(1);
  // offline SRI does not fail the local run, but the gate records it as NO-EVIDENCE for that check.
  process.exit(0);
}

main().catch((e) => { console.error("RUNNER CRASH:", e); process.exit(2); });
