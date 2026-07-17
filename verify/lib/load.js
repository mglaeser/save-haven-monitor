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
  const location = { href: "https://crash.example.com/", hostname: "crash.example.com", search: "" };
  const win = { location, sessionStorage, addEventListener: () => {}, BubbleGauge: undefined };
  return { React, ReactDOM, Recharts: proxy, window: win, sessionStorage, location,
           document: { getElementById: () => null, addEventListener: () => {} },
           fetch: () => Promise.reject(new Error("no network in harness")),
           AbortController: function () { this.signal = {}; this.abort = () => {}; },
           setTimeout: () => 0, clearTimeout: () => {}, URL };
}

function transpile(code) {
  const esbuild = require("esbuild");
  // src is now TypeScript/TSX (the module migration); strip types + JSX to CJS.
  return esbuild.transformSync(code, { loader: "tsx", format: "cjs", target: "node16" }).code;
}

const DASH_SRC = "src/dashboard.tsx";
const MATH_SRC = "src/lib/math.ts";
const ATLAS = "src/data/atlas.json";

// The frozen data lives in src/data/atlas.json (extracted from the old dashboard.jsx literals; the
// golden hash is unchanged — proven). The pure math lives in src/lib/math.ts. loadDashboardFromSource
// evaluates a MATH source string with the data injected as scope globals and captures the pure
// functions — keeping the SAME returned interface every consumer (10/20-tests, mutation, adapter)
// relies on. mutation.js mutates the math source (dashboardSource()).
function dataGlobals() {
  const a = JSON.parse(fs.readFileSync(path.join(REPO, ATLAS), "utf8"));
  return { CRISES: a.CRISES, MATRIX: a.MATRIX, MX_CRISES: a.MX_CRISES, CLASSIFICATION: a.CLASSIFICATION, CAT: a.CAT, CLS: a.CLS };
}

// TABS is a tiny static literal in the view module; extract + eval it (used by 10-data-invariants).
function loadTabs() {
  const src = fs.readFileSync(path.join(REPO, DASH_SRC), "utf8");
  const m = src.match(/const TABS\s*=\s*(\[[\s\S]*?\]);/);
  if (!m) throw new Error("TABS literal not found in " + DASH_SRC);
  // eslint-disable-next-line no-new-func
  return new Function("return (" + m[1] + ");")();
}

// Load the frozen data + pure math + TABS, returning the historical interface.
function loadDashboard() {
  const out = loadDashboardFromSource(fs.readFileSync(path.join(REPO, MATH_SRC), "utf8"));
  out.TABS = loadTabs();
  return out;
}

// Load from an explicit MATH source string (used by the mutation harness to test mutants).
function loadDashboardFromSource(mathSrc) {
  // Remove the `import { … } from "../data";` line — the data is injected as globals below.
  const stripped = mathSrc.replace(/^\s*import\s*\{[^}]*\}\s*from\s*["']\.\.\/data["'];?\s*$/m, "");
  const js = transpile(stripped);
  const capture = "\nreturn {CRISES, CAT, CLS, MATRIX, MX_CRISES, CLASSIFICATION, interp, rebase, fmtM, logPath, ser, zArr, corrArr, xcorrRow, mulberry32, runFan, subFamily, buildAggregate};\n";
  const g = Object.assign(stubGlobals(), dataGlobals());
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

// The source the mutation harness perturbs (the pure math).
function dashboardSource() { return fs.readFileSync(path.join(REPO, MATH_SRC), "utf8"); }
module.exports = { loadDashboard, loadDashboardFromSource, dashboardSource, raw, transpile, REPO };
