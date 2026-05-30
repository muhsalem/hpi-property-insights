// Islamic (Sharia-compliant) real-estate finance — Egypt 2026
// Main contracts: Murabaha, Ijara Muntahia Bittamleek, Musharaka Mutanaqisa, Istisna'a
// Regulator: Egyptian Financial Regulatory Authority (FRA) + CBE Sharia advisory

export type IslamicBank = {
  bank: string;
  product: "murabaha" | "ijara" | "musharaka" | "istisna";
  productAr: string;
  profitRate: number; // murabaha markup or ijara rental yield (annualized)
  maxYears: number;
  maxFinanceRatio: number; // analogous to LTV — bank's ownership share financed
  minIncome: number;
  note?: string;
};

export const EG_ISLAMIC_BANKS_2026: IslamicBank[] = [
  { bank: "بنك فيصل الإسلامي المصري", product: "murabaha", productAr: "مرابحة", profitRate: 0.235, maxYears: 20, maxFinanceRatio: 0.80, minIncome: 6000, note: "أقدم بنك إسلامي في مصر (1977)" },
  { bank: "بنك فيصل الإسلامي المصري", product: "ijara", productAr: "إجارة منتهية بالتمليك", profitRate: 0.225, maxYears: 25, maxFinanceRatio: 0.85, minIncome: 6000 },
  { bank: "مصرف أبوظبي الإسلامي – مصر (ADIB)", product: "murabaha", productAr: "مرابحة", profitRate: 0.24, maxYears: 20, maxFinanceRatio: 0.80, minIncome: 10000 },
  { bank: "مصرف أبوظبي الإسلامي – مصر (ADIB)", product: "ijara", productAr: "إجارة منتهية بالتمليك", profitRate: 0.23, maxYears: 25, maxFinanceRatio: 0.85, minIncome: 10000 },
  { bank: "بنك البركة مصر", product: "murabaha", productAr: "مرابحة", profitRate: 0.245, maxYears: 20, maxFinanceRatio: 0.80, minIncome: 7000 },
  { bank: "بنك البركة مصر", product: "musharaka", productAr: "مشاركة متناقصة", profitRate: 0.22, maxYears: 25, maxFinanceRatio: 0.90, minIncome: 8000, note: "ملكية مشتركة تتناقص حصة البنك" },
  { bank: "بنك مصر – فرع المعاملات الإسلامية", product: "murabaha", productAr: "مرابحة", profitRate: 0.245, maxYears: 20, maxFinanceRatio: 0.80, minIncome: 6000 },
  { bank: "البنك الأهلي المصري – الفروع الإسلامية", product: "murabaha", productAr: "مرابحة", profitRate: 0.245, maxYears: 20, maxFinanceRatio: 0.80, minIncome: 6000 },
  { bank: "البنك الكويتي الوطني – مصر (NBK)", product: "ijara", productAr: "إجارة منتهية بالتمليك", profitRate: 0.235, maxYears: 25, maxFinanceRatio: 0.85, minIncome: 12000 },
  { bank: "مبادرة البنك المركزي – النافذة الإسلامية", product: "murabaha", productAr: "مرابحة", profitRate: 0.08, maxYears: 20, maxFinanceRatio: 0.85, minIncome: 4500, note: "للسكن الاجتماعي ومحدودي الدخل" },
];

// ===== Contract structures =====

// Murabaha (Cost-plus sale): bank buys the property and resells to client at cost + agreed profit margin
// Total = cost × (1 + r × n) [simple] OR similar to fixed-rate amortizing loan (most common in EG)
export function murabaha(opts: { cost: number; downPayment: number; profitRate: number; years: number }) {
  const principal = opts.cost - opts.downPayment;
  const r = opts.profitRate / 12;
  const n = opts.years * 12;
  const monthly = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPaid = monthly * n;
  const totalProfit = totalPaid - principal;
  const sellingPrice = principal + totalProfit; // bank's resale price to client (fixed)
  return {
    principal,
    monthly,
    totalPaid,
    totalProfit,
    sellingPrice,
    profitMarkup: principal > 0 ? totalProfit / principal : 0,
  };
}

