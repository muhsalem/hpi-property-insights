// مؤشرات دولية مدمجة لإثراء تقارير التقييم
// مصادر: UN-Habitat (SDG 11) · QULI · World Bank LGAF & Doing Business · NASA/Copernicus لمخاطر المناخ

// =====================================================
// 1) HAI — مؤشر القدرة على تحمل التكاليف (Housing Affordability)
//    موجود بالفعل في advanced-indicators.ts — نضيف فقط تصنيف UN-Habitat
// =====================================================
export function classifyAffordability(priceToIncome: number) {
  if (priceToIncome <= 3) return { label: "ميسور", level: "affordable", risk: 0, color: "#1D9E75" };
  if (priceToIncome <= 5) return { label: "مرهق قليلاً", level: "moderate", risk: 1, color: "#EF9F27" };
  if (priceToIncome <= 8) return { label: "غير ميسور", level: "unaffordable", risk: 2, color: "#D85A30" };
  if (priceToIncome <= 10) return { label: "غير ميسور بشدة", level: "severe", risk: 3, color: "#C0392B" };
  return { label: "أزمة سكنية — مخاطرة عالية", level: "crisis", risk: 4, color: "#7B241C" };
}

// =====================================================
// 2) SDG 11 — مؤشر مُركّب لجودة الحي (UN-Habitat)
//    من: البنية التحتية + الخدمات + الأمان + المواصلات
// =====================================================
export type SDG11Input = {
  infra?: number | null;      // 1-5
  services?: number | null;   // 1-5
  safety?: number | null;     // 1-5
  transport?: number | null;  // 1-5
};
export function sdg11Score(a: SDG11Input) {
  const vals = [a.infra, a.services, a.safety, a.transport]
    .map((v) => (typeof v === "number" ? v : null))
    .filter((v): v is number => v !== null);
  if (!vals.length) return null;
  const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
  const normalized = (avg / 5) * 100; // 0-100
  let level: "ضعيف" | "متوسط" | "جيد" | "ممتاز";
  let color: string;
  if (normalized < 40) { level = "ضعيف"; color = "#D85A30"; }
  else if (normalized < 60) { level = "متوسط"; color = "#EF9F27"; }
  else if (normalized < 80) { level = "جيد"; color = "#185FA5"; }
  else { level = "ممتاز"; color = "#1D9E75"; }
  return {
    score: +normalized.toFixed(1),
    level,
    color,
    components: {
      infra: a.infra ?? null,
      services: a.services ?? null,
      safety: a.safety ?? null,
      transport: a.transport ?? null,
    },
    // أثر تقديري على القيمة السوقية (±10٪)
    valueImpactPct: +(((normalized - 60) / 4)).toFixed(2),
  };
}

// =====================================================
// 3) QULI — مؤشر جودة الحياة الحضرية
//    مُركّب من: SDG11 + النمو السعري + كثافة الخدمات (nearby) + التميّز الإداري
// =====================================================
export type QULIInput = {
  sdg11: number;            // 0-100
  growthPct: number;         // %
  nearbyCount: number;       // عدد الخدمات في nearby[]
  premiumPct: number;        // من portsaid-context
};
export function quliScore(i: QULIInput) {
  // أوزان: SDG11 40٪ · النمو 25٪ · الخدمات 20٪ · الجاذبية 15٪
  const sdgN = i.sdg11;                                       // 0-100
  const growthN = Math.max(0, Math.min(100, 50 + i.growthPct * 2));   // مركز 50 عند نمو 0
  const nearbyN = Math.min(100, i.nearbyCount * 12);          // كل خدمة = 12 نقطة (max ~8)
  const premN = Math.max(0, Math.min(100, 50 + i.premiumPct * 2.5));  // -20→0, +20→100
  const score = sdgN * 0.4 + growthN * 0.25 + nearbyN * 0.2 + premN * 0.15;
  let level: string; let color: string;
  if (score < 40) { level = "منخفض"; color = "#D85A30"; }
  else if (score < 60) { level = "مقبول"; color = "#EF9F27"; }
  else if (score < 75) { level = "مرتفع"; color = "#185FA5"; }
  else { level = "متميّز"; color = "#1D9E75"; }
  return {
    score: +score.toFixed(1),
    level,
    color,
    breakdown: {
      sdg11: +sdgN.toFixed(1),
      growth: +growthN.toFixed(1),
      services: +nearbyN.toFixed(1),
      attractiveness: +premN.toFixed(1),
    },
  };
}

