"use strict";
// Compiled-ahead freshness (DR-006). The served ./dashboard.js and ./bubblegauge.js are the CI
// transpile of dashboard.jsx / bubblegauge.jsx via build.js (pinned esbuild 0.19.12). This control
// re-runs the build into a throwaway dir and asserts the committed output is byte-identical — so the
// compiled artifact can never silently drift from its source (someone editing a .jsx without
// rebuilding, hand-editing a .js, or an esbuild version change all fail the build here). It is the
// bridge that lets every OTHER control keep reasoning about the .jsx source while the browser runs
// the .js: source and served are provably the same program.
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  t("committed dashboard.js / bubblegauge.js are a fresh, deterministic build of the .jsx sources", () => {
    const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "compiled-fresh-"));
    // build.js writes next to itself; point it at a temp OUT via --dist into an isolated tree.
    const stage = path.join(tmp, "repo");
    fs.mkdirSync(path.join(stage, "verify"), { recursive: true });
    for (const f of ["dashboard.jsx", "bubblegauge.jsx", "build.js"]) fs.copyFileSync(path.join(REPO, f), path.join(stage, f));
    // symlink the real esbuild so the isolated build uses the pinned binary
    fs.symlinkSync(path.join(REPO, "verify", "node_modules"), path.join(stage, "verify", "node_modules"));
    execFileSync("node", ["build.js"], { cwd: stage, stdio: "pipe" });
    for (const out of ["dashboard.js", "bubblegauge.js"]) {
      const fresh = fs.readFileSync(path.join(stage, out));
      const committed = fs.readFileSync(path.join(REPO, out));
      ok(Buffer.compare(fresh, committed) === 0,
        `${out} is stale/drifted from its source — run \`node build.js\` and commit the result (compiled-ahead, DR-006)`);
    }
    fs.rmSync(tmp, { recursive: true, force: true });
  });
};
