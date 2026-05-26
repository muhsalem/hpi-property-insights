// مشتقات البيانات من قيم العقار/المنطقة (منقولة من HPI v12r)
import { BUILD_RATES, FIN_MULT } from "./constants";

const seed = (s: number) => { const x = Math.sin(s) * 1e4; return x - Math.floor(x); };

export function getDailyPrice(base: number, growth: number): number {
  const dy = Math.floor((Date.now() - new Date(new Date().getFullYear(), 0, 0).getTime()) / 86400000);
  return Math.round(base * (1 + growth + (seed(base + dy) - 0.5) * 0.008));
}

export function getHousingType(l: any, a: any): string {
  const lo = a.land_own || "";
  if (lo.includes("بنك الإسكان")) return "تعاوني";
  if (lo.includes("منح") && ["a15", "a16"].includes(a.id)) return "اجتماعي";
  if (lo.includes("يد")) return "شعبي";
  const f = l.finish;
  if (f === "اكسترا سوبر لوكس" || f === "سوبر لوكس") return "فاخر";
  if (f === "لوكس" || f === "نصف تشطيب") return "متوسط";
  return "اقتصادي";
}

export function getBuildingCondition(l: any) {
  const age = 2026 - (l.year_built || 2020);
  const mc = (l.renovations || []).length;
  const fin = l.finish;
  const base = age <= 3 ? 96 : age <= 7 ? 88 : age <= 12 ? 78 : age <= 20 ? 65 : age <= 30 ? 50 : 35;
  const fa = ({ "اكسترا سوبر لوكس": 8, "سوبر لوكس": 6, "لوكس": 4, "نصف تشطيب": 0, "بدون تشطيب": -4, "-": -7 } as any)[fin] || 0;
  const ma = mc >= 3 ? 10 : mc === 2 ? 6 : mc === 1 ? 3 : 0;
  const score = Math.max(15, Math.min(100, base + fa + ma));
  const G = [
    { min: 88, grade: "ممتازة ★★★★★", color: "#059669" },
    { min: 74, grade: "جيدة جداً ★★★★", color: "#1D9E75" },
    { min: 59, grade: "جيدة ★★★", color: "#EF9F27" },
    { min: 44, grade: "متوسطة ★★", color: "#D85A30" },
    { min: 0, grade: "رديئة ★", color: "#993C1D" },
  ];
  const g = G.find((gr) => score >= gr.min) || G[4];
  return { score, age, ...g };
}

export function getInvReturn(l: any, a: any) {
  const cur = getDailyPrice(l.base_price, a.growth);
  const pp = l.purchase_price || l.base_price * 0.6;
  const yrs = Math.max(1, 2026 - (l.year_built || 2020));
  const cap = ((cur - pp) / pp) * 100;
  const ann = Math.round(l.area_sqm * 18 * 12);
  const rYield = (ann / cur) * 100;
  const totROI = cap + rYield * yrs;
  return { cur, pp, cap: cap.toFixed(1), rYield: rYield.toFixed(2), totROI: totROI.toFixed(1), annRent: ann };
}

export function getBuildingAttachments(l: any, a: any) {
  const ip = (a.land_psqm || 0) > 18000;
  const im = (a.land_psqm || 0) > 10000;
  const bt = l.building_type;
  const fin = l.finish;
  const isLux = ["اكسترا سوبر لوكس", "سوبر لوكس", "لوكس"].includes(fin);
  const he = l.profile?.elev;
  const fl = l.profile?.floors || 1;
  const p = (arr: any[]) => arr.filter(Boolean);
  return {
    ext: p([(a.land_psqm || 0) > 12000 ? (ip ? "سور خرساني" : "سور طوب") : null, ip ? "بوابة كهربائية" : im ? "بوابة يدوية" : null, bt === "TWR" ? "جراج داخلي" : ip ? "مواقف مسقوفة" : null, (ip || bt === "TWR") ? "غرفة حراسة" : null]),
    svc: p([["APT", "TWR", "VIL", "DPX"].includes(bt) ? (bt === "TWR" ? "خزان علوي+أرضي" : "خزان علوي") : null, (bt === "TWR" || ip) ? "مولد احتياطي" : null, "لوحة كهرباء رئيسية", "شبكة صرف صحي"]),
    mep: p([he ? (bt === "TWR" ? "مصعدان" : "مصعد ركاب") : null, fin === "اكسترا سوبر لوكس" ? "تكييف VRV" : fin === "سوبر لوكس" ? "تكييف مركزي" : isLux ? "سبليت مدمج" : null, bt === "TWR" ? "رشاشات + إنذار" : (ip || fl > 4) ? "طفايات + إنذار" : "طفايات"]),
    int: p([["APT", "TWR", "VIL"].includes(bt) ? "غرف خدمات" : null, bt === "VIL" ? "سطح خاص" : fl > 1 ? "سطح مشترك" : null]),
    sec: p([(bt === "TWR" || ip) ? "كاميرات CCTV" : null, ip ? "إنذار متكامل" : im ? "إنذار أساسي" : null]),
    rec: p([(bt === "TWR" || ip) ? "صالة رياضية Gym" : null, (ip || im) ? "ألعاب أطفال" : null]),
  };
}

