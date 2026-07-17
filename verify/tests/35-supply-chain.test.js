"use strict";
// Supply-chain pin integrity (offline-deterministic) + no stray/vacuous test suites.
// Post compiled-ahead (DR-006): the runtime vendors are SELF-HOSTED under ./vendor/ (no unpkg at
// runtime, no in-browser Babel). This test asserts the served vendor set matches the recorded
// manifest exactly (a silent swap/version bump is a supply-chain finding), that index.html
// references each with its pinned SRI, and that no unpkg/Babel/text-babel tag has crept back.
const fs = require("fs");
const path = require("path");
const { raw, REPO } = require("../lib/load.js");
const { ok, eq } = require("../lib/assert.js");

module.exports = function register(t) {
  const html = raw("index.html");
  const vendorPins = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", "vendor-pins.json"), "utf8"));
  const pinned = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", "pinned-deps.json"), "utf8"));

  t("self-hosted vendor files exist and are referenced in index.html with their pinned SRI", () => {
    for (const c of vendorPins.components) {
      ok(fs.existsSync(path.join(REPO, c.file)), `vendor file missing: ${c.file}`);
      ok(html.includes('src="./' + c.file + '"'), `index.html does not load ./${c.file}`);
      ok(html.includes('integrity="' + c.integrity + '"'), `index.html missing pinned SRI for ${c.name}`);
    }
  });

  t("pinned-deps manifest matches the self-hosted vendor set exactly", () => {
    const urls = vendorPins.components.map((c) => "./" + c.file).sort();
    const expected = pinned.urls.slice().sort();
    eq(urls.length, expected.length, "pinned dep count");
    for (let i = 0; i < expected.length; i++) eq(urls[i], expected[i], "pin match");
  });

  t("no third-party runtime egress crept back into index.html (no unpkg / Babel / text-babel)", () => {
    ok(!/unpkg\.com/.test(html), "unpkg reference reintroduced into index.html");
    ok(!/@babel\/standalone|babel\.min\.js|type="text\/babel"/.test(html), "in-browser Babel reintroduced");
  });

  t("no test files exist outside the canonical verify/tests/ suite", () => {
    const stray = [];
    (function walk(dir) {
      for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
        if (e.name === "node_modules" || e.name === ".git" || e.name === "dist") continue;
        const full = path.join(dir, e.name);
        if (full.includes(path.join("verify", "tests"))) continue;
        if (e.isDirectory()) walk(full);
        else if (/\.test\.js$/.test(e.name)) stray.push(path.relative(REPO, full));
      }
    })(REPO);
    ok(stray.length === 0, `stray test file(s) outside verify/tests (possible vacuous-suite vector): ${stray.join(", ")}`);
  });
};
