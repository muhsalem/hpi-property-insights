// مرجع الشهر العقاري والسجل العيني — محافظة بورسعيد
// يُستخدم في تقييم المخاطر القانونية وحساب رسوم التسجيل والضرائب العقارية.

export type LegalStatus =
  | "registered_ayni"      // مسجل بالسجل العيني (ق. 142/1964)
  | "registered_personal"  // مسجل بالشهر الشخصي (ق. 114/1946)
  | "primary_contract"     // عقد ابتدائي + إيصال أمانة
  | "court_judgment"       // حكم صحة ونفاذ نهائي
  | "possession"           // وضع يد موثق (≥ 15 سنة)
  | "customary"            // عقد عرفي
  | "unknown";             // غير محدد

export type LegalStatusInfo = {
  key: LegalStatus;
  label: string;
  discount: number;        // معامل الخصم القانوني (×)
  riskPremium: number;     // علاوة المخاطر % (تُضاف لمعدل الخصم)
  description: string;
  recommendation: string;
};

export const LEGAL_STATUS_MAP: Record<LegalStatus, LegalStatusInfo> = {
  registered_ayni: {
    key: "registered_ayni",
    label: "مسجل — سجل عيني",
    discount: 1.0,
    riskPremium: 0,
    description: "أعلى درجات الأمان القانوني — حجية مطلقة، لا يقبل الطعن إلا بالتزوير.",
    recommendation: "يصلح كضمانة بنكية من الدرجة الأولى. لا حاجة لخصم قيمة.",
  },
  registered_personal: {
    key: "registered_personal",
    label: "مسجل — شهر شخصي",
    discount: 0.95,
    riskPremium: 0.5,
    description: "حجية تجاه الغير لكن يحتاج تتبع سلسلة الملكية 15 سنة.",
    recommendation: "اطلب شهادة عقارية حديثة (5 سنوات) قبل اعتماد القيمة الكاملة.",
  },
  primary_contract: {
    key: "primary_contract",
    label: "عقد ابتدائي",
    discount: 0.85,
    riskPremium: 2.0,
    description: "غير حجة على الغير — مخاطرة بيع مزدوج أو تأخر شهر العقد.",
    recommendation: "اخصم 15% وأضف 2% علاوة مخاطر. تحقق من شهادة عدم تصرف.",
  },
  court_judgment: {
    key: "court_judgment",
    label: "حكم صحة ونفاذ نهائي",
    discount: 0.90,
    riskPremium: 1.0,
    description: "أقوى من الابتدائي — جاهز للشهر لكن لم يُشهر بعد.",
    recommendation: "تأكد من صيرورة الحكم نهائياً + عدم وجود طعن بالنقض.",
  },
  possession: {
    key: "possession",
    label: "وضع يد موثق (≥ 15 سنة)",
    discount: 0.70,
    riskPremium: 3.5,
    description: "قابل لاكتساب الملكية بالتقادم لكن يحتاج حكم قضائي للتسجيل.",
    recommendation: "اخصم 30% — لا يُقبل ضمانة بنكية. التقييم لأغراض البيع فقط.",
  },
  customary: {
    key: "customary",
    label: "عقد عرفي غير مسجل",
    discount: 0.65,
    riskPremium: 4.0,
    description: "لا حجية قانونية — مجرد التزام شخصي بين أطرافه.",
    recommendation: "خصم 35% — يُنصح ببدء إجراءات صحة ونفاذ قبل أي تصرف.",
  },
  unknown: {
    key: "unknown",
    label: "غير محدد",
    discount: 0.80,
    riskPremium: 2.5,
    description: "لم يتم التحقق من الوضع القانوني — خصم احتياطي.",
    recommendation: "أوقف التقييم حتى التحقق من سند الملكية ونوع التسجيل.",
  },
};

// ============ حاسبة رسوم التسجيل والضرائب العقارية ============
// مرجع: قانون الشهر العقاري 114/1946، قانون الضريبة العقارية 196/2008،
// قانون التصرفات العقارية 91/2005 وتعديلاته، قانون التصالح 187/2023.

export type RegistrationFees = {
  registrationFee: number;       // رسم الشهر (2.5% بحد أقصى)
  documentationFee: number;      // رسوم توثيق إضافية
  transferTax: number;           // ضريبة التصرفات (2.5%)
  realEstateTax: number;         // الضريبة العقارية السنوية (10% من القيمة الإيجارية)
  totalOneTime: number;          // الإجمالي لمرة واحدة
  annualBurden: number;          // العبء السنوي
  notes: string[];
};

