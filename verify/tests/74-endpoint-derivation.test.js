"use strict";
// Embedded-endpoint derivation contract — derived from DR-015 (audit/decisions/), NOT from the
// implementation. FOUR places derive "which origin is the bubblegauge API" from a host name: the
// browser (src/bubblegauge.tsx resolveApiBase, from location.hostname), the JS-Widget
// (widget.html resolveBase), the acceptance harness (acceptance/lib/harness.js apiBaseOf, from
// the origin it serves) and the deploy-time fallback generator (scripts/generate-fallback.js
// deriveOrigins, from CNAME). DR-015 requires: the fixed KEY_RE-whitelisted label SUB + the
// registrable APEX the page is served from (or its www alias); a loopback dev base; and NO base
// at all (fail closed -> static state, no request) for any deeper host, IP literal or shared
// public suffix — while the generator, which reads the owner-controlled CNAME, keeps its
// leftmost-strip and must agree with the client wherever the client derives a base. A regex over
// the source cannot see whether four copies agree or what a function READS, so this EXECUTES the
// real shipped functions (lifted by brace matching, like 73-overview-verdict): against one table
// of hosts, behind a Proxy that throws on any property but hostname, and against real URL objects
// carrying hostile query/hash input.
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

function fnSrc(src, name) {
  const start = src.indexOf("function " + name + "(");
  if (start === -1) return null;
  let depth = 0;
  for (let j = src.indexOf("{", start); j < src.length; j++) {
    if (src[j] === "{") depth++;
    else if (src[j] === "}" && --depth === 0) return src.slice(start, j + 1);
  }
  return null;
}
const KEY_RE = /^[a-z0-9-]{1,32}$/;
// A location stand-in that throws on ANY property access except hostname (and the symbols the
// runtime consults when the object is coerced) — so a derivation that reads href/search/hash/
// port/toString/anything else fails loudly instead of quietly steering the base.
function hostnameOnly(hostname) {
  return new Proxy({}, { get(_, k) {
    if (k === "hostname") return hostname;
    throw new Error("derivation read location." + String(k) + " — only hostname is permitted (DR-015)");
  } });
}

function clientResolver(subOverride) {
  const src = raw("src/bubblegauge.tsx");
  const sub = src.match(/const\s+SUB\s*=\s*"([a-z0-9-]+)"/);
  ok(sub, "client SUB literal missing");
  const body = fnSrc(src, "resolveApiBase");
  ok(body, "resolveApiBase() missing from src/bubblegauge.tsx");
  const mk = (win) => new Function("SUB", "KEY_RE", "window", body + "\nreturn resolveApiBase;")(subOverride || sub[1], KEY_RE, win);
  return { sub: sub[1],
    base: (host) => mk({ location: hostnameOnly(host) })(hostnameOnly(host)),
    viaWindow: (host) => mk({ location: hostnameOnly(host) })(), // the argument-less call the module makes
    viaUrl: (url) => mk({ location: hostnameOnly("") })(new URL(url)) };
}
function widgetResolver(subOverride) {
  const src = raw("widget.html");
  const sub = src.match(/var\s+SUB\s*=\s*"([a-z0-9-]+)"/);
  ok(sub, "widget SUB literal missing");
  const body = fnSrc(src, "resolveBase");
  ok(body, "resolveBase() missing from widget.html");
  const run = (loc) => {
    const fn = new Function("SUB", "KEY_RE", "window", body + "\nreturn resolveBase;")(subOverride || sub[1], KEY_RE, { location: loc });
    const r = fn();
    return r && r.live ? r.base : null;
  };
  return { sub: sub[1], base: (host) => run(hostnameOnly(host)), viaUrl: (url) => run(new URL(url)) };
}
function harnessResolver() {
  // pure export; requiring the harness performs no I/O beyond reading env vars
  const { apiBaseOf } = require("../../acceptance/lib/harness.js");
  ok(typeof apiBaseOf === "function", "acceptance/lib/harness.js must export apiBaseOf");
  const sub = raw("acceptance/lib/harness.js").match(/const\s+API_SUB\s*=\s*"([a-z0-9-]+)"/);
  ok(sub, "harness API_SUB literal missing");
  return { sub: sub[1], base: (host) => apiBaseOf("https://" + host + "/x?y#z") };
}
function generator() {
  // pure export, no network / fs writes at require time (the script guards main() behind require.main)
  return require("../../scripts/generate-fallback.js");
}

