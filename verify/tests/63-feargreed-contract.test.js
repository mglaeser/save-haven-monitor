"use strict";
// Fear & Greed consumption contract — derived from the feed delta v1.1 (service v3.7.0),
// NOT from the implementation. The feed gains metrics.fear_greed + series.fear_greed;
// the dashboard renders a 0-100 gauge (zone bands 25/45/55/75) labeled with detail.rating,
// a previous_* delta row, and the 61-month history on its OWN 0-100 axis. Hard rules from
// the delta: null ≠ zero (never interpolated, never rendered as 0); the series is NEVER
// rebased with the price/TR series; the browser NEVER calls CNN (server-side snapshot only;
// unofficial endpoint - non-scoring context).
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const ENUM = ["extreme fear", "fear", "neutral", "greed", "extreme greed"];

module.exports = function register(t) {
  t("v1.1: rating whitelist, 0..100 guard, and zone bands 25/45/55/75 exist", () => {
    const src = raw("src/bubblegauge.tsx");
    ok(/FG_RATINGS\s*=/.test(src), "FG_RATINGS whitelist missing");
    for (const r of ENUM) ok(src.includes('"' + r + '"'), `rating enum value missing: "${r}"`);
    ok(/function\s+validFearGreed\s*\(/.test(src), "validFearGreed boundary validator missing");
    const fn = src.slice(src.indexOf("function validFearGreed"), src.indexOf("function validFearGreed") + 500);
    ok(/>=\s*0/.test(fn) && /<=\s*100/.test(fn), "validFearGreed must range-check the 0..100 score");
    ok(/FG_RATINGS/.test(fn), "validFearGreed must check detail.rating against FG_RATINGS");
    ok(/FG_ZONES\s*=\s*\[\s*25\s*,\s*45\s*,\s*55\s*,\s*75\s*\]/.test(src), "zone bands 25/45/55/75 missing (FG_ZONES)");
  });

  t("v1.1: series is null-safe (null ≠ zero, no interpolation) and never rebased", () => {
    const src = raw("src/bubblegauge.tsx");
    // the gauge/series block must exist and split its polyline on nulls rather than bridging them
    const i = src.indexOf("function FearGreedBlock");
    ok(i > -1, "FearGreedBlock renderer missing");
    const blk = src.slice(i, i + 3000);
    ok(/==\s*null|!=\s*null|isNum\(/.test(blk), "series rendering must explicitly guard null points");
    // fear_greed must NOT be wired into the rebasing map (AI_MAP) — own axis, never rebased
    const aiMap = src.slice(src.indexOf("const AI_MAP"), src.indexOf("function buildAiLive"));
    ok(!/fear_greed/.test(aiMap), "fear_greed must never enter AI_MAP (it is not rebased with price/TR series)");
  });

  t("v1.1: demo fixture ships metrics.fear_greed (detail.rating enum, value 0..100) + a 61-point series with leading nulls", () => {
    const src = raw("src/bubblegauge.tsx");
    const m = src.match(/fear_greed:\s*\{[\s\S]{0,900}?detail:\s*\{([^}]+)\}/);
    ok(m, "FEED_FIXTURE.metrics.fear_greed with detail{} missing");
    const r = m[1].match(/rating:\s*"([^"]+)"/);
    ok(r && ENUM.includes(r[1]), `fixture detail.rating must be a CNN enum value (got ${r && r[1]})`);
    const v = src.match(/fear_greed:\s*\{[^}]*?value:\s*([\d.]+)/);
    ok(v && Number(v[1]) >= 0 && Number(v[1]) <= 100, "fixture fear_greed value must be within 0..100");
    ok(/FG_FIX_SERIES/.test(src), "fixture fear_greed series (FG_FIX_SERIES) missing");
    const s = src.match(/FG_FIX_SERIES\s*=\s*\[([^\]]+)\]/);
    ok(s, "FG_FIX_SERIES literal missing");
    const vals = s[1].split(",").map((x) => x.trim());
    ok(vals.length === 61, `fixture series must have 61 monthly points (got ${vals.length})`);
    ok(vals[0] === "null" && vals.filter((x) => x === "null").length >= 40, "fixture series must carry the delta's ~48 leading nulls, explicit and uninterpolated");
    for (const x of vals) if (x !== "null") ok(Number(x) >= 0 && Number(x) <= 100, `series value out of 0..100: ${x}`);
  });

  t("no served file calls CNN directly — server-side snapshot only (feed consumption)", () => {
    for (const f of ["index.html", "src/dashboard.tsx", "src/bubblegauge.tsx"])
      ok(!/dataviz\.cnn\.io|cnn\.com/.test(raw(f)),
        `CNN host referenced in ${f} — the browser must never call CNN (UA-gated, no CORS, undeclared egress)`);
  });
};
