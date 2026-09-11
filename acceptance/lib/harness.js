"use strict";
// Acceptance-suite harness — implementation-AGNOSTIC by construction. It serves the repo root
// (or ACCEPT_BASE_URL if given), launches headless Chromium, and enforces the egress contract:
// every request must be same-origin, an allowlisted CDN asset (fulfilled from local mirrors when
// available so the suite runs offline), or the embedded status-API base — which the harness
// answers ITSELF (see R3 below), so the suite never reaches a live API. Anything else fails the
// run — the egress allowlist is part of the parity contract, not an implementation detail.
//
// Re-freeze R2 (DR-014 item 1): the harness additionally PINS the content plane. It serves the
// frozen fixture golden/content-fallback.fixture.json at /content/fallback.json — the local,
// hermetic stand-in for the deploy-generated dist/content/fallback.json artifact — on every page,
// including ACCEPT_BASE_URL runs (live-content drift is out of this parity contract's scope).
// Tests can override per page: opts.content = "<golden filename>" swaps the fixture (poison
// case), opts.content = null forces a 404 (outage case). Each page records its request ledger
// (pg.requestsMade()) so frozen tests can assert the negative contract and condition
// target-contract assertions on "the page consumed the content URL".
//
// Re-freeze R3 (DR-015): the ?status-api gate is RETIRED. The status-API base is EMBEDDED in the
// page — the fixed subdomain label API_SUB of the page's own parent domain, or the loopback dev
// base on localhost/127.0.0.1 — and every visitor's browser tries it. The harness derives that
// base from the origin with the SAME rule the client uses (apiBaseOf below; verify/tests/74
// proves the shipped copies agree) and pins the API plane exactly like the content plane: by
// default each documented endpoint is answered from the frozen goldens golden/api-*.fixture.json
// (the CONNECTED state). The UNREACHABLE states DR-015 names are each a per-page mode: opts.api =
// null refuses the connection (network error); { status: N } answers every documented path with
// that HTTP status and a non-score body (non-2xx, 503 = the distinct warming state); "invalid"
// answers 200 with shape-valid JSON that fails the client's boundary validators; "hang" never
// answers, so the client's own 6 s timeout fires inside the 9 s settle. In every mode the page
// must fall back to its static/default content. Requests to the derived base are ledgered, never
// violations, and never real network. Any other API path answers 404 — the harness fabricates no
// payload it has no golden for.
//
// The FROZEN part of the suite is tests/ + golden/ + SPEC.md + this file (hash-manifested in
// verify/golden/acceptance-freeze.json). This bootstrap file may be adapted to a new
// implementation ONLY via re-freeze, and only in ways that keep the tests' observable semantics
// identical (e.g. a different local port); the tests themselves must not change.
const http = require("http");
const fs = require("fs");
const path = require("path");

const REPO = path.resolve(__dirname, "..", "..");
const PORT = Number(process.env.ACCEPT_PORT || 8490);
const BASE = process.env.ACCEPT_BASE_URL || null; // external target overrides the local server

// The content plane (DR-014 / A2 §1 P3): one same-origin artifact, pinned to a frozen fixture.
const CONTENT_PATH = "/content/fallback.json";
const CONTENT_FIXTURE = path.join(REPO, "acceptance", "golden", "content-fallback.fixture.json");
function contentBody(opts) {
  if (opts.content === null) return null; // forced outage — the route answers 404
  if (typeof opts.content === "string")
    return fs.readFileSync(path.join(REPO, "acceptance", "golden", opts.content));
  return fs.readFileSync(CONTENT_FIXTURE); // default: the frozen good fixture
}

// The API plane (DR-015): the embedded status-API base, derived from the origin exactly as the
// client derives it from location.hostname (fixed label + the registrable APEX the page is served
// from, or its www alias; loopback dev base; NO base for any deeper host, IP literal or shared
// suffix — the client sends nothing there), and answered from frozen goldens per documented path.
// verify/tests/74 executes this copy alongside the client's, the widget's and the generator's.
const API_SUB = "api";
function apiBaseOf(origin) {
  let host = new URL(origin).hostname.toLowerCase();
  if (host.length > 1 && host.charAt(host.length - 1) === ".") host = host.slice(0, -1);
  if (host === "localhost" || host === "[::1]" || host === "0.0.0.0" || /^127\.\d+\.\d+\.\d+$/.test(host) || host.endsWith(".local")) return "http://localhost:8000";
  const labels = host.split(".");
  if (labels[0] === "www" && labels.length === 3) labels.shift();
  if (labels.length !== 2 || host.charAt(0) === "[" || labels.some((l) => l.length === 0 || /^\d+$/.test(l))) return null;
  return "https://" + API_SUB + "." + labels.join(".");
}
// Shape-valid JSON that the client's boundary validators must REJECT (validScore / validFeed /
// history array / status.science_audit), for the "invalid" mode.
const API_INVALID = {
  "/api/v1/score": '{"data":{"headline_median":null,"action_band":"hold"},"meta":{}}',
  "/api/v1/score/history": '{"data":"not-an-array","meta":{}}',
  "/api/v1/status": '{"service":{"name":"bubblegauge"}}',
  "/api/v1/dashboard/feed": '{"data":{"anchor_month":null},"meta":{}}',
};
const API_FIXTURES = {
  "/api/v1/score": "api-score.fixture.json",
  "/api/v1/score/history": "api-history.fixture.json",
  "/api/v1/status": "api-status.fixture.json",
  "/api/v1/dashboard/feed": "api-feed.fixture.json",
};
const API_CORS = { "access-control-allow-origin": "*" }; // the real service is a public, credential-less GET API

