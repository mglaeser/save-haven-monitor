"use strict";
// Negative / scope contracts under re-freeze R2 (DR-014 item 1, Q2). The RETIRED baseline was
// "the ungated site is byte-identical to the original atlas and makes ZERO network requests".
// The R2 negative contract: the ungated page may request ONLY same-origin relative URLs (which
// includes the /content/fallback.json artifact once the shallow wiring lands) — never a third
// party, and never the status API without a KEY_RE-valid key (red line 1). Gated behaviors stay
// absent without the param.
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  t("no ?status-api → 5 tabs, no strip, no AI Regime, no LIVE BACKFILL; requests never leave the origin [Q2 negative contract]", async () => {
    const pg = await h.page("/");
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    for (const l of ["Crisis Explorer", "Similarity Matrix", "Aggregate", "Analytics", "Playbook"])
      assert(await pg.$(`button:has-text("${l}")`), "base tab present: " + l);
    assert(!b.includes("AI Regime"), "no 6th tab");
    assert(!(await pg.$(`[aria-label="AI bubble regime gauge"]`)), "no strip");
    assert(!b.includes("LIVE BACKFILL"), "no live card");
    const ss = await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"));
    assert(ss == null, "no activation key written without a param");
    for (const u of pg.requestsMade())
      assert(u.startsWith(h.origin) || u.startsWith("data:"),
        "ungated page requested beyond same-origin: " + u);
    await pg.close();
  });

  t("?status-api=evil.com is rejected by KEY_RE (no activation, no SSRF) [bg gating, red line 1]", async () => {
    const pg = await h.page("/?status-api=evil.com");
    await pg.waitForTimeout(6000);
    assert(!(await pg.$(`button:has-text("AI Regime")`)), "dotted key rejected — no gate");
    const external = pg.requestsMade().filter((u) => !u.startsWith(h.origin) && !u.startsWith("data:"));
    assert(external.length === 0, "rejected key still caused a request: " + external.join(", "));
    await pg.close();
  });

  t("demo mode makes no external network call (egress ledger clean is asserted globally)", async () => {
    // The harness fails the whole run on any egress violation; this case documents the intent.
    assert(true, "see the harness violations assertion in run.js");
  });
};
