// ============================================================
// Advanced Real Estate Indicators
// ============================================================

export type Txn = {
  id: string;
  property_id: string;
  price: number;
  txn_date: string;
};

export type PropertyRow = {
  id: string;
  area_id: string;
  area_sqm: number;
  rooms: number | null;
  baths: number | null;
  floor: number | null;
  year_built: number | null;
  base_price: number;
  building_type: string;
  category: string;
  finish: string | null;
  view: string | null;
};

export type AreaRow = {
  id: string;
  name: string;
  base_price: number;
  growth: number;
  infra_rating: number | null;
  safety_rating: number | null;
  services_rating: number | null;
  transport_rating: number | null;
  district_id: string;
};

// ============================================================
// 1. CASE-SHILLER INDEX (Repeat-Sales weighted)
// ============================================================
// Methodology: Karl Case & Robert Shiller (1987)
// - Uses only properties sold ≥ 2 times (repeat sales)
// - Weights by holding period and price volatility
// - Chained geometric index, base = 100
export function caseShillerIndex(
  txns: Txn[],
  baseYear: number = 2020,
): { series: Array<{ year: number; index: number; n: number }>; cagr: number; latest: number } {
  // Group transactions by property
  const byProp: Record<string, Txn[]> = {};
  for (const t of txns) {
    (byProp[t.property_id] ||= []).push(t);
  }

  // Collect repeat-sale pairs
  const pairs: Array<{ y1: number; y2: number; logRet: number; holdYears: number }> = [];
  for (const list of Object.values(byProp)) {
    if (list.length < 2) continue;
    const sorted = [...list].sort((a, b) => a.txn_date.localeCompare(b.txn_date));
    for (let i = 0; i < sorted.length - 1; i++) {
      const a = sorted[i], b = sorted[i + 1];
      const y1 = new Date(a.txn_date).getFullYear();
      const y2 = new Date(b.txn_date).getFullYear();
      if (y2 <= y1 || a.price <= 0 || b.price <= 0) continue;
      pairs.push({
        y1, y2,
        logRet: Math.log(b.price / a.price),
        holdYears: y2 - y1,
      });
    }
  }

  if (pairs.length === 0) {
    return { series: [{ year: baseYear, index: 100, n: 0 }], cagr: 0, latest: 100 };
  }

  // Determine year range
  const years = Array.from(new Set(pairs.flatMap(p => [p.y1, p.y2]))).sort();
  const minY = Math.min(baseYear, years[0]);
  const maxY = Math.max(...years);

  // Build annual log-return estimates using weighted average across all pairs that span each year
  const yearlyReturns: Record<number, { sum: number; w: number; n: number }> = {};
  for (let y = minY + 1; y <= maxY; y++) {
    yearlyReturns[y] = { sum: 0, w: 0, n: 0 };
  }

  for (const p of pairs) {
    // Annualized log return (Case-Shiller assumption: uniform across hold period)
    const annual = p.logRet / p.holdYears;
    // Weight: inverse of holding period (shorter = more reliable)
    const w = 1 / Math.sqrt(p.holdYears);
    for (let y = p.y1 + 1; y <= p.y2; y++) {
      if (!yearlyReturns[y]) continue;
      yearlyReturns[y].sum += annual * w;
      yearlyReturns[y].w += w;
      yearlyReturns[y].n += 1;
    }
  }

  // Chain the index
  const series: Array<{ year: number; index: number; n: number }> = [{ year: baseYear, index: 100, n: pairs.length }];
  let cur = 100;
  for (let y = baseYear + 1; y <= maxY; y++) {
    const r = yearlyReturns[y];
    const annualReturn = r && r.w > 0 ? r.sum / r.w : 0;
    cur = cur * Math.exp(annualReturn);
    series.push({ year: y, index: +cur.toFixed(2), n: r?.n || 0 });
  }

  const latest = series[series.length - 1].index;
  const n = series.length - 1;
  const cagr = n > 0 ? (Math.pow(latest / 100, 1 / n) - 1) * 100 : 0;

  return { series, cagr: +cagr.toFixed(2), latest };
}

// ============================================================
// 2. HEDONIC PRICING MODEL (OLS Multivariate Regression)
// ============================================================
// Methodology: Rosen (1974) — price = f(structural + locational attributes)
// Model: ln(price/sqm) = β0 + β1·rooms + β2·baths + β3·floor + β4·age + β5·infra + ε
// Implemented via Normal Equations: β = (XᵀX)⁻¹ Xᵀy

