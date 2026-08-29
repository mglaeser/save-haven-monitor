// Atlas reassembly (DR-014 item 3; rulings Q1 + Q5). The crisis atlas ships as two artifacts:
//   src/data/atlas-frozen.json — the golden-hashed numeric perimeter (series anchors/months,
//     weights, category/class domains, structural headings, and series labels SPLIT into
//     {name, verdict} per Q5 — the static instrument half and the ledger-designated verdict
//     suffix, kept as separable fields so the suffix can later be re-homed as a content
//     fragment without touching the instrument names);
//   src/data/atlas-prose.json — the movable science prose (crisis cause/highlight/sources,
//     matrix notes, classification items), a flat map keyed by the a1-ledger's atlas.* slugs,
//     OUTSIDE the golden hash and bound for the content pipeline (bubblegauge content API +
//     same-origin fallback artifact).
// assembleAtlas() deterministically reattaches the prose and rejoins the labels, reproducing the
// exact pre-split runtime exports — the dashboard view code is unchanged by the split. It is the
// SINGLE reassembly implementation: src/data.ts (the served bundle), verify/lib/load.js (the test
// harness), and scripts/split-atlas.js (the one-shot migration's round-trip proof) all call it,
// so served and verified reassembly can never diverge. Fail-closed: a missing prose slug throws
// rather than rendering grounded content with silently absent science text.
// No imports — this module must stay evaluable standalone (the harness transpiles + evals it).

type Dict<T = any> = { [k: string]: T };

// Slug tables (code, not content): the a1-ledger's naming for MATRIX rows (13, in row order),
// matrix columns (11, in MX_CRISES order — LTCM has no crisis entry but owns column 5), and
// CLASSIFICATION buckets (4, in bucket order: tags U, C, star, !).
export const MATRIX_ROW_SLUGS: string[] = [
  "gold", "bonds", "cash", "jpy", "chf", "usd", "commodities",
  "oil", "value", "quality", "trend", "vol", "btc",
];
export const MATRIX_COL_SLUGS: string[] = [
  "depression", "stagflation", "japan", "blackmonday", "asia", "ltcm",
  "dotcom", "gfc", "euro", "covid", "ai2026",
];
export const CLASSIFICATION_BUCKET_SLUGS: string[] = [
  "universal", "category", "unique", "falsified",
];

// Q5 label join: the verdict suffix carries its own punctuation ("— challenged", "(risk asset)"),
// so the join is always a single space. splitting and joining are exact inverses.
export function joinLabel(name: string, verdict?: string): string {
  return verdict ? name + " " + verdict : name;
}

export function assembleAtlas(frozen: Dict, prose: Dict<string>): Dict {
  const p = (slug: string): string => {
    const v = prose[slug];
    if (typeof v !== "string" || v.length === 0) throw new Error("atlas prose missing slug: " + slug);
    return v;
  };

  const CRISES: Dict[] = (frozen.CRISES as Dict[]).map((c: Dict) => ({
    ...c,
    series: (c.series as Dict[]).map((s: Dict) => {
      const { name, verdict, ...rest } = s as { name: string; verdict?: string; [k: string]: any };
      return { ...rest, label: joinLabel(name, verdict) };
    }),
    cause: p("atlas.crises." + c.id + ".cause"),
    highlight: p("atlas.crises." + c.id + ".highlight"),
    sources: p("atlas.crises." + c.id + ".sources"),
  }));

  const MATRIX: Dict[] = (frozen.MATRIX as Dict[]).map((row: Dict, ri: number) => {
    const notes: Dict<string> = {};
    MATRIX_COL_SLUGS.forEach((col: string, ci: number) => {
      const v = prose["atlas.matrix." + MATRIX_ROW_SLUGS[ri] + "." + col];
      if (typeof v === "string") notes[String(ci)] = v;
    });
    return { ...row, notes };
  });

  const CLASSIFICATION: Dict[] = (frozen.CLASSIFICATION as Dict[]).map((b: Dict, bi: number) => {
    const bucket = CLASSIFICATION_BUCKET_SLUGS[bi];
    const items: string[] = [];
    for (let i = 0; ; i++) {
      const v = prose["atlas.classification." + bucket + "." + i];
      if (typeof v !== "string") break;
      items.push(v);
    }
    if (items.length === 0) throw new Error("atlas prose has no items for classification bucket: " + bucket);
    return { ...b, items };
  });

  return {
    CRISES,
    MATRIX,
    MX_CRISES: frozen.MX_CRISES,
    CLASSIFICATION,
    CAT: frozen.CAT,
    CLS: frozen.CLS,
  };
}