// =====================================================
// 4) LGAF — Land Governance Assessment Framework (World Bank)
//    قيمة قُطرية ثابتة (مصر) — تدخل في حساب علاوة المخاطرة لمعدل الخصم
// =====================================================
export const EGYPT_LGAF = {
  score: 2.4,           // من 5 (تقدير 2023 — يقين قانوني متوسط لإدارة الأراضي)
  landRegScore: 41,     // Doing Business — Registering Property (٪)
  buildPermitDays: 173, // متوسط أيام استخراج تراخيص البناء
  buildPermitCostPct: 1.5, // ٪ من قيمة المبنى
  propertyRegRank: 130, // ترتيب مصر عالمياً (تسجيل الملكية)
  // علاوة المخاطرة المضافة لمعدل الخصم وفق LGAF
  riskPremiumPct: 2.5,  // %
  // نص لتقارير العناية الواجبة
  note: "وفقاً لمؤشر LGAF للبنك الدولي ومؤشر تسجيل الملكية، تُضاف علاوة مخاطرة قُطرية بنحو 2.5٪ على معدل الخصم لتعكس عدم اليقين القانوني في تسجيل الأراضي بمصر.",
};

// =====================================================
// 5) Climate Risk — مخاطر مناخية لبورسعيد (ساحلية)
//    بورسعيد من أكثر مدن العالم تعرضاً لارتفاع منسوب البحر (IPCC AR6)
// =====================================================
export type ClimateRiskInput = {
  districtName?: string | null;  // اسم الحي للتمييز بين الساحلي والداخلي
  seafront?: boolean;            // عقار على واجهة بحرية
};
export function climateRiskPS(i: ClimateRiskInput) {
  const coastal = ["الشرق", "الزهور", "الجنوب", "بورفؤاد"]; // أحياء معرّضة
  const isCoastal = i.seafront || (i.districtName ? coastal.some((c) => i.districtName!.includes(c)) : false);

  // قاعدة: بورسعيد بأكملها معرّضة لارتفاع منسوب البحر (+0.5م بحلول 2050 — IPCC)
  // المخاطر: الفيضانات، تملّح المياه الجوفية، الموجات الحارة
  const baseScore = 65;  // المحافظة كاملة
  const score = isCoastal ? Math.min(100, baseScore + 20) : baseScore;

  let level: string; let color: string; let discount: number;
  if (score < 40) { level = "منخفض"; color = "#1D9E75"; discount = 0; }
  else if (score < 60) { level = "متوسط"; color = "#EF9F27"; discount = 3; }
  else if (score < 80) { level = "مرتفع"; color = "#D85A30"; discount = 7; }
  else { level = "حرج"; color = "#7B241C"; discount = 12; }

  return {
    score,
    level,
    color,
    isCoastal,
    valueDiscountPct: discount, // خصم مقترح من القيمة السوقية
    risks: [
      { name: "ارتفاع منسوب البحر", level: isCoastal ? "حرج" : "مرتفع", horizon: "2050", source: "IPCC AR6" },
      { name: "الفيضانات الساحلية", level: isCoastal ? "مرتفع" : "متوسط", horizon: "متكرر", source: "EEAA 2022" },
      { name: "تملّح المياه الجوفية", level: "مرتفع", horizon: "حالي", source: "وزارة الموارد المائية" },
      { name: "موجات الحرارة الشديدة", level: "متوسط", horizon: "2030+", source: "Copernicus C3S" },
    ],
    recommendation: isCoastal
      ? "يُنصح بإدراج علاوة مخاطرة مناخية في تقرير التقييم، ومراجعة تأمين العقار ضد الفيضانات."
      : "مخاطر مناخية متوسطة — يُذكر في قسم العناية الواجبة دون أثر جوهري على القيمة.",
  };
}

// =====================================================
// مساعد: علاوة المخاطرة الإجمالية لمعدل الخصم
// =====================================================
export function totalRiskPremium(climateRisk: number, hai: number) {
  const climate = climateRisk >= 80 ? 1.5 : climateRisk >= 60 ? 1.0 : 0.5;
  const lgaf = EGYPT_LGAF.riskPremiumPct;
  const affordability = hai < 50 ? 1.5 : hai < 80 ? 0.75 : 0;
  return {
    climate,
    lgaf,
    affordability,
    total: +(climate + lgaf + affordability).toFixed(2),
  };
}
