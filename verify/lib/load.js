"use strict";
// Load a browser-global .jsx file's DATA and PURE FUNCTIONS into Node for testing,
// without introducing a build step to the served site. esbuild strips JSX (dev-only,
// CI-only dependency); the transpiled code runs under stub globals so no DOM/network
// is touched and no component is rendered. This is the substrate for the data-invariant
// and math characterization tests (mandate S3: executable proof over inspection).
const fs = require("fs");
const path = require("path");

// Repo root under test. Overridable (BG_REPO) so the harness can be pointed at a seeded
// copy for calibration (mandate Phase 2 / S12) — the same harness that gates also measures
// its own catch rate against the defect corpus.
const REPO = process.env.BG_REPO ? path.resolve(process.env.BG_REPO) : path.resolve(__dirname, "..", "..");

function stubGlobals() {
  const proxy = new Proxy({}, { get: (_, k) => (typeof k === "string" ? k : undefined) });
  const React = {
    createElement: () => ({}),
    Fragment: "Fragment",
    useState: (x) => [typeof x === "function" ? x() : x, () => {}],
    useMemo: (f) => f(),
    useEffect: () => {},
    useRef: () => ({ current: null }),
  };
  const ReactDOM = { createRoot: () => ({ render: () => {} }) };
  const store = {};
  const sessionStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
  };
  const location = { href: "https://<prod-host>/", hostname: "<prod-host>", search: "" };
  const win = { location, sessionStorage, addEventListener: () => {}, BubbleGauge: undefined };
  return { React, ReactDOM, Recharts: proxy, window: win, sessionStorage, location,
           document: { getElementById: () => null, addEventListener: () => {} },
           fetch: () => Promise.reject(new Error("no network in harness")),
           AbortController: function () { this.signal = {}; this.abort = () => {}; },
           setTimeout: () => 0, clearTimeout: () => {}, URL };
}

function transpile(code) {
  const esbuild = require("esbuild");
  return esbuild.transformSync(code, { loader: "jsx", format: "cjs", target: "node16" }).code;
}

// Load dashboard.jsx and return its data constants + pure functions.
function loadDashboard() {
  return loadDashboardFromSource(fs.readFileSync(path.join(REPO, "dashboard.jsx"), "utf8"));
}

// Load from an explicit source string (used by the mutation harness to test mutants).
function loadDashboardFromSource(src) {
  const js = transpile(src);
  const capture = "\nreturn {CRISES, CAT, CLS, MATRIX, MX_CRISES, CLASSIFICATION, interp, rebase, fmtM, logPath, ser, zArr, corrArr, xcorrRow, mulberry32, runFan, subFamily, buildAggregate, TABS};\n";
  const g = stubGlobals();
  const keys = Object.keys(g);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, "module", "exports", js + capture);
  const mod = { exports: {} };
  return fn(...keys.map((k) => g[k]), mod, mod.exports);
}

// Read a file's raw text (for static/regex checks).
function raw(rel) {
  return fs.readFileSync(path.join(REPO, rel), "utf8");
}

function dashboardSource() { return fs.readFileSync(path.join(REPO, "dashboard.jsx"), "utf8"); }
module.exports = { loadDashboard, loadDashboardFromSource, dashboardSource, raw, transpile, REPO };
