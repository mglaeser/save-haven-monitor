"use strict";
// Implementation-agnostic DATA + COMPUTED goldens. The adapter (acceptance/adapter.js) extracts
// from whatever implementation is present; its answers are pinned here at full precision. This is
// the "no silent number change" and "deterministic analysis is content" contract, independent of
// the browser (so it runs even where headless Chromium can't).
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { extract } = require("../adapter.js");
const assert = (c, m) => { if (!c) throw new Error(m); };
const G = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", f), "utf8"));

module.exports = async function register(t /*, h */) {
  const e = extract();

  t("canonical dataset hash matches the frozen golden (no silent number change)", () => {
    const actual = crypto.createHash("sha256").update(e.canonical).digest("hex");
    const expected = fs.readFileSync(path.join(__dirname, "..", "golden", "atlas-data.sha256"), "utf8").trim();
    assert(actual === expected, `dataset sha256 ${actual} != frozen ${expected}`);
  });

  t("fan charts reproduce the frozen rows exactly (seeds 7/11/13, sims 1500)", () => {
    const g = G("computed-fans.json");
    for (const k of ["market", "gold", "bonds"]) {
      assert(JSON.stringify(e.fans[k]) === JSON.stringify(g[k]), `fan '${k}' drifted from golden`);
    }
  });

  t("aggregate reproduces all 121 frozen rows exactly", () => {
    const g = G("computed-aggregate.json").rows;
    assert(e.aggregate.length === g.length, `aggregate len ${e.aggregate.length} != ${g.length}`);
    assert(JSON.stringify(e.aggregate) === JSON.stringify(g), "aggregate rows drifted from golden");
  });

  t("crisis-clock cross-correlation maxima match the frozen golden", () => {
    const g = G("computed-xcorr.json");
    assert(JSON.stringify(e.xcorr) === JSON.stringify(g.rows), "xcorr rows drifted from golden");
    // the three headline maxima the Analytics tab describes in prose
    const max = (k) => e.xcorr.reduce((b, r) => (r[k] != null && r[k] > b.r ? { p: r.p, r: r[k] } : b), { p: null, r: -2 });
    assert(max("dotcom").p === 0 && Math.abs(max("dotcom").r - 0.788) < 1e-9, "dot-com max at p=0 r=0.788");
    assert(max("y1929").p === -21 && Math.abs(max("y1929").r - 0.759) < 1e-9, "1929 max at p=-21 r=0.759");
    assert(max("japan").p === -12 && Math.abs(max("japan").r - 0.777) < 1e-9, "Japan max at p=-12 r=0.777");
  });
};
