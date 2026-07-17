(function () {
const { useState, useMemo } = React;
const {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Area,
  ComposedChart
} = Recharts;
const BG = typeof window !== "undefined" && window.BubbleGauge || { enabled: false };
const CAT = {
  A: { label: "Equity / tech bubble", color: "#D4A017" },
  B: { label: "Real-estate / credit bubble", color: "#C0564A" },
  C: { label: "Classic mania", color: "#8A6FB3" },
  D: { label: "Currency / sovereign", color: "#4A90A4" },
  E: { label: "Liquidity / exogenous shock", color: "#6B7F6B" }
};
const CLS = {
  market: { tag: "▼", name: "Collapsing market" },
  universal: { tag: "U", name: "Universal winner" },
  category: { tag: "C", name: "Category-specific winner" },
  unique: { tag: "★", name: "Crisis-unique winner" },
  falsified: { tag: "!", name: "Falsified safe haven" }
};
const CRISES = [
  {
    id: "ai2026",
    name: "AI Investment Bubble",
    years: "2026 · POTENTIAL",
    cat: "A",
    weight: 1,
    potential: true,
    peak: "Jul 2026 (= today, by construction)",
    cause: "Hyperscaler AI capex (~$1tn 2025–26) outpacing free cash flow, record concentration (Mag-7 ≈ 35% of the S&P 500) and CAPE ≈ 41 — the BIS (28 Jun 2026), ECB FSR (27 May 2026), Fed FSR (8 May 2026) and Bank of England all warn of a possible sharp correction; econometric bubble tests are split (Cowles/Yale GSADF finds explosiveness; a 2026 counter-paper finds none once tech fundamentals are modeled).",
    highlight: "Institutional + algorithmic verdict: GOLD is elevated to lead regime-matched hedge — 2026 hedge score 0.85, a statistical co-lead with phase-1 cash (0.88), decisively above 'challenged' Treasuries (0.42). Basis: 27% of global reserves vs 22% UST (ECB, 2 Jun 2026), regime-match r 0.96–0.98 with monetary-crisis scripts, worst-quintile beta ≈ 0, and gold Granger-LEADS the market this cycle. Caveat: a +130% run-up means part of the hedge is pre-paid. CHF secondary; the yen (~¥162) and Bitcoin (−51% from ATH) look falsified this cycle.",
    sources: "BIS Annual Economic Report 2026; ECB FSR May 2026 & Int'l Role of the Euro Jun 2026; Fed FSR May 2026; BoE FSR 2026; WGC Jun 2026; Duffie (2020)",
    series: [
      {
        key: "mkt",
        label: "NASDAQ-100 (feared market)",
        cls: "market",
        color: "#E05252",
        end: 0,
        a: [[-60, 100], [-56, 111], [-50, 88], [-43, 70], [-37, 101], [-28, 121], [-24, 139], [-18, 144], [-17, 138], [-15, 111], [-10, 150], [-7, 161], [-3, 154], [-1, 205], [0, 196]]
      },
      {
        key: "au",
        label: "Gold — lead regime-matched hedge",
        cls: "category",
        color: "#E0B458",
        dashed: true,
        end: 0,
        w: 2.5,
        a: [[-60, 100], [-45, 92], [-37, 107], [-28, 122], [-19, 146], [-16, 167], [-10, 210], [-7, 252], [-5, 311], [-2, 240], [0, 230]]
      },
      {
        key: "cash",
        label: "3M T-bills / cash (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-48, 100.4], [-43, 101.5], [-36, 104], [-31, 107], [-19, 112], [-7, 117], [0, 119.5]]
      },
      {
        key: "ust",
        label: "10Y US Treasuries (TR) — challenged",
        cls: "universal",
        color: "#5B8DEF",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-50, 96], [-43, 85], [-33, 82], [-31, 86], [-19, 88], [-7, 93], [0, 95]]
      },
      {
        key: "chf",
        label: "Swiss franc (vs USD)",
        cls: "category",
        color: "#7EC8E3",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-45, 92], [-31, 109], [-19, 101], [-8, 113], [-5, 120], [0, 113]]
      },
      {
        key: "usd",
        label: "US dollar (DXY)",
        cls: "category",
        color: "#8FAE5D",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-46, 125], [-31, 110], [-19, 117], [-12, 104], [-6, 106], [0, 110]]
      },
      {
        key: "jpy",
        label: "Japanese yen (failed this cycle)",
        cls: "falsified",
        color: "#5AA9A3",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-45, 73], [-33, 74], [-24, 68], [-12, 72], [0, 68]]
      },
      {
        key: "btc",
        label: "Bitcoin (risk asset)",
        cls: "falsified",
        color: "#E8853D",
        dashed: true,
        end: 0,
        a: [[-60, 100], [-56, 203], [-43, 47], [-37, 79], [-19, 274], [-9, 371], [-7, 312], [-3, 220], [0, 182]]
      }
    ]
  },
  {
    id: "depression",
    name: "Great Depression",
    years: "1929–34",
    cat: "A",
    weight: 1,
    peak: "Sep 1929",
    cause: "Equity bubble, banking collapse and deflation. Dow −89% peak-to-trough (Jul 1932).",
    highlight: "Homestake Mining +474–580% while the Dow lost 89% — the archetypal crisis-unique winner under the fixed gold price.",
    sources: "Brunnermeier & Oehmke (2013); Jordà et al. (2019) QJE; economic-history literature on gold-standard mining shares",
    series: [
      {
        key: "mkt",
        label: "Dow Jones Industrial",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 112], [-36, 130], [-24, 160], [-12, 220], [-6, 255], [0, 300], [1, 285], [2, 156], [7, 231], [12, 190], [20, 130], [26, 90], [34, 32], [40, 52], [46, 70], [54, 78], [60, 73]]
      },
      {
        key: "hm",
        label: "Homestake Mining (gold shares)",
        cls: "unique",
        color: "#E0B458",
        a: [[-60, 100], [-24, 102], [0, 105], [6, 118], [12, 140], [24, 220], [34, 360], [40, 600], [48, 625], [60, 660]]
      },
      {
        key: "gb",
        label: "Long-term US govt bonds",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [0, 104], [12, 110], [20, 116], [26, 109], [34, 122], [48, 130], [60, 135]]
      },
      {
        key: "cash",
        label: "Cash (real purchasing power) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [0, 100], [12, 107], [24, 118], [34, 131], [40, 135], [60, 129]]
      }
    ]
  },
  {
    id: "stagflation",
    name: "Stagflation / Nifty Fifty",
    years: "1973–74",
    cat: "A",
    weight: 1,
    peak: "Jan 1973",
    cause: "Growth-stock overvaluation meets oil shock and inflation. S&P 500 −48%; Nifty Fifty names fell 70–90%.",
    highlight: "Gold ≈ +385% within the window (post-Bretton-Woods repricing); crude roughly QUADRUPLED after the Oct 1973 embargo ($2.90 → $11.65/bbl — the highest-magnitude crisis-unique winner, Alpanda & Peralta-Alva 2010); collateralized commodity futures roughly doubled (Gorton & Rouwenhorst 2006).",
    sources: "Gorton & Rouwenhorst (2006) FAJ; Alpanda & Peralta-Alva (2010) Rev. Econ. Dynamics; Erb & Harvey (2013); Siegel (1998); Fesenmaier & Smith (2002)",
    series: [
      {
        key: "mkt",
        label: "S&P 500",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 108], [-36, 86], [-32, 78], [-24, 96], [-12, 110], [0, 125], [6, 112], [12, 101], [18, 80], [21, 65], [27, 84], [36, 94], [48, 98], [60, 93]]
      },
      {
        key: "au",
        label: "Gold",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-36, 92], [-24, 105], [-12, 126], [0, 171], [6, 240], [12, 350], [23, 487], [30, 430], [43, 271], [52, 380], [60, 460]]
      },
      {
        key: "oil",
        label: "Crude oil / energy (unique)",
        cls: "unique",
        color: "#C05A32",
        a: [[-60, 100], [-24, 101], [-12, 103], [0, 120], [8, 160], [9, 290], [12, 402], [24, 410], [48, 430], [60, 450]]
      },
      {
        key: "cmd",
        label: "Commodity futures (GSCI-type)",
        cls: "category",
        color: "#C98A4F",
        a: [[-60, 100], [-24, 102], [-12, 108], [0, 125], [8, 175], [12, 210], [24, 235], [36, 240], [48, 262], [60, 280]]
      },
      {
        key: "val",
        label: "Value / dividend stocks",
        cls: "category",
        color: "#74B06F",
        a: [[-60, 100], [-24, 98], [0, 115], [12, 100], [21, 86], [36, 118], [60, 138]]
      },
      {
        key: "cta",
        label: "Trend-following / CTA (stylized)",
        cls: "universal",
        color: "#4F79C9",
        a: [[-60, 100], [-36, 108], [-24, 114], [0, 130], [9, 150], [12, 162], [21, 180], [24, 185], [48, 212], [60, 232]]
      }
    ]
  },
  {
    id: "japan",
    name: "Japan Asset Bubble",
    years: "1989–2003",
    cat: "A",
    weight: 1,
    peak: "Dec 1989",
    cause: "Monetary over-expansion, land + equity bubble. Nikkei −80% by 2003 (decline continues beyond this window).",
    highlight: "Deflation made JGBs and the yen the standout winners; rolling Nikkei puts are the stylized crisis-unique convexity trade.",
    sources: "Ranaldo & Söderlind (2010) Rev. Finance; Brunnermeier & Oehmke (2013)",
    series: [
      {
        key: "mkt",
        label: "Nikkei 225",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 115], [-36, 160], [-24, 187], [-12, 261], [0, 337], [3, 290], [6, 278], [9, 208], [12, 205], [18, 196], [24, 200], [30, 137], [36, 148], [42, 175], [48, 167], [54, 178], [60, 171]]
      },
      {
        key: "jgb",
        label: "JGBs 10Y (total return)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 112], [0, 118], [6, 112], [9, 110], [12, 116], [24, 128], [36, 140], [48, 152], [60, 165]]
      },
      {
        key: "jpy",
        label: "Japanese yen (vs USD)",
        cls: "category",
        color: "#5AA9A3",
        a: [[-60, 100], [-36, 152], [-24, 158], [-12, 175], [0, 174], [12, 180], [24, 190], [30, 198], [48, 225], [60, 252]]
      },
      {
        key: "cash",
        label: "Yen cash / call rate (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [-24, 112], [0, 124], [12, 133], [18, 137], [30, 142], [48, 148], [60, 151]]
      },
      {
        key: "puts",
        label: "Rolling Nikkei puts (stylized)",
        cls: "unique",
        color: "#B48CE0",
        a: [[-60, 100], [-36, 84], [-12, 68], [0, 60], [6, 120], [9, 205], [12, 235], [24, 290], [30, 420], [42, 395], [60, 350]]
      }
    ]
  },
  {
    id: "blackmonday",
    name: "Black Monday",
    years: "1987",
    cat: "E",
    weight: 0.7,
    peak: "Aug 1987",
    cause: "Portfolio insurance and market microstructure. Dow −22.6% in a single day; ≈ −33% intra-quarter.",
    highlight: "Gold was a weak-to-strong safe haven for the US and Canada (Baur & McDermott 2010); Treasuries and the yen rallied.",
    sources: "Baur & McDermott (2010) J. Banking & Finance; Ranaldo & Söderlind (2010)",
    series: [
      {
        key: "mkt",
        label: "S&P 500",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 130], [-36, 155], [-24, 180], [-12, 245], [-2, 318], [0, 325], [1, 318], [2, 215], [4, 225], [8, 236], [14, 262], [23, 345], [36, 330], [48, 378], [60, 405]]
      },
      {
        key: "au",
        label: "Gold",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-36, 90], [-24, 88], [-12, 113], [0, 131], [2, 136], [4, 143], [10, 128], [24, 105], [40, 102], [60, 97]]
      },
      {
        key: "ust",
        label: "Long US Treasuries (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 148], [-12, 158], [-2, 148], [0, 150], [2, 160], [3, 163], [12, 168], [24, 178], [48, 205], [60, 220]]
      },
      {
        key: "jpy",
        label: "Japanese yen (vs USD)",
        cls: "category",
        color: "#5AA9A3",
        a: [[-60, 100], [-36, 118], [-24, 136], [-12, 166], [0, 177], [2, 190], [4, 211], [12, 205], [36, 196], [60, 206]]
      },
      {
        key: "cash",
        label: "3M T-bills / cash (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [-24, 124], [-12, 134], [0, 145], [6, 149], [12, 155], [24, 168], [48, 196], [60, 208]]
      },
      {
        key: "puts",
        label: "Index puts / long volatility (stylized)",
        cls: "universal",
        color: "#9A7BD6",
        a: [[-60, 100], [-24, 80], [-12, 70], [0, 64], [1, 66], [2, 175], [4, 160], [12, 120], [24, 100], [60, 80]]
      }
    ]
  },
  {
    id: "asia",
    name: "Asian Financial Crisis",
    years: "1997–98",
    cat: "D",
    weight: 0.8,
    peak: "Jun 1997",
    cause: "USD-pegged EM currency and credit bust. Thai equities ≈ −80% in USD terms; Indonesian GNP −84% in USD.",
    highlight: "The US dollar was the classic EM-crisis winner (+~115% vs THB at the extreme); gold rose in local-currency terms.",
    sources: "Reinhart & Rogoff (2009); safe-haven currency literature (Ranaldo & Söderlind 2010)",
    series: [
      {
        key: "mkt",
        label: "Thai equities (USD terms)",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-42, 195], [-30, 175], [-24, 160], [-12, 138], [-3, 120], [0, 110], [3, 72], [6, 38], [10, 28], [14, 22], [24, 40], [30, 46], [48, 44], [60, 50]]
      },
      {
        key: "usd",
        label: "US dollar (vs THB)",
        cls: "category",
        color: "#8FAE5D",
        a: [[-60, 100], [-12, 100], [0, 101], [1, 113], [3, 135], [5, 165], [7, 215], [10, 180], [14, 163], [24, 150], [36, 155], [48, 168], [60, 172]]
      },
      {
        key: "aul",
        label: "Gold in local currency (THB)",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-12, 92], [0, 88], [3, 108], [7, 150], [14, 132], [30, 118], [60, 112]]
      },
      {
        key: "ust",
        label: "US Treasuries (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-12, 124], [0, 130], [7, 138], [14, 148], [24, 150], [48, 165], [60, 175]]
      }
    ]
  },
  {
    id: "dotcom",
    name: "Dot-com Bust",
    years: "2000–02",
    cat: "A",
    weight: 1,
    peak: "Mar 2000",
    cause: "TMT equity bubble (GSADF-dated explosive episode). NASDAQ −78% peak-to-trough (Oct 2002).",
    highlight: "Value's revenge: Fama-French small-value ≈ +16.2%/yr 2000–07 vs S&P +1.7%/yr. Gold FELL — the key exception that demotes it from universal status.",
    sources: "Phillips, Wu & Yu (2011); Fama-French portfolio evidence; Baur & McDermott (2010)",
    series: [
      {
        key: "mkt",
        label: "NASDAQ Composite",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 148], [-36, 170], [-24, 222], [-12, 300], [-6, 350], [-4, 408], [-1, 575], [0, 618], [3, 490], [6, 455], [9, 320], [12, 225], [18, 205], [24, 180], [31, 135], [36, 175], [48, 244], [60, 250]]
      },
      {
        key: "val",
        label: "Small-cap value stocks",
        cls: "category",
        color: "#74B06F",
        a: [[-60, 100], [-36, 132], [-24, 145], [-12, 138], [0, 150], [6, 168], [12, 185], [24, 192], [28, 178], [31, 195], [36, 225], [48, 290], [60, 335]]
      },
      {
        key: "ust",
        label: "10Y US Treasuries (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 118], [0, 135], [12, 152], [24, 165], [31, 175], [48, 185], [60, 195]]
      },
      {
        key: "cash",
        label: "3M T-bills / cash (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [-24, 117], [0, 129], [12, 137], [24, 140], [31, 141], [48, 143], [60, 146]]
      },
      {
        key: "reit",
        label: "REITs",
        cls: "category",
        color: "#C98A4F",
        a: [[-60, 100], [-24, 104], [-12, 94], [0, 98], [12, 118], [24, 138], [31, 150], [48, 195], [60, 230]]
      },
      {
        key: "au",
        label: "Gold (fell — the exception)",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-24, 78], [-12, 74], [0, 73], [12, 68], [24, 80], [31, 83], [48, 105], [60, 112]]
      }
    ]
  },
  {
    id: "gfc",
    name: "Global Financial Crisis",
    years: "2007–09",
    cat: "B",
    weight: 1,
    peak: "Oct 2007",
    cause: "US housing / credit bubble and securitization. S&P 500 −57%; real house prices −35% over ~6 years.",
    highlight: "The full safe-haven set fired at once: gold strong safe haven at the peak (Baur & McDermott), Treasuries rallied hard, yen appreciated, trend-following delivered crisis alpha, long volatility paid out.",
    sources: "Baur & McDermott (2010); Baele et al. (2020) RFS; Moskowitz, Ooi & Pedersen (2012) JFE; St. Louis Fed",
    series: [
      {
        key: "mkt",
        label: "S&P 500",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 124], [-36, 135], [-24, 152], [-12, 172], [0, 190], [5, 160], [8, 168], [11, 145], [13, 105], [15, 96], [17, 83], [21, 110], [29, 140], [36, 142], [42, 130], [48, 158], [60, 172]]
      },
      {
        key: "au",
        label: "Gold",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-36, 140], [-24, 185], [-12, 208], [0, 236], [5, 300], [8, 262], [13, 240], [17, 296], [24, 330], [36, 425], [47, 598], [54, 555], [60, 540]]
      },
      {
        key: "ust",
        label: "Long US Treasuries (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 110], [0, 122], [8, 128], [13, 140], [14, 148], [17, 140], [24, 146], [36, 158], [47, 180], [60, 185]]
      },
      {
        key: "jpy",
        label: "Japanese yen (vs USD)",
        cls: "category",
        color: "#5AA9A3",
        a: [[-60, 100], [-24, 103], [0, 106], [8, 115], [13, 127], [17, 124], [27, 135], [36, 147], [48, 152], [60, 154]]
      },
      {
        key: "cta",
        label: "Trend-following / CTA",
        cls: "universal",
        color: "#4F79C9",
        a: [[-60, 100], [-24, 122], [0, 145], [8, 158], [14, 170], [17, 168], [24, 166], [36, 172], [48, 176], [60, 180]]
      },
      {
        key: "cash",
        label: "3M T-bills / cash (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [-24, 109], [0, 117], [8, 121], [13, 122], [17, 123], [24, 124], [36, 124.5], [48, 125], [60, 125.5]]
      },
      {
        key: "vol",
        label: "Long volatility (stylized)",
        cls: "universal",
        color: "#9A7BD6",
        a: [[-60, 100], [-36, 86], [-12, 76], [0, 72], [5, 88], [11, 118], [13, 190], [14, 210], [17, 196], [24, 152], [36, 132], [48, 124], [60, 118]]
      }
    ]
  },
  {
    id: "euro",
    name: "European Sovereign Debt Crisis",
    years: "2010–12",
    cat: "D",
    weight: 0.8,
    peak: "Jul 2011 (intensification)",
    cause: "Bank–sovereign doom loop; periphery yields spiked to unsustainable levels. Euro-area bank equity collapsed.",
    highlight: "Core Bunds and US Treasuries rallied; the CHF surged +~50% vs EUR until the SNB floor (Sep 2011); gold in EUR peaked with the crisis.",
    sources: "Ranaldo & Söderlind (2010); SNB-floor literature; Baele et al. (2020)",
    series: [
      {
        key: "mkt",
        label: "Euro Stoxx Banks",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 112], [-36, 55], [-28, 28], [-24, 44], [-15, 48], [-12, 44], [0, 40], [2, 28], [6, 25], [11, 22], [17, 26], [24, 34], [30, 38], [42, 42], [48, 36], [60, 33]]
      },
      {
        key: "bund",
        label: "German Bunds 10Y (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 108], [-12, 112], [0, 118], [4, 127], [12, 135], [24, 142], [42, 152], [60, 160]]
      },
      {
        key: "chf",
        label: "Swiss franc (vs EUR)",
        cls: "category",
        color: "#7EC8E3",
        a: [[-60, 100], [-24, 110], [-12, 118], [0, 135], [1, 152], [2, 130], [12, 131], [42, 150], [48, 146], [60, 145]]
      },
      {
        key: "au",
        label: "Gold (EUR terms)",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-24, 168], [-12, 192], [0, 220], [2, 265], [12, 235], [24, 208], [36, 190], [48, 215], [60, 235]]
      },
      {
        key: "ust",
        label: "US Treasuries (TR)",
        cls: "universal",
        color: "#4F79C9",
        a: [[-60, 100], [-24, 112], [0, 125], [12, 145], [24, 150], [48, 158], [60, 165]]
      }
    ]
  },
  {
    id: "covid",
    name: "COVID-19 Crash",
    years: "2020",
    cat: "E",
    weight: 0.5,
    peak: "Feb 2020",
    cause: "Exogenous pandemic shock + dash-for-cash. S&P 500 −34% in one month — then the fastest recovery on record.",
    highlight: "Phase 1 was a 'dash for cash': in mid-March even Treasuries sold off while T-bills/money-market funds absorbed record inflows (Duffie 2020) — then duration rallied. Treasuries later failed in the 2022 inflation regime; Bitcoin fell in lockstep with equities: falsified as a safe haven (Conlon & McGee 2020).",
    sources: "Conlon & McGee (2020) Finance Research Letters; Duffie (2020) Brookings; Corbet et al. (2020); Baele et al. (2020)",
    series: [
      {
        key: "mkt",
        label: "S&P 500",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-48, 110], [-24, 130], [-12, 134], [-2, 158], [0, 161], [1, 106], [3, 140], [6, 168], [12, 187], [22, 227], [27, 210], [32, 172], [40, 205], [48, 243], [60, 290]]
      },
      {
        key: "ust",
        label: "10Y US Treasuries (TR)",
        cls: "universal",
        color: "#5B8DEF",
        a: [[-60, 100], [-24, 105], [-12, 113], [0, 117], [1, 126], [6, 124], [18, 120], [24, 112], [32, 95], [44, 99], [60, 100]]
      },
      {
        key: "cash",
        label: "3M T-bills / cash (TR) — phase 1",
        cls: "universal",
        color: "#BBCF6A",
        a: [[-60, 100], [-24, 104], [0, 108], [1, 108.2], [12, 108.6], [24, 109], [32, 111], [48, 115], [60, 118]]
      },
      {
        key: "au",
        label: "Gold",
        cls: "category",
        color: "#E0B458",
        a: [[-60, 100], [-24, 110], [-12, 109], [0, 132], [1, 122], [3, 142], [6, 170], [12, 143], [24, 152], [32, 137], [48, 192], [60, 240]]
      },
      {
        key: "usd",
        label: "US dollar (DXY)",
        cls: "category",
        color: "#8FAE5D",
        a: [[-60, 100], [-24, 95], [0, 104], [1, 107], [4, 100], [10, 94], [24, 101], [32, 119], [48, 110], [60, 112]]
      },
      {
        key: "btc",
        label: "Bitcoin (falsified safe haven)",
        cls: "falsified",
        color: "#E8853D",
        dashed: true,
        defaultOff: true,
        a: [[-60, 100], [-27, 8190], [-14, 1542], [-8, 4500], [0, 4e3], [1, 2083], [3, 3900], [8, 4800], [14, 26250], [22, 19583], [34, 6875], [49, 29167], [60, 40417]]
      }
    ]
  },
  {
    id: "southsea",
    name: "South Sea Bubble",
    years: "1720",
    cat: "C",
    weight: 1,
    peak: "Jun 1720",
    stylizedAll: true,
    cause: "Debt-for-equity conversion scheme fuelled by credit; shares rose ~8× in six months, then collapsed ~85%.",
    highlight: "Hoare's Bank rode the bubble knowingly and exited near the top — IRR ≈ 51% p.a. (Temin & Voth 2004). The winning asset was the timed exit to cash and quality, not the bubble itself.",
    sources: "Temin & Voth (2004) AER; Garber (1990 JEP; 2000 MIT Press)",
    series: [
      {
        key: "mkt",
        label: "South Sea Co. shares",
        cls: "market",
        color: "#E05252",
        a: [[-60, 100], [-24, 100], [-12, 102], [-6, 116], [-5, 140], [-4, 210], [-3, 330], [-2, 560], [-1, 780], [0, 950], [1, 870], [2, 620], [3, 320], [4, 210], [6, 155], [12, 130], [24, 125], [60, 128]]
      },
      {
        key: "hoare",
        label: "Hoare's Bank timed exit (stylized)",
        cls: "unique",
        color: "#B48CE0",
        a: [[-60, 100], [-12, 104], [-6, 108], [-4, 120], [-2, 142], [0, 158], [1, 166], [3, 168], [12, 170], [60, 178]]
      },
      {
        key: "boe",
        label: "Bank of England stock",
        cls: "category",
        color: "#5AA9A3",
        a: [[-60, 100], [-12, 102], [0, 108], [2, 92], [4, 88], [8, 96], [12, 102], [24, 108], [60, 118]]
      },
      {
        key: "cash",
        label: "Cash / specie & land",
        cls: "category",
        color: "#8FAE5D",
        a: [[-60, 100], [0, 101], [6, 103], [60, 106]]
      }
    ]
  }
];
const MX_CRISES = ["1929", "1973–74", "Japan ’90", "1987", "Asia ’97", "LTCM ’98", "Dot-com ’00", "GFC ’08", "Euro ’10–12", "COVID ’20", "AI ’26?"];
const MATRIX = [
  {
    name: "Gold",
    vals: [2, 2, 1, 1, 1, 1, 0, 2, 2, 1, 3],
    notes: { 0: "Rose via gold-mining shares (Homestake +474–580%) under the fixed gold price.", 3: "Spiked intraday on Black Monday (+4.2%) then sold off as investors liquidated for cash — an 'ATM' in acute liquidity crunches; weak-to-strong per Baur & McDermott (2010).", 4: "Rose in local-currency terms as EM currencies collapsed.", 6: "Fell ≈ −27% into the peak and stayed weak — the key exception that demotes gold from universal status.", 7: "Strong safe haven at the crisis peak (Baur & McDermott 2010).", 10: "ELEVATED to lead regime-matched hedge: 2026 hedge score 0.85 (co-lead with cash at 0.88) — regime-match r 0.96–0.98 vs monetary-crisis scripts, worst-quintile beta ≈ 0, Granger-leads the market; 27% of global reserves, overtaking US Treasuries at 22% (ECB, 2 Jun 2026); record central-bank demand (WGC, Jun 2026). Caveat: ~$4,100 after the $5,595 Jan-2026 record — part of the hedge is pre-paid." }
  },
  {
    name: "Long safe govt bonds",
    vals: [2, 0, 2, 2, 2, 2, 2, 2, 2, 2, 3],
    notes: { 1: "Collapsed in real terms — bonds fail in inflationary regimes.", 8: "Core Bunds/Treasuries only; periphery sovereigns were the collapsing asset.", 9: "Rallied in the crash, then fell ≈ −25% in the 2022 inflation regime.", 10: "Challenged: in April 2025 Treasuries, USD and equities fell TOGETHER; BIS (Sep 2025) found Treasury safe-haven correlations near zero since. 2026 hedge score 0.42 — demoted to 5th, behind CHF, for this configuration (Cheema, Ryan & Sarwar 2025: bonds work best in macro/financial downturns, weaker in geopolitical/inflation shocks)." }
  },
  {
    name: "Cash / T-bills / USD liquidity",
    vals: [2, 1, 2, 2, 2, 2, 2, 2, 1, 2, 3],
    notes: { 0: "Deflation lifted the real value of cash ~25% peak-to-trough.", 1: "Positive nominal T-bill yields but negative real returns in the inflationary regime.", 9: "March 2020 'dash for cash': even Treasuries sold off while T-bills and money-market funds absorbed record inflows (Duffie 2020; BIS Bulletin No. 2).", 10: "The live phase-1 haven: money-market fund assets at a record $7.95tn (ICI, 1 Jul 2026). 2026 hedge score 0.88 — rank #1 on CERTAINTY (100% worst-month hit rate, no drawdown, par entry); gold is the payoff co-lead." }
  },
  {
    name: "Japanese yen",
    vals: [-1, -1, 2, 2, 1, 2, 1, 2, 1, 1, 3],
    notes: { 7: "Appreciated ≈ +23% vs USD through the acute phase (Ranaldo & Söderlind 2010).", 10: "~¥162 — a ~40-year low; carry dominates haven flows, so the yen has NOT behaved as a haven this cycle." }
  },
  {
    name: "Swiss franc",
    vals: [-1, -1, -1, 2, 1, 2, 1, 2, 2, 1, 3],
    notes: { 8: "+~50% vs EUR until the SNB imposed the 1.20 floor in Sep 2011.", 10: "Credible secondary haven — the franc strengthened materially vs USD 2021–26 (USD/CHF ~0.76 in Jan 2026)." }
  },
  {
    name: "US dollar",
    vals: [-1, 0, -1, 1, 2, 2, 1, 2, 1, 2, 3],
    notes: { 4: "The classic EM-crisis winner: +~115% vs THB at the extreme.", 9: "Spiked in the Mar 2020 dash-for-cash funding stress.", 10: "Worst first half since 1973 in H1 2025 (DXY −10.8%); reserve diversification away from USD documented (ECB, WGC)." }
  },
  {
    name: "Commodity futures",
    vals: [-1, 2, -1, -1, 0, -1, 0, 0, -1, 0, 3],
    notes: { 1: "Equity-like returns, negatively correlated with stocks, positively with inflation (Gorton & Rouwenhorst 2006)." }
  },
  {
    name: "Oil / energy",
    vals: [-1, 2, -1, -1, 0, -1, 0, 0, -1, 0, 3],
    notes: { 1: "Crude roughly quadrupled after the Oct 1973 embargo ($2.90 → $11.65/bbl by Jan 1974) — the highest-magnitude crisis-unique winner (Alpanda & Peralta-Alva 2010, Rev. Econ. Dynamics; Fed History).", 7: "Fell from ~$147 to ~$34 in the demand-driven collapse (Hamilton 2009, BPEA) — high uniqueness, low recurrence." }
  },
  {
    name: "Value / small-value stocks",
    vals: [-1, 1, -1, -1, -1, -1, 2, 0, -1, 0, 3],
    notes: { 6: "Small-value ≈ +16.2%/yr 2000–07 vs S&P +1.7%/yr — the post-bubble rotation.", 7: "Fell with the market during the crash itself; the premium is post-trough.", 10: "The dot-com analogue: value / equal-weight rotation is the leading candidate post-bubble winner if an AI unwind mirrors 2000–02." }
  },
  {
    name: "Low-beta / quality (QMJ)",
    vals: [-1, -1, -1, 2, -1, -1, 2, 2, 2, 2, 3],
    notes: { 7: "QMJ shows mild positive convexity — benefits from flight to quality (Asness, Frazzini & Pedersen 2019)." }
  },
  {
    name: "Trend-following / CTA",
    vals: [-1, 2, 2, 1, 2, 1, 2, 2, 1, 1, 3],
    notes: { 3: "Crisis alpha is strongest in prolonged drawdowns, weaker in one-day crashes (Kaminski).", 7: "+14–18% in 2008 while equities halved (time-series momentum, Moskowitz et al. 2012)." }
  },
  {
    name: "Long volatility / index puts",
    vals: [-1, -1, -1, 2, -1, 2, 2, 2, 2, 2, 3],
    notes: { 3: "Via index puts / portfolio hedges — VIX futures only tradable since 2004, VIX options since 2006.", 7: "Long VIX futures/calls materially cut portfolio risk in 2008 (Szado 2009); VIX a stronger US hedge than gold (Hood & Malik 2013). Cost: persistently negative carry (Carr & Wu 2009).", 10: "Convex insurance is available and relatively cheap pre-spike; expected carry is negative between crises (Dew-Becker et al. 2017)." }
  },
  {
    name: "Bitcoin",
    vals: [-1, -1, -1, -1, -1, -1, -1, -1, -1, 0, 3],
    notes: { 9: "Fell in lockstep with the S&P 500; a 10% allocation raised 1% portfolio VaR by 13.6% (Conlon & McGee 2020) — falsified as a safe haven.", 10: "−51% from the Oct 2025 ATH (~$126k) to ~$62k by Jul 2026 while equity indices set records — again trading as a risk asset." }
  }
];
const CLASSIFICATION = [
  {
    title: "Universal winners — two phases",
    tag: "U",
    color: "#5B8DEF",
    items: ["PHASE 1 · Cash / T-bills / USD liquidity — the first-response winner: flight to liquidity and record money-market inflows (Longstaff 2004; Nagel 2016; Krishnamurthy & Vissing-Jorgensen 2012; Baele et al. 2020; Duffie 2020 'dash for cash')", "PHASE 2 · Long safe sovereign bonds — 9/10 crises once funding stress eases; best in macro/financial downturns, weaker in geopolitical/inflation shocks (Cheema, Ryan & Sarwar 2025) and challenged since April 2025", "Long volatility / index puts — paid in every observed crisis; negative expected carry between crises (Szado 2009; Carr & Wu 2009)", "Trend-following / CTA — 'crisis alpha' in prolonged drawdowns (weaker in one-day crashes)", "Gold is near-universal but demoted historically (it fell in the dot-com bust) — yet for the 2026 configuration it is ELEVATED to lead regime-matched hedge, score 0.85 co-lead with cash (see Analytics ranking)"]
  },
  {
    title: "Category-specific winners",
    tag: "C",
    color: "#E0B458",
    items: ["Gold → monetary / inflation / currency crises — AND 'black-swan' ambiguity: investors buy gold on ambiguous signals, bonds on extreme-but-clear ones (Baur & McDermott 2012 working paper; Caballero & Krishnamurthy 2008)", "Value / small-value stocks → after equity-growth bubbles (dot-com)", "US dollar → EM and global funding-stress crises (Asia ’97, LTCM, 2008, 2020)", "Government bonds → deflationary crises specifically — they are the collapsing asset in sovereign/inflation crises", "Quality / low-beta → recessionary equity drawdowns generally"]
  },
  {
    title: "Crisis-unique winners",
    tag: "★",
    color: "#B48CE0",
    items: ["Oil / energy — 1973–74: crude ~4× post-embargo; the highest-MAGNITUDE unique winner, though the crisis TYPE recurs (1979, 1990, 2022) and oil FELL in the 2008/2020 demand collapses (Hamilton 2009)", "Homestake Mining & gold miners — 1930s: >500% Oct 1929–Dec 1935 vs a ~⅔ Dow loss (Burdekin & Weidenmier 2004) — the most NON-REPLICABLE winner (fixed-gold-price regime)", "Rolling Nikkei puts — Japan 1990", "Mega-cap tech — the COVID recovery trade, not the crash hedge", "Hoare's Bank timed exit — South Sea 1720 (IRR ≈ 51% p.a., Temin & Voth 2004)"]
  },
  {
    title: "Falsified candidates",
    tag: "!",
    color: "#E8853D",
    items: ["Bitcoin — fell in lockstep with equities in Mar 2020 (Conlon & McGee 2020); by Jul 2026 down ~51% from its ATH while indices set records", "Japanese yen (this cycle) — ~¥162, a ~40-year low despite repeated risk episodes; carry has dominated haven flows 2021–26"]
  }
];
function interp(anchors) {
  const out = [];
  for (let m = -60; m <= 60; m++) {
    if (m <= anchors[0][0]) {
      out.push(anchors[0][1]);
      continue;
    }
    if (m >= anchors[anchors.length - 1][0]) {
      out.push(anchors[anchors.length - 1][1]);
      continue;
    }
    let i = 0;
    while (anchors[i + 1][0] < m)
      i++;
    const [m0, v0] = anchors[i], [m1, v1] = anchors[i + 1];
    out.push(v0 + (v1 - v0) * (m - m0) / (m1 - m0));
  }
  return out;
}
const rebase = (vals, baseMonth) => {
  const f = 100 / vals[baseMonth + 60];
  return vals.map((v) => v * f);
};
const fmtM = (m) => m === 0 ? "Crisis peak · t0" : `t${m > 0 ? "+" : "−"}${Math.abs(m)} mo`;
const logPath = (vals) => vals.map((v) => Math.log(v));
const ser = (id, key) => CRISES.find((c) => c.id === id).series.find((s) => s.key === key).a;
function zArr(a) {
  const m = a.reduce((s, x) => s + x, 0) / a.length;
  const sd = Math.sqrt(a.reduce((s, x) => s + (x - m) ** 2, 0) / a.length) || 1;
  return a.map((x) => (x - m) / sd);
}
function corrArr(a, b) {
  const za = zArr(a), zb = zArr(b);
  let s = 0;
  for (let i = 0; i < a.length; i++)
    s += za[i] * zb[i];
  return s / a.length;
}
function xcorrRow(curLog, histLog, K) {
  const rows = [];
  const cw = zArr(curLog.slice(61 - K, 61));
  for (let p = -30; p <= 6; p++) {
    const e = p + 60, st = e - K + 1;
    if (st < 0 || e > 120)
      continue;
    rows.push({ p, r: +corrArr(cw, zArr(histLog.slice(st, e + 1))).toFixed(3) });
  }
  return rows;
}
function mulberry32(a) {
  return function() {
    a |= 0;
    a = a + 1831565813 | 0;
    let t = Math.imul(a ^ a >>> 15, 1 | a);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
function runFan(specs, seed, sims = 1500, block = 6, H = 60) {
  const rets = specs.map(([id, key]) => {
    const lp = logPath(rebase(interp(ser(id, key)), 0));
    const r = [];
    for (let i = 60; i < 60 + H; i++)
      r.push(lp[i + 1] - lp[i]);
    return r;
  });
  const rnd = mulberry32(seed);
  const cols = Array.from({ length: H + 1 }, () => []);
  const mdds = [], p36s = [];
  for (let s = 0; s < sims; s++) {
    let v = Math.log(100), mn = 100;
    cols[0].push(100);
    const seq = [];
    while (seq.length < H) {
      const r = rets[Math.floor(rnd() * rets.length)];
      const st = Math.floor(rnd() * (r.length - block + 1));
      for (let k = 0; k < block; k++)
        seq.push(r[st + k]);
    }
    for (let i = 0; i < H; i++) {
      v += seq[i];
      const ev = Math.exp(v);
      cols[i + 1].push(ev);
      if (ev < mn)
        mn = ev;
      if (i + 1 === 36)
        p36s.push(ev);
    }
    mdds.push(mn / 100 - 1);
  }
  const q = (arr, f) => {
    const a = [...arr].sort((x, y) => x - y);
    return a[Math.min(a.length - 1, Math.floor(f * a.length))];
  };
  const rows = cols.map((c, m) => ({ m, b80: [q(c, 0.1), q(c, 0.9)], b50: [q(c, 0.25), q(c, 0.75)], med: q(c, 0.5) }));
  return { rows, stats: { mdd: q(mdds, 0.5), mddLo: q(mdds, 0.25), mddHi: q(mdds, 0.75), below36: p36s.filter((x) => x < 100).length / p36s.length, med36: q(p36s, 0.5), lo36: q(p36s, 0.1), hi36: q(p36s, 0.9) } };
}
function subFamily(s) {
  if (s.cls === "market")
    return "market";
  if (s.cls === "falsified")
    return null;
  if (s.cls === "unique")
    return "unique";
  if (s.cls === "universal") {
    if (s.key === "cash")
      return "cash";
    if (s.key === "cta" || s.key === "vol" || s.key === "puts")
      return "convex";
    return "bonds";
  }
  return "category";
}
function buildAggregate() {
  const classes = ["market", "cash", "bonds", "convex", "category", "unique", "gold"];
  const acc = {};
  classes.forEach((c) => acc[c] = { num: Array(121).fill(0), den: 0 });
  CRISES.forEach((cr) => {
    if (cr.potential)
      return;
    const byClass = {};
    cr.series.forEach((s) => {
      const fam = subFamily(s);
      const isGold = s.key === "au" || s.key === "aul";
      if (!fam && !isGold)
        return;
      const vals = rebase(interp(s.a), 0);
      if (fam)
        (byClass[fam] = byClass[fam] || []).push(vals);
      if (isGold)
        (byClass.gold = byClass.gold || []).push(vals);
    });
    classes.forEach((c) => {
      if (!byClass[c])
        return;
      const n = byClass[c].length;
      const mean = Array(121).fill(0);
      byClass[c].forEach((v) => v.forEach((x, i) => mean[i] += x / n));
      mean.forEach((x, i) => acc[c].num[i] += x * cr.weight);
      acc[c].den += cr.weight;
    });
  });
  return Array.from({ length: 121 }, (_, i) => {
    const o = { m: i - 60 };
    classes.forEach((c) => o[c] = acc[c].den ? +(acc[c].num[i] / acc[c].den).toFixed(1) : null);
    return o;
  });
}
const S = {
  page: { minHeight: "100vh", background: "#0E1526", color: "#EDE8DC", fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" },
  serif: { fontFamily: "Georgia, 'Times New Roman', serif" },
  panel: { background: "#141D31", border: "1px solid rgba(237,232,220,0.09)", borderRadius: 10 },
  eyebrow: { fontSize: 10.5, letterSpacing: "0.18em", textTransform: "uppercase", color: "#9AA3B5" }
};
function Chip({ active, onClick, children, color }) {
  return /* @__PURE__ */ React.createElement("button", { onClick, style: {
    padding: "7px 12px",
    borderRadius: 999,
    cursor: "pointer",
    whiteSpace: "nowrap",
    border: `1px solid ${active ? color || "#E0B458" : "rgba(237,232,220,0.16)"}`,
    background: active ? "rgba(224,180,88,0.12)" : "transparent",
    color: active ? "#EDE8DC" : "#9AA3B5",
    fontSize: 12.5,
    fontWeight: active ? 600 : 400
  } }, children);
}
function Seg({ options, value, onChange }) {
  return /* @__PURE__ */ React.createElement("div", { style: { display: "inline-flex", border: "1px solid rgba(237,232,220,0.16)", borderRadius: 7, overflow: "hidden" } }, options.map((o) => /* @__PURE__ */ React.createElement("button", { key: o.v, onClick: () => onChange(o.v), style: {
    padding: "5px 10px",
    fontSize: 11.5,
    cursor: "pointer",
    border: "none",
    background: value === o.v ? "#E0B458" : "transparent",
    color: value === o.v ? "#0E1526" : "#9AA3B5",
    fontWeight: 600
  } }, o.label)));
}
function Expl({ children }) {
  const [o, setO] = useState(false);
  return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("button", { onClick: () => setO(!o), "aria-label": "What is this?", style: {
    width: 17,
    height: 17,
    minWidth: 17,
    borderRadius: 99,
    padding: 0,
    lineHeight: "14px",
    border: "1px solid #E0B458",
    background: o ? "#E0B458" : "transparent",
    color: o ? "#0E1526" : "#E0B458",
    fontSize: 10.5,
    fontWeight: 700,
    cursor: "pointer",
    fontFamily: "Georgia, serif",
    fontStyle: "italic"
  } }, "i"), o && /* @__PURE__ */ React.createElement("div", { style: {
    flexBasis: "100%",
    width: "100%",
    margin: "6px 0 2px",
    padding: "9px 12px",
    background: "rgba(224,180,88,0.07)",
    border: "1px solid rgba(224,180,88,0.28)",
    borderRadius: 8,
    fontSize: 11.5,
    color: "#D9DCE4",
    lineHeight: 1.6
  } }, children));
}
const ChartTip = ({ active, payload, label }) => {
  if (!active || !payload || !payload.length)
    return null;
  const rows = [...payload].filter((p) => p.value != null).sort((a, b) => b.value - a.value);
  if (!rows.length)
    return null;
  return /* @__PURE__ */ React.createElement("div", { style: { background: "#0B111F", border: "1px solid rgba(237,232,220,0.15)", borderRadius: 8, padding: "8px 11px", fontSize: 11.5, maxWidth: 250 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#9AA3B5", marginBottom: 5, fontWeight: 600 } }, fmtM(label)), rows.map((p) => /* @__PURE__ */ React.createElement("div", { key: p.dataKey, style: { display: "flex", justifyContent: "space-between", gap: 12, color: p.color, lineHeight: 1.55 } }, /* @__PURE__ */ React.createElement("span", { style: { overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" } }, p.name), /* @__PURE__ */ React.createElement("span", { style: { fontVariantNumeric: "tabular-nums", fontWeight: 600 } }, Math.round(p.value)))));
};
function Explorer() {
  const [cid, setCid] = useState("gfc");
  const [base, setBase] = useState("peak");
  const [log, setLog] = useState(false);
  const [hidden, setHidden] = useState(() => {
    const h = {};
    CRISES.forEach((c) => c.series.forEach((s) => {
      if (s.defaultOff)
        h[c.id + s.key] = true;
    }));
    return h;
  });
  const aiLive = BG.enabled && BG.useAiLive ? BG.useAiLive() : null;
  const crisis = CRISES.find((c) => c.id === cid);
  const cat = CAT[crisis.cat];
  const data = useMemo(() => {
    const rows = Array.from({ length: 121 }, (_, i) => ({ m: i - 60 }));
    crisis.series.forEach((s) => {
      const vals = rebase(interp(crisis.id === "ai2026" && aiLive && aiLive.a[s.key] || s.a), base === "peak" ? 0 : -60);
      vals.forEach((v, i) => {
        const mm = i - 60;
        rows[i][s.key] = s.end !== void 0 && mm > s.end ? null : +v.toFixed(1);
      });
    });
    return rows;
  }, [crisis, base, aiLive]);
  const dispSeries = crisis.series.map((s) => crisis.id === "ai2026" && aiLive && aiLive.live[s.key] ? { ...s, label: aiLive.labels[s.key] } : s);
  const visible = dispSeries.filter((s) => !hidden[crisis.id + s.key]);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 8, overflowX: "auto", paddingBottom: 10, WebkitOverflowScrolling: "touch" } }, CRISES.map((c) => /* @__PURE__ */ React.createElement(Chip, { key: c.id, active: c.id === cid, color: CAT[c.cat].color, onClick: () => setCid(c.id) }, c.name, " ", /* @__PURE__ */ React.createElement("span", { style: { opacity: 0.65 } }, "· ", c.years)))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "16px 18px", marginTop: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", alignItems: "baseline", gap: 10 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...S.serif, fontSize: 24, margin: 0, fontWeight: 600 } }, crisis.name), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 11, padding: "3px 9px", borderRadius: 999, border: `1px solid ${cat.color}`, color: cat.color, fontWeight: 600 } }, crisis.cat, " · ", cat.label), /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow } }, "weight ", crisis.weight.toFixed(1), " · peak ", crisis.peak), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "What this card tells you."), " The colored badge is the crisis ", /* @__PURE__ */ React.createElement("i", null, "type"), ' (equity bubble, credit bubble, currency crisis…). "Weight" is how much this crisis counts in the averages — pure financial bubbles count fully (1.0), outside shocks like COVID count half. The gold text below highlights the single most important takeaway: which asset the retrospectively smartest investor held.')), /* @__PURE__ */ React.createElement("p", { style: { margin: "10px 0 6px", fontSize: 13.5, lineHeight: 1.6, color: "#C7CBD6" } }, crisis.cause), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13.5, lineHeight: 1.6, color: "#E0B458" } }, crisis.highlight)), crisis.potential && /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "10px 14px", marginTop: 10, borderLeft: "3px solid #E8853D", fontSize: 12, color: "#E8C9A8", lineHeight: 1.6 } }, "POTENTIAL crisis — the peak is anchored at today (Jul 2026) ", /* @__PURE__ */ React.createElement("b", null, "by construction, not as a forecast"), ". All lines end at t0 and the right half of the axis is intentionally empty: no forward projection. Backfill uses real market anchors (Jul 2021 → Jul 2026); current-state sources are ≤ 6 weeks old (BIS 28 Jun · ECB 2 Jun & 27 May · Fed 8 May 2026). Safe-haven candidates are shown dashed."), crisis.potential && BG.enabled && BG.AiLivePanel && /* @__PURE__ */ React.createElement(BG.AiLivePanel, null), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 10, alignItems: "center", padding: "0 14px 10px 18px" } }, /* @__PURE__ */ React.createElement(Seg, { value: base, onChange: setBase, options: [{ v: "peak", label: "Index: peak = 100" }, { v: "start", label: "Index: t−60 = 100" }] }), /* @__PURE__ */ React.createElement(Seg, { value: log ? "log" : "lin", onChange: (v) => setLog(v === "log"), options: [{ v: "lin", label: "Linear" }, { v: "log", label: "Log" }] }), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "The chart, in plain words."), ' "Index: peak = 100" re-scales every line so they all meet at 100 at the crisis peak — best for seeing what happened ', /* @__PURE__ */ React.createElement("i", null, "around the crash"), '. "t−60 = 100" starts everything at 100 five years earlier — best for seeing the whole boom. "Log" makes equal ', /* @__PURE__ */ React.createElement("i", null, "percentage"), " moves look equally big (100→200 looks like 200→400) — switch it on when one line (like Bitcoin) dwarfs the rest. Tap the colored chips below the chart to hide/show lines. Tags: ▼ the crashing market · U works in almost every crisis · C works in this crisis type · ★ one-off winner · ! famously failed."), /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow, marginLeft: "auto" } }, crisis.potential ? "market-reference backfill · ends at t0 · no projection" : crisis.stylizedAll ? "fully stylized (pre-1970 data)" : "stylized reconstruction")), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 370 }, /* @__PURE__ */ React.createElement(LineChart, { data, margin: { top: 6, right: 14, bottom: 4, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.07)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "m",
      type: "number",
      domain: [-60, 60],
      ticks: [-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60],
      tickFormatter: (m) => m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`,
      tick: { fill: "#9AA3B5", fontSize: 10.5 },
      stroke: "rgba(237,232,220,0.2)"
    }
  ), /* @__PURE__ */ React.createElement(
    YAxis,
    {
      scale: log ? "log" : "linear",
      domain: log ? ["auto", "auto"] : ["auto", "auto"],
      allowDataOverflow: true,
      tick: { fill: "#9AA3B5", fontSize: 10.5 },
      stroke: "rgba(237,232,220,0.2)",
      width: 44
    }
  ), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(ChartTip, null) }), /* @__PURE__ */ React.createElement(
    ReferenceLine,
    {
      x: 0,
      stroke: "#EDE8DC",
      strokeOpacity: 0.45,
      strokeDasharray: "4 3",
      label: { value: "PEAK", fill: "#EDE8DC", fontSize: 9, position: "insideTopRight", opacity: 0.6 }
    }
  ), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 100, stroke: "rgba(237,232,220,0.18)", strokeDasharray: "2 4" }), visible.map((s) => /* @__PURE__ */ React.createElement(
    Line,
    {
      key: s.key,
      type: "monotone",
      dataKey: s.key,
      name: s.label,
      stroke: s.color,
      strokeWidth: s.w || (s.cls === "market" ? 2.6 : 1.9),
      dot: false,
      strokeDasharray: s.dashed ? "6 4" : void 0,
      isAnimationActive: false
    }
  )))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 7, padding: "8px 14px 12px 18px" } }, dispSeries.map((s) => {
    const off = hidden[crisis.id + s.key];
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: s.key,
        onClick: () => setHidden((h) => ({ ...h, [crisis.id + s.key]: !off })),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 9px",
          borderRadius: 999,
          border: "1px solid rgba(237,232,220,0.14)",
          background: off ? "transparent" : "rgba(237,232,220,0.05)",
          color: off ? "#616a7d" : "#D9DCE4",
          fontSize: 11.5,
          cursor: "pointer",
          textDecoration: off ? "line-through" : "none"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { width: 9, height: 9, borderRadius: 99, background: s.color, opacity: off ? 0.35 : 1 } }),
      s.label,
      /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9, color: s.color, fontWeight: 700 } }, CLS[s.cls].tag)
    );
  })), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 18px 12px", fontSize: 10.5, color: "#78829a" } }, "▼ collapsing market · U universal · C category-specific · ★ crisis-unique · ! falsified — tap a chip to show/hide. Panels chart the top evidence-scored assets; the complete asset × crisis coverage is in the Similarity Matrix.", " ", "Sources: ", crisis.sources, ".")));
}
function Matrix() {
  const [sel, setSel] = useState(null);
  const cellStyle = (v) => {
    if (v === 3)
      return { bg: "rgba(154,163,181,0.22)", sym: "?", fg: "#C7CBD6" };
    if (v === 2)
      return { bg: "rgba(58,141,94,0.75)", sym: "✓", fg: "#0E1526" };
    if (v === 1)
      return { bg: "rgba(178,141,52,0.65)", sym: "~", fg: "#0E1526" };
    if (v === 0)
      return { bg: "rgba(178,70,70,0.7)", sym: "✗", fg: "#0E1526" };
    return { bg: "transparent", sym: "", fg: "#0E1526" };
  };
  const note = sel && MATRIX[sel.r].notes && MATRIX[sel.r].notes[sel.c];
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "16px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 } }, "Which assets rose in which crises?"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "The scorecard, in plain words."), " Each cell answers one simple question: did this asset go UP during that crisis? Green ✓ = yes, clearly. Amber ~ = sort of / only in some places. Red ✗ = no, it fell. Gray ? = the 2026 AI crisis hasn't actually happened, so those cells show only what experts ", /* @__PURE__ */ React.createElement("i", null, "currently expect"), ". Blank = the academic literature has no evidence either way. Tap any cell to read the one-sentence story behind it, with the research paper it comes from.")), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 } }, "Qualitative similarity matrix implied by the Baur–McDermott safe-haven regressions and the flight-to-safety literature. ", /* @__PURE__ */ React.createElement("span", { style: { color: "#7fbf94" } }, "✓ rose / strong safe haven"), " · ", /* @__PURE__ */ React.createElement("span", { style: { color: "#d9b45c" } }, "~ weak or mixed"), " · ", /* @__PURE__ */ React.createElement("span", { style: { color: "#e08a8a" } }, "✗ fell"), " · ", /* @__PURE__ */ React.createElement("span", { style: { color: "#C7CBD6" } }, "? potential (AI ’26 — no outcome yet, current institutional view only)"), " · blank = no academic evidence. Tap any cell for the note.")), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, marginTop: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ React.createElement("table", { style: { borderCollapse: "collapse", width: "100%", minWidth: 820, fontSize: 11.5 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { textAlign: "left", padding: "10px 12px", position: "sticky", left: 0, background: "#141D31", ...S.eyebrow } }, "Asset"), MX_CRISES.map((c) => /* @__PURE__ */ React.createElement("th", { key: c, style: { padding: "10px 4px", color: "#9AA3B5", fontWeight: 600, fontSize: 10.5, whiteSpace: "nowrap" } }, c)))), /* @__PURE__ */ React.createElement("tbody", null, MATRIX.map((row, r) => /* @__PURE__ */ React.createElement("tr", { key: row.name, style: { borderTop: "1px solid rgba(237,232,220,0.07)" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "8px 12px", position: "sticky", left: 0, background: "#141D31", color: "#EDE8DC", fontWeight: 600, whiteSpace: "nowrap" } }, row.name), row.vals.map((v, c) => {
    const st = cellStyle(v);
    const isSel = sel && sel.r === r && sel.c === c;
    return /* @__PURE__ */ React.createElement("td", { key: c, style: { padding: 3, textAlign: "center" } }, /* @__PURE__ */ React.createElement("button", { onClick: () => setSel({ r, c }), style: {
      width: 30,
      height: 26,
      borderRadius: 5,
      cursor: v === -1 ? "default" : "pointer",
      border: isSel ? "1.5px solid #E0B458" : "1px solid rgba(237,232,220,0.08)",
      background: st.bg,
      color: st.fg,
      fontWeight: 800,
      fontSize: 12
    } }, st.sym));
  })))))), sel && /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, marginTop: 10, padding: "12px 16px", borderLeft: "3px solid #E0B458" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginBottom: 4 } }, MATRIX[sel.r].name, " · ", MX_CRISES[sel.c]), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13, color: "#D9DCE4", lineHeight: 1.6 } }, note || "No crisis-specific note — see the classification below and the underlying report for the general evidence.")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow } }, "The four buckets of crisis winners"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Why four buckets?"), " Decades of research boil down to this: some things protect you in almost ", /* @__PURE__ */ React.createElement("i", null, "every"), "crisis (U — like cash first, then safe government bonds), some only in the ", /* @__PURE__ */ React.createElement("i", null, "matching type"), ` of crisis (C — gold shines in money/inflation crises, cheap "value" stocks shine after tech bubbles), some were one-off jackpots you couldn't have planned (★ — like a gold miner in the 1930s), and some famous ideas simply failed the real-world test (! — Bitcoin in 2020, the yen this cycle). The two-phase rule inside U: in the first weeks everyone runs to CASH; only later does the money flow into long bonds.`)), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: 12, marginTop: 10 } }, CLASSIFICATION.map((c) => /* @__PURE__ */ React.createElement("div", { key: c.title, style: { ...S.panel, padding: "14px 16px", borderTop: `2px solid ${c.color}` } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginBottom: 8 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 20, height: 20, borderRadius: 5, background: c.color, color: "#0E1526", fontWeight: 800, fontSize: 12, display: "inline-flex", alignItems: "center", justifyContent: "center" } }, c.tag), /* @__PURE__ */ React.createElement("h3", { style: { ...S.serif, fontSize: 16, margin: 0, fontWeight: 600 } }, c.title)), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 16, fontSize: 12.5, color: "#C7CBD6", lineHeight: 1.65 } }, c.items.map((it, i) => /* @__PURE__ */ React.createElement("li", { key: i, style: { marginBottom: 5 } }, it)))))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, marginTop: 12, padding: "14px 16px", borderLeft: "3px solid #5AA9A3" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow } }, "Verification pass — cross-checked against a second AI’s report"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "What happened here?"), " A second AI produced a competing report. Instead of trusting it, every one of its novel claims was traced back to the original academic papers. CONFIRMED = the claim held up when we read the source. CORRECTED = we found and fixed an error (for example, it named the wrong journal). ADJUDICATED = two candidates competed for a title and we ruled on it with a stated criterion. This is how the dashboard keeps AI-generated claims honest.")), /* @__PURE__ */ React.createElement("ul", { style: { margin: 0, paddingLeft: 16, fontSize: 12, color: "#C7CBD6", lineHeight: 1.65 } }, /* @__PURE__ */ React.createElement("li", { style: { marginBottom: 5 } }, /* @__PURE__ */ React.createElement("b", { style: { color: "#7fbf94" } }, "CONFIRMED"), " — cash/T-bills/USD liquidity as a distinct phase-1 universal winner: Longstaff (2004, ", /* @__PURE__ */ React.createElement("i", null, "J. Business"), "; NBER 2002), Nagel (2016, ", /* @__PURE__ */ React.createElement("i", null, "QJE"), "), Krishnamurthy & Vissing-Jorgensen (2012, ", /* @__PURE__ */ React.createElement("i", null, "JPE"), "), Baele et al. (2020, ", /* @__PURE__ */ React.createElement("i", null, "RFS"), "), Duffie (2020, Brookings)."), /* @__PURE__ */ React.createElement("li", { style: { marginBottom: 5 } }, /* @__PURE__ */ React.createElement("b", { style: { color: "#7fbf94" } }, "CONFIRMED"), " — gold’s ambiguity mechanism (buy gold on ambiguous signals, bonds on extreme-but-clear ones): Baur & McDermott (2012) — an IIIS/UTS ", /* @__PURE__ */ React.createElement("i", null, "working paper"), ", not a journal article; theory anchored by Caballero & Krishnamurthy (2008, ", /* @__PURE__ */ React.createElement("i", null, "J. Finance"), ")."), /* @__PURE__ */ React.createElement("li", { style: { marginBottom: 5 } }, /* @__PURE__ */ React.createElement("b", { style: { color: "#7fbf94" } }, "CONFIRMED"), " — VIX a stronger US hedge than gold (Hood & Malik 2013, ", /* @__PURE__ */ React.createElement("i", null, "Rev. Fin. Econ."), "; Szado 2009, ", /* @__PURE__ */ React.createElement("i", null, "JAI"), "), with persistently negative carry (Carr & Wu 2009, ", /* @__PURE__ */ React.createElement("i", null, "RFS"), "; Dew-Becker et al. 2017, ", /* @__PURE__ */ React.createElement("i", null, "JFE"), "). VIX futures tradable only since 2004, options 2006 — earlier “long vol” = index puts."), /* @__PURE__ */ React.createElement("li", { style: { marginBottom: 5 } }, /* @__PURE__ */ React.createElement("b", { style: { color: "#7fbf94" } }, "CONFIRMED"), " — oil/energy as the 1973–74 crisis-unique winner; note Alpanda & Peralta-Alva is a ", /* @__PURE__ */ React.createElement("i", null, "published"), " Review of Economic Dynamics (2010) article, not a St. Louis Fed working paper."), /* @__PURE__ */ React.createElement("li", { style: { marginBottom: 5 } }, /* @__PURE__ */ React.createElement("b", { style: { color: "#e0b458" } }, "CORRECTED"), " — Cheema, Ryan & Sarwar (2025) appeared in ", /* @__PURE__ */ React.createElement("i", null, "International Review of Economics & Finance"), " (vol. 102, art. 104364), NOT the “Journal of Economics and Business”; their peak-to-trough windows complement (don’t replace) the fixed t−60/+60 scale used here."), /* @__PURE__ */ React.createElement("li", null, /* @__PURE__ */ React.createElement("b", { style: { color: "#b48ce0" } }, "ADJUDICATED"), " — “most unique” winner: oil/energy leads on ", /* @__PURE__ */ React.createElement("i", null, "magnitude"), " within a recurring crisis type; Homestake (Burdekin & Weidenmier 2004) leads on ", /* @__PURE__ */ React.createElement("i", null, "structural non-recurrence"), ". Both are shown."))));
}
const AGG_LINES = [
  { key: "market", label: "Collapsing markets (hist.)", color: "#E05252", w: 2.6 },
  { key: "cash", label: "Phase 1 · Cash/T-bills (hist.)", color: "#BBCF6A", w: 2 },
  { key: "bonds", label: "Phase 2 · Duration bonds (hist.)", color: "#5B8DEF", w: 2 },
  { key: "convex", label: "Convexity · trend & long-vol (hist.)", color: "#9A7BD6", w: 1.8 },
  { key: "category", label: "Category-specific (hist.)", color: "#E0B458", w: 2 },
  { key: "unique", label: "Crisis-unique (hist.)", color: "#B48CE0", w: 1.7 }
];
const OVERLAY_LINES = [
  { key: "ai_mkt", label: "AI ’26 · NASDAQ-100", color: "#FF9A8C", w: 2.2 },
  { key: "ai_cash", label: "AI ’26 · Cash/T-bills", color: "#E2EFAF", w: 1.6 },
  { key: "ai_ust", label: "AI ’26 · 10Y Treasuries", color: "#9DBBF7", w: 1.6 },
  { key: "ai_au", label: "AI ’26 · Gold", color: "#F4D896", w: 1.8 }
];
const PAIRS = [
  {
    title: "Feared market",
    sub: "10 collapsing markets vs NASDAQ-100",
    histKey: "market",
    aiKey: "ai_mkt",
    color: "#E05252",
    aiColor: "#FF9A8C",
    expl: "Solid red = the average path of ten historical crashes. Dashed = the real NASDAQ-100, July 2021 to today. Both equal 100 at the peak. Compare how steep the climbs are — then look at what history did after its peaks: it kept falling for about two more years.",
    note: "History keeps falling for ~2 years past the peak; the 2026 line simply ends at today — that right half is the open question."
  },
  {
    title: "Phase 1 · Cash / T-bills",
    sub: "flight to liquidity",
    histKey: "cash",
    aiKey: "ai_cash",
    color: "#BBCF6A",
    aiColor: "#E2EFAF",
    expl: "Cash and Treasury bills are the 'boring' hedge: they never crash, they just tick upward with interest. In the first weeks of every panic, this is where the money runs FIRST — before it moves into bonds. Notice: no dip anywhere, in any era.",
    note: "The only family with no drawdown in either era — unspectacular but unbroken (Longstaff 2004; Nagel 2016; Duffie 2020)."
  },
  {
    title: "Phase 2 · Duration bonds",
    sub: "UST · JGBs · Bunds",
    histKey: "bonds",
    aiKey: "ai_ust",
    color: "#5B8DEF",
    aiColor: "#9DBBF7",
    expl: "Long government bonds are history's classic crash cushion — the solid line climbs right through past crises. But the dashed 2026 line tells a warning: after the 2022 inflation shock, Treasuries enter today's assumed peak BELOW where they started in 2021. The old cushion may not be plumped up this time.",
    note: "History climbs steadily through the crash; the 2026 Treasury line enters the assumed peak BELOW its 2021 level — the challenged haven (BIS Sep 2025; ECB)."
  },
  {
    title: "Gold",
    sub: "7 crises with direct gold data vs today",
    histKey: "gold",
    aiKey: "ai_au",
    color: "#E0B458",
    aiColor: "#F4D896",
    expl: "Gold usually drifts modestly upward before a crisis and shines after. Today's dashed line is different: gold has already MORE than doubled into the assumed peak — far above the historical norm. Good news: the hedge is working. Caution: much of the protection may already be paid for in the price.",
    note: "2026 gold has risen far above the historical pre-crisis norm into the assumed peak — elevated to lead regime-matched hedge (score 0.85, Analytics ranking), but hedge demand may be pre-paid."
  }
];
function PairTile({ p, data }) {
  const first = data[0], after = data[96];
  const run = (k) => first[k] ? Math.round((100 / first[k] - 1) * 100) : null;
  const histRun = run(p.histKey);
  const aiRun = p.aiKey ? run(p.aiKey) : null;
  const histAfter = after ? after[p.histKey] : null;
  return /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "12px 6px 8px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 2px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 15.5, fontWeight: 600 } }, p.title), p.expl && /* @__PURE__ */ React.createElement(Expl, null, p.expl)), /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginTop: 2 } }, p.sub)), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 185 }, /* @__PURE__ */ React.createElement(LineChart, { data, margin: { top: 8, right: 10, bottom: 0, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.06)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "m",
      type: "number",
      domain: [-60, 60],
      ticks: [-60, -24, 0, 24, 60],
      tickFormatter: (m) => m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`,
      tick: { fill: "#9AA3B5", fontSize: 9.5 },
      stroke: "rgba(237,232,220,0.18)"
    }
  ), /* @__PURE__ */ React.createElement(YAxis, { tick: { fill: "#9AA3B5", fontSize: 9.5 }, stroke: "rgba(237,232,220,0.18)", width: 34, domain: ["auto", "auto"] }), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(ChartTip, null) }), /* @__PURE__ */ React.createElement(ReferenceLine, { x: 0, stroke: "#EDE8DC", strokeOpacity: 0.4, strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 100, stroke: "rgba(237,232,220,0.15)", strokeDasharray: "2 4" }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: p.histKey, name: "Historical composite", stroke: p.color, strokeWidth: 2.2, dot: false, isAnimationActive: false }), p.aiKey && /* @__PURE__ */ React.createElement(
    Line,
    {
      type: "monotone",
      dataKey: p.aiKey,
      name: "AI ’26 (to today)",
      stroke: p.aiColor,
      strokeWidth: 2,
      strokeDasharray: "6 4",
      dot: false,
      isAnimationActive: false
    }
  ))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, padding: "4px 12px 0 16px", fontSize: 10.5, color: "#9AA3B5", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { color: p.color, fontWeight: 700 } }, "━"), " history (solid)"), p.aiKey && /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { color: p.aiColor, fontWeight: 700 } }, "╌"), " AI ’26 → today (dashed)")), /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 12px 6px 16px", fontSize: 11, color: "#C7CBD6", lineHeight: 1.5 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600 } }, "Run-up t−60 → peak:"), " history +", histRun, "%", aiRun != null && /* @__PURE__ */ React.createElement(React.Fragment, null, " · 2026 +", aiRun, "%"), histAfter != null && /* @__PURE__ */ React.createElement(React.Fragment, null, " · ", /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600 } }, "history at t+36:"), " ", Math.round(histAfter))), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 } }, p.note));
}
function Aggregate() {
  const aiLive = BG.enabled && BG.useAiLive ? BG.useAiLive() : null;
  const data = useMemo(() => {
    const rows = buildAggregate();
    const AI = CRISES.find((c) => c.potential);
    if (AI) {
      AI.series.forEach((s) => {
        if (!["mkt", "au", "cash", "ust"].includes(s.key))
          return;
        const vals = rebase(interp(aiLive && aiLive.a[s.key] || s.a), 0);
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
    { n: "27% vs 22%", d: "gold vs US Treasuries share of global reserves at end-2025 — gold overtook Treasuries (ECB, 2 Jun 2026)" }
  ];
  const chip = (l) => {
    const off = hidden[l.key];
    return /* @__PURE__ */ React.createElement(
      "button",
      {
        key: l.key,
        onClick: () => setHidden((h) => ({ ...h, [l.key]: !off })),
        style: {
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "4px 10px",
          borderRadius: 999,
          border: "1px solid rgba(237,232,220,0.14)",
          background: off ? "transparent" : "rgba(237,232,220,0.05)",
          color: off ? "#616a7d" : "#D9DCE4",
          fontSize: 11,
          cursor: "pointer",
          maxWidth: "100%",
          textDecoration: off ? "line-through" : "none"
        }
      },
      /* @__PURE__ */ React.createElement("span", { style: { width: 9, height: 9, minWidth: 9, borderRadius: 99, background: l.color, opacity: off ? 0.35 : 1 } }),
      /* @__PURE__ */ React.createElement("span", { style: { textAlign: "left", lineHeight: 1.25 } }, l.label)
    );
  };
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "16px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 } }, "The aggregate anatomy of a crisis"), BG.enabled && BG.LiveBadge && /* @__PURE__ */ React.createElement(BG.LiveBadge, { keys: ["mkt", "au", "cash", "ust"], label: "2026 overlays" }), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "This tab in one breath."), ` We averaged all ten historical crises into one "typical crisis" per asset family, then laid today's 2026 situation (dashed) on top. Both are forced to equal 100 at the peak, so the only fair comparison is the `, /* @__PURE__ */ React.createElement("i", null, "shape of the climb"), ' before the peak — and what history did afterwards. "History ↔ 2026 pairs" shows one small chart per family (easiest to read). "All composites" puts everything in one big chart. The dashed lines stop at the peak because the 2026 future is unknown — that empty right half is the whole point.')), /* @__PURE__ */ React.createElement("p", { style: { margin: "0 0 10px", fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 } }, "Ten historical crises rebased to ", /* @__PURE__ */ React.createElement("b", null, "100 at the peak (t0)"), ", crisis-weight-averaged into unified families (bubbles 1.0 · currency/sovereign 0.8 · Black Monday 0.7 · COVID 0.5). The default view pairs each historical family (solid) with its 2026 counterpart (dashed, real Jul 2021 → today backfill, ending at t0 — no projection). Both lines equal 100 at the peak by construction, so the comparison lives in the ", /* @__PURE__ */ React.createElement("b", null, "run-up shape"), " into the peak and the ", /* @__PURE__ */ React.createElement("b", null, "historical aftermath"), " that follows it. Bitcoin (falsified) is excluded."), /* @__PURE__ */ React.createElement(
    Seg,
    {
      value: mode,
      onChange: setMode,
      options: [{ v: "pairs", label: "History ↔ 2026 pairs" }, { v: "all", label: "All composites" }]
    }
  )), mode === "pairs" && /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 } }, PAIRS.map((p) => /* @__PURE__ */ React.createElement(PairTile, { key: p.histKey, p, data }))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "12px 6px 8px 0", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 2px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 15.5, fontWeight: 600 } }, "History-only families"), /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginTop: 2 } }, "no charted 2026 counterpart")), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 185 }, /* @__PURE__ */ React.createElement(LineChart, { data, margin: { top: 8, right: 10, bottom: 0, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.06)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "m",
      type: "number",
      domain: [-60, 60],
      ticks: [-60, -24, 0, 24, 60],
      tickFormatter: (m) => m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`,
      tick: { fill: "#9AA3B5", fontSize: 9.5 },
      stroke: "rgba(237,232,220,0.18)"
    }
  ), /* @__PURE__ */ React.createElement(YAxis, { tick: { fill: "#9AA3B5", fontSize: 9.5 }, stroke: "rgba(237,232,220,0.18)", width: 34, domain: ["auto", "auto"] }), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(ChartTip, null) }), /* @__PURE__ */ React.createElement(ReferenceLine, { x: 0, stroke: "#EDE8DC", strokeOpacity: 0.4, strokeDasharray: "4 3" }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 100, stroke: "rgba(237,232,220,0.15)", strokeDasharray: "2 4" }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "convex", name: "Convexity · trend & long-vol", stroke: "#9A7BD6", strokeWidth: 2, dot: false, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "category", name: "Category-specific (incl. gold, FX, value)", stroke: "#C98A4F", strokeWidth: 2, dot: false, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Line, { type: "monotone", dataKey: "unique", name: "Crisis-unique winners", stroke: "#B48CE0", strokeWidth: 2, dot: false, isAnimationActive: false }))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 14, padding: "4px 12px 0 16px", fontSize: 10.5, color: "#9AA3B5", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#9A7BD6", fontWeight: 700 } }, "━"), " convexity (trend & long-vol)"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#C98A4F", fontWeight: 700 } }, "━"), " category-specific"), /* @__PURE__ */ React.createElement("span", null, /* @__PURE__ */ React.createElement("span", { style: { color: "#B48CE0", fontWeight: 700 } }, "━"), " crisis-unique")), /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 } }, "Convexity spikes into the crash and decays after — insurance, not a store of value. No 2026 trend/long-vol backfill is charted; crisis-unique winners are identifiable only ex post; the category composite is paired above via its lead asset, gold."))), mode === "all" && /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 } }, /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 380 }, /* @__PURE__ */ React.createElement(LineChart, { data, margin: { top: 6, right: 14, bottom: 4, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.07)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "m",
      type: "number",
      domain: [-60, 60],
      ticks: [-60, -48, -36, -24, -12, 0, 12, 24, 36, 48, 60],
      tickFormatter: (m) => m === 0 ? "Peak" : m > 0 ? `+${m}` : `${m}`,
      tick: { fill: "#9AA3B5", fontSize: 10.5 },
      stroke: "rgba(237,232,220,0.2)"
    }
  ), /* @__PURE__ */ React.createElement(YAxis, { tick: { fill: "#9AA3B5", fontSize: 10.5 }, stroke: "rgba(237,232,220,0.2)", width: 44, domain: ["auto", "auto"] }), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(ChartTip, null) }), /* @__PURE__ */ React.createElement(
    ReferenceLine,
    {
      x: 0,
      stroke: "#EDE8DC",
      strokeOpacity: 0.45,
      strokeDasharray: "4 3",
      label: { value: "PEAK / TODAY", fill: "#EDE8DC", fontSize: 9, position: "insideTopRight", opacity: 0.6 }
    }
  ), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 100, stroke: "rgba(237,232,220,0.18)", strokeDasharray: "2 4" }), AGG_LINES.filter((l) => !hidden[l.key]).map((l) => /* @__PURE__ */ React.createElement(Line, { key: l.key, type: "monotone", dataKey: l.key, name: l.label, stroke: l.color, strokeWidth: l.w, dot: false, isAnimationActive: false })), OVERLAY_LINES.filter((l) => !hidden[l.key]).map((l) => /* @__PURE__ */ React.createElement(
    Line,
    {
      key: l.key,
      type: "monotone",
      dataKey: l.key,
      name: l.label,
      stroke: l.color,
      strokeWidth: l.w,
      strokeDasharray: "6 4",
      dot: false,
      isAnimationActive: false
    }
  )))), /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 18px 2px", ...S.eyebrow } }, "historical composites · solid"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 7, padding: "4px 14px 4px 18px" } }, AGG_LINES.map(chip)), /* @__PURE__ */ React.createElement("div", { style: { padding: "6px 18px 2px", ...S.eyebrow } }, "2026 overlays · dashed · end at t0 (today)"), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", flexWrap: "wrap", gap: 7, padding: "4px 14px 14px 18px" } }, OVERLAY_LINES.map(chip))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 14 } }, stats.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.n, style: { ...S.panel, padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 26, color: "#E0B458", fontWeight: 600, fontVariantNumeric: "tabular-nums" } }, s.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.55, marginTop: 4 } }, s.d)))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, marginTop: 14, padding: "14px 16px", borderLeft: "3px solid #5B8DEF" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginBottom: 6 } }, "The core lesson"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13.5, color: "#D9DCE4", lineHeight: 1.65 } }, "No asset is an unconditional safe haven. Universal winners compound quietly through the crash; category-specific winners (led by gold) deliver the largest gains but only in the matching regime; crisis-unique winners are spectacular and non-replicable. Retrospectively, the smartest investor was a diversifier holding the regime-appropriate hedge — then rotating into cheap, high-quality survivors at the trough.")));
}
const AN = {
  tail: [
    { a: "Gold", bf: "−0.08", bc: "−0.02", hit: "42%", lam: "0.26" },
    { a: "10Y US Treasuries", bf: "+0.08", bc: "−0.02", hit: "33%", lam: "0.31" },
    { a: "Cash / T-bills", bf: "+0.01", bc: "+0.01", hit: "100%", lam: "0.37" }
  ],
  explos: [
    { v: "Raw log price", s: "+0.75", verdict: "borderline (crit 0.62–0.78, seed-sensitive)", flag: true },
    { v: "Linear-trend residual", s: "−0.76", verdict: "not explosive", flag: false },
    { v: "Broken-trend residual (break Dec ’22)", s: "−1.20", verdict: "not explosive", flag: false },
    { v: "Earnings-proxy residual (17%/yr)", s: "−0.83", verdict: "not explosive", flag: false }
  ]
};
const FanTip = ({ active, payload }) => {
  if (!active || !payload || !payload.length)
    return null;
  const row = payload[0] && payload[0].payload;
  if (!row)
    return null;
  return /* @__PURE__ */ React.createElement("div", { style: { background: "#0B111F", border: "1px solid rgba(237,232,220,0.15)", borderRadius: 8, padding: "8px 11px", fontSize: 11 } }, /* @__PURE__ */ React.createElement("div", { style: { color: "#9AA3B5", fontWeight: 600, marginBottom: 4 } }, "t+", row.m, " mo"), /* @__PURE__ */ React.createElement("div", { style: { color: "#EDE8DC" } }, "median: ", Math.round(row.med)), /* @__PURE__ */ React.createElement("div", { style: { color: "#9AA3B5" } }, "middle 50%: ", Math.round(row.b50[0]), "–", Math.round(row.b50[1])), /* @__PURE__ */ React.createElement("div", { style: { color: "#78829a" } }, "80% band: ", Math.round(row.b80[0]), "–", Math.round(row.b80[1])));
};
function FanTile({ title, sub, col, fan, expl, note }) {
  const s = fan.stats;
  return /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "12px 6px 8px 0" } }, /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 2px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 15.5, fontWeight: 600 } }, title), /* @__PURE__ */ React.createElement(Expl, null, expl)), /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginTop: 2 } }, sub)), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 185 }, /* @__PURE__ */ React.createElement(ComposedChart, { data: fan.rows, margin: { top: 8, right: 10, bottom: 0, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.06)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "m",
      type: "number",
      domain: [0, 60],
      ticks: [0, 12, 24, 36, 48, 60],
      tickFormatter: (m) => `+${m}`,
      tick: { fill: "#9AA3B5", fontSize: 9.5 },
      stroke: "rgba(237,232,220,0.18)"
    }
  ), /* @__PURE__ */ React.createElement(YAxis, { tick: { fill: "#9AA3B5", fontSize: 9.5 }, stroke: "rgba(237,232,220,0.18)", width: 34, domain: ["auto", "auto"] }), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(FanTip, null) }), /* @__PURE__ */ React.createElement(ReferenceLine, { y: 100, stroke: "#EDE8DC", strokeOpacity: 0.4, strokeDasharray: "3 3" }), /* @__PURE__ */ React.createElement(Area, { dataKey: "b80", stroke: "none", fill: col, fillOpacity: 0.13, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Area, { dataKey: "b50", stroke: "none", fill: col, fillOpacity: 0.26, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Line, { dataKey: "med", stroke: col, strokeWidth: 2.2, dot: false, isAnimationActive: false }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "4px 12px 6px 16px", fontSize: 11, color: "#C7CBD6", lineHeight: 1.55 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600 } }, "Median max decline vs entry:"), " ", (s.mdd * 100).toFixed(0), "% (IQR ", (s.mddLo * 100).toFixed(0), "%…", (s.mddHi * 100).toFixed(0), "%) ·", " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600 } }, "at +36 mo:"), " median ", Math.round(s.med36), ", P(below 100) ", (s.below36 * 100).toFixed(0), "%, 10–90% [", Math.round(s.lo36), ", ", Math.round(s.hi36), "]"), /* @__PURE__ */ React.createElement("div", { style: { padding: "0 12px 10px 16px", fontSize: 10.5, color: "#78829a", lineHeight: 1.5 } }, note));
}
function Analytics() {
  const aiLive = BG.enabled && BG.useAiLive ? BG.useAiLive() : null;
  const xc = useMemo(() => {
    const cur = logPath(rebase(interp(aiLive && aiLive.a.mkt || ser("ai2026", "mkt")), 0));
    const H2 = {
      dotcom: logPath(rebase(interp(ser("dotcom", "mkt")), 0)),
      y1929: logPath(rebase(interp(ser("depression", "mkt")), 0)),
      japan: logPath(rebase(interp(ser("japan", "mkt")), 0))
    };
    const byP = {};
    Object.entries(H2).forEach(([name, hl]) => {
      xcorrRow(cur, hl, 24).forEach(({ p, r }) => {
        (byP[p] = byP[p] || { p })[name] = r;
      });
    });
    return Object.values(byP).sort((a, b) => a.p - b.p);
  }, [aiLive]);
  const fans = useMemo(() => ({
    market: runFan([["dotcom", "mkt"], ["depression", "mkt"], ["japan", "mkt"]], 7, 1500),
    gold: runFan([["stagflation", "au"], ["gfc", "au"], ["euro", "au"]], 11, 1500),
    bonds: runFan([["dotcom", "ust"], ["depression", "gb"], ["japan", "jgb"]], 13, 1500)
  }), []);
  const clockCards = [
    { n: "≈ −12 mo", d: "weighted template clock — today's pattern sits ~12 months before the average analog peak (range 0 to −21 by template)" },
    { n: "p ≈ 0 / +1", d: "dot-com template, the closest analog: today matches its PEAK (r 0.79–0.89, DTW confirms)" },
    { n: "+2.5 mo", d: "LPPL critical time (Sornette fit on real backfill) — suggestive but fails the damping qualification" },
    { n: "now → +19 mo", d: "gold-surge lead clock: historical gold surges led market peaks by 0 (1973), 24 (GFC), 36 (Euro) months" }
  ];
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "16px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 } }, "Algorithmic battery — where are we on the crisis clock?"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "What this tab is."), ' Six statistical methods were run in Python on the real 2021–26 data and the historical templates; the heavy results (LPPL, Markov, tail regressions) are reported as fixed numbers, while the correlation curves and outcome fans below are recomputed live in your browser from the same anchors. None of it is a prediction — it answers "what does today most RESEMBLE, and what usually followed that resemblance?"')), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 } }, "Template matching (cross-correlation + DTW), LPPL critical-time estimation, PSY/SADF explosiveness, Baur–McDermott tail regressions, Hamilton regime switching, and Granger lead–lag — individually per asset, then weighted into one clock reading.")), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginTop: 12 } }, clockCards.map((s) => /* @__PURE__ */ React.createElement("div", { key: s.n, style: { ...S.panel, padding: "14px 16px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 24, color: "#E0B458", fontWeight: 600 } }, s.n), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.55, marginTop: 4 } }, s.d)))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 8px 6px 0", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "0 14px 8px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Crisis clock — where does today correlate most?"), BG.enabled && BG.LiveBadge && /* @__PURE__ */ React.createElement(BG.LiveBadge, { keys: ["mkt"], label: "today window" }), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "How to read this."), ` We took today's last 24 months of NASDAQ-100 and slid it along each historical bubble's path, asking at every position: how similar are the shapes? The horizontal axis is the position — "0" means "today looks like the historical peak day", "−12" means "today looks like 12 months BEFORE that peak". Where a line is highest is where today fits best. Dot-com peaks at ≈ 0 (we look like its top); 1929 and Japan peak further left (we look like their run-up phase, 1–2 years early).`)), /* @__PURE__ */ React.createElement(ResponsiveContainer, { width: "100%", height: 230 }, /* @__PURE__ */ React.createElement(LineChart, { data: xc, margin: { top: 6, right: 14, bottom: 4, left: 0 } }, /* @__PURE__ */ React.createElement(CartesianGrid, { stroke: "rgba(237,232,220,0.07)", vertical: false }), /* @__PURE__ */ React.createElement(
    XAxis,
    {
      dataKey: "p",
      type: "number",
      domain: [-30, 6],
      ticks: [-30, -24, -18, -12, -6, 0, 6],
      tick: { fill: "#9AA3B5", fontSize: 10 },
      stroke: "rgba(237,232,220,0.2)"
    }
  ), /* @__PURE__ */ React.createElement(YAxis, { tick: { fill: "#9AA3B5", fontSize: 10 }, stroke: "rgba(237,232,220,0.2)", width: 40, domain: ["auto", "auto"] }), /* @__PURE__ */ React.createElement(Tooltip, { content: /* @__PURE__ */ React.createElement(ChartTip, null) }), /* @__PURE__ */ React.createElement(
    ReferenceLine,
    {
      x: 0,
      stroke: "#EDE8DC",
      strokeOpacity: 0.45,
      strokeDasharray: "4 3",
      label: { value: "ANALOG PEAK", fill: "#EDE8DC", fontSize: 8.5, position: "insideTopRight", opacity: 0.6 }
    }
  ), /* @__PURE__ */ React.createElement(Line, { dataKey: "dotcom", name: "vs dot-com", stroke: "#E0B458", strokeWidth: 2, dot: false, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Line, { dataKey: "y1929", name: "vs 1929", stroke: "#B48CE0", strokeWidth: 2, dot: false, isAnimationActive: false }), /* @__PURE__ */ React.createElement(Line, { dataKey: "japan", name: "vs Japan 1990", stroke: "#5AA9A3", strokeWidth: 2, dot: false, isAnimationActive: false }))), /* @__PURE__ */ React.createElement("div", { style: { padding: "2px 18px 12px", fontSize: 10.5, color: "#78829a" } }, "Correlation of today's last 24 months vs the analog window ending at position p (computed live; K=36 confirms the pattern).")), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 14 } }, /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow } }, "Post-peak outcome fans — if the peak were today"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, 'What is a "fan"?'), ` We took the months AFTER past peaks, shuffled them thousands of times in 6-month blocks, and rebuilt 1,500 possible "afterwards" paths per family. The dark band is where the middle half of those historical outcomes landed; the light band covers 80%. It shows what USUALLY happened after such peaks — it is explicitly NOT a forecast; if the optimists (BIS's "capex boom, not solvency bubble") are right, reality can land above the whole fan.`)), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 10 } }, /* @__PURE__ */ React.createElement(
    FanTile,
    {
      title: "Market",
      sub: "analog class: dot-com · 1929 · Japan",
      col: "#E05252",
      fan: fans.market,
      expl: "If today's peak plays out like the average tech/equity bubble, the middle-of-the-road historical outcome is a fall of roughly 60% spread over years, still below the starting point three years later in ~4 of 5 bootstrap paths.",
      note: "Historical conditional distribution under peak-at-today — the central case is a deep multi-year decline; the top of the light band shows the mildest historical outcomes."
    }
  ), /* @__PURE__ */ React.createElement(
    FanTile,
    {
      title: "Gold",
      sub: "monetary-crisis refs: 1973 · GFC · Euro",
      col: "#E0B458",
      fan: fans.gold,
      expl: "Gold's script after monetary-crisis peaks: a brief early wobble (people sell everything for cash for a few weeks), then a strong climb. Median around +35% three years on.",
      note: "Applies IF gold keeps following the monetary-crisis regime it has tracked since 2021 — its −0.88 anti-correlation with the equity-bubble script supports that."
    }
  ), /* @__PURE__ */ React.createElement(
    FanTile,
    {
      title: "Bonds",
      sub: "deflationary analogs: dot-com · 1929 · Japan",
      col: "#5B8DEF",
      fan: fans.bonds,
      expl: "In past DEFLATIONARY crises, long government bonds simply climbed — no drawdown at all. Caution: today's bond market has been living in an INFLATION regime since 2022, so this friendly fan assumes a regime change back to the old script.",
      note: "The most regime-fragile fan: today's Treasuries enter the peak below their 2021 level — if inflation persists, this deflationary-analog band does not apply."
    }
  )), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 14 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Safe-haven tail test — real 2026 backfill"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Beta, in plain words."), " Beta answers: when the market falls 1%, what does the hedge do on average? A beta near zero or negative ", /* @__PURE__ */ React.createElement("i", null, "in the market's WORST months"), ` (second column) is the definition of a real safe haven (Baur & McDermott's method). "Hit rate" = how often the hedge was actually UP in those worst months. λ_L (tail dependence) measures how glued the hedge is to the market in disasters — 0 would be perfectly decoupled, 1 perfectly glued. Verdict this cycle: cash perfect, gold and Treasuries weak-but-real havens, nothing fully decoupled.`)), /* @__PURE__ */ React.createElement("div", { style: { overflowX: "auto" } }, /* @__PURE__ */ React.createElement("table", { style: { borderCollapse: "collapse", width: "100%", minWidth: 460, fontSize: 11.5 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, ["Hedge", "β full sample", "β worst-quintile", "P(up | worst months)", "Clayton λ_L"].map((h) => /* @__PURE__ */ React.createElement("th", { key: h, style: { textAlign: "left", padding: "6px 10px", ...S.eyebrow } }, h)))), /* @__PURE__ */ React.createElement("tbody", null, AN.tail.map((r) => /* @__PURE__ */ React.createElement("tr", { key: r.a, style: { borderTop: "1px solid rgba(237,232,220,0.07)" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: "#EDE8DC", fontWeight: 600 } }, r.a), /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: "#C7CBD6" } }, r.bf), /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: "#E0B458", fontWeight: 600 } }, r.bc), /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: "#C7CBD6" } }, r.hit), /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: "#C7CBD6" } }, r.lam))))))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 12, marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", borderTop: "2px solid #B48CE0" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Market regime (Markov switching)"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Plainly:"), ` a statistical model sorted the last five years of months into "calm weather" (steady +2.4%/mo, tiny wobble) and "stormy weather" (flat drift, huge ±5.5% swings). Right now the model is 100% sure we're in the storm — the same weather the dot-com market had at its very top. Storms host both melt-ups and crashes; the model can't say which comes next, only that we're not in the calm state.`)), /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 26, color: "#B48CE0", fontWeight: 600 } }, "P(turbulent) = 1.00"), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.6, marginTop: 4 } }, "Calm state: +2.4%/mo · σ 0.6% — Turbulent: +0.5%/mo · σ 5.5% · expected storm duration ≈ 21 mo · dot-com showed the identical P = 1.00 signature at its own peak.")), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", borderTop: "2px solid #E8853D" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Bubble detector (BSADF variants)"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Plainly:"), ` a standard statistical "bubble alarm" (the PSY test). On raw prices it's exactly on the borderline — some runs flag it, some don't. The moment you allow for the fact that these companies' profits are genuinely growing ~17%/yr, the alarm goes silent in every variant. Translation: the academic jury is honestly split on whether this is a bubble at all — our own data reproduces both sides of the published dispute.`)), AN.explos.map((r) => /* @__PURE__ */ React.createElement("div", { key: r.v, style: { display: "flex", justifyContent: "space-between", gap: 8, fontSize: 11.5, padding: "4px 0", borderTop: "1px solid rgba(237,232,220,0.06)" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#C7CBD6" } }, r.v), /* @__PURE__ */ React.createElement("span", { style: { color: r.flag ? "#E8853D" : "#9AA3B5", fontWeight: 600, whiteSpace: "nowrap" } }, r.s, " · ", r.verdict))))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 12, borderLeft: "3px solid #E0B458" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Lead–lag: gold has moved FIRST this cycle"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Plainly:"), ` statistically, gold's moves this cycle have come BEFORE the stock market's moves (about 4 months earlier), not after — a formal Granger test confirms it strongly one-way. Historically, gold's big surges came 0 to 36 months before market peaks. Today's surge peaked in January 2026 and was bigger than any historical reference (+94% in 12 months). Applying history's lead times brackets the implied market peak between "now" and about 19 months from now.`)), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 12.5, color: "#D9DCE4", lineHeight: 1.7 } }, "Granger (3 lags): gold → market ", /* @__PURE__ */ React.createElement("b", null, "F = 7.79, p < 0.01"), "; reverse direction p = 0.73 · CCF peak: gold leads by ", /* @__PURE__ */ React.createElement("b", null, "4 months"), " (r +0.58) · historical gold-surge leads before market peaks: 1973: 0 · GFC: 24 · Euro: 36 months · today's surge peaked Jan 2026 (t−5, +94% trailing-12m) → ", /* @__PURE__ */ React.createElement("b", null, "implied peak bracket: now → +19 months"), ".")), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 12, borderTop: "2px solid #E0B458" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "2026 hedge weighting — is gold now the lead hedge?"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "How the score works."), " Every hedge was graded 0–1 on five things and weighted: (1) ", /* @__PURE__ */ React.createElement("i", null, "regime match, 30%"), " — does it follow the script that fits TODAY's regime? (2) ", /* @__PURE__ */ React.createElement("i", null, "live tail evidence, 25%"), " — did it actually hold up in the market's worst months since 2021? (3) ", /* @__PURE__ */ React.createElement("i", null, "institutional view, 25%"), " — what do central banks and stability reports say right now (≤ 6 weeks old)? (4) ", /* @__PURE__ */ React.createElement("i", null, "lead property, 10%"), " — does it move BEFORE the market? (5) ", /* @__PURE__ */ React.createElement("i", null, "entry valuation, 10%"), ' — is it still cheap, or already expensive? Verdict: cash wins on CERTAINTY, gold on expected PAYOFF — statistically a tie at the top — while Treasuries fall to 5th. Doubling the "already expensive" penalty still keeps gold in 2nd (0.78), so the podium is robust. Important nuance: this elevation is CONDITIONAL on the 2026 regime — in the historical scorecard gold keeps its dot-com ✗ and stays "near-universal, demoted".')), [
    { n: "Cash / T-bills", s: 0.88, c: "#BBCF6A", r: "rank #1 certainty — phase-1, 100% worst-month hit rate, record $7.95tn MMFs, par entry" },
    { n: "Gold", s: 0.85, c: "#E0B458", r: "rank #1 payoff — regime-match 0.96–0.98, ECB reserve overtake, Granger lead; entry partly pre-paid" },
    { n: "Swiss franc", s: 0.59, c: "#7EC8E3", r: "credible secondary haven, strengthening vs USD (tail score estimated)" },
    { n: "US dollar", s: 0.44, c: "#8FAE5D", r: "funding-stress hedge only; de-dollarization drag (worst H1 since 1973)" },
    { n: "10Y US Treasuries", s: 0.42, c: "#5B8DEF", r: "challenged — inflation-regime mismatch since 2022, April-2025 joint selloff" },
    { n: "Japanese yen", s: 0.21, c: "#5AA9A3", r: "falsified this cycle — ~¥162, carry dominates haven flows" },
    { n: "Bitcoin", s: 0.11, c: "#E8853D", r: "falsified — trades as a risk asset (−51% from ATH with indices at records)" }
  ].map((h) => /* @__PURE__ */ React.createElement("div", { key: h.n, style: { padding: "6px 0", borderTop: "1px solid rgba(237,232,220,0.06)" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, fontSize: 12, marginBottom: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600 } }, h.n), /* @__PURE__ */ React.createElement("span", { style: { color: h.c, fontWeight: 700, fontVariantNumeric: "tabular-nums" } }, h.s.toFixed(2))), /* @__PURE__ */ React.createElement("div", { style: { height: 7, borderRadius: 99, background: "rgba(237,232,220,0.07)" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${h.s * 100}%`, height: "100%", borderRadius: 99, background: h.c, opacity: 0.85 } })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#78829a", marginTop: 3, lineHeight: 1.5 } }, h.r))), /* @__PURE__ */ React.createElement("p", { style: { margin: "10px 0 0", fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.65 } }, "Score = 0.30·regime-match + 0.25·live tail + 0.25·institutional (≤6 wk) + 0.10·lead + 0.10·entry valuation.", /* @__PURE__ */ React.createElement("b", { style: { color: "#E0B458" } }, " Verdict: gold is elevated to lead regime-matched hedge for the 2026 configuration"), " — a statistical co-lead with phase-1 cash (0.85 vs 0.88, different roles), decisively above Treasuries — ", /* @__PURE__ */ React.createElement("b", null, "without"), " being promoted to universal in the historical taxonomy, where its dot-com failure stands. Sensitivity: doubling the entry-valuation weight yields Cash 0.89 > Gold 0.78 > CHF 0.57 — the podium holds.")), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "12px 16px", marginTop: 12, borderLeft: "3px solid #78829a" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginBottom: 5 } }, "Honest limits"), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 11.5, color: "#9AA3B5", lineHeight: 1.65 } }, "Historical templates are stylized anchor reconstructions; only the 2026 series are real market backfill. Monthly resolution (n = 60 returns) is thin for every method here — published versions use daily data. The LPPL fit failed its formal qualification; the raw bubble flag proved seed-sensitive; fan charts are conditional historical distributions under a constructed peak-at-today, not forecasts. Nothing on this dashboard is investment advice.")));
}
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
  { id: "M10", name: "Flow confirmation", sig: "Slow-moving confirmation: money-market inflows, central-bank reserve shifts (gold 27% > UST 22%, ECB Jun 2026). Confirms — it does not lead.", cite: "Baele et al. 2020 RFS · Coval & Stafford 2007 JFE", veto: null }
];
const PB_COLS = ["M1", "M2", "M3/4", "M5", "M6", "M7", "M8", "M9", "M10"];
const PB_VERDICTS = [
  {
    a: "Defense / aerospace",
    cells: { "M1": "F", "M2": "F", "M6": "F", "M7": "P*", "M8": "F", "M9": "C", "M10": "C" },
    v: "COND · P3 (halved)",
    col: "#B48CE0",
    note: "Mandated NATO budgets pass M7 — but the June-2026 Rheinmetall F126 cancellation (−18% in a day) shows program-level risk, and M8 crowding halves the size. A Phase-3 satellite, never a hedge."
  },
  {
    a: "Utilities / infrastructure",
    cells: { "M1": "F", "M2": "F", "M3/4": "F", "M6": "F", "M7": "S" },
    v: "DEMOTE (as haven)",
    col: "#E8853D",
    note: "The decisive test is M2: utilities coupled to the AI-power trade in 2024–26 (tracked the S&P, at times outpaced the Nasdaq-100) — the defensive correlation is broken. Only regulated rate-base pure-plays keep a weak Phase-3 case."
  },
  {
    a: "Copper / miners",
    cells: { "M1": "F", "M2": "P", "M6": "P", "M7": "P", "M8": "C", "M9": "C" },
    v: "COND · Phase-3 riser",
    col: "#C05A32",
    note: "Falls hard in every liquidity phase (2008 −69%, 2020) — M9 vetoes Phase 0/1. But the IEA ~30% supply deficit by 2035 is mostly grid/EV-mandated (AI datacenters only ~1–2% of demand), so the structural case survives the bubble's death: a high-conviction Phase-3 buy."
  },
  {
    a: "India equities",
    cells: { "M1": "F", "M2": "P", "M3/4": "C", "M6": "P", "M9": "C", "M10": "C" },
    v: "COND · P3 (weak USD)",
    col: "#8FAE5D",
    note: "High-beta EM, not a hedge (−60% USD in 2008). But post-correction valuations are near long-term averages and record domestic SIP flows floored the 2026 drawdown at ~13–14% against record FII outflows. Conditional on the weak-dollar regime and the SIP floor holding (stoppage ratio >100% is the warning light)."
  },
  {
    a: "Convertible bonds",
    cells: { "M1": "F", "M9": "C" },
    v: "COND (M9 flag)",
    col: "#9AA3B5",
    note: "The 2008 crash was an ownership problem: ~80–85% arb-held with 3–5× leverage → forced sales (Mitchell-Pulvino). Today's holder base is long-only-dominated, so the flag softens — but hardens back to a veto if arb crowding returns toward 2008 levels."
  },
  {
    a: "EM / Intl / Japan",
    cells: { "M1": "C", "M2": "P", "M6": "P", "M9": "C", "M10": "P" },
    v: "COND · P3",
    col: "#5AA9A3",
    note: "The validated 2002–07 precedent: after the US-centric dot-com bust, EAFE beat the S&P and EM won by ~10%/yr. Today the relative-CAPE gap is wide again and Japan/Europe carry the lowest AI/mega-cap adjacency (M2). Conditional on the weak-dollar regime (BIS dollar-cycle evidence)."
  },
  {
    a: "China",
    cells: { "M1": "C", "M2": "P", "M6": "P", "M9": "F", "M10": "F" },
    v: "DEMOTE (state risk)",
    col: "#E8853D",
    note: "Cheapest headline CAPE, but the state is the 'marginal holder' — the M9-analog policy-intervention veto fires, and zero fresh expert confirmation in the final window agrees."
  },
  {
    a: "Silver",
    cells: { "M1": "F", "M2": "P", "M6": "C", "M7": "C", "M8": "F", "M9": "C" },
    v: "COND · P2/3 catch-up",
    col: "#CFD6DD",
    note: "Classic pattern: falls harder than gold in the panic, outperforms in the recovery (~+400% 2009–11). But the gold/silver ratio extreme (~100 in Apr 2025) already compressed to ~60 — the easy catch-up trade is largely played out; a smaller Phase-2/3 role remains."
  },
  {
    a: "TIPS",
    cells: { "M3/4": "P", "M5": "P", "M9": "C", "M10": "P" },
    v: "COND (inflation branch)",
    col: "#8FB0F5",
    note: "The inflation half of the unresolved regime fork (M5). Caveat: TIPS broke down in the 2008 and March-2020 liquidity crunches (−12% in 2008; Fleckenstein-Longstaff-Lustig puzzle) — hold through Phase 1, don't rely on it during the dash-for-cash."
  }
];
const EBASE = "https://www.etoro.com/markets/";
const ET = {
  psg: { n: "8PSG.DE", u: "8psg.de", t: 0 },
  wgld: { n: "WGLD.L", u: "wgld.l", t: 0 },
  gld: { n: "GLD", u: "gld", t: 1 },
  iau: { n: "IAU", u: "iau", t: 1 },
  phys: { n: "PHYS", u: "phys", t: 1 },
  gold: { n: "Gold spot", u: "gold", t: 2 },
  shv: { n: "SHV", u: "shv", t: 1 },
  bil: { n: "BIL", u: "bil", t: 1 },
  sgov: { n: "SGOV", u: "sgov", t: 1 },
  shy: { n: "SHY", u: "shy", t: 1 },
  ief: { n: "IEF", u: "ief", t: 1 },
  tlt: { n: "TLT", u: "tlt", t: 1 },
  agg: { n: "AGG", u: "agg", t: 1 },
  tip: { n: "TIP", u: "tip", t: 1 },
  ibc5: { n: "IBC5.DE", u: "ibc5.de", t: 0 },
  usdchf: { n: "USD/CHF (sell = long CHF)", u: "usdchf", t: 2 },
  rsp: { n: "RSP", u: "rsp", t: 1 },
  schd: { n: "SCHD", u: "schd", t: 1 },
  nobl: { n: "NOBL", u: "nobl", t: 1 },
  vgwd: { n: "VGWD.DE", u: "vgwd.de", t: 0 },
  brkb: { n: "BRK.B", u: "brk.b", t: 0 },
  efa: { n: "EFA", u: "efa", t: 1 },
  vgk: { n: "VGK", u: "vgk", t: 1 },
  vxus: { n: "VXUS", u: "vxus", t: 1 },
  swda: { n: "SWDA.L", u: "swda.l", t: 0 },
  vwrd: { n: "VWRD.L", u: "vwrd.l", t: 0 },
  ewj: { n: "EWJ", u: "ewj", t: 1 },
  dxja: { n: "DXJA.L", u: "dxja.l", t: 0 },
  eem: { n: "EEM", u: "eem", t: 1 },
  vwo: { n: "VWO", u: "vwo", t: 1 },
  inda: { n: "INDA", u: "inda", t: 1 },
  epi: { n: "EPI", u: "epi", t: 1 },
  ewz: { n: "EWZ", u: "ewz", t: 1 },
  ilf: { n: "ILF", u: "ilf.us", t: 1 },
  copx: { n: "COPX", u: "copx", t: 1 },
  fcx: { n: "FCX", u: "fcx", t: 0 },
  copper: { n: "Copper fut.", u: "copper.fut", t: 2 },
  ita: { n: "ITA", u: "ita", t: 1 },
  rhm: { n: "RHM.DE", u: "rhm.de", t: 0 },
  bal: { n: "BA.L", u: "ba.l", t: 0 },
  slv: { n: "SLV", u: "slv", t: 1 },
  slvr: { n: "SLVR.L", u: "slvr.l", t: 0 },
  sil: { n: "SIL", u: "sil", t: 1 },
  g2x: { n: "G2X.DE", u: "g2x.de", t: 0 },
  gdx: { n: "GDX", u: "gdx", t: 1 },
  xlv: { n: "XLV", u: "xlv", t: 1 },
  kxi: { n: "KXI", u: "kxi", t: 1 },
  xlp: { n: "XLP", u: "xlp", t: 1 },
  xlu: { n: "XLU", u: "xlu", t: 1 },
  igf: { n: "IGF", u: "igf", t: 1 },
  mchi: { n: "MCHI", u: "mchi", t: 1 },
  fxi: { n: "FXI", u: "fxi", t: 1 },
  emb: { n: "EMB", u: "emb", t: 1 },
  uup: { n: "UUP", u: "uup", t: 1 },
  vt: { n: "VT", u: "vt.us", t: 1 },
  acwi: { n: "ACWI", u: "acwi", t: 1 },
  eurusd: { n: "EUR/USD", u: "eurusd", t: 2 },
  usdjpy: { n: "USD/JPY", u: "usdjpy", t: 2 }
};
const ET_TAG = [
  { l: "Real (EU)", c: "#7fbf94" },
  { l: "CFD-only (EU)", c: "#d9b45c" },
  { l: "CFD", c: "#e08a8a" }
];
function Elink({ k }) {
  const e = ET[k];
  if (!e)
    return null;
  const tag = ET_TAG[e.t];
  return /* @__PURE__ */ React.createElement("a", { href: EBASE + e.u, target: "_blank", rel: "noopener noreferrer", title: `eToro: ${e.n} — ${tag.l}`, style: {
    display: "inline-flex",
    alignItems: "center",
    gap: 5,
    padding: "3px 9px",
    borderRadius: 999,
    border: `1px solid ${tag.c}55`,
    background: "rgba(237,232,220,0.04)",
    textDecoration: "none",
    fontSize: 10.5,
    fontWeight: 700,
    color: "#D9DCE4",
    whiteSpace: "nowrap"
  } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: 99, background: tag.c, flexShrink: 0 } }), e.n, " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#78829a", fontWeight: 400 } }, "↗"));
}
const PB_STEPS = [
  { k: "p0", num: "0", t: "Now", s: "build the anchor" },
  { k: "p1", num: "1", t: "Crash", s: "hold — buy nothing" },
  { k: "p2", num: "2", t: "Fork", s: "regime confirms" },
  { k: "p3", num: "3", t: "Trough", s: "rotate into winners" }
];
const PB_PHASES = {
  p0: { items: [
    { tick: "BIL · SGOV", name: "Cash & T-bills", w: 30, c: "#BBCF6A", m: ["M5", "M9"], r: "No leverage problem, positive carry — the dry powder.", et: ["shv", "bil"] },
    { tick: "GOLD", name: "Physical-gold ETC", w: 20, c: "#E0B458", m: ["M1", "M5", "M10", "M8↓"], r: "Lead regime hedge — halved because the hedge is partly pre-paid.", et: ["psg", "gld"] },
    { tick: "QUALITY", name: "RSP · SCHD quality sleeve", w: 20, c: "#74B06F", m: ["M3"], r: "Resilient balance sheets; AI-adjacent 'defensives' screened out.", et: ["rsp", "schd", "vgwd"] },
    { tick: "SHORT UST", name: "1–7yr Treasuries", w: 15, c: "#5B8DEF", m: ["M4", "M5"], r: "Duration kept SHORT after April 2025.", et: ["shy", "ief"] },
    { tick: "TIPS", name: "Inflation-linked", w: 10, c: "#8FB0F5", m: ["M5"], r: "The inflation branch; expect a Phase-1 wobble.", et: ["ibc5", "tip"] },
    { tick: "CHF", name: "Swiss franc", w: 5, c: "#7EC8E3", m: ["M1"], r: "Secondary haven. On eToro only as FX CFD: long CHF = SELL USD/CHF.", et: ["usdchf"] }
  ] },
  p1: { rules: [
    "Hold cash — sitting still IS the strategy.",
    "Do NOT add gold after the shock: the haven effect fades in ~15 trading days (M1) and the hedge is pre-paid (M8).",
    "Copper, silver, EM, India, defense are Phase-1 FALLERS — set Phase-3 buy levels, don't catch knives.",
    "Even gold and TIPS can dip in the dash-for-cash (2008 · Mar 2020). Cash is the only certainty."
  ] },
  p2: { fork: [
    { t: "INFLATION branch confirms", cond: "breakevens rising", c: "#E0B458", d: "Add gold miners + silver catch-up; hold TIPS; keep duration short.", m: ["M5", "M6", "M7"], et: ["g2x", "slvr"] },
    { t: "DEFLATION branch confirms", cond: "growth shock, breakevens falling", c: "#5B8DEF", d: "Extend duration into long Treasuries — accepting the post-April-2025 caveat; hold CHF.", m: ["M5"], et: ["tlt"] }
  ] },
  p3: { items: [
    { tick: "RSP", name: "Equal-weight & small-value", w: 20, c: "#74B06F", m: ["M6"], r: "The documented post-bubble rotation (+16.2%/yr 2000–07).", et: ["rsp"] },
    { tick: "INTL", name: "Japan/Europe developed", w: 20, c: "#5AA9A3", m: ["M6", "M2"], r: "Widest relative-CAPE gap, lowest AI adjacency — the 2002–07 precedent.", et: ["efa", "vgk", "dxja"] },
    { tick: "EM", name: "Emerging ex-China", w: 15, c: "#8FAE5D", m: ["M5", "M6"], r: "Weak-dollar conditional; China stripped out (M9 veto).", et: ["vwo", "eem"] },
    { tick: "COPPER", name: "Copper miners", w: 15, c: "#C05A32", m: ["M7"], r: "Grid/EV-mandated deficit demand; M9 veto lifts at the trough.", et: ["copx", "fcx"] },
    { tick: "DEFENSE", name: "Broad defense", w: 15, c: "#B48CE0", m: ["M7", "M8↓"], r: "Mandated aggregate spend; avoid single programs (F126 lesson).", et: ["ita", "rhm"] },
    { tick: "SILVER", name: "Silver catch-up", w: 15, c: "#CFD6DD", m: ["M6", "M7"], r: "Late catch-up, sized down — the ratio extreme already compressed.", et: ["slvr", "slv"] }
  ] }
};
const PB_EXPERT = [
  {
    rk: 1,
    sym: "GLD IAU PHYS",
    name: "Gold (physical / ETC)",
    score: 66,
    srcs: 15,
    fresh: "10+",
    bias: 3,
    v: "CORE · Phase 0 (20%)",
    ag: "✓",
    col: "#E0B458",
    et: ["psg", "gld", "iau"],
    note: "Experts' #1 = the protocol's lead regime hedge. M8 crowding is exactly why the weight is 20% and not 30%.",
    refs: "Dalio, UBS (Jun 12), JPMorgan, StanChart (Jun 19), Deutsche Bank (Jun 23), Morgan Stanley, GMO, XP, BofA/Hartnett, State Street (Jul), Gulf SWFs (Jun 30), Julius Baer (Jun 26), Amundi (Jul 1), BMO GAM (Jun 22), SocGen flows (Jul 1)"
  },
  {
    rk: 2,
    sym: "VXUS EFA VGK",
    name: "International / non-US developed",
    score: 44,
    srcs: 11,
    fresh: "5",
    bias: 2.5,
    v: "P3 · 20%",
    ag: "±",
    col: "#5AA9A3",
    et: ["vxus", "efa", "vgk"],
    note: "Protocol agrees on the asset, differs on timing: a post-trough Phase-3 buy (M6/M2 pass), not a hedge now (M1 fails).",
    refs: "Grantham/GMO (Jul 8), Hartnett, StanChart, State Street, Amundi, Dalio, UBS, JPMorgan, Morgan Stanley, Deutsche Bank, Macquarie"
  },
  {
    rk: 3,
    sym: "EEM VWO IEMG",
    name: "Emerging-market equities",
    score: 40,
    srcs: 10,
    fresh: "4",
    bias: 2.5,
    v: "P3 · 15% ex-China",
    ag: "±",
    col: "#8FAE5D",
    et: ["vwo", "eem"],
    note: "Weak-dollar conditional (M5); the protocol strips China out of the sleeve.",
    refs: "Hartnett, GMO, Amundi, BlackRock/iShares, Dalio, JPMorgan, GSAM, StanChart, Morgan Stanley, Mobius"
  },
  {
    rk: 4,
    sym: "XLV VHT IXJ",
    name: "Healthcare (defensive)",
    score: 40,
    srcs: 8,
    fresh: "5",
    bias: 2,
    v: "Relative mitigator",
    ag: "±",
    col: "#9AA3B5",
    et: ["xlv"],
    note: "Falls less, doesn't rise — no absolute-haven role in any phase (Baur–McDermott framework).",
    refs: "Schwab (Jun 26), GQG, JPMorgan, Amundi, RBC WM, Morgan Stanley, Cetera, Deutsche Bank"
  },
  {
    rk: 5,
    sym: "TLT IEF AGG LQD",
    name: "Quality bonds — govt & IG duration",
    score: 39,
    srcs: 9,
    fresh: "5",
    bias: 3,
    v: "Challenged · short-dur only",
    ag: "✗",
    col: "#5B8DEF",
    et: ["tlt", "ief", "agg"],
    note: "The sharpest divergence: experts rank duration #5; the protocol keeps it SMALL and SHORT after April 2025 (BIS: haven correlations ≈ 0). The CSV itself flags the contest.",
    refs: "Hartnett (Jul 6), Deutsche Bank (Jul 6), State Street (Jun 30), Julius Baer, Amundi, Morgan Stanley, UBS, JPMorgan, StanChart — haven status contested (BIS Jun 28)"
  },
  {
    rk: 6,
    sym: "XLP VDC KXI",
    name: "Consumer staples",
    score: 33,
    srcs: 6,
    fresh: "4",
    bias: 2,
    v: "Quality sleeve",
    ag: "±",
    col: "#74B06F",
    et: ["kxi", "xlp"],
    note: "Lives inside the Phase-0 quality tilt, screened for AI adjacency (M2).",
    refs: "Schwab (Jun 26), GQG, Amundi, RBC WM, JPMorgan"
  },
  {
    rk: 7,
    sym: "FXE FXA FXF FXY",
    name: "Non-USD currencies",
    score: 31,
    srcs: 5,
    fresh: "4",
    bias: 2,
    v: "CHF only (5%)",
    ag: "±",
    col: "#7EC8E3",
    et: ["usdchf", "eurusd", "usdjpy"],
    note: "The basket mixes a pass with a veto: protocol keeps CHF, drops JPY (falsified at ~¥162). eToro offers these only as FX-pair CFDs — CHF strength = SELL USD/CHF.",
    refs: "Amundi JPY/EUR (Jul 1), Hartnett bearish USD, UBS, Invesco, Deutsche Bank"
  },
  {
    rk: 8,
    sym: "EWZ ILF",
    name: "Latin America / Brazil",
    score: 30,
    srcs: 6,
    fresh: "3",
    bias: 2,
    v: "P3 satellite",
    ag: "±",
    col: "#8FAE5D",
    et: ["ewz", "ilf"],
    note: "Weak-dollar conditional. Druckenmiller's ~4.5% EWZ book position is a Phase-3-style bet made early.",
    refs: "Druckenmiller (Jul 6), 24/7 Wall St, Amundi, JPMorgan PB, Morgan Stanley, GBM"
  },
  {
    rk: 9,
    sym: "BIL SGOV SHV",
    name: "Short-term T-bills / cash",
    score: 28,
    srcs: 4,
    fresh: "3",
    bias: 1.5,
    v: "CORE · Phase 0 (30%)",
    ag: "✓",
    col: "#BBCF6A",
    et: ["shv", "bil", "sgov"],
    note: "Perfect agreement — the CSV's own note ('lowest bias, highest conviction') matches the protocol's #1-certainty score; Buffett's $397B cash is M10 flow confirmation in the flesh.",
    refs: "Berkshire record $397.4B cash / ~$339.3B T-bills (Jul 5), SocGen money-market flows (Jul 1), NAI 500, JPMorgan"
  },
  {
    rk: 10,
    sym: "SCHD VYM NOBL",
    name: "Dividend / quality equities",
    score: 27,
    srcs: 5,
    fresh: "3",
    bias: 2.5,
    v: "P0 20% + P3 20%",
    ag: "✓",
    col: "#74B06F",
    et: ["schd", "nobl", "vgwd", "brkb"],
    note: "The quality/dividend sleeve in both phases (M3 resilience).",
    refs: "SocGen flows (Jul 1), RBC WM, NAI 500, Buffett-style income commentary"
  },
  {
    rk: 11,
    sym: "IGF GII",
    name: "Global listed infrastructure",
    score: 27,
    srcs: 6,
    fresh: "4",
    bias: 4,
    v: "Demoted (bias-flagged)",
    ag: "✗",
    col: "#E8853D",
    et: ["igf"],
    note: "Experts rank it #11 — but with the HIGHEST bias score (4 = product sellers). The protocol finds only a mild inflation hedge, utilities-adjacent (M2).",
    refs: "Julius Baer (Jun 26), Macquarie (Jun 30), Deutsche Bank, Gulf SWFs, JPMorgan — high bias, product sellers"
  },
  {
    rk: 12,
    sym: "ITA RHM.DE BA.L",
    name: "Defense / aerospace",
    score: 26,
    srcs: 4,
    fresh: "3",
    bias: 2,
    v: "P3 · 15% (halved)",
    ag: "±",
    col: "#B48CE0",
    et: ["ita", "rhm", "bal"],
    note: "M7 mandated budgets pass; M8 crowding halves it; M2/M6 flag the run-up. A Phase-3 satellite, not a hedge — the F126 cancellation is the live warning.",
    refs: "Morgan Stanley/NOC (Jun 24), Nomura, Deutsche Bank, JPMorgan — conflict: VanEck Defense sold in Europe (Jul 1)"
  },
  {
    rk: 13,
    sym: "XLU VPU",
    name: "Utilities / power",
    score: 23,
    srcs: 4,
    fresh: "3",
    bias: 3,
    v: "DEMOTE as haven",
    ag: "✓",
    col: "#E8853D",
    et: ["xlu"],
    note: "Rare agreement on the negative: the CSV's Schwab flag = the protocol's M2 adjacency veto (AI-power coupling broke the defense).",
    refs: "Deutsche Bank (Jun 30), Gulf SWFs, JPMorgan — Schwab flags underperformance"
  },
  {
    rk: 14,
    sym: "COPX FCX",
    name: "Copper / miners",
    score: 23,
    srcs: 4,
    fresh: "3",
    bias: 3,
    v: "P3 · 15%",
    ag: "✓",
    col: "#C05A32",
    et: ["copx", "fcx", "copper"],
    note: "The CSV's own caveat ('cyclical diversifier, not classic haven') IS the protocol verdict: Phase-1 faller, Phase-3 riser (M7 pass, M9 veto until trough).",
    refs: "Goldman 2026 target $10,500/t, UBS, Hartnett, Deutsche Bank"
  },
  {
    rk: 15,
    sym: "INDA EPI",
    name: "India equities",
    score: 21,
    srcs: 6,
    fresh: "1",
    bias: 3,
    v: "P3 small · conditional",
    ag: "±",
    col: "#8FAE5D",
    et: ["epi", "inda"],
    note: "Only 1 fresh source in 3 weeks; protocol conditions it on the weak dollar and the domestic SIP floor holding (watch the >100% stoppage ratio).",
    refs: "Motilal Oswal (Jul 4, thesis Feb), JPMorgan, UBS, Nomura, StanChart, Mobius"
  },
  {
    rk: 16,
    sym: "TIP",
    name: "Inflation-linked bonds (TIPS)",
    score: 21,
    srcs: 3,
    fresh: "2",
    bias: 2,
    v: "P0 · 10%",
    ag: "✓",
    col: "#8FB0F5",
    et: ["ibc5", "tip"],
    note: "The inflation branch of the regime fork (M5); the protocol adds the Phase-1 liquidity caveat (2008/2020 breakdowns).",
    refs: "BMO GAM (Jun 22), Amundi (Jul 1), Dalio (pre-window)"
  },
  {
    rk: 17,
    sym: "RSP",
    name: "Equal-weight S&P 500",
    score: 20,
    srcs: 4,
    fresh: "1",
    bias: 2,
    v: "P0 toe-hold + P3 · 20%",
    ag: "✓",
    col: "#74B06F",
    et: ["rsp"],
    note: "The documented post-bubble rotation (M6 — the 2000 value-spread precedent).",
    refs: "Amundi (Jul 1), Cetera, Druckenmiller (held), Morningstar"
  },
  {
    rk: 18,
    sym: "URTH ACWI VT",
    name: "Broad world equity ETFs",
    score: 19,
    srcs: 2,
    fresh: "2",
    bias: 2,
    v: "NO ROLE",
    ag: "✗",
    col: "#E05252",
    et: ["vwrd", "swda", "vt"],
    note: "The starkest divergence: world ETFs are ~64%-weighted to the crashing asset (US mega-caps). The 'de-concentration' flow argues for ex-US — not world. (Links shown for reference; UCITS lines are the EU-ownable versions.)",
    refs: "SocGen — world ETFs = 40% of Frankfurt turnover (Jul 1), Amundi"
  },
  {
    rk: 19,
    sym: "EWJ DXJ",
    name: "Japan equities",
    score: 19,
    srcs: 5,
    fresh: "1",
    bias: 3,
    v: "P3 tilt",
    ag: "±",
    col: "#5AA9A3",
    et: ["dxja", "ewj"],
    note: "Lowest AI-adjacency developed market (M2) — but only one fresh confirmation.",
    refs: "Nomura constructive, UBS, JPMorgan, Dalio, Macquarie, HSBC (Q1 upgrade)"
  },
  {
    rk: 20,
    sym: "MCHI KWEB FXI",
    name: "China equities / tech",
    score: 14,
    srcs: 4,
    fresh: "0",
    bias: 3,
    v: "DEMOTE",
    ag: "✓",
    col: "#E8853D",
    et: ["mchi", "fxi"],
    note: "Zero fresh sources + the protocol's state-intervention M9-analog — both say stand aside despite the cheapest headline CAPE.",
    refs: "UBS, Hartnett (Apr/May), JPMorgan, Mobius — no fresh confirmation"
  },
  {
    rk: 21,
    sym: "EMB VWOB",
    name: "EM bonds",
    score: 13,
    srcs: 2,
    fresh: "1",
    bias: 3,
    v: "DEMOTE P0/1",
    ag: "✓",
    col: "#E8853D",
    et: ["emb"],
    note: "Dollar-funding sensitivity in the acute phase; thin sourcing agrees.",
    refs: "Julius Baer (Jun 26), HSBC (pre-window)"
  },
  {
    rk: 22,
    sym: "SLV SIL",
    name: "Silver / silver miners",
    score: 12,
    srcs: 3,
    fresh: "0",
    bias: 3,
    v: "P2/3 · 15%",
    ag: "±",
    col: "#CFD6DD",
    et: ["slvr", "slv", "sil"],
    note: "No fresh expert confirmation AND the gold/silver-ratio extreme already played out (≈100 → ≈60) — the protocol keeps a smaller catch-up role.",
    refs: "UBS ('25, targets cut Jun), Dalio, XP — miner ETFs sold per Frankfurt flows (Jul 1)"
  },
  {
    rk: 23,
    sym: "UUP",
    name: "US dollar (protection sleeve)",
    score: 11,
    srcs: 1,
    fresh: "1",
    bias: 3,
    v: "Funding-stress only",
    ag: "±",
    col: "#9AA3B5",
    et: ["uup"],
    note: "One source contradicting the majority; protocol: USD spikes only in the acute dash-for-cash, weakened by de-dollarization (worst H1 since 1973).",
    refs: "Banco Safra (Jul 3) — contradicts Hartnett/UBS/Amundi non-USD preference"
  },
  {
    rk: 24,
    sym: "CWB",
    name: "Convertible bonds",
    score: 8,
    srcs: 1,
    fresh: "1",
    bias: 4,
    v: "M9 flag",
    ag: "✓",
    col: "#9AA3B5",
    et: [],
    note: "Bottom rank + highest issuer bias (State Street sells the product) + the protocol's marginal-holder flag all align — the 2008 lesson stands. (No confirmed eToro listing for CWB.)",
    refs: "State Street (Jun 30) — record 2026 inflows; high issuer bias"
  }
];
function Playbook() {
  const [mSel, setMSel] = useState("M9");
  const [vSel, setVSel] = useState(null);
  const [phase, setPhase] = useState("p0");
  const [filter, setFilter] = useState("all");
  const method = METHODS.find((m) => m.id === mSel);
  const cellSt = (v) => {
    if (v === "P" || v === "P*")
      return { bg: "rgba(58,141,94,0.75)", fg: "#0E1526" };
    if (v === "F")
      return { bg: "rgba(178,70,70,0.7)", fg: "#0E1526" };
    if (v === "C" || v === "S")
      return { bg: "rgba(178,141,52,0.65)", fg: "#0E1526" };
    return { bg: "transparent", fg: "#0E1526" };
  };
  const agCol = { "✓": "#7fbf94", "±": "#d9b45c", "✗": "#e08a8a" };
  const experts = PB_EXPERT.filter((e) => filter === "all" || e.ag === filter);
  return /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "16px 18px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 } }, /* @__PURE__ */ React.createElement("h2", { style: { ...S.serif, fontSize: 22, margin: 0, fontWeight: 600 } }, "The ex-ante playbook — and today's expert buy-list"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "This tab in one breath."), ' Instead of asking "what went up in past crises" (the other tabs), this asks "HOW could you have KNOWN in advance?" — and assembles, from the academic literature, the ten-screen checklist that would have found the winners and vetoed the traps (like convertibles in 2008 or portfolio insurance in 1987). Then it runs every candidate asset through the checklist, builds the phased buy plan, and finally holds it against what experts recommend RIGHT NOW (your research artifact) — showing exactly where academic method and current consensus agree, partly agree, or clash.')), /* @__PURE__ */ React.createElement("p", { style: { margin: 0, fontSize: 13, color: "#C7CBD6", lineHeight: 1.6 } }, "Ten ordered screens (M0–M10) with four veto rules → per-asset verdicts → a simple phased selection → mapped against the 24-asset expert-consensus table. Historical/analytical synthesis, not investment advice.")), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "The identification protocol — tap a screen"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "How to use it."), ` Run the screens in order, like airport security for assets: first classify the coming crisis (M0) and map what's inside the bubble (M2), then check the regime fit, the crash-day statistics, the balance sheet, the valuation gap, whether the demand survives the bubble's death, whether the hedge is already expensive — and finally the two killer questions: who OWNS this asset with how much leverage (M9), and do the big slow flows confirm (M10)? The four red veto rules are absolute — they exist because every famous "safe" asset that failed (convertibles '08, portfolio insurance '87, AAA-CDOs) failed on exactly one of them.`)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 } }, METHODS.map((m) => /* @__PURE__ */ React.createElement("button", { key: m.id, onClick: () => setMSel(m.id), style: {
    padding: "5px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    border: `1px solid ${m.id === mSel ? "#E0B458" : m.veto ? "rgba(224,133,61,0.5)" : "rgba(237,232,220,0.16)"}`,
    background: m.id === mSel ? "rgba(224,180,88,0.12)" : "transparent",
    color: m.id === mSel ? "#EDE8DC" : m.veto ? "#E8B48A" : "#9AA3B5"
  } }, m.id, m.veto ? " ⛔" : ""))), method && /* @__PURE__ */ React.createElement("div", { style: { padding: "10px 12px", background: "rgba(237,232,220,0.04)", borderRadius: 8, borderLeft: `3px solid ${method.veto ? "#E8853D" : "#5B8DEF"}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 13.5, color: "#EDE8DC", fontWeight: 700, marginBottom: 4 } }, method.id, " — ", method.name), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12.5, color: "#C7CBD6", lineHeight: 1.6 } }, method.sig), method.veto && /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#E8B48A", marginTop: 6 } }, /* @__PURE__ */ React.createElement("b", null, "VETO RULE:"), " ", method.veto), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#78829a", marginTop: 6 } }, method.cite))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, marginTop: 12, overflowX: "auto", WebkitOverflowScrolling: "touch" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", padding: "14px 16px 6px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Verdict matrix — every outlier through every screen"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Reading the grid."), " Green P = the asset passes that screen (P* = passes because the demand is contractually mandated). Red F = fails or is flagged. Amber C/S = conditional or split. The verdict on the right follows the veto rules mechanically — not opinion. Tap a row for the one-paragraph story.")), /* @__PURE__ */ React.createElement("table", { style: { borderCollapse: "collapse", width: "100%", minWidth: 760, fontSize: 11.5 } }, /* @__PURE__ */ React.createElement("thead", null, /* @__PURE__ */ React.createElement("tr", null, /* @__PURE__ */ React.createElement("th", { style: { textAlign: "left", padding: "8px 12px", position: "sticky", left: 0, background: "#141D31", ...S.eyebrow } }, "Asset"), PB_COLS.map((c) => /* @__PURE__ */ React.createElement("th", { key: c, style: { padding: "8px 3px", color: "#9AA3B5", fontWeight: 600, fontSize: 10 } }, c)), /* @__PURE__ */ React.createElement("th", { style: { textAlign: "left", padding: "8px 10px", ...S.eyebrow } }, "Verdict"))), /* @__PURE__ */ React.createElement("tbody", null, PB_VERDICTS.map((r, i) => /* @__PURE__ */ React.createElement("tr", { key: r.a, onClick: () => setVSel(vSel === i ? null : i), style: { borderTop: "1px solid rgba(237,232,220,0.07)", cursor: "pointer", background: vSel === i ? "rgba(224,180,88,0.05)" : "transparent" } }, /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 12px", position: "sticky", left: 0, background: "#141D31", color: "#EDE8DC", fontWeight: 600, whiteSpace: "nowrap" } }, r.a), PB_COLS.map((c) => {
    const v = r.cells[c] || "";
    const st = cellSt(v);
    return /* @__PURE__ */ React.createElement("td", { key: c, style: { padding: 3, textAlign: "center" } }, /* @__PURE__ */ React.createElement("span", { style: { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 26, height: 22, borderRadius: 5, background: st.bg, color: st.fg, fontWeight: 800, fontSize: 10.5, border: "1px solid rgba(237,232,220,0.07)" } }, v));
  }), /* @__PURE__ */ React.createElement("td", { style: { padding: "7px 10px", color: r.col, fontWeight: 700, fontSize: 11, whiteSpace: "nowrap" } }, r.v))))), vSel != null && /* @__PURE__ */ React.createElement("div", { style: { margin: "8px 14px 14px", padding: "10px 12px", borderLeft: "3px solid #E0B458", background: "rgba(237,232,220,0.03)", fontSize: 12.5, color: "#D9DCE4", lineHeight: 1.6, borderRadius: 6 } }, /* @__PURE__ */ React.createElement("b", { style: { color: PB_VERDICTS[vSel].col } }, PB_VERDICTS[vSel].a, ":"), " ", PB_VERDICTS[vSel].note)), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 12 } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 8 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "The phased selection — traceable to methods"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Why phases?"), ' Because the same asset can be right and wrong depending on WHEN: copper is a Phase-1 casualty and a Phase-3 winner. Phase 0 = position now, while calm. Phase 1 = the crash itself: hold cash, buy nothing falling. Phase 2 = the regime reveals itself (inflation → gold/real assets; deflation → longer bonds). Phase 3 = the post-trough rotation, where the retrospective "smart money" of every past crisis did its buying. Weights are illustrative round numbers; every line names the screen that put it there.')), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "flex-start", marginBottom: 14 } }, PB_STEPS.map((st, i) => /* @__PURE__ */ React.createElement(React.Fragment, { key: st.k }, i > 0 && /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 2, background: "rgba(237,232,220,0.12)", marginTop: 15, minWidth: 8 } }), /* @__PURE__ */ React.createElement("button", { onClick: () => setPhase(st.k), style: { background: "transparent", border: "none", cursor: "pointer", padding: 0, textAlign: "center", width: 74 } }, /* @__PURE__ */ React.createElement("div", { style: {
    width: 32,
    height: 32,
    borderRadius: 99,
    margin: "0 auto 5px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontFamily: "Georgia, serif",
    fontWeight: 700,
    fontSize: 14.5,
    background: phase === st.k ? "#E0B458" : "rgba(237,232,220,0.06)",
    color: phase === st.k ? "#0E1526" : "#9AA3B5",
    border: `1.5px solid ${phase === st.k ? "#E0B458" : "rgba(237,232,220,0.2)"}`
  } }, st.num), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, fontWeight: 700, color: phase === st.k ? "#EDE8DC" : "#9AA3B5" } }, st.t), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 9, color: "#78829a", lineHeight: 1.25, marginTop: 1 } }, st.s))))), (phase === "p0" || phase === "p3") && (() => {
    const items = PB_PHASES[phase].items;
    return /* @__PURE__ */ React.createElement(React.Fragment, null, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", height: 30, borderRadius: 8, overflow: "hidden", border: "1px solid rgba(237,232,220,0.1)" } }, items.map((it) => /* @__PURE__ */ React.createElement("div", { key: it.tick, title: `${it.name} — ${it.w}%`, style: {
      width: `${it.w}%`,
      background: it.c,
      opacity: 0.88,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      color: "#0E1526",
      fontSize: 10.5,
      fontWeight: 800,
      overflow: "hidden",
      whiteSpace: "nowrap"
    } }, it.w >= 10 ? `${it.w}%` : ""))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "4px 12px", flexWrap: "wrap", margin: "6px 2px 12px" } }, items.map((it) => /* @__PURE__ */ React.createElement("span", { key: it.tick, style: { fontSize: 9.5, color: "#9AA3B5", display: "inline-flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 8, height: 8, borderRadius: 2, background: it.c, display: "inline-block" } }), it.tick, " ", it.w, "%"))), /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 10 } }, items.map((it) => /* @__PURE__ */ React.createElement("div", { key: it.tick, style: { borderRadius: 10, background: "rgba(237,232,220,0.03)", border: "1px solid rgba(237,232,220,0.08)", borderLeft: `3px solid ${it.c}`, padding: "10px 12px" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 } }, /* @__PURE__ */ React.createElement("div", null, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 15.5, fontWeight: 700, color: "#EDE8DC" } }, it.tick), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#9AA3B5", marginTop: 1 } }, it.name)), /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 22, fontWeight: 700, color: it.c } }, it.w, /* @__PURE__ */ React.createElement("span", { style: { fontSize: 12 } }, "%"))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.55, margin: "6px 0 7px" } }, it.r), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" } }, it.m.map((mm) => /* @__PURE__ */ React.createElement("span", { key: mm, style: { fontSize: 9, fontWeight: 700, color: "#8FA0C9", border: "1px solid rgba(143,160,201,0.35)", borderRadius: 4, padding: "1.5px 5px" } }, mm)), /* @__PURE__ */ React.createElement("span", { style: { flexBasis: "100%" } }), it.et.map((k) => /* @__PURE__ */ React.createElement(Elink, { key: k, k })))))));
  })(), phase === "p1" && /* @__PURE__ */ React.createElement("div", { style: { borderRadius: 10, background: "rgba(224,82,82,0.05)", border: "1px solid rgba(224,82,82,0.25)", padding: "12px 14px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 700, color: "#FF9A8C", marginBottom: 8 } }, "Hold. Buy nothing. (0–3 months)"), PB_PHASES.p1.rules.map((r, i) => /* @__PURE__ */ React.createElement("div", { key: i, style: { display: "flex", gap: 8, fontSize: 12, color: "#D9DCE4", lineHeight: 1.6, padding: "4px 0", borderTop: i ? "1px solid rgba(237,232,220,0.05)" : "none" } }, /* @__PURE__ */ React.createElement("span", { style: { color: "#E0B458", fontWeight: 800 } }, i + 1), /* @__PURE__ */ React.createElement("span", null, r)))), phase === "p2" && /* @__PURE__ */ React.createElement("div", { style: { display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(255px, 1fr))", gap: 10 } }, PB_PHASES.p2.fork.map((f) => /* @__PURE__ */ React.createElement("div", { key: f.t, style: { borderRadius: 10, background: "rgba(237,232,220,0.03)", border: "1px solid rgba(237,232,220,0.08)", borderTop: `3px solid ${f.c}`, padding: "11px 13px" } }, /* @__PURE__ */ React.createElement("div", { style: { fontWeight: 800, color: f.c, fontSize: 12.5 } }, f.t), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#78829a", marginBottom: 6 } }, "signal: ", f.cond), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 11.5, color: "#C7CBD6", lineHeight: 1.6, marginBottom: 8 } }, f.d), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", alignItems: "center" } }, f.m.map((mm) => /* @__PURE__ */ React.createElement("span", { key: mm, style: { fontSize: 9, fontWeight: 700, color: "#8FA0C9", border: "1px solid rgba(143,160,201,0.35)", borderRadius: 4, padding: "1.5px 5px" } }, mm)), f.et.map((k) => /* @__PURE__ */ React.createElement(Elink, { key: k, k })))))), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: "4px 14px", flexWrap: "wrap", alignItems: "center", marginTop: 12, paddingTop: 9, borderTop: "1px solid rgba(237,232,220,0.07)" } }, ET_TAG.map((t) => /* @__PURE__ */ React.createElement("span", { key: t.l, style: { fontSize: 9.5, color: "#9AA3B5", display: "inline-flex", alignItems: "center", gap: 4 } }, /* @__PURE__ */ React.createElement("span", { style: { width: 6, height: 6, borderRadius: 99, background: t.c, display: "inline-block" } }), t.l)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 9.5, color: "#616a7d", flex: "1 1 240px" } }, 'eToro links = navigation only, not advice. EU retail: US-domiciled ETFs trade as CFDs (PRIIPs) — prefer green "Real (EU)" UCITS lines for actual holdings; commodities & FX are always CFDs. Verified Jul 2026 — re-check on platform.'))), /* @__PURE__ */ React.createElement("div", { style: { ...S.panel, padding: "14px 16px", marginTop: 12, borderTop: "2px solid #E0B458" } }, /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 6 } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.serif, fontSize: 16, fontWeight: 600 } }, "Expert buy-list × protocol — where consensus and method agree"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "Your research artifact, mapped."), ` The 24 rows are what experts currently recommend, scored by how many independent sources back each asset, how FRESH those calls are (≤3 weeks), and how BIASED the sources are (1 = neutral, 5 = product sellers talking their book). The protocol verdict from the checklist above is attached to every row: ✓ = method and consensus agree · ± = agree on the asset but not the phase or size · ✗ = genuine clash. The ✗ rows are where the checklist earns its keep: duration bonds ranked #5 by experts but "challenged" by the method; infrastructure ranked #11 but sold mostly by its own product issuers; and world ETFs — which ARE ~64% the crashing asset. Note the beautiful confirmation at #9: the lowest-bias, highest-conviction expert signal (cash) is exactly the protocol's #1-certainty position.`)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 8 } }, [["all", "All 24"], ["✓", "✓ agree"], ["±", "± partial"], ["✗", "✗ diverge"]].map(([v, l]) => /* @__PURE__ */ React.createElement("button", { key: v, onClick: () => setFilter(v), style: {
    padding: "4px 10px",
    borderRadius: 999,
    cursor: "pointer",
    fontSize: 11.5,
    fontWeight: 600,
    border: `1px solid ${filter === v ? "#E0B458" : "rgba(237,232,220,0.16)"}`,
    background: filter === v ? "rgba(224,180,88,0.12)" : "transparent",
    color: filter === v ? "#EDE8DC" : "#9AA3B5"
  } }, l))), experts.map((e) => /* @__PURE__ */ React.createElement(ExpertRow, { key: e.rk, e, agCol })), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10.5, color: "#78829a", marginTop: 10, lineHeight: 1.6 } }, "Score = source-count × freshness × (inverse) bias composite from the source artifact, max 66. Bias 1–5 (5 = product-seller). The expert table is practitioner consensus — deliberately a LOOSER evidence standard than the academic protocol; the verdict column is the academic filter applied on top. Not investment advice.")));
}
function ExpertRow({ e, agCol }) {
  const [open, setOpen] = useState(false);
  const biasCol = e.bias <= 2 ? "#7fbf94" : e.bias <= 3 ? "#d9b45c" : "#e08a8a";
  return /* @__PURE__ */ React.createElement("div", { style: { borderTop: "1px solid rgba(237,232,220,0.06)", padding: "7px 0" } }, /* @__PURE__ */ React.createElement("div", { onClick: () => setOpen(!open), style: { display: "flex", alignItems: "center", gap: 8, cursor: "pointer", flexWrap: "wrap" } }, /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow, minWidth: 22 } }, "#", e.rk), /* @__PURE__ */ React.createElement("span", { style: { color: "#EDE8DC", fontWeight: 600, fontSize: 12.5, flex: "1 1 160px" } }, e.name, " ", /* @__PURE__ */ React.createElement("span", { style: { color: "#616a7d", fontWeight: 400, fontSize: 10.5 } }, e.sym)), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 14, fontWeight: 800, color: agCol[e.ag] } }, e.ag), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10.5, fontWeight: 700, color: e.col, whiteSpace: "nowrap" } }, e.v)), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, marginTop: 4 } }, /* @__PURE__ */ React.createElement("div", { style: { flex: 1, height: 6, borderRadius: 99, background: "rgba(237,232,220,0.07)" } }, /* @__PURE__ */ React.createElement("div", { style: { width: `${e.score / 66 * 100}%`, height: "100%", borderRadius: 99, background: agCol[e.ag], opacity: 0.75 } })), /* @__PURE__ */ React.createElement("span", { style: { fontSize: 10, color: "#9AA3B5", fontVariantNumeric: "tabular-nums", whiteSpace: "nowrap" } }, e.score, " · ", e.srcs, " src · ", e.fresh, " fresh · ", /* @__PURE__ */ React.createElement("span", { style: { color: biasCol } }, "bias ", e.bias))), open && /* @__PURE__ */ React.createElement("div", { style: { marginTop: 6, padding: "8px 11px", background: "rgba(237,232,220,0.03)", borderRadius: 7, borderLeft: `2px solid ${agCol[e.ag]}` } }, /* @__PURE__ */ React.createElement("div", { style: { fontSize: 12, color: "#D9DCE4", lineHeight: 1.6 } }, e.note), e.et && e.et.length > 0 && /* @__PURE__ */ React.createElement("div", { style: { display: "flex", gap: 5, flexWrap: "wrap", marginTop: 7 } }, e.et.map((k) => /* @__PURE__ */ React.createElement(Elink, { key: k, k }))), /* @__PURE__ */ React.createElement("div", { style: { fontSize: 10, color: "#616a7d", marginTop: 6, lineHeight: 1.5 } }, "Sources: ", e.refs)));
}
const TABS = [
  { id: "explorer", label: "Crisis Explorer" },
  { id: "matrix", label: "Similarity Matrix" },
  { id: "aggregate", label: "Aggregate" },
  { id: "analytics", label: "Analytics" },
  { id: "playbook", label: "Playbook" }
];
function CrisisWinnersDashboard() {
  const [tab, setTab] = useState("explorer");
  const tabs = BG.enabled ? TABS.concat([BG.tab]) : TABS;
  return /* @__PURE__ */ React.createElement("div", { style: S.page }, /* @__PURE__ */ React.createElement("div", { style: { maxWidth: 1060, margin: "0 auto", padding: "22px 14px 40px" } }, /* @__PURE__ */ React.createElement("div", { style: { ...S.eyebrow, marginBottom: 6 } }, "An interactive atlas · common t−60 → t+60 month scale"), /* @__PURE__ */ React.createElement("h1", { style: { ...S.serif, fontSize: "clamp(26px, 5vw, 38px)", margin: 0, fontWeight: 600, lineHeight: 1.15 } }, "Crisis ", /* @__PURE__ */ React.createElement("span", { style: { color: "#E0B458" } }, "Winners"), " — assets that rose when markets collapsed"), /* @__PURE__ */ React.createElement("p", { style: { fontSize: 12.5, color: "#9AA3B5", lineHeight: 1.6, margin: "10px 0 0", maxWidth: 780 } }, "Stylized monthly reconstructions anchored to magnitudes documented in the peer-reviewed literature (Baur & McDermott 2010; Baele et al. 2020; Ranaldo & Söderlind 2010; Temin & Voth 2004; Gorton & Rouwenhorst 2006; Moskowitz, Ooi & Pedersen 2012; Conlon & McGee 2020; Reinhart & Rogoff 2009; Jordà et al. 2019) — not tick data, and not investment advice. Pre-1970 paths are schematic. The 2026 AI-bubble panel is a POTENTIAL crisis with its peak anchored at today by construction — real 2021–26 market backfill, lines end at t0, no forward projection (BIS, ECB, Fed & BoE 2026 stability reports). The Analytics tab adds the algorithmic battery (clock matching, bootstrap outcome fans, tail tests, regime & explosiveness diagnostics); the Playbook tab maps the ex-ante identification protocol (M0–M10) onto today's expert buy-list."), /* @__PURE__ */ React.createElement("div", { style: { display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginTop: 10 } }, /* @__PURE__ */ React.createElement("span", { style: { ...S.eyebrow } }, "New here? Tap any"), /* @__PURE__ */ React.createElement(Expl, null, /* @__PURE__ */ React.createElement("b", null, "How to read this dashboard."), ' Every crisis is drawn on the same clock: month 0 is the moment the market hit its highest point ("the peak"). Everything left of the dashed line is the boom before; everything right is what happened after. All lines are re-scaled to start from the same value, so you compare ', /* @__PURE__ */ React.createElement("i", null, "shapes"), `, not prices. Red always = the market that crashed; gold/green/blue = things that went UP or held value. Dashed lines = today's (2026) situation, which by design stops at the peak line — nobody knows the right half yet. Every section has one of these "i" buttons with a plain-language explanation.`)), BG.enabled && /* @__PURE__ */ React.createElement(BG.Strip, { goToDetail: () => setTab("bubblegauge") }), /* @__PURE__ */ React.createElement("div", { className: "tabbar-scroll", style: { display: "flex", gap: 6, margin: "18px 0 16px", borderBottom: "1px solid rgba(237,232,220,0.1)", overflowX: "auto", WebkitOverflowScrolling: "touch" } }, tabs.map((t) => /* @__PURE__ */ React.createElement("button", { key: t.id, onClick: () => setTab(t.id), style: {
    padding: "9px 14px",
    background: "transparent",
    cursor: "pointer",
    fontSize: 13.5,
    whiteSpace: "nowrap",
    border: "none",
    borderBottom: tab === t.id ? "2px solid #E0B458" : "2px solid transparent",
    color: tab === t.id ? "#EDE8DC" : "#78829a",
    fontWeight: tab === t.id ? 700 : 400
  } }, t.label))), tab === "explorer" && /* @__PURE__ */ React.createElement(Explorer, null), tab === "matrix" && /* @__PURE__ */ React.createElement(Matrix, null), tab === "aggregate" && /* @__PURE__ */ React.createElement(Aggregate, null), tab === "analytics" && /* @__PURE__ */ React.createElement(Analytics, null), tab === "playbook" && /* @__PURE__ */ React.createElement(Playbook, null), tab === "bubblegauge" && BG.enabled && /* @__PURE__ */ React.createElement(BG.DetailTab, { goToCrisis: () => setTab("explorer") }), /* @__PURE__ */ React.createElement("div", { style: { marginTop: 26, paddingTop: 14, borderTop: "1px solid rgba(237,232,220,0.1)", fontSize: 10.5, color: "#616a7d", lineHeight: 1.7 } }, "Key sources: Baur & McDermott (2010) ", /* @__PURE__ */ React.createElement("i", null, "J. Banking & Finance"), " · Baele, Bekaert, Inghelbrecht & Wei (2020) ", /* @__PURE__ */ React.createElement("i", null, "RFS"), " · Ranaldo & Söderlind (2010) ", /* @__PURE__ */ React.createElement("i", null, "Rev. Finance"), " · Temin & Voth (2004) ", /* @__PURE__ */ React.createElement("i", null, "AER"), " · Gorton & Rouwenhorst (2006) ", /* @__PURE__ */ React.createElement("i", null, "FAJ"), " · Erb & Harvey (2013) · Moskowitz, Ooi & Pedersen (2012) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Frazzini & Pedersen (2014) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Asness, Frazzini & Pedersen (2019) · Hong & Kacperczyk (2009) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Conlon & McGee (2020) ", /* @__PURE__ */ React.createElement("i", null, "FRL"), " · Reinhart & Rogoff (2009) ", /* @__PURE__ */ React.createElement("i", null, "AER"), " · Phillips, Shi & Yu (2015) ", /* @__PURE__ */ React.createElement("i", null, "IER"), " · Jordà et al. (2019) ", /* @__PURE__ */ React.createElement("i", null, "QJE"), " · Garber (1990; 2000) · Cheema, Ryan & Sarwar (2025) ", /* @__PURE__ */ React.createElement("i", null, "IREF"), " · Baur & McDermott (2012) IIIS WP · Longstaff (2004) ", /* @__PURE__ */ React.createElement("i", null, "J. Business"), " · Nagel (2016) ", /* @__PURE__ */ React.createElement("i", null, "QJE"), " · Krishnamurthy & Vissing-Jorgensen (2012) ", /* @__PURE__ */ React.createElement("i", null, "JPE"), " · Duffie (2020) Brookings · Szado (2009) ", /* @__PURE__ */ React.createElement("i", null, "JAI"), " · Hood & Malik (2013) ", /* @__PURE__ */ React.createElement("i", null, "RFE"), " · Carr & Wu (2009) ", /* @__PURE__ */ React.createElement("i", null, "RFS"), " · Dew-Becker et al. (2017) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Alpanda & Peralta-Alva (2010) ", /* @__PURE__ */ React.createElement("i", null, "Rev. Econ. Dynamics"), " · Burdekin & Weidenmier (2004) CUP · Hamilton (2009) ", /* @__PURE__ */ React.createElement("i", null, "BPEA"), " · BIS Annual Economic Report (Jun 2026) · ECB FSR (May 2026) & Int’l Role of the Euro (Jun 2026) · Fed FSR (May 2026) · BoE FSR (2026) · WGC (Jun 2026) · Greenwood, Shleifer & You (2019) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Greenwood, Hanson, Shleifer & Sørensen (2022) ", /* @__PURE__ */ React.createElement("i", null, "JF"), " · Schularick & Taylor (2012) ", /* @__PURE__ */ React.createElement("i", null, "AER"), " · Fahlenbrach, Rageth & Stulz (2021) ", /* @__PURE__ */ React.createElement("i", null, "RFS"), " · Mitchell & Pulvino (2012) ", /* @__PURE__ */ React.createElement("i", null, "JFE"), " · Gennotte & Leland (1990) ", /* @__PURE__ */ React.createElement("i", null, "AER"), " · Cohen, Polk & Vuolteenaho (2003) ", /* @__PURE__ */ React.createElement("i", null, "JF"), " · Gormsen & Koijen (2020) ", /* @__PURE__ */ React.createElement("i", null, "RAPS"), " · Coval, Jurek & Stafford (2009) ", /* @__PURE__ */ React.createElement("i", null, "JEP"), " · Campbell & Shiller (1998) ", /* @__PURE__ */ React.createElement("i", null, "JPM"), " · IEA (2025) · SIPRI (Apr 2026) · NATO (2025).")));
}
ReactDOM.createRoot(document.getElementById("root")).render(/* @__PURE__ */ React.createElement(CrisisWinnersDashboard, null));

})();
