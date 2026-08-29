"use strict";
// Acceptance-suite harness — implementation-AGNOSTIC by construction. It serves the repo root
// (or ACCEPT_BASE_URL if given), launches headless Chromium, and enforces the egress contract:
// every request must be same-origin, an allowlisted CDN asset (fulfilled from local mirrors when
// available so the suite runs offline), or the gated status-API in demo mode (which makes no
// network call at all). Anything else fails the run — the egress allowlist is part of the parity
// contract, not an implementation detail.
//
// Re-freeze R2 (DR-014 item 1): the harness additionally PINS the content plane. It serves the
// frozen fixture golden/content-fallback.fixture.json at /content/fallback.json — the local,
// hermetic stand-in for the deploy-generated dist/content/fallback.json artifact — on every page,
// including ACCEPT_BASE_URL runs (live-content drift is out of this parity contract's scope).
// Tests can override per page: opts.content = "<golden filename>" swaps the fixture (poison
// case), opts.content = null forces a 404 (outage case). Each page records its request ledger
// (pg.requestsMade()) so frozen tests can assert the R2 negative contract ("requests never leave
// the origin") and condition target-contract assertions on "the page consumed the content URL".
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

// Local mirrors for the (current) pinned CDN set. A self-hosting rewrite simply never requests
// these; the routing rule stays identical either way.
const MIRROR_ROOT = process.env.ACCEPT_MIRRORS || "/tmp/claude-0/-home-user-save-haven-monitor/05bfe1ea-1771-5f9e-bdc3-f2071c86a2c8/scratchpad/node_modules";
const CDN_MIRROR = {
  "react@18.3.1/umd/react.production.min.js": "/react/umd/react.production.min.js",
  "react-dom@18.3.1/umd/react-dom.production.min.js": "/react-dom/umd/react-dom.production.min.js",
  "prop-types@15.8.1/prop-types.min.js": "/prop-types/prop-types.min.js",
  "recharts@2.12.7/umd/Recharts.js": "/recharts/umd/Recharts.js",
  "@babel/standalone@7.29.7/babel.min.js": "/@babel/standalone/babel.min.js",
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
  if (!BASE) {
    server = http.createServer((req, res) => {
      const p = decodeURIComponent(req.url.split("?")[0]);
      const f = path.join(REPO, p === "/" ? "index.html" : p.slice(1));
      try {
        const body = fs.readFileSync(f);
        const ext = path.extname(f);
        const mime = { ".html": "text/html", ".js": "application/javascript", ".jsx": "text/babel",
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
      // the pinned content plane: same-origin /content/fallback.json is answered by the harness
      let pathname = null; try { pathname = new URL(u).pathname; } catch (e) {}
      if (u.startsWith(origin) && pathname === CONTENT_PATH) {
        const body = contentBody(opts);
        if (body == null) return route.fulfill({ status: 404, contentType: "text/plain", body: "not found" });
        return route.fulfill({ contentType: "application/json", body });
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
    await pg.waitForTimeout(opts.settleMs || 9000); // in-browser Babel needs time; a bundled rewrite just idles
    return pg;
  }
  async function close() { await browser.close(); if (server) server.close(); }
  return { page, close, violations, origin };
}

module.exports = { launch, REPO };
