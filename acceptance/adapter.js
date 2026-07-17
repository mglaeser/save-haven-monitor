"use strict";
// THE ONE MUTABLE FILE of the acceptance suite (see SPEC.md rule 2). It extracts the frozen
// dataset and the deterministic computed values from the CURRENT implementation. During the
// rewrite this file is re-pointed at the new implementation (e.g. src/data/*.json + src/lib/*);
// its OUTPUT is pinned by the frozen goldens at full precision — the adapter may change, the
// answers may not.
const path = require("path");
process.env.BG_REPO = process.env.BG_REPO || path.resolve(__dirname, "..");
const { loadDashboard } = require(path.resolve(__dirname, "..", "verify", "lib", "load.js"));

function canon(x) {
  if (Array.isArray(x)) return "[" + x.map(canon).join(",") + "]";
  if (x && typeof x === "object") return "{" + Object.keys(x).sort().map((k) => JSON.stringify(k) + ":" + canon(x[k])).join(",") + "}";
  if (typeof x === "number" && !isFinite(x)) return JSON.stringify(String(x));
  return JSON.stringify(x);
}

function extract() {
  const d = loadDashboard();
  const dataset = { CRISES: d.CRISES, MATRIX: d.MATRIX, MX_CRISES: d.MX_CRISES, CLASSIFICATION: d.CLASSIFICATION, CAT: d.CAT, CLS: d.CLS };
  const fans = {
    market: d.runFan([["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]], 7, 1500),
    gold: d.runFan([["stagflation", "au"], ["gfc", "au"], ["euro", "au"]], 11, 1500),
    bonds: d.runFan([["dotcom", "ust"], ["depression", "gb"], ["japan", "jgb"]], 13, 1500),
  };
  const aggregate = d.buildAggregate();
  // the Analytics crisis-clock cross-correlation, exactly as the tab computes it (static anchors)
  const cur = d.logPath(d.rebase(d.interp(d.ser("ai2026", "mkt")), 0));
  const H2 = {
    dotcom: d.logPath(d.rebase(d.interp(d.ser("dotcom", "mkt")), 0)),
    y1929: d.logPath(d.rebase(d.interp(d.ser("depression", "mkt")), 0)),
    japan: d.logPath(d.rebase(d.interp(d.ser("japan", "mkt")), 0)),
  };
  const byP = {};
  Object.entries(H2).forEach(([name, hl]) => {
    d.xcorrRow(cur, hl, 24).forEach(({ p, r }) => { (byP[p] = byP[p] || { p })[name] = r; });
  });
  const xcorr = Object.values(byP).sort((a, b) => a.p - b.p);
  return { dataset, canonical: canon(dataset), fans, aggregate, xcorr };
}

module.exports = { extract, canon };
