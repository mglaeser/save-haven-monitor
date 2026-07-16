"use strict";
// Mutation testing (mandate A-02 / S4): the suite is the only backstop, so the suite must
// be proven able to fail. We inject faults into dashboard.jsx's PURE functions (the imperative
// shell / components are exercised by the Playwright runtime tests, not here) and confirm the
// data-invariant assertions KILL each mutant. Mutation score = killed / total. A surviving
// mutant is a hole in the net and is printed. This runs in CI (verify/) and is exempt from the
// served-site zero-build rule (DR-001). It does not modify the repo — it mutates in-memory source.
const { dashboardSource, loadDashboardFromSource } = require("./lib/load.js");

// Assertions re-used as the "kill" oracle: a mutant is killed if ANY throws.
function oracle(d) {
  const A = require("./lib/assert.js");
  // 1. interp length + rebase pinning + an interior interpolated golden value
  for (const c of d.CRISES) for (const s of c.series) {
    const vals = d.interp(s.a);
    A.eq(vals.length, 121, "interp len");
    A.near(d.rebase(vals, 0)[60], 100, 1e-9, "rebase peak");
  }
  const gfcMkt = d.interp(d.CRISES.find((c) => c.id === "gfc").series.find((s) => s.key === "mkt").a);
  A.near(gfcMkt[13], 124.9167, 1e-3, "interp interior golden (kills interpolation-formula mutants)");
  // 2. runFan golden characterization
  const market = d.runFan([["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]], 7, 1500);
  A.eq(Math.round(market.stats.med36), 62, "market med36");
  A.eq(Math.round(d.runFan([["stagflation", "au"], ["gfc", "au"], ["euro", "au"]], 11, 1500).stats.med36), 132, "gold med36");
  A.near(market.stats.mdd, -0.6307, 0.02, "market median max-decline (kills mdd-sign / path mutants)");
  A.eq(Math.round(market.rows[0].med), 100, "fan t0 median = entry 100");
  A.eq(market.rows.length, 61, "fan spans H+1 rows");
  A.ok(Number.isFinite(market.rows[60].med) && market.rows[60].med > 0, "fan last row populated (kills path-column off-by-one)");
  // 3. aggregate spans, is populated, and matches golden composite cells
  const rows = d.buildAggregate();
  A.eq(rows.length, 121, "agg rows"); A.eq(rows[0].m, -60, "agg m0");
  A.ok(rows.some((r) => r.market != null), "agg market populated");
  A.near(rows[0].market, 62.2, 0.1, "agg market m=-60 golden (kills weight / potential-filter mutants)");
  A.near(rows[108].market, 62.4, 0.1, "agg market m=48 golden");
  // 4. corr self-correlation == 1, and finite on a constant array (kills zArr sd-fallback mutant)
  A.near(d.corrArr([1, 2, 3, 4, 5], [1, 2, 3, 4, 5]), 1, 1e-9, "corr self");
  A.ok(Number.isFinite(d.corrArr([5, 5, 5], [1, 2, 3])), "corr finite on constant array");
}

// Mutation operators applied to the PURE-function region only (between the interp() def and the
// end of buildAggregate()). Each entry: a literal substring in the source and its mutant form.
// Chosen to be surgical (unique in the pure region) and semantically meaningful.
const MUTATIONS = [
  // interp
  { find: "out.push(v0 + ((v1 - v0) * (m - m0)) / (m1 - m0));", to: "out.push(v0 - ((v1 - v0) * (m - m0)) / (m1 - m0));", label: "interp interpolation sign flip" },
  { find: "((v1 - v0) * (m - m0)) / (m1 - m0)", to: "((v1 - v0) * (m + m0)) / (m1 - m0)", label: "interp numerator (m-m0) -> (m+m0)" },
  { find: "((v1 - v0) * (m - m0)) / (m1 - m0)", to: "((v1 - v0) * (m - m0)) / (m1 + m0)", label: "interp denom - -> +" },
  // rebase
  { find: "const f = 100 / vals[baseMonth + 60];", to: "const f = 100 / vals[baseMonth + 61];", label: "rebase off-by-one +60 -> +61" },
  { find: "return vals.map((v) => v * f);", to: "return vals.map((v) => v + f);", label: "rebase * -> +" },
  // runFan / mulberry32 / stats
  { find: "a = (a + 0x6D2B79F5) | 0;", to: "a = (a + 0x6D2B79F4) | 0;", label: "mulberry32 constant tweak" },
  { find: "cols[i + 1].push(ev);", to: "cols[i].push(ev);", label: "runFan path column off-by-one" },
  { find: "mdds.push(mn / 100 - 1);", to: "mdds.push(mn / 100 + 1);", label: "runFan mdd sign" },
  { find: "for (let k = 0; k < block; k++) seq.push(r[st + k]);", to: "for (let k = 0; k < block; k++) seq.push(r[st]);", label: "runFan block flatten" },
  // corr / z
  { find: "return s / a.length;", to: "return s * a.length;", label: "corr normalize / -> *" },
  { find: "const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 1;", to: "const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 0;", label: "zArr sd fallback 1 -> 0" },
  // buildAggregate
  { find: "if (cr.potential) return;", to: "if (!cr.potential) return;", label: "buildAggregate potential filter inverted" },
  { find: "acc[c].num[i] += x * cr.weight", to: "acc[c].num[i] += x / cr.weight", label: "buildAggregate weight * -> /" },
];

function run() {
  const src = dashboardSource();
  // sanity: baseline must pass the oracle
  try { oracle(loadDashboardFromSource(src)); } catch (e) { console.error("BASELINE ORACLE FAILED (not a mutation):", e.message); process.exit(2); }

  let killed = 0; const survivors = []; const notApplied = [];
  for (const m of MUTATIONS) {
    const idx = src.indexOf(m.find);
    if (idx === -1 || src.indexOf(m.find, idx + 1) !== -1) { notApplied.push(m.label + (idx === -1 ? " (not found)" : " (not unique)")); continue; }
    const mutant = src.slice(0, idx) + m.to + src.slice(idx + m.find.length);
    let survived = false;
    try { const d = loadDashboardFromSource(mutant); oracle(d); survived = true; }
    catch (e) { /* killed */ }
    if (survived) survivors.push(m.label); else killed++;
    console.log(`${survived ? "SURVIVED" : "killed  "}  ${m.label}`);
  }
  const applied = MUTATIONS.length - notApplied.length;
  const score = applied ? killed / applied : 0;
  if (notApplied.length) console.log("\nnot applied (source drift — update mutation.js):\n  " + notApplied.join("\n  "));
  console.log(`\nMUTATION SCORE: ${killed}/${applied} = ${(score * 100).toFixed(1)}%  (survivors: ${survivors.length})`);
  if (survivors.length) console.log("SURVIVORS (test-suite holes):\n  " + survivors.join("\n  "));
  const FLOOR = 0.75;
  if (score < FLOOR) { console.error(`\nBELOW FLOOR ${FLOOR}: the suite has holes — add assertions until survivors are killed.`); process.exit(1); }
  if (notApplied.length) { console.error("\nMutations failed to apply (source moved) — a mutation gate that cannot inject is a dead gate."); process.exit(1); }
  process.exit(0);
}
run();