// Local mirrors for the (current) pinned CDN set. A self-hosting rewrite simply never requests
// these; the routing rule stays identical either way.
const MIRROR_ROOT = process.env.ACCEPT_MIRRORS || "/tmp/claude-0/-home-user-save-haven-monitor/05bfe1ea-1771-5f9e-bdc3-f2071c86a2c8/scratchpad/node_modules";
const CDN_MIRROR = {
  "react@18.3.1/umd/react.production.min.js": "/react/umd/react.production.min.js",
  "react-dom@18.3.1/umd/react-dom.production.min.js": "/react-dom/umd/react-dom.production.min.js",
  "prop-types@15.8.1/prop-types.min.js": "/prop-types/prop-types.min.js",
  "recharts@2.12.7/umd/Recharts.js": "/recharts/umd/Recharts.js",
};

function resolvePlaywright() {
  const candidates = [
    path.join(REPO, "acceptance", "node_modules", "playwright-core"),
    path.join(REPO, "verify", "node_modules", "playwright-core"),
    path.join(MIRROR_ROOT, "playwright-core"),
  ];
  for (const c of candidates) { try { return require(c); } catch (e) {} }
  throw new Error("playwright-core not found — npm install in acceptance/ (or provide ACCEPT_MIRRORS)");
}
function chromiumPath() {
  if (process.env.ACCEPT_CHROMIUM) return process.env.ACCEPT_CHROMIUM;
  const roots = ["/opt/pw-browsers"];
  for (const r of roots) {
    if (!fs.existsSync(r)) continue;
    const hit = fs.readdirSync(r).find((d) => d.startsWith("chromium-"));
    if (hit) return path.join(r, hit, "chrome-linux", "chrome");
  }
  return undefined; // let playwright resolve its own
}

async function launch() {
  let server = null;
  const origin = BASE || `http://127.0.0.1:${PORT}`;
  const apiBase = apiBaseOf(origin);
  if (!BASE) {
    server = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split("?")[0]);
      const f = path.join(REPO, p === "/" ? "index.html" : p.slice(1));
      try {
        const body = fs.readFileSync(f);
        const ext = path.extname(f);
        const mime = { ".html": "text/html", ".js": "application/javascript",
          ".json": "application/json", ".css": "text/css", ".svg": "image/svg+xml" }[ext] || "application/octet-stream";
        res.setHeader("content-type", mime); res.end(body);
      } catch (e) { res.statusCode = 404; res.end("not found"); }
    }).listen(PORT);
  }
  const { chromium } = resolvePlaywright();
  const browser = await chromium.launch({ executablePath: chromiumPath(),
    args: ["--no-proxy-server", "--no-sandbox", "--disable-dev-shm-usage"] });

  const violations = [];
  async function page(pathAndQuery, opts = {}) {
    const pg = await browser.newPage({ viewport: opts.viewport || { width: 1280, height: 950 } });
    pg.on("pageerror", (e) => violations.push("pageerror: " + e.message));
    const reqs = [];
    pg.requestsMade = () => reqs.slice();
    await pg.route("**/*", (route) => {
      const u = route.request().url();
      reqs.push(u);
      let pathname = null; try { pathname = new URL(u).pathname; } catch (e) {}
      // the pinned content plane: same-origin /content/fallback.json is answered by the harness
      if (u.startsWith(origin) && pathname === CONTENT_PATH) {
        const body = contentBody(opts);
        if (body == null) return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
        return route.fulfill({ contentType: "application/json", body });
      }
      // the pinned API plane (R3): the derived status-API base, answered from goldens or refused
      if (apiBase && (u === apiBase || u.startsWith(apiBase + "/"))) {
        if (opts.api === null) return route.abort("connectionrefused"); // network error
        if (opts.api === "hang") return; // never answered: the client's own timeout must fire
        if (opts.api && typeof opts.api === "object" && Number.isInteger(opts.api.status)) {
          return route.fulfill({ status: opts.api.status, contentType: "application/json", headers: API_CORS, body: '{"detail":"simulated"}' });
        }
        if (opts.api === "invalid" && API_INVALID[pathname]) {
          return route.fulfill({ contentType: "application/json", headers: API_CORS, body: API_INVALID[pathname] });
        }
        const f = API_FIXTURES[pathname];
        if (!f) return route.fulfill({ status: 404, contentType: "application/json", headers: API_CORS, body: '{"detail":"not found"}' });
        return route.fulfill({ contentType: "application/json", headers: API_CORS,
          body: fs.readFileSync(path.join(REPO, "acceptance", "golden", f)) });
      }
      if (u.startsWith(origin) || u.startsWith("data:")) return route.fallback();
      const key = u.replace("https://unpkg.com/", "");
      if (u.startsWith("https://unpkg.com/") && CDN_MIRROR[key]) {
        const local = path.join(MIRROR_ROOT, CDN_MIRROR[key]);
        if (fs.existsSync(local)) return route.fulfill({ body: fs.readFileSync(local), contentType: "application/javascript" });
        return route.fallback(); // online CI: let it hit the real pinned URL
      }
      if (u.startsWith("https://unpkg.com/")) { violations.push("unpinned CDN request: " + u); return route.abort(); }
      violations.push("EGRESS VIOLATION: " + u); // anything else external is a contract breach
      return route.abort();
    });
    await pg.goto(origin + pathAndQuery, { waitUntil: "commit", timeout: 20000 });
    await pg.waitForTimeout(opts.settleMs || 9000); // the bundled site idles early; the 9 s also covers the client's 6 s API timeout ("hang")
    return pg;
  }
  async function close() { await browser.close(); if (server) server.close(); }
  return { page, close, violations, origin, apiBase };
}

module.exports = { launch, REPO, apiBaseOf };
