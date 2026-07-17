// Frozen crisis-atlas data (the golden-hashed research content), extracted from the former
// dashboard.jsx literals into a typed JSON artifact. The values are byte-preserved: the golden
// data hash (verify/golden/data-hash.json) is computed over exactly these objects and is unchanged.
// Types are intentionally permissive for now (a strict schema is an incremental follow-up).
import atlas from "./data/atlas.json";

type Dict<T = any> = { [k: string]: T };
export interface Crisis { id: string; name: string; years: string; cat: string; weight: number; potential?: boolean; series: any[]; [k: string]: any; }

export const CRISES: Crisis[] = (atlas as any).CRISES;
export const MATRIX: any[] = (atlas as any).MATRIX;
export const MX_CRISES: string[] = (atlas as any).MX_CRISES;
export const CLASSIFICATION: any[] = (atlas as any).CLASSIFICATION;
export const CAT: Dict = (atlas as any).CAT;
export const CLS: Dict = (atlas as any).CLS;