// مؤشرات سوقية مجمعة
export function getMarketIndicators(areas: any[], listings: any[]) {
  const resL = listings.filter((l) => l.category === "res" && l.building_type !== "LND");
  let totSub = 0, occSub = 0;
  listings.forEach((l) => {
    if (["APT", "TWR"].includes(l.building_type) && l.profile?.floors) {
      const sub = l.profile.floors * (l.profile.upf || 2);
      totSub += sub;
      occSub += Math.round(sub * (0.82 + seed(l.base_price + 50) * 0.14));
    }
  });
  const vacRate = totSub > 0 ? ((totSub - occSub) / totSub * 100).toFixed(1) : "18.4";
  const avgG = areas.length ? areas.reduce((s, a) => s + (a.growth || 0), 0) / areas.length : 0;
  let totCur = 0, totBase = 0, totROI = 0, totRY = 0, cnt = 0;
  resL.forEach((l) => {
    const a = areas.find((x) => x.id === l.area_id);
    if (!a) return;
    const cur = getDailyPrice(l.base_price, a.growth);
    totCur += cur; totBase += l.base_price;
    const inv = getInvReturn(l, a);
    totROI += parseFloat(inv.totROI); totRY += parseFloat(inv.rYield);
    cnt++;
  });
  const avgCur = cnt ? totCur / cnt : 0, avgBase = cnt ? totBase / cnt : 0;
  let totPsqm = 0, dcnt = 0;
  resL.forEach((l) => {
    const a = areas.find((x) => x.id === l.area_id);
    if (!a || !l.area_sqm) return;
    totPsqm += getDailyPrice(l.base_price, a.growth) / l.area_sqm; dcnt++;
  });
  const avgInfra = areas.length ? (areas.reduce((s, a) => s + (a.infra_rating || 3), 0) / areas.length).toFixed(1) : "0";
  const avgSvc = areas.length ? (areas.reduce((s, a) => s + (a.services_rating || 3), 0) / areas.length).toFixed(1) : "0";
  return {
    sd: { vacRate, absorpRate: Math.max(1, Math.round(totSub * avgG * 1.2 / 10)), inventory: Math.round(totSub * (1 - occSub / Math.max(totSub, 1))), totalSub: totSub },
    pr: { hpiVal: avgBase > 0 ? (avgCur / avgBase * 100).toFixed(1) : "N/A", avgROI: cnt ? (totROI / cnt).toFixed(1) : "N/A", avgRY: cnt ? (totRY / cnt).toFixed(2) : "N/A", capApp: avgBase > 0 ? (((avgCur - avgBase) / avgBase) * 100).toFixed(1) : "N/A" },
    macro: { interestRate: 27.25, inflation: 27.5, mortgageGDP: 2.8, priceTOIncome: avgBase > 0 ? (avgBase / (15000 * 12)).toFixed(1) : "N/A" },
    dev: { avgPsqm: dcnt ? Math.round(totPsqm / dcnt) : 0, avgBuildCost: 19000, devMargin: "18-22", avgIRR: (avgG * 100 + 4).toFixed(1) },
    loc: { avgInfra, avgSvc, popDemand: (avgG * 100).toFixed(1) },
  };
}

export function buildHpiSeries(area: any, fromYear = 2020) {
  const cy = new Date().getFullYear();
  const out: { year: number; idx: number }[] = [];
  let idx = 100;
  for (let y = fromYear; y <= cy + 1; y++) {
    out.push({ year: y, idx: Math.round(idx) });
    idx *= 1 + (area.growth || 0.1) / Math.max(1, cy - fromYear);
  }
  return out;
}

export { BUILD_RATES, FIN_MULT };