type HedonicResult = {
  coefficients: { name: string; beta: number; tStat: number; pct: string }[];
  r2: number;
  adjR2: number;
  n: number;
  rmse: number;
  intercept: number;
  predict: (input: {
    rooms: number; baths: number; floor: number; age: number;
    infra: number; areaPriceLevel: number;
  }) => number;
};

export function hedonicModel(
  properties: PropertyRow[],
  areas: AreaRow[],
): HedonicResult | null {
  const areaById = new Map(areas.map(a => [a.id, a]));
  const rows: Array<{ x: number[]; y: number }> = [];

  for (const p of properties) {
    if (!p.area_sqm || p.area_sqm <= 0 || !p.base_price) continue;
    const a = areaById.get(p.area_id);
    if (!a) continue;
    const pricePerSqm = p.base_price / p.area_sqm;
    if (pricePerSqm <= 0) continue;
    const age = p.year_built ? Math.max(0, new Date().getFullYear() - p.year_built) : 20;
    const x = [
      1, // intercept
      p.rooms ?? 2,
      p.baths ?? 1,
      p.floor ?? 1,
      age,
      a.infra_rating ?? 6,
      Math.log(a.base_price || 1), // location price level
    ];
    rows.push({ x, y: Math.log(pricePerSqm) });
  }

  if (rows.length < 8) return null;

  const n = rows.length;
  const k = rows[0].x.length;
  // Build XᵀX (k×k) and Xᵀy (k)
  const XtX = Array.from({ length: k }, () => Array(k).fill(0));
  const Xty = Array(k).fill(0);
  for (const r of rows) {
    for (let i = 0; i < k; i++) {
      Xty[i] += r.x[i] * r.y;
      for (let j = 0; j < k; j++) XtX[i][j] += r.x[i] * r.x[j];
    }
  }

  const inv = invertMatrix(XtX);
  if (!inv) return null;
  const beta = inv.map(row => row.reduce((s, v, j) => s + v * Xty[j], 0));

  // Residuals + R²
  const yMean = rows.reduce((s, r) => s + r.y, 0) / n;
  let ssRes = 0, ssTot = 0;
  for (const r of rows) {
    const pred = r.x.reduce((s, v, j) => s + v * beta[j], 0);
    ssRes += (r.y - pred) ** 2;
    ssTot += (r.y - yMean) ** 2;
  }
  const r2 = ssTot > 0 ? 1 - ssRes / ssTot : 0;
  const adjR2 = 1 - ((1 - r2) * (n - 1)) / Math.max(1, n - k);
  const rmse = Math.sqrt(ssRes / Math.max(1, n - k));

  // Standard errors → t-stats
  const sigma2 = ssRes / Math.max(1, n - k);
  const se = inv.map((row, i) => Math.sqrt(sigma2 * row[i]));
  const tStats = beta.map((b, i) => (se[i] > 0 ? b / se[i] : 0));

  const names = ["Intercept", "Rooms", "Baths", "Floor", "Age(years)", "Infrastructure", "ln(Location Price)"];
  const coefficients = beta.map((b, i) => ({
    name: names[i],
    beta: +b.toFixed(4),
    tStat: +tStats[i].toFixed(2),
    pct: i === 0 || i === 6 ? "—" : `${((Math.exp(b) - 1) * 100).toFixed(1)}%`,
  }));

  return {
    coefficients,
    r2: +r2.toFixed(3),
    adjR2: +adjR2.toFixed(3),
    n,
    rmse: +rmse.toFixed(3),
    intercept: beta[0],
    predict: ({ rooms, baths, floor, age, infra, areaPriceLevel }) => {
      const x = [1, rooms, baths, floor, age, infra, Math.log(areaPriceLevel)];
      const lnPrice = x.reduce((s, v, j) => s + v * beta[j], 0);
      return Math.exp(lnPrice); // price per sqm
    },
  };
}

// Matrix inversion via Gauss-Jordan
function invertMatrix(m: number[][]): number[][] | null {
  const n = m.length;
  const a = m.map((row, i) => [...row, ...Array.from({ length: n }, (_, j) => (i === j ? 1 : 0))]);
  for (let i = 0; i < n; i++) {
    let pivot = a[i][i];
    let pivotRow = i;
    for (let r = i + 1; r < n; r++) {
      if (Math.abs(a[r][i]) > Math.abs(pivot)) { pivot = a[r][i]; pivotRow = r; }
    }
    if (Math.abs(pivot) < 1e-12) return null;
    if (pivotRow !== i) [a[i], a[pivotRow]] = [a[pivotRow], a[i]];
    for (let j = 0; j < 2 * n; j++) a[i][j] /= pivot;
    for (let r = 0; r < n; r++) {
      if (r === i) continue;
      const factor = a[r][i];
      for (let j = 0; j < 2 * n; j++) a[r][j] -= factor * a[i][j];
    }
  }
  return a.map(row => row.slice(n));
}

