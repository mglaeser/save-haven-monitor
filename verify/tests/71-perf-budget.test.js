"use strict";
// Performance guardrail (owner-requested) — runs on EVERY deploy via the gate (`node run.js` exits
// non-zero on any failure, and deploy.yml chains run.js && mutation.js && gate.js, so a breach here
// blocks the Pages publish). It defends what the repo actually controls about page-load:
//
//   1. the CI-compiled bundles stay MINIFIED (build.js keeps minify:true) — an un-minified build
//      inflates payload + parse time (the Lighthouse "compress JavaScript" finding),
//   2. each compiled bundle stays within a BYTE BUDGET, and the TOTAL served-JS the browser fetches
//      (compiled + self-hosted vendors) stays within a page-weight budget — so a future change that
//      bloats a bundle or slips in a new large served asset FAILS instead of silently regressing,
//   3. index.html loads the PRODUCTION (minified) React builds, never a dev build.
//
// Budgets are deliberate ceilings with headroom over today's sizes; raising one is a conscious edit
// (friction), mirroring the golden-hash discipline. Vendor BYTES are pinned elsewhere (35-supply-chain
// pins the versions, 40-sri the hashes) — here we only cap their contribution to total page weight.
const fs = require("fs");
const path = require("path");
const { REPO, raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

// per-file byte ceilings for the CI-compiled bundles (raw, uncompressed) — headroom over current sizes
const JS_BUDGET = { "dashboard.js": 155000, "bubblegauge.js": 95000 };
// self-hosted vendor JS the browser fetches (bytes pinned by 35/40; counted toward total page weight)
const VENDOR_JS = [
  "vendor/react.production.min.js",
  "vendor/react-dom.production.min.js",
  "vendor/prop-types.min.js",
  "vendor/Recharts.js",
];
// total served-JS page-weight ceiling (compiled + vendors), with headroom over the per-file maxima
const TOTAL_JS_BUDGET = 950000;

const sizeOf = (f) => fs.statSync(path.join(REPO, f)).size;

module.exports = function register(t) {
  t("perf: the CI-compiled bundles are minified (build.js minify:true)", () => {
    for (const f of Object.keys(JS_BUDGET)) {
      const src = fs.readFileSync(path.join(REPO, f), "utf8");
      const avgLine = src.length / (src.split("\n").length);
      ok(avgLine > 1000, `${f} looks un-minified (avg line length ${Math.round(avgLine)} < 1000) — build.js must keep minify:true, else payload + parse time regress`);
    }
  });

  t("perf: each compiled bundle is within its byte budget", () => {
    for (const [f, budget] of Object.entries(JS_BUDGET)) {
      const n = sizeOf(f);
      ok(n <= budget, `${f} is ${n} bytes, over the ${budget}-byte budget — trim it or raise the budget deliberately (perf guardrail; deploys stay fast by design)`);
    }
  });

  t("perf: total served-JS page weight is within budget", () => {
    const files = [...Object.keys(JS_BUDGET), ...VENDOR_JS];
    const total = files.reduce((sum, f) => sum + sizeOf(f), 0);
    ok(total <= TOTAL_JS_BUDGET, `total served JS is ${total} bytes, over the ${TOTAL_JS_BUDGET}-byte page-weight budget — a new or larger served asset slipped in unbudgeted (perf guardrail)`);
  });

  t("perf: index.html loads the PRODUCTION React builds, not dev builds", () => {
    const html = raw("index.html");
    for (const v of ["vendor/react.production.min.js", "vendor/react-dom.production.min.js"]) {
      ok(html.includes(v), `index.html must load the production build ${v} (a dev build ships warnings and is far larger)`);
    }
    ok(!/react(-dom)?\.development/.test(html), "index.html must not load a React development build (ships dev warnings, larger payload)");
  });
};
