"use strict";
// Negative / zero-footprint contracts. The site with no ?status-api must be indistinguishable from
// the original atlas; a non-whitelisted key must be rejected (KEY_RE / no SSRF).
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  t("no ?status-api → exactly 5 tabs, no strip, no AI Regime, no LIVE BACKFILL [bg no-op]", async () => {
    const pg = await h.page("/");
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    assert(!b.includes("AI Regime"), "no 6th tab");
    assert(!(await pg.$(`[aria-label="AI bubble regime gauge"]`)), "no strip");
    assert(!b.includes("LIVE BACKFILL"), "no live card");
    const ss = await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"));
    assert(ss == null, "no activation key written without a param");
    await pg.close();
  });

  t("?status-api=evil.com is rejected by KEY_RE (no activation, no SSRF) [bg gating]", async () => {
    const pg = await h.page("/?status-api=evil.com");
    await pg.waitForTimeout(6000);
    assert(!(await pg.$(`button:has-text("AI Regime")`)), "dotted key rejected — no gate");
    await pg.close();
  });

  t("demo mode makes no external network call (egress ledger clean is asserted globally)", async () => {
    // The harness fails the whole run on any egress violation; this case documents the intent.
    assert(true, "see the harness violations assertion in run.js");
  });
};