// The behavioural table. base === null means "derive nothing: no request, static state".
const TABLE = [
  // host                 client base
  ["example.com",         "https://api.example.com"],  // apex
  ["EXAMPLE.COM",         "https://api.example.com"],  // case
  ["example.com.",        "https://api.example.com"],  // FQDN trailing dot
  ["www.example.com",     "https://api.example.com"],  // www alias of the apex
  ["crash.example.com",   null],                       // deeper host: not the apex -> nothing
  ["a.b.example.com",     null],
  ["someone.github.io",   null],                       // shared public suffix (a third party's host)
  ["www.someone.github.io", null],
  ["example.co.uk",       null],                       // multi-label public suffix (documented limit)
  ["192.168.1.5",         null],                       // LAN / IP literal
  ["10.0.0.1",            null],
  ["[fe80::1]",           null],                       // IPv6 literal
  ["bare",                null],
  ["",                    null],
  [".",                   null],
  ["localhost",           "http://localhost:8000"],    // loopback dev base
  ["LOCALHOST",           "http://localhost:8000"],
  ["127.0.0.1",           "http://localhost:8000"],
  ["127.0.0.2",           "http://localhost:8000"],
  ["[::1]",               "http://localhost:8000"],
  ["0.0.0.0",             "http://localhost:8000"],
  ["site.local",          "http://localhost:8000"],
];

module.exports = function register(t) {
  t("DR-015: client, widget, harness and deploy-time generator embed the same KEY_RE-valid subdomain label", () => {
    const c = clientResolver(), w = widgetResolver(), h = harnessResolver(), g = generator();
    const genSub = raw("scripts/generate-fallback.js").match(/const\s+SUB\s*=\s*"([a-z0-9-]+)"/);
    ok(genSub, "generator SUB literal missing");
    ok(KEY_RE.test(c.sub), `client SUB '${c.sub}' must satisfy KEY_RE`);
    ok(c.sub === w.sub && c.sub === h.sub && c.sub === genSub[1], `SUB drift: client '${c.sub}', widget '${w.sub}', harness '${h.sub}', generator '${genSub[1]}'`);
    ok(g.KEY_RE.source === KEY_RE.source, "the generator's KEY_RE must be byte-identical to the client's (red line 1)");
  });

  t("DR-015: the derivation table — apex/www derive SUB.<apex>; loopback derives the dev base; everything else derives NOTHING — identically in client, widget and harness", () => {
    const c = clientResolver(), w = widgetResolver(), h = harnessResolver();
    for (const [host, want] of TABLE) {
      const got = c.base(host);
      ok(got === want, `client: ${JSON.stringify(host)} -> ${JSON.stringify(got)}, expected ${JSON.stringify(want)}`);
      ok(w.base(host) === want, `widget: ${JSON.stringify(host)} -> ${JSON.stringify(w.base(host))}, expected ${JSON.stringify(want)}`);
      if (host !== "" && host !== "." && host !== "bare" && !host.startsWith("[")) // new URL() needs a parseable host
        ok(h.base(host) === want, `harness: ${JSON.stringify(host)} -> ${JSON.stringify(h.base(host))}, expected ${JSON.stringify(want)}`);
      if (want !== null && want.startsWith("https://")) ok(!want.endsWith("//" + host.toLowerCase().replace(/\.$/, "")), "the API is never the page's own origin");
    }
  });

  t("DR-015: wherever the client derives a base, the deploy-time generator derives the SAME origin from the same host", () => {
    const c = clientResolver(), g = generator();
    let compared = 0;
    for (const [host, want] of TABLE) {
      if (want === null || !want.startsWith("https://")) continue;
      const fromGen = g.deriveOrigins(host.toLowerCase().replace(/\.$/, "")).api; // CNAME is never a trailing-dot FQDN
      ok(fromGen === want, `generator (${fromGen}) and client (${want}) disagree for host ${host}`);
      compared++;
    }
    ok(compared >= 3, "the agreement table must cover the apex, its case/trailing-dot variants and the www alias");
  });

  t("DR-015: the derivation reads NOTHING but the hostname — executed behind a throwing Proxy, and unchanged by hostile query/hash input", () => {
    const c = clientResolver(), w = widgetResolver();
    // every row above already ran behind hostnameOnly(); now the argument-less call the module makes
    ok(c.viaWindow("example.com") === "https://api.example.com", "resolveApiBase() with no argument reads window.location.hostname only");
    for (const u of ["https://example.com/?status-api=evil.com&api-host=evil.com#api=evil.com", "https://example.com/?status-api=demo", "https://www.example.com/x?status-api-off"]) {
      ok(c.viaUrl(u) === "https://api.example.com", `client base steered by URL input: ${u} -> ${c.viaUrl(u)}`);
      ok(w.viaUrl(u) === "https://api.example.com", `widget base steered by URL input: ${u} -> ${w.viaUrl(u)}`);
    }
    ok(c.viaUrl("https://someone.github.io/?status-api=api") === null, "a parameter cannot re-enable derivation on a non-apex host");
  });

  t("DR-015: a label that fails KEY_RE yields NO base (fail closed) — the guard is executed, not just present", () => {
    ok(clientResolver("evil.com").base("example.com") === null, "client: an invalid SUB must derive nothing");
    ok(widgetResolver("evil.com").base("example.com") === null, "widget: an invalid SUB must derive nothing");
    ok(clientResolver("a".repeat(33)).base("example.com") === null, "client: an over-long SUB must derive nothing");
  });
};
