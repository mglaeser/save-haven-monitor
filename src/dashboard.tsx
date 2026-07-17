import { CRISES, MATRIX, MX_CRISES, CLASSIFICATION, CAT, CLS } from "./data";
const { useState, useMemo } = React;
const { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
        ReferenceLine, ResponsiveContainer, Area, ComposedChart } = Recharts;

// Optional bubblegauge integration (bubblegauge.jsx loads first and sets this).
// When the ?status-api gate is absent it is { enabled: false } and nothing below changes.
const BG = (typeof window !== "undefined" && window.BubbleGauge) || { enabled: false };

/* ============================================================
   CRISIS WINNERS — Interactive Atlas
   All series are STYLIZED monthly reconstructions anchored to
   magnitudes documented in the peer-reviewed literature.
   Common relative scale: t−60 … t+60 months around crisis peak.
   ============================================================ */

/* CAT -> src/data.ts */

/* CLS -> src/data.ts */

/* ---------- data: anchor points [month, index value, base t−60 = 100] ---------- */

/* CRISES -> src/data.ts */

/* ---------- similarity matrix (2 = rose ✓, 1 = mixed ~, 0 = fell ✗, -1 = n/a) ---------- */

/* MX_CRISES -> src/data.ts */
/* MATRIX -> src/data.ts */

/* CLASSIFICATION -> src/data.ts */

/* ---------- helpers ---------- */

import { interp, rebase, fmtM, logPath, ser, zArr, corrArr, xcorrRow, mulberry32, runFan, subFamily, buildAggregate } from "./lib/math";

/* ---------- UI atoms ---------- */

const S = {
  page: { minHeight: "100vh", background: "#0E1526", color: "#EDE8DC", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  serif: { fontFamily: "Georgia, 'Times New Roman', serif" },
  panel: { background: "#141D31", border: "1px solid rgba(237,232,220,0.09)", borderRadius: 10 },
  eyebrow: { fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9AA3B5" },
};

function Chip({ active, onClick, children, color }) {
  return (
    <button onClick={onClick} style={{
      padding: "7px 12px", borderRadius: 999, cursor: "pointer", whiteSpace: "nowrap",
      border: `1px solid ${active ? (color || "#E0B458") : "rgba(237,232,220,0.16)"}`,
      background: active ? "rgba(224,180,88,0.12)" : "transparent",
      color: active ? "#EDE8DC" : "#9AA3B5", fontSize: 12.5, fontWeight: active ? 600 : 400,
    }}>{children}</button>
  );
}

function Seg({ options, value, onChange }) {
  return (
    <div style={{ display: "inline-flex", border: "1px solid rgba(237,232,220,0.16)", borderRadius: 7, overflow: "hidden" }}>
      {options.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} style={{
          padding: "5px 10px", fontSize: 11.5, cursor: "pointer", border: "none",
          background: value === o.v ? "#E0B458" : "transparent",
          color: value === o.v ? "#0E1526" : "#9AA3B5", fontWeight: 600,
        }}>{o.label}</button>
      ))}
    </div>
  );
}

function Expl({ children }) {
  // "i" info button: tap to expand a plain-language explainer. Place inside a
  // flex row with flexWrap:"wrap" — the box wraps onto its own full-width line.
  const [o, setO] = useState(false);
  return (
    <>
      <button onClick={() => setO(!o)} aria-label="What is this?" style={{
        width: 17, height: 17, minWidth: 17, borderRadius: 99, padding: 0, lineHeight: "14px",
        border: "1px solid #E0B458", background: o ? "#E0B458" : "transparent",
        color: o ? "#0E1526" : "#E0B458", fontSize: 10.5, fontWeight: 700, cursor: "pointer",
        fontFamily: "Georgia, serif", fontStyle: "italic",
      }}>i</button>
      {o && (
        <div style={{ flexBasis: "100%", width: "100%", margin: "6px 0 2px", padding: "9px 12px",
          background: "rgba(224,180,88,0.07)", border: "1px solid rgba(224,180,88,0.28)",
          borderRadius: 8, fontSize: 11.5, color: "#D9DCE4", lineHeight: 1.6 }}>
          {children}
        </div>
      )}
    </>
  );
}

const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length) return null;
  const rows = [...payload].filter((p) => p.value != null).sort((a, b) => b.value - a.value);
  if (!rows.length) return null;
  return (
    <div style={{ background: "#0B111F", border: "1px solid rgba(237,232,220,0.15)", borderRadius: 8, padding: "8px 11px", fontSize: 11.5, maxWidth: 250 }}>
      <div style={{ color: "#9AA3B5", marginBottom: 5, fontWeight: 600 }}>{fmtM(label)}</div>
      {rows.map((p) => (
        <div key={p.dataKey} style={{ display: "flex", justifyContent: "space-between", gap: 12, color: p.color, lineHeight: 1.55 }}>
          <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name}</span>
          <span style={{ fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  );
};

/* ---------- Crisis Explorer tab ---------- */

function Explorer() {
  const [cid, setCid] = useState("gfc");
  const [base, setBase] = useState("peak"); // 'peak' | 'start'
  const [log, setLog] = useState(false);
  const [hidden, setHidden] = useState(() => {
    const h = {};
    CRISES.forEach((c) => c.series.forEach((s) => { if (s.defaultOff) h[c.id + s.key] = true; }));
    return h;
  });
  // bubblegauge integration seam: live re-anchored AI-2026 series (null when gate off / feed down).
  const aiLive = (BG.enabled && BG.useAiLive) ? BG.useAiLive() : null;
  const crisis = CRISES.find((c) => c.id === cid);
  const cat = CAT[crisis.cat];

  const data = useMemo(() => {
    const rows = Array.from({ length: 121 }, (_, i) => ({ m: i - 60 }));
    crisis.series.forEach((s) => {
      const vals = rebase(interp((crisis.id === "ai2026" && aiLive && aiLive.a[s.key]) || s.a), base === "peak" ? 0 : -60);
      vals.forEach((v, i) => {
        const mm = i - 60;
        rows[i][s.key] = s.end !== undefined && mm > s.end ? null : +v.toFixed(1);
      });
    });
    return rows;
  }, [crisis, base, aiLive]);

  // bubblegauge integration seam: honest proxy relabeling when a line is live.
  const dispSeries = crisis.series.map((s) =>
    (crisis.id === "ai2026" && aiLive && aiLive.live[s.key]) ? { ...s, label: aiLive.labels[s.key] } : s);
  const visible = dispSeries.filter((s) => !hidden[crisis.id + s.key]);

  return (
    <div>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" }}>
        {CRISES.map((c) => (
          <Chip key={c.id} active={c.id === cid} color={CAT[c.cat].color} onClick={() => setCid(c.id)}>
            {c.name} <span style={{ opacity: 0.65 }}>· {c.years}</span>
          </Chip>
        ))}
      </div>

      <div style={{ ...S.panel, padding: "16px 18px", marginTop: 8 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 }}>
          <h2 style={{ ...S.serif, fontSize: 24, margin: 0, fontWeight: 600 }}>{crisis.name}</h2>
          <span style={{ fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${cat.color}`, color: cat.color, fontWeight: 600 }}>
            {crisis.cat} · {cat.label}
          </span>
          <span style={{ ...S.eyebrow }}>weight {crisis.weight.toFixed(1)} · peak {crisis.peak}</span>
          <Expl>
            <b>What this card tells you.</b> The colored badge is the crisis <i>type</i> (equity bubble, credit bubble,
            currency crisis…). "Weight" is how much this crisis counts in the averages — pure financial bubbles count
            fully (1.0), outside shocks like COVID count half. The gold text below highlights the single most important
            takeaway: which asset the retrospectively smartest investor held.
          </Expl>
        </div>
        <p style={{ margin: "10px 0 6px", fontSize: 13.5, lineHeight: 1.6, color: "#C7CBD6" }}>{crisis.cause}</p>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#E0B458" }}>{crisis.highlight}</p>
      </div>

      {crisis.potential && (
        <div style={{ ...S.panel, padding: "10px 14px", marginTop: 10, borderLeft: "3px solid #E8853D", fontSize: 12, color: "#E8C9A8", lineHeight: 1.6 }}>
          POTENTIAL crisis — the peak is anchored at today (Jul 2026) <b>by construction, not as a forecast</b>. All lines end at t0 and the right half of the axis is intentionally empty: no forward projection. Backfill uses real market anchors (Jul 2021 → Jul 2026); current-state sources are ≤ 6 weeks old (BIS 28 Jun · ECB 2 Jun &amp; 27 May · Fed 8 May 2026). Safe-haven candidates are shown dashed.
        </div>
      )}
      {/* bubblegauge integration seam: live re-anchor status + current readings */}
      {crisis.potential && BG.enabled && BG.AiLivePanel && <BG.AiLivePanel />}

      <div style={{ ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "0 14px 10px 18px" }}>
          <Seg value={base} onChange={setBase} options={[{ v: "peak", label: "Index: peak = 100" }, { v: "start", label: "Index: t−60 = 100" }]} />
          <Seg value={log ? "log" : "lin"} onChange={(v) => setLog(v === "log")} options={[{ v: "lin", label: "Linear" }, { v: "log", label: "Log" }]} />
          <Expl>
            <b>The chart, in plain words.</b> "Index: peak = 100" re-scales every line so they all meet at 100 at the
            crisis peak — best for seeing what happened <i>around the crash</i>. "t−60 = 100" starts everything at 100
            five years earlier — best for seeing the whole boom. "Log" makes equal <i>percentage</i> moves look equally
            big (100→200 looks like 200→400) — switch it on when one line (like Bitcoin) dwarfs the rest. Tap the
            colored chips below the chart to hide/show lines. Tags: ▼ the crashing market · U works in almost every
            crisis · C works in this crisis type · ★ one-off winner · ! famously failed.
          </Expl>
          <span style={{ ...S.eyebrow, marginLeft: "auto" }}>{crisis.potential ? "market-reference backfill · ends at t0 · no projection" : crisis.stylizedAll ? "fully stylized (pre-1970 data)" : "stylized reconstruction"}</span>
        </div>
        <ResponsiveContainer width="100%" height={370}>
          <LineChart data={data} margin={{ top: 6, right: 14, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(237,232,220,0.07)" vertical={false} />
            <XAxis dataKey="m" type="number" domain={[-60, 60]} ticks={[-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60]}
              tickFormatter={(m) => (m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`)}
              tick={{ fill: "#9AA3B5", fontSize: 10.5 }} stroke="rgba(237,232,220,0.2)" />
            <YAxis scale={log ? "log" : "linear"} domain={log ? ["auto", "auto"] : ["auto", "auto"]} allowDataOverflow
              tick={{ fill: "#9AA3B5", fontSize: 10.5 }} stroke="rgba(237,232,220,0.2)" width={44} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine x={0} stroke="#EDE8DC" strokeOpacity={0.45} strokeDasharray="4 3"
              label={{ value: "PEAK", fill: "#EDE8DC", fontSize: 9, position: "insideTopRight", opacity: 0.6 }} />
            <ReferenceLine y={100} stroke="rgba(237,232,220,0.18)" strokeDasharray="2 4" />
            {visible.map((s) => (
              <Line key={s.key} type="monotone" dataKey={s.key} name={s.label} stroke={s.color}
                strokeWidth={s.w || (s.cls === "market" ? 2.6 : 1.9)} dot={false}
                strokeDasharray={s.dashed ? "6 4" : undefined} isAnimationActive={false} />
            ))}
          </LineChart>
        </ResponsiveContainer>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "8px 14px 12px 18px" }}>
          {dispSeries.map((s) => {
            const off = hidden[crisis.id + s.key];
            return (
              <button key={s.key} onClick={() => setHidden((h) => ({ ...h, [crisis.id + s.key]: !off }))}
                style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 9px", borderRadius: 999,
                  border: "1px solid rgba(237,232,220,0.14)", background: off ? "transparent" : "rgba(237,232,220,0.05)",
                  color: off ? "#616a7d" : "#D9DCE4", fontSize: 11.5, cursor: "pointer",
                  textDecoration: off ? "line-through" : "none" }}>
                <span style={{ width: 9, height: 9, borderRadius: 99, background: s.color, opacity: off ? 0.35 : 1 }} />
                {s.label}
                <span style={{ fontSize: 9, color: s.color, fontWeight: 700 }}>{CLS[s.cls].tag}</span>
              </button>
            );
          })}
        </div>
        <div style={{ padding: "0 18px 12px", fontSize: 10.5, color: "#78829a" }}>
          ▼ collapsing market · U universal · C category-specific · ★ crisis-unique · ! falsified — tap a chip to show/hide.
          Panels chart the top evidence-scored assets; the complete asset × crisis coverage is in the Similarity Matrix.
          {" "}Sources: {crisis.sources}.
        </div>
      </div>
    </div>
  );
}

/* ---------- Similarity Matrix tab ---------- */

