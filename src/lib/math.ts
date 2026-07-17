// Pure crisis-atlas math (extracted byte-preserving from src/dashboard.tsx). Deterministic;
// mutation-tested (verify/mutation.js targets these) and golden-value characterized. Imports only
// the frozen data. Types are added in a follow-up; bodies are unchanged (mutation find-strings intact).
import { CRISES } from "../data";

type Anchor = [number, number];

export function interp(anchors: Anchor[]): number[] {
  const out: number[] = [];
  for (let m = -60; m <= 60; m++) {
    if (m <= anchors[0][0]) { out.push(anchors[0][1]); continue; }
    if (m >= anchors[anchors.length - 1][0]) { out.push(anchors[anchors.length - 1][1]); continue; }
    let i = 0;
    while (anchors[i + 1][0] < m) i++;
    const [m0, v0] = anchors[i], [m1, v1] = anchors[i + 1];
    out.push(v0 + ((v1 - v0) * (m - m0)) / (m1 - m0));
  }
  return out;
}
export const rebase = (vals: number[], baseMonth: number): number[] => {
  const f = 100 / vals[baseMonth + 60];
  return vals.map((v) => v * f);
};
export const fmtM = (m: number): string => (m === 0 ? "Crisis peak · t0" : `t${m > 0 ? "+" : "−"}${Math.abs(m)} mo`);

/* ---------- analytics helpers (in-browser recomputation of the Python battery) ---------- */

export const logPath = (vals: number[]): number[] => vals.map((v) => Math.log(v));
export const ser = (id: string, key: string): Anchor[] => CRISES.find((c) => c.id === id).series.find((s) => s.key === key).a;
export function zArr(a: number[]): number[] {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 1;
  return a.map((x) => (x - m) / sd);
}
export function corrArr(a: number[], b: number[]): number {
  const za = zArr(a), zb = zArr(b);
  let s = 0;
  for (let i = 0; i < a.length; i++) s += za[i] * zb[i];
  return s / a.length;
}
export function xcorrRow(curLog: number[], histLog: number[], K: number) {
  const rows: { p: number; r: number }[] = [];
  const cw = zArr(curLog.slice(61 - K, 61));
  for (let p = -30; p <= 6; p++) {
    const e = p + 60, st = e - K + 1;
    if (st < 0 || e > 120) continue;
    rows.push({ p, r: +corrArr(cw, zArr(histLog.slice(st, e + 1))).toFixed(3) });
  }
  return rows;
}
export function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export function runFan(specs: [string, string][], seed: number, sims = 1500, block = 6, H = 60) {
  const rets = specs.map(([id, key]) => {
    const lp = logPath(rebase(interp(ser(id, key)), 0));
    const r = [];
    for (let i = 60; i < 60 + H; i++) r.push(lp[i + 1] - lp[i]);
    return r;
  });
  const rnd = mulberry32(seed);
  const cols: number[][] = Array.from({ length: H + 1 }, () => [] as number[]);
  const mdds: number[] = [], p36s: number[] = [];
  for (let s = 0; s < sims; s++) {
    let v = Math.log(100), mn = 100;
    cols[0].push(100);
    const seq: number[] = [];
    while (seq.length < H) {
      const r = rets[Math.floor(rnd() * rets.length)];
      const st = Math.floor(rnd() * (r.length - block + 1));
      for (let k = 0; k < block; k++) seq.push(r[st + k]);
    }
    for (let i = 0; i < H; i++) {
      v += seq[i];
      const ev = Math.exp(v);
      cols[i + 1].push(ev);
      if (ev < mn) mn = ev;
      if (i + 1 === 36) p36s.push(ev);
    }
    mdds.push(mn / 100 - 1);
  }
  const q = (arr: number[], f: number) => { const a = [...arr].sort((x, y) => x - y); return a[Math.min(a.length - 1, Math.floor(f * a.length))]; };
  const rows = cols.map((c, m) => ({ m, b80: [q(c, 0.10), q(c, 0.90)], b50: [q(c, 0.25), q(c, 0.75)], med: q(c, 0.50) }));
  return { rows, stats: { mdd: q(mdds, 0.5), mddLo: q(mdds, 0.25), mddHi: q(mdds, 0.75), below36: p36s.filter((x) => x < 100).length / p36s.length, med36: q(p36s, 0.5), lo36: q(p36s, 0.10), hi36: q(p36s, 0.90) } };
}

/* ---------- composite (aggregate tab), computed at t0 = 100 ---------- */

export function subFamily(s: any): string | null {
  // Sub-family assignment for the aggregate view (finer than cls)
  if (s.cls === "market") return "market";
  if (s.cls === "falsified") return null;
  if (s.cls === "unique") return "unique";
  if (s.cls === "universal") {
    if (s.key === "cash") return "cash";            // Phase 1 · liquidity
    if (s.key === "cta" || s.key === "vol" || s.key === "puts") return "convex"; // trend & long-vol
    return "bonds";                                   // Phase 2 · duration (UST, JGB, Bunds, long govt)
  }
  return "category";                                  // gold, FX, value, REITs, commodities, specie…
}

export function buildAggregate() {
  const classes = ["market", "cash", "bonds", "convex", "category", "unique", "gold"];
  const acc: Record<string, { num: number[]; den: number }> = {};
  classes.forEach((c) => (acc[c] = { num: Array(121).fill(0), den: 0 }));
  CRISES.forEach((cr) => {
    if (cr.potential) return; // potential crises have no post-peak outcome — kept out of historical composites
    const byClass: Record<string, number[][]> = {};
    cr.series.forEach((s) => {
      const fam = subFamily(s);
      const isGold = s.key === "au" || s.key === "aul";
      if (!fam && !isGold) return;
      const vals = rebase(interp(s.a), 0);
      if (fam) (byClass[fam] = byClass[fam] || []).push(vals);
      if (isGold) (byClass.gold = byClass.gold || []).push(vals);
    });
    classes.forEach((c) => {
      if (!byClass[c]) return;
      const n = byClass[c].length;
      const mean = Array(121).fill(0);
      byClass[c].forEach((v) => v.forEach((x, i) => (mean[i] += x / n)));
      mean.forEach((x, i) => (acc[c].num[i] += x * cr.weight));
      acc[c].den += cr.weight;
    });
  });
  return Array.from({ length: 121 }, (_, i) => {
    const o: Record<string, number | null> = { m: i - 60 };
    classes.forEach((c) => (o[c] = acc[c].den ? +(acc[c].num[i] / acc[c].den).toFixed(1) : null));
    return o;
  });
}
