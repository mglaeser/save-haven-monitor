"use strict";
// RED LINE 5, EXECUTED RATHER THAN READ.
//
// 62-security-surface requires src/content.ts to CONTAIN a hasDisclaimer
// validator and to mention it inside parseFallback / parseLiveDashboard. Those
// are regexes over source text, and a regex cannot see whether an answer is
// USED. This edit keeps every one of them green while committing an
// un-disclaimed payload:
//
//     function parseFallback(j) {
//       hasDisclaimer(blocks);   // called; answer discarded
//       return { blocks, slots, asOf: j.as_of, version };
//     }
//
// Not hypothetical: a module shaped that way was run against this suite and
// passed it 74/74. The shipped loader is honest — it returns null when the
// disclaimer is missing, and it additionally serves nothing while the page's
// baked disclaimer is off-screen. What was missing is anything that NOTICES if
// either stops being true.
//
// So this drives the real public entry points against a stubbed transport and
// DOM, and asserts on what the renderer can actually READ. The harness mandate
// is "executable proof over inspection" (S3, verify/lib/load.js); red line 5
// was the last one still resting on inspection.
//
// Deliberately separate from 62: that file is a static scan of served sources
// and should stay one. A behavioural control sharing a file with textual ones
// tends to be rewritten as a textual one by whoever edits next.
const fs = require("fs");
const path = require("path");
const { REPO, transpile } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

const CONTENT_MODULE = "src/content.ts";
const SLUG = "site.disclaimer";

const artifact = (withDisclaimer) => {
  const blocks = { "site.tagline": { kind: "text", text: "An interactive atlas." } };
  if (withDisclaimer) blocks[SLUG] = { kind: "text", text: "Research, not investment advice." };
  return { as_of: "2026-08-30", content_version: 7, blocks: blocks };
};

// The page's hard-baked disclaimer element, in the three states the gate cares
// about. `null` = the element was removed from the page entirely.
const bakedDisclaimer = (mode) => {
  if (mode === "absent") return null;
  const attrs = mode === "hidden" ? { hidden: "" } : mode === "aria" ? { "aria-hidden": "true" } : {};
  return {
    hasAttribute: (a) => Object.prototype.hasOwnProperty.call(attrs, a),
    getAttribute: (a) => (Object.prototype.hasOwnProperty.call(attrs, a) ? attrs[a] : null),
  };
};

// A fresh module per case: the loader holds committed content and gate state in
// module scope, so a shared instance would let one case satisfy the next — that
// store is precisely what is under test.
function freshModule(payload, domMode, liveBase) {
  const code = transpile(fs.readFileSync(path.join(REPO, CONTENT_MODULE), "utf8"));
  const calls = [];
  const el = bakedDisclaimer(domMode);
  const sandbox = {
    // BubbleGauge absent => liveBase() is null => the same-origin fallback path
    // runs, which is the path a static site actually takes.
    window: { BubbleGauge: liveBase ? { enabled: true, apiBase: liveBase } : undefined },
    document: {
      querySelector: () => el,
      documentElement: {},
      addEventListener: () => {},
    },
    MutationObserver: function () { this.observe = () => {}; this.disconnect = () => {}; },
    fetch: (u) => {
      const url = String(u);
      calls.push(url);
      const body = typeof payload === "function" ? payload(url) : payload;
      if (body === null) return Promise.resolve({ ok: false, status: 404, json: () => Promise.reject(new Error("no body")) });
      return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) });
    },
    AbortController: function () { this.signal = {}; this.abort = () => {}; },
    setTimeout: () => 0,
    clearTimeout: () => {},
    console: console,
  };
  const mod = { exports: {} };
  const names = Object.keys(sandbox);
  // esbuild's CJS output assigns module.exports itself — appending our own
  // assignment would overwrite it with an empty object.
  new Function("module", "exports", "require", ...names, code)(
    mod, mod.exports,
    () => { throw new Error("the content loader must not require() anything"); },
    ...names.map((n) => sandbox[n]));
  return { mod: mod.exports, calls };
}

