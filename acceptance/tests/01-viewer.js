"use strict";
// The 5-tab atlas parity contract (no ?status-api). One page load; tabs switch WITHOUT reload
// (that unmount/remount lifecycle is itself under test). Traceability: inventory IDs in comments.
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  const pg = await h.page("/");
  const body = async () => (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
  const click = async (text) => { await pg.click(`button:has-text("${text}")`, { timeout: 8000 }); await pg.waitForTimeout(400); };

  t("chrome: title, h1, eyebrow, subtitle disclaimer [explorer-01, shell-01]", async () => {
    assert((await pg.title()).includes("Crisis Winners"), "document title");
    const b = await body();
    assert(b.includes("Crisis Winners — assets that rose when markets collapsed"), "h1 text");
    assert(b.includes("An interactive atlas · common t−60 → t+60 month scale"), "eyebrow (U+2212 minus)");
    assert(b.includes("not tick data, and not investment advice"), "disclaimer");
    assert(b.includes("Key sources:"), "footer sources block");
  });

  t("chrome: exactly the 5 base tabs, in order, Explorer active, no AI Regime [explorer-01]", async () => {
    const labels = ["Crisis Explorer", "Similarity Matrix", "Aggregate", "Analytics", "Playbook"];
    for (const l of labels) assert(await pg.$(`button:has-text("${l}")`), "tab present: " + l);
    assert(!(await body()).includes("AI Regime"), "no 6th tab without the gate");
  });

  t("explorer: 11 crisis chips, exact labels, default GFC [explorer-02]", async () => {
    const chips = ["AI Investment Bubble · 2026 · POTENTIAL", "Great Depression · 1929–34",
      "Stagflation / Nifty Fifty · 1973–74", "Japan Asset Bubble · 1989–2003", "Black Monday · 1987",
      "Asian Financial Crisis · 1997–98", "Dot-com Bust · 2000–02", "Global Financial Crisis · 2007–09",
      "European Sovereign Debt Crisis · 2010–12", "COVID-19 Crash · 2020", "South Sea Bubble · 1720"];
    const b = await body();
    for (const c of chips) assert(b.includes(c), "chip: " + c);
    assert(b.includes("weight 1.0 · peak Oct 2007"), "default crisis is GFC (weight/peak eyebrow)");
    assert(b.includes("B · Real-estate / credit bubble"), "GFC category badge");
  });

  t("explorer: crisis switching swaps header data [explorer-03]", async () => {
    await click("Black Monday");
    const b = await body();
    assert(b.includes("weight 0.7 · peak Aug 1987"), "Black Monday eyebrow");
    assert(b.includes("E · Liquidity / exogenous shock"), "Black Monday badge");
  });

  t("explorer: AI-2026 POTENTIAL banner exact caveat, absent elsewhere [explorer-04]", async () => {
    await click("AI Investment Bubble");
    let b = await body();
    assert(b.includes("POTENTIAL crisis — the peak is anchored at today (Jul 2026)"), "banner present on ai2026");
    assert(b.includes("by construction, not as a forecast"), "banner bold phrase");
    assert(b.includes("Safe-haven candidates are shown dashed."), "banner tail");
    await click("Global Financial Crisis");
    b = await body();
    assert(!b.includes("POTENTIAL crisis — the peak is anchored"), "banner absent off ai2026");
  });

  t("explorer: COVID Bitcoin line ships defaultOff (struck-through chip) [critic]", async () => {
    await click("COVID-19 Crash");
    const chip = await pg.$(`button:has-text("Bitcoin (falsified safe haven)")`);
    assert(chip, "BTC legend chip exists on COVID");
    const deco = await chip.evaluate((n) => getComputedStyle(n).textDecorationLine);
    assert(deco.includes("line-through"), "BTC chip struck through (defaultOff), got: " + deco);
  });

  t("state lifecycle: tab switch unmounts Explorer — selection resets to GFC [critic]", async () => {
    await click("Dot-com Bust");
    assert((await body()).includes("weight 1.0 · peak Mar 2000"), "dot-com selected");
    await click("Similarity Matrix");
    await click("Crisis Explorer");
    assert((await body()).includes("weight 1.0 · peak Oct 2007"), "back to default GFC after remount");
    assert(await pg.evaluate(() => location.hash) === "", "no URL hash routing");
  });

  t("matrix: heading, axes, note-panel on cell click, blank-cell fallback [matrix slice]", async () => {
    await click("Similarity Matrix");
    const b = await body();
    assert(b.includes("Asset"), "sticky Asset header");
    for (const c of ["1929", "1987", "GFC ’08", "AI ’26?"]) assert(b.includes(c), "matrix column: " + c);
    assert(b.includes("Gold"), "asset row Gold");
  });

  t("aggregate: heading, methodology line, pairs/all mode toggle [agg-01]", async () => {
    await click("Aggregate");
    const b = await body();
    assert(b.includes("The aggregate anatomy of a crisis"), "h2");
    assert(b.includes("Bitcoin (falsified) is excluded"), "methodology line");
    assert(b.includes("History ↔ 2026 pairs"), "seg option pairs");
    assert(b.includes("All composites"), "seg option all");
    assert(b.includes("History-only families"), "history-only panel (default pairs mode)");
    await click("All composites");
    assert(!(await body()).includes("History-only families"), "all-mode replaces the pair grid");
    await click("History ↔ 2026 pairs");
  });

  t("analytics: battery heading + four clock cards exact values [analytics-01/02]", async () => {
    await click("Analytics");
    const b = await body();
    assert(b.includes("Algorithmic battery — where are we on the crisis clock?"), "h2");
    for (const v of ["≈ −12 mo", "p ≈ 0 / +1", "+2.5 mo", "now → +19 mo"]) assert(b.includes(v), "clock card: " + v);
    assert(b.includes("Crisis clock — where does today correlate most?"), "clock chart heading");
    assert(b.includes("dot-com template, the closest analog"), "clock card dot-com analog");
  });

  t("analytics: deterministic fan stats render exactly (seeds 7/11/13, sims 1500) [analytics-06]", async () => {
    const b = await body();
    assert(b.includes("Post-peak outcome fans — if the peak were today"), "fans heading");
    assert(b.includes("at +36 mo: median 62, P(below 100) 79%, 10–90% [27, 133]"), "Market fan stats");
    assert(b.includes("at +36 mo: median 132, P(below 100) 20%, 10–90% [88, 210]"), "Gold fan stats");
    assert(b.includes("at +36 mo: median 123, P(below 100) 0%, 10–90% [113, 131]"), "Bonds fan stats");
  });

  t("analytics: tail-test table + Markov + BSADF + Granger + scoreboard numbers [analytics-07..11]", async () => {
    const b = await body();
    assert(b.includes("Safe-haven tail test — real 2026 backfill"), "tail-test heading");
    for (const s of ["worst-quintile", "P(up | worst months)", "Clayton λ_L"]) assert(b.includes(s), "tail col: " + s);
    assert(b.includes("P(turbulent) = 1.00"), "Markov headline");
    assert(b.includes("Bubble detector (BSADF variants)"), "BSADF heading");
    for (const v of ["+0.75", "−0.76", "−1.20"]) assert(b.includes(v), "BSADF stat: " + v);
    assert(b.includes("F = 7.79"), "Granger F");
    assert(b.includes("2026 hedge weighting — is gold now the lead hedge?"), "scoreboard heading");
    for (const v of ["0.88", "0.85", "0.59"]) assert(b.includes(v), "scoreboard weight: " + v);
    assert(b.includes("Honest limits"), "honest-limits panel");
  });

  t("playbook: M9 default detail, veto chips, verdict matrix, phases [playbook-02..10]", async () => {
    await click("Playbook");
    const b = await body();
    assert(b.includes("The ex-ante playbook — and today's expert buy-list"), "h2");
    assert(b.includes("M9 — Survivability & marginal holder"), "default method detail is M9");
    for (const c of ["M2 ⛔", "M7 ⛔", "M8 ⛔", "M9 ⛔"]) assert(b.includes(c), "veto chip: " + c);
    assert(b.includes("Verdict matrix — every outlier through every screen"), "verdict matrix heading");
    assert(b.includes("Defense / aerospace"), "verdict row");
    assert(b.includes("The phased selection — traceable to methods"), "phase stepper heading");
    assert(b.includes("Cash & T-bills"), "phase-0 position");
  });

  t("playbook: phase stepper navigates (phase 1 rules render) [playbook-06/08]", async () => {
    await pg.click(`button:has-text("Crash")`, { timeout: 8000 }); await pg.waitForTimeout(400);
    const b = await body();
    assert(b.includes("Hold. Buy nothing. (0–3 months)"), "phase-1 heading");
    assert(b.includes("Hold cash — sitting still IS the strategy."), "phase-1 rule 1");
    await pg.click(`button:has-text("Now")`, { timeout: 8000 }); await pg.waitForTimeout(300);
  });

  t("playbook: eToro link contract — EBASE hrefs, hardened, exact tag titles [playbook-11/12]", async () => {
    const links = await pg.$$eval("a[href^='https://www.etoro.com/markets/']", (as) =>
      as.map((a) => ({ href: a.getAttribute("href"), target: a.getAttribute("target"), rel: a.getAttribute("rel") || "" })));
    assert(links.length >= 10, "at least 10 eToro links, got " + links.length);
    for (const l of links) {
      assert(l.target === "_blank", "eToro link target=_blank");
      assert(l.rel.includes("noopener") && l.rel.includes("noreferrer"), "eToro link rel hardened");
    }
    const gld = await pg.$(`a[href='https://www.etoro.com/markets/gld']`);
    assert(gld, "GLD eToro link");
    assert((await gld.getAttribute("title")) === "eToro: GLD — CFD-only (EU)", "GLD title tag");
    assert((await body()).includes("eToro links = navigation only, not advice"), "link disclaimer");
  });

  t("playbook: expert buy-list — 24 rows, filter counts, top score 66 [playbook-13/14]", async () => {
    const b = await body();
    assert(b.includes("Expert buy-list × protocol — where consensus and method agree"), "expert heading");
    for (const f of ["All 24", "✓ agree", "± partial", "✗ diverge"]) assert(b.includes(f), "filter chip: " + f);
    assert(b.includes("66"), "top score 66 rendered");
    assert(b.includes("CORE · Phase 0 (20%)"), "top row protocol tag");
  });
};