function Matrix() {
  const [sel, setSel] = useState(null); // {r, c}
  const cellStyle = (v) => {
    if (v === 3) return { bg: "rgba(154,163,181,0.22)", sym: "?", fg: "#C7CBD6" };
    if (v === 2) return { bg: "rgba(58,141,94,0.75)", sym: "✓", fg: "#0E1526" };
    if (v === 1) return { bg: "rgba(178,141,52,0.65)", sym: "~", fg: "#0E1526" };
    if (v === 0) return { bg: "rgba(178,70,70,0.7)", sym: "✗", fg: "#0E1526" };
    return { bg: "transparent", sym: "", fg: "#0E1526" };
  };
  const note = sel && MATRIX[sel.r].notes && MATRIX[sel.r].notes[sel.c];
  return (
    <div>
      <div style={{ ...S.panel, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Which assets rose in which crises?</h2>
          <Expl>
            <b>The scorecard, in plain words.</b> Each cell answers one simple question: did this asset go UP during
            that crisis? Green ✓ = yes, clearly. Amber ~ = sort of / only in some places. Red ✗ = no, it fell. Gray ? =
            the 2026 AI crisis hasn't actually happened, so those cells show only what experts <i>currently expect</i>.
            Blank = the academic literature has no evidence either way. Tap any cell to read the one-sentence story
            behind it, with the research paper it comes from.
          </Expl>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 }}>
          Qualitative similarity matrix implied by the Baur–McDermott safe-haven regressions and the flight-to-safety
          literature. <span style={{ color: "#7fbf94" }}>✓ rose / strong safe haven</span> · <span style={{ color: "#d9b45c" }}>~ weak or mixed</span> · <span style={{ color: "#e08a8a" }}>✗ fell</span> · <span style={{ color: "#C7CBD6" }}>? potential (AI ’26 — no outcome yet, current institutional view only)</span> · blank = no academic evidence. Tap any cell for the note.
        </p>
      </div>

      <div style={{ ...S.panel, marginTop: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 820, fontSize: 11.5 }}>
          <thead>
            <tr>
              <th style={{ textAlign: "left", padding: "10px 12px", position: "sticky", left: 0, background: "#141D31", ...S.eyebrow }}>Asset</th>
              {MX_CRISES.map((c) => (
                <th key={c} style={{ padding: "10px 4px", color: "#9AA3B5", fontWeight: 600, fontSize: 10.5, whiteSpace: "nowrap" }}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((row, r) => (
              <tr key={row.name} style={{ borderTop: "1px solid rgba(237,232,220,0.07)" }}>
                <td style={{ padding: "8px 12px", position: "sticky", left: 0, background: "#141D31", color: "#EDE8DC", fontWeight: 600, whiteSpace: "nowrap" }}>{row.name}</td>
                {row.vals.map((v, c) => {
                  const st = cellStyle(v);
                  const isSel = sel && sel.r === r && sel.c === c;
                  return (
                    <td key={c} style={{ padding: 3, textAlign: "center" }}>
                      <button onClick={() => setSel({ r, c })} style={{
                        width: 30, height: 26, borderRadius: 5, cursor: v === -1 ? "default" : "pointer",
                        border: isSel ? "1.5px solid #E0B458" : "1px solid rgba(237,232,220,0.08)",
                        background: st.bg, color: st.fg, fontWeight: 800, fontSize: 12,
                      }}>{st.sym}</button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {sel && (
        <div style={{ ...S.panel, marginTop: 10, padding: "12px 16px", borderLeft: "3px solid #E0B458" }}>
          <div style={{ ...S.eyebrow, marginBottom: 4 }}>{MATRIX[sel.r].name} · {MX_CRISES[sel.c]}</div>
          <div style={{ fontSize: 13, color: "#D9DCE4", lineHeight: 1.6 }}>
            {note || "No crisis-specific note — see the classification below and the underlying report for the general evidence."}
          </div>
        </div>
      )}

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <span style={{ ...S.eyebrow }}>The four buckets of crisis winners</span>
        <Expl>
          <b>Why four buckets?</b> Decades of research boil down to this: some things protect you in almost <i>every</i>
          crisis (U — like cash first, then safe government bonds), some only in the <i>matching type</i> of crisis
          (C — gold shines in money/inflation crises, cheap "value" stocks shine after tech bubbles), some were one-off
          jackpots you couldn't have planned (★ — like a gold miner in the 1930s), and some famous ideas simply failed
          the real-world test (! — Bitcoin in 2020, the yen this cycle). The two-phase rule inside U: in the first weeks
          everyone runs to CASH; only later does the money flow into long bonds.
        </Expl>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginTop: 10 }}>
        {CLASSIFICATION.map((c) => (
          <div key={c.title} style={{ ...S.panel, padding: "14px 16px", borderTop: `2px solid ${c.color}` }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
              <span style={{ width: 20, height: 20, borderRadius: 5, background: c.color, color: "#0E1526", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" }}>{c.tag}</span>
              <h3 style={{ ...S.serif, fontSize: 16, margin: 0, fontWeight: 600 }}>{c.title}</h3>
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12.5, color: "#C7CBD6", lineHeight: 1.65 }}>
              {c.items.map((it, i) => <li key={i} style={{ marginBottom: 5 }}>{it}</li>)}
            </ul>
          </div>
        ))}
      </div>

      <div style={{ ...S.panel, marginTop: 12, padding: "14px 16px", borderLeft: "3px solid #5AA9A3" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ ...S.eyebrow }}>Verification pass — cross-checked against a second AI’s report</span>
          <Expl>
            <b>What happened here?</b> A second AI produced a competing report. Instead of trusting it, every one of its
            novel claims was traced back to the original academic papers. CONFIRMED = the claim held up when we read the
            source. CORRECTED = we found and fixed an error (for example, it named the wrong journal). ADJUDICATED = two
            candidates competed for a title and we ruled on it with a stated criterion. This is how the dashboard keeps
            AI-generated claims honest.
          </Expl>
        </div>
        <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12, color: "#C7CBD6", lineHeight: 1.65 }}>
          <li style={{ marginBottom: 5 }}><b style={{ color: "#7fbf94" }}>CONFIRMED</b> — cash/T-bills/USD liquidity as a distinct phase-1 universal winner: Longstaff (2004, <i>J. Business</i>; NBER 2002), Nagel (2016, <i>QJE</i>), Krishnamurthy &amp; Vissing-Jorgensen (2012, <i>JPE</i>), Baele et al. (2020, <i>RFS</i>), Duffie (2020, Brookings).</li>
          <li style={{ marginBottom: 5 }}><b style={{ color: "#7fbf94" }}>CONFIRMED</b> — gold’s ambiguity mechanism (buy gold on ambiguous signals, bonds on extreme-but-clear ones): Baur &amp; McDermott (2012) — an IIIS/UTS <i>working paper</i>, not a journal article; theory anchored by Caballero &amp; Krishnamurthy (2008, <i>J. Finance</i>).</li>
          <li style={{ marginBottom: 5 }}><b style={{ color: "#7fbf94" }}>CONFIRMED</b> — VIX a stronger US hedge than gold (Hood &amp; Malik 2013, <i>Rev. Fin. Econ.</i>; Szado 2009, <i>JAI</i>), with persistently negative carry (Carr &amp; Wu 2009, <i>RFS</i>; Dew-Becker et al. 2017, <i>JFE</i>). VIX futures tradable only since 2004, options 2006 — earlier “long vol” = index puts.</li>
          <li style={{ marginBottom: 5 }}><b style={{ color: "#7fbf94" }}>CONFIRMED</b> — oil/energy as the 1973–74 crisis-unique winner; note Alpanda &amp; Peralta-Alva is a <i>published</i> Review of Economic Dynamics (2010) article, not a St. Louis Fed working paper.</li>
          <li style={{ marginBottom: 5 }}><b style={{ color: "#e0b458" }}>CORRECTED</b> — Cheema, Ryan &amp; Sarwar (2025) appeared in <i>International Review of Economics &amp; Finance</i> (vol. 102, art. 104364), NOT the “Journal of Economics and Business”; their peak-to-trough windows complement (don’t replace) the fixed t−60/+60 scale used here.</li>
          <li><b style={{ color: "#b48ce0" }}>ADJUDICATED</b> — “most unique” winner: oil/energy leads on <i>magnitude</i> within a recurring crisis type; Homestake (Burdekin &amp; Weidenmier 2004) leads on <i>structural non-recurrence</i>. Both are shown.</li>
        </ul>
      </div>
    </div>
  );
}

/* ---------- Aggregate tab ---------- */

const AGG_LINES = [
  { key: "market", label: "Collapsing markets (hist.)", color: "#E05252", w: 2.6 },
  { key: "cash", label: "Phase 1 · Cash/T-bills (hist.)", color: "#BBCF6A", w: 2 },
  { key: "bonds", label: "Phase 2 · Duration bonds (hist.)", color: "#5B8DEF", w: 2 },
  { key: "convex", label: "Convexity · trend & long-vol (hist.)", color: "#9A7BD6", w: 1.8 },
  { key: "category", label: "Category-specific (hist.)", color: "#E0B458", w: 2 },
  { key: "unique", label: "Crisis-unique (hist.)", color: "#B48CE0", w: 1.7 },
];

const OVERLAY_LINES = [
  { key: "ai_mkt", label: "AI ’26 · NASDAQ-100", color: "#FF9A8C", w: 2.2 },
  { key: "ai_cash", label: "AI ’26 · Cash/T-bills", color: "#E2EFAF", w: 1.6 },
  { key: "ai_ust", label: "AI ’26 · 10Y Treasuries", color: "#9DBBF7", w: 1.6 },
  { key: "ai_au", label: "AI ’26 · Gold", color: "#F4D896", w: 1.8 },
];

const PAIRS = [
  { title: "Feared market", sub: "10 collapsing markets vs NASDAQ-100", histKey: "market", aiKey: "ai_mkt", color: "#E05252", aiColor: "#FF9A8C",
    expl: "Solid red = the average path of ten historical crashes. Dashed = the real NASDAQ-100, July 2021 to today. Both equal 100 at the peak. Compare how steep the climbs are — then look at what history did after its peaks: it kept falling for about two more years.",
    note: "History keeps falling for ~2 years past the peak; the 2026 line simply ends at today — that right half is the open question." },
  { title: "Phase 1 · Cash / T-bills", sub: "flight to liquidity", histKey: "cash", aiKey: "ai_cash", color: "#BBCF6A", aiColor: "#E2EFAF",
    expl: "Cash and Treasury bills are the 'boring' hedge: they never crash, they just tick upward with interest. In the first weeks of every panic, this is where the money runs FIRST — before it moves into bonds. Notice: no dip anywhere, in any era.",
    note: "The only family with no drawdown in either era — unspectacular but unbroken (Longstaff 2004; Nagel 2016; Duffie 2020)." },
  { title: "Phase 2 · Duration bonds", sub: "UST · JGBs · Bunds", histKey: "bonds", aiKey: "ai_ust", color: "#5B8DEF", aiColor: "#9DBBF7",
    expl: "Long government bonds are history's classic crash cushion — the solid line climbs right through past crises. But the dashed 2026 line tells a warning: after the 2022 inflation shock, Treasuries enter today's assumed peak BELOW where they started in 2021. The old cushion may not be plumped up this time.",
    note: "History climbs steadily through the crash; the 2026 Treasury line enters the assumed peak BELOW its 2021 level — the challenged haven (BIS Sep 2025; ECB)." },
  { title: "Gold", sub: "7 crises with direct gold data vs today", histKey: "gold", aiKey: "ai_au", color: "#E0B458", aiColor: "#F4D896",
    expl: "Gold usually drifts modestly upward before a crisis and shines after. Today's dashed line is different: gold has already MORE than doubled into the assumed peak — far above the historical norm. Good news: the hedge is working. Caution: much of the protection may already be paid for in the price.",
    note: "2026 gold has risen far above the historical pre-crisis norm into the assumed peak — elevated to lead regime-matched hedge (score 0.85, Analytics ranking), but hedge demand may be pre-paid." },
];

function PairTile({ p, data }) {
  const first = data[0], after = data[96]; // m = −60 and m = +36
  const run = (k) => (first[k] ? Math.round((100 / first[k] - 1) * 100) : null);
  const histRun = run(p.histKey);
  const aiRun = p.aiKey ? run(p.aiKey) : null;
  const histAfter = after ? after[p.histKey] : null;
  return (
    <div style={{ ...S.panel, padding: "12px 6px 8px 0" }}>
      <div style={{ padding: "0 12px 2px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <div style={{ ...S.serif, fontSize: 15.5, fontWeight: 600 }}>{p.title}</div>
          {p.expl && <Expl>{p.expl}</Expl>}
        </div>
        <div style={{ ...S.eyebrow, marginTop: 2 }}>{p.sub}</div>
      </div>
      <ResponsiveContainer width="100%" height={185}>
        <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(237,232,220,0.06)" vertical={false} />
          <XAxis dataKey="m" type="number" domain={[-60, 60]} ticks={[-60, -24, 0, 24, 60]}
            tickFormatter={(m) => (m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`)}
            tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" />
          <YAxis tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" width={34} domain={["auto", "auto"]} />
          <Tooltip content={<ChartTip />} />
          <ReferenceLine x={0} stroke="#EDE8DC" strokeOpacity={0.4} strokeDasharray="4 3" />
          <ReferenceLine y={100} stroke="rgba(237,232,220,0.15)" strokeDasharray="2 4" />
          <Line type="monotone" dataKey={p.histKey} name="Historical composite" stroke={p.color} strokeWidth={2.2} dot={false} isAnimationActive={false} />
          {p.aiKey && (
            <Line type="monotone" dataKey={p.aiKey} name="AI ’26 (to today)" stroke={p.aiColor} strokeWidth={2}
              strokeDasharray="6 4" dot={false} isAnimationActive={false} />
          )}
        </LineChart>
      </ResponsiveContainer>
      <div style={{ display: "flex", gap: 14, padding: "4px 12px 0 16px", fontSize: 10.5, color: "#9AA3B5", flexWrap: "wrap" }}>
        <span><span style={{ color: p.color, fontWeight: 700 }}>━</span> history (solid)</span>
        {p.aiKey && <span><span style={{ color: p.aiColor, fontWeight: 700 }}>╌</span> AI ’26 → today (dashed)</span>}
      </div>
      <div style={{ padding: "6px 12px 6px 16px", fontSize: 11, color: "#C7CBD6", lineHeight: 1.5 }}>
        <span style={{ color: "#EDE8DC", fontWeight: 600 }}>Run-up t−60 → peak:</span> history +{histRun}%
        {aiRun != null && <> · 2026 +{aiRun}%</>}
        {histAfter != null && <> · <span style={{ color: "#EDE8DC", fontWeight: 600 }}>history at t+36:</span> {Math.round(histAfter)}</>}
      </div>
      <div style={{ padding: "0 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 }}>{p.note}</div>
    </div>
  );
}

function Aggregate() {
  // bubblegauge integration seam: live re-anchored AI-2026 overlays when the feed is up.
  const aiLive = (BG.enabled && BG.useAiLive) ? BG.useAiLive() : null;
  const data = useMemo(() => {
    const rows = buildAggregate();
    const AI = CRISES.find((c) => c.potential);
    if (AI) {
      AI.series.forEach((s) => {
        if (!["mkt", "au", "cash", "ust"].includes(s.key)) return;
        const vals = rebase(interp((aiLive && aiLive.a[s.key]) || s.a), 0);
        rows.forEach((row, i) => {
          row["ai_" + s.key] = row.m <= 0 ? +vals[i].toFixed(1) : null;
        });
      });
    }
    return rows;
  }, [aiLive]);
  const [mode, setMode] = useState("pairs");
  const [hidden, setHidden] = useState({});
  const stats = [
    { n: "−55.9%", d: "average equity decline in severe financial crises (Reinhart & Rogoff 2009)" },
    { n: "3.4 yrs", d: "average downturn duration for equities (Reinhart & Rogoff 2009)" },
    { n: "−35% / 6 yrs", d: "average real housing decline and duration (Reinhart & Rogoff 2009)" },
    { n: "+2.7%", d: "avg bond–equity return gap on flight-to-safety days (Baele et al. 2020)" },
    { n: "CAPE ≈ 41", d: "Shiller CAPE, Jul 2026 — near the ~44 dot-com record; flagged by BIS, ECB, Fed & BoE 2026 stability reports" },
    { n: "27% vs 22%", d: "gold vs US Treasuries share of global reserves at end-2025 — gold overtook Treasuries (ECB, 2 Jun 2026)" },
  ];
  const chip = (l) => {
    const off = hidden[l.key];
    return (
      <button key={l.key} onClick={() => setHidden((h) => ({ ...h, [l.key]: !off }))}
        style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 999,
          border: "1px solid rgba(237,232,220,0.14)", background: off ? "transparent" : "rgba(237,232,220,0.05)",
          color: off ? "#616a7d" : "#D9DCE4", fontSize: 11, cursor: "pointer", maxWidth: "100%",
          textDecoration: off ? "line-through" : "none" }}>
        <span style={{ width: 9, height: 9, minWidth: 9, borderRadius: 99, background: l.color, opacity: off ? 0.35 : 1 }} />
        <span style={{ textAlign: "left", lineHeight: 1.25 }}>{l.label}</span>
      </button>
    );
  };
  return (
    <div>
      <div style={{ ...S.panel, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 }}>The aggregate anatomy of a crisis</h2>
          {/* bubblegauge integration seam: overlay live/static indicator */}
          {BG.enabled && BG.LiveBadge && <BG.LiveBadge keys={["mkt", "au", "cash", "ust"]} label="2026 overlays" />}
          <Expl>
            <b>This tab in one breath.</b> We averaged all ten historical crises into one "typical crisis" per asset
            family, then laid today's 2026 situation (dashed) on top. Both are forced to equal 100 at the peak, so the
            only fair comparison is the <i>shape of the climb</i> before the peak — and what history did afterwards.
            "History ↔ 2026 pairs" shows one small chart per family (easiest to read). "All composites" puts everything
            in one big chart. The dashed lines stop at the peak because the 2026 future is unknown — that empty right
            half is the whole point.
          </Expl>
        </div>
        <p style={{ margin: "0 0 10px", fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 }}>
          Ten historical crises rebased to <b>100 at the peak (t0)</b>, crisis-weight-averaged into unified families
          (bubbles 1.0 · currency/sovereign 0.8 · Black Monday 0.7 · COVID 0.5). The default view pairs each historical
          family (solid) with its 2026 counterpart (dashed, real Jul 2021 → today backfill, ending at t0 — no
          projection). Both lines equal 100 at the peak by construction, so the comparison lives in the <b>run-up
          shape</b> into the peak and the <b>historical aftermath</b> that follows it. Bitcoin (falsified) is excluded.
        </p>
        <Seg value={mode} onChange={setMode}
          options={[{ v: "pairs", label: "History ↔ 2026 pairs" }, { v: "all", label: "All composites" }]} />
      </div>

      {mode === "pairs" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
            {PAIRS.map((p) => <PairTile key={p.histKey} p={p} data={data} />)}
          </div>
          <div style={{ ...S.panel, padding: "12px 6px 8px 0", marginTop: 12 }}>
            <div style={{ padding: "0 12px 2px 16px" }}>
              <div style={{ ...S.serif, fontSize: 15.5, fontWeight: 600 }}>History-only families</div>
              <div style={{ ...S.eyebrow, marginTop: 2 }}>no charted 2026 counterpart</div>
            </div>
            <ResponsiveContainer width="100%" height={185}>
              <LineChart data={data} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="rgba(237,232,220,0.06)" vertical={false} />
                <XAxis dataKey="m" type="number" domain={[-60, 60]} ticks={[-60, -24, 0, 24, 60]}
                  tickFormatter={(m) => (m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`)}
                  tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" />
                <YAxis tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" width={34} domain={["auto", "auto"]} />
                <Tooltip content={<ChartTip />} />
                <ReferenceLine x={0} stroke="#EDE8DC" strokeOpacity={0.4} strokeDasharray="4 3" />
                <ReferenceLine y={100} stroke="rgba(237,232,220,0.15)" strokeDasharray="2 4" />
                <Line type="monotone" dataKey="convex" name="Convexity · trend & long-vol" stroke="#9A7BD6" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="category" name="Category-specific (incl. gold, FX, value)" stroke="#C98A4F" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="unique" name="Crisis-unique winners" stroke="#B48CE0" strokeWidth={2} dot={false} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
            <div style={{ display: "flex", gap: 14, padding: "4px 12px 0 16px", fontSize: 10.5, color: "#9AA3B5", flexWrap: "wrap" }}>
              <span><span style={{ color: "#9A7BD6", fontWeight: 700 }}>━</span> convexity (trend & long-vol)</span>
              <span><span style={{ color: "#C98A4F", fontWeight: 700 }}>━</span> category-specific</span>
              <span><span style={{ color: "#B48CE0", fontWeight: 700 }}>━</span> crisis-unique</span>
            </div>
            <div style={{ padding: "6px 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 }}>
              Convexity spikes into the crash and decays after — insurance, not a store of value. No 2026 trend/long-vol
              backfill is charted; crisis-unique winners are identifiable only ex post; the category composite is paired
              above via its lead asset, gold.
            </div>
          </div>
        </>
      )}

      {mode === "all" && (
        <div style={{ ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 }}>
          <ResponsiveContainer width="100%" height={380}>
            <LineChart data={data} margin={{ top: 6, right: 14, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(237,232,220,0.07)" vertical={false} />
              <XAxis dataKey="m" type="number" domain={[-60, 60]} ticks={[-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60]}
                tickFormatter={(m) => (m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`)}
                tick={{ fill: "#9AA3B5", fontSize: 10.5 }} stroke="rgba(237,232,220,0.2)" />
              <YAxis tick={{ fill: "#9AA3B5", fontSize: 10.5 }} stroke="rgba(237,232,220,0.2)" width={44} domain={["auto", "auto"]} />
              <Tooltip content={<ChartTip />} />
              <ReferenceLine x={0} stroke="#EDE8DC" strokeOpacity={0.45} strokeDasharray="4 3"
                label={{ value: "PEAK / TODAY", fill: "#EDE8DC", fontSize: 9, position: "insideTopRight", opacity: 0.6 }} />
              <ReferenceLine y={100} stroke="rgba(237,232,220,0.18)" strokeDasharray="2 4" />
              {AGG_LINES.filter((l) => !hidden[l.key]).map((l) => (
                <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={l.w} dot={false} isAnimationActive={false} />
              ))}
              {OVERLAY_LINES.filter((l) => !hidden[l.key]).map((l) => (
                <Line key={l.key} type="monotone" dataKey={l.key} name={l.label} stroke={l.color} strokeWidth={l.w}
                  strokeDasharray="6 4" dot={false} isAnimationActive={false} />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div style={{ padding: "6px 18px 2px", ...S.eyebrow }}>historical composites · solid</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "4px 14px 4px 18px" }}>
            {AGG_LINES.map(chip)}
          </div>
          <div style={{ padding: "6px 18px 2px", ...S.eyebrow }}>2026 overlays · dashed · end at t0 (today)</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, padding: "4px 14px 14px 18px" }}>
            {OVERLAY_LINES.map(chip)}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 }}>
        {stats.map((s) => (
          <div key={s.n} style={{ ...S.panel, padding: "14px 16px" }}>
            <div style={{ ...S.serif, fontSize: 26, color: "#E0B458", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>{s.n}</div>
            <div style={{ fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.55, marginTop: 4 }}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.panel, marginTop: 14, padding: "14px 16px", borderLeft: "3px solid #5B8DEF" }}>
        <div style={{ ...S.eyebrow, marginBottom: 6 }}>The core lesson</div>
        <p style={{ margin: 0, fontSize: 13.5, color: "#D9DCE4", lineHeight: 1.65 }}>
          No asset is an unconditional safe haven. Universal winners compound quietly through the crash; category-specific
          winners (led by gold) deliver the largest gains but only in the matching regime; crisis-unique winners are
          spectacular and non-replicable. Retrospectively, the smartest investor was a diversifier holding the
          regime-appropriate hedge — then rotating into cheap, high-quality survivors at the trough.
        </p>
      </div>
    </div>
  );
}

/* ---------- Analytics tab (results of the algorithmic battery) ---------- */

const AN = {
  tail: [
    { a: "Gold", bf: "−0.08", bc: "−0.02", hit: "42%", lam: "0.26" },
    { a: "10Y US Treasuries", bf: "+0.08", bc: "−0.02", hit: "33%", lam: "0.31" },
    { a: "Cash / T-bills", bf: "+0.01", bc: "+0.01", hit: "100%", lam: "0.37" },
  ],
  explos: [
    { v: "Raw log price", s: "+0.75", verdict: "borderline (crit 0.62–0.78, seed-sensitive)", flag: true },
    { v: "Linear-trend residual", s: "−0.76", verdict: "not explosive", flag: false },
    { v: "Broken-trend residual (break Dec ’22)", s: "−1.20", verdict: "not explosive", flag: false },
    { v: "Earnings-proxy residual (17%/yr)", s: "−0.83", verdict: "not explosive", flag: false },
  ],
};

const FanTip = ({ active, payload }) => {
  if (!active || !payload || !payload.length) return null;
  const row = payload[0] && payload[0].payload;
  if (!row) return null;
  return (
    <div style={{ background: "#0B111F", border: "1px solid rgba(237,232,220,0.15)", borderRadius: 8, padding: "8px 11px", fontSize: 11 }}>
      <div style={{ color: "#9AA3B5", fontWeight: 600, marginBottom: 4 }}>t+{row.m} mo</div>
      <div style={{ color: "#EDE8DC" }}>median: {Math.round(row.med)}</div>
      <div style={{ color: "#9AA3B5" }}>middle 50%: {Math.round(row.b50[0])}–{Math.round(row.b50[1])}</div>
      <div style={{ color: "#78829a" }}>80% band: {Math.round(row.b80[0])}–{Math.round(row.b80[1])}</div>
    </div>
  );
};

function FanTile({ title, sub, col, fan, expl, note }) {
  const s = fan.stats;
  return (
    <div style={{ ...S.panel, padding: "12px 6px 8px 0" }}>
      <div style={{ padding: "0 12px 2px 16px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
          <div style={{ ...S.serif, fontSize: 15.5, fontWeight: 600 }}>{title}</div>
          <Expl>{expl}</Expl>
        </div>
        <div style={{ ...S.eyebrow, marginTop: 2 }}>{sub}</div>
      </div>
      <ResponsiveContainer width="100%" height={185}>
        <ComposedChart data={fan.rows} margin={{ top: 8, right: 10, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="rgba(237,232,220,0.06)" vertical={false} />
          <XAxis dataKey="m" type="number" domain={[0, 60]} ticks={[0, 12, 24, 36, 48, 60]}
            tickFormatter={(m) => `+${m}`} tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" />
          <YAxis tick={{ fill: "#9AA3B5", fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" width={34} domain={["auto", "auto"]} />
          <Tooltip content={<FanTip />} />
          <ReferenceLine y={100} stroke="#EDE8DC" strokeOpacity={0.4} strokeDasharray="3 3" />
          <Area dataKey="b80" stroke="none" fill={col} fillOpacity={0.13} isAnimationActive={false} />
          <Area dataKey="b50" stroke="none" fill={col} fillOpacity={0.26} isAnimationActive={false} />
          <Line dataKey="med" stroke={col} strokeWidth={2.2} dot={false} isAnimationActive={false} />
        </ComposedChart>
      </ResponsiveContainer>
      <div style={{ padding: "4px 12px 6px 16px", fontSize: 11, color: "#C7CBD6", lineHeight: 1.55 }}>
        <span style={{ color: "#EDE8DC", fontWeight: 600 }}>Median max decline vs entry:</span> {(s.mdd * 100).toFixed(0)}%
        (IQR {(s.mddLo * 100).toFixed(0)}%…{(s.mddHi * 100).toFixed(0)}%) ·{" "}
        <span style={{ color: "#EDE8DC", fontWeight: 600 }}>at +36 mo:</span> median {Math.round(s.med36)},
        P(below 100) {(s.below36 * 100).toFixed(0)}%, 10–90% [{Math.round(s.lo36)}, {Math.round(s.hi36)}]
      </div>
      <div style={{ padding: "0 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 }}>{note}</div>
    </div>
  );
}

function Analytics() {
  // bubblegauge integration seam: the crisis clock's "today" window uses the live NASDAQ-100
  // backfill when the feed is up (the chart is documented as computed live from the anchors).
  const aiLive = (BG.enabled && BG.useAiLive) ? BG.useAiLive() : null;
  const xc = useMemo(() => {
    const cur = logPath(rebase(interp((aiLive && aiLive.a.mkt) || ser("ai2026", "mkt")), 0));
    const H2 = {
      dotcom: logPath(rebase(interp(ser("dotcom", "mkt")), 0)),
      y1929: logPath(rebase(interp(ser("depression", "mkt")), 0)),
      japan: logPath(rebase(interp(ser("japan", "mkt")), 0)),
    };
    const byP = {};
    Object.entries(H2).forEach(([name, hl]) => {
      xcorrRow(cur, hl, 24).forEach(({ p, r }) => { (byP[p] = byP[p] || { p })[name] = r; });
    });
    return Object.values(byP).sort((a, b) => a.p - b.p);
  }, [aiLive]);
  const fans = useMemo(() => ({
    market: runFan([["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]], 7, 1500),
    gold: runFan([["stagflation", "au"], ["gfc", "au"], ["euro", "au"]], 11, 1500),
    bonds: runFan([["dotcom", "ust"], ["depression", "gb"], ["japan", "jgb"]], 13, 1500),
  }), []);
  const clockCards = [
    { n: "≈ −12 mo", d: "weighted template clock — today's pattern sits ~12 months before the average analog peak (range 0 to −21 by template)" },
    { n: "p ≈ 0 / +1", d: "dot-com template, the closest analog: today matches its PEAK (r 0.79–0.89, DTW confirms)" },
    { n: "+2.5 mo", d: "LPPL critical time (Sornette fit on real backfill) — suggestive but fails the damping qualification" },
    { n: "now → +19 mo", d: "gold-surge lead clock: historical gold surges led market peaks by 0 (1973), 24 (GFC), 36 (Euro) months" },
  ];
  return (
    <div>
      <div style={{ ...S.panel, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 }}>Algorithmic battery — where are we on the crisis clock?</h2>
          <Expl>
            <b>What this tab is.</b> Six statistical methods were run in Python on the real 2021–26 data and the
            historical templates; the heavy results (LPPL, Markov, tail regressions) are reported as fixed numbers,
            while the correlation curves and outcome fans below are recomputed live in your browser from the same
            anchors. None of it is a prediction — it answers "what does today most RESEMBLE, and what usually followed
            that resemblance?"
          </Expl>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 }}>
          Template matching (cross-correlation + DTW), LPPL critical-time estimation, PSY/SADF explosiveness,
          Baur–McDermott tail regressions, Hamilton regime switching, and Granger lead–lag — individually per asset,
          then weighted into one clock reading.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 12 }}>
        {clockCards.map((s) => (
          <div key={s.n} style={{ ...S.panel, padding: "14px 16px" }}>
            <div style={{ ...S.serif, fontSize: 24, color: "#E0B458", fontWeight: 600 }}>{s.n}</div>
            <div style={{ fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.55, marginTop: 4 }}>{s.d}</div>
          </div>
        ))}
      </div>

      <div style={{ ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "0 14px 8px 18px" }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Crisis clock — where does today correlate most?</div>
          {/* bubblegauge integration seam: "today" window live/static indicator */}
          {BG.enabled && BG.LiveBadge && <BG.LiveBadge keys={["mkt"]} label="today window" />}
          <Expl>
            <b>How to read this.</b> We took today's last 24 months of NASDAQ-100 and slid it along each historical
            bubble's path, asking at every position: how similar are the shapes? The horizontal axis is the position —
            "0" means "today looks like the historical peak day", "−12" means "today looks like 12 months BEFORE that
            peak". Where a line is highest is where today fits best. Dot-com peaks at ≈ 0 (we look like its top);
            1929 and Japan peak further left (we look like their run-up phase, 1–2 years early).
          </Expl>
        </div>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={xc} margin={{ top: 6, right: 14, bottom: 4, left: 0 }}>
            <CartesianGrid stroke="rgba(237,232,220,0.07)" vertical={false} />
            <XAxis dataKey="p" type="number" domain={[-30, 6]} ticks={[-30, -24, -18, -12, -6, 0, 6]}
              tick={{ fill: "#9AA3B5", fontSize: 10 }} stroke="rgba(237,232,220,0.2)" />
            <YAxis tick={{ fill: "#9AA3B5", fontSize: 10 }} stroke="rgba(237,232,220,0.2)" width={40} domain={["auto", "auto"]} />
            <Tooltip content={<ChartTip />} />
            <ReferenceLine x={0} stroke="#EDE8DC" strokeOpacity={0.45} strokeDasharray="4 3"
              label={{ value: "ANALOG PEAK", fill: "#EDE8DC", fontSize: 8.5, position: "insideTopRight", opacity: 0.6 }} />
            <Line dataKey="dotcom" name="vs dot-com" stroke="#E0B458" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="y1929" name="vs 1929" stroke="#B48CE0" strokeWidth={2} dot={false} isAnimationActive={false} />
            <Line dataKey="japan" name="vs Japan 1990" stroke="#5AA9A3" strokeWidth={2} dot={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
        <div style={{ padding: "2px 18px 12px", fontSize: 10.5, color: "#78829a" }}>
          Correlation of today's last 24 months vs the analog window ending at position p (computed live; K=36 confirms the pattern).
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 }}>
        <span style={{ ...S.eyebrow }}>Post-peak outcome fans — if the peak were today</span>
        <Expl>
          <b>What is a "fan"?</b> We took the months AFTER past peaks, shuffled them thousands of times in 6-month
          blocks, and rebuilt 1,500 possible "afterwards" paths per family. The dark band is where the middle half of
          those historical outcomes landed; the light band covers 80%. It shows what USUALLY happened after such peaks —
          it is explicitly NOT a forecast; if the optimists (BIS's "capex boom, not solvency bubble") are right, reality
          can land above the whole fan.
        </Expl>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 10 }}>
        <FanTile title="Market" sub="analog class: dot-com · 1929 · Japan" col="#E05252" fan={fans.market}
          expl="If today's peak plays out like the average tech/equity bubble, the middle-of-the-road historical outcome is a fall of roughly 60% spread over years, still below the starting point three years later in ~4 of 5 bootstrap paths."
          note="Historical conditional distribution under peak-at-today — the central case is a deep multi-year decline; the top of the light band shows the mildest historical outcomes." />
        <FanTile title="Gold" sub="monetary-crisis refs: 1973 · GFC · Euro" col="#E0B458" fan={fans.gold}
          expl="Gold's script after monetary-crisis peaks: a brief early wobble (people sell everything for cash for a few weeks), then a strong climb. Median around +35% three years on."
          note="Applies IF gold keeps following the monetary-crisis regime it has tracked since 2021 — its −0.88 anti-correlation with the equity-bubble script supports that." />
        <FanTile title="Bonds" sub="deflationary analogs: dot-com · 1929 · Japan" col="#5B8DEF" fan={fans.bonds}
          expl="In past DEFLATIONARY crises, long government bonds simply climbed — no drawdown at all. Caution: today's bond market has been living in an INFLATION regime since 2022, so this friendly fan assumes a regime change back to the old script."
          note="The most regime-fragile fan: today's Treasuries enter the peak below their 2021 level — if inflation persists, this deflationary-analog band does not apply." />
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 14 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Safe-haven tail test — real 2026 backfill</div>
          <Expl>
            <b>Beta, in plain words.</b> Beta answers: when the market falls 1%, what does the hedge do on average? A
            beta near zero or negative <i>in the market's WORST months</i> (second column) is the definition of a real
            safe haven (Baur &amp; McDermott's method). "Hit rate" = how often the hedge was actually UP in those worst
            months. λ_L (tail dependence) measures how glued the hedge is to the market in disasters — 0 would be
            perfectly decoupled, 1 perfectly glued. Verdict this cycle: cash perfect, gold and Treasuries weak-but-real
            havens, nothing fully decoupled.
          </Expl>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 460, fontSize: 11.5 }}>
            <thead><tr>
              {["Hedge", "β full sample", "β worst-quintile", "P(up | worst months)", "Clayton λ_L"].map((h) => (
                <th key={h} style={{ textAlign: "left", padding: "6px 10px", ...S.eyebrow }}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {AN.tail.map((r) => (
                <tr key={r.a} style={{ borderTop: "1px solid rgba(237,232,220,0.07)" }}>
                  <td style={{ padding: "7px 10px", color: "#EDE8DC", fontWeight: 600 }}>{r.a}</td>
                  <td style={{ padding: "7px 10px", color: "#C7CBD6" }}>{r.bf}</td>
                  <td style={{ padding: "7px 10px", color: "#E0B458", fontWeight: 600 }}>{r.bc}</td>
                  <td style={{ padding: "7px 10px", color: "#C7CBD6" }}>{r.hit}</td>
                  <td style={{ padding: "7px 10px", color: "#C7CBD6" }}>{r.lam}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 }}>
        <div style={{ ...S.panel, padding: "14px 16px", borderTop: "2px solid #B48CE0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Market regime (Markov switching)</div>
            <Expl>
              <b>Plainly:</b> a statistical model sorted the last five years of months into "calm weather"
              (steady +2.4%/mo, tiny wobble) and "stormy weather" (flat drift, huge ±5.5% swings). Right now the model
              is 100% sure we're in the storm — the same weather the dot-com market had at its very top. Storms host
              both melt-ups and crashes; the model can't say which comes next, only that we're not in the calm state.
            </Expl>
          </div>
          <div style={{ ...S.serif, fontSize: 26, color: "#B48CE0", fontWeight: 600 }}>P(turbulent) = 1.00</div>
          <div style={{ fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.6, marginTop: 4 }}>
            Calm state: +2.4%/mo · σ 0.6% — Turbulent: +0.5%/mo · σ 5.5% · expected storm duration ≈ 21 mo ·
            dot-com showed the identical P = 1.00 signature at its own peak.
          </div>
        </div>
        <div style={{ ...S.panel, padding: "14px 16px", borderTop: "2px solid #E8853D" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
            <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Bubble detector (BSADF variants)</div>
            <Expl>
              <b>Plainly:</b> a standard statistical "bubble alarm" (the PSY test). On raw prices it's exactly on the
              borderline — some runs flag it, some don't. The moment you allow for the fact that these companies'
              profits are genuinely growing ~17%/yr, the alarm goes silent in every variant. Translation: the academic
              jury is honestly split on whether this is a bubble at all — our own data reproduces both sides of the
              published dispute.
            </Expl>
          </div>
          {AN.explos.map((r) => (
            <div key={r.v} style={{ display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, padding: "4px 0", borderTop: "1px solid rgba(237,232,220,0.06)" }}>
              <span style={{ color: "#C7CBD6" }}>{r.v}</span>
              <span style={{ color: r.flag ? "#E8853D" : "#9AA3B5", fontWeight: 600, whiteSpace: "nowrap" }}>{r.s} · {r.verdict}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 12, borderLeft: "3px solid #E0B458" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Lead–lag: gold has moved FIRST this cycle</div>
          <Expl>
            <b>Plainly:</b> statistically, gold's moves this cycle have come BEFORE the stock market's moves (about 4
            months earlier), not after — a formal Granger test confirms it strongly one-way. Historically, gold's big
            surges came 0 to 36 months before market peaks. Today's surge peaked in January 2026 and was bigger than
            any historical reference (+94% in 12 months). Applying history's lead times brackets the implied market
            peak between "now" and about 19 months from now.
          </Expl>
        </div>
        <p style={{ margin: 0, fontSize: 12.5, color: "#D9DCE4", lineHeight: 1.7 }}>
          Granger (3 lags): gold → market <b>F = 7.79, p &lt; 0.01</b>; reverse direction p = 0.73 · CCF peak: gold
          leads by <b>4 months</b> (r +0.58) · historical gold-surge leads before market peaks: 1973: 0 · GFC: 24 ·
          Euro: 36 months · today's surge peaked Jan 2026 (t−5, +94% trailing-12m) → <b>implied peak bracket: now → +19 months</b>.
        </p>
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 12, borderTop: "2px solid #E0B458" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>2026 hedge weighting — is gold now the lead hedge?</div>
          <Expl>
            <b>How the score works.</b> Every hedge was graded 0–1 on five things and weighted:
            (1) <i>regime match, 30%</i> — does it follow the script that fits TODAY's regime? (2) <i>live tail
            evidence, 25%</i> — did it actually hold up in the market's worst months since 2021? (3) <i>institutional
            view, 25%</i> — what do central banks and stability reports say right now (≤ 6 weeks old)? (4) <i>lead
            property, 10%</i> — does it move BEFORE the market? (5) <i>entry valuation, 10%</i> — is it still cheap,
            or already expensive? Verdict: cash wins on CERTAINTY, gold on expected PAYOFF — statistically a tie at
            the top — while Treasuries fall to 5th. Doubling the "already expensive" penalty still keeps gold in 2nd
            (0.78), so the podium is robust. Important nuance: this elevation is CONDITIONAL on the 2026 regime — in
            the historical scorecard gold keeps its dot-com ✗ and stays "near-universal, demoted".
          </Expl>
        </div>
        {[
          { n: "Cash / T-bills", s: 0.88, c: "#BBCF6A", r: "rank #1 certainty — phase-1, 100% worst-month hit rate, record $7.95tn MMFs, par entry" },
          { n: "Gold", s: 0.85, c: "#E0B458", r: "rank #1 payoff — regime-match 0.96–0.98, ECB reserve overtake, Granger lead; entry partly pre-paid" },
          { n: "Swiss franc", s: 0.59, c: "#7EC8E3", r: "credible secondary haven, strengthening vs USD (tail score estimated)" },
          { n: "US dollar", s: 0.44, c: "#8FAE5D", r: "funding-stress hedge only; de-dollarization drag (worst H1 since 1973)" },
          { n: "10Y US Treasuries", s: 0.42, c: "#5B8DEF", r: "challenged — inflation-regime mismatch since 2022, April-2025 joint selloff" },
          { n: "Japanese yen", s: 0.21, c: "#5AA9A3", r: "falsified this cycle — ~¥162, carry dominates haven flows" },
          { n: "Bitcoin", s: 0.11, c: "#E8853D", r: "falsified — trades as a risk asset (−51% from ATH with indices at records)" },
        ].map((h) => (
          <div key={h.n} style={{ padding: "6px 0", borderTop: "1px solid rgba(237,232,220,0.06)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 4 }}>
              <span style={{ color: "#EDE8DC", fontWeight: 600 }}>{h.n}</span>
              <span style={{ color: h.c, fontWeight: 700, fontVariantNumeric: "tabular-nums" }}>{h.s.toFixed(2)}</span>
            </div>
            <div style={{ height: 7, borderRadius: 99, background: "rgba(237,232,220,0.07)" }}>
              <div style={{ width: `${h.s * 100}%`, height: "100%", borderRadius: 99, background: h.c, opacity: 0.85 }} />
            </div>
            <div style={{ fontSize: 10.5, color: "#78829a", marginTop: 3, lineHeight: 1.5 }}>{h.r}</div>
          </div>
        ))}
        <p style={{ margin: "10px 0 0", fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.65 }}>
          Score = 0.30·regime-match + 0.25·live tail + 0.25·institutional (≤6 wk) + 0.10·lead + 0.10·entry valuation.
          <b style={{ color: "#E0B458" }}> Verdict: gold is elevated to lead regime-matched hedge for the 2026
          configuration</b> — a statistical co-lead with phase-1 cash (0.85 vs 0.88, different roles), decisively above
          Treasuries — <b>without</b> being promoted to universal in the historical taxonomy, where its dot-com failure
          stands. Sensitivity: doubling the entry-valuation weight yields Cash 0.89 &gt; Gold 0.78 &gt; CHF 0.57 — the
          podium holds.
        </p>
      </div>

      <div style={{ ...S.panel, padding: "12px 16px", marginTop: 12, borderLeft: "3px solid #78829a" }}>
        <div style={{ ...S.eyebrow, marginBottom: 5 }}>Honest limits</div>
        <p style={{ margin: 0, fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.65 }}>
          Historical templates are stylized anchor reconstructions; only the 2026 series are real market backfill.
          Monthly resolution (n = 60 returns) is thin for every method here — published versions use daily data. The
          LPPL fit failed its formal qualification; the raw bubble flag proved seed-sensitive; fan charts are
          conditional historical distributions under a constructed peak-at-today, not forecasts. Nothing on this
          dashboard is investment advice.
        </p>
      </div>
    </div>
  );
}

/* ---------- Playbook tab (ex-ante identification protocol + expert buy-list mapping) ---------- */

const METHODS = [
  { id: "M0", name: "Crisis-type & likelihood", sig: "Rapid credit + asset-price growth → ~40% three-year crisis odds vs ~7% baseline; classify deflation / inflation / funding-stress.", cite: "Schularick & Taylor 2012 AER · Greenwood, Hanson, Shleifer & Sørensen 2022 JF", veto: null },
  { id: "M1", name: "Safe-haven econometrics", sig: "Rolling crisis-beta: is the asset flat/negative in the market's worst 5%/1% days? The haven effect decays ~15 trading days after a shock — never chase it.", cite: "Baur & Lucey 2010 · Baur & McDermott 2010 JBF · Engle 2002 (DCC)", veto: null },
  { id: "M2", name: "Bubble-perimeter & adjacency", sig: "Map what is INSIDE the bubble (run-up size, issuance, firm age, turnover) plus revenue/supply-chain adjacency — then stand outside it.", cite: "Greenwood, Shleifer & You 2019 JFE · Barrot & Sauvagnat 2016 QJE", veto: "Bubble-adjacency vetoes any 'defensive' label." },
  { id: "M3", name: "Balance-sheet resilience", sig: "Cash-rich, low-leverage, low-payout firms fell 26% (9.7 pp) less in COVID — all knowable from statements beforehand; quality/low-beta as ex-ante safety.", cite: "Fahlenbrach, Rageth & Stulz 2021 RFS · Duchin et al. 2010 JFE · Asness et al. 2019 QMJ", veto: null },
  { id: "M4", name: "Duration mapping", sig: "Long-duration growth assets mechanically fall hardest when growth/discount assumptions break; dividend futures measure the break in real time.", cite: "Gormsen & Koijen 2020 RAPS · Gormsen & Lazarus 2023 JF · Weber 2018 JFE", veto: null },
  { id: "M5", name: "Regime-matched class", sig: "Deflation → duration · Inflation → gold/real assets · Funding stress → USD cash. Watch breakevens and the dollar to classify in real time.", cite: "Baur & McDermott 2012 (WP) · Cheema, Ryan & Sarwar 2025 IREF", veto: null },
  { id: "M6", name: "Valuation-spread extremes", sig: "Buy the wide side of extreme spreads: the 2000 value spread, relative CAPE (US ~38–40 vs cheap EAFE/EM), gold/silver ratio.", cite: "Cohen, Polk & Vuolteenaho 2003 JF · Campbell & Shiller 1998 JPM", veto: null },
  { id: "M7", name: "Mandated vs contingent demand", sig: "Does the cash flow survive the bubble's death? Mandated (NATO budgets, grid/EV copper) vs bubble-contingent (merchant AI power, GPU capex).", cite: "Barsky & Summers 1988 JPE · Burdekin & Weidenmier 2004 · IEA 2025", veto: "An M7 pass qualifies Phase-3 only, unless demand is contractually mandated." },
  { id: "M8", name: "Carry & crowding", sig: "Is the hedge already pre-paid? A high real gold price predicts weak 10-yr returns; hedges bought after big hedge-demand run-ups underperform.", cite: "Erb & Harvey 2013 FAJ · Koijen, Moskowitz, Pedersen & Vrugt 2018 JFE", veto: "Extreme crowding halves the position size." },
  { id: "M9", name: "Survivability & marginal holder", sig: "Who owns it, with how much leverage? Levered arb holders → forced sales (convertibles −34% in 2008; portfolio insurance caused 1987).", cite: "Mitchell & Pulvino 2012 JFE · Gennotte & Leland 1990 AER · Brunnermeier & Pedersen 2009 RFS", veto: "M9 failure vetoes any Phase-0/1 hedge role." },
  { id: "M10", name: "Flow confirmation", sig: "Slow-moving confirmation: money-market inflows, central-bank reserve shifts (gold 27% > UST 22%, ECB Jun 2026). Confirms — it does not lead.", cite: "Baele et al. 2020 RFS · Coval & Stafford 2007 JFE", veto: null },
];

const PB_COLS = ["M1", "M2", "M3/4", "M5", "M6", "M7", "M8", "M9", "M10"];
const PB_VERDICTS = [
  { a: "Defense / aerospace", cells: { "M1": "F", "M2": "F", "M6": "F", "M7": "P*", "M8": "F", "M9": "C", "M10": "C" }, v: "COND · P3 (halved)", col: "#B48CE0",
    note: "Mandated NATO budgets pass M7 — but the June-2026 Rheinmetall F126 cancellation (−18% in a day) shows program-level risk, and M8 crowding halves the size. A Phase-3 satellite, never a hedge." },
  { a: "Utilities / infrastructure", cells: { "M1": "F", "M2": "F", "M3/4": "F", "M6": "F", "M7": "S" }, v: "DEMOTE (as haven)", col: "#E8853D",
    note: "The decisive test is M2: utilities coupled to the AI-power trade in 2024–26 (tracked the S&P, at times outpaced the Nasdaq-100) — the defensive correlation is broken. Only regulated rate-base pure-plays keep a weak Phase-3 case." },
  { a: "Copper / miners", cells: { "M1": "F", "M2": "P", "M6": "P", "M7": "P", "M8": "C", "M9": "C" }, v: "COND · Phase-3 riser", col: "#C05A32",
    note: "Falls hard in every liquidity phase (2008 −69%, 2020) — M9 vetoes Phase 0/1. But the IEA ~30% supply deficit by 2035 is mostly grid/EV-mandated (AI datacenters only ~1–2% of demand), so the structural case survives the bubble's death: a high-conviction Phase-3 buy." },
  { a: "India equities", cells: { "M1": "F", "M2": "P", "M3/4": "C", "M6": "P", "M9": "C", "M10": "C" }, v: "COND · P3 (weak USD)", col: "#8FAE5D",
    note: "High-beta EM, not a hedge (−60% USD in 2008). But post-correction valuations are near long-term averages and record domestic SIP flows floored the 2026 drawdown at ~13–14% against record FII outflows. Conditional on the weak-dollar regime and the SIP floor holding (stoppage ratio >100% is the warning light)." },
  { a: "Convertible bonds", cells: { "M1": "F", "M9": "C" }, v: "COND (M9 flag)", col: "#9AA3B5",
    note: "The 2008 crash was an ownership problem: ~80–85% arb-held with 3–5× leverage → forced sales (Mitchell-Pulvino). Today's holder base is long-only-dominated, so the flag softens — but hardens back to a veto if arb crowding returns toward 2008 levels." },
  { a: "EM / Intl / Japan", cells: { "M1": "C", "M2": "P", "M6": "P", "M9": "C", "M10": "P" }, v: "COND · P3", col: "#5AA9A3",
    note: "The validated 2002–07 precedent: after the US-centric dot-com bust, EAFE beat the S&P and EM won by ~10%/yr. Today the relative-CAPE gap is wide again and Japan/Europe carry the lowest AI/mega-cap adjacency (M2). Conditional on the weak-dollar regime (BIS dollar-cycle evidence)." },
  { a: "China", cells: { "M1": "C", "M2": "P", "M6": "P", "M9": "F", "M10": "F" }, v: "DEMOTE (state risk)", col: "#E8853D",
    note: "Cheapest headline CAPE, but the state is the 'marginal holder' — the M9-analog policy-intervention veto fires, and zero fresh expert confirmation in the final window agrees." },
  { a: "Silver", cells: { "M1": "F", "M2": "P", "M6": "C", "M7": "C", "M8": "F", "M9": "C" }, v: "COND · P2/3 catch-up", col: "#CFD6DD",
    note: "Classic pattern: falls harder than gold in the panic, outperforms in the recovery (~+400% 2009–11). But the gold/silver ratio extreme (~100 in Apr 2025) already compressed to ~60 — the easy catch-up trade is largely played out; a smaller Phase-2/3 role remains." },
  { a: "TIPS", cells: { "M3/4": "P", "M5": "P", "M9": "C", "M10": "P" }, v: "COND (inflation branch)", col: "#8FB0F5",
    note: "The inflation half of the unresolved regime fork (M5). Caveat: TIPS broke down in the 2008 and March-2020 liquidity crunches (−12% in 2008; Fleckenstein-Longstaff-Lustig puzzle) — hold through Phase 1, don't rely on it during the dash-for-cash." },
];

/* eToro instrument map — verified market-page slugs (research pass, Jul 2026).
   t: 0 = Real asset for EU retail (UCITS ETF/ETC or plain stock) · 1 = page exists but
   CFD-only for EU retail (US-domiciled fund under PRIIPs/KID) · 2 = CFD by nature (commodity/FX). */
const EBASE = "https://www.etoro.com/markets/";
const ET = {
  psg:  { n: "8PSG.DE", u: "8psg.de", t: 0 }, wgld: { n: "WGLD.L", u: "wgld.l", t: 0 },
  gld:  { n: "GLD", u: "gld", t: 1 }, iau: { n: "IAU", u: "iau", t: 1 }, phys: { n: "PHYS", u: "phys", t: 1 },
  gold: { n: "Gold spot", u: "gold", t: 2 },
  shv:  { n: "SHV", u: "shv", t: 1 }, bil: { n: "BIL", u: "bil", t: 1 }, sgov: { n: "SGOV", u: "sgov", t: 1 },
  shy:  { n: "SHY", u: "shy", t: 1 }, ief: { n: "IEF", u: "ief", t: 1 }, tlt: { n: "TLT", u: "tlt", t: 1 },
  agg:  { n: "AGG", u: "agg", t: 1 },
  tip:  { n: "TIP", u: "tip", t: 1 }, ibc5: { n: "IBC5.DE", u: "ibc5.de", t: 0 },
  usdchf: { n: "USD/CHF (sell = long CHF)", u: "usdchf", t: 2 },
  rsp:  { n: "RSP", u: "rsp", t: 1 }, schd: { n: "SCHD", u: "schd", t: 1 }, nobl: { n: "NOBL", u: "nobl", t: 1 },
  vgwd: { n: "VGWD.DE", u: "vgwd.de", t: 0 }, brkb: { n: "BRK.B", u: "brk.b", t: 0 },
  efa:  { n: "EFA", u: "efa", t: 1 }, vgk: { n: "VGK", u: "vgk", t: 1 }, vxus: { n: "VXUS", u: "vxus", t: 1 },
  swda: { n: "SWDA.L", u: "swda.l", t: 0 }, vwrd: { n: "VWRD.L", u: "vwrd.l", t: 0 },
  ewj:  { n: "EWJ", u: "ewj", t: 1 }, dxja: { n: "DXJA.L", u: "dxja.l", t: 0 },
  eem:  { n: "EEM", u: "eem", t: 1 }, vwo: { n: "VWO", u: "vwo", t: 1 },
  inda: { n: "INDA", u: "inda", t: 1 }, epi: { n: "EPI", u: "epi", t: 1 },
  ewz:  { n: "EWZ", u: "ewz", t: 1 }, ilf: { n: "ILF", u: "ilf.us", t: 1 },
  copx: { n: "COPX", u: "copx", t: 1 }, fcx: { n: "FCX", u: "fcx", t: 0 },
  copper: { n: "Copper fut.", u: "copper.fut", t: 2 },
  ita:  { n: "ITA", u: "ita", t: 1 }, rhm: { n: "RHM.DE", u: "rhm.de", t: 0 }, bal: { n: "BA.L", u: "ba.l", t: 0 },
  slv:  { n: "SLV", u: "slv", t: 1 }, slvr: { n: "SLVR.L", u: "slvr.l", t: 0 }, sil: { n: "SIL", u: "sil", t: 1 },
  g2x:  { n: "G2X.DE", u: "g2x.de", t: 0 }, gdx: { n: "GDX", u: "gdx", t: 1 },
  xlv:  { n: "XLV", u: "xlv", t: 1 }, kxi: { n: "KXI", u: "kxi", t: 1 }, xlp: { n: "XLP", u: "xlp", t: 1 },
  xlu:  { n: "XLU", u: "xlu", t: 1 }, igf: { n: "IGF", u: "igf", t: 1 },
  mchi: { n: "MCHI", u: "mchi", t: 1 }, fxi: { n: "FXI", u: "fxi", t: 1 }, emb: { n: "EMB", u: "emb", t: 1 },
  uup:  { n: "UUP", u: "uup", t: 1 }, vt: { n: "VT", u: "vt.us", t: 1 }, acwi: { n: "ACWI", u: "acwi", t: 1 },
  eurusd: { n: "EUR/USD", u: "eurusd", t: 2 }, usdjpy: { n: "USD/JPY", u: "usdjpy", t: 2 },
};
const ET_TAG = [
  { l: "Real (EU)", c: "#7fbf94" },
  { l: "CFD-only (EU)", c: "#d9b45c" },
  { l: "CFD", c: "#e08a8a" },
];
function Elink({ k }) {
  const e = ET[k];
  if (!e) return null;
  const tag = ET_TAG[e.t];
  return (
    <a href={EBASE + e.u} target="_blank" rel="noopener noreferrer" title={`eToro: ${e.n} — ${tag.l}`} style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 9px", borderRadius: 999,
      border: `1px solid ${tag.c}55`, background: "rgba(237,232,220,0.04)", textDecoration: "none",
      fontSize: 10.5, fontWeight: 700, color: "#D9DCE4", whiteSpace: "nowrap",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: tag.c, flexShrink: 0 }} />
      {e.n} <span style={{ color: "#78829a", fontWeight: 400 }}>↗</span>
    </a>
  );
}

const PB_STEPS = [
  { k: "p0", num: "0", t: "Now", s: "build the anchor" },
  { k: "p1", num: "1", t: "Crash", s: "hold — buy nothing" },
  { k: "p2", num: "2", t: "Fork", s: "regime confirms" },
  { k: "p3", num: "3", t: "Trough", s: "rotate into winners" },
];

const PB_PHASES = {
  p0: { items: [
    { tick: "BIL · SGOV", name: "Cash & T-bills", w: 30, c: "#BBCF6A", m: ["M5", "M9"], r: "No leverage problem, positive carry — the dry powder.", et: ["shv", "bil"] },
    { tick: "GOLD", name: "Physical-gold ETC", w: 20, c: "#E0B458", m: ["M1", "M5", "M10", "M8↓"], r: "Lead regime hedge — halved because the hedge is partly pre-paid.", et: ["psg", "gld"] },
    { tick: "QUALITY", name: "RSP · SCHD quality sleeve", w: 20, c: "#74B06F", m: ["M3"], r: "Resilient balance sheets; AI-adjacent 'defensives' screened out.", et: ["rsp", "schd", "vgwd"] },
    { tick: "SHORT UST", name: "1–7yr Treasuries", w: 15, c: "#5B8DEF", m: ["M4", "M5"], r: "Duration kept SHORT after April 2025.", et: ["shy", "ief"] },
    { tick: "TIPS", name: "Inflation-linked", w: 10, c: "#8FB0F5", m: ["M5"], r: "The inflation branch; expect a Phase-1 wobble.", et: ["ibc5", "tip"] },
    { tick: "CHF", name: "Swiss franc", w: 5, c: "#7EC8E3", m: ["M1"], r: "Secondary haven. On eToro only as FX CFD: long CHF = SELL USD/CHF.", et: ["usdchf"] },
  ]},
  p1: { rules: [
    "Hold cash — sitting still IS the strategy.",
    "Do NOT add gold after the shock: the haven effect fades in ~15 trading days (M1) and the hedge is pre-paid (M8).",
    "Copper, silver, EM, India, defense are Phase-1 FALLERS — set Phase-3 buy levels, don't catch knives.",
    "Even gold and TIPS can dip in the dash-for-cash (2008 · Mar 2020). Cash is the only certainty.",
  ]},
  p2: { fork: [
    { t: "INFLATION branch confirms", cond: "breakevens rising", c: "#E0B458", d: "Add gold miners + silver catch-up; hold TIPS; keep duration short.", m: ["M5", "M6", "M7"], et: ["g2x", "slvr"] },
    { t: "DEFLATION branch confirms", cond: "growth shock, breakevens falling", c: "#5B8DEF", d: "Extend duration into long Treasuries — accepting the post-April-2025 caveat; hold CHF.", m: ["M5"], et: ["tlt"] },
  ]},
  p3: { items: [
    { tick: "RSP", name: "Equal-weight & small-value", w: 20, c: "#74B06F", m: ["M6"], r: "The documented post-bubble rotation (+16.2%/yr 2000–07).", et: ["rsp"] },
    { tick: "INTL", name: "Japan/Europe developed", w: 20, c: "#5AA9A3", m: ["M6", "M2"], r: "Widest relative-CAPE gap, lowest AI adjacency — the 2002–07 precedent.", et: ["efa", "vgk", "dxja"] },
    { tick: "EM", name: "Emerging ex-China", w: 15, c: "#8FAE5D", m: ["M5", "M6"], r: "Weak-dollar conditional; China stripped out (M9 veto).", et: ["vwo", "eem"] },
    { tick: "COPPER", name: "Copper miners", w: 15, c: "#C05A32", m: ["M7"], r: "Grid/EV-mandated deficit demand; M9 veto lifts at the trough.", et: ["copx", "fcx"] },
    { tick: "DEFENSE", name: "Broad defense", w: 15, c: "#B48CE0", m: ["M7", "M8↓"], r: "Mandated aggregate spend; avoid single programs (F126 lesson).", et: ["ita", "rhm"] },
    { tick: "SILVER", name: "Silver catch-up", w: 15, c: "#CFD6DD", m: ["M6", "M7"], r: "Late catch-up, sized down — the ratio extreme already compressed.", et: ["slvr", "slv"] },
  ]},
};

const PB_EXPERT = [
  { rk: 1, sym: "GLD IAU PHYS", name: "Gold (physical / ETC)", score: 66, srcs: 15, fresh: "10+", bias: 3, v: "CORE · Phase 0 (20%)", ag: "✓", col: "#E0B458", et: ["psg", "gld", "iau"],
    note: "Experts' #1 = the protocol's lead regime hedge. M8 crowding is exactly why the weight is 20% and not 30%.", refs: "Dalio, UBS (Jun 12), JPMorgan, StanChart (Jun 19), Deutsche Bank (Jun 23), Morgan Stanley, GMO, XP, BofA/Hartnett, State Street (Jul), Gulf SWFs (Jun 30), Julius Baer (Jun 26), Amundi (Jul 1), BMO GAM (Jun 22), SocGen flows (Jul 1)" },
  { rk: 2, sym: "VXUS EFA VGK", name: "International / non-US developed", score: 44, srcs: 11, fresh: "5", bias: 2.5, v: "P3 · 20%", ag: "±", col: "#5AA9A3", et: ["vxus", "efa", "vgk"],
    note: "Protocol agrees on the asset, differs on timing: a post-trough Phase-3 buy (M6/M2 pass), not a hedge now (M1 fails).", refs: "Grantham/GMO (Jul 8), Hartnett, StanChart, State Street, Amundi, Dalio, UBS, JPMorgan, Morgan Stanley, Deutsche Bank, Macquarie" },
  { rk: 3, sym: "EEM VWO IEMG", name: "Emerging-market equities", score: 40, srcs: 10, fresh: "4", bias: 2.5, v: "P3 · 15% ex-China", ag: "±", col: "#8FAE5D", et: ["vwo", "eem"],
    note: "Weak-dollar conditional (M5); the protocol strips China out of the sleeve.", refs: "Hartnett, GMO, Amundi, BlackRock/iShares, Dalio, JPMorgan, GSAM, StanChart, Morgan Stanley, Mobius" },
  { rk: 4, sym: "XLV VHT IXJ", name: "Healthcare (defensive)", score: 40, srcs: 8, fresh: "5", bias: 2, v: "Relative mitigator", ag: "±", col: "#9AA3B5", et: ["xlv"],
    note: "Falls less, doesn't rise — no absolute-haven role in any phase (Baur–McDermott framework).", refs: "Schwab (Jun 26), GQG, JPMorgan, Amundi, RBC WM, Morgan Stanley, Cetera, Deutsche Bank" },
  { rk: 5, sym: "TLT IEF AGG LQD", name: "Quality bonds — govt & IG duration", score: 39, srcs: 9, fresh: "5", bias: 3, v: "Challenged · short-dur only", ag: "✗", col: "#5B8DEF", et: ["tlt", "ief", "agg"],
    note: "The sharpest divergence: experts rank duration #5; the protocol keeps it SMALL and SHORT after April 2025 (BIS: haven correlations ≈ 0). The CSV itself flags the contest.", refs: "Hartnett (Jul 6), Deutsche Bank (Jul 6), State Street (Jun 30), Julius Baer, Amundi, Morgan Stanley, UBS, JPMorgan, StanChart — haven status contested (BIS Jun 28)" },
  { rk: 6, sym: "XLP VDC KXI", name: "Consumer staples", score: 33, srcs: 6, fresh: "4", bias: 2, v: "Quality sleeve", ag: "±", col: "#74B06F", et: ["kxi", "xlp"],
    note: "Lives inside the Phase-0 quality tilt, screened for AI adjacency (M2).", refs: "Schwab (Jun 26), GQG, Amundi, RBC WM, JPMorgan" },
  { rk: 7, sym: "FXE FXA FXF FXY", name: "Non-USD currencies", score: 31, srcs: 5, fresh: "4", bias: 2, v: "CHF only (5%)", ag: "±", col: "#7EC8E3", et: ["usdchf", "eurusd", "usdjpy"],
    note: "The basket mixes a pass with a veto: protocol keeps CHF, drops JPY (falsified at ~¥162). eToro offers these only as FX-pair CFDs — CHF strength = SELL USD/CHF.", refs: "Amundi JPY/EUR (Jul 1), Hartnett bearish USD, UBS, Invesco, Deutsche Bank" },
  { rk: 8, sym: "EWZ ILF", name: "Latin America / Brazil", score: 30, srcs: 6, fresh: "3", bias: 2, v: "P3 satellite", ag: "±", col: "#8FAE5D", et: ["ewz", "ilf"],
    note: "Weak-dollar conditional. Druckenmiller's ~4.5% EWZ book position is a Phase-3-style bet made early.", refs: "Druckenmiller (Jul 6), 24/7 Wall St, Amundi, JPMorgan PB, Morgan Stanley, GBM" },
  { rk: 9, sym: "BIL SGOV SHV", name: "Short-term T-bills / cash", score: 28, srcs: 4, fresh: "3", bias: 1.5, v: "CORE · Phase 0 (30%)", ag: "✓", col: "#BBCF6A", et: ["shv", "bil", "sgov"],
    note: "Perfect agreement — the CSV's own note ('lowest bias, highest conviction') matches the protocol's #1-certainty score; Buffett's $397B cash is M10 flow confirmation in the flesh.", refs: "Berkshire record $397.4B cash / ~$339.3B T-bills (Jul 5), SocGen money-market flows (Jul 1), NAI 500, JPMorgan" },
  { rk: 10, sym: "SCHD VYM NOBL", name: "Dividend / quality equities", score: 27, srcs: 5, fresh: "3", bias: 2.5, v: "P0 20% + P3 20%", ag: "✓", col: "#74B06F", et: ["schd", "nobl", "vgwd", "brkb"],
    note: "The quality/dividend sleeve in both phases (M3 resilience).", refs: "SocGen flows (Jul 1), RBC WM, NAI 500, Buffett-style income commentary" },
  { rk: 11, sym: "IGF GII", name: "Global listed infrastructure", score: 27, srcs: 6, fresh: "4", bias: 4, v: "Demoted (bias-flagged)", ag: "✗", col: "#E8853D", et: ["igf"],
    note: "Experts rank it #11 — but with the HIGHEST bias score (4 = product sellers). The protocol finds only a mild inflation hedge, utilities-adjacent (M2).", refs: "Julius Baer (Jun 26), Macquarie (Jun 30), Deutsche Bank, Gulf SWFs, JPMorgan — high bias, product sellers" },
  { rk: 12, sym: "ITA RHM.DE BA.L", name: "Defense / aerospace", score: 26, srcs: 4, fresh: "3", bias: 2, v: "P3 · 15% (halved)", ag: "±", col: "#B48CE0", et: ["ita", "rhm", "bal"],
    note: "M7 mandated budgets pass; M8 crowding halves it; M2/M6 flag the run-up. A Phase-3 satellite, not a hedge — the F126 cancellation is the live warning.", refs: "Morgan Stanley/NOC (Jun 24), Nomura, Deutsche Bank, JPMorgan — conflict: VanEck Defense sold in Europe (Jul 1)" },
  { rk: 13, sym: "XLU VPU", name: "Utilities / power", score: 23, srcs: 4, fresh: "3", bias: 3, v: "DEMOTE as haven", ag: "✓", col: "#E8853D", et: ["xlu"],
    note: "Rare agreement on the negative: the CSV's Schwab flag = the protocol's M2 adjacency veto (AI-power coupling broke the defense).", refs: "Deutsche Bank (Jun 30), Gulf SWFs, JPMorgan — Schwab flags underperformance" },
  { rk: 14, sym: "COPX FCX", name: "Copper / miners", score: 23, srcs: 4, fresh: "3", bias: 3, v: "P3 · 15%", ag: "✓", col: "#C05A32", et: ["copx", "fcx", "copper"],
    note: "The CSV's own caveat ('cyclical diversifier, not classic haven') IS the protocol verdict: Phase-1 faller, Phase-3 riser (M7 pass, M9 veto until trough).", refs: "Goldman 2026 target $10,500/t, UBS, Hartnett, Deutsche Bank" },
  { rk: 15, sym: "INDA EPI", name: "India equities", score: 21, srcs: 6, fresh: "1", bias: 3, v: "P3 small · conditional", ag: "±", col: "#8FAE5D", et: ["epi", "inda"],
    note: "Only 1 fresh source in 3 weeks; protocol conditions it on the weak dollar and the domestic SIP floor holding (watch the >100% stoppage ratio).", refs: "Motilal Oswal (Jul 4, thesis Feb), JPMorgan, UBS, Nomura, StanChart, Mobius" },
  { rk: 16, sym: "TIP", name: "Inflation-linked bonds (TIPS)", score: 21, srcs: 3, fresh: "2", bias: 2, v: "P0 · 10%", ag: "✓", col: "#8FB0F5", et: ["ibc5", "tip"],
    note: "The inflation branch of the regime fork (M5); the protocol adds the Phase-1 liquidity caveat (2008/2020 breakdowns).", refs: "BMO GAM (Jun 22), Amundi (Jul 1), Dalio (pre-window)" },
  { rk: 17, sym: "RSP", name: "Equal-weight S&P 500", score: 20, srcs: 4, fresh: "1", bias: 2, v: "P0 toe-hold + P3 · 20%", ag: "✓", col: "#74B06F", et: ["rsp"],
    note: "The documented post-bubble rotation (M6 — the 2000 value-spread precedent).", refs: "Amundi (Jul 1), Cetera, Druckenmiller (held), Morningstar" },
  { rk: 18, sym: "URTH ACWI VT", name: "Broad world equity ETFs", score: 19, srcs: 2, fresh: "2", bias: 2, v: "NO ROLE", ag: "✗", col: "#E05252", et: ["vwrd", "swda", "vt"],
    note: "The starkest divergence: world ETFs are ~64%-weighted to the crashing asset (US mega-caps). The 'de-concentration' flow argues for ex-US — not world. (Links shown for reference; UCITS lines are the EU-ownable versions.)", refs: "SocGen — world ETFs = 40% of Frankfurt turnover (Jul 1), Amundi" },
  { rk: 19, sym: "EWJ DXJ", name: "Japan equities", score: 19, srcs: 5, fresh: "1", bias: 3, v: "P3 tilt", ag: "±", col: "#5AA9A3", et: ["dxja", "ewj"],
    note: "Lowest AI-adjacency developed market (M2) — but only one fresh confirmation.", refs: "Nomura constructive, UBS, JPMorgan, Dalio, Macquarie, HSBC (Q1 upgrade)" },
  { rk: 20, sym: "MCHI KWEB FXI", name: "China equities / tech", score: 14, srcs: 4, fresh: "0", bias: 3, v: "DEMOTE", ag: "✓", col: "#E8853D", et: ["mchi", "fxi"],
    note: "Zero fresh sources + the protocol's state-intervention M9-analog — both say stand aside despite the cheapest headline CAPE.", refs: "UBS, Hartnett (Apr/May), JPMorgan, Mobius — no fresh confirmation" },
  { rk: 21, sym: "EMB VWOB", name: "EM bonds", score: 13, srcs: 2, fresh: "1", bias: 3, v: "DEMOTE P0/1", ag: "✓", col: "#E8853D", et: ["emb"],
    note: "Dollar-funding sensitivity in the acute phase; thin sourcing agrees.", refs: "Julius Baer (Jun 26), HSBC (pre-window)" },
  { rk: 22, sym: "SLV SIL", name: "Silver / silver miners", score: 12, srcs: 3, fresh: "0", bias: 3, v: "P2/3 · 15%", ag: "±", col: "#CFD6DD", et: ["slvr", "slv", "sil"],
    note: "No fresh expert confirmation AND the gold/silver-ratio extreme already played out (≈100 → ≈60) — the protocol keeps a smaller catch-up role.", refs: "UBS ('25, targets cut Jun), Dalio, XP — miner ETFs sold per Frankfurt flows (Jul 1)" },
  { rk: 23, sym: "UUP", name: "US dollar (protection sleeve)", score: 11, srcs: 1, fresh: "1", bias: 3, v: "Funding-stress only", ag: "±", col: "#9AA3B5", et: ["uup"],
    note: "One source contradicting the majority; protocol: USD spikes only in the acute dash-for-cash, weakened by de-dollarization (worst H1 since 1973).", refs: "Banco Safra (Jul 3) — contradicts Hartnett/UBS/Amundi non-USD preference" },
  { rk: 24, sym: "CWB", name: "Convertible bonds", score: 8, srcs: 1, fresh: "1", bias: 4, v: "M9 flag", ag: "✓", col: "#9AA3B5", et: [],
    note: "Bottom rank + highest issuer bias (State Street sells the product) + the protocol's marginal-holder flag all align — the 2008 lesson stands. (No confirmed eToro listing for CWB.)", refs: "State Street (Jun 30) — record 2026 inflows; high issuer bias" },
];

function Playbook() {
  const [mSel, setMSel] = useState("M9");
  const [vSel, setVSel] = useState(null);
  const [phase, setPhase] = useState("p0");
  const [filter, setFilter] = useState("all");
  const method = METHODS.find((m) => m.id === mSel);
  const cellSt = (v) => {
    if (v === "P" || v === "P*") return { bg: "rgba(58,141,94,0.75)", fg: "#0E1526" };
    if (v === "F") return { bg: "rgba(178,70,70,0.7)", fg: "#0E1526" };
    if (v === "C" || v === "S") return { bg: "rgba(178,141,52,0.65)", fg: "#0E1526" };
    return { bg: "transparent", fg: "#0E1526" };
  };
  const agCol = { "✓": "#7fbf94", "±": "#d9b45c", "✗": "#e08a8a" };
  const experts = PB_EXPERT.filter((e) => filter === "all" || e.ag === filter);
  return (
    <div>
      <div style={{ ...S.panel, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <h2 style={{ ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 }}>The ex-ante playbook — and today's expert buy-list</h2>
          <Expl>
            <b>This tab in one breath.</b> Instead of asking "what went up in past crises" (the other tabs), this asks
            "HOW could you have KNOWN in advance?" — and assembles, from the academic literature, the ten-screen
            checklist that would have found the winners and vetoed the traps (like convertibles in 2008 or portfolio
            insurance in 1987). Then it runs every candidate asset through the checklist, builds the phased buy plan,
            and finally holds it against what experts recommend RIGHT NOW (your research artifact) — showing exactly
            where academic method and current consensus agree, partly agree, or clash.
          </Expl>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 }}>
          Ten ordered screens (M0–M10) with four veto rules → per-asset verdicts → a simple phased selection →
          mapped against the 24-asset expert-consensus table. Historical/analytical synthesis, not investment advice.
        </p>
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>The identification protocol — tap a screen</div>
          <Expl>
            <b>How to use it.</b> Run the screens in order, like airport security for assets: first classify the coming
            crisis (M0) and map what's inside the bubble (M2), then check the regime fit, the crash-day statistics, the
            balance sheet, the valuation gap, whether the demand survives the bubble's death, whether the hedge is
            already expensive — and finally the two killer questions: who OWNS this asset with how much leverage (M9),
            and do the big slow flows confirm (M10)? The four red veto rules are absolute — they exist because every
            famous "safe" asset that failed (convertibles '08, portfolio insurance '87, AAA-CDOs) failed on exactly one
            of them.
          </Expl>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
          {METHODS.map((m) => (
            <button key={m.id} onClick={() => setMSel(m.id)} style={{
              padding: "5px 10px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
              border: `1px solid ${m.id === mSel ? "#E0B458" : m.veto ? "rgba(224,133,61,0.5)" : "rgba(237,232,220,0.16)"}`,
              background: m.id === mSel ? "rgba(224,180,88,0.12)" : "transparent",
              color: m.id === mSel ? "#EDE8DC" : m.veto ? "#E8B48A" : "#9AA3B5",
            }}>{m.id}{m.veto ? " ⛔" : ""}</button>
          ))}
        </div>
        {method && (
          <div style={{ padding: "10px 12px", background: "rgba(237,232,220,0.04)", borderRadius: 8, borderLeft: `3px solid ${method.veto ? "#E8853D" : "#5B8DEF"}` }}>
            <div style={{ fontSize: 13.5, color: "#EDE8DC", fontWeight: 700, marginBottom: 4 }}>{method.id} — {method.name}</div>
            <div style={{ fontSize: 12.5, color: "#C7CBD6", lineHeight: 1.6 }}>{method.sig}</div>
            {method.veto && <div style={{ fontSize: 12, color: "#E8B48A", marginTop: 6 }}><b>VETO RULE:</b> {method.veto}</div>}
            <div style={{ fontSize: 10.5, color: "#78829a", marginTop: 6 }}>{method.cite}</div>
          </div>
        )}
      </div>

      <div style={{ ...S.panel, marginTop: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "14px 16px 6px" }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Verdict matrix — every outlier through every screen</div>
          <Expl>
            <b>Reading the grid.</b> Green P = the asset passes that screen (P* = passes because the demand is
            contractually mandated). Red F = fails or is flagged. Amber C/S = conditional or split. The verdict on the
            right follows the veto rules mechanically — not opinion. Tap a row for the one-paragraph story.
          </Expl>
        </div>
        <table style={{ borderCollapse: "collapse", width: "100%", minWidth: 760, fontSize: 11.5 }}>
          <thead><tr>
            <th style={{ textAlign: "left", padding: "8px 12px", position: "sticky", left: 0, background: "#141D31", ...S.eyebrow }}>Asset</th>
            {PB_COLS.map((c) => <th key={c} style={{ padding: "8px 3px", color: "#9AA3B5", fontWeight: 600, fontSize: 10 }}>{c}</th>)}
            <th style={{ textAlign: "left", padding: "8px 10px", ...S.eyebrow }}>Verdict</th>
          </tr></thead>
          <tbody>
            {PB_VERDICTS.map((r, i) => (
              <tr key={r.a} onClick={() => setVSel(vSel === i ? null : i)} style={{ borderTop: "1px solid rgba(237,232,220,0.07)", cursor: "pointer", background: vSel === i ? "rgba(224,180,88,0.05)" : "transparent" }}>
                <td style={{ padding: "7px 12px", position: "sticky", left: 0, background: "#141D31", color: "#EDE8DC", fontWeight: 600, whiteSpace: "nowrap" }}>{r.a}</td>
                {PB_COLS.map((c) => {
                  const v = r.cells[c] || "";
                  const st = cellSt(v);
                  return <td key={c} style={{ padding: 3, textAlign: "center" }}>
                    <span style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 22, borderRadius: 5, background: st.bg, color: st.fg, fontWeight: 800, fontSize: 10.5, border: "1px solid rgba(237,232,220,0.07)" }}>{v}</span>
                  </td>;
                })}
                <td style={{ padding: "7px 10px", color: r.col, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" }}>{r.v}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {vSel != null && (
          <div style={{ margin: "8px 14px 14px", padding: "10px 12px", borderLeft: "3px solid #E0B458", background: "rgba(237,232,220,0.03)", fontSize: 12.5, color: "#D9DCE4", lineHeight: 1.6, borderRadius: 6 }}>
            <b style={{ color: PB_VERDICTS[vSel].col }}>{PB_VERDICTS[vSel].a}:</b> {PB_VERDICTS[vSel].note}
          </div>
        )}
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>The phased selection — traceable to methods</div>
          <Expl>
            <b>Why phases?</b> Because the same asset can be right and wrong depending on WHEN: copper is a Phase-1
            casualty and a Phase-3 winner. Phase 0 = position now, while calm. Phase 1 = the crash itself: hold cash,
            buy nothing falling. Phase 2 = the regime reveals itself (inflation → gold/real assets; deflation → longer
            bonds). Phase 3 = the post-trough rotation, where the retrospective "smart money" of every past crisis did
            its buying. Weights are illustrative round numbers; every line names the screen that put it there.
          </Expl>
        </div>
        {/* phase stepper */}
        <div style={{ display: "flex", alignItems: "flex-start", marginBottom: 14 }}>
          {PB_STEPS.map((st, i) => (
            <React.Fragment key={st.k}>
              {i > 0 && <div style={{ flex: 1, height: 2, background: "rgba(237,232,220,0.12)", marginTop: 15, minWidth: 8 }} />}
              <button onClick={() => setPhase(st.k)} style={{ background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "center", width: 74 }}>
                <div style={{
                  width: 32, height: 32, borderRadius: 99, margin: "0 auto 5px", display: "flex", alignItems: "center", justifyContent: "center",
                  fontFamily: "Georgia, serif", fontWeight: 700, fontSize: 14.5,
                  background: phase === st.k ? "#E0B458" : "rgba(237,232,220,0.06)",
                  color: phase === st.k ? "#0E1526" : "#9AA3B5",
                  border: `1.5px solid ${phase === st.k ? "#E0B458" : "rgba(237,232,220,0.2)"}`,
                }}>{st.num}</div>
                <div style={{ fontSize: 11.5, fontWeight: 700, color: phase === st.k ? "#EDE8DC" : "#9AA3B5" }}>{st.t}</div>
                <div style={{ fontSize: 9, color: "#78829a", lineHeight: 1.25, marginTop: 1 }}>{st.s}</div>
              </button>
            </React.Fragment>
          ))}
        </div>

        {(phase === "p0" || phase === "p3") && (() => {
          const items = PB_PHASES[phase].items;
          return (
            <>
              {/* single 100% allocation bar */}
              <div style={{ display: "flex", height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(237,232,220,0.1)" }}>
                {items.map((it) => (
                  <div key={it.tick} title={`${it.name} — ${it.w}%`} style={{
                    width: `${it.w}%`, background: it.c, opacity: 0.88, display: "flex", alignItems: "center",
                    justifyContent: "center", color: "#0E1526", fontSize: 10.5, fontWeight: 800, overflow: "hidden", whiteSpace: "nowrap",
                  }}>{it.w >= 10 ? `${it.w}%` : ""}</div>
                ))}
              </div>
              <div style={{ display: "flex", gap: "4px 12px", flexWrap: "wrap", margin: "6px 2px 12px" }}>
                {items.map((it) => (
                  <span key={it.tick} style={{ fontSize: 9.5, color: "#9AA3B5", display: "inline-flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: it.c, display: "inline-block" }} />{it.tick} {it.w}%
                  </span>
                ))}
              </div>
              {/* position cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 }}>
                {items.map((it) => (
                  <div key={it.tick} style={{ borderRadius: 10, background: "rgba(237,232,220,0.03)", border: "1px solid rgba(237,232,220,0.08)", borderLeft: `3px solid ${it.c}`, padding: "10px 12px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <div>
                        <div style={{ ...S.serif, fontSize: 15.5, fontWeight: 700, color: "#EDE8DC" }}>{it.tick}</div>
                        <div style={{ fontSize: 10.5, color: "#9AA3B5", marginTop: 1 }}>{it.name}</div>
                      </div>
                      <div style={{ ...S.serif, fontSize: 22, fontWeight: 700, color: it.c }}>{it.w}<span style={{ fontSize: 12 }}>%</span></div>
                    </div>
                    <div style={{ fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.55, margin: "6px 0 7px" }}>{it.r}</div>
                    <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                      {it.m.map((mm) => (
                        <span key={mm} style={{ fontSize: 9, fontWeight: 700, color: "#8FA0C9", border: "1px solid rgba(143,160,201,0.35)", borderRadius: 4, padding: "1.5px 5px" }}>{mm}</span>
                      ))}
                      <span style={{ flexBasis: "100%" }} />
                      {it.et.map((k) => <Elink key={k} k={k} />)}
                    </div>
                  </div>
                ))}
              </div>
            </>
          );
        })()}

        {phase === "p1" && (
          <div style={{ borderRadius: 10, background: "rgba(224,82,82,0.05)", border: "1px solid rgba(224,82,82,0.25)", padding: "12px 14px" }}>
            <div style={{ ...S.serif, fontSize: 16, fontWeight: 700, color: "#FF9A8C", marginBottom: 8 }}>Hold. Buy nothing. (0–3 months)</div>
            {PB_PHASES.p1.rules.map((r, i) => (
              <div key={i} style={{ display: "flex", gap: 8, fontSize: 12, color: "#D9DCE4", lineHeight: 1.6, padding: "4px 0", borderTop: i ? "1px solid rgba(237,232,220,0.05)" : "none" }}>
                <span style={{ color: "#E0B458", fontWeight: 800 }}>{i + 1}</span><span>{r}</span>
              </div>
            ))}
          </div>
        )}

        {phase === "p2" && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 10 }}>
            {PB_PHASES.p2.fork.map((f) => (
              <div key={f.t} style={{ borderRadius: 10, background: "rgba(237,232,220,0.03)", border: "1px solid rgba(237,232,220,0.08)", borderTop: `3px solid ${f.c}`, padding: "11px 13px" }}>
                <div style={{ fontWeight: 800, color: f.c, fontSize: 12.5 }}>{f.t}</div>
                <div style={{ fontSize: 10, color: "#78829a", marginBottom: 6 }}>signal: {f.cond}</div>
                <div style={{ fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.6, marginBottom: 8 }}>{f.d}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" }}>
                  {f.m.map((mm) => (
                    <span key={mm} style={{ fontSize: 9, fontWeight: 700, color: "#8FA0C9", border: "1px solid rgba(143,160,201,0.35)", borderRadius: 4, padding: "1.5px 5px" }}>{mm}</span>
                  ))}
                  {f.et.map((k) => <Elink key={k} k={k} />)}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* eToro access legend */}
        <div style={{ display: "flex", gap: "4px 14px", flexWrap: "wrap", alignItems: "center", marginTop: 12, paddingTop: 9, borderTop: "1px solid rgba(237,232,220,0.07)" }}>
          {ET_TAG.map((t) => (
            <span key={t.l} style={{ fontSize: 9.5, color: "#9AA3B5", display: "inline-flex", alignItems: "center", gap: 4 }}>
              <span style={{ width: 6, height: 6, borderRadius: 99, background: t.c, display: "inline-block" }} />{t.l}
            </span>
          ))}
          <span style={{ fontSize: 9.5, color: "#616a7d", flex: "1 1 240px" }}>
            eToro links = navigation only, not advice. EU retail: US-domiciled ETFs trade as CFDs (PRIIPs) — prefer green
            "Real (EU)" UCITS lines for actual holdings; commodities &amp; FX are always CFDs. Verified Jul 2026 — re-check on platform.
          </span>
        </div>
      </div>

      <div style={{ ...S.panel, padding: "14px 16px", marginTop: 12, borderTop: "2px solid #E0B458" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <div style={{ ...S.serif, fontSize: 16, fontWeight: 600 }}>Expert buy-list × protocol — where consensus and method agree</div>
          <Expl>
            <b>Your research artifact, mapped.</b> The 24 rows are what experts currently recommend, scored by how many
            independent sources back each asset, how FRESH those calls are (≤3 weeks), and how BIASED the sources are
            (1 = neutral, 5 = product sellers talking their book). The protocol verdict from the checklist above is
            attached to every row: ✓ = method and consensus agree · ± = agree on the asset but not the phase or size ·
            ✗ = genuine clash. The ✗ rows are where the checklist earns its keep: duration bonds ranked #5 by experts
            but "challenged" by the method; infrastructure ranked #11 but sold mostly by its own product issuers; and
            world ETFs — which ARE ~64% the crashing asset. Note the beautiful confirmation at #9: the lowest-bias,
            highest-conviction expert signal (cash) is exactly the protocol's #1-certainty position.
          </Expl>
        </div>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 }}>
          {[["all", "All 24"], ["✓", "✓ agree"], ["±", "± partial"], ["✗", "✗ diverge"]].map(([v, l]) => (
            <button key={v} onClick={() => setFilter(v)} style={{
              padding: "4px 10px", borderRadius: 999, cursor: "pointer", fontSize: 11.5, fontWeight: 600,
              border: `1px solid ${filter === v ? "#E0B458" : "rgba(237,232,220,0.16)"}`,
              background: filter === v ? "rgba(224,180,88,0.12)" : "transparent",
              color: filter === v ? "#EDE8DC" : "#9AA3B5",
            }}>{l}</button>
          ))}
        </div>
        {experts.map((e) => <ExpertRow key={e.rk} e={e} agCol={agCol} />)}
        <div style={{ fontSize: 10.5, color: "#78829a", marginTop: 10, lineHeight: 1.6 }}>
          Score = source-count × freshness × (inverse) bias composite from the source artifact, max 66. Bias 1–5
          (5 = product-seller). The expert table is practitioner consensus — deliberately a LOOSER evidence standard
          than the academic protocol; the verdict column is the academic filter applied on top. Not investment advice.
        </div>
      </div>
    </div>
  );
}

function ExpertRow({ e, agCol }) {
  const [open, setOpen] = useState(false);
  const biasCol = e.bias <= 2 ? "#7fbf94" : e.bias <= 3 ? "#d9b45c" : "#e08a8a";
  return (
    <div style={{ borderTop: "1px solid rgba(237,232,220,0.06)", padding: "7px 0" }}>
      <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexWrap: "wrap" }}>
        <span style={{ ...S.eyebrow, minWidth: 22 }}>#{e.rk}</span>
        <span style={{ color: "#EDE8DC", fontWeight: 600, fontSize: 12.5, flex: "1 1 160px" }}>{e.name} <span style={{ color: "#616a7d", fontWeight: 400, fontSize: 10.5 }}>{e.sym}</span></span>
        <span style={{ fontSize: 14, fontWeight: 800, color: agCol[e.ag] }}>{e.ag}</span>
        <span style={{ fontSize: 10.5, fontWeight: 700, color: e.col, whiteSpace: "nowrap" }}>{e.v}</span>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
        <div style={{ flex: 1, height: 6, borderRadius: 99, background: "rgba(237,232,220,0.07)" }}>
          <div style={{ width: `${(e.score / 66) * 100}%`, height: "100%", borderRadius: 99, background: agCol[e.ag], opacity: 0.75 }} />
        </div>
        <span style={{ fontSize: 10, color: "#9AA3B5", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" }}>
          {e.score} · {e.srcs} src · {e.fresh} fresh · <span style={{ color: biasCol }}>bias {e.bias}</span>
        </span>
      </div>
      {open && (
        <div style={{ marginTop: 6, padding: "8px 11px", background: "rgba(237,232,220,0.03)", borderRadius: 7, borderLeft: `2px solid ${agCol[e.ag]}` }}>
          <div style={{ fontSize: 12, color: "#D9DCE4", lineHeight: 1.6 }}>{e.note}</div>
          {e.et && e.et.length > 0 && (
            <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 }}>
              {e.et.map((k) => <Elink key={k} k={k} />)}
            </div>
          )}
          <div style={{ fontSize: 10, color: "#616a7d", marginTop: 6, lineHeight: 1.5 }}>Sources: {e.refs}</div>
        </div>
      )}
    </div>
  );
}

/* ---------- App shell ---------- */

const TABS = [
  { id: "explorer", label: "Crisis Explorer" },
  { id: "matrix", label: "Similarity Matrix" },
  { id: "aggregate", label: "Aggregate" },
  { id: "analytics", label: "Analytics" },
  { id: "playbook", label: "Playbook" },
];

function CrisisWinnersDashboard() {
  const [tab, setTab] = useState("explorer");
  const tabs = BG.enabled ? TABS.concat([BG.tab]) : TABS;
  return (
    <div style={S.page}>
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "22px 14px 40px" }}>
        <div style={{ ...S.eyebrow, marginBottom: 6 }}>An interactive atlas · common t−60 → t+60 month scale</div>
        <h1 style={{ ...S.serif, fontSize: "clamp(26px, 5vw, 38px)", margin: 0, fontWeight: 600, lineHeight: 1.15 }}>
          Crisis <span style={{ color: "#E0B458" }}>Winners</span> — assets that rose when markets collapsed
        </h1>
        <p style={{ fontSize: 12.5, color: "#9AA3B5", lineHeight: 1.6, margin: "10px 0 0", maxWidth: 780 }}>
          Stylized monthly reconstructions anchored to magnitudes documented in the peer-reviewed literature
          (Baur &amp; McDermott 2010; Baele et al. 2020; Ranaldo &amp; Söderlind 2010; Temin &amp; Voth 2004; Gorton &amp;
          Rouwenhorst 2006; Moskowitz, Ooi &amp; Pedersen 2012; Conlon &amp; McGee 2020; Reinhart &amp; Rogoff 2009; Jordà
          et al. 2019) — not tick data, and not investment advice. Pre-1970 paths are schematic. The 2026 AI-bubble
          panel is a POTENTIAL crisis with its peak anchored at today by construction — real 2021–26 market backfill,
          lines end at t0, no forward projection (BIS, ECB, Fed &amp; BoE 2026 stability reports). The Analytics tab
          adds the algorithmic battery (clock matching, bootstrap outcome fans, tail tests, regime &amp; explosiveness diagnostics);
          the Playbook tab maps the ex-ante identification protocol (M0–M10) onto today's expert buy-list.
        </p>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 }}>
          <span style={{ ...S.eyebrow }}>New here? Tap any</span>
          <Expl>
            <b>How to read this dashboard.</b> Every crisis is drawn on the same clock: month 0 is the moment the market
            hit its highest point ("the peak"). Everything left of the dashed line is the boom before; everything right
            is what happened after. All lines are re-scaled to start from the same value, so you compare <i>shapes</i>,
            not prices. Red always = the market that crashed; gold/green/blue = things that went UP or held value.
            Dashed lines = today's (2026) situation, which by design stops at the peak line — nobody knows the right half yet.
            Every section has one of these "i" buttons with a plain-language explanation.
          </Expl>
        </div>

        {BG.enabled && <BG.Strip goToDetail={() => setTab("bubblegauge")} />}
        {/* bubblegauge integration seam: compact CNN Fear & Greed status + last 3 readings (feed-sourced, gated) */}
        {BG.enabled && BG.FearGreedStrip && <BG.FearGreedStrip />}

        <div className="tabbar-scroll" style={{ display: "flex", gap: 6, margin: "18px 0 16px", borderBottom: "1px solid rgba(237,232,220,0.1)", overflowX: "auto", WebkitOverflowScrolling: "touch" }}>
          {tabs.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              padding: "9px 14px", background: "transparent", cursor: "pointer", fontSize: 13.5, whiteSpace: "nowrap",
              border: "none", borderBottom: tab === t.id ? "2px solid #E0B458" : "2px solid transparent",
              color: tab === t.id ? "#EDE8DC" : "#78829a", fontWeight: tab === t.id ? 700 : 400,
            }}>{t.label}</button>
          ))}
        </div>

        {tab === "explorer" && <Explorer />}
        {tab === "matrix" && <Matrix />}
        {tab === "aggregate" && <Aggregate />}
        {tab === "analytics" && <Analytics />}
        {tab === "playbook" && <Playbook />}
        {tab === "bubblegauge" && BG.enabled && <BG.DetailTab goToCrisis={() => setTab("explorer")} />}

        <div style={{ marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(237,232,220,0.1)", fontSize: 10.5, color: "#616a7d", lineHeight: 1.7 }}>
          Key sources: Baur &amp; McDermott (2010) <i>J. Banking &amp; Finance</i> · Baele, Bekaert, Inghelbrecht &amp; Wei (2020) <i>RFS</i> ·
          Ranaldo &amp; Söderlind (2010) <i>Rev. Finance</i> · Temin &amp; Voth (2004) <i>AER</i> · Gorton &amp; Rouwenhorst (2006) <i>FAJ</i> ·
          Erb &amp; Harvey (2013) · Moskowitz, Ooi &amp; Pedersen (2012) <i>JFE</i> · Frazzini &amp; Pedersen (2014) <i>JFE</i> ·
          Asness, Frazzini &amp; Pedersen (2019) · Hong &amp; Kacperczyk (2009) <i>JFE</i> · Conlon &amp; McGee (2020) <i>FRL</i> ·
          Reinhart &amp; Rogoff (2009) <i>AER</i> · Phillips, Shi &amp; Yu (2015) <i>IER</i> · Jordà et al. (2019) <i>QJE</i> · Garber (1990; 2000) ·
          Cheema, Ryan &amp; Sarwar (2025) <i>IREF</i> · Baur &amp; McDermott (2012) IIIS WP · Longstaff (2004) <i>J. Business</i> ·
          Nagel (2016) <i>QJE</i> · Krishnamurthy &amp; Vissing-Jorgensen (2012) <i>JPE</i> · Duffie (2020) Brookings ·
          Szado (2009) <i>JAI</i> · Hood &amp; Malik (2013) <i>RFE</i> · Carr &amp; Wu (2009) <i>RFS</i> · Dew-Becker et al. (2017) <i>JFE</i> ·
          Alpanda &amp; Peralta-Alva (2010) <i>Rev. Econ. Dynamics</i> · Burdekin &amp; Weidenmier (2004) CUP · Hamilton (2009) <i>BPEA</i> ·
          BIS Annual Economic Report (Jun 2026) · ECB FSR (May 2026) &amp; Int’l Role of the Euro (Jun 2026) · Fed FSR (May 2026) · BoE FSR (2026) · WGC (Jun 2026) ·
          Greenwood, Shleifer &amp; You (2019) <i>JFE</i> · Greenwood, Hanson, Shleifer &amp; Sørensen (2022) <i>JF</i> · Schularick &amp; Taylor (2012) <i>AER</i> ·
          Fahlenbrach, Rageth &amp; Stulz (2021) <i>RFS</i> · Mitchell &amp; Pulvino (2012) <i>JFE</i> · Gennotte &amp; Leland (1990) <i>AER</i> ·
          Cohen, Polk &amp; Vuolteenaho (2003) <i>JF</i> · Gormsen &amp; Koijen (2020) <i>RAPS</i> · Coval, Jurek &amp; Stafford (2009) <i>JEP</i> ·
          Campbell &amp; Shiller (1998) <i>JPM</i> · IEA (2025) · SIPRI (Apr 2026) · NATO (2025).
        </div>
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root"))
  .render(<CrisisWinnersDashboard />);
