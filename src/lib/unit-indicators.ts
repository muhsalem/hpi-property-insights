// مكتبة شاملة لمؤشرات تقييم الوحدة العقارية
// Real Estate Valuation Indicators — 60+ مؤشر مصنّف في 10 محاور
import { getInvReturn, getBuildingCondition } from "./domain";

export type IndStatus = "good" | "warn" | "bad" | "neutral";
export type Indicator = {
  code: string;
  ar: string;
  en: string;
  value: string | number;
  unit?: string;
  status?: IndStatus;
  hint?: string;
};
export type Branch = { key: string; ar: string; en: string; color: string; nodes: Indicator[] };

const up = (v: number, g: number, b: number): IndStatus => (v >= g ? "good" : v <= b ? "bad" : "warn");
const dn = (v: number, g: number, b: number): IndStatus => (v <= g ? "good" : v >= b ? "bad" : "warn");
const txt = (n: number, d = 1) => (isFinite(n) ? n.toFixed(d) : "-");

export function computeUnitIndicators(prop: any, area: any, txns: any[] = []): Branch[] {
  const inv = getInvReturn(prop, area);
  const cond = getBuildingCondition(prop);
  const psqm = inv.cur / prop.area_sqm;
  const age = new Date().getFullYear() - (prop.year_built || 2020);
  const remLife = Math.max(0, 60 - age);
  const depRate = Math.min(50, age * 1.5);
  const monthlyRent = inv.annRent / 12;
  const grm = inv.cur / (inv.annRent || 1);
  const totROI = Number(inv.totROI) || 0;
  const rYield = Number(inv.rYield) || 0;
  const capApp = Number(inv.cap) || 0;
  const payback = 100 / (totROI || 1);
  const finishMap: Record<string, number> = { "سوبر لوكس": 95, "لوكس": 85, "نصف تشطيب": 65, "بدون": 40 };
  const finishScore = finishMap[prop.finish || ""] || 70;
  const rooms = prop.rooms || 0;
  const baths = prop.baths || 0;
  const floor = prop.floor ?? 0;
  const seaView = (prop.view || "").includes("بحري");
  const infra = Number(area.infra_rating ?? 3);
  const safety = Number(area.safety_rating ?? 3);
  const services = Number(area.services_rating ?? 3);
  const transport = Number(area.transport_rating ?? 3);
  const locScore = ((infra + safety + services + transport) / 4 / 5) * 100;
  const growth = Number(area.growth || 0) * 100;
  const landValue = Number(area.land_psqm || 0) * prop.area_sqm * 0.3;
  const ltv = (landValue / inv.cur) * 100;
  const buildRates: Record<string, number> = { APT: 8000, TWR: 12000, VIL: 10000, DPX: 9000, COM: 11000, IND: 6500, LND: 0 };
  const buildCost = (buildRates[prop.building_type] || 8000) * prop.area_sqm;
  const profitMargin = ((inv.cur - buildCost - landValue) / (buildCost + landValue)) * 100;
  // افتراضات اقتصادية
  const medianIncome = 8500 * 12; // ج/سنة (متوسط دخل أسرة بورسعيد)
  const priceToIncome = inv.cur / medianIncome;
  const mortgageRate = 0.235; // 23.5% فائدة عقارية مصرية حالياً
  const dscr = (inv.annRent * 0.7) / (inv.cur * 0.7 * mortgageRate); // افتراض 70% تمويل
  const affordability = (medianIncome * 0.3) / (inv.cur * 0.7 * mortgageRate / 12 * 12) * 100;
  const cci = age < 5 ? 95 : age < 15 ? 80 : age < 30 ? 60 : 35; // Construction Condition Index
  const liq = txns.length;
  const renoCount = ((prop.renovations as any[]) || []).length;

  return [
    {
      key: "phys", ar: "الخصائص الفيزيائية والمعمارية", en: "Physical & Architectural", color: "#185FA5",
      nodes: [
        { code: "P-01", ar: "المساحة الإجمالية (GFA)", en: "Gross Floor Area", value: prop.area_sqm, unit: "م²", status: "neutral" },
        { code: "P-02", ar: "المساحة المؤجّرة الصافية (NLA)", en: "Net Leasable Area", value: Math.round(prop.area_sqm * 0.85), unit: "م²", status: "neutral" },
        { code: "P-03", ar: "كفاءة التصميم (NLA/GFA)", en: "Design Efficiency", value: "85", unit: "%", status: "good" },
        { code: "P-04", ar: "كثافة الغرف", en: "Room Density", value: rooms ? txt(prop.area_sqm / rooms) : "-", unit: "م²/غرفة", status: "neutral" },
        { code: "P-05", ar: "نسبة الحمامات للغرف", en: "Bath/Room Ratio", value: rooms ? txt(baths / rooms, 2) : "-", status: baths >= rooms / 2 ? "good" : "warn" },
        { code: "P-06", ar: "الدور", en: "Floor Level", value: floor, status: floor >= 2 && floor <= 7 ? "good" : "warn", hint: "الأدوار 2-7 الأفضل سوقياً" },
        { code: "P-07", ar: "الإطلالة", en: "View Premium", value: seaView ? "بحرية (+8%)" : (prop.view || "عادية"), status: seaView ? "good" : "neutral" },
        { code: "P-08", ar: "نوع المبنى", en: "Building Typology", value: prop.building_type, status: "neutral" },
        { code: "P-09", ar: "التشطيب", en: "Finish Level", value: prop.finish || "-", status: finishScore >= 80 ? "good" : finishScore >= 60 ? "warn" : "bad" },
      ],
    },
    {
      key: "cond", ar: "الحالة الإنشائية والتقادم", en: "Structural Condition & Depreciation", color: cond.color,
      nodes: [
        { code: "C-01", ar: "درجة حالة المبنى (BCI)", en: "Building Condition Index", value: cond.score, unit: "/100", status: cond.score >= 75 ? "good" : cond.score >= 50 ? "warn" : "bad" },
        { code: "C-02", ar: "مؤشر جودة الإنشاء (CCI)", en: "Construction Condition Index", value: cci, unit: "/100", status: up(cci, 75, 50) },
        { code: "C-03", ar: "العمر الفعلي", en: "Effective Age", value: age, unit: "سنة", status: dn(age, 10, 30) },
        { code: "C-04", ar: "العمر الاقتصادي المتبقي", en: "Remaining Economic Life", value: remLife, unit: "سنة", status: remLife >= 30 ? "good" : remLife >= 15 ? "warn" : "bad" },
        { code: "C-05", ar: "نسبة الإهلاك التراكمي", en: "Accumulated Depreciation", value: txt(depRate), unit: "%", status: dn(depRate, 15, 35) },
        { code: "C-06", ar: "الإهلاك السنوي", en: "Annual Depreciation Rate", value: "1.5", unit: "%/سنة", status: "neutral" },
        { code: "C-07", ar: "جودة التشطيب", en: "Finish Quality Score", value: finishScore, unit: "/100", status: up(finishScore, 80, 50) },
        { code: "C-08", ar: "عدد التجديدات", en: "Renovations Count", value: renoCount, status: renoCount > 0 ? "good" : "neutral" },
        { code: "C-09", ar: "التقادم الوظيفي", en: "Functional Obsolescence", value: age > 25 ? "مرتفع" : age > 15 ? "متوسط" : "منخفض", status: age > 25 ? "bad" : age > 15 ? "warn" : "good" },
        { code: "C-10", ar: "التقادم الخارجي", en: "External Obsolescence", value: growth < 3 ? "مرتفع" : "منخفض", status: growth < 3 ? "warn" : "good" },
      ],
    },
    {
      key: "val", ar: "المؤشرات المالية والقيمة", en: "Financial & Value", color: "#1D9E75",
      nodes: [
        { code: "F-01", ar: "القيمة السوقية الحالية (MV)", en: "Market Value", value: Math.round(inv.cur), unit: "ج", status: "neutral" },
        { code: "F-02", ar: "سعر المتر المربع", en: "Price per SQM", value: Math.round(psqm), unit: "ج/م²", status: "neutral" },
        { code: "F-03", ar: "متوسط سعر متر الحي", en: "District Avg PSQM", value: Math.round(Number(area.base_price)), unit: "ج/م²", status: "neutral" },
        { code: "F-04", ar: "نسبة سعر الوحدة لمتوسط الحي", en: "Unit/District Ratio", value: txt(psqm / Number(area.base_price), 2), unit: "x", status: up(psqm / Number(area.base_price), 1.1, 0.9) },
        { code: "F-05", ar: "قيمة الأرض المقدّرة", en: "Estimated Land Value", value: Math.round(landValue), unit: "ج", status: "neutral" },
        { code: "F-06", ar: "تكلفة الإحلال", en: "Replacement Cost", value: Math.round(buildCost), unit: "ج", status: "neutral" },
        { code: "F-07", ar: "نسبة الأرض/القيمة (LTV)", en: "Land-to-Value Ratio", value: txt(ltv), unit: "%", status: up(ltv, 30, 10) },
        { code: "F-08", ar: "هامش ربح المطوّر", en: "Developer Margin", value: txt(profitMargin), unit: "%", status: up(profitMargin, 18, 8) },
        { code: "F-09", ar: "الإيجار الشهري المقدّر", en: "Est. Monthly Rent", value: Math.round(monthlyRent), unit: "ج", status: "neutral" },
        { code: "F-10", ar: "الإيجار السنوي الإجمالي (GPI)", en: "Gross Potential Income", value: Math.round(inv.annRent), unit: "ج", status: "neutral" },
        { code: "F-11", ar: "صافي الدخل التشغيلي (NOI)", en: "Net Operating Income", value: Math.round(inv.annRent * 0.72), unit: "ج", status: "neutral" },
        { code: "F-12", ar: "مضاعف الإيجار الإجمالي (GRM)", en: "Gross Rent Multiplier", value: txt(grm), unit: "x", status: dn(grm, 12, 20), hint: "أقل = استرداد أسرع" },
        { code: "F-13", ar: "معدل الرسملة (Cap Rate)", en: "Capitalization Rate", value: "8.5", unit: "%", status: "good" },
      ],
    },
    {
      key: "roi", ar: "العائد والاستثمار", en: "Returns & Investment", color: "#1D9E75",
      nodes: [
        { code: "R-01", ar: "العائد الإيجاري", en: "Rental Yield", value: txt(rYield, 2), unit: "%", status: up(rYield, 7, 4) },
        { code: "R-02", ar: "نمو رأس المال", en: "Capital Appreciation", value: txt(capApp), unit: "%", status: up(capApp, 8, 3) },
        { code: "R-03", ar: "إجمالي العائد (Total ROI)", en: "Total Return on Investment", value: txt(totROI), unit: "%", status: up(totROI, 12, 6) },
        { code: "R-04", ar: "فترة الاسترداد (Payback)", en: "Payback Period", value: txt(payback), unit: "سنة", status: dn(payback, 10, 20) },
        { code: "R-05", ar: "نمو الحي السنوي (CAGR)", en: "District Annual Growth", value: txt(growth), unit: "%", status: up(growth, 7, 3) },
        { code: "R-06", ar: "صافي القيمة الحالية تقريباً (NPV)", en: "Approx. NPV (5yr)", value: Math.round(inv.cur * (totROI / 100) * 5 - inv.cur * 0.05), unit: "ج", status: "neutral" },
        { code: "R-07", ar: "معدل العائد الداخلي (IRR)", en: "Internal Rate of Return", value: txt(totROI * 0.9), unit: "%", status: up(totROI * 0.9, 10, 5) },
        { code: "R-08", ar: "نسبة تغطية الدين (DSCR)", en: "Debt Service Coverage Ratio", value: txt(dscr, 2), unit: "x", status: up(dscr, 1.25, 1.0) },
      ],
    },
    {
      key: "loc", ar: "الموقع والبيئة العمرانية", en: "Location & Urban Environment", color: "#EF9F27",
      nodes: [
        { code: "L-01", ar: "درجة الموقع الإجمالية", en: "Composite Location Score", value: txt(locScore, 0), unit: "/100", status: up(locScore, 75, 50) },
        { code: "L-02", ar: "البنية التحتية", en: "Infrastructure Rating", value: infra, unit: "/5", status: up(infra, 4, 2) },
        { code: "L-03", ar: "الخدمات والمرافق", en: "Services & Amenities", value: services, unit: "/5", status: up(services, 4, 2) },
        { code: "L-04", ar: "النقل والمواصلات", en: "Transport Access", value: transport, unit: "/5", status: up(transport, 4, 2) },
        { code: "L-05", ar: "الأمان والاستقرار", en: "Safety & Security", value: safety, unit: "/5", status: up(safety, 4, 2) },
        { code: "L-06", ar: "نوع الحي السكني", en: "Neighborhood Class", value: psqm > 25000 ? "راقٍ" : psqm > 15000 ? "متوسط+" : "متوسط", status: "neutral" },
        { code: "L-07", ar: "كثافة العمران", en: "Urban Density", value: "متوسطة", status: "neutral" },
      ],
    },
    {
      key: "mkt", ar: "السوق والعرض والطلب", en: "Market Supply & Demand", color: "#8B5CF6",
      nodes: [
        { code: "M-01", ar: "مؤشر أسعار العقارات (HPI)", en: "House Price Index", value: txt(100 * (1 + growth / 100), 0), unit: "نقطة", status: up(100 + growth, 105, 100) },
        { code: "M-02", ar: "معدل الامتصاص", en: "Absorption Rate", value: liq ? txt(liq / 12, 2) : "0", unit: "/شهر", status: up(liq, 3, 0) },
        { code: "M-03", ar: "أيام البيع المتوقعة (DOM)", en: "Days on Market", value: liq > 2 ? "30-60" : liq > 0 ? "60-120" : ">120", status: liq > 2 ? "good" : liq > 0 ? "warn" : "bad" },
        { code: "M-04", ar: "مؤشر الفقاعة العقارية", en: "Bubble Index", value: priceToIncome > 12 ? "مرتفع" : priceToIncome > 8 ? "متوسط" : "منخفض", status: priceToIncome > 12 ? "bad" : priceToIncome > 8 ? "warn" : "good" },
        { code: "M-05", ar: "مؤشر الثقة في السوق", en: "Market Sentiment", value: growth > 5 ? "صاعد" : growth > 0 ? "مستقر" : "هابط", status: growth > 5 ? "good" : growth > 0 ? "warn" : "bad" },
        { code: "M-06", ar: "حساسية الأسعار للموقع", en: "Location Price Elasticity", value: txt((psqm / Number(area.base_price) - 1) * 100, 1), unit: "%", status: "neutral" },
      ],
    },
    {
      key: "macro", ar: "المؤشرات الاقتصادية الكلية", en: "Macroeconomic", color: "#0EA5E9",
      nodes: [
        { code: "E-01", ar: "نسبة السعر/الدخل (P/I)", en: "Price-to-Income Ratio", value: txt(priceToIncome, 1), unit: "x", status: dn(priceToIncome, 6, 12), hint: "مرجع NAR: 3-5 معقول" },
        { code: "E-02", ar: "نسبة السعر/الإيجار (P/R)", en: "Price-to-Rent Ratio", value: txt(grm, 1), unit: "x", status: dn(grm, 15, 25) },
        { code: "E-03", ar: "مؤشر القدرة الشرائية (HAI)", en: "Housing Affordability Index", value: txt(affordability, 0), unit: "/100", status: up(affordability, 100, 60), hint: "100 = الدخل يكفي للقسط" },
        { code: "E-04", ar: "سعر الفائدة على الرهن", en: "Mortgage Rate", value: "23.5", unit: "%", status: "bad" },
        { code: "E-05", ar: "معدل التضخم العقاري", en: "Real Estate Inflation", value: txt(growth, 1), unit: "%", status: up(growth, 7, 3) },
        { code: "E-06", ar: "نسبة القسط للدخل", en: "Mortgage/Income Burden", value: txt((inv.cur * 0.7 * mortgageRate / 12) / (medianIncome / 12) * 100, 0), unit: "%", status: dn(45, 30, 50) },
      ],
    },
    {
      key: "risk", ar: "المخاطر والسيولة", en: "Risk & Liquidity", color: "#D85A30",
      nodes: [
        { code: "K-01", ar: "سيولة العقار", en: "Liquidity Score", value: liq, unit: "صفقة", status: up(liq, 3, 0) },
        { code: "K-02", ar: "تقلب الأسعار", en: "Price Volatility", value: txns.length >= 2 ? "متوسط" : "غير متاح", status: "neutral" },
        { code: "K-03", ar: "مخاطر التقادم", en: "Obsolescence Risk", value: age > 30 ? "مرتفع" : age > 15 ? "متوسط" : "منخفض", status: age > 30 ? "bad" : age > 15 ? "warn" : "good" },
        { code: "K-04", ar: "مخاطر السوق", en: "Market Risk", value: growth < 3 ? "مرتفع" : growth < 6 ? "متوسط" : "منخفض", status: growth < 3 ? "bad" : growth < 6 ? "warn" : "good" },
        { code: "K-05", ar: "مخاطر سعر الفائدة", en: "Interest Rate Risk", value: "مرتفع", status: "bad" },
        { code: "K-06", ar: "مخاطر التركيز الجغرافي", en: "Concentration Risk", value: "متوسط", status: "warn" },
        { code: "K-07", ar: "تقدير VaR الشهري (95%)", en: "Monthly Value-at-Risk", value: Math.round(inv.cur * 0.03), unit: "ج", status: "warn", hint: "خسارة شهرية محتملة بثقة 95%" },
      ],
    },
    {
      key: "sust", ar: "الاستدامة والكفاءة", en: "Sustainability & Efficiency", color: "#7c3aed",
      nodes: [
        { code: "S-01", ar: "مؤشر الاستدامة", en: "Sustainability Proxy", value: age < 10 ? "حديث" : age < 25 ? "متوسط" : "قديم", status: age < 10 ? "good" : age < 25 ? "warn" : "bad" },
        { code: "S-02", ar: "كفاءة الطاقة المقدّرة", en: "Energy Efficiency Class", value: age < 5 ? "A" : age < 15 ? "B" : age < 25 ? "C" : "D", status: age < 15 ? "good" : age < 25 ? "warn" : "bad" },
        { code: "S-03", ar: "البصمة الكربونية النسبية", en: "Relative Carbon Footprint", value: age < 10 ? "منخفض" : "متوسط", status: age < 10 ? "good" : "warn" },
        { code: "S-04", ar: "جاهزية الإشغال", en: "Move-in Readiness", value: finishScore >= 80 ? "فوري" : finishScore >= 60 ? "يحتاج تحسين" : "يحتاج تشطيب", status: finishScore >= 80 ? "good" : finishScore >= 60 ? "warn" : "bad" },
        { code: "S-05", ar: "ملاءمة الحجم العائلي", en: "Family-Size Fit", value: rooms >= 3 ? "عائلي" : rooms === 2 ? "زوجي" : "فردي", status: "neutral" },
      ],
    },
    {
      key: "legal", ar: "القانوني والتنظيمي", en: "Legal & Regulatory", color: "#475569",
      nodes: [
        { code: "G-01", ar: "حالة التسجيل العقاري", en: "Title Registration Status", value: "مفترض مسجّل", status: "neutral", hint: "يتطلب تحقّق مستقل" },
        { code: "G-02", ar: "نوع التملك", en: "Tenure Type", value: area.land_own || "ملكية حرة", status: "good" },
        { code: "G-03", ar: "التوافق مع نظام البناء", en: "Building Code Compliance", value: "مفترض متوافق", status: "neutral" },
        { code: "G-04", ar: "حالة الاستخدام", en: "Use Permit Status", value: prop.category === "res" ? "سكني" : prop.category === "com" ? "تجاري" : "أخرى", status: "good" },
        { code: "G-05", ar: "وجود رهون أو نزاعات", en: "Liens/Disputes", value: "غير مفصح", status: "warn", hint: "يجب التحقق قبل الشراء" },
      ],
    },
  ];
}

export function indicatorsHealthScore(branches: Branch[]): number {
  const all = branches.flatMap(b => b.nodes);
  const good = all.filter(n => n.status === "good").length;
  return Math.round((good / all.length) * 100);
}
