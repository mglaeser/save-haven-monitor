"use strict";
// Responsive containment: at a narrow viewport the PAGE never scrolls horizontally; wide content
// (the similarity matrix) scrolls inside its own container instead.
// Re-freeze R3 (DR-015): with the API connected, a small-portrait viewport opens the once-per-
// session mobile splash (DR-007: API-connected + small portrait + not yet dismissed). It is pinned
// here as the opening state and dismissed through its own Close control before the atlas is measured.
const assert = (c, m) => { if (!c) throw new Error(m); };

async function dismissSplash(pg) {
  const dlg = await pg.$(`[role="dialog"][aria-label="AI bubble monitor — opening"]`);
  assert(dlg, "small-portrait opening splash present with the API connected (DR-007)");
  assert(await pg.$(`[aria-label="Close"]`), "splash carries its Close control");
  await pg.click(`[aria-label="Close"]`, { timeout: 8000 }); await pg.waitForTimeout(500);
  assert(!(await pg.$(`[role="dialog"][aria-label="AI bubble monitor — opening"]`)), "splash dismissed");
  assert((await pg.evaluate(() => sessionStorage.getItem("bubblegauge:splash-seen"))) === "1", "dismissal remembered for this session only");
}
// ONCE per session: after a dismissal a same-tab reload must not re-open the splash; the small
// re-open control takes its place (DR-007).
async function assertShownOnce(pg) {
  await pg.reload({ waitUntil: "commit", timeout: 20000 }); await pg.waitForTimeout(6000);
  assert(!(await pg.$(`[role="dialog"][aria-label="AI bubble monitor — opening"]`)), "splash must not re-open on reload within the session");
  assert(await pg.$(`[aria-label="Open AI bubble monitor"]`), "the re-open control replaces the dismissed splash");
}

module.exports = async function register(t, h) {
  t("375px: opening splash shows once per session then closes; no page-level horizontal scroll [critic responsive, DR-007]", async () => {
    const pg = await h.page("/", { viewport: { width: 375, height: 800 } });
    await dismissSplash(pg);
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, "page horizontal overflow px = " + overflow);
    await assertShownOnce(pg);
    await pg.close();
  });

  t("375px: similarity matrix scrolls inside its own container [critic responsive]", async () => {
    const pg = await h.page("/", { viewport: { width: 375, height: 800 } });
    await dismissSplash(pg);
    await pg.click(`button:has-text("Similarity Matrix")`, { timeout: 8000 }); await pg.waitForTimeout(500);
    const contained = await pg.evaluate(() => {
      // find any element whose content is wider than its box (the scroll container)
      return [...document.querySelectorAll("div")].some((el) => el.scrollWidth - el.clientWidth > 40 && getComputedStyle(el).overflowX !== "visible");
    });
    assert(contained, "a horizontal scroll container exists for the wide matrix");
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, "page still does not scroll horizontally on the matrix tab (" + overflow + "px)");
    await pg.close();
  });

  t("375px with the API unreachable: no splash, no horizontal scroll — the static atlas [DR-015]", async () => {
    const pg = await h.page("/", { viewport: { width: 375, height: 800 }, api: null });
    assert(!(await pg.$(`[role="dialog"]`)), "no opening splash without a score");
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, "page horizontal overflow px = " + overflow);
    await pg.close();
  });
};
