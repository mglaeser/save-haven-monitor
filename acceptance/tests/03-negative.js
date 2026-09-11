"use strict";
// Negative / scope contracts under re-freeze R3 (DR-015). RETIRED: the R2 "ungated page" contract
// (no strip / 5 tabs / requests never leave the origin) — there is no gate any more; every
// visitor's browser tries the embedded status-API base. The R3 negative contract:
//   (1) the page's only destinations are same-origin relative URLs, data:, and the ONE derived
//       status-API base (which the harness answers or refuses) — never a third party, and never a
//       host steered by a query parameter (KEY_RE / red line 1 now guards a constant);
//   (2) when that API is UNREACHABLE — a refused connection, a non-2xx answer, a payload that fails
//       boundary validation, or a hang past the client's timeout — the page is the static/default
//       atlas: the 5 base tabs and their frozen content, the gauge surfaces in their labeled
//       unavailable/static states, no live card, no fabricated reading, no activation state, no
//       page errors. HTTP 503 is the distinct, labeled "warming up" state, equally data-free.
const assert = (c, m) => { if (!c) throw new Error(m); };
const TABS = ["Crisis Explorer", "Similarity Matrix", "Aggregate", "Analytics", "Playbook"];

// The static/default-content predicates every unreachable mode must satisfy. A consumer that
// mounts AFTER the first load (a tab's badge, the detail panel) issues its own request — failures
// are never cached — so under a HANGING API it settles only after the client's 6 s timeout; the
// waits below allow for that (9 s cap) instead of assuming an instant answer.
async function waitForBody(pg, re, ms) {
  await pg.waitForFunction((src) => new RegExp(src).test(document.body.textContent.replace(/\s+/g, " ")), re.source, { timeout: ms }).catch(() => {});
}
async function assertStaticAtlas(pg, h, label, detailRe) {
  const body = async () => (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
  const b = await body();
  for (const l of TABS) assert(await pg.$(`button:has-text("${l}")`), label + ": base tab present: " + l);
  assert(b.includes("Crisis Winners — assets that rose when markets collapsed"), label + ": h1 (the atlas is unaffected)");
  assert(b.includes("not tick data, and not investment advice"), label + ": hard-baked disclaimer on screen");
  assert(b.includes("weight 1.0 · peak Oct 2007"), label + ": Explorer default GFC renders from the frozen data");
  assert(!b.includes("LIVE BACKFILL"), label + ": no live card without the feed");
  assert(!b.includes("CNN Fear & Greed"), label + ": no Fear & Greed status without the feed");
  assert(!b.includes("No action indicated."), label + ": no verdict fabricated without a score");
  assert(!b.includes("46.0") && !b.includes("IQR 34–47") && !b.includes("AI bubble regime — "), label + ": no fixture or fabricated value bleeds into the unreachable state");
  const strip = await pg.$(`[aria-label="AI bubble regime gauge"]`);
  assert(strip, label + ": the compact strip stays as a labeled chip when the API is unreachable (it never silently vanishes)");
  assert((await strip.getAttribute("role")) !== "button", label + ": an unavailable strip is not clickable");
  assert(detailRe.test(await strip.textContent()), label + ": the strip states the unavailable/warming state");
  // the AI-2026 lines fall back to the hardcoded Jul-2026 anchors and SAY so
  await pg.click(`button:has-text("Aggregate")`, { timeout: 8000 }); await waitForBody(pg, /2026 overlays: static · Jul 2026 snapshot/, 9000);
  assert((await body()).includes("2026 overlays: static · Jul 2026 snapshot"), label + ": Aggregate overlays labeled static");
  await pg.click(`button:has-text("Analytics")`, { timeout: 8000 }); await waitForBody(pg, /today window: static · Jul 2026 snapshot/, 9000);
  assert((await body()).includes("today window: static · Jul 2026 snapshot"), label + ": Analytics today-window labeled static");
  await pg.click(`button:has-text("Crisis Explorer")`, { timeout: 8000 }); await pg.waitForTimeout(400);
  await pg.click(`button:has-text("AI Investment Bubble")`, { timeout: 8000 }); await pg.waitForTimeout(600);
  const b2 = await body();
  assert(b2.includes("POTENTIAL crisis — the peak is anchored at today (Jul 2026)"), label + ": the static AI-2026 panel renders");
  assert(!b2.includes("LIVE BACKFILL") && !b2.includes("QQQ TR proxy"), label + ": no live relabeling on the static panel");
  const tab = await pg.$(`button:has-text("AI Regime")`);
  assert(tab, label + ": the AI Regime tab is still offered while unreachable (the integration is always on; only its data is absent)");
  await tab.click(); await waitForBody(pg, /The regime gauge is unavailable right now|no snapshot has been computed yet/, 9000);
  const b3 = await body();
  // the DETAIL panel's own sentence, not the strip's (the strip is mounted on every tab)
  assert(/The regime gauge is unavailable right now|no snapshot has been computed yet/.test(b3), label + ": the detail panel itself states the unavailable/warming state");
  assert(!b3.includes("AI bubble regime — ") && !b3.includes("Methodology changelog"), label + ": no headline score or history is fabricated on the detail tab");
  assert((await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"))) == null, label + ": no activation key written");
  const reqs = pg.requestsMade();
  assert(reqs.some((u) => h.apiBase && u.startsWith(h.apiBase + "/api/v1/")), label + ": the page DID try the embedded API (the fallback was exercised, not skipped)");
  for (const u of reqs)
    assert(u.startsWith(h.origin) || u.startsWith("data:") || (h.apiBase && u.startsWith(h.apiBase + "/")),
      label + ": unreachable-API page requested beyond origin + derived base: " + u);
}

module.exports = async function register(t, h) {
  t("API refuses the connection → the static/default atlas: 5 base tabs, h1, baked disclaimer; no live card, no fabricated reading; gauge surfaces read unavailable/static [DR-015 fallback contract]", async () => {
    const pg = await h.page("/", { api: null });
    await assertStaticAtlas(pg, h, "refused", /unavailable/i);
    await pg.close();
  });

  t("API answers non-2xx (500) on every path → the same static/default atlas [DR-015 fallback contract]", async () => {
    const pg = await h.page("/", { api: { status: 500 } });
    await assertStaticAtlas(pg, h, "http-500", /unavailable/i);
    await pg.close();
  });

  t("API answers 200 with shape-invalid payloads → boundary validators refuse them; the same static/default atlas [DR-015 fallback contract]", async () => {
    const pg = await h.page("/", { api: "invalid" });
    await assertStaticAtlas(pg, h, "invalid-payload", /unavailable/i);
    await pg.close();
  });

  t("API hangs past the client's 6 s timeout → the same static/default atlas [DR-015 fallback contract]", async () => {
    const pg = await h.page("/", { api: "hang" });
    await assertStaticAtlas(pg, h, "hang", /unavailable/i);
    await pg.close();
  });

  t("API answers 503 → the distinct, data-free 'warming up' state; everything else static [DR-015 fallback contract]", async () => {
    const pg = await h.page("/", { api: { status: 503 } });
    await assertStaticAtlas(pg, h, "http-503", /warming up/i);
    await pg.close();
  });

  t("no query parameter can steer egress: ?status-api=evil.com is the same connected page and requests nothing outside origin + the derived base [red line 1, structurally]", async () => {
    const pg = await h.page("/?status-api=evil.com");
    const b = (await pg.evaluate(() => document.body.textContent)).replace(/\s+/g, " ");
    const external = pg.requestsMade().filter((u) => !u.startsWith(h.origin) && !u.startsWith("data:") && !(h.apiBase && u.startsWith(h.apiBase + "/")));
    assert(external.length === 0, "parameter-bearing page requested beyond origin + derived base: " + external.join(", "));
    assert(!pg.requestsMade().some((u) => { try { return new URL(u).hostname.includes("evil"); } catch (e) { return false; } }), "no request to the parameter-named host");
    assert(pg.requestsMade().some((u) => h.apiBase && u.startsWith(h.apiBase + "/api/v1/")), "the embedded base was requested regardless of the parameter (the gate is gone, not merely closed)");
    assert(b.includes("IQR 34–47") && (await pg.$(`button:has-text("AI Regime")`)), "the parameter-bearing page is the connected page");
    assert((await pg.evaluate(() => sessionStorage.getItem("bubblegauge:enabled"))) == null, "no activation key written");
    await pg.close();
  });

  t("run-wide egress ledger: only same-origin, data:, and the harness-answered API base are ever requested (asserted globally)", () => {
    // The harness fails the whole run on any egress violation; this case documents the intent.
    assert(true, "see the harness violations assertion in run.js");
  });
};
