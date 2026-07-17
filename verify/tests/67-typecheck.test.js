"use strict";
// TypeScript strict type-check gate for the typed core (src/lib/math.ts + src/data.ts). Runs
// `tsc -p tsconfig.strict.json --noEmit` and fails the build on any type error — a real static
// check that no reviewer performs. Scope is intentionally the typed modules only; the verbatim view
// modules (src/dashboard.tsx, src/bubblegauge.tsx) are excluded until their own typing pass. This is
// the standing control behind the "typed, agent-maintainable" property (seed D14).
const fs = require("fs");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  t("typed core (src/lib + src/data) passes tsc --strict-core with no errors", () => {
    const tsc = path.join(REPO, "verify", "node_modules", "typescript", "bin", "tsc");
    ok(fs.existsSync(tsc), "typescript is installed (verify devDependency)");
    ok(fs.existsSync(path.join(REPO, "tsconfig.strict.json")), "tsconfig.strict.json present");
    try {
      execFileSync("node", [tsc, "-p", "tsconfig.strict.json"], { cwd: REPO, stdio: "pipe" });
    } catch (e) {
      const out = (e.stdout ? e.stdout.toString() : "") + (e.stderr ? e.stderr.toString() : "");
      throw new Error("tsc reported type errors in the typed core:\n" + out.slice(0, 800));
    }
  });
};