export function calcRegistrationFees(
  price: number,
  annualRentalValue: number,
  isCommercial = false,
): RegistrationFees {
  // رسم الشهر: 2.5% بحد أقصى 100,000 ج (تعديل 2023)
  const registrationFee = Math.min(price * 0.025, 100_000);

  // رسوم توثيق: ~ 500 ج إيداع + 0.1% (تقديري)
  const documentationFee = 500 + price * 0.001;

  // ضريبة التصرفات: 2.5% — تخصم من البائع
  const transferTax = price * 0.025;

  // الإعفاء من الضريبة العقارية:
  // - سكني: حتى 24,000 ج/سنة (قيمة إيجارية = 2,000 ج/شهر)
  // - تجاري: لا إعفاء
  const exemption = isCommercial ? 0 : 24_000;
  const taxableRental = Math.max(0, annualRentalValue - exemption);
  const realEstateTax = taxableRental * 0.10;

  return {
    registrationFee,
    documentationFee,
    transferTax,
    realEstateTax,
    totalOneTime: registrationFee + documentationFee + transferTax,
    annualBurden: realEstateTax,
    notes: [
      "رسم الشهر بحد أقصى 100 ألف ج وفق التعديل المعمول به.",
      "ضريبة التصرفات (2.5%) من التزامات البائع.",
      isCommercial
        ? "العقار التجاري لا يتمتع بالإعفاء البالغ 24 ألف ج/سنة."
        : "تم تطبيق الإعفاء السكني (24 ألف ج من القيمة الإيجارية السنوية).",
      "بورسعيد منطقة حرة منذ 1976 — راجع المعاملة الجمركية للعقارات التجارية والمخازن.",
    ],
  };
}

// ============ مأموريات الشهر العقاري بمحافظة بورسعيد ============
export type RegistrationOffice = {
  name: string;
  scope: string;        // الأحياء التي تخدمها
  address?: string;
  type: "ayni" | "personal";
};

export const PORT_SAID_REGISTRATION_OFFICES: RegistrationOffice[] = [
  {
    name: "مأمورية شهر عقاري بورسعيد",
    scope: "أحياء: الشرق، العرب، المناخ",
    address: "حي العرب — شارع الجمهورية",
    type: "personal",
  },
  {
    name: "مأمورية شهر عقاري الزهور",
    scope: "أحياء: الزهور، غرب، الضواحي",
    address: "حي الزهور — منطقة الإدارات",
    type: "personal",
  },
  {
    name: "مأمورية شهر عقاري بورفؤاد",
    scope: "مدينة بورفؤاد + حي الجنوب",
    address: "بورفؤاد — قرب ديوان المدينة",
    type: "personal",
  },
  {
    name: "مكتب السجل العيني (تجريبي)",
    scope: "بعض مناطق الضواحي والزهور الجديدة",
    address: "وفق قرار المحافظ — نطاق محدود",
    type: "ayni",
  },
];

// ============ المستندات المطلوبة للتسجيل ============
export const REQUIRED_DOCS = [
  { name: "سند الملكية الأصلي (عقد البائع)", critical: true },
  { name: "شهادة عقارية حديثة (5 سنوات أو 15 سنة)", critical: true },
  { name: "إعلام وراثة (في حالة الورثة)", critical: false },
  { name: "صورة بطاقات الرقم القومي للأطراف", critical: true },
  { name: "كشف ضرائب عقارية + إيصال سداد", critical: true },
  { name: "رخصة البناء + شهادة الصلاحية", critical: true },
  { name: "رسم مساحي معتمد (للأراضي والفيلات)", critical: true },
  { name: "شهادة من الوحدة المحلية بعدم وجود مخالفات/تصالح", critical: true },
  { name: "شهادة براءة ذمة من اتحاد الشاغلين (للشقق)", critical: false },
  { name: "صورة كروكية موقع العقار", critical: false },
];

// ============ تطبيق الخصم القانوني على القيمة السوقية ============
export function applyLegalDiscount(marketValue: number, status: LegalStatus): {
  legalValue: number;
  discountPct: number;
  info: LegalStatusInfo;
} {
  const info = LEGAL_STATUS_MAP[status];
  const legalValue = marketValue * info.discount;
  return {
    legalValue,
    discountPct: (1 - info.discount) * 100,
    info,
  };
}
