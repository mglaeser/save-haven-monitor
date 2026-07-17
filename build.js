"use strict";
// Compiled-ahead build (DR-006 + module migration). Bundles the TypeScript/TSX sources under src/
// with the PINNED esbuild the verify harness runs (0.19.12): resolves the ./data JSON import and the
// module graph into two IIFE bundles (bubblegauge.js, dashboard.js) that run against the self-hosted
// global vendors (window.React / ReactDOM / Recharts). No in-browser Babel, no bundler config beyond
// this file. Deterministic: same sources -> byte-identical output (verify/tests/66-compiled-fresh).
//
// Scope fidelity: format 'iife' reproduces the original per-script eval scope (top-level decls stay
// module-local); bubblegauge sets window.BubbleGauge, dashboard reads it and mounts via ReactDOM.
const fs = require("fs");
const path = require("path");
const esbuild = require(path.join(__dirname, "verify", "node_modules", "esbuild"));

const OUT = process.argv.includes("--dist") ? path.join(__dirname, "dist") : __dirname;

const COMMON = {
  bundle: true,
  format: "iife",
  target: "es2020",
  jsx: "transform",
  jsxFactory: "React.createElement",
  jsxFragment: "React.Fragment",
  minify: false,
  charset: "utf8",
  legalComments: "none",
  logLevel: "warning",
};

function build() {
  fs.mkdirSync(OUT, { recursive: true });
  esbuild.buildSync({ ...COMMON, entryPoints: [path.join(__dirname, "src", "bubblegauge.tsx")], outfile: path.join(OUT, "bubblegauge.js") });
  esbuild.buildSync({ ...COMMON, entryPoints: [path.join(__dirname, "src", "dashboard.tsx")], outfile: path.join(OUT, "dashboard.js") });
  if (OUT !== __dirname) {
    // --dist: assemble the exact published set (served-file allowlist) — no src/, no repo internals.
    for (const f of ["index.html", ".nojekyll", "CNAME"]) fs.copyFileSync(path.join(__dirname, f), path.join(OUT, f));
    fs.mkdirSync(path.join(OUT, "vendor"), { recursive: true });
    for (const f of fs.readdirSync(path.join(__dirname, "vendor"))) fs.copyFileSync(path.join(__dirname, "vendor", f), path.join(OUT, "vendor", f));
  }
  console.log("built:", OUT === __dirname ? "dashboard.js, bubblegauge.js (repo root, bundled from src/)" : "dist/ (published allowlist)");
}

build();
