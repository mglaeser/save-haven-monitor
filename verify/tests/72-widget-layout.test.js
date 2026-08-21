"use strict";
// Widget fixed-box geometry contract — derived from DR-009 (audit/decisions/), NOT from the
// implementation. DR-009 requires single-line heads, a freshness row that is always inside the box,
// graceful (ellipsis) degradation, no coerced numeric cells, and enumerated ratings only. The
// assertions below are the observable consequences of those requirements on the served artifact.
//
// Standing control — the served JS-Widget is a FIXED 168x168 box (.wrap, overflow:hidden) whose
// vertical budget has only ~8px of slack. ONE wrapped head row costs ~15px, which pushes .foot
// (the freshness timestamp) out of the box entirely — the timestamp silently disappears while
// every other element still looks plausible. That is a layout failure no data test can see, so
// the properties that make it structurally impossible are pinned here.
//
// Also pinned: the two coercion guards in the same render path. Math.round(null) is 0, so an
// unguarded IQR bound prints a FABRICATED interval on a financial signal; and a bare object-key
// lookup on an unvalidated rating string reaches Object.prototype ("constructor" is truthy).
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

// Return the declaration block for a CSS selector (no nested braces in this stylesheet).
function rule(css, selector) {
  const i = css.indexOf(selector);
  ok(i !== -1, `widget.html lost the '${selector}' rule`);
  return css.slice(i, css.indexOf("}", i));
}

module.exports = function register(t) {
  t("C-37/layout: widget head rows cannot wrap (a wrapped head clips the freshness timestamp)", () => {
    const css = raw("widget.html");
    for (const sel of [".lab{", ".score{", ".fgval{"]) {
      ok(/white-space:\s*nowrap/.test(rule(css, sel)),
        `${sel} must carry white-space:nowrap — .wrap is a fixed 168px overflow:hidden box, so a wrapped head steals the row .foot needs`);
    }
  });

  t("C-37/layout: an over-long head value degrades to an ellipsis, not a mid-glyph clip", () => {
    const css = raw("widget.html");
    for (const sel of [".score{", ".fgval{"]) {
      const r = rule(css, sel);
      ok(/text-overflow:\s*ellipsis/.test(r) && /min-width:\s*0/.test(r),
        `${sel} must carry text-overflow:ellipsis + min-width:0 (a flex item defaults to min-width:auto and will not shrink)`);
    }
  });

  t("widget: the IQR cell guards BOTH bounds with num() before rounding", () => {
    ok(/num\(d\.iqr\[0\]\)\s*&&\s*num\(d\.iqr\[1\]\)/.test(raw("widget.html")),
      "IQR must guard both bounds with num() before Math.round — Math.round(null) is 0, which would render a fabricated 'IQR 0-0' interval");
  });

  t("widget: the F&G rating is whitelisted before it indexes any lookup table", () => {
    const w = raw("widget.html");
    ok(/FG_RATINGS\s*=\s*\[/.test(w), "widget must carry the FG_RATINGS enum the dashboard validates against");
    ok(/FG_RATINGS\.indexOf\(r\)\s*!==\s*-1/.test(w),
      "rating lookups must pass an array whitelist, never a bare object key — FG_SHORT['constructor'] returns a truthy Object.prototype member");
  });
};
