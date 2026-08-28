"use strict";
// Golden characterization test (mandate S3 + S11 ratchet), re-baselined by the DR-014 atlas split
// (item 3; rulings Q1 + Q5). The frozen perimeter is src/data/atlas-frozen.json ONLY — numeric
// series anchors/months, weights, CAT/CLS domains, MX_CRISES headers, structural headings, and
// the series labels split into {name, verdict}. Its RAW BYTES are hashed against
// verify/golden/data-hash.json: change a number and this goes RED, forcing an intentional
// re-baseline via a decision record — the same "don't silently change the numbers" guarantee as
// before the split. The movable science prose (crisis cause/highlight/sources, matrix notes,
// classification items) lives in src/data/atlas-prose.json keyed by the a1-ledger's atlas.* slugs,
// OUTSIDE the golden hash — it is bound for the content pipeline (bubblegauge content API +
// same-origin fallback). Companion assertions keep the split honest: no prose may creep back into
// the frozen perimeter, the prose inventory may be re-homed but never silently shrunk (DR-014
// item 4), and the runtime reassembly (src/data/assemble.ts, shared by src/data.ts and this
// harness) provably reattaches every piece — so the dashboard renders exactly what it rendered
// before the split.
const fs = require("fs");
const path = require("path");
const { loadDashboard, raw, transpile } = require("../lib/load.js");
const { sha256, eq, ok } = require("../lib/assert.js");

const FROZEN_REL = "src/data/atlas-frozen.json";
const PROSE_REL = "src/data/atlas-prose.json";

// The prose inventory at the split (a1-ledger): 11 crises x {cause, highlight, sources} = 33,
// 35 matrix notes, 17 classification items. Re-homing to the content pipeline lands as a
// deliberate edit here; silent shrinkage fails.
const PROSE_SLUG_COUNT = 85;
const MATRIX_NOTE_COUNT = 35;
const CLASSIFICATION_ITEM_COUNT = 17;

function loadAssembleModule() {
  const mod = { exports: {} };
  // eslint-disable-next-line no-new-func
  new Function("module", "exports", transpile(raw("src/data/assemble.ts")))(mod, mod.exports);
  return mod.exports;
}

module.exports = function register(t) {
  const goldenPath = path.resolve(__dirname, "..", "golden", "data-hash.json");

  t("frozen atlas artifact matches the recorded golden hash (covers atlas-frozen.json ONLY)", () => {
    ok(fs.existsSync(goldenPath), "golden baseline exists (verify/golden/data-hash.json)");
    const hash = sha256(raw(FROZEN_REL));
    const golden = JSON.parse(fs.readFileSync(goldenPath, "utf8"));
    eq(hash, golden.data_hash,
      "frozen atlas hash changed. If intentional: regenerate via `node scripts/split-atlas.js --write-golden` AND file a decision record (audit/decisions/). If not: a number was silently altered — revert.");
  });

  t("the frozen perimeter carries no movable prose (the split stays clean)", () => {
    const frozen = JSON.parse(raw(FROZEN_REL));
    for (const c of frozen.CRISES) {
      for (const k of ["cause", "highlight", "sources"]) {
        ok(!(k in c), `frozen crisis ${c.id} must not carry '${k}' — prose lives in atlas-prose.json (DR-014 item 3)`);
      }
      for (const s of c.series) {
        ok(typeof s.name === "string" && s.name.length > 0, `split series has a non-empty name: ${c.id}/${s.key}`);
        ok(!("label" in s), `frozen series ${c.id}/${s.key} must carry {name, verdict}, not a joined label (Q5)`);
        if ("verdict" in s) ok(typeof s.verdict === "string" && s.verdict.length > 0, `verdict, when present, is a non-empty string: ${c.id}/${s.key}`);
      }
    }
    for (const row of frozen.MATRIX) ok(!("notes" in row), `frozen MATRIX row '${row.name}' must not carry notes`);
    for (const b of frozen.CLASSIFICATION) ok(!("items" in b), `frozen CLASSIFICATION bucket '${b.title}' must not carry items`);
  });

  t("atlas-prose.json: every entry is a non-empty string under a well-formed ledger slug; inventory pinned", () => {
    const prose = JSON.parse(raw(PROSE_REL));
    const slugs = Object.keys(prose);
    for (const slug of slugs) {
      ok(/^atlas\.(crises|matrix|classification)\.[a-z0-9]+\.[a-z0-9]+$/.test(slug), `well-formed a1-ledger atlas.* slug: ${slug}`);
      ok(typeof prose[slug] === "string" && prose[slug].trim().length > 0, `non-empty prose: ${slug}`);
    }
    eq(slugs.length, PROSE_SLUG_COUNT,
      "prose slug inventory changed (33 crisis cause/highlight/sources + 35 matrix notes + 17 classification items). Re-homing to the content pipeline is a deliberate edit here + a decision record; dropping claim text is a finding (DR-014 item 4).");
  });

  t("reassembly is faithful: runtime exports reattach every prose piece and rejoin every label", () => {
    const d = loadDashboard();
    const frozen = JSON.parse(raw(FROZEN_REL));
    const prose = JSON.parse(raw(PROSE_REL));
    const A = loadAssembleModule();

    // crisis prose reattached verbatim under its slug
    for (const c of d.CRISES) {
      for (const k of ["cause", "highlight", "sources"]) {
        eq(c[k], prose[`atlas.crises.${c.id}.${k}`], `reassembled ${c.id}.${k} equals its ledger slug's text`);
      }
    }

    // labels rejoined exactly: name (+ " " + verdict) per Q5
    frozen.CRISES.forEach((fc, i) => {
      fc.series.forEach((s, j) => {
        eq(d.CRISES[i].series[j].label, A.joinLabel(s.name, s.verdict), `label join: ${fc.id}/${s.key}`);
        ok(!("name" in d.CRISES[i].series[j]) && !("verdict" in d.CRISES[i].series[j]),
          `reassembled series exposes label only (pre-split shape): ${fc.id}/${s.key}`);
      });
    });

    // every matrix cell agrees with its slug in BOTH directions (present <-> present, verbatim)
    let notes = 0;
    d.MATRIX.forEach((row, ri) => {
      A.MATRIX_COL_SLUGS.forEach((col, ci) => {
        const slug = `atlas.matrix.${A.MATRIX_ROW_SLUGS[ri]}.${col}`;
        eq(row.notes[String(ci)], prose[slug], `matrix note cell == slug: ${slug}`);
        if (slug in prose) notes++;
      });
    });
    eq(notes, MATRIX_NOTE_COUNT, "all matrix notes reattached");

    // classification items reattached in order, none dropped
    let items = 0;
    d.CLASSIFICATION.forEach((b, bi) => {
      b.items.forEach((item, i) => {
        eq(item, prose[`atlas.classification.${A.CLASSIFICATION_BUCKET_SLUGS[bi]}.${i}`], `classification item == slug: ${A.CLASSIFICATION_BUCKET_SLUGS[bi]}.${i}`);
        items++;
      });
    });
    eq(items, CLASSIFICATION_ITEM_COUNT, "all classification items reattached");
  });
};
