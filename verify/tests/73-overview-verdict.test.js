"use strict";
// Desktop-overview verdict contract — derived from DR-010 §Decision (the sentence table and the
// distance rule), NOT from the implementation. The hero's whole reason to exist is that it states a
// CONCLUSION in words; a wrong sentence is worse than no hero, and it is the one defect class no
// layout or hash check can see. So this executes the real shipped verdictOf/distanceOf rather than
// grepping for them: the pure functions are lifted out of the source and run against a table.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

// Lift `function NAME(...) {...}` out of the source by brace matching (no braces occur inside the
// string literals of these three functions, which is what makes this safe).
function fnSrc(src, name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) return null;
  let depth = 0;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  return null;
}

const SUPPRESSED = "suppressed (block degraded)";
const COPY = { bandOneLiner: { [SUPPRESSED]: "SUPPRESSED-ONE-LINER" } };
const isNum = (x) => typeof x === "number" && isFinite(x);
const pair = (x) => Array.isArray(x) && x.length === 2 && isNum(x[0]) && isNum(x[1]);

function load(name) {
  const src = raw("src/bubblegauge.tsx");
  const body = fnSrc(src, name);
  ok(body, `${name}() missing from src/bubblegauge.tsx — the desktop hero's verdict logic`);
  return new Function("COPY", "isNum", "pair", body + "\nreturn " + name + ";")(COPY, isNum, pair);
}

const faber = (spy, qqq) => ({ SPY: { faber_10mo: spy }, QQQ: { faber_10mo: qqq } });

module.exports = function register(t) {
  t("DR-010: the verdict sentence matches the band x trigger table on all 8 rows", () => {
    const verdictOf = load("verdictOf");
    const rows = [
      [{ action_band: "hold", trend_states: faber("IN", "IN") }, "No action indicated."],
      [{ action_band: "hold", trend_states: faber("OUT", "IN") }, "The score says hold — but the trend rule has broken."],
      [{ action_band: "trim", trend_states: faber("IN", "IN") }, "Trim is warranted — but nothing forces action today."],
      [{ action_band: "trim", trend_states: faber("IN", "OUT") }, "Trim now — the trigger has fired on QQQ."],
      [{ action_band: "de-risk", trend_states: faber("IN", "IN") }, "De-risk is warranted; the trigger has not fired."],
      [{ action_band: "de-risk", trend_states: faber("OUT", "OUT") }, "De-risk now — SPY and QQQ has broken trend."],
      [{ action_band: SUPPRESSED, trend_states: faber("IN", "IN") }, "Not scored today."],
      [{ action_band: "wat", trend_states: faber("IN", "IN") }, "No action indicated."], // unknown band falls back to hold, like bandOf()
    ];
    for (const [d, lead] of rows) {
      const got = verdictOf(d);
      ok(got && got.lead === lead, `band=${d.action_band} SPY=${d.trend_states.SPY.faber_10mo} QQQ=${d.trend_states.QQQ.faber_10mo}: expected lead ${JSON.stringify(lead)}, got ${JSON.stringify(got && got.lead)}`);
      ok(got.detail && got.detail.length > 0, `band=${d.action_band}: detail sentence must not be empty`);
    }
  });

  t("DR-010: a suppressed band is never given an action verb", () => {
    const verdictOf = load("verdictOf");
    const got = verdictOf({ action_band: SUPPRESSED, trend_states: faber("OUT", "OUT") });
    ok(!/\b(trim|de-risk|sell|hold)\b/i.test(got.lead), `a withheld band must not read as an instruction, got ${JSON.stringify(got.lead)}`);
    ok(got.detail === "SUPPRESSED-ONE-LINER", "suppressed detail must come from COPY.bandOneLiner, not be invented");
  });

  t("DR-010: a fired override is stated in the sentence, never silently dropped", () => {
    const verdictOf = load("verdictOf");
    const on = verdictOf({ action_band: "trim", override_fired: true, trend_states: faber("IN", "IN") });
    const off = verdictOf({ action_band: "trim", override_fired: false, trend_states: faber("IN", "IN") });
    ok(/hard override has fired/.test(on.detail), "override_fired must surface in the detail sentence");
    ok(!/override/.test(off.detail), "a clear override must not be mentioned");
  });

  t("DR-010: distance names the right line, pluralises, and stays silent when suppressed", () => {
    const distanceOf = load("distanceOf");
    const cases = [
      [{ action_band: "hold", headline_median: 40, iqr: [34, 47] }, "5 points below the trim line at 45. The top of the model's 25–75% range already reaches 47."],
      [{ action_band: "hold", headline_median: 44, iqr: [30, 40] }, "1 point below the trim line at 45."],
      [{ action_band: "hold", headline_median: 45, iqr: [40, 44] }, "It sits exactly on the trim line at 45."],
      [{ action_band: "trim", headline_median: 52, iqr: [48, 55] }, "8 points below the de-risk line at 60."],
      [{ action_band: "de-risk", headline_median: 68, iqr: [55, 75] }, "8 points above the de-risk line at 60. The bottom of that range is back at 55."],
      [{ action_band: SUPPRESSED, headline_median: 40, iqr: [34, 47] }, ""],
      [{ action_band: "hold", headline_median: null, iqr: [34, 47] }, ""],
    ];
    for (const [d, want] of cases) {
      const got = distanceOf(d);
      ok(got === want, `band=${d.action_band} median=${d.headline_median}: expected ${JSON.stringify(want)}, got ${JSON.stringify(got)}`);
    }
  });

  t("DR-010: the IQR clause fires only when the interval crosses a line the point estimate has not", () => {
    const distanceOf = load("distanceOf");
    // interval stops short of 45 -> no clause; interval reaches 45 -> clause. This is the whole point:
    // it speaks up exactly when a bare point estimate would be misleading, and stays quiet otherwise.
    ok(!/25–75/.test(distanceOf({ action_band: "hold", headline_median: 40, iqr: [34, 44] })), "clause must not fire when the IQR stays below the line");
    ok(/25–75/.test(distanceOf({ action_band: "hold", headline_median: 40, iqr: [34, 45] })), "clause must fire when the IQR reaches the line");
    ok(!/25–75|back at/.test(distanceOf({ action_band: "hold", headline_median: 40, iqr: null })), "a missing IQR must add no clause");
  });

  t("DR-010: band persistence counts only the unbroken tail of the history", () => {
    const runOf = load("runOf");
    const h = (bands) => ({ json: { data: bands.map((b) => ({ action_band: b })) } });
    ok(runOf(h(["hold", "hold", "hold", "hold"]), "hold") === 4, "an unbroken tail counts every row");
    ok(runOf(h(["trim", "trim", "hold", "hold"]), "hold") === 2, "the count must stop at the band change, not scan the whole array");
    ok(runOf(h(["hold", "hold", "trim"]), "hold") === 0, "a band that just changed counts zero, never the total");
    ok(runOf(h(["hold", "hold"]), "hold") === null, "fewer than 3 rows yields null, so the line is omitted rather than fabricated");
    ok(runOf(null, "hold") === null, "a missing history yields null");
  });
};