module.exports = function register(t) {
  t("red line 5 EXECUTED: an un-disclaimed payload never commits", async () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return; // pre-wiring: loader has not landed
    const c = freshModule(artifact(false), "present");
    c.mod.startDisclaimerGate();          // gate OPEN, so only the payload can refuse
    await c.mod.loadContent();

    ok(c.calls.length > 0, "the loader never fetched — the stub is not wired, so this proves nothing");
    ok(c.mod.contentState().status !== "ready",
      `an artifact with no '${SLUG}' block reached status "ready" — no state may show grounded content un-disclaimed`);
    ok(c.mod.getBlock("site.tagline") === null,
      `content from an un-disclaimed artifact is readable — calling hasDisclaimer() is not enough, its answer must decide the outcome`);
  });

  t("red line 5 EXECUTED: a disclaimed payload commits and is readable", async () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return;
    // Without this case a loader that refuses EVERYTHING would satisfy the test
    // above, and a content path that commits nothing is a blank dashboard, not
    // a safe one.
    const c = freshModule(artifact(true), "present");
    c.mod.startDisclaimerGate();
    await c.mod.loadContent();

    const st = c.mod.contentState();
    ok(st.status === "ready",
      `a well-formed artifact carrying '${SLUG}' was refused (status=${st.status}, error=${st.error})`);
    ok(st.gated === false, "the gate stayed engaged even though the baked disclaimer is on screen");
    const d = c.mod.getBlock(SLUG);
    ok(d !== null && /not investment advice/.test(d.text || ""), "the committed state lost the disclaimer block");
    ok(c.mod.getBlock("site.tagline") !== null, "the disclaimed artifact's other content did not commit");
  });

  // The second half of red line 5: the disclaimer stays HARD-BAKED IN THE PAGE.
  // Grounded content must not be served while that element is gone or hidden,
  // however good the payload was.
  for (const mode of ["absent", "hidden", "aria"]) {
    t(`red line 5 EXECUTED: nothing is served when the baked disclaimer is ${mode}`, async () => {
      if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return;
      const c = freshModule(artifact(true), mode);
      c.mod.startDisclaimerGate();
      await c.mod.loadContent();

      ok(c.mod.contentState().gated === true,
        `the disclaimer element is ${mode} and the store is NOT gated — the gate enforces the baked disclaimer, it does not assume it`);
      ok(c.mod.getBlock(SLUG) === null && c.mod.getBlock("site.tagline") === null,
        `grounded content is readable while the page's disclaimer is ${mode} — red line 5 forbids showing content un-disclaimed`);
    });
  }

  // The LIVE path has its own parser (parseLiveDashboard) and its own copy of
  // the disclaimer check. Exercising only the fallback path left that copy
  // unguarded: a mutation that discarded its hasDisclaimer answer survived the
  // first version of this file with the whole suite green.
  const LIVE = "https://api.example.test";
  const liveBodies = (withDisclaimer) => (url) => {
    if (url.endsWith("/api/v1/content/dashboard")) {
      return { data: { blocks: artifact(withDisclaimer).blocks, content_version: 9 } };
    }
    if (url.endsWith("/api/v1/content/dynamic")) {
      return { data: { slots: { "hero.line": { text: "Ten screens, one question." } }, content_version: 9 } };
    }
    return null;
  };

  t("red line 5 EXECUTED (LIVE path): an un-disclaimed dashboard payload never commits", async () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return;
    const c = freshModule(liveBodies(false), "present", LIVE);
    c.mod.startDisclaimerGate();
    await c.mod.loadContent();

    ok(c.calls.some((u) => u.indexOf("/api/v1/content/dashboard") !== -1),
      "the live dashboard endpoint was never called — this case is not exercising the live path");
    ok(c.mod.getBlock("site.tagline") === null,
      "blocks from an un-disclaimed LIVE payload are readable — parseLiveDashboard has its own copy of the disclaimer check and it must decide the outcome");
    ok(c.mod.getSlot("hero.line") === null,
      "dynamic slots committed with no disclaimed block payload on the books");
  });

  t("red line 5 EXECUTED (LIVE path): a disclaimed dashboard payload commits", async () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return;
    const c = freshModule(liveBodies(true), "present", LIVE);
    c.mod.startDisclaimerGate();
    await c.mod.loadContent();

    const st = c.mod.contentState();
    ok(st.status === "ready" && st.source === "live",
      `a well-formed LIVE payload was refused (status=${st.status}, source=${st.source}, error=${st.error})`);
    ok(c.mod.getBlock(SLUG) !== null, "the live path lost the disclaimer block");
  });

  t("red line 5 EXECUTED: the store is fail-closed BEFORE the gate ever runs", async () => {
    if (!fs.existsSync(path.join(REPO, CONTENT_MODULE))) return;
    // startDisclaimerGate() is never called here: a page that forgets to wire
    // the gate must serve nothing, not everything.
    const c = freshModule(artifact(true), "present");
    await c.mod.loadContent();
    ok(c.mod.contentState().gated === true, "the store did not start gated — the gate must be fail-closed until it runs");
    ok(c.mod.getBlock(SLUG) === null, "content was served before the disclaimer gate ever ran");
  });
};
