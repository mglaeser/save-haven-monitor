"use strict";
// Responsive containment: at a narrow viewport the PAGE never scrolls horizontally; wide content
// (the similarity matrix) scrolls inside its own container instead.
const assert = (c, m) => { if (!c) throw new Error(m); };

module.exports = async function register(t, h) {
  t("375px: no page-level horizontal scroll [critic responsive]", async () => {
    const pg = await h.page("/", { viewport: { width: 375, height: 800 } });
    const overflow = await pg.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    assert(overflow <= 2, "page horizontal overflow px = " + overflow);
    await pg.close();
  });

  t("375px: similarity matrix scrolls inside its own container [critic responsive]", async () => {
    const pg = await h.page("/", { viewport: { width: 375, height: 800 } });
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
};
