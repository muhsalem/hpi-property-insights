// Mortgage finance utilities tailored to the Egyptian market (2026)
// Sources: CBE mortgage initiative, major banks' published rates

export type BankRate = {
  bank: string;
  rate: number; // annual decimal
  maxYears: number;
  maxLTV: number; // 0..1
  minIncome: number; // monthly EGP
  note?: string;
};

export const EG_BANKS_2026: BankRate[] = [
  { bank: "مبادرة البنك المركزي (محدودي الدخل)", rate: 0.08, maxYears: 20, maxLTV: 0.90, minIncome: 4500, note: "دخل ≤ 4.5 ألف فرد / 6 ألف أسرة" },
  { bank: "مبادرة البنك المركزي (متوسط الدخل)", rate: 0.08, maxYears: 20, maxLTV: 0.85, minIncome: 40000, note: "دخل ≤ 40 ألف فرد / 50 ألف أسرة" },
  { bank: "البنك الأهلي المصري (NBE)", rate: 0.245, maxYears: 25, maxLTV: 0.80, minIncome: 8000 },
  { bank: "بنك مصر", rate: 0.245, maxYears: 25, maxLTV: 0.80, minIncome: 8000 },
  { bank: "البنك التجاري الدولي (CIB)", rate: 0.255, maxYears: 20, maxLTV: 0.80, minIncome: 15000 },
  { bank: "البنك العربي الأفريقي (AAIB)", rate: 0.26, maxYears: 20, maxLTV: 0.80, minIncome: 12000 },
  { bank: "بنك الإسكان والتعمير (HDB)", rate: 0.24, maxYears: 25, maxLTV: 0.85, minIncome: 6000 },
  { bank: "QNB الأهلي", rate: 0.255, maxYears: 20, maxLTV: 0.80, minIncome: 15000 },
];

// EMI — equated monthly installment (French amortization)
export function emi(principal: number, annualRate: number, years: number) {
  const r = annualRate / 12;
  const n = years * 12;
  if (r === 0) return principal / n;
  return (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
}

export function amortization(principal: number, annualRate: number, years: number) {
  const r = annualRate / 12;
  const n = years * 12;
  const pay = emi(principal, annualRate, years);
  let balance = principal;
  const rows: { month: number; year: number; payment: number; interest: number; principal: number; balance: number }[] = [];
  for (let m = 1; m <= n; m++) {
    const i = balance * r;
    const p = pay - i;
    balance -= p;
    if (m % 12 === 0 || m === 1 || m === n) {
      rows.push({ month: m, year: Math.ceil(m / 12), payment: pay, interest: i, principal: p, balance: Math.max(0, balance) });
    }
  }
  return { payment: pay, totalInterest: pay * n - principal, totalPaid: pay * n, rows };
}

// Eligibility — DTI ≤ 40% per CBE, LTV per bank, income floor
export function eligibility(opts: {
  price: number;
  downPayment: number;
  monthlyIncome: number;
  rate: number;
  years: number;
  maxLTV: number;
  minIncome: number;
}) {
  const loan = Math.max(0, opts.price - opts.downPayment);
  const ltv = opts.price > 0 ? loan / opts.price : 0;
  const monthly = emi(loan, opts.rate, opts.years);
  const dti = opts.monthlyIncome > 0 ? monthly / opts.monthlyIncome : 1;
  const ltvOk = ltv <= opts.maxLTV;
  const dtiOk = dti <= 0.40; // CBE cap
  const incomeOk = opts.monthlyIncome >= opts.minIncome;
  return {
    loan, ltv, monthly, dti,
    ltvOk, dtiOk, incomeOk,
    eligible: ltvOk && dtiOk && incomeOk,
    maxLoanByDTI: (opts.monthlyIncome * 0.40 * (Math.pow(1 + opts.rate / 12, opts.years * 12) - 1)) / ((opts.rate / 12) * Math.pow(1 + opts.rate / 12, opts.years * 12)),
  };
}

// Egyptian transaction costs (buyer + seller)
export function transactionCosts(price: number, opts?: { commissionRate?: number }) {
  const commission = opts?.commissionRate ?? 0.025; // 2.5% per side (market norm)
  const registrationFee = Math.min(price * 0.025, 100000); // 2.5% capped at 100k EGP
  const transferTax = price * 0.025; // 2.5% real-estate disposition tax
  const bankStudyFee = price * 0.01; // ~1% bank processing
  const lifeInsurance = price * 0.005; // ~0.5% annual avg
  const propertyInsurance = price * 0.002;
  const notaryAndDocs = 5000;
  return {
    buyer: {
      brokerCommission: price * commission,
      registrationFee,
      transferTax,
      bankStudyFee,
      lifeInsurance,
      propertyInsurance,
      notaryAndDocs,
      total: price * commission + registrationFee + transferTax + bankStudyFee + lifeInsurance + propertyInsurance + notaryAndDocs,
    },
    seller: {
      brokerCommission: price * commission,
      capitalGains: 0, // exempt for primary residence in EG
      total: price * commission,
    },
  };
}

// Whether the property legal status is bankable
export function isBankable(legalStatus?: string | null): { bankable: boolean; reason: string } {
  switch (legalStatus) {
    case "registered_ayni": return { bankable: true, reason: "مسجّل عيني — مقبول لدى كل البنوك" };
    case "registered_personal": return { bankable: true, reason: "مسجّل شخصي — مقبول لدى أغلب البنوك" };
    case "court_judgment": return { bankable: true, reason: "حكم محكمة — مقبول مع شروط إضافية" };
    case "reconciled": return { bankable: true, reason: "موفّق وضعه — مقبول بعد تقنين 187/2023" };
    case "possession": return { bankable: false, reason: "وضع يد — غير قابل للتمويل" };
    case "customary": return { bankable: false, reason: "عرفي — غير قابل للتمويل" };
    case "unknown":
    default: return { bankable: false, reason: "حالة غير محددة — مطلوب توثيق قبل التقديم" };
  }
}
