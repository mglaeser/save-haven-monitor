"use strict";
// Compiled-ahead build (DR-006). Transpiles the two served JSX sources to plain JS with the
// PINNED esbuild the verify harness already runs (0.19.12) — transpile only, classic React
// runtime, NO bundling, NO minification, NO renaming, so the output is a byte-deterministic
// function of the source. This runs in CI (verify.yml/deploy.yml) and locally; it replaces the
// ~3 MB in-browser Babel with a one-time CI step. The served artifact loads ./vendor/* (self-hosted,
// SRI, no unpkg) + ./bubblegauge.js + ./dashboard.js.
//
// Scope fidelity: Babel executed each `text/babel` script in its own eval scope. bubblegauge.jsx is
// already a top-level IIFE (stays self-scoped). dashboard.jsx is NOT, so its output is wrapped in an
// IIFE — reproducing the original execution scope exactly (its 51 top-level decls do not leak to the
// global lexical scope, and it still reads window.BubbleGauge and mounts via ReactDOM.createRoot).
const fs = require("fs");
const path = require("path");
const esbuild = require(path.join(__dirname, "verify", "node_modules", "esbuild"));

const OUT = process.argv.includes("--dist") ? path.join(__dirname, "dist") : __dirname;

function transpile(file) {
  const src = fs.readFileSync(path.join(__dirname, file), "utf8");
  return esbuild.transformSync(src, {
    loader: "jsx",
    jsx: "transform",
    jsxFactory: "React.createElement",
    jsxFragment: "React.Fragment",
    target: "es2020",
    minify: false,
    charset: "utf8",
  }).code;
}

function build() {
  fs.mkdirSync(OUT, { recursive: true });
  // bubblegauge: already an IIFE — emit as-is (transpiled).
  fs.writeFileSync(path.join(OUT, "bubblegauge.js"), transpile("bubblegauge.jsx"));
  // dashboard: wrap in an IIFE to preserve the original per-script eval scope.
  fs.writeFileSync(path.join(OUT, "dashboard.js"),
    "(function () {\n" + transpile("dashboard.jsx") + "\n})();\n");
  if (OUT !== __dirname) {
    // --dist: assemble the exact published set (served-file allowlist) — no .jsx source, no repo internals.
    for (const f of ["index.html", ".nojekyll", "CNAME"]) fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f));
    fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });
    for (const f of fs.readdirSync(path.join(__dirname, "vendor"))) fs.copyFileSync(path.join(__dirname, "vendor", f), path.join(OUT, "vendor", f));
  }
  console.log("built:", OUT === __dirname ? "dashboard.js, bubblegauge.js (repo root)" : "dist/ (published allowlist)");
}

build();
