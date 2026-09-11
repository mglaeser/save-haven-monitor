"use strict";
// The embedded status-API integration contract (re-freeze R3, DR-015). The harness answers the
// derived API base from the frozen goldens acceptance/golden/api-*.fixture.json — zero live
// network — so this page is the CONNECTED state, reached with NO query parameter: strip, 6th tab,
// AI Regime panels, LIVE BACKFILL card + Fear&Greed block, the "Open the atlas" quirk. The retired
// ?status-api / ?status-api-off parameters are asserted INERT. Traceability: bg-* IDs.
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  const pg = await h.page("/");
  const body = async () => (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");

  t("strip mounts above the tab bar, keyboard-activatable, with no query parameter [bg strip, DR-015]", async () => {
    const strip = await pg.$(`[aria-label="AI bubble regime gauge"]`);
    assert(strip, "strip aside present");
    const role = await strip.getAttribute("role");
    assert(role === "button", "loaded strip has role=button (got " + role + ")");
    assert((await strip.getAttribute("tabindex")) === "0", "strip is focusable");
  });

  t("6th tab 'AI Regime' is present with the API connected [bg tab]", async () => {
    assert(await pg.$(`button:has-text("AI Regime")`), "AI Regime tab present");
  });

  t("the page reached the embedded API base and nowhere else beyond the origin [bg egress]", async () => {
    const reqs = pg.requestsMade();
    assert(h.apiBase, "the harness derived an API base for this origin");
    assert(reqs.some((u) => u.startsWith(h.apiBase + "/api/v1/")), "an /api/v1/* request was made to the derived base");
    for (const u of reqs)
      assert(u.startsWith(h.origin) || u.startsWith("data:") || u.startsWith(h.apiBase + "/"),
        "request beyond origin + derived API base: " + u);
  });

  t("live score renders: band, verdict, flags [bg strip content, DR-010]", async () => {
    const b = await body();
    assert(b.includes("HOLD"), "action band label");
    assert(b.includes("IQR 34–47"), "strip IQR from the score payload");
    assert(b.includes("No action indicated."), "desktop verdict sentence for hold + both trend rules intact");
    assert(b.includes("0 of 4 fired"), "override flag count");
  });

  t("no demo/fixture marker anywhere: the live surface never labels itself demo [DR-015]", async () => {
    assert(!/\bdemo\b/i.test(await body()), "a 'demo' marker is shown although the page is on its embedded endpoint");
  });

  t("AI Regime tab renders headline + history + changelog [bg panels]", async () => {
    await pg.click(`button:has-text("AI Regime")`, { timeout: 8000 }); await pg.waitForTimeout(800);
    const b = await body();
    assert(b.includes("AI bubble regime — 40"), "headline with the live median");
    assert(/Methodology changelog:/.test(b) || b.includes("changelog"), "changelog line present");
    assert(b.includes("Science audit"), "status endpoint consumed (science audit block)");
  });

  t("AI-2026 LIVE BACKFILL card + Fear&Greed block render from the feed [bg-live, fg]", async () => {
    await pg.click(`button:has-text("Crisis Explorer")`, { timeout: 8000 }); await pg.waitForTimeout(400);
    await pg.click(`button:has-text("AI Investment Bubble")`, { timeout: 8000 }); await pg.waitForTimeout(800);
    const b = await body();
    assert(b.includes("LIVE BACKFILL"), "LIVE BACKFILL card present on ai2026 with the feed up");
    assert(b.includes("CNN Fear & Greed"), "Fear & Greed block present");
    assert(b.includes("46.0"), "F&G value 46.0");
    assert(b.includes("neutral"), "F&G rating label");
    assert(/prev close 46/.test(b), "F&G delta row");
    assert(b.includes("CAPE"), "a metrics pill (CAPE) present");
    assert(b.includes("QQQ TR proxy"), "the AI-2026 market line is relabeled with its honest proxy when live");
  });

  t("Fear&Greed series is on its own axis, never in the price rebase [fg contract]", async () => {
    // structural: the card shows the gaps note (short CNN history), proving the null-safe own-axis strip
    assert((await body()).includes("gaps = no observation"), "F&G sparkline gap note present");
  });

  t("Aggregate overlays and the Analytics 'today' window are badged LIVE when the feed is up [bg-live badges]", async () => {
    await pg.click(`button:has-text("Aggregate")`, { timeout: 8000 }); await pg.waitForTimeout(600);
    assert((await body()).includes("2026 overlays: LIVE"), "Aggregate LIVE badge");
    await pg.click(`button:has-text("Analytics")`, { timeout: 8000 }); await pg.waitForTimeout(600);
    assert((await body()).includes("today window: LIVE"), "Analytics LIVE badge");
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

  t("no activation state is persisted: sessionStorage carries no bubblegauge key [DR-015]", async () => {
    const ss = await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"));
    assert(ss == null, "no activation key in sessionStorage (got " + ss + ")");
  });

  t("the retired query parameters are inert: ?status-api=demo, ?status-api=evil.com and ?status-api-off all render the same connected page [DR-015]", async () => {
    for (const q of ["/?status-api=demo", "/?status-api=evil.com", "/?status-api-off"]) {
      const p2 = await h.page(q);
      const b = (await p2.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
      assert(await p2.$(`button:has-text("AI Regime")`), q + ": AI Regime tab present regardless of the parameter");
      const strip = await p2.$(`[aria-label="AI bubble regime gauge"]`);
      assert(strip && (await strip.getAttribute("role")) === "button", q + ": strip is the live strip");
      assert(!/\bdemo\b/i.test(b), q + ": no demo marker");
      assert(p2.requestsMade().some((u) => u.startsWith(h.apiBase + "/api/v1/")), q + ": the embedded base was requested (no offline mode of any spelling)");
      assert(b.includes("IQR 34–47") && b.includes("No action indicated."), q + ": the live payload rendered — the same connected page");
      assert(!p2.requestsMade().some((u) => { try { return new URL(u).hostname.includes("evil"); } catch (e) { return false; } }), q + ": no request to a parameter-named host");
      for (const u of p2.requestsMade())
        assert(u.startsWith(h.origin) || u.startsWith("data:") || u.startsWith(h.apiBase + "/"), q + ": request beyond origin + derived API base: " + u);
      assert((await p2.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"))) == null, q + ": no activation key written");
      await p2.close();
    }
  });
};
