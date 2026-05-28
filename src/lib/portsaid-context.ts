// مرجع التقييم العقاري — التقسيم الإداري لمحافظة بورسعيد (CAPMAS 2023)
// مستخدم لإثراء تحليل البيع المقارن واختيار النطاق الجغرافي للمثيلات.

export type DistrictProfile = {
  name: string;
  founded?: string;
  population?: number;       // تقدير CAPMAS يناير 2023
  dominantUse: "سكني راقي" | "سكني" | "سكني + صناعي" | "تجاري/سياحي" | "تجاري تقليدي" | "مختلط" | "ناشئ";
  premiumPct: number;        // علاوة موقعية نسبية (٪) — تُضاف لمعامل الموقع
  notes: string;
};

export const PORT_SAID_DISTRICTS: Record<string, DistrictProfile> = {
  "الشرق":   { name: "حي الشرق",   founded: "1880", dominantUse: "تجاري/سياحي", premiumPct: 12, notes: "أقدم الأحياء — النواة التاريخية (الحي الإفرنجي)، قيمة العقار مدفوعة بالاستخدام التجاري." },
  "العرب":   { name: "حي العرب",   founded: "1890", dominantUse: "تجاري تقليدي", premiumPct: 4,  notes: "أسواق وشوارع تجارية قديمة — قيمة الطوابق الأرضية تفوق السكنية." },
  "المناخ":  { name: "حي المناخ",  founded: "1952", dominantUse: "مختلط",        premiumPct: 6,  notes: "يجمع القديم والامتداد العمراني الحديث — يستوجب اجتهاد المقيّم." },
  "الضواحي": { name: "حي الضواحي", founded: "حديث", dominantUse: "سكني + صناعي", premiumPct: -3, notes: "خصم نوعية الجوار للعقارات الملاصقة للمنطقة الصناعية." },
  "الزهور":  { name: "حي الزهور",  founded: "2000", dominantUse: "سكني راقي",    premiumPct: 15, notes: "أعلى أسعار الوحدة السكنية بالمحافظة — أكبر كتلة سكانية (~34٪)." },
  "الجنوب":  { name: "حي الجنوب",  founded: "2002", dominantUse: "ناشئ",         premiumPct: -2, notes: "أقصى جنوب المدينة على بحيرة المنزلة — سوق ناشئ." },
  "الغرب":   { name: "حي الغرب",   founded: "2015", dominantUse: "ناشئ",         premiumPct: 2,  notes: "الأحدث — فُصل عن حي الزهور — قاعدة بيانات قيد التكوين." },
  "بورفؤاد": { name: "مدينة بورفؤاد", founded: "2010", dominantUse: "سكني",      premiumPct: 5,  notes: "الجانب الآسيوي عبر القناة — مدينة مستقلة منذ 2010." },
};

// قواعد بورسعيد الخاصة (تنطبق على كل العقارات بالمحافظة)
export const PORT_SAID_RULES = {
  freeZoneSince: 1976,
  seafrontPremiumMin: 15,   // ٪
  seafrontPremiumMax: 40,   // ٪
  note: "محافظة بورسعيد منطقة حرة منذ 1976 — يؤثر على القيمة الإيجارية والاستثمارية للعقارات التجارية والمخازن.",
};

export function findDistrictProfile(name?: string | null): DistrictProfile | null {
  if (!name) return null;
  for (const k of Object.keys(PORT_SAID_DISTRICTS)) {
    if (name.includes(k)) return PORT_SAID_DISTRICTS[k];
  }
  return null;
}
