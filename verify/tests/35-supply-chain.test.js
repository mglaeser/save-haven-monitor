"use strict";
// Supply-chain pin integrity (offline-deterministic) + no stray/vacuous test suites.
// - Pinned CDN URLs must match the recorded manifest exactly: catches a silent version bump
//   (e.g. react@18.3.2) even when egress is blocked and the online SRI recompute is offline.
// - No *.test.js outside verify/tests/: a planted parallel test suite (a classic vacuous-test
//   green-light vector) is detected rather than trusted.
const fs = require("fs");
const path = require("path");
const { raw, REPO } = require("../lib/load.js");
const { ok, eq } = require("../lib/assert.js");

module.exports = function register(t) {
  const html = raw("index.html");
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", "pinned-deps.json"), "utf8"));

  t("index.html CDN script URLs match the recorded pin manifest exactly", () => {
    const urls = (html.match(/<script\s+src="(https:\/\/unpkg\.com\/[^"]+)"/g) || [])
      .map((s) => s.match(/src="([^"]+)"/)[1]).sort();
    const expected = manifest.urls.slice().sort();
    eq(urls.length, expected.length, "pinned dep count");
    for (let i = 0; i < expected.length; i++)
      eq(urls[i], expected[i], `pin match (a silent version bump is a supply-chain finding)`);
  });

  t("no test files exist outside the canonical verify/tests/ suite", () => {
    const stray = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".git") continue;
        const full = path.join(dir, e.name);
        if (full.includes(path.join("verify", "tests"))) continue;
        if (e.isDirectory()) walk(full);
        else if (/\.test\.js$/.test(e.name)) stray.push(path.relative(REPO, full));
      }
    })(REPO);
    ok(stray.length === 0, `stray test file(s) outside verify/tests (possible vacuous-suite vector): ${stray.join(", ")}`);
  });
};
