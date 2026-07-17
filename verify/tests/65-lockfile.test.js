"use strict";
// Supply-chain control for the CI-only harness deps (closes C-03). The harness now pins its deps
// exactly, with a committed lockfile installed via `npm ci --ignore-scripts`. This test is the
// standing guard: it fails the build if the lockfile goes missing, a dependency resolves from
// anywhere other than the public npm registry (a swapped registry / poisoned mirror), a top-level
// devDependency is range-pinned (^ or ~) instead of exact, or package.json and the lockfile drift.
const fs = require("fs");
const path = require("path");
const { REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const pkg = JSON.parse(fs.readFileSync(path.join(REPO, "verify", "package.json"), "utf8"));
  const lockPath = path.join(REPO, "verify", "package-lock.json");

  t("C-03: committed lockfile exists and every devDependency is exact-pinned", () => {
    ok(fs.existsSync(lockPath), "verify/package-lock.json must be committed");
    for (const [name, range] of Object.entries(pkg.devDependencies || {}))
      ok(/^\d+\.\d+\.\d+$/.test(range), `devDependency ${name} must be exact-pinned, got "${range}" (no ^ or ~)`);
  });

  t("C-03: every resolved dependency comes from the public npm registry (no swapped registry)", () => {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const pkgs = lock.packages || {};
    let checked = 0;
    for (const [key, meta] of Object.entries(pkgs)) {
      if (!meta || !meta.resolved) continue;
      checked++;
      ok(meta.resolved.startsWith("https://registry.npmjs.org/"),
        `dependency ${key} resolves from a non-registry URL: ${meta.resolved}`);
      ok(typeof meta.integrity === "string" && meta.integrity.length > 0,
        `dependency ${key} has no integrity hash in the lockfile`);
    }
    ok(checked > 0, "lockfile lists resolved dependencies");
  });

  t("C-03: package.json devDependencies match the lockfile root", () => {
    const lock = JSON.parse(fs.readFileSync(lockPath, "utf8"));
    const rootDev = (lock.packages && lock.packages[""] && lock.packages[""].devDependencies) || {};
    ok(JSON.stringify(rootDev) === JSON.stringify(pkg.devDependencies),
      "package.json devDependencies drifted from the lockfile — run `npm install` and commit the lockfile");
  });
};
