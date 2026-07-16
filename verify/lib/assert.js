"use strict";
// Minimal deterministic assertion + test registry. No framework (keeps the CI-only
// footprint tiny). A test that throws fails; the runner aggregates and sets exit code.
const crypto = require("crypto");

function eq(actual, expected, msg) {
  if (actual !== expected) throw new Error((msg || "eq") + `: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}
function ok(cond, msg) { if (!cond) throw new Error(msg || "expected truthy"); }
function near(actual, expected, tol, msg) {
  if (Math.abs(actual - expected) > tol) throw new Error((msg || "near") + `: expected ${expected}±${tol}, got ${actual}`);
}
function throws(fn, msg) {
  let threw = false;
  try { fn(); } catch (e) { threw = true; }
  if (!threw) throw new Error(msg || "expected throw");
}
function sha256(x) { return crypto.createHash("sha256").update(typeof x === "string" ? x : JSON.stringify(x)).digest("hex"); }

module.exports = { eq, ok, near, throws, sha256 };
