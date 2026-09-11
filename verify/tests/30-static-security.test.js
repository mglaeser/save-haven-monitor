"use strict";
// Static source checks (mandate S3 executable proof; substitutes the reviewer for a whole
// class of properties a human would have eyeballed). Deterministic regex/parse over the
// served files. Covers: SRI integrity, secret-free source, gating whitelist present at
// BOTH use sites, no HTML-injection sinks, relative URLs, external-link hardening,
// error-handler capture flag, and name/behaviour truthfulness of load-bearing identifiers.
const { raw } = require("../lib/load.js");
const { ok, eq } = require("../lib/assert.js");

// Remove /* block */ and // line comments (a `//` inside a string literal such as "http://…" is
// preceded by ':' — only whitespace- or line-start-anchored `//` is treated as a comment).
function stripComments(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "").replace(/(\s)\/\/(?![^\n]*["'`]).*$/gm, "$1");
}

module.exports = function register(t) {
  const html = raw("index.html");
  const bg = raw("src/bubblegauge.tsx");
  const dash = raw("src/dashboard.tsx");

  t("all 4 self-hosted vendor <script src> tags carry sha384 integrity", () => {
    // Compiled-ahead (DR-006): vendors are same-origin under ./vendor/ (no unpkg, so no crossorigin
    // needed — SRI is enforced on same-origin without it). No in-browser Babel script remains.
    const tags = html.match(/<script\s+src="\.\/vendor\/[^"]+"[^>]*>/g) || [];
    ok(tags.length === 4, `expected 4 vendor script tags, got ${tags.length}`);
    for (const tag of tags) ok(/integrity="sha384-[A-Za-z0-9+/=]+"/.test(tag), `integrity present: ${tag.slice(0, 60)}`);
  });

  t("no plausible secrets/credentials or auth-secret idioms in served source", () => {
    const files = { "index.html": html, "src/bubblegauge.tsx": bg, "src/dashboard.tsx": dash };
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

  t("DR-015: the API base is built ONLY from the embedded KEY_RE-validated label + the page's parent domain; no user input reaches URL construction", () => {
    // Red line 1 (KEY_RE gating of the subdomain -> URL derivation) survives the retirement of the
    // ?status-api parameter in its STRONGER form: the whitelist now guards a constant, and nothing a
    // visitor controls (query string, sessionStorage, hash) is read by the integration at all.
    ok(/const\s+KEY_RE\s*=\s*\/\^\[a-z0-9-\]\{1,32\}\$\//.test(bg), "KEY_RE defined as strict whitelist");
    const sub = bg.match(/const\s+SUB\s*=\s*"([a-z0-9-]+)"/);
    ok(sub, "the embedded subdomain label SUB is a plain KEY_RE-shaped literal (a fragment, never a host — DR-005)");
    // the label is re-validated before derivation, and an invalid label yields NO base (fail closed).
    ok(/if\s*\(!KEY_RE\.test\(SUB\)\)\s*return null/.test(bg), "SUB is re-validated by KEY_RE and an invalid label returns null before base derivation");
    ok(/if\s*\(!API_BASE\)\s*return Promise\.resolve\(\{\s*status:\s*0/.test(bg), "a null base short-circuits the fetch layer (status 0 = unavailable/static, never a request)");
    // the base is only ever built as SUB + '.' + parent (no full-URL acceptance, no key variable).
    ok(/"https:\/\/"\s*\+\s*SUB\s*\+\s*"\."\s*\+\s*parent/.test(bg), "base is subdomain-of-parent only");
    ok(!/"https:\/\/"\s*\+\s*key\b/.test(bg), "no key-derived base construction remains");
    // the retired gate must not creep back, by ANY spelling: the checks below run on the source with
    // comments STRIPPED (a guard that only exists inside a comment must not satisfy them), and ban
    // every visitor-controlled input channel from the whole module — query string, hash, href,
    // referrer, window.name, document.URL, localStorage — while sessionStorage may touch exactly one
    // key, the splash-seen flag. verify/tests/74 then EXECUTES the derivation behind a throwing Proxy.
    const code = stripComments(bg);
    ok(/if\s*\(!KEY_RE\.test\(SUB\)\)\s*return null/.test(code), "the KEY_RE guard is live code, not a comment");
    ok(!/searchParams|URLSearchParams|location\.search|location\.hash|location\.href|\.href\b|window\.name|document\.referrer|document\.URL|localStorage|status-api/.test(code),
      "the integration reads no query parameter, hash, href, referrer, window.name or storage (the gate is retired — DR-015)");
    const ssKeys = [...code.matchAll(/sessionStorage\s*\.\s*(getItem|setItem|removeItem)\s*\(\s*"([^"]*)"/g)].map((m) => m[2]);
    const ssUses = (code.match(/sessionStorage/g) || []).length;
    ok(ssUses === ssKeys.length && ssKeys.every((k) => k === "bubblegauge:splash-seen"), `sessionStorage may hold ONLY the splash-seen flag (got ${ssUses} uses, keys ${JSON.stringify(ssKeys)})`);
    // exactly one assignment, argument-less, so the derivation cannot be bypassed by a second source
    ok(/const\s+API_BASE\s*=\s*resolveApiBase\(\s*\)\s*;/.test(code), "API_BASE is assigned exactly from resolveApiBase() with no argument");
    ok((code.match(/\bAPI_BASE\s*=[^=]/g) || []).length === 1, "API_BASE is assigned exactly once");
    // the three derivation sites — client, deploy-time generator, widget — embed the SAME label, so
    // the browser, the fallback artifact and the widget can never disagree about which origin is the API.
    const gen = raw("scripts/generate-fallback.js").match(/const\s+SUB\s*=\s*"([a-z0-9-]+)"/);
    ok(gen && gen[1] === sub[1], `scripts/generate-fallback.js SUB (${gen && gen[1]}) must equal the client's (${sub[1]})`);
    const wid = raw("widget.html").match(/var\s+SUB\s*=\s*"([a-z0-9-]+)"/);
    ok(wid && wid[1] === sub[1], `widget.html SUB (${wid && wid[1]}) must equal the client's (${sub[1]})`);
    const wcode = stripComments(raw("widget.html"));
    ok(!/searchParams|URLSearchParams|location\.search|location\.hash|location\.href|window\.name|document\.referrer|document\.URL|localStorage|sessionStorage|status-api/.test(wcode), "widget.html reads no query parameter, hash, href, referrer, window.name or storage either");
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
