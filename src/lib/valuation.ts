// محرك التقييم العقاري - 5 طرق + HPI Repeat-Sales + Adjustment Grid
// متوافق مع EES (الجمعية المصرية للمقيمين) و IVS 2022

export type Area = {
  id: string; name: string; district_id: string;
  base_price: number; growth: number; land_psqm: number;
  infra_rating?: number; safety_rating?: number; services_rating?: number; transport_rating?: number;
};

export type Property = {
  id: string; area_id: string; category: string; type_label: string;
  area_sqm: number; floor?: number | null; view?: string | null; finish?: string | null;
  rooms?: number; baths?: number; base_price: number; year_built?: number | null;
  building_type: string; profile?: any; renovations?: any[];
};

export type Transaction = { property_id: string; txn_date: string; price: number };

// ============ HPI - Repeat-Sales Method ============
// لكل عقار اتباع في صفقتين أو أكثر، نحسب CAGR ثم نأخذ المتوسط المرجح
export function buildHPI(transactions: Transaction[], baseYear = 2020): Record<number, number> {
  const byProp: Record<string, Transaction[]> = {};
  for (const t of transactions) {
    (byProp[t.property_id] = byProp[t.property_id] || []).push(t);
  }
  const annualGrowths: { year: number; rate: number; weight: number }[] = [];
  for (const list of Object.values(byProp)) {
    if (list.length < 2) continue;
    list.sort((a,b)=>a.txn_date.localeCompare(b.txn_date));
    for (let i=1;i<list.length;i++) {
      const y1 = new Date(list[i-1].txn_date).getFullYear();
      const y2 = new Date(list[i].txn_date).getFullYear();
      const dy = y2 - y1;
      if (dy < 1) continue;
      const cagr = Math.pow(list[i].price / list[i-1].price, 1/dy) - 1;
      for (let y = y1+1; y <= y2; y++) {
        annualGrowths.push({ year: y, rate: cagr, weight: 1/dy });
      }
    }
  }
  const currentYear = new Date().getFullYear();
  const idx: Record<number, number> = { [baseYear]: 100 };
  for (let y = baseYear+1; y <= currentYear+1; y++) {
    const sameYear = annualGrowths.filter(g=>g.year===y);
    let avg = 0;
    if (sameYear.length) {
      const totW = sameYear.reduce((s,g)=>s+g.weight, 0);
      avg = sameYear.reduce((s,g)=>s+g.rate*g.weight, 0) / totW;
    } else {
      avg = 0.10; // افتراضي 10% سنوياً للسوق المصري
    }
    idx[y] = idx[y-1] * (1 + avg);
  }
  return idx;
}

export function timeAdjust(value: number, fromYear: number, toYear: number, hpi: Record<number, number>): number {
  const f = hpi[fromYear] ?? 100;
  const t = hpi[toYear] ?? 100;
  return value * (t / f);
}

// ============ 1. Sales Comparison ============
export type AdjustmentRow = {
  comparable_id: string;
  sale_price: number;
  area_sqm: number;
  ppsqm: number;
  adj_location: number; // %
  adj_size: number;
  adj_finish: number;
  adj_floor: number;
  adj_view: number;
  adj_time: number;
  adjusted_ppsqm: number;
  adjusted_total: number;
};

