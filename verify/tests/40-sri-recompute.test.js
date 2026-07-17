"use strict";
// SRI recompute check (mandate S3 + supply-chain provenance). Post compiled-ahead (DR-006) the
// vendors are self-hosted under ./vendor/, so this is now fully OFFLINE and DETERMINISTIC: it
// re-derives the sha384 of each committed vendor file and asserts it matches BOTH the integrity
// attribute in index.html AND the recorded vendor-pins manifest. A vendor byte-drift (a swapped or
// tampered library) fails the build with no network dependency — strictly stronger than the old
// online unpkg fetch (which self-labelled OFFLINE in sandboxed CI). This is the standing control
// for supply-chain byte integrity of the served runtime.
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { raw, REPO } = require("../lib/load.js");
const { ok } = require("../lib/assert.js");

module.exports = function register(t) {
  const html = raw("index.html");
  const vendorPins = JSON.parse(fs.readFileSync(path.join(__dirname, "..", "golden", "vendor-pins.json"), "utf8"));

  t("index.html declares SRI for exactly the 4 self-hosted vendor scripts", () => {
    const tags = html.match(/<script\s+src="\.\/vendor\/[^"]+"\s+integrity="sha384-[^"]+"><\/script>/g) || [];
    ok(tags.length === 4, `expected 4 SRI'd vendor scripts, got ${tags.length}`);
  });

  for (const c of vendorPins.components) {
    t(`vendor sha384 matches index.html + manifest (offline): ${c.file}`, () => {
      const buf = fs.readFileSync(path.join(REPO, c.file));
      const digest = "sha384-" + crypto.createHash("sha384").update(buf).digest("base64");
      ok(digest === c.integrity, `manifest drift for ${c.file}: manifest ${c.integrity}, bytes ${digest}`);
      ok(html.includes('integrity="' + digest + '"'), `index.html SRI for ${c.name} does not match the vendor bytes`);
    });
  }
};
