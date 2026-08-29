"use strict";
// Re-freeze R2 (DR-014 items 1+7): the content-plane TARGET contract, fixture-driven. The
// harness pins /content/fallback.json to the frozen fixture (stand-in for the deploy-generated
// dist/content/fallback.json); tests override it per page (poison / outage). Every assertion
// holds against the CURRENT (deep) site — where the page makes no content fetch, the conditional
// assertions are implications with a false antecedent — and becomes load-bearing the moment the
// shallow content path lands. The four bubblegauge PR-0 hardening contracts asserted here:
// disclaimer gate w/ DOM purge, last-known-good (rejection/outage never blanks the page),
// bounded loading (no uncaught errors — global harness page-error ledger), response-shape
// validation (a content payload without a disclaimer never commits).
const fs = require("fs");
const path = require("path");
const { REPO } = require("../lib/harness.js");
const assert = (c, m) => { if (!c) throw new Error(m); };

const G = (f) => path.join(__dirname, "..", "golden", f);
const TABS = ["Crisis Explorer", "Similarity Matrix", "Aggregate", "Analytics", "Playbook"];
const DISCLAIMER = "not tick data, and not investment advice"; // the hard-baked page disclaimer (red line 5)
const DISCLAIMER_SLUG = "site.disclaimer"; // the block a payload MUST carry to commit (Q50)
const SENTINEL = "POISON-NO-DISCLAIMER-7f3a";

// The fallback-artifact shape contract (A2 §1 P3; DR-014 item 6): every served fallback artifact
// — fixture or deploy-generated — must satisfy this. A payload failing it must never commit.
function checkShape(o, name) {
  assert(o && typeof o === "object", name + ": must be a JSON object");
  assert(/^\d{4}-\d{2}-\d{2}$/.test(o.as_of || ""), name + ": mandatory as_of stamp (YYYY-MM-DD, Q15/DR-014 item 6)");
  assert(Number.isInteger(o.content_version) && o.content_version >= 1, name + ": integer content_version >= 1");
  assert(o.blocks && typeof o.blocks === "object", name + ": blocks map (content/dashboard export)");
  const d = o.blocks[DISCLAIMER_SLUG];
  assert(d && typeof d.text === "string" && /not investment advice/.test(d.text),
    name + ": the '" + DISCLAIMER_SLUG + "' block is mandatory in every fallback artifact (red line 5 / Q7 / Q50)");
  if (o.disclaimer !== undefined)
    assert(/not investment advice/.test(String(o.disclaimer)), name + ": top-level disclaimer, when present, must be the real disclaimer");
  if (o.slots !== undefined) assert(o.slots && typeof o.slots === "object", name + ": slots, when present, must be a map");
}

module.exports = async function register(t, h) {
  t("every served fallback artifact carries the disclaimer + provenance stamps [red line 5, Q50/Q15]", () => {
    const fixture = JSON.parse(fs.readFileSync(G("content-fallback.fixture.json"), "utf8"));
    checkShape(fixture, "frozen fixture");
    // a locally built artifact, when present, must satisfy the SAME contract the fixture does
    const dist = path.join(REPO, "dist", "content", "fallback.json");
    if (fs.existsSync(dist)) checkShape(JSON.parse(fs.readFileSync(dist, "utf8")), "dist/content/fallback.json");
    // the poison fixture must differ ONLY by the missing disclaimer — so the gate case below
    // proves the DISCLAIMER check specifically, not some other shape rejection
    const poison = JSON.parse(fs.readFileSync(G("content-fallback.poison.fixture.json"), "utf8"));
    assert(poison.disclaimer === undefined, "poison fixture must have NO top-level disclaimer");
    assert(poison.blocks && !poison.blocks[DISCLAIMER_SLUG], "poison fixture must have NO '" + DISCLAIMER_SLUG + "' block");
    assert(/^\d{4}-\d{2}-\d{2}$/.test(poison.as_of || "") && Number.isInteger(poison.content_version)
      && poison.blocks && poison.slots, "poison fixture must be shape-valid apart from the disclaimer");
    assert(JSON.stringify(poison).includes(SENTINEL), "poison fixture carries the render sentinel");
  });

  t("content plane present: 5 tabs + baked disclaimer render; a consumed payload shows the labeled fallback state [Q3/Q12/Q49]", async () => {
    const pg = await h.page("/"); // default route serves the good frozen fixture
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    for (const l of TABS) assert(await pg.$(`button:has-text("${l}")`), "tab present: " + l);
    assert(b.includes(DISCLAIMER), "hard-baked disclaimer on screen (red line 5)");
    const consumed = pg.requestsMade().some((u) => u.split("?")[0].endsWith("/content/fallback.json"));
    if (consumed) { // false on the deep site (vacuous); load-bearing once the shallow path lands
      assert(/offline content/i.test(b), "fallback-sourced content must carry the labeled offline-content state (Q12; generated slot text itself stays unlabeled, Q49)");
      assert(b.includes(DISCLAIMER), "disclaimer gate: grounded content renders only with the disclaimer on screen");
    }
    await pg.close();
  });

  t("a content payload WITHOUT a disclaimer never commits (response-shape validation) [PR-0 c4 / Q14]", async () => {
    const pg = await h.page("/", { content: "content-fallback.poison.fixture.json" });
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    assert(!b.includes(SENTINEL), "disclaimer-less payload text reached the DOM — the shape validator must refuse to commit it");
    for (const l of TABS) assert(await pg.$(`button:has-text("${l}")`), "page survives the rejection (last-known-good, never blank): " + l);
    assert(b.includes(DISCLAIMER), "baked disclaimer still on screen after rejection");
    await pg.close();
  });

  t("content outage (404): page renders 5 tabs with the baked disclaimer; nothing grounded shows un-disclaimed [red line 5; bounded loading]", async () => {
    const pg = await h.page("/", { content: null });
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    for (const l of TABS) assert(await pg.$(`button:has-text("${l}")`), "tab survives content outage: " + l);
    assert(b.includes(DISCLAIMER), "hard-baked disclaimer independent of any content fetch");
    assert(!b.includes("AI Regime"), "outage never fabricates gated state");
    assert(!b.includes(SENTINEL), "no stale poison bleed-through");
    await pg.close();
  });
};
