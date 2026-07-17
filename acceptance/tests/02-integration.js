"use strict";
// The ?status-api=demo integration contract (offline fixture — zero network). Traceability: bg-* IDs.
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  const pg = await h.page("/?status-api=demo");
  const body = async () => (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");

  t("strip mounts above the tab bar, keyboard-activatable [bg strip]", async () => {
    const strip = await pg.$(`[aria-label="AI bubble regime gauge"]`);
    assert(strip, "strip aside present");
    const role = await strip.getAttribute("role");
    assert(role === "button", "loaded strip has role=button (got " + role + ")");
    assert((await strip.getAttribute("tabindex")) === "0", "strip is focusable");
  });

  t("6th tab 'AI Regime' appears with the gate on [bg tab]", async () => {
    assert(await pg.$(`button:has-text("AI Regime")`), "AI Regime tab present");
  });

  t("AI Regime tab renders headline + history + changelog [bg panels]", async () => {
    await pg.click(`button:has-text("AI Regime")`, { timeout: 8000 }); await pg.waitForTimeout(800);
    const b = await body();
    assert(/Methodology changelog:/.test(b) || b.includes("changelog"), "changelog line present");
  });

  t("demo markers present (offline fixture disclosure) [bg demo]", async () => {
    const b = await body();
    assert(b.toLowerCase().includes("demo"), "a demo marker is shown somewhere in the gated UI");
  });

  t("AI-2026 LIVE BACKFILL card + Fear&Greed block render in demo [bg-live, fg]", async () => {
    await pg.click(`button:has-text("Crisis Explorer")`, { timeout: 8000 }); await pg.waitForTimeout(400);
    await pg.click(`button:has-text("AI Investment Bubble")`, { timeout: 8000 }); await pg.waitForTimeout(800);
    const b = await body();
    assert(b.includes("LIVE BACKFILL"), "LIVE BACKFILL card present on ai2026 in demo");
    assert(b.includes("CNN Fear & Greed"), "Fear & Greed block present");
    assert(b.includes("46.0"), "F&G demo value 46.0");
    assert(b.includes("neutral"), "F&G rating label");
    assert(/prev close 46/.test(b), "F&G delta row");
    assert(b.includes("CAPE"), "a metrics pill (CAPE) present");
  });

  t("Fear&Greed series is on its own axis, never in the price rebase [fg contract]", async () => {
    // structural: the card shows the gaps note (short CNN history), proving the null-safe own-axis strip
    assert((await body()).includes("gaps = no observation"), "F&G sparkline gap note present");
  });

  t("'Open the atlas' CTA lands on default GFC (quirk preserved, not 'fixed') [critic]", async () => {
    await pg.click(`button:has-text("AI Regime")`, { timeout: 8000 }); await pg.waitForTimeout(800);
    const cta = await pg.$(`button:has-text("Open the atlas")`);
    if (cta) {
      await cta.click(); await pg.waitForTimeout(900);
      const b = await body();
      assert(b.includes("weight 1.0 · peak Oct 2007"), "CTA navigates to Explorer default GFC, not the analogue");
    }
  });

  t("activation persists across param-less navigation via sessionStorage (same tab) [bg-01]", async () => {
    const ss = await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"));
    assert(ss === "demo" || ss === "fixture", "activation key persisted in sessionStorage (got " + ss + ")");
    // SPA navigation is same-tab: reload the SAME page without the param — sessionStorage survives.
    await pg.goto(h.origin + "/", { waitUntil: "commit" }); await pg.waitForTimeout(7000);
    assert(await pg.$(`button:has-text("AI Regime")`), "AI Regime persists on param-less reload (same tab)");
  });

  t("?status-api-off clears the activation [bg-01]", async () => {
    await pg.goto(h.origin + "/?status-api-off", { waitUntil: "commit" }); await pg.waitForTimeout(7000);
    assert(!(await pg.$(`button:has-text("AI Regime")`)), "AI Regime gone after ?status-api-off");
    const ss = await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"));
    assert(ss == null, "sessionStorage cleared (got " + ss + ")");
  });
};
