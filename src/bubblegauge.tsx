/* ============================================================
   bubblegauge × Crisis Winners — conditional integration
   Loaded BEFORE dashboard.jsx. Exposes window.BubbleGauge.

   Zero-build gating: this whole module no-ops (defines nothing,
   mounts nothing, makes no network calls) unless the activation
   query param `?status-api=<key>` is present (or was persisted
   in this tab). When disabled, window.BubbleGauge = {enabled:false}
   and dashboard.jsx renders exactly as it always has.

   Data contract: bubblegauge REST API v1 — score/legs endpoints
   per the integration spec (3.1.0) plus the dashboard feed
   (GET /api/v1/dashboard/feed, DASHBOARD_FEED_SPEC v1.0,
   service 3.4.0) used to re-anchor the atlas's AI-2026 panel.
   Validated at the boundary; `?status-api=demo` renders embedded
   fixtures (feed fixture scaled to the real 2026-07-15 capture).
   ============================================================ */

(function () {
  "use strict";

  /* ---------- activation / base-URL derivation (spec §4.1) ---------- */

  const PARAM = "status-api";
  const KEY_RE = /^[a-z0-9-]{1,32}$/; // strict whitelist — no dots, no full URLs
  const SS_KEY = "bubblegauge:enabled";
  const DEMO_KEYS = { demo: true, fixture: true }; // offline preview keys

  function resolveActivation(loc) {
    loc = loc || window.location;
    let url;
    try { url = new URL(loc.href); } catch (e) { return null; }
    // explicit disable
    if (url.searchParams.get(PARAM + "-off") !== null) {
      try { sessionStorage.removeItem(SS_KEY); } catch (e) {}
      return null;
    }
    let key = url.searchParams.get(PARAM);
    if (key && KEY_RE.test(key)) {
      try { sessionStorage.setItem(SS_KEY, key); } catch (e) {}
    } else if (!key) {
      try { key = sessionStorage.getItem(SS_KEY); } catch (e) { key = null; }
    }
    if (!key || !KEY_RE.test(key)) return null;

    if (DEMO_KEYS[key]) return { key: key, demo: true, base: null };

    const host = loc.hostname;
    // dev fallback: never subdomain-derive from localhost
    if (host === "localhost" || host === "127.0.0.1" || host.endsWith(".local")) {
      return { key: key, demo: false, base: "http://localhost:8000" };
    }
    const labels = host.split(".");
    // NOTE: simple leftmost-strip. Correct for a single-label parent domain; a multi-label public
    // suffix (e.g. co.uk) would need a public-suffix-list check. See INTEGRATION_NOTES.
    const parent = labels.length > 2 ? labels.slice(1).join(".") : host;
    return { key: key, demo: false, base: "https://" + key + "." + parent };
  }

  const activation = resolveActivation();

  if (!activation) {
    // Zero footprint: nothing defined, nothing mounted, no fetches.
    window.BubbleGauge = { enabled: false };
    return;
  }

  const API_BASE = activation.base;
  const DEMO = activation.demo;

  const { useState, useMemo, useEffect, useRef } = React;
  const {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Area, ComposedChart, ReferenceArea,
  } = Recharts;

  /* ---------- palette (inherit the dashboard's dark tokens) ---------- */

  const C = {
    bg: "#0E1526", panel: "#141D31", panel2: "#0B111F",
    text: "#EDE8DC", dim: "#C7CBD6", muted: "#9AA3B5", faint: "#78829a",
    gold: "#E0B458", line: "rgba(237,232,220,0.09)",
  };
  const BS = {
    serif: { fontFamily: "Georgia, 'Times New Roman', serif" },
    panel: { background: C.panel, border: "1px solid " + C.line, borderRadius: 10 },
    eyebrow: { fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: C.muted },
  };

  // Action-band semantics — reuse the dashboard's stress palette, never clickbait red.
  const BAND = {
    hold:   { label: "HOLD",   color: "#5B8DEF", zone: "rgba(91,141,239,0.14)" },
    trim:   { label: "TRIM",   color: "#E0B458", zone: "rgba(224,180,88,0.16)" },
    "de-risk": { label: "DE-RISK", color: "#E05252", zone: "rgba(224,82,82,0.16)" },
    "suppressed (block degraded)": { label: "SUPPRESSED", color: "#9AA3B5", zone: "rgba(154,163,181,0.12)" },
  };
  const bandOf = (b) => BAND[b] || BAND.hold;

  // Grounding chips (spec §10)
  const GROUND = {
    "literature-grounded":   { c: "#7fbf94", t: "Backed by peer-reviewed research." },
    "literature-adjacent":   { c: "#5AA9A3", t: "Motivated by the research, with a reasoned (not directly fitted) mapping." },
    "judgmental":            { c: "#d9b45c", t: "Reasoned expert choice, not a fitted model." },
    "contested":             { c: "#E8853D", t: "Known to misfire — deliberately down-weighted." },
    "lagging-confirmation":  { c: "#9AA3B5", t: "Confirms stress already underway; does not predict." },
  };
  const groundOf = (g) => GROUND[g] || { c: C.muted, t: "" };

  /* ---------- copy deck (spec §10) ---------- */

  const COPY = {
    micro: "Regime heuristic — not a probability, not advice.",
    epiChip: "Heuristic · not a probability · calibrated on n≈4 · see limits",
    bandOneLiner: {
      hold: "Hold — structural risk is present but not acute. No action indicated by the trend rule.",
      trim: "Trim — fragility is elevated. Consider easing risk if the trend rule confirms.",
      "de-risk": "De-risk — fragility is high or a hard override has fired. The trend rule is now the thing to watch.",
      "suppressed (block degraded)": "Not scored right now — too many inputs for one block are unavailable, so the action band is withheld rather than guessed.",
    },
    ladder: {
      ceiling: "The score sets your ceiling on risk — how much caution is warranted. It does not tell you to sell today.",
      trigger: "The 10-month trend rule (Faber) is the trigger — historically it reduces drawdowns, and honestly, does not boost returns.",
      speed: "The fast alarm (VIX / variance premium) reacts faster than a monthly trend, for when things break quickly.",
      caveat: "Acting early is expensive: missing the 10 best days over 1900–2006 — just 0.03% of trading days — cost ~65% of terminal wealth (Estrada). And any de-risking rule can lose money net of costs (Cederburg et al.). That is exactly why the score is a ceiling, not a button.",
    },
    redFlagHeader: "What would have to happen — each flag has a specific threshold (encoded in its name). If at least 3 of 4 fire, the score is floored at 70 regardless of everything else (a deliberate non-compensatory override).",
    falsifyHeader: "This gauge is falsifiable, on purpose. It is WRONG if:",
    coverageTip: "Coverage = how much of each block's intended weight is actually live right now. When an input is unavailable, we drop it and re-weight the rest, rather than guessing.",
    changelogTip: "v2 → v3: this step was an aggregation fix — a change in how the sub-scores are combined — NOT the market getting worse. We show it here so you never mistake a methodology change for a market event.",
    fusionHeader: "Which past crisis does today most resemble? (This is an analogy, not a forecast.)",
    notProbLong: "This is a 0–100 regime heuristic built from structured expert judgment. It is NOT a probability of a crash. There have been maybe four comparable US equity manias in a century — 1929, 2000, 2007, 2021 — far too few to calibrate a real probability. And today may not be a bubble at all: it could be rational repricing of a genuine general-purpose technology.",
  };

  const REDFLAG_COPY = {
    gsadf_explosive_noncontested: "GSADF reads explosive (and not contested-suppressed)",
    semi_runup_ge_150pp: "Semis' 2-yr net-of-market run-up ≥ 150 pp",
    hy_oas_widen_gt_100bps: "HY OAS widened > 100 bps",
    breadth_lt_50_near_ath: "< 50% of S&P 500 above the 200-DMA near an ATH",
  };

  // Indicator registry: order, block, plain gloss, fire-line, weight-rationale.
  const REG = {
    s1: { block: "S", name: "Valuation extremity",
      plain: "How expensive are stocks versus their own history, once you account for interest rates?",
      fire: "CAPE sits at a historic extreme and the Excess CAPE Yield (stocks' edge over bonds) is thin.",
      why: "Weighted highest in the structural block because valuation is the most durable long-horizon fragility signal in the research." },
    s2: { block: "S", name: "Concentration",
      plain: "How much does the whole index depend on a handful of AI names?",
      fire: "The top-10 share of the S&P 500 pushes further above its post-1990 range (~41% in 2025 vs ~27% at the 2000 peak).",
      why: "Literature-adjacent: a single-point-of-failure risk grounded in the concentration literature, not a fitted timing signal." },
    s3: { block: "S", name: "Semiconductor run-up",
      plain: "History says that when one industry doubles relative to the market in two years, it crashes about half the time.",
      fire: "Semiconductors' two-year gain over the market climbs the crash-frequency curve.",
      why: "Literature-grounded: Greenwood-Shleifer-You found a 100% two-year net-of-market run-up carries a 53% crash probability, rising to ~80% at 150%." },
    s4: { block: "S", name: "Explosiveness (GSADF)",
      plain: "A statistical test for prices growing faster than exponentially — deliberately down-weighted because it can be fooled by a genuine technological revolution.",
      fire: "The recursive unit-root test flags explosive price dynamics.",
      why: "CONTESTED and low-weighted: a 2026 study shows it fires 93–100% of the time under real general-purpose-tech fundamentals." },
    s5: { block: "S", name: "Credit-sentiment fragility",
      plain: "When lenders are most relaxed, trouble tends to arrive about two years later. Today's spreads are near 25-year tights.",
      fire: "High-yield spreads are historically tight (measured with a two-year lead).",
      why: "Literature-grounded on López-Salido-Stein-Zakrajšek's finding that hot credit at t−2 precedes contraction at t." },
    d1: { block: "D", name: "Breadth",
      plain: "How many stocks are still participating, versus a shrinking few holding the index up?",
      fire: "The share of S&P 500 members above their 200-day average drops sharply.",
      why: "Heaviest weight in the trigger block — breadth deterioration is a classic turn signal (judgmental)." },
    d2: { block: "D", name: "Margin-debt rollover",
      plain: "Leverage is at a record, but the signal only counts once it starts unwinding.",
      fire: "Margin debt turns down year-over-year and a rollover confirmation engages.",
      why: "Down-weighted, confirmation-only: CXO Advisory found a 0.00 correlation between margin-debt change and next-month returns — the market leads margin debt, not the reverse." },
    d3: { block: "D", name: "Hyperscaler FCF quality",
      plain: "Spending a fortune on data centers is only alarming if the revenue stops showing up.",
      fire: "Cloud revenue growth falls below 15% YoY while trailing free cash flow is negative; otherwise capped low.",
      why: "Literature-grounded: railroads and fiber both had cash-flow troughs years before any peak — capex is only a bubble signal when it stops converting to revenue." },
    d4: { block: "D", name: "LPPLS confidence",
      plain: "A physics-derived model of bubbles as 'critical points' — good at spotting them, prone to crying wolf early.",
      fire: "Prices show faster-than-exponential growth with accelerating oscillations.",
      why: "Literature-grounded but caveated: high recall (~90%), low precision (~29%)." },
  };
  const regOf = (id) => REG[id] || { block: "?", name: id, plain: "", fire: "", why: "" };

  /* ---------- epistemic + falsification (verbatim, spec §2.5) ---------- */

  const EPISTEMIC = [
    "NOT-A-PROBABILITY: 0-100 regime heuristic = structured expert judgment; uncalibrated.",
    "n≈4 CALIBRATION IMPOSSIBILITY: reference class {1929,2000,2007,2021}.",
    "REFERENCE-CLASS CAVEAT: may be rational GPT repricing (Chen-Chen-Huang 2026).",
    "NOMINAL≠EFFECTIVE WEIGHTS: see annual PSS sensitivity script.",
    "Service never returns 500 on upstream failure: fallback or drop+renormalize.",
  ];
  const FALSIFY = [
    "Score < 30 through a > 30% S&P drawdown beginning within 3 months → construct falsified.",
    "Score > 60 sustained through 24 months of > 10% annualized gains without a > 15% drawdown → falsified.",
    "Override fires and no > 20% drawdown within 12 months → override falsified.",
  ];
  const CHANGELOG = [
    { v: "v1", score: 33, note: "linear-additive, fully compensatory; stale concentration; HY-OAS sign inverted; LPPLS placeholder." },
    { v: "v2", score: 28, note: "data fixes; still fully compensatory." },
    { v: "v3", score: 40, note: "AGGREGATION FIX: two-block geometric mean + non-compensatory override + Monte Carlo median. NOT market deterioration." },
    { v: "v3.0.1", score: null, note: "first-live-run bugfixes (Stooq, FINRA parser, GSADF floor 0.25, LPPLS robustness). Methodology unchanged." },
    { v: "3.1.0", score: null, note: "price-layer restructure (provider chain + source hardening). Methodology unchanged." },
  ];

  /* ---------- offline fixture (Appendix B, expanded) ---------- */

  function mkS(value, sub, weight, ground, extra) {
    return Object.assign({ value: value, sub_score: sub, weight: weight, grounding: ground,
      explanation: regOf(extra && extra.id || "").plain, references: [], data_source: (extra && extra.src) || "fixture",
      fallback_used: false, dropped: false, as_of: "2026-07-10", age_days: (extra && extra.age) || 1,
      stale: false, timestamp: "2026-07-11T06:00:03+00:00" }, extra || {});
  }
  const SCORE_FIXTURE = {
    data: {
      headline_median: 40, iqr: [34, 47], band_5_95: [28, 55], point_score: 40.35,
      action_band: "hold", override_fired: false, red_flag_count: 0,
      red_flag_detail: { gsadf_explosive_noncontested: false, semi_runup_ge_150pp: false, hy_oas_widen_gt_100bps: false, breadth_lt_50_near_ath: false },
      block_S: { value: 0.711, indicators: {
        s1: mkS(41.6, 0.92, 0.33, "literature-grounded", { id: "s1", src: "shiller" }),
        s2: mkS(41.0, 0.78, 0.27, "literature-adjacent", { id: "s2", src: "slickcharts" }),
        s3: mkS(118, 0.61, 0.20, "literature-grounded", { id: "s3", src: "stooq" }),
        s4: mkS(0.9, 0.25, 0.07, "contested", { id: "s4", src: "exuber", note: "contested/stale floor" }),
        s5: mkS(2.9, 0.74, 0.13, "literature-grounded", { id: "s5", src: "fred_BAMLH0A0HYM2" }),
      } },
      block_D: { value: 0.229, value_raw: 0.229, indicators: {
        d1: mkS(56.0, 0.543, 0.35, "judgmental", { id: "d1", src: "stooq", note: "path=B_constituent_compute" }),
        d2: mkS(-3.1, 0.20, 0.13, "judgmental", { id: "d2", src: "finra" }),
        d3: mkS(0.22, 0.30, 0.32, "literature-grounded", { id: "d3", src: "sec_edgar" }),
        d4: mkS(0.41, 0.35, 0.20, "literature-grounded", { id: "d4", src: "lppls" }),
      } },
      V: { state: "contango", multiplier: 1.0, label: "lagging confirmation" },
      trend_states: { SPY: { faber_10mo: "IN", sma200: "IN" }, QQQ: { faber_10mo: "IN", sma200: "IN" } },
      fast_alarm: { term_structure: "contango", vrp: 12.4, vrp_flag: false, skew: 128, skew_label: "coincident context only" },
      judgment_call: { text: "Rich valuation (CAPE ~42) is the dominant driver; broad breadth near 56% above the 200-day is the biggest counter-signal.", stale: false, error_class: null },
    },
    meta: {
      computed_at: "2026-07-11T06:00:03+00:00", service_version: "3.1.0",
      coverage: { S: { coverage: 1.0, degraded: false }, D: { coverage: 1.0, degraded: false }, degraded: false },
      disclaimer: "Research, not advice.", epistemic_caveats: EPISTEMIC.slice(),
    },
  };
  // A stylized history path (fixture) — median climbs v1→v3 mostly via the aggregation fix.
  const HISTORY_FIXTURE = { data: (function () {
    const out = [], base = new Date("2024-01-01T06:00:00Z").getTime();
    const path = [30, 31, 29, 33, 34, 36, 35, 38, 37, 39, 41, 40, 42, 40, 41, 43, 42, 40];
    for (let i = 0; i < path.length; i++) {
      const m = path[i];
      out.push({ computed_at: new Date(base + i * 30 * 864e5).toISOString(), median: m,
        iqr: [m - 6, m + 7], band_5_95: [m - 12, m + 15], action_band: m >= 60 ? "de-risk" : m >= 45 ? "trim" : "hold",
        override_fired: false, red_flag_count: 0 });
    }
    return out;
  })(), meta: { computed_at: "2026-07-11T06:00:03+00:00", service_version: "3.1.0", disclaimer: "Research, not advice.", epistemic_caveats: EPISTEMIC.slice() } };

  const STATUS_FIXTURE = {
    service: { name: "bubblegauge", version: "3.1.0" },
    science_audit: {
      counts: { error: 0, warn: 2, info: 3 },
      flags: [
        { severity: "warn", category: "grounding", title: "S4 GSADF is contested", detail: "Fires 93–100% under genuine GPT fundamentals (Chen-Chen-Huang 2026); permanently down-weighted and floored at 0.25 when input missing.", ref: "arXiv:2604.25826" },
        { severity: "warn", category: "grounding", title: "D1/D2 are judgmental", detail: "Breadth and margin-debt rollover are reasoned expert mappings, not fitted models; D2 is confirmation-only (CXO: 0.00 next-month correlation).", ref: "CXO Advisory" },
        { severity: "info", category: "grounding", title: "S2 concentration is literature-adjacent", detail: "Single-point-of-failure risk motivated by the concentration literature; the weight/threshold mapping is a reasoned adaptation.", ref: "RBC WM" },
        { severity: "info", category: "coverage", title: "All blocks fully live", detail: "Coverage S=100%, D=100%; no dropped or stale indicators this run.", ref: null },
        { severity: "info", category: "override", title: "Override not fired", detail: "0 of 4 red flags fired; score reflects the geometric composite, no 70-floor applied.", ref: null },
      ],
    },
    falsification_criteria: FALSIFY.slice(),
    changelog: CHANGELOG.slice(),
    epistemic_caveats: EPISTEMIC.slice(),
    disclaimer: "Research, not advice.",
  };

  /* ---------- fetch layer + boundary validation ---------- */

  function isNum(x) { return typeof x === "number" && isFinite(x); }
  function pair(x) { return Array.isArray(x) && x.length === 2 && isNum(x[0]) && isNum(x[1]); }

  // Minimal structural guard — never trust the shape; the service degrades.
  function validScore(j) {
    if (!j || !j.data || !j.meta) return false;
    const d = j.data;
    if (!isNum(d.headline_median) || !pair(d.iqr) || !pair(d.band_5_95)) return false;
    if (typeof d.action_band !== "string") return false;
    if (!d.block_S || !d.block_S.indicators || !d.block_D || !d.block_D.indicators) return false;
    if (!d.red_flag_detail || typeof d.red_flag_count !== "number") return false;
    if (!d.trend_states || !d.fast_alarm || !d.V) return false;
    return true;
  }

  const cache = {}; // path -> { t, json }
  const TTL = 25 * 60 * 1000;

  function bgFetch(path, opts) {
    opts = opts || {};
    const now = Date.now();
    if (!opts.noCache && cache[path] && now - cache[path].t < (opts.ttl || TTL)) {
      return Promise.resolve({ status: 200, json: cache[path].json, fromCache: true });
    }
    const ctrl = new AbortController();
    const to = setTimeout(() => ctrl.abort(), opts.timeout || 6000);
    return fetch(API_BASE + path, { signal: ctrl.signal, headers: { accept: "application/json" } })
      .then((r) => {
        clearTimeout(to);
        if (r.status === 503) return { status: 503, json: null }; // warming up, not an error
        if (!r.ok) return { status: r.status, json: null, error: "HTTP " + r.status };
        return r.json().then((j) => { cache[path] = { t: now, json: j }; return { status: 200, json: j }; });
      })
      .catch((e) => { clearTimeout(to); return { status: 0, json: null, error: String(e && e.message || e) }; });
  }

  // Generic hook: {loading, notReady, error, json}
  function useEndpoint(path, fixture, validate) {
    const [st, setSt] = useState({ loading: true, notReady: false, error: null, json: DEMO ? fixture : null });
    useEffect(function () {
      let alive = true;
      if (DEMO) { setSt({ loading: false, notReady: false, error: null, json: fixture }); return function () {}; }
      setSt(function (s) { return Object.assign({}, s, { loading: true }); });
      bgFetch(path).then(function (r) {
        if (!alive) return;
        if (r.status === 503) return setSt({ loading: false, notReady: true, error: null, json: null });
        if (r.status !== 200 || !r.json || (validate && !validate(r.json))) {
          return setSt({ loading: false, notReady: false, error: r.error || "bad payload", json: null });
        }
        setSt({ loading: false, notReady: false, error: null, json: r.json });
      });
      // light revalidation on focus
      const onFocus = function () { if (alive && !DEMO) bgFetch(path, { noCache: true }).then(function (r) {
        if (alive && r.status === 200 && r.json && (!validate || validate(r.json))) setSt({ loading: false, notReady: false, error: null, json: r.json });
      }); };
      window.addEventListener("focus", onFocus);
      return function () { alive = false; window.removeEventListener("focus", onFocus); };
    }, [path]);
    return st;
  }

  const useScore = () => useEndpoint("/api/v1/score", SCORE_FIXTURE, validScore);
  const useHistory = () => useEndpoint("/api/v1/score/history?granularity=daily&limit=1000", HISTORY_FIXTURE, function (j) { return j && Array.isArray(j.data); });
  const useStatus = () => useEndpoint("/api/v1/status", STATUS_FIXTURE, function (j) { return j && j.science_audit; });

  /* ---------- fusion: stylized structural fingerprints (spec §6) ---------- */
  // Dimensions in [0,1]; hand-set from the literature. Explicitly an ANALOGY, not a fit.
  const FP_DIMS = [
    { k: "valuation", label: "Valuation" },
    { k: "concentration", label: "Concentration" },
    { k: "industryRunup", label: "Industry run-up" },
    { k: "creditTightness", label: "Credit tightness" },
    { k: "leverage", label: "System leverage" },
  ];
  const CRISES_FP = [
    { label: "1929", explorer: "depression", dims: { valuation: 0.80, concentration: 0.50, industryRunup: 0.80, creditTightness: 0.50, leverage: 0.85 },
      note: "Levered (margin) equity mania — deep macro damage." },
    { label: "2000", explorer: "dotcom", dims: { valuation: 0.95, concentration: 0.75, industryRunup: 0.90, creditTightness: 0.40, leverage: 0.20 },
      note: "Unlevered tech/equity bubble — sharp equity drawdown, comparatively benign macro (Jordà-Schularick-Taylor)." },
    { label: "2007", explorer: "gfc", dims: { valuation: 0.50, concentration: 0.35, industryRunup: 0.30, creditTightness: 0.85, leverage: 0.95 },
      note: "Credit/housing-leveraged — deepest recession & slowest recovery of the set." },
    { label: "2021", explorer: "ai2026", dims: { valuation: 0.85, concentration: 0.70, industryRunup: 0.80, creditTightness: 0.70, leverage: 0.50 },
      note: "Everything-rally; mixed leverage; the most recent reference-class member." },
  ];

  function todayFingerprint(d) {
    const g = (id) => { const x = d.block_S.indicators[id] || d.block_D.indicators[id]; return x && isNum(x.sub_score) ? x.sub_score : null; };
    return {
      valuation: g("s1"), concentration: g("s2"), industryRunup: g("s3"), creditTightness: g("s5"),
      // No direct block-S leverage indicator; today's episode reads as low-leverage AI equity. Approximate, labeled.
      leverage: 0.30,
    };
  }
  function analogues(today) {
    const rows = CRISES_FP.map((cr) => {
      let ss = 0, n = 0;
      const per = FP_DIMS.map((dim) => {
        const a = today[dim.k], b = cr.dims[dim.k];
        const contrib = isNum(a) ? Math.abs(a - b) : null;
        if (contrib != null) { ss += contrib * contrib; n++; }
        return { k: dim.k, label: dim.label, today: a, crisis: b, gap: contrib };
      });
      const dist = n ? Math.sqrt(ss / n) : 1; // 0 = identical, 1 = opposite
      return Object.assign({}, cr, { per: per, similarity: Math.max(0, 1 - dist) });
    });
    rows.sort((a, b) => b.similarity - a.similarity);
    return rows;
  }

  /* ---------- UI atoms ---------- */

  class Boundary extends React.Component {
    constructor(p) { super(p); this.state = { err: null }; }
    static getDerivedStateFromError(e) { return { err: e }; }
    componentDidCatch() {}
    render() { return this.state.err ? (this.props.fallback || null) : this.props.children; }
  }

  function Panel(props) {
    return React.createElement("div", { style: Object.assign({}, BS.panel, { padding: "14px 16px" }, props.style) }, props.children);
  }

  function Pill({ color, children, title, outline }) {
    return (
      <span title={title} style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "2px 8px",
        borderRadius: 999, fontSize: 10, fontWeight: 700, whiteSpace: "nowrap",
        color: color, border: "1px solid " + color + (outline ? "" : "55"),
        background: outline ? "transparent" : color + "1a" }}>
        <span style={{ width: 6, height: 6, borderRadius: 99, background: color, flexShrink: 0 }} />{children}
      </span>
    );
  }

  function Freshness({ computedAt }) {
    if (!computedAt) return null;
    let rel = "";
    const t = Date.parse(computedAt);
    if (isFinite(t)) {
      const h = (Date.now() - t) / 36e5;
      rel = h < 1 ? "updated <1h ago" : h < 48 ? "updated " + Math.round(h) + "h ago" : "updated " + Math.round(h / 24) + "d ago";
    }
    return <span style={{ ...BS.eyebrow, color: C.faint }}>{rel}{DEMO ? " · demo" : ""}</span>;
  }

  function EpiChip() {
    return <Pill color={C.muted} outline title={COPY.notProbLong}>Heuristic · not a probability · n≈4</Pill>;
  }

  // Accessible 0–100 gauge: 3 zones (<45,45–60,≥60), IQR band, median marker.
  function GaugeBar({ value, iqr, band, height, trend }) {
    const b = bandOf(band);
    const clamp = (x) => Math.max(0, Math.min(100, x));
    const h = height || 12;
    const label = "Bubble regime " + Math.round(value) + " of 100" +
      (pair(iqr) ? ", IQR " + Math.round(iqr[0]) + " to " + Math.round(iqr[1]) : "") +
      ", action band " + b.label.toLowerCase();
    return (
      <div role="img" aria-label={label} style={{ position: "relative", height: h, borderRadius: 99, overflow: "hidden",
        background: "linear-gradient(90deg, rgba(91,141,239,0.16) 0 45%, rgba(224,180,88,0.18) 45% 60%, rgba(224,82,82,0.18) 60% 100%)",
        border: "1px solid " + C.line }}>
        {pair(iqr) && (
          <div style={{ position: "absolute", top: 0, bottom: 0, left: clamp(iqr[0]) + "%", width: (clamp(iqr[1]) - clamp(iqr[0])) + "%",
            background: b.color, opacity: 0.35 }} />
        )}
        {trend3(trend && trend[0], trend && trend[1], trend && trend[2]) && (
          <TrendTail pts={trend} flip={false} barH={h} />
        )}
        <div style={{ position: "absolute", top: -2, bottom: -2, left: "calc(" + clamp(value) + "% - 1.5px)", width: 3,
          background: b.color, borderRadius: 2, boxShadow: "0 0 0 1px rgba(11,17,31,0.6)" }} />
      </div>
    );
  }

  /* ---------- V2 "Kielwasser" recent-trend signal (shared by every bar) ----------
     A fading tail from the value three readings ago to the current marker, in the
     direction of the move. Tail LENGTH ∝ |change over the last 3 points| (small change
     → short tail, big change → long tail); a small sine WAVE is added ONLY on a reversal
     (up-then-down / down-then-up) in those 3 points, its amplitude ∝ the overshoot. It is
     decorative + data-driven: renders nothing when the change is negligible or the three
     points aren't all available. It measures its own width so the tail/wave/chevron stay
     undistorted on any bar size (no preserveAspectRatio skew). No new egress, no store. */
  let __ttUid = 0;
  function trend3(a, b, c) { return isNum(a) && isNum(b) && isNum(c) ? [a, b, c] : null; }
  // last-3 regime medians from the score-history payload, re-anchored to end at the live marker
  function regimeTrend(hist, current) {
    const arr = hist && hist.json && Array.isArray(hist.json.data) ? hist.json.data : null;
    if (!arr || arr.length < 3) return null;
    const m = arr.slice(-3).map((r) => (r && isNum(r.median) ? r.median : NaN));
    if (!m.every(isNum)) return null;
    return [m[0], m[1], isNum(current) ? current : m[2]];
  }
  function TrendTail({ pts, flip, barH }) {
    const ref = useRef(null);
    const gidRef = useRef(null);
    if (gidRef.current == null) gidRef.current = "tt" + (++__ttUid);
    const [w, setW] = useState(0);
    useEffect(function () {
      const el = ref.current;
      if (!el) return undefined;
      const measure = function () { setW(el.clientWidth || 0); };
      measure();
      let ro;
      try { ro = new ResizeObserver(measure); ro.observe(el); } catch (e) {}
      window.addEventListener("resize", measure);
      return function () { try { ro && ro.disconnect(); } catch (e) {} window.removeEventListener("resize", measure); };
    }, []);
    const geom = useMemo(function () {
      if (!pts || !w) return null;
      const clamp = (x) => Math.max(0, Math.min(100, x));
      const xOf = (v) => ((flip ? 100 - clamp(v) : clamp(v)) / 100) * w;
      const x0 = xOf(pts[0]), x2 = xOf(pts[2]);
      if (Math.abs(x2 - x0) < 2) return null; // negligible move → no signal
      const dir = x2 >= x0 ? 1 : -1, yc = barH / 2;
      const aa = pts[1] - pts[0], bb = pts[2] - pts[1];
      const reversed = (aa > 0 && bb < 0) || (aa < 0 && bb > 0);
      const ov = Math.abs(pts[1] - (pts[0] + pts[2]) / 2);
      const amp = reversed ? Math.min(barH * 0.4, ov * 0.34) : 0;
      // shaft runs from where the value was 3 readings ago (x0) up to the marker (x2); the FILLED
      // arrowhead leads at the marker pointing in the travel direction, so the signal reads forward
      // (not as a backward-trailing wake).
      let d;
      if (amp < 0.4) {
        d = "M" + x0.toFixed(1) + " " + yc + " L" + x2.toFixed(1) + " " + yc;
      } else {
        const n = 30, len = Math.abs(x2 - x0), humps = 2.5;
        d = "";
        for (let i = 0; i <= n; i++) {
          const t = i / n, x = x0 + dir * len * t,
            yy = yc + Math.sin(t * humps * Math.PI) * amp * (0.35 + 0.65 * Math.sin(t * Math.PI));
          d += (i ? " L" : "M") + x.toFixed(1) + " " + yy.toFixed(1);
        }
      }
      const hh = Math.max(2.6, Math.min(barH * 0.5 - 0.5, 4.4)), hl = Math.min(Math.max(4.5, Math.min(6.5, barH * 0.75)), Math.abs(x2 - x0));
      const tipX = x2 + dir * 1.2, backX = tipX - dir * hl; // tip a hair past the marker, base behind; head never exceeds the move
      const head = "M" + tipX.toFixed(1) + " " + yc + " L" + backX.toFixed(1) + " " + (yc - hh).toFixed(1) + " L" + backX.toFixed(1) + " " + (yc + hh).toFixed(1) + " Z";
      // the arrowhead is filled with the colour of the bar END it is heading toward (full-saturation
      // extreme), so the hue itself signals the trend; both bars are red on the right, F&G is greed-teal
      // on the left and regime blue on the left.
      const destColor = dir > 0 ? "#E05252" : (flip ? "#5AA9A3" : "#5B8DEF");
      return { x0, x2, d, head, sw: Math.max(2.4, barH * 0.34), destColor };
    }, [pts, w, flip, barH]);
    const gid = gidRef.current;
    // The tail is drawn in the marker's cream ink (not the zone hue) so it reads as the marker's own
    // "wake" and stays legible on every zone — a zone-matched tail vanishes on its own colour.
    const ink = C.text;
    return (
      <div ref={ref} aria-hidden="true" style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {geom && (
          <svg width={w} height={barH} style={{ display: "block" }}>
            <defs>
              <linearGradient id={gid} gradientUnits="userSpaceOnUse" x1={geom.x0} y1="0" x2={geom.x2} y2="0">
                <stop offset="0" stopColor={ink} stopOpacity="0.18" />
                <stop offset="0.55" stopColor={ink} stopOpacity="0.66" />
                <stop offset="1" stopColor={ink} stopOpacity="0.96" />
              </linearGradient>
            </defs>
            <path d={geom.d} fill="none" stroke={"url(#" + gid + ")"} strokeWidth={geom.sw} strokeLinecap="round" />
            <path d={geom.head} fill={geom.destColor} stroke={ink} strokeWidth={Math.max(0.8, barH * 0.12)} strokeLinejoin="round" />
          </svg>
        )}
      </div>
    );
  }

  /* ---------- 5A · Start-page strip ---------- */

  function StripShell({ children, onClick, dim }) {
    const clickable = !!onClick;
    return (
      <aside
        aria-label="AI bubble regime gauge"
        onClick={onClick}
        onKeyDown={clickable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClick(); } } : undefined}
        role={clickable ? "button" : undefined}
        tabIndex={clickable ? 0 : undefined}
        style={{ ...BS.panel, padding: "10px 14px", margin: "0 0 14px",
          cursor: clickable ? "pointer" : "default", opacity: dim ? 0.85 : 1,
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        {children}
      </aside>
    );
  }

  function StripSkeleton() {
    return <StripShell><span style={{ ...BS.eyebrow }}>AI regime gauge</span>
      <span style={{ color: C.faint, fontSize: 12 }}>loading…</span></StripShell>;
  }
  function StripWarmingUp() {
    return <StripShell dim><span style={{ ...BS.eyebrow }}>AI regime gauge</span>
      <span style={{ color: C.faint, fontSize: 12 }}>warming up — no snapshot computed yet</span></StripShell>;
  }
  function StripUnavailable() {
    return <StripShell dim><span style={{ ...BS.eyebrow }}>AI regime gauge</span>
      <span style={{ color: C.faint, fontSize: 12 }}>gauge unavailable</span></StripShell>;
  }

  function JudgmentInline({ call, max }) {
    if (!call || !call.text) return null;
    const t = call.text.length > (max || 220) ? call.text.slice(0, max || 220) + "…" : call.text;
    const stale = call.stale || call.error_class;
    return (
      <span style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.4, flex: "1 1 220px", minWidth: 0 }}>
        {t}{stale ? <span style={{ color: C.faint }}> · stale</span> : null}
      </span>
    );
  }

  function CoverageChip({ coverage }) {
    if (!coverage) return null;
    if (coverage.degraded) return <Pill color="#E8853D" title={COPY.coverageTip}>Degraded</Pill>;
    const pct = Math.round(100 * Math.min(coverage.S ? coverage.S.coverage : 1, coverage.D ? coverage.D.coverage : 1));
    return <Pill color="#7fbf94" title={COPY.coverageTip}>Coverage {pct}%</Pill>;
  }

  function Strip({ goToDetail }) {
    const s = useScore();
    const hist = useHistory();
    if (s.loading) return <StripSkeleton />;
    if (s.notReady) return <StripWarmingUp />;
    if (s.error || !s.json) return <StripUnavailable />;
    const d = s.json.data, meta = s.json.meta, b = bandOf(d.action_band);
    const trend = d.trend_states;
    const regTrend = regimeTrend(hist, d.headline_median);
    return (
      <StripShell onClick={goToDetail}>
        <div style={{ display: "flex", flexDirection: "column", gap: 4, flex: "1 1 240px", minWidth: 200 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
            <span style={{ ...BS.serif, fontSize: 22, fontWeight: 700, color: b.color, fontVariantNumeric: "tabular-nums" }}>{Math.round(d.headline_median)}</span>
            {pair(d.iqr) && <span style={{ fontSize: 11, color: C.muted }}>IQR {Math.round(d.iqr[0])}–{Math.round(d.iqr[1])}</span>}
            <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: "0.08em", color: b.color,
              padding: "1px 7px", borderRadius: 5, background: b.zone }}>{b.label}</span>
            <span style={{ fontSize: 9.5, color: C.faint }}>{COPY.micro}</span>
          </div>
          <GaugeBar value={d.headline_median} iqr={d.iqr} band={d.action_band} trend={regTrend} />
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <Pill color={d.red_flag_count >= 3 ? "#E05252" : d.red_flag_count > 0 ? "#E0B458" : C.muted}
            title={Object.keys(d.red_flag_detail).filter((k) => d.red_flag_detail[k]).map((k) => REDFLAG_COPY[k]).join(" · ") || "no override flags fired"}>
            {d.red_flag_count}/4 flags
          </Pill>
          {trend && <Pill color={trend.SPY.faber_10mo === "OUT" ? "#E05252" : "#7fbf94"} outline
            title="Faber 10-month trend rule (execution trigger)">
            Trend SPY {trend.SPY.faber_10mo} · QQQ {trend.QQQ.faber_10mo}
          </Pill>}
          <CoverageChip coverage={meta.coverage} />
          <Freshness computedAt={meta.computed_at} />
        </div>
        <JudgmentInline call={d.judgment_call} />
        <span style={{ fontSize: 11, color: b.color, fontWeight: 700, whiteSpace: "nowrap" }}>Open ›</span>
      </StripShell>
    );
  }

  /* ---------- 5B · Detail tab ---------- */

  function H({ children, sub }) {
    return (
      <div style={{ margin: "0 0 8px" }}>
        <h3 style={{ ...BS.serif, fontSize: 16, margin: 0, fontWeight: 600, color: C.text }}>{children}</h3>
        {sub && <div style={{ ...BS.eyebrow, marginTop: 3 }}>{sub}</div>}
      </div>
    );
  }

  // (1) Headline distribution
  function HeadlinePanel({ d, meta }) {
    const b = bandOf(d.action_band);
    return (
      <Panel>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 8 }}>
          <h2 style={{ ...BS.serif, fontSize: 22, margin: 0, fontWeight: 600, color: C.text }}>AI bubble regime — {Math.round(d.headline_median)}</h2>
          <EpiChip />
          <Freshness computedAt={meta.computed_at} />
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, flexWrap: "wrap", marginBottom: 8 }}>
          <span style={{ ...BS.serif, fontSize: 40, fontWeight: 700, color: b.color, fontVariantNumeric: "tabular-nums" }}>{Math.round(d.headline_median)}</span>
          <div style={{ fontSize: 12, color: C.muted, lineHeight: 1.7 }}>
            <div>Monte Carlo median · point estimate {d.point_score}</div>
            {pair(d.iqr) && <div>IQR (25–75%) <b style={{ color: C.dim }}>{Math.round(d.iqr[0])}–{Math.round(d.iqr[1])}</b> · 5–95% band {Math.round(d.band_5_95[0])}–{Math.round(d.band_5_95[1])}</div>}
          </div>
          <span style={{ marginLeft: "auto", fontSize: 12, fontWeight: 800, letterSpacing: "0.08em", color: b.color, padding: "3px 10px", borderRadius: 6, background: b.zone }}>{b.label}</span>
        </div>
        <GaugeBar value={d.headline_median} iqr={d.iqr} band={d.action_band} height={16} />
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 9.5, color: C.faint, marginTop: 4 }}>
          <span>0</span><span>45 · trim</span><span>60 · de-risk</span><span>100</span>
        </div>
        <p style={{ fontSize: 12.5, color: C.dim, lineHeight: 1.6, margin: "10px 0 0" }}>{(COPY.bandOneLiner[d.action_band]) || ""}</p>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, margin: "6px 0 0", fontStyle: "italic" }}>
          The spread is the point — this is a distribution over assumptions, not a forecast.
        </p>
      </Panel>
    );
  }

  // (2) Two-block anatomy
  function IndicatorRow({ id, r }) {
    const [open, setOpen] = useState(false);
    const reg = regOf(id), g = groundOf(r.grounding);
    const live = !r.dropped;
    return (
      <div style={{ borderTop: "1px solid rgba(237,232,220,0.06)", padding: "8px 0" }}>
        <div onClick={() => setOpen(!open)} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexWrap: "wrap" }}>
          <span style={{ ...BS.eyebrow, minWidth: 26 }}>{id.toUpperCase()}</span>
          <span style={{ color: C.text, fontWeight: 600, fontSize: 12.5, flex: "1 1 140px" }}>{reg.name}</span>
          <Pill color={g.c} title={g.t}>{r.grounding}</Pill>
          <span style={{ fontSize: 10.5, color: C.faint, whiteSpace: "nowrap" }}>w {Math.round(r.weight * 100)}%</span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 5 }}>
          <div style={{ flex: 1, height: 7, borderRadius: 99, background: "rgba(237,232,220,0.07)" }}>
            <div style={{ width: (live && isNum(r.sub_score) ? Math.round(r.sub_score * 100) : 0) + "%", height: "100%", borderRadius: 99, background: g.c, opacity: 0.8 }} />
          </div>
          <span style={{ fontSize: 10.5, color: C.muted, fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap", minWidth: 96, textAlign: "right" }}>
            {live ? (isNum(r.sub_score) ? r.sub_score.toFixed(2) : "—") : <span style={{ color: "#E8853D" }}>not live</span>}
            {r.stale ? <span style={{ color: "#E8853D" }}> · stale</span> : null}
            {r.fallback_used ? <span style={{ color: C.faint }}> · fallback</span> : null}
          </span>
        </div>
        {open && (
          <div style={{ marginTop: 7, padding: "9px 11px", background: "rgba(237,232,220,0.03)", borderRadius: 7, borderLeft: "2px solid " + g.c, fontSize: 11.5, color: C.dim, lineHeight: 1.6 }}>
            <div>{reg.plain}</div>
            <div style={{ marginTop: 5, color: C.muted }}><b style={{ color: C.dim }}>Fires when:</b> {reg.fire}</div>
            <div style={{ marginTop: 3, color: C.muted }}><b style={{ color: C.dim }}>Weighted this way because:</b> {reg.why}</div>
            <div style={{ marginTop: 5, fontSize: 10, color: C.faint }}>
              value {isNum(r.value) ? r.value : "—"} · source {r.data_source || "?"}{r.as_of ? " · as of " + r.as_of : ""}{r.note ? " · " + r.note : ""}
              {!DEMO && <> · <a href={API_BASE + "/api/v1/indicators/" + id} target="_blank" rel="noopener noreferrer" style={{ color: g.c }}>full methodology ↗</a></>}
            </div>
          </div>
        )}
      </div>
    );
  }

  function BlockColumn({ title, sub, block, order, footer }) {
    return (
      <Panel>
        <H sub={sub}>{title}</H>
        {order.filter((id) => block.indicators[id]).map((id) => <IndicatorRow key={id} id={id} r={block.indicators[id]} />)}
        {footer}
      </Panel>
    );
  }

  function AnatomyPanel({ d }) {
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 4px" }}>
          <h2 style={{ ...BS.serif, fontSize: 18, margin: 0, fontWeight: 600, color: C.text }}>Two-block anatomy</h2>
          <span style={{ fontSize: 11, color: C.muted }}>combined by <b>multiplication</b> (geometric mean) — one calm reading can't fully cancel an alarming one</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 12, marginTop: 8 }}>
          <BlockColumn title={"Block S · structural fragility"} sub={"maps to DEPTH · value " + d.block_S.value.toFixed(3)}
            block={d.block_S} order={["s1", "s2", "s3", "s4", "s5"]} />
          <BlockColumn title={"Block D · dynamics / trigger"} sub={"maps to TIMING · raw " + (isNum(d.block_D.value_raw) ? d.block_D.value_raw.toFixed(3) : "—") + " → ×V " + d.V.multiplier + " → " + d.block_D.value.toFixed(3)}
            block={d.block_D} order={["d1", "d2", "d3", "d4"]}
            footer={<div style={{ marginTop: 8, paddingTop: 8, borderTop: "1px solid rgba(237,232,220,0.06)", fontSize: 11, color: C.muted }}>
              <b style={{ color: C.dim }}>V · VIX term-structure multiplier</b> — {d.V.state} → ×{d.V.multiplier} ({d.V.label}). When near-term fear exceeds long-term fear, stress is already underway; this confirms, it doesn't predict.
            </div>} />
        </div>
        <div style={{ ...BS.eyebrow, textAlign: "center", marginTop: 10 }}>
          Score = 100 × S<sup>α</sup> × D<sup>β</sup> (α=β=0.5) → point {d.point_score} → Monte Carlo median {Math.round(d.headline_median)}
        </div>
      </div>
    );
  }

  // (3) Red-flag panel
  function RedFlagPanel({ d }) {
    const keys = ["gsadf_explosive_noncontested", "semi_runup_ge_150pp", "hy_oas_widen_gt_100bps", "breadth_lt_50_near_ath"];
    return (
      <Panel>
        <H sub={d.override_fired ? "OVERRIDE FIRED — score floored at 70" : d.red_flag_count + " of 4 fired · override not active"}>Non-compensatory override flags</H>
        <p style={{ fontSize: 11.5, color: C.muted, lineHeight: 1.6, margin: "0 0 8px" }}>{COPY.redFlagHeader}</p>
        {keys.map((k) => {
          const on = !!d.red_flag_detail[k];
          return (
            <div key={k} style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 0", borderTop: "1px solid rgba(237,232,220,0.06)" }}>
              <span style={{ width: 16, height: 16, borderRadius: 4, display: "inline-flex", alignItems: "center", justifyContent: "center",
                background: on ? "rgba(224,82,82,0.75)" : "transparent", border: "1px solid " + (on ? "#E05252" : "rgba(237,232,220,0.2)"),
                color: "#0E1526", fontWeight: 800, fontSize: 11 }}>{on ? "!" : ""}</span>
              <span style={{ fontSize: 12, color: on ? C.text : C.muted, fontWeight: on ? 600 : 400 }}>{REDFLAG_COPY[k]}</span>
              <span style={{ marginLeft: "auto", fontSize: 10, color: on ? "#E05252" : C.faint, fontWeight: 700 }}>{on ? "FIRED" : "clear"}</span>
            </div>
          );
        })}
      </Panel>
    );
  }

  // (4) Three-leg action ladder
  function LadderCard({ n, title, state, color, caption }) {
    return (
      <div style={{ borderRadius: 10, background: "rgba(237,232,220,0.03)", border: "1px solid rgba(237,232,220,0.08)", borderTop: "3px solid " + color, padding: "11px 13px" }}>
        <div style={{ ...BS.eyebrow, marginBottom: 4 }}>Rung {n}</div>
        <div style={{ ...BS.serif, fontSize: 15, fontWeight: 700, color: C.text }}>{title}</div>
        <div style={{ fontSize: 13, fontWeight: 700, color: color, margin: "3px 0 6px" }}>{state}</div>
        <div style={{ fontSize: 11, color: C.muted, lineHeight: 1.55 }}>{caption}</div>
      </div>
    );
  }
  function LadderPanel({ d }) {
    const b = bandOf(d.action_band), fa = d.fast_alarm, tr = d.trend_states;
    return (
      <div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", margin: "0 0 8px" }}>
          <h2 style={{ ...BS.serif, fontSize: 18, margin: 0, fontWeight: 600, color: C.text }}>The three-leg action ladder</h2>
          <span style={{ fontSize: 11, color: C.muted }}>the score is a ceiling, not a sell button</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 10 }}>
          <LadderCard n="1" title="Strategic ceiling" color={b.color} state={"Score " + Math.round(d.headline_median) + " → " + b.label} caption={COPY.ladder.ceiling} />
          <LadderCard n="2" title="Execution trigger" color={tr.SPY.faber_10mo === "OUT" ? "#E05252" : "#7fbf94"}
            state={"Faber SPY " + tr.SPY.faber_10mo + " · QQQ " + tr.QQQ.faber_10mo} caption={COPY.ladder.trigger} />
          <LadderCard n="3" title="Fast alarm (speed)" color={fa.vrp_flag ? "#E05252" : "#5B8DEF"}
            state={fa.term_structure + " · VRP " + fa.vrp + (fa.vrp_flag ? " (stress)" : "")} caption={COPY.ladder.speed} />
        </div>
        <p style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, margin: "8px 2px 0" }}>{COPY.ladder.caveat}</p>
      </div>
    );
  }

  // (5) History browser
  const HistTip = ({ active, payload }) => {
    if (!active || !payload || !payload.length) return null;
    const r = payload[0] && payload[0].payload; if (!r) return null;
    return (
      <div style={{ background: C.panel2, border: "1px solid rgba(237,232,220,0.15)", borderRadius: 8, padding: "7px 10px", fontSize: 11 }}>
        <div style={{ color: C.muted, marginBottom: 3 }}>{(r.computed_at || "").slice(0, 10)}</div>
        <div style={{ color: C.text }}>median {Math.round(r.median)}</div>
        {pair(r.iqr) && <div style={{ color: C.muted }}>IQR {Math.round(r.iqr[0])}–{Math.round(r.iqr[1])}</div>}
      </div>
    );
  };
  function HistoryPanel() {
    const h = useHistory();
    const rows = useMemo(() => {
      const arr = (h.json && h.json.data) || [];
      return arr.map((r) => ({ computed_at: r.computed_at, median: r.median,
        iqr: r.iqr, lo: pair(r.iqr) ? r.iqr[0] : r.median, band: pair(r.iqr) ? [r.iqr[0], r.iqr[1]] : [r.median, r.median] }));
    }, [h.json]);
    return (
      <Panel>
        <H sub="headline median with IQR band · action-band thresholds marked">History</H>
        {h.loading ? <div style={{ color: C.faint, fontSize: 12, padding: "20px 0" }}>loading…</div> :
         rows.length === 0 ? <div style={{ color: C.faint, fontSize: 12, padding: "20px 0" }}>no history available</div> : (
          <ResponsiveContainer width="100%" height={220}>
            <ComposedChart data={rows} margin={{ top: 6, right: 12, bottom: 4, left: 0 }}>
              <CartesianGrid stroke="rgba(237,232,220,0.06)" vertical={false} />
              <XAxis dataKey="computed_at" tickFormatter={(x) => (x || "").slice(2, 7)} tick={{ fill: C.muted, fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" />
              <YAxis domain={[0, 100]} ticks={[0, 45, 60, 100]} tick={{ fill: C.muted, fontSize: 9.5 }} stroke="rgba(237,232,220,0.18)" width={28} />
              <Tooltip content={<HistTip />} />
              <ReferenceLine y={45} stroke="#E0B458" strokeOpacity={0.4} strokeDasharray="3 3" />
              <ReferenceLine y={60} stroke="#E05252" strokeOpacity={0.4} strokeDasharray="3 3" />
              <Area dataKey="band" stroke="none" fill="#5B8DEF" fillOpacity={0.14} isAnimationActive={false} />
              <Line dataKey="median" stroke="#E0B458" strokeWidth={2} dot={false} isAnimationActive={false} />
            </ComposedChart>
          </ResponsiveContainer>
        )}
        <div style={{ marginTop: 8, fontSize: 10.5, color: C.faint, lineHeight: 1.6 }}>
          <b style={{ color: C.muted }}>Methodology changelog:</b> {CHANGELOG.map((c) => c.v + (c.score != null ? " (" + c.score + ")" : "")).join(" → ")}. {COPY.changelogTip}
        </div>
      </Panel>
    );
  }

  // (6) Epistemic panel
  function EpistemicPanel({ meta }) {
    const st = useStatus();
    const caveats = (meta && meta.epistemic_caveats && meta.epistemic_caveats.length) ? meta.epistemic_caveats : EPISTEMIC;
    const cov = meta && meta.coverage;
    const audit = st.json && st.json.science_audit;
    const sevColor = { error: "#E05252", warn: "#E0B458", info: C.muted };
    return (
      <Panel style={{ borderLeft: "3px solid #5AA9A3" }}>
        <H sub="the honesty is the feature, not the fine print">Epistemic status</H>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
          {caveats.map((c, i) => <span key={i} style={{ fontSize: 10.5, color: C.dim, background: "rgba(237,232,220,0.04)", border: "1px solid rgba(237,232,220,0.1)", borderRadius: 6, padding: "4px 8px", lineHeight: 1.4 }}>{c}</span>)}
        </div>
        {cov && (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap", marginBottom: 10 }}>
            {["S", "D"].map((k) => cov[k] && (
              <div key={k} style={{ flex: "1 1 160px" }}>
                <div style={{ fontSize: 10.5, color: C.muted, marginBottom: 3 }}>Block {k} coverage {Math.round(cov[k].coverage * 100)}%{cov[k].degraded ? " · degraded" : ""}</div>
                <div style={{ height: 6, borderRadius: 99, background: "rgba(237,232,220,0.07)" }}>
                  <div style={{ width: Math.round(cov[k].coverage * 100) + "%", height: "100%", borderRadius: 99, background: cov[k].degraded ? "#E8853D" : "#7fbf94" }} />
                </div>
              </div>
            ))}
          </div>
        )}
        <div style={{ marginBottom: 10 }}>
          <div style={{ ...BS.eyebrow, marginBottom: 5 }}>What would prove this wrong</div>
          <ul style={{ margin: 0, paddingLeft: 16, fontSize: 11.5, color: C.dim, lineHeight: 1.6 }}>
            {FALSIFY.map((f, i) => <li key={i} style={{ marginBottom: 3 }}>{f}</li>)}
          </ul>
        </div>
        {audit && audit.flags && (
          <div>
            <div style={{ ...BS.eyebrow, marginBottom: 5 }}>Science audit ({audit.counts ? audit.counts.error + " err · " + audit.counts.warn + " warn · " + audit.counts.info + " info" : audit.flags.length})</div>
            {audit.flags.map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 8, padding: "5px 0", borderTop: "1px solid rgba(237,232,220,0.05)" }}>
                <Pill color={sevColor[f.severity] || C.muted} outline>{f.severity}</Pill>
                <div style={{ fontSize: 11, color: C.dim, lineHeight: 1.5 }}><b style={{ color: C.text }}>{f.title}</b> — {f.detail}{f.ref ? <span style={{ color: C.faint }}> ({f.ref})</span> : null}</div>
              </div>
            ))}
          </div>
        )}
        <p style={{ fontSize: 11, color: C.muted, lineHeight: 1.65, margin: "10px 0 0" }}>{COPY.notProbLong}</p>
      </Panel>
    );
  }

  // (7) Fusion / crisis-analogue
  function FusionPanel({ d, goToCrisis }) {
    const rows = useMemo(() => analogues(todayFingerprint(d)), [d]);
    const top = rows[0];
    return (
      <Panel style={{ borderTop: "2px solid #E0B458" }}>
        <H sub="from Block S composition · analogy, not forecast">{COPY.fusionHeader}</H>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          {rows.map((r) => (
            <button key={r.label} onClick={() => goToCrisis && goToCrisis(r.explorer)} style={{
              cursor: goToCrisis ? "pointer" : "default", borderRadius: 8, padding: "8px 11px", textAlign: "left",
              border: "1px solid " + (r === top ? "#E0B458" : "rgba(237,232,220,0.14)"),
              background: r === top ? "rgba(224,180,88,0.1)" : "transparent", color: C.text, flex: "1 1 150px" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <span style={{ ...BS.serif, fontSize: 16, fontWeight: 700 }}>{r.label}</span>
                <span style={{ fontSize: 12, fontWeight: 700, color: r === top ? "#E0B458" : C.muted }}>{Math.round(r.similarity * 100)}%</span>
              </div>
              <div style={{ height: 5, borderRadius: 99, background: "rgba(237,232,220,0.07)", margin: "5px 0" }}>
                <div style={{ width: Math.round(r.similarity * 100) + "%", height: "100%", borderRadius: 99, background: r === top ? "#E0B458" : C.muted, opacity: 0.8 }} />
              </div>
              <div style={{ fontSize: 10, color: C.faint, lineHeight: 1.4 }}>{r.note}</div>
            </button>
          ))}
        </div>
        {top && (
          <div style={{ fontSize: 11.5, color: C.dim, lineHeight: 1.6 }}>
            <b style={{ color: C.text }}>Nearest analogue: {top.label}.</b> Per-dimension gap (smaller = more alike):
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 6 }}>
              {top.per.map((p) => (
                <span key={p.k} style={{ fontSize: 10, color: C.muted, background: "rgba(237,232,220,0.04)", borderRadius: 5, padding: "3px 7px" }}>
                  {p.label}: {p.gap == null ? "n/a" : "Δ" + p.gap.toFixed(2)}
                </span>
              ))}
            </div>
          </div>
        )}
        <p style={{ fontSize: 11, color: C.faint, lineHeight: 1.6, margin: "10px 0 0" }}>
          This is a weak, stylized similarity across five hand-set dimensions — an analogy, not a forecast. Today may match NO past
          crisis (rational general-purpose-technology repricing; n≈4 reference class). The leverage dimension is approximate (no direct
          block-S leverage indicator). Jordà-Schularick-Taylor: <i>unlevered</i> equity bubbles historically produce shallower macro
          damage than credit-levered ones — use the nearest analogue to weight which havens in the atlas are most relevant, then judge for yourself.
        </p>
        {goToCrisis && top.explorer && (
          <button onClick={() => goToCrisis(top.explorer)} style={{ marginTop: 10, cursor: "pointer", fontSize: 12, fontWeight: 700,
            color: "#0E1526", background: "#E0B458", border: "none", borderRadius: 7, padding: "7px 12px" }}>
            Open the atlas → {top.label} ›
          </button>
        )}
      </Panel>
    );
  }

  /* ---------- DetailTab composition ---------- */

  function DetailInner({ goToCrisis }) {
    const s = useScore();
    if (s.loading) return <Panel><div style={{ color: C.faint, fontSize: 13 }}>loading the regime gauge…</div></Panel>;
    if (s.notReady) return <Panel><div style={{ color: C.faint, fontSize: 13 }}>The gauge is warming up — no snapshot has been computed yet. Check back shortly.</div></Panel>;
    if (s.error || !s.json) return <Panel><div style={{ color: C.faint, fontSize: 13 }}>The regime gauge is unavailable right now. The crisis atlas is unaffected.</div></Panel>;
    const d = s.json.data, meta = s.json.meta;
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <HeadlinePanel d={d} meta={meta} />
        <AnatomyPanel d={d} />
        <RedFlagPanel d={d} />
        <LadderPanel d={d} />
        <HistoryPanel />
        <FusionPanel d={d} goToCrisis={goToCrisis} />
        <EpistemicPanel meta={meta} />
        <div style={{ fontSize: 10, color: C.faint, textAlign: "center", lineHeight: 1.6 }}>
          bubblegauge {meta.service_version || "3.1.0"} · {meta.disclaimer || "Research, not advice."}{DEMO ? " · DEMO fixture (offline) — re-verify against the live service" : ""}
        </div>
      </div>
    );
  }

  function DetailTab(props) {
    return <Boundary fallback={<Panel><div style={{ color: C.faint, fontSize: 13 }}>The regime gauge hit an error and was isolated. The crisis atlas is unaffected.</div></Panel>}>
      <DetailInner goToCrisis={props.goToCrisis} />
    </Boundary>;
  }

  function StripBoundary(props) {
    return <Boundary fallback={null}><Strip goToDetail={props.goToDetail} /></Boundary>;
  }

  /* ============================================================
     Dashboard feed (bubblegauge >= 3.4.0, DASHBOARD_FEED_SPEC v1.0)
     GET /api/v1/dashboard/feed — 12 monthly series (61 points,
     t-60..t0) + 34 scalar metrics. Used to RE-ANCHOR the atlas's
     AI-2026 panel with current data: the hardcoded anchors in
     dashboard.jsx stay as the labeled static fallback.
     ============================================================ */

  // Demo-fixture series: stylized paths scaled to the real capture-#2
  // endpoints (2026-07-15). Month index 0 = "2021-07" ... 60 = "2026-07".
  const FEED_FIX_SERIES = {
    qqq: [362.61,372.58,382.55,392.53,402.5,388.6,374.7,360.8,346.9,333,319.1,309.77,300.45,291.12,281.8,272.48,263.15,253.83,272.56,291.3,310.03,328.77,347.5,366.24,374.29,382.35,390.41,398.47,406.53,414.58,422.64,430.7,438.76,455.08,471.39,487.71,504.03,507.05,510.07,513.09,516.11,519.14,522.16,500.4,451.45,402.5,430.78,459.06,487.35,515.63,543.91,557.21,570.51,583.8,577.46,571.11,564.77,558.42,650.88,743.35,711.8],
    gold: [169,168.1,167.2,166.3,165.39,164.49,163.59,162.69,161.79,160.89,159.99,159.09,158.18,157.28,156.38,155.48,158.65,161.82,164.99,168.16,171.32,174.49,177.66,180.83,183.65,186.46,189.28,192.1,194.91,197.73,200.55,203.36,206.18,210.69,215.19,219.7,224.21,228.71,233.22,237.73,242.23,246.74,258.57,270.4,282.23,294.34,306.45,318.56,330.68,342.79,354.9,378.56,402.22,425.88,475.74,525.59,485.59,445.6,405.6,397.15,388.7],
    tbill3m_tr: [91.55,91.58,91.61,91.64,91.67,91.7,91.73,91.76,91.79,91.82,91.86,91.89,91.92,92.12,92.32,92.52,92.72,92.92,93.25,93.58,93.9,94.23,94.56,94.89,95.21,95.76,96.31,96.86,97.41,97.96,98.34,98.72,99.1,99.48,99.87,100.25,100.63,101.01,101.39,101.77,102.15,102.54,102.92,103.3,103.68,104.06,104.44,104.82,105.21,105.59,105.97,106.35,106.73,107.11,107.44,107.77,108.09,108.42,108.75,109.08,109.4],
    ust10y_tr: [118,117.53,117.06,116.58,116.11,115.64,115.17,114.7,114.22,113.75,113.28,111.43,109.57,107.72,105.86,104.01,102.15,100.3,99.95,99.59,99.24,98.88,98.53,98.18,97.82,97.47,97.11,96.76,99.12,101.48,101.68,101.87,102.07,102.27,102.46,102.66,102.86,103.05,103.25,103.45,103.64,103.84,104.33,104.82,105.31,105.81,106.3,106.79,107.28,107.77,108.27,108.76,109.25,109.74,110.08,110.41,110.75,111.09,111.43,111.76,112.1],
    usdchf: [0.905,0.9099,0.9148,0.9197,0.9247,0.9298,0.9349,0.9401,0.9453,0.9506,0.956,0.9614,0.9669,0.9724,0.978,0.9837,0.9709,0.9584,0.9462,0.9344,0.9228,0.9115,0.9005,0.8897,0.8793,0.869,0.859,0.8492,0.8396,0.8303,0.8354,0.8406,0.8458,0.8511,0.8565,0.8619,0.8674,0.873,0.8786,0.8844,0.8902,0.896,0.8865,0.8771,0.8679,0.8589,0.8501,0.8415,0.8331,0.8248,0.8167,0.8087,0.8009,0.7847,0.7691,0.7542,0.7637,0.7735,0.7835,0.7939,0.8044],
    usdjpy: [109.8,111.81,113.9,116.07,118.32,120.66,123.09,125.63,128.27,131.03,133.9,136.91,140.05,143.34,146.79,150.41,150.24,150.07,149.9,149.73,149.56,149.39,149.22,149.05,148.88,148.71,148.55,148.38,149.73,151.1,152.5,153.93,155.38,156.86,158.37,159.9,161.47,160.68,159.9,159.13,158.37,157.61,156.86,156.11,155.38,154.65,153.93,153.21,152.5,153.26,154.03,154.81,155.6,156.39,157.19,158,158.82,159.65,160.49,161.33,162.19],
    usd_broad_index: [112.67,114.68,116.7,118.71,120.72,122.73,124.74,126.76,128.77,130.78,132.79,134.8,136.82,138.83,140.84,139.71,138.59,137.46,136.33,135.21,134.08,132.95,131.83,130.7,129.57,128.45,127.32,126.19,125.07,123.94,124.6,125.25,125.91,126.57,127.22,127.88,128.54,129.2,129.85,130.51,131.17,131.83,129.73,127.64,125.55,123.46,121.36,119.27,117.18,117.55,117.93,118.3,118.68,119.06,119.43,119.62,119.81,120,120.18,120.37,120.56],
    btc: [35628,44802,53976,63151,72325,68049,63774,59499,55223,50948,46673,42397,38122,33847,29571,25296,21021,16745,18645,20545,22446,24346,26246,28146,32006,35866,39725,43585,47445,51304,55164,59024,62883,66743,70603,74463,78322,82182,86042,89901,93761,97621,101077,104533,107988,111444,114900,118356,121812,125268,128724,132180,121670,111159,102965,94770,86576,78382,73869,69356,64843],
  };
  function fixMonth(i) {
    const y = 2021 + Math.floor((6 + i) / 12), m = ((6 + i) % 12) + 1;
    return y + "-" + (m < 10 ? "0" : "") + m;
  }
  // Feed delta v1.1: fear_greed is a sentiment_index on its own 0-100 axis. CNN's payload only
  // carries ~13 months of history, so the 61-month grid ships ~48 leading nulls — explicit,
  // never interpolated, and null ≠ zero. Demo path is stylized; endpoints match the demo metric.
  const FG_FIX_SERIES = [null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,null,31,36,44,52,58,49,41,34,27,24,29,31,46];
  const FEED_FIX_META = { qqq: ["NASDAQ-100 (QQQ ETF proxy, dividend-adjusted)", "total_return", "tiingo:QQQ"],
    gold: ["Gold (GLD ETF proxy)", "price", "tiingo:GLD"], tbill3m_tr: ["3M T-bills / cash TR (BIL ETF proxy)", "total_return", "tiingo:BIL"],
    ust10y_tr: ["10Y US Treasuries TR (IEF ETF proxy)", "total_return", "tiingo:IEF"], usdchf: ["USD/CHF (Fed H.10)", "price", "fred:DEXSZUS"],
    usdjpy: ["USD/JPY (Fed H.10)", "price", "fred:DEXJPUS"], usd_broad_index: ["US dollar (Fed Broad Dollar Index)", "index", "fred:DTWEXBGS"],
    btc: ["Bitcoin (BTC/USD)", "price", "twelvedata:BTC/USD"] };
  const FEED_FIXTURE = {
    data: {
      anchor_month: "2026-07", anchor_partial: true,
      series: (function () {
        const out = {};
        Object.keys(FEED_FIX_SERIES).forEach(function (k) {
          out[k] = { name: FEED_FIX_META[k][0], kind: FEED_FIX_META[k][1], unit: "USD",
            points: FEED_FIX_SERIES[k].map(function (v, i) { return { month: fixMonth(i), value: v }; }),
            as_of: "2026-07-15", source: FEED_FIX_META[k][2], available: true, stale: false };
        });
        // v1.1: first non-price kind — kept off the rebasing path (AI_MAP) by design.
        out.fear_greed = { name: "CNN Fear & Greed Index", kind: "sentiment_index", unit: "index_0_100",
          points: FG_FIX_SERIES.map(function (v, i) { return { month: fixMonth(i), value: v }; }),
          as_of: "2026-07-15", source: "cnn:fear_greed", available: true, stale: false };
        return out;
      })(),
      // Real capture-#2 scalar values (2026-07-15T23:29:51Z), abbreviated to the ones the card renders.
      metrics: {
        cape: { value: 42.18, unit: "ratio", as_of: "2026-07-15", source: "multpl", available: true, stale: false },
        sp500_top10_weight_pct: { value: 37.54, unit: "pct", as_of: "2026-07-15", source: "ssga_spy_xlsx", available: true, stale: false },
        hy_oas_bps: { value: 272.0, unit: "bps", as_of: "2026-07-14", source: "fred:BAMLH0A0HYM2", available: true, stale: false },
        gold_spot: { value: 4058.69, unit: "USD", as_of: "2026-07-16", source: "twelvedata:XAU/USD", available: true, stale: false },
        usdjpy: { value: 162.09, unit: "JPY-per-USD", as_of: "2026-07-16", source: "twelvedata:USD/JPY", available: true, stale: false },
        usdchf: { value: 0.80483, unit: "CHF-per-USD", as_of: "2026-07-16", source: "twelvedata:USD/CHF", available: true, stale: false },
        btc_spot: { value: 64843.57, unit: "USD", as_of: "2026-07-15", source: "twelvedata:BTC/USD", available: true, stale: false },
        btc_drawdown_pct: { value: -43.99, unit: "pct", as_of: "2026-07-15", source: "twelvedata:BTC/USD", available: true, stale: false, note: "vs btc_ath (provider monthly closes since 2017-08 + spot - not a curated record)" },
        gold_ttm_pct: { value: 22.9, unit: "pct", as_of: "2026-07-31", source: "tiingo:GLD", available: true, stale: false, note: "trailing 12 months, GLD basis" },
        mmf_total_assets_usd: { value: 8289569.0, unit: "USD_mn", as_of: "2026-01-01", source: "fred:MMMFFAQ027S", available: true, stale: true, note: "quarterly Z.1 - publication lags ~1 quarter" },
        fear_greed: { value: 46.0, unit: "index_0_100", as_of: "2026-07-15", source: "cnn:fear_greed", available: true, stale: false,
          note: "unofficial CNN endpoint; non-scoring context (demo fixture)",
          detail: { rating: "neutral", timestamp: "2026-07-15T23:19:21+00:00", previous_close: 46, previous_1_week: 44, previous_1_month: 31, previous_1_year: 31 } },
      },
    },
    meta: { computed_at: "2026-07-15T23:29:51+00:00", service_version: "3.4.0", disclaimer: "Research, not advice." },
  };

  function validFeed(j) {
    return !!(j && j.data && j.data.series && typeof j.data.series === "object" &&
      j.data.metrics && typeof j.data.metrics === "object" && typeof j.data.anchor_month === "string");
  }

  // Feed delta v1.1 — CNN Fear & Greed boundary contract. Snapshotted SERVER-side by the
  // bubblegauge service (the unofficial CNN endpoint is UA-gated and serves no CORS; the
  // browser never calls it). Non-scoring context for the bubble score. A reading outside the
  // published 0..100 range or with an unknown rating is dropped, not rendered; previous_*
  // values are 0-100 or null, and null means "no observation", never zero.
  const FG_RATINGS = ["extreme fear", "fear", "neutral", "greed", "extreme greed"];
  const FG_COLORS = { "extreme fear": "#E05252", "fear": "#C0564A", "neutral": "#C7CBD6", "greed": "#7fbf94", "extreme greed": "#5AA9A3" };
  const FG_ZONES = [25, 45, 55, 75]; // zone band edges on the 0-100 axis
  function validFearGreed(m) {
    if (!(m && m.available && isNum(m.value) && m.value >= 0 && m.value <= 100)) return false;
    const rating = m.detail && m.detail.rating;
    return rating == null || FG_RATINGS.indexOf(rating) !== -1;
  }
  const useFeed = () => useEndpoint("/api/v1/dashboard/feed", FEED_FIXTURE, validFeed);

  // Feed-key -> AI-2026 panel line. inv: chart shows the CURRENCY vs USD, so FX pairs invert.
  const AI_MAP = {
    mkt:  { key: "qqq",             inv: false, label: "NASDAQ-100 (QQQ TR proxy) — feared market" },
    au:   { key: "gold",            inv: false, label: "Gold (GLD proxy) — lead regime-matched hedge" },
    cash: { key: "tbill3m_tr",      inv: false, label: "3M T-bills / cash TR (BIL proxy) — phase 1" },
    ust:  { key: "ust10y_tr",       inv: false, label: "10Y US Treasuries TR (IEF proxy) — challenged" },
    chf:  { key: "usdchf",          inv: true,  label: "Swiss franc vs USD (inverted USD/CHF)" },
    usd:  { key: "usd_broad_index", inv: false, label: "US dollar (Fed broad index — not DXY)" },
    jpy:  { key: "usdjpy",          inv: true,  label: "Japanese yen vs USD (inverted USD/JPY)" },
    btc:  { key: "btc",             inv: false, label: "Bitcoin (BTC/USD)" },
  };

  function buildAiLive(json) {
    if (!json || !validFeed(json)) return null;
    const d = json.data, out = { a: {}, labels: {}, live: {}, asOf: {}, anchorMonth: d.anchor_month,
      anchorPartial: !!d.anchor_partial, computedAt: json.meta && json.meta.computed_at,
      serviceVersion: json.meta && json.meta.service_version, metrics: d.metrics,
      // v1.1: fear_greed rides along RAW — its own 0-100 axis, never through the rebasing below.
      fgSeries: d.series.fear_greed || null };
    Object.keys(AI_MAP).forEach(function (lineKey) {
      const m = AI_MAP[lineKey], s = d.series[m.key];
      if (!s || !s.available || !Array.isArray(s.points)) { out.live[lineKey] = false; return; }
      const anchors = [];
      s.points.forEach(function (p, i) {
        if (p && isNum(p.value) && p.value > 0) anchors.push([i - 60, m.inv ? 1 / p.value : p.value]);
      });
      if (anchors.length < 2) { out.live[lineKey] = false; return; }
      out.a[lineKey] = anchors;
      out.labels[lineKey] = m.label;
      out.live[lineKey] = true;
      out.asOf[lineKey] = s.as_of || null;
    });
    return Object.keys(out.a).length ? out : null;
  }

  // Hook consumed by dashboard.jsx (Explorer / Aggregate / Analytics integration seams).
  function useAiLive() {
    const f = useFeed();
    return useMemo(function () { return f.json ? buildAiLive(f.json) : null; }, [f.json]);
  }

  // Compact live-readings card mounted under the AI-2026 "POTENTIAL crisis" banner.
  function fmtMetric(mx, id, fmt) {
    const m = mx && mx[id];
    if (!m || !m.available || !isNum(m.value)) return null;
    return { text: fmt(m.value), title: (m.as_of ? "as of " + m.as_of : "") + (m.source ? " · " + m.source : "") + (m.note ? " · " + m.note : ""), stale: !!m.stale };
  }
  // v1.1 Fear & Greed block: 0-100 gauge with zone bands at FG_ZONES, rating label, previous_*
  // delta row, and the 61-month history strip on its OWN 0-100 axis (nulls are gaps — the ~48
  // leading nulls of CNN's short history render as empty space, never as zero or a bridge).
  function FearGreedBlock({ live }) {
    const m = live.metrics && live.metrics.fear_greed;
    if (!validFearGreed(m)) return null; // failure shape (available:false / bad payload) → block absent
    const det = m.detail || {};
    const rating = det.rating || null;
    const col = (rating && FG_COLORS[rating]) || C.dim;
    const zoneCols = ["#5AA9A3", "#7fbf94", "#9AA3B5", "#C0564A", "#E05252"]; // flipped: red on the right (matches the regime gauge)
    const edges = [0].concat(FG_ZONES, [100]);
    const deltas = [["prev close", det.previous_close], ["1w", det.previous_1_week], ["1m", det.previous_1_month], ["1y", det.previous_1_year]]
      .filter((p) => isNum(p[1])); // null ≠ zero: a null comparison is skipped, never shown as 0
    const s = live.fgSeries;
    const pts = (s && s.available && Array.isArray(s.points)) ? s.points : null;
    // null-safe polyline segments: split wherever value == null (no interpolation across gaps)
    let segs = [];
    if (pts) {
      let cur = [];
      pts.forEach(function (p, i) {
        if (p && isNum(p.value)) cur.push((i / 60) * 100 + "," + (100 - p.value));
        else { if (cur.length > 1) segs.push(cur.join(" ")); cur = []; }
      });
      if (cur.length > 1) segs.push(cur.join(" "));
    }
    const tip = "as of " + (m.as_of || "?") + (det.timestamp ? " (" + det.timestamp + ")" : "") + " · " + (m.source || "cnn:fear_greed") +
      " · unofficial CNN endpoint — context only, does not feed the bubble score" + (m.note ? " · " + m.note : "");
    return (
      <div title={tip} style={{ marginTop: 8, marginBottom: 6, maxWidth: 420 }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
          <span style={{ fontSize: 10.5, color: C.muted }}>CNN Fear &amp; Greed</span>
          <b style={{ fontSize: 13, color: col, fontVariantNumeric: "tabular-nums" }}>{m.value.toFixed(1)}</b>
          {rating ? <span style={{ fontSize: 10.5, color: col, fontStyle: "italic" }}>{rating}</span> : null}
          {m.stale ? <span style={{ fontSize: 10, color: "#E8853D" }}>·stale</span> : null}
        </div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", display: "flex" }}>
          {zoneCols.map((zc, i) => (
            <div key={i} style={{ width: (edges[i + 1] - edges[i]) + "%", background: zc, opacity: 0.28 }} />
          ))}
          {trend3(det.previous_1_month, det.previous_1_week, m.value) && (
            <TrendTail pts={[det.previous_1_month, det.previous_1_week, m.value]} flip={true} barH={8} />
          )}
          <div style={{ position: "absolute", left: "calc(" + (100 - m.value) + "% - 1.5px)", top: 0, bottom: 0, width: 3, background: col, borderRadius: 1.5 }} />
        </div>
        {deltas.length > 0 && (
          <div style={{ fontSize: 9.5, color: C.faint, marginTop: 3 }}>
            {deltas.map((p, i) => (
              <span key={p[0]}>{i > 0 ? " · " : ""}{p[0]} <span style={{ color: C.dim, fontVariantNumeric: "tabular-nums" }}>{Math.round(p[1])}</span></span>
            ))}
          </div>
        )}
        {segs.length > 0 && (
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ display: "block", width: "100%", height: 34, marginTop: 4 }}>
            {FG_ZONES.map((z) => (
              <line key={z} x1="0" x2="100" y1={100 - z} y2={100 - z} stroke="rgba(237,232,220,0.10)" strokeWidth="0.8" vectorEffect="non-scaling-stroke" />
            ))}
            {segs.map((d, i) => (
              <polyline key={i} points={d} fill="none" stroke={col} strokeWidth="1.4" vectorEffect="non-scaling-stroke" />
            ))}
          </svg>
        )}
        {segs.length > 0 && (
          <div style={{ fontSize: 8.5, color: C.faint, display: "flex", justifyContent: "space-between" }}>
            <span>t−60 · gaps = no observation (CNN history ≈ 13 months)</span><span>{live.anchorMonth}</span>
          </div>
        )}
      </div>
    );
  }

  function AiLiveInner() {
    const live = useAiLive();
    if (!live) return null;
    const mx = live.metrics || {};
    const pills = [
      ["CAPE", fmtMetric(mx, "cape", (v) => v.toFixed(1))],
      ["Gold spot", fmtMetric(mx, "gold_spot", (v) => "$" + Math.round(v).toLocaleString("en-US"))],
      ["Gold 12m", fmtMetric(mx, "gold_ttm_pct", (v) => (v > 0 ? "+" : "") + v.toFixed(1) + "%")],
      ["USD/JPY", fmtMetric(mx, "usdjpy", (v) => v.toFixed(1))],
      ["USD/CHF", fmtMetric(mx, "usdchf", (v) => v.toFixed(3))],
      ["BTC", fmtMetric(mx, "btc_spot", (v) => "$" + Math.round(v / 1000) + "k")],
      ["BTC vs ATH", fmtMetric(mx, "btc_drawdown_pct", (v) => v.toFixed(0) + "%")],
      ["HY OAS", fmtMetric(mx, "hy_oas_bps", (v) => Math.round(v) + " bp")],
      ["Top-10 wt", fmtMetric(mx, "sp500_top10_weight_pct", (v) => v.toFixed(1) + "%")],
      ["MMF assets", fmtMetric(mx, "mmf_total_assets_usd", (v) => "$" + (v / 1e6).toFixed(2) + "tn")],
    ].filter((p) => p[1]);
    const staticLines = Object.keys(AI_MAP).filter((k) => !live.live[k]);
    return (
      <div style={{ ...BS.panel, padding: "10px 14px", marginTop: 10, borderLeft: "3px solid #7fbf94" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 }}>
          <span style={{ fontSize: 10.5, fontWeight: 800, letterSpacing: "0.1em", color: "#7fbf94" }}>LIVE BACKFILL</span>
          <span style={{ fontSize: 11, color: C.dim }}>
            series re-anchored to <b>{live.anchorMonth}</b>{live.anchorPartial ? " (month in progress — t0 is month-to-date)" : ""} via the bubblegauge feed{live.serviceVersion ? " " + live.serviceVersion : ""}{DEMO ? " · demo fixture" : ""}
          </span>
          <Freshness computedAt={live.computedAt} />
        </div>
        {pills.length > 0 && (
          <div style={{ display: "flex", gap: "4px 10px", flexWrap: "wrap", marginBottom: 6 }}>
            {pills.map((p) => (
              <span key={p[0]} title={p[1].title} style={{ fontSize: 10.5, color: C.dim, whiteSpace: "nowrap" }}>
                <span style={{ color: C.muted }}>{p[0]}</span> <b style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>{p[1].text}</b>
                {p[1].stale ? <span style={{ color: "#E8853D" }}> ·stale</span> : null}
              </span>
            ))}
          </div>
        )}
        <FearGreedBlock live={live} />
        <div style={{ fontSize: 9.5, color: C.faint, lineHeight: 1.5 }}>
          Chart lines use labeled proxies (QQQ / GLD / IEF / BIL ETFs; Fed broad dollar index, not ICE DXY; FX lines inverted to show the currency vs USD).
          {staticLines.length ? " Static Jul-2026 snapshot (feed unavailable): " + staticLines.join(", ") + "." : ""}
          {" "}The panel's written analysis remains the Jul 2026 editorial snapshot. Refreshes twice daily.
        </div>
      </div>
    );
  }
  function AiLivePanel() { return <Boundary fallback={null}><AiLiveInner /></Boundary>; }

  // Compact CNN Fear & Greed STATUS line for the top strip area (feed-sourced, gated). Surfaces the
  // current reading + rating on its own 0-100 zone gauge, plus THE LAST THREE readings (previous
  // close / 1 week / 1 month — the three most recent CNN reference values, null-safe: null ≠ zero).
  // Same axis discipline as FearGreedBlock: own 0-100 scale, never rebased, never wired into AI_MAP;
  // the value is the server-side snapshot (the browser never calls CNN). No-ops (renders nothing)
  // when the feed carries no valid fear_greed metric, so the failure shape drops only this line.
  function FearGreedStripInner() {
    const f = useFeed();
    if (f.loading || f.notReady) return null;
    const j = f.json;
    const m = j && j.data && j.data.metrics && j.data.metrics.fear_greed;
    if (!validFearGreed(m)) return null;
    const det = m.detail || {};
    const rating = det.rating || null;
    const col = (rating && FG_COLORS[rating]) || C.dim;
    const zoneCols = ["#5AA9A3", "#7fbf94", "#9AA3B5", "#C0564A", "#E05252"]; // flipped: red on the right (matches the regime gauge)
    const edges = [0].concat(FG_ZONES, [100]);
    // "the last three values": the three most recent CNN reference readings. null is skipped, never a 0.
    const recent = [["prev close", det.previous_close], ["1w", det.previous_1_week], ["1m", det.previous_1_month]]
      .filter((p) => isNum(p[1]));
    const tip = "CNN Fear & Greed · as of " + (m.as_of || "?") + (det.timestamp ? " (" + det.timestamp + ")" : "") +
      " · " + (m.source || "cnn:fear_greed") + " · unofficial CNN endpoint — context only, does not feed the bubble score" + (m.note ? " · " + m.note : "");
    return (
      <aside aria-label="CNN Fear and Greed status" title={tip}
        style={{ ...BS.panel, background: C.panel2, padding: "8px 14px", margin: "0 0 14px",
          display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
          <span style={{ ...BS.eyebrow, color: C.muted }}>CNN Fear &amp; Greed</span>
          <b style={{ ...BS.serif, fontSize: 20, fontWeight: 700, color: col, fontVariantNumeric: "tabular-nums" }}>{m.value.toFixed(1)}</b>
          {rating ? <span style={{ fontSize: 11, color: col, fontStyle: "italic" }}>{rating}</span> : null}
          {m.stale ? <span style={{ fontSize: 10, color: "#E8853D" }}>·stale</span> : null}
        </div>
        <div style={{ position: "relative", height: 8, borderRadius: 4, overflow: "hidden", display: "flex", flex: "1 1 160px", minWidth: 120, maxWidth: 260 }}>
          {zoneCols.map((zc, i) => (
            <div key={i} style={{ width: (edges[i + 1] - edges[i]) + "%", background: zc, opacity: 0.28 }} />
          ))}
          {trend3(det.previous_1_month, det.previous_1_week, m.value) && (
            <TrendTail pts={[det.previous_1_month, det.previous_1_week, m.value]} flip={true} barH={8} />
          )}
          <div style={{ position: "absolute", left: "calc(" + (100 - m.value) + "% - 1.5px)", top: 0, bottom: 0, width: 3, background: col, borderRadius: 1.5 }} />
        </div>
        {recent.length > 0 && (
          <div style={{ fontSize: 10.5, color: C.faint, whiteSpace: "nowrap" }}>
            <span style={{ color: C.muted }}>last 3</span>{" "}
            {recent.map((p, i) => (
              <span key={p[0]}>{i > 0 ? " · " : ""}{p[0]} <span style={{ color: C.dim, fontVariantNumeric: "tabular-nums" }}>{Math.round(p[1])}</span></span>
            ))}
          </div>
        )}
        <div style={{ marginLeft: "auto" }}><Freshness computedAt={j.meta && j.meta.computed_at} /></div>
      </aside>
    );
  }
  function FearGreedStrip() { return <Boundary fallback={null}><FearGreedStripInner /></Boundary>; }

  /* ---------- 5C · Mobile opening splash (portrait, gated, once per session) ---------- */
  // Full-viewport "opening" that showcases where we stand on the AI bubble: the regime score on a
  // 270-degree radial gauge (dim HOLD/TRIM/DE-RISK zones at the real 45/60 band edges), the CNN
  // Fear & Greed status, and a few live stats, with a small top-right close. TRIPLE-GATED: only when
  // the ?status-api gate is on AND the API is connected (score data present — not loading/warming/
  // error), only on a SMALL PORTRAIT screen, and only until dismissed this session. With no gate it
  // never mounts (zero footprint); on desktop / the acceptance viewport it never shows.
  const SPL = { cx: 195, cy: 150, r: 118, a0: 135, sweep: 270 };
  function splPol(r, deg) { const a = (deg * Math.PI) / 180; return [SPL.cx + r * Math.cos(a), SPL.cy + r * Math.sin(a)]; }
  function splArc(t0, t1, r) {
    r = r || SPL.r;
    const p0 = splPol(r, SPL.a0 + t0 * SPL.sweep), p1 = splPol(r, SPL.a0 + t1 * SPL.sweep);
    const large = (t1 - t0) * SPL.sweep > 180 ? 1 : 0; // arc-degrees > 180 needs the large-arc flag
    return "M" + p0[0].toFixed(1) + " " + p0[1].toFixed(1) + " A" + r + " " + r + " 0 " + large + " 1 " + p1[0].toFixed(1) + " " + p1[1].toFixed(1);
  }
  function splIsSmallPortrait() {
    try { return !!(window.matchMedia && window.matchMedia("(max-width: 640px) and (orientation: portrait)").matches); } catch (e) { return false; }
  }
  function splSeen() { try { return sessionStorage.getItem("bubblegauge:splash-seen") === "1"; } catch (e) { return false; } }
  function splRel(iso) {
    if (!iso) return "";
    const t = Date.parse(iso);
    if (!isFinite(t)) return "";
    const h = (Date.now() - t) / 36e5;
    return h < 1 ? "updated <1h ago" : h < 48 ? "updated " + Math.round(h) + "h ago" : "updated " + Math.round(h / 24) + "d ago";
  }

  function SplashInner() {
    const score = useScore();
    const live = useAiLive();
    const hist = useHistory();
    const [open, setOpen] = useState(function () { return !splSeen() && splIsSmallPortrait(); }); // shown once on opening
    const [portrait, setPortrait] = useState(splIsSmallPortrait);
    const [dismissed, setDismissed] = useState(splSeen);
    useEffect(function () {
      // reactive small-portrait tracking so the re-open icon follows device rotation
      let mq;
      try { mq = window.matchMedia("(max-width: 640px) and (orientation: portrait)"); } catch (e) { return undefined; }
      const on = function () { setPortrait(mq.matches); };
      on();
      if (mq.addEventListener) mq.addEventListener("change", on); else if (mq.addListener) mq.addListener(on);
      return function () { if (mq.removeEventListener) mq.removeEventListener("change", on); else if (mq.removeListener) mq.removeListener(on); };
    }, []);
    if (score.loading || score.notReady || score.error || !score.json) return null; // only when the API is connected
    function reopen() { setOpen(true); }
    if (!open) {
      // once the splash has been shown AND closed, a small re-open icon lives top-right — portrait only
      if (!(portrait && dismissed)) return null;
      return (
        <div role="button" aria-label="Open AI bubble monitor" tabIndex={0} onClick={reopen}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reopen(); } }}
          style={{ position: "fixed", top: "calc(env(safe-area-inset-top,0px) + 10px)", right: 12, zIndex: 900,
            width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer" }}>
          <div style={{ width: 36, height: 36, borderRadius: 999, border: "1px solid rgba(224,180,88,0.5)",
            background: "rgba(11,17,31,0.72)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 2px 10px rgba(0,0,0,0.35)" }}>
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M6.34 18.16 A8 8 0 1 1 17.66 18.16" fill="none" stroke="rgba(224,180,88,0.3)" strokeWidth="2" strokeLinecap="round" />
              <path d="M6.34 18.16 A8 8 0 0 1 8.37 5.37" fill="none" stroke="#E0B458" strokeWidth="2" strokeLinecap="round" />
              <circle cx="8.37" cy="5.37" r="1.9" fill="#E0B458" />
            </svg>
          </div>
        </div>
      );
    }
    const d = score.json.data, meta = score.json.meta || {};
    const band = bandOf(d.action_band);
    const s = Math.max(0, Math.min(100, +d.headline_median));
    const t = s / 100, ang = SPL.a0 + t * SPL.sweep;
    const mk = splPol(SPL.r, ang), mkIn = splPol(SPL.r - 14, ang), mkOut = splPol(SPL.r + 16, ang);
    // recent-move highlight (V2 "Kielwasser" on the arc): brighten the segment the score has
    // traversed over the last 3 readings, so where it just came from reads at a glance.
    const regT = regimeTrend(hist, d.headline_median);
    const tRecent = regT ? Math.max(0, Math.min(1, regT[0] / 100)) : null;
    const tLo = regT ? Math.min(tRecent, t) : 0, tHi = regT ? Math.max(tRecent, t) : 0;
    // a FILLED arrowhead riding the arc at the marker, pointing along the tangent in the direction
    // the score has been moving (clockwise = rising) — the arc's counterpart to the bars' arrow.
    const arcArrow = (function () {
      if (!regT || Math.abs(t - tRecent) < 0.012) return null;
      const aRad = (ang * Math.PI) / 180, sgn = t >= tRecent ? 1 : -1;
      const tx = -Math.sin(aRad), ty = Math.cos(aRad); // +angle (clockwise) tangent
      const nx = Math.cos(aRad), ny = Math.sin(aRad); // radial normal
      const AHL = 12, AHH = 6.4, bx = mk[0] - sgn * tx * 2, by = mk[1] - sgn * ty * 2; // base a hair behind
      const tip = [mk[0] + sgn * tx * AHL, mk[1] + sgn * ty * AHL];
      return "M" + tip[0].toFixed(1) + " " + tip[1].toFixed(1) +
        " L" + (bx + nx * AHH).toFixed(1) + " " + (by + ny * AHH).toFixed(1) +
        " L" + (bx - nx * AHH).toFixed(1) + " " + (by - ny * AHH).toFixed(1) + " Z";
    })();
    // arc arrowhead takes the colour of the arc END it heads toward: rising→red (100), falling→blue (0).
    const arcArrowColor = regT ? (t >= tRecent ? "#E05252" : "#5B8DEF") : null;
    const mx = (live && live.metrics) || null;
    const fg = mx && mx.fear_greed, fgOk = validFearGreed(fg);
    const fgCol = fgOk ? ((fg.detail && FG_COLORS[fg.detail.rating]) || C.dim) : C.dim;
    const fgRecent = fgOk ? [["prev", fg.detail && fg.detail.previous_close], ["1w", fg.detail && fg.detail.previous_1_week], ["1m", fg.detail && fg.detail.previous_1_month]]
      .filter((p) => isNum(p[1])).map((p) => p[0] + " " + Math.round(p[1])).join(" · ") : "";
    const trend = d.trend_states;
    const bandBlurb = { hold: "Structural risk present, not acute.", trim: "Fragility elevated — the trend rule is the trigger.", "de-risk": "Fragility high, or a hard override fired." }[d.action_band] || "Not scored — inputs degraded.";
    const chips = [
      ["CAPE", fmtMetric(mx, "cape", (v) => v.toFixed(1)), "#E05252"],
      ["Top-10", fmtMetric(mx, "sp500_top10_weight_pct", (v) => v.toFixed(1) + "%"), "#E0B458"],
      ["HY OAS", fmtMetric(mx, "hy_oas_bps", (v) => Math.round(v) + " bp"), "#7fbf94"],
      ["Gold", fmtMetric(mx, "gold_spot", (v) => "$" + Math.round(v).toLocaleString("en-US")), "#E0B458"],
      ["BTC", fmtMetric(mx, "btc_spot", (v) => "$" + Math.round(v / 1000) + "k"), "#E05252"],
    ].filter((c) => c[1]);
    const goldTtm = fmtMetric(mx, "gold_ttm_pct", (v) => (v > 0 ? "+" : "") + v.toFixed(1) + "%");
    const btcDd = fmtMetric(mx, "btc_drawdown_pct", (v) => v.toFixed(0) + "%");
    function close() { try { sessionStorage.setItem("bubblegauge:splash-seen", "1"); } catch (e) {} setDismissed(true); setOpen(false); }

    return (
      <div role="dialog" aria-modal="true" aria-label="AI bubble monitor — opening"
        style={{ position: "fixed", inset: 0, zIndex: 1000, background: C.bg, color: C.text,
          overflowY: "auto", WebkitOverflowScrolling: "touch", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
        <div style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", position: "relative",
          padding: "calc(env(safe-area-inset-top,0px) + 8px) 0 calc(env(safe-area-inset-bottom,0px) + 18px)" }}>
          <div aria-hidden="true" style={{ position: "absolute", top: 70, left: 0, right: 0, height: 340, pointerEvents: "none",
            background: "radial-gradient(circle at 50% 42%,rgba(224,180,88,0.13),rgba(224,180,88,0.04) 42%,transparent 66%)" }} />
          <div role="button" aria-label="Close" tabIndex={0} onClick={close}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); close(); } }}
            style={{ position: "absolute", top: "calc(env(safe-area-inset-top,0px) + 10px)", right: 12, width: 44, height: 44,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", zIndex: 5 }}>
            <div style={{ width: 32, height: 32, borderRadius: 999, border: "1px solid rgba(237,232,220,0.14)",
              display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(11,17,31,0.5)" }}>
              <svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M1 1 L11 11 M11 1 L1 11" stroke={C.muted} strokeWidth="1.4" strokeLinecap="round" /></svg>
            </div>
          </div>
          <div style={{ padding: "22px 26px 0" }}>
            <div style={{ ...BS.eyebrow }}>AI Bubble Monitor{live && live.anchorMonth ? " · " + live.anchorMonth : ""}</div>
            <div style={{ ...BS.serif, fontSize: 27, lineHeight: 1.14, color: C.text, marginTop: 9, letterSpacing: "0.01em" }}>
              Where we stand<br /><span style={{ color: C.dim }}>on the AI bubble</span>
            </div>
            <div style={{ fontSize: 11, color: C.faint, marginTop: 8, display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
              <span style={{ width: 5, height: 5, borderRadius: 999, background: "#7fbf94", display: "inline-block" }} />
              {(live && live.anchorPartial ? "Month-to-date · " : "") + (splRel(meta.computed_at) || "live")}
              {DEMO ? <span style={{ border: "1px solid rgba(237,232,220,0.14)", borderRadius: 999, padding: "1px 6px", fontSize: 9, letterSpacing: "0.08em", color: C.muted, textTransform: "uppercase" }}>demo</span> : null}
            </div>
          </div>
          <div style={{ position: "relative", marginTop: 4, display: "flex", justifyContent: "center" }}>
            <svg viewBox="0 0 390 258" width="100%" style={{ maxWidth: 390, height: "auto", display: "block" }}
              aria-label={"Regime score " + Math.round(s) + " of 100, action band " + band.label.toLowerCase()}>
              <defs><filter id="splSoft" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="2.4" /></filter></defs>
              <circle cx="195" cy="150" r="140" fill="none" stroke="rgba(237,232,220,0.05)" strokeWidth="1" />
              <circle cx="195" cy="150" r="96" fill="none" stroke="rgba(237,232,220,0.045)" strokeWidth="1" />
              <path d={splArc(0, 1)} fill="none" stroke="rgba(237,232,220,0.07)" strokeWidth="11" strokeLinecap="round" />
              <path d={splArc(0, 0.45)} fill="none" stroke="#5B8DEF" strokeOpacity="0.28" strokeWidth="11" strokeLinecap="round" />
              <path d={splArc(0.45, 0.6)} fill="none" stroke="#E0B458" strokeOpacity="0.3" strokeWidth="11" />
              <path d={splArc(0.6, 1)} fill="none" stroke="#E05252" strokeOpacity="0.28" strokeWidth="11" strokeLinecap="round" />
              <path d={splArc(0, t)} fill="none" stroke={band.color} strokeOpacity="0.22" strokeWidth="11" strokeLinecap="round" filter="url(#splSoft)" />
              <path d={splArc(0, t)} fill="none" stroke={band.color} strokeWidth="4.5" strokeLinecap="round" />
              {regT && tHi - tLo > 0.012 && (
                <>
                  <path d={splArc(tLo, tHi)} fill="none" stroke={band.color} strokeOpacity="0.5" strokeWidth="12" strokeLinecap="round" filter="url(#splSoft)" />
                  <path d={splArc(tLo, tHi)} fill="none" stroke={band.color} strokeWidth="4.5" strokeLinecap="round" />
                </>
              )}
              <line x1={mkIn[0].toFixed(1)} y1={mkIn[1].toFixed(1)} x2={mkOut[0].toFixed(1)} y2={mkOut[1].toFixed(1)} stroke={C.bg} strokeWidth="4" />
              <line x1={mkIn[0].toFixed(1)} y1={mkIn[1].toFixed(1)} x2={mkOut[0].toFixed(1)} y2={mkOut[1].toFixed(1)} stroke={band.color} strokeWidth="2" />
              <circle cx={mk[0].toFixed(1)} cy={mk[1].toFixed(1)} r="7" fill={C.bg} stroke={band.color} strokeWidth="2" />
              <circle cx={mk[0].toFixed(1)} cy={mk[1].toFixed(1)} r="2.4" fill={band.color} />
              {arcArrow && <path d={arcArrow} fill={arcArrowColor} stroke={C.text} strokeWidth="1.1" strokeLinejoin="round" />}
              <text x="104" y="252" textAnchor="middle" fontFamily="Georgia,serif" fontSize="11" fill={C.faint} style={{ fontVariantNumeric: "tabular-nums" }}>0</text>
              <text x="286" y="252" textAnchor="middle" fontFamily="Georgia,serif" fontSize="11" fill={C.faint} style={{ fontVariantNumeric: "tabular-nums" }}>100</text>
              <text x="195" y="94" textAnchor="middle" fontSize="9.5" letterSpacing="3.4" fill={C.muted}>REGIME SCORE</text>
              <text x="195" y="164" textAnchor="middle" fontFamily="Georgia,'Times New Roman',serif" fontSize="76" fill={band.color} style={{ fontVariantNumeric: "tabular-nums" }} letterSpacing="0.01em">{Math.round(s)}</text>
              <text x="195" y="188" textAnchor="middle" fontSize="12.5" letterSpacing="4.6" fill={band.color}>{band.label}</text>
              <text x="195" y="208" textAnchor="middle" fontSize="10.5" fill={C.faint} style={{ fontVariantNumeric: "tabular-nums" }}>{"point est. " + d.point_score + (pair(d.iqr) ? " · IQR " + Math.round(d.iqr[0]) + "–" + Math.round(d.iqr[1]) : "")}</text>
            </svg>
          </div>
          <div style={{ margin: "2px 26px 0", paddingTop: 14, borderTop: "1px solid " + C.line, display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ maxWidth: 210 }}>
              <div style={{ ...BS.eyebrow }}>Action band</div>
              <div style={{ ...BS.serif, fontSize: 16, color: band.color, marginTop: 4 }}>{band.label}</div>
              <div style={{ fontSize: 11, color: C.faint, marginTop: 3, lineHeight: 1.45 }}>{bandBlurb}</div>
            </div>
            {pair(d.band_5_95) && (
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: C.faint }}>90% band</div>
                <div style={{ ...BS.serif, fontSize: 16, color: C.dim, marginTop: 3, fontVariantNumeric: "tabular-nums" }}>{Math.round(d.band_5_95[0]) + "–" + Math.round(d.band_5_95[1])}</div>
              </div>
            )}
          </div>
          <div style={{ margin: "12px 26px 0", display: "flex", alignItems: "center", gap: 14, fontSize: 11, color: C.muted, flexWrap: "wrap" }}>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: 999, background: d.red_flag_count > 0 ? "#E0B458" : "#7fbf94" }} />
              Red-flags <span style={{ color: C.text, fontVariantNumeric: "tabular-nums" }}>{d.red_flag_count} / 4</span>
            </span>
            {trend && (
              <span style={{ display: "inline-flex", alignItems: "center", gap: 14 }}>
                <span style={{ color: "rgba(237,232,220,0.14)" }}>|</span>
                <span>Faber trend{" "}<span style={{ color: trend.SPY.faber_10mo === "IN" ? "#7fbf94" : "#E05252" }}>SPY {trend.SPY.faber_10mo}</span> · <span style={{ color: trend.QQQ.faber_10mo === "IN" ? "#7fbf94" : "#E05252" }}>QQQ {trend.QQQ.faber_10mo}</span></span>
              </span>
            )}
          </div>
          {fgOk && (
            <div style={{ margin: "18px 26px 0" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <div style={{ ...BS.eyebrow }}>CNN Fear &amp; Greed</div>
                <div style={{ ...BS.serif, fontSize: 15, color: fgCol, fontVariantNumeric: "tabular-nums" }}>{fg.value.toFixed(1)}{fg.detail && fg.detail.rating ? " · " + fg.detail.rating : ""}</div>
              </div>
              <div style={{ position: "relative", height: 6, borderRadius: 999, marginTop: 9, background: "linear-gradient(90deg,#5AA9A3,#7fbf94,#9AA3B5,#C0564A,#E05252)" }}>
                {trend3(fg.detail && fg.detail.previous_1_month, fg.detail && fg.detail.previous_1_week, fg.value) && (
                  <TrendTail pts={[fg.detail.previous_1_month, fg.detail.previous_1_week, fg.value]} flip={true} barH={6} />
                )}
                <div style={{ position: "absolute", top: -3, left: (100 - fg.value) + "%", transform: "translateX(-50%)", width: 2, height: 12, borderRadius: 2, background: C.text, boxShadow: "0 0 0 2px " + C.bg }} />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: C.faint, marginTop: 6, fontVariantNumeric: "tabular-nums" }}>
                <span>{fgRecent}</span><span>0 — 100</span>
              </div>
            </div>
          )}
          {chips.length > 0 && (
            <div style={{ margin: "18px 26px 0", display: "flex", flexWrap: "wrap", gap: 7 }}>
              {chips.map((c) => (
                <div key={c[0]} title={c[1].title} style={{ display: "inline-flex", alignItems: "center", gap: 7, border: "1px solid " + C.line, borderRadius: 999, padding: "6px 11px" }}>
                  <span style={{ width: 6, height: 6, borderRadius: 999, background: c[2] }} />
                  <span style={{ fontSize: 11, color: C.muted }}>{c[0]}</span>
                  <span style={{ fontSize: 12, color: C.text, fontVariantNumeric: "tabular-nums" }}>
                    {c[1].text}
                    {c[0] === "Gold" && goldTtm ? <span style={{ color: "#7fbf94" }}> {goldTtm.text}</span> : null}
                    {c[0] === "BTC" && btcDd ? <span style={{ color: "#E05252" }}> {btcDd.text}</span> : null}
                  </span>
                </div>
              ))}
            </div>
          )}
          {d.judgment_call && d.judgment_call.text && (
            <div style={{ margin: "18px 26px 0", ...BS.serif, fontStyle: "italic", fontSize: 13, lineHeight: 1.5, color: C.dim }}>
              {d.judgment_call.text}
            </div>
          )}
          <div style={{ marginTop: "auto", padding: "18px 26px 0", fontSize: 9.5, lineHeight: 1.5, color: C.faint }}>
            Heuristic regime read — a rules-based score, not a probability. Research, not advice or a recommendation.
          </div>
        </div>
      </div>
    );
  }
  function Splash() { return <Boundary fallback={null}><SplashInner /></Boundary>; }

  // Small live/static badge for the tabs that consume the re-anchored series
  // (Aggregate 2026 overlays, Analytics crisis clock). keys = AI-2026 line keys used there.
  function LiveBadgeInner({ keys, label }) {
    const f = useFeed();
    const live = useMemo(function () { return f.json ? buildAiLive(f.json) : null; }, [f.json]);
    if (f.loading) return null;
    const ks = keys && keys.length ? keys : Object.keys(AI_MAP);
    const pre = label ? label + ": " : "";
    if (!live) {
      return <Pill color={C.muted} outline title="The bubblegauge feed is unavailable — these 2026 lines use the static Jul 2026 anchors.">{pre}static · Jul 2026 snapshot</Pill>;
    }
    const staticKs = ks.filter(function (k) { return !live.live[k]; });
    if (!staticKs.length) {
      return <Pill color="#7fbf94" title={"2026 lines re-anchored from the bubblegauge feed" + (live.anchorPartial ? " — " + live.anchorMonth + " is month-to-date" : "")}>{pre}LIVE · {live.anchorMonth}{live.anchorPartial ? " (mtd)" : ""}</Pill>;
    }
    return <Pill color="#d9b45c" title={"Feed partially available — static Jul 2026 snapshot for: " + staticKs.join(", ")}>{pre}PARTLY LIVE · {live.anchorMonth}</Pill>;
  }
  function LiveBadge(props) { return <Boundary fallback={null}><LiveBadgeInner keys={props.keys} label={props.label} /></Boundary>; }

  /* ---------- expose ---------- */

  window.BubbleGauge = {
    enabled: true,
    demo: DEMO,
    apiBase: API_BASE,
    tab: { id: "bubblegauge", label: "AI Regime" },
    Strip: StripBoundary,
    FearGreedStrip: FearGreedStrip,
    Splash: Splash,
    DetailTab: DetailTab,
    useAiLive: useAiLive,
    AiLivePanel: AiLivePanel,
    LiveBadge: LiveBadge,
  };
})();
