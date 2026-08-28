// Split crisis-atlas data (DR-014 item 3; rulings Q1 + Q5). The former src/data/atlas.json is now
// two artifacts: atlas-frozen.json — the golden-hashed numeric perimeter (verify/golden/
// data-hash.json covers its raw bytes; series labels split into {name, verdict} per Q5) — and
// atlas-prose.json — the movable science prose (crisis cause/highlight/sources, matrix notes,
// classification items) keyed by the a1-ledger's atlas.* slugs, outside the golden hash and bound
// for the content pipeline (bubblegauge content API + same-origin fallback artifact).
// assembleAtlas() (src/data/assemble.ts — shared with verify/lib/load.js and the split script's
// round-trip proof) reattaches the prose and rejoins the labels, so this module exposes the SAME
// exports as before the split and the dashboard view code is unchanged. The split was proven
// lossless at generation time (scripts/split-atlas.js aborts on any round-trip mismatch), and
// verify/tests/20-golden-content re-proves reassembly faithfulness on every build.
import frozen from "./data/atlas-frozen.json";
import prose from "./data/atlas-prose.json";
import { assembleAtlas } from "./data/assemble";

type Dict<T = any> = { [k: string]: T };
export interface Crisis { id: string; name: string; years: string; cat: string; weight: number; potential?: boolean; series: any[]; [k: string]: any; }

const atlas: Dict = assembleAtlas(frozen as any, prose as any);

export const CRISES: Crisis[] = atlas.CRISES;
export const MATRIX: any[] = atlas.MATRIX;
export const MX_CRISES: string[] = atlas.MX_CRISES;
export const CLASSIFICATION: any[] = atlas.CLASSIFICATION;
export const CAT: Dict = atlas.CAT;
export const CLS: Dict = atlas.CLS;