// Ijara Muntahia Bittamleek (Lease-to-own): bank owns, leases to client, ownership transfers at end
// Monthly = rental component + acquisition component
export function ijara(opts: { propertyValue: number; downPayment: number; rentalYield: number; years: number }) {
  const bankShare = opts.propertyValue - opts.downPayment;
  const r = opts.rentalYield / 12;
  const n = opts.years * 12;
  // Combined rental + principal repayment, structured like amortizing payment
  const monthly = r === 0 ? bankShare / n : (bankShare * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const rentalPortion = bankShare * r; // first-month rental
  const acquisitionPortion = monthly - rentalPortion;
  return {
    bankShare,
    monthly,
    firstRental: rentalPortion,
    firstAcquisition: acquisitionPortion,
    totalPaid: monthly * n,
    totalRental: monthly * n - bankShare,
  };
}

// Musharaka Mutanaqisa (Diminishing partnership): client + bank jointly own; client buys bank's share gradually
// Client pays rent on bank's remaining share + buys a portion each period
export function musharaka(opts: { propertyValue: number; clientShare: number; profitRate: number; years: number }) {
  const bankShare = opts.propertyValue - opts.clientShare;
  const n = opts.years * 12;
  const acquisitionPerMonth = bankShare / n;
  let remainingBankShare = bankShare;
  let totalRent = 0;
  const r = opts.profitRate / 12;
  const rows: { year: number; bankShareEnd: number; rentForYear: number; acquisitionForYear: number }[] = [];
  for (let y = 1; y <= opts.years; y++) {
    let rentY = 0;
    let acqY = 0;
    for (let m = 1; m <= 12; m++) {
      const rent = remainingBankShare * r;
      rentY += rent; acqY += acquisitionPerMonth;
      totalRent += rent;
      remainingBankShare -= acquisitionPerMonth;
    }
    rows.push({ year: y, bankShareEnd: Math.max(0, remainingBankShare), rentForYear: rentY, acquisitionForYear: acqY });
  }
  const firstMonthlyRent = bankShare * r;
  return {
    bankShare,
    acquisitionPerMonth,
    firstMonthlyPayment: firstMonthlyRent + acquisitionPerMonth,
    lastMonthlyPayment: acquisitionPerMonth, // rent → 0 at end
    totalRent,
    totalPaid: totalRent + bankShare,
    rows,
  };
}

// Sharia compliance & comparison notes
export const SHARIA_NOTES = {
  prohibitions: [
    "الربا (الفائدة) — يستبدل بهامش ربح ثابت أو إيجار",
    "الغرر (الجهالة المؤدية للنزاع) — يلزم تحديد السلعة والثمن بدقة",
    "الميسر (المقامرة والمخاطرة المفرطة)",
    "تمويل أنشطة محرّمة شرعاً",
  ],
  advantages: [
    "هامش الربح ثابت طوال العقد (لا يتأثر بتقلبات أسعار الفائدة)",
    "لا غرامات تأخير مرتفعة — التأخير يذهب لصندوق خيري في أغلب البنوك",
    "ملكية حقيقية للعقار خلال فترة الإجارة (في الإجارة والمشاركة)",
    "هيئة رقابة شرعية مستقلة في كل بنك",
  ],
  risks: [
    "هامش الربح في المرابحة غالباً أعلى قليلاً من الفائدة التقليدية لتعويض المخاطر",
    "في الإجارة: التأمين والصيانة الكبرى من مسؤولية البنك (مالك)، لكنها تُحمَّل ضمن الأقساط",
    "في المشاركة المتناقصة: الإيجار يُعاد تسعيره دورياً وفق سعر السوق (مخاطر إعادة التسعير)",
  ],
  fatwa: "معتمد من المجمع الفقهي الإسلامي ودار الإفتاء المصرية + AAOIFI (هيئة المحاسبة الإسلامية)",
};

// Egypt Islamic banking market share (CBE Q4 2025 ≈ 5-6% of total banking assets)
export const EG_ISLAMIC_MARKET = {
  assetShare: 0.055, // ~5.5% of total banking assets
  totalAssetsEGP: 920_000_000_000, // ~920 billion EGP Islamic banking assets
  growthYoY: 0.28, // 28% YoY growth — fastest growing segment
  banksCount: 14, // dedicated + Islamic branches
  marketLeaders: ["فيصل الإسلامي", "أبوظبي الإسلامي – مصر", "بركة مصر"],
};