export function salesComparison(
  subject: Property,
  comparables: { prop: Property; txn: Transaction }[],
  hpi: Record<number, number>
): { value: number; grid: AdjustmentRow[] } {
  const subjYear = new Date().getFullYear();
  const grid: AdjustmentRow[] = comparables.map(({ prop, txn }) => {
    const ppsqm = txn.price / prop.area_sqm;
    const txnYear = new Date(txn.txn_date).getFullYear();
    const adj_time = (hpi[subjYear] ?? 100) / (hpi[txnYear] ?? 100) - 1;
    const adj_location = subject.area_id === prop.area_id ? 0 : ((subject.base_price - prop.base_price) / prop.base_price);
    const adj_size = prop.area_sqm > subject.area_sqm * 1.2 ? 0.05 : prop.area_sqm < subject.area_sqm * 0.8 ? -0.05 : 0;
    const finishMap: Record<string, number> = { "سوبر لوكس": 1.0, "لوكس": 0.9, "نصف تشطيب": 0.7, "بدون": 0.5 };
    const subjFinish = finishMap[subject.finish || ""] || 0.85;
    const compFinish = finishMap[prop.finish || ""] || 0.85;
    const adj_finish = (subjFinish - compFinish);
    const adj_floor = ((subject.floor || 0) - (prop.floor || 0)) * 0.01;
    const adj_view = (subject.view?.includes("بحري") ? 0.08 : 0) - (prop.view?.includes("بحري") ? 0.08 : 0);
    const totalAdj = adj_location + adj_size + adj_finish + adj_floor + adj_view + adj_time;
    const adjusted_ppsqm = ppsqm * (1 + totalAdj);
    return {
      comparable_id: prop.id, sale_price: txn.price, area_sqm: prop.area_sqm, ppsqm,
      adj_location, adj_size, adj_finish, adj_floor, adj_view, adj_time,
      adjusted_ppsqm, adjusted_total: adjusted_ppsqm * subject.area_sqm,
    };
  });
  const avg = grid.length ? grid.reduce((s,r)=>s+r.adjusted_total, 0) / grid.length : 0;
  return { value: avg, grid };
}

// ============ 2. Income Approach (Direct Cap) ============
export function incomeApproach(subject: Property, monthlyRent: number, capRate: number, vacancy = 0.08, opex = 0.20): number {
  const gpi = monthlyRent * 12;
  const egi = gpi * (1 - vacancy);
  const noi = egi * (1 - opex);
  return noi / capRate;
}

// ============ 3. Cost Approach ============
const BUILD_RATES: Record<string, number> = { APT: 8000, TWR: 12000, VIL: 10000, DPX: 9000, COM: 11000, IND: 6500, LND: 0 };
export function costApproach(subject: Property, area: Area): { land: number; building: number; depreciation: number; total: number } {
  const landArea = subject.category === "res" ? subject.area_sqm * 0.3 : subject.area_sqm * 0.5;
  const land = landArea * area.land_psqm;
  const rate = BUILD_RATES[subject.building_type] || 8000;
  const buildingNew = subject.area_sqm * rate;
  const age = new Date().getFullYear() - (subject.year_built || 2020);
  const depRate = Math.min(0.5, age * 0.015); // 1.5%/year, cap 50%
  const depreciation = buildingNew * depRate;
  const building = buildingNew - depreciation;
  return { land, building, depreciation, total: land + building };
}

// ============ 4. Residual Method (Developer) ============
export function residualMethod(landArea: number, area: Area, gba: number, sellPpsqm: number, devProfit = 0.18): number {
  const grossDevValue = gba * sellPpsqm;
  const constCost = gba * (BUILD_RATES[area ? "APT" : "APT"] || 8000);
  const softCost = constCost * 0.15;
  const profit = grossDevValue * devProfit;
  const residual = grossDevValue - constCost - softCost - profit;
  return residual; // = land value
}

// ============ 5. Profit Method (Trade-Related) ============
export function profitMethod(annualRevenue: number, opMargin: number, ownerShare = 0.5, yieldRate = 0.10): number {
  const operatingProfit = annualRevenue * opMargin;
  const propertyShare = operatingProfit * ownerShare;
  return propertyShare / yieldRate;
}

// ============ Weighted Reconciliation ============
export function reconcile(values: { sales?: number; income?: number; cost?: number; residual?: number; profit?: number }, weights: { sales: number; income: number; cost: number; residual: number; profit: number }): number {
  let total = 0, w = 0;
  for (const k of ["sales","income","cost","residual","profit"] as const) {
    const v = values[k];
    if (v && v > 0 && weights[k] > 0) { total += v * weights[k]; w += weights[k]; }
  }
  return w > 0 ? total / w : 0;
}

export function confidenceInterval(values: number[]): { low: number; mid: number; high: number; cv: number } {
  const vals = values.filter(v => v > 0);
  if (!vals.length) return { low: 0, mid: 0, high: 0, cv: 0 };
  const mid = vals.reduce((s,v)=>s+v,0) / vals.length;
  const sd = Math.sqrt(vals.reduce((s,v)=>s+(v-mid)**2, 0) / vals.length);
  const cv = sd / mid;
  return { low: mid - sd, mid, high: mid + sd, cv };
}

export const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n));
export const pct = (n: number) => `${(n*100).toFixed(1)}%`;
