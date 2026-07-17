"use strict";
// Static source checks (mandate S3 executable proof; substitutes the reviewer for a whole
// class of properties a human would have eyeballed). Deterministic regex/parse over the
// served files. Covers: SRI integrity, secret-free source, gating whitelist present at
// BOTH use sites, no HTML-injection sinks, relative URLs, external-link hardening,
// error-handler capture flag, and name/behaviour truthfulness of load-bearing identifiers.
const { raw } = require("../lib/load.js");
const { ok, eq } = require("../lib/assert.js");

module.exports = function register(t) {
  const html = raw("index.html");
  const bg = raw("bubblegauge.jsx");
  const dash = raw("dashboard.jsx");

  t("all 4 self-hosted vendor <script src> tags carry sha384 integrity", () => {
    // Compiled-ahead (DR-006): vendors are same-origin under ./vendor/ (no unpkg, so no crossorigin
    // needed — SRI is enforced on same-origin without it). No in-browser Babel script remains.
    const tags = html.match(/<script\s+src="\.\/vendor\/[^"]+"[^>]*>/g) || [];
    ok(tags.length === 4, `expected 4 vendor script tags, got ${tags.length}`);
    for (const tag of tags) ok(/integrity="sha384-[A-Za-z0-9+/=]+"/.test(tag), `integrity present: ${tag.slice(0, 60)}`);
  });

  t("no plausible secrets/credentials or auth-secret idioms in served source", () => {
    const files = { "index.html": html, "bubblegauge.jsx": bg, "dashboard.jsx": dash };
    // The site legitimately holds NO secrets: the bubblegauge feed is a public GET, no auth
    // header. So both leaked-key shapes AND the idioms that would carry one are forbidden.
    const patterns = [
      /\bsk-[A-Za-z0-9]{16,}/,               // openai-style
      /\bghp_[A-Za-z0-9]{20,}/,              // github PAT
      /AKIA[0-9A-Z]{16}/,                    // aws access key
      /\bBearer\s+[A-Za-z0-9._-]{20,}/,
      /(api[_-]?key|secret|token|password)\s*[:=]\s*["'][A-Za-z0-9._-]{16,}["']/i,
      /\b[a-z]{2,}_(?:live|test)_sk_[A-Za-z0-9]{8,}/i, // provider live/test secret keys
      /\bsk_live_[A-Za-z0-9]{8,}/i,
      /\|\|\s*["'][A-Za-z0-9_-]{24,}["']/,   // `window.__X__ || "<24+ char token fallback>"` idiom
      /X-API-Key/i,                          // this public GET API sends no auth header
      /Authorization\s*[:=]/i,
    ];
    for (const [name, src] of Object.entries(files))
      for (const p of patterns)
        ok(!p.test(src), `no secret idiom (${p}) in ${name}`);
  });

  t("activation-key whitelist KEY_RE is enforced at every use of the param before URL construction", () => {
    ok(/const\s+KEY_RE\s*=\s*\/\^\[a-z0-9-\]\{1,32\}\$\//.test(bg), "KEY_RE defined as strict whitelist");
    // both branches that accept a key must re-test it; and base-URL construction must be gated.
    const tests = (bg.match(/KEY_RE\.test\(/g) || []).length;
    ok(tests >= 2, `KEY_RE.test used at >=2 sites, got ${tests}`);
    // the subdomain construction must not run for an unvalidated key: the early return guards it.
    ok(/if\s*\(!key\s*\|\|\s*!KEY_RE\.test\(key\)\)\s*return null/.test(bg), "unvalidated key returns null before base derivation");
    // and the base is only ever built as key + '.' + parent (no full-URL acceptance).
    ok(/"https:\/\/"\s*\+\s*key\s*\+\s*"\."\s*\+\s*parent/.test(bg), "base is subdomain-of-parent only");
  });

  t("no HTML-injection sinks fed by API/external data", () => {
    // dangerouslySetInnerHTML must not appear at all; the only innerHTML is the static
    // failure-message bootstrap in index.html (constant string, no interpolation).
    ok(!/dangerouslySetInnerHTML/.test(bg + dash), "no dangerouslySetInnerHTML in app source");
    // any innerHTML assignment in bubblegauge must not interpolate a variable
    const innerHtmlAssigns = bg.match(/\.innerHTML\s*=\s*[^;]+/g) || [];
    for (const a of innerHtmlAssigns) ok(!/\$\{|\+/.test(a), `innerHTML not interpolated: ${a.slice(0, 60)}`);
  });

  t("error/network handlers do not fabricate a success status (no swallowed-error masquerade)", () => {
    // A catch handler that returns a 2xx status silently converts failure into fake success.
    ok(!/catch\s*\([\s\S]{0,180}?status:\s*2\d\d/.test(bg), "no catch handler returns a 2xx status");
  });

  t("all app URLs are relative or https; no http:// leaks except localhost dev fallback and XML namespaces", () => {
    const httpMatches = (html + bg + dash).match(/http:\/\/[^"'\s)]+/g) || [];
    for (const m of httpMatches)
      ok(/localhost|127\.0\.0\.1|www\.w3\.org/.test(m), `http only for localhost or w3 SVG namespace: ${m}`);
    ok(/src="\.\/bubblegauge\.js"/.test(html) && /src="\.\/dashboard\.js"/.test(html), "compiled app scripts loaded via relative ./ paths");
  });

  t("external navigation links are hardened (noopener noreferrer, target _blank)", () => {
    const anchors = bg.match(/target="_blank"[^>]*rel="[^"]*"|rel="[^"]*"[^>]*target="_blank"/g) || [];
    ok(anchors.length >= 1, "at least one hardened external link");
    for (const a of anchors) ok(/noopener/.test(a) && /noreferrer/.test(a), `noopener+noreferrer: ${a.slice(0, 50)}`);
  });

  t("load-failure handler uses capture phase (script errors do not bubble)", () => {
    ok(/addEventListener\("error",\s*cwFail,\s*true\)/.test(html), "error listener registered with capture=true");
    ok(/addEventListener\("unhandledrejection",\s*cwFail\)/.test(html), "unhandledrejection covered");
  });

  t("integration seams in dashboard.jsx are all explicitly marked (names-are-claims)", () => {
    const seams = (dash.match(/bubblegauge integration seam/g) || []).length;
    ok(seams >= 4, `>=4 marked seams, got ${seams}`);
    // BG is read defensively (never assumes window.BubbleGauge exists)
    ok(/const\s+BG\s*=\s*\(typeof window[^;]*window\.BubbleGauge\)\s*\|\|\s*\{\s*enabled:\s*false\s*\}/.test(dash),
      "BG defaults to {enabled:false} when the gate module is absent");
  });
};
