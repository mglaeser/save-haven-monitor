"use strict";
// Claims-integrity standing control (mandate Article X / Phase 1). Once a false claim is
// corrected it must not silently return. Each assertion here was RED at the frozen baseline
// (the false claim was present) and is GREEN after Wave R. A future agent that reintroduces
// the misdescription turns CI red.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const dash = raw("dashboard.jsx");
  const claude = raw("CLAUDE.md");
  const notes = raw("INTEGRATION_NOTES.md");

  t("fan stat is not mislabeled 'max drawdown' (it measures decline vs entry, not vs running peak)", () => {
    ok(!/Median max drawdown/.test(dash), "the corrected label 'max decline vs entry' must not regress to 'max drawdown'");
    ok(/Median max decline vs entry/.test(dash), "corrected label present");
  });

  t("CLAUDE.md does not claim a 'byte-for-byte' identical site (bubblegauge.jsx is still shipped)", () => {
    ok(!/byte-for-byte the original atlas/.test(claude), "overclaim removed");
  });

  t("INTEGRATION_NOTES CORS note is not stale (service now allows the origin)", () => {
    ok(!/CORS \(spec §8\) is required and NOT handled here/.test(notes), "stale 'NOT handled' CORS claim removed");
  });
};
