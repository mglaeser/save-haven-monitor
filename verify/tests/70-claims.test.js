"use strict";
// Claims-integrity standing control (mandate Article X / Phase 1). Once a false claim is
// corrected it must not silently return. Each assertion here was RED at the frozen baseline
// (the false claim was present) and is GREEN after Wave R. A future agent that reintroduces
// the misdescription turns CI red.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const dash = raw("src/dashboard.tsx");
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

  t("the prose screen count matches the screens that actually ship (M0-M10 is ELEVEN)", () => {
    // Derived from the data, not restated, so the claim cannot drift again: the
    // copy said "ten-screen" and "Ten ordered screens (M0-M10)" while eleven
    // screens shipped — the parenthetical contradicted its own sentence.
    const ids = [...dash.matchAll(/\{\s*id:\s*"(M\d+)"/g)].map((m) => m[1]);
    ok(ids.length > 0, "no M-screen definitions found — this control is not reading the data");
    const words = { 9: "nine", 10: "ten", 11: "eleven", 12: "twelve" };
    const word = words[ids.length];
    ok(word !== undefined, `unexpected screen count ${ids.length}; extend the number-word map`);
    const re = new RegExp("\\b" + word + "[- ]screen", "i");
    ok(re.test(dash), `${ids.length} screens ship (${ids[0]}-${ids[ids.length - 1]}) but the prose does not say "${word}-screen"`);
    const ordered = new RegExp("\\b" + word + " ordered screens", "i");
    ok(ordered.test(dash), `the summary line must say "${word} ordered screens" to match the ${ids.length} that ship`);
    for (const wrong of Object.values(words).filter((w) => w !== word)) {
      ok(!new RegExp("\\b" + wrong + "[- ]screen", "i").test(dash),
        `prose still claims "${wrong}-screen" while ${ids.length} screens ship`);
    }
  });
};
