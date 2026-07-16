"use strict";
// Data-invariant characterization tests (mandate S3). These freeze the crisis-atlas
// research content and its math so a future agent cannot silently corrupt a number,
// break the t-60..t+60 model, or change the aggregation. Standing control for the
// "do not touch the numbers/calculations" rule in CLAUDE.md.
const { loadDashboard } = require("../lib/load.js");
const { eq, ok, near } = require("../lib/assert.js");

module.exports = function register(t) {
  const d = loadDashboard();

  t("CRISES: 11 crises, ai2026 first and flagged potential", () => {
    eq(d.CRISES.length, 11, "crisis count");
    eq(d.CRISES[0].id, "ai2026", "first crisis");
    ok(d.CRISES[0].potential === true, "ai2026 potential flag");
  });

  t("every crisis has valid weight, category, and >=1 series", () => {
    for (const c of d.CRISES) {
      ok(c.weight > 0 && c.weight <= 1, `weight in (0,1]: ${c.id}`);
      ok(d.CAT[c.cat], `known category: ${c.id}`);
      ok(Array.isArray(c.series) && c.series.length >= 1, `has series: ${c.id}`);
    }
  });

  t("every series anchor array is monotonic non-decreasing in month, months in [-60,60], values finite>0", () => {
    for (const c of d.CRISES) for (const s of c.series) {
      const a = s.a;
      ok(Array.isArray(a) && a.length >= 2, `anchors present: ${c.id}/${s.key}`);
      ok(a[0][0] >= -60 && a[a.length - 1][0] <= 60, `months bounded: ${c.id}/${s.key}`);
      ok(d.CLS[s.cls], `known class: ${c.id}/${s.key}`);
      for (let i = 0; i < a.length; i++) {
        ok(a[i].length === 2 && isFinite(a[i][0]) && isFinite(a[i][1]) && a[i][1] > 0, `finite>0: ${c.id}/${s.key}[${i}]`);
        if (i) ok(a[i][0] > a[i - 1][0], `strictly increasing months: ${c.id}/${s.key}[${i}]`);
      }
    }
  });

  t("interp yields 121 points; rebase pins the base month to exactly 100", () => {
    for (const c of d.CRISES) for (const s of c.series) {
      const vals = d.interp(s.a);
      eq(vals.length, 121, `121 interp points: ${c.id}/${s.key}`);
      near(d.rebase(vals, 0)[60], 100, 1e-9, `rebase peak=100: ${c.id}/${s.key}`);
      near(d.rebase(vals, -60)[0], 100, 1e-9, `rebase t-60=100: ${c.id}/${s.key}`);
    }
  });

  t("MATRIX is 13 rows x 11 cols; value domain {-1,0,1,2,3}; AI'26 column (idx 10) is all 3", () => {
    eq(d.MATRIX.length, 13, "matrix rows");
    eq(d.MX_CRISES.length, 11, "matrix cols");
    const allowed = new Set([-1, 0, 1, 2, 3]);
    for (const row of d.MATRIX) {
      eq(row.vals.length, 11, `row width: ${row.name}`);
      for (const v of row.vals) ok(allowed.has(v), `value in domain: ${row.name}=${v}`);
      eq(row.vals[10], 3, `AI'26 col is potential(3): ${row.name}`);
    }
  });

  t("runFan is deterministic: same seed+sims reproduces the same median", () => {
    const spec = [["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]];
    const a = d.runFan(spec, 7, 1500).stats.med36;
    const b = d.runFan(spec, 7, 1500).stats.med36;
    eq(a, b, "runFan determinism");
  });

  t("runFan golden outputs match (characterization — kills RNG/bootstrap mutations)", () => {
    const market = d.runFan([["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]], 7, 1500);
    const gold = d.runFan([["stagflation", "au"], ["gfc", "au"], ["euro", "au"]], 11, 1500);
    const bonds = d.runFan([["dotcom", "ust"], ["depression", "gb"], ["japan", "jgb"]], 13, 1500);
    eq(Math.round(market.stats.med36), 62, "market med36");
    eq(Math.round(gold.stats.med36), 132, "gold med36");
    eq(Math.round(bonds.stats.med36), 123, "bonds med36");
    near(market.stats.mdd, -0.6307, 0.02, "market median max-decline-below-entry");
  });

  t("buildAggregate returns 121 rows spanning m=-60..60 and excludes the potential crisis from history", () => {
    const rows = d.buildAggregate();
    eq(rows.length, 121, "aggregate rows");
    eq(rows[0].m, -60, "first month");
    eq(rows[120].m, 60, "last month");
    // market composite must be populated (>=1 historical crisis has a market line)
    ok(rows.some((r) => r.market != null), "market composite populated");
  });

  t("TABS are exactly the 5 built-in atlas tabs (bubblegauge tab is added dynamically, not baked in)", () => {
    eq(d.TABS.map((x) => x.id).join(","), "explorer,matrix,aggregate,analytics,playbook", "tab ids");
  });
};
