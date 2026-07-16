"use strict";
// SRI recompute check (mandate S3 + supply-chain provenance). Re-derives the sha384 of
// each pinned CDN dependency from the bytes the harness fetches from unpkg and asserts it
// matches the integrity attribute in index.html. Offline fallback: if the network is
// unreachable (sandbox/CI without egress), it self-labels NO-EVIDENCE-OFFLINE and the
// gate treats it per policy (does not silently pass). This is the standing control for
// B-04/B-27-analog: the pinned dependency's bytes cannot drift from the recorded hash
// without this test going red.
const https = require("https");
const crypto = require("crypto");
const { raw } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

function fetchBuf(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        res.resume(); return fetchBuf(res.headers.location, timeoutMs).then(resolve, reject);
      }
      if (res.statusCode !== 200) { res.resume(); return reject(new Error("HTTP " + res.statusCode)); }
      const chunks = [];
      res.on("data", (c) => chunks.push(c));
      res.on("end", () => resolve(Buffer.concat(chunks)));
    });
    req.setTimeout(timeoutMs, () => req.destroy(new Error("timeout")));
    req.on("error", reject);
  });
}

module.exports = function register(t) {
  const html = raw("index.html");
  const re = /<script\s+src="(https:\/\/[^"]+)"\s+integrity="(sha384-[^"]+)"/g;
  const deps = [];
  let m;
  while ((m = re.exec(html))) deps.push({ url: m[1], integrity: m[2] });

  t("index.html declares SRI for exactly the 5 pinned deps", () => {
    ok(deps.length === 5, `expected 5 SRI'd deps, got ${deps.length}`);
  });

  for (const dep of deps) {
    t(`SRI matches fetched bytes: ${dep.url.replace("https://unpkg.com/", "")}`, async () => {
      let buf;
      try {
        buf = await fetchBuf(dep.url, 15000);
      } catch (e) {
        // Egress blocked (proxy/sandbox). Do not pass silently; signal offline so the
        // runner records NO-EVIDENCE-OFFLINE (banded, per Rule 3) rather than green.
        const err = new Error("NO-EVIDENCE-OFFLINE: could not fetch " + dep.url + " (" + e.message + ")");
        err.offline = true;
        throw err;
      }
      const digest = "sha384-" + crypto.createHash("sha384").update(buf).digest("base64");
      ok(digest === dep.integrity, `hash mismatch for ${dep.url}: index.html has ${dep.integrity}, bytes are ${digest}`);
    });
  }
};