// ============================================================
// 3. HOUSING AFFORDABILITY INDEX (HAI)
// ============================================================
// NAR Methodology: HAI = (Median Income / Qualifying Income) × 100
// Qualifying Income = required income to afford median home (30% of income → mortgage)
// HAI > 100 → median family CAN afford median home
// HAI < 100 → unaffordable
export function affordabilityIndex(
  medianHomePrice: number,
  medianAnnualIncome: number,
  interestRate: number = 0.18, // Egypt mortgage rate ~18%
  termYears: number = 25,
  downPaymentPct: number = 0.30,
): {
  hai: number;
  qualifyingIncome: number;
  monthlyPayment: number;
  priceToIncome: number;
  status: "affordable" | "stretched" | "unaffordable" | "severely_unaffordable";
} {
  const loanAmount = medianHomePrice * (1 - downPaymentPct);
  const r = interestRate / 12;
  const n = termYears * 12;
  // Mortgage payment formula
  const monthlyPayment = (loanAmount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  // Qualifying income: payment ≤ 30% of monthly income
  const qualifyingIncome = (monthlyPayment / 0.30) * 12;
  const hai = (medianAnnualIncome / qualifyingIncome) * 100;
  const priceToIncome = medianHomePrice / medianAnnualIncome;

  let status: "affordable" | "stretched" | "unaffordable" | "severely_unaffordable";
  if (priceToIncome <= 3) status = "affordable";
  else if (priceToIncome <= 5) status = "stretched";
  else if (priceToIncome <= 8) status = "unaffordable";
  else status = "severely_unaffordable";

  return {
    hai: +hai.toFixed(1),
    qualifyingIncome: Math.round(qualifyingIncome),
    monthlyPayment: Math.round(monthlyPayment),
    priceToIncome: +priceToIncome.toFixed(2),
    status,
  };
}

// ============================================================
// 4. BUBBLE INDEX
// ============================================================
// Composite of: Price-to-Income, Price-to-Rent, Price Growth vs Income Growth,
// Mortgage Burden. Inspired by UBS Global Real Estate Bubble Index methodology.
export function bubbleIndex(params: {
  priceToIncome: number;        // current
  priceToIncomeHistorical: number; // long-term avg
  priceToRent: number;          // current
  priceToRentHistorical: number;
  priceGrowth5y: number;        // %
  incomeGrowth5y: number;       // %
  mortgageBurden: number;       // monthly payment / income (%)
}): {
  score: number;        // 0..2+, where 1.5+ = bubble risk
  rating: "depressed" | "fair" | "overvalued" | "bubble_risk" | "bubble";
  components: { name: string; value: number; weight: number }[];
} {
  const p = params;
  // Z-score-style normalized components
  const c1 = (p.priceToIncome / Math.max(1, p.priceToIncomeHistorical)) - 1;
  const c2 = (p.priceToRent / Math.max(1, p.priceToRentHistorical)) - 1;
  const c3 = (p.priceGrowth5y - p.incomeGrowth5y) / 100;
  const c4 = Math.max(0, (p.mortgageBurden - 30) / 100);

  const weights = [0.30, 0.25, 0.25, 0.20];
  const components = [
    { name: "Price-to-Income vs History", value: +c1.toFixed(3), weight: weights[0] },
    { name: "Price-to-Rent vs History",   value: +c2.toFixed(3), weight: weights[1] },
    { name: "Price Growth − Income Growth", value: +c3.toFixed(3), weight: weights[2] },
    { name: "Mortgage Burden Excess",     value: +c4.toFixed(3), weight: weights[3] },
  ];
  const score = components.reduce((s, c) => s + c.value * c.weight, 0);

  let rating: "depressed" | "fair" | "overvalued" | "bubble_risk" | "bubble";
  if (score < -0.15) rating = "depressed";
  else if (score < 0.15) rating = "fair";
  else if (score < 0.50) rating = "overvalued";
  else if (score < 1.0) rating = "bubble_risk";
  else rating = "bubble";

  return { score: +score.toFixed(3), rating, components };
}

export const RATING_LABELS_AR: Record<string, string> = {
  depressed: "سوق راكد",
  fair: "متوازن",
  overvalued: "مُبالَغ فيه",
  bubble_risk: "خطر فقاعة",
  bubble: "فقاعة سعرية",
  affordable: "ميسور",
  stretched: "مرهق",
  unaffordable: "غير ميسور",
  severely_unaffordable: "غير ميسور بشدة",
};
