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

  t("v1.1: the acceptance feed fixture ships metrics.fear_greed (detail.rating enum, value 0..100) + a 61-point series with leading nulls", () => {
    // DR-015 moved the offline feed fixture out of the served bundle into the frozen acceptance
    // goldens (the harness serves it at the derived API base). The v1.1 contract on it is unchanged.
    const fx = JSON.parse(raw("acceptance/golden/api-feed.fixture.json"));
    const m = fx && fx.data && fx.data.metrics && fx.data.metrics.fear_greed;
    ok(m && m.detail, "api-feed.fixture.json metrics.fear_greed with detail{} missing");
    ok(ENUM.includes(m.detail.rating), `fixture detail.rating must be a CNN enum value (got ${m.detail.rating})`);
    ok(typeof m.value === "number" && m.value >= 0 && m.value <= 100, "fixture fear_greed value must be within 0..100");
    const s = fx.data.series && fx.data.series.fear_greed;
    ok(s && Array.isArray(s.points), "fixture fear_greed series missing");
    ok(s.kind === "sentiment_index", "fixture fear_greed series must be kind sentiment_index (own axis)");
    ok(s.points.length === 61, `fixture series must have 61 monthly points (got ${s.points.length})`);
    const nulls = s.points.filter((p) => p.value === null).length;
    ok(s.points[0].value === null && nulls >= 40, "fixture series must carry the delta's ~48 leading nulls, explicit and uninterpolated");
    for (const p of s.points) if (p.value !== null) ok(typeof p.value === "number" && p.value >= 0 && p.value <= 100, `series value out of 0..100: ${p.value}`);
  });

  t("no served file calls CNN directly — server-side snapshot only (feed consumption)", () => {
    for (const f of ["index.html", "src/dashboard.tsx", "src/bubblegauge.tsx"])
      ok(!/dataviz\.cnn\.io|cnn\.com/.test(raw(f)),
        `CNN host referenced in ${f} — the browser must never call CNN (UA-gated, no CORS, undeclared egress)`);
  });
};
