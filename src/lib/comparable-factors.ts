// عوامل تعديل القيمة في طريقة البيع المقارن — منظمة في 7 محاور (64 عاملاً)
// كل عامل له تعديل افتراضي (٪) موجب يرفع القيمة وسالب يخفضها.
// النوع "bi" يعني عامل مزدوج يمكن للمقيّم اختيار اتجاهه.

export type FactorMode = "fixed" | "bi" | "range";
export type Factor = {
  code: string;
  ar: string;
  effect: string;          // وصف الأثر بالعربي
  default: number;         // % افتراضي (موجب أو سالب)
  min?: number;            // للنطاق
  max?: number;
  mode: FactorMode;
};
export type FactorBranch = {
  key: string;
  ar: string;
  color: string;
  factors: Factor[];
};

export const COMPARABLE_FACTORS: FactorBranch[] = [
  {
    key: "loc", ar: "أولاً — عوامل الموقع والمحيط", color: "#185FA5",
    factors: [
      { code: "L01", ar: "القرب من المدارس والجامعات والمستشفيات والمراكز التجارية", effect: "رافع كبير", default: 6, mode: "fixed" },
      { code: "L02", ar: "سهولة الوصول وشبكة الطرق والمواصلات العامة", effect: "رافع كبير", default: 5, mode: "fixed" },
      { code: "L03", ar: "سمعة الحي ومستوى السكان والأمان", effect: "رافع كبير", default: 7, mode: "fixed" },
      { code: "L04", ar: "مشاريع تنمية مستقبلية مخططة في المنطقة", effect: "رافع مستقبلي", default: 4, mode: "fixed" },
      { code: "L05", ar: "إطلالة على بحر أو نيل أو حديقة عامة", effect: "رافع كبير جداً", default: 10, mode: "range", min: 5, max: 15 },
      { code: "L06", ar: "القرب من المناطق التجارية والأسواق", effect: "رافع تجاري / خافض سكني", default: 3, mode: "bi" },
      { code: "L07", ar: "الكثافة السكانية في المنطقة", effect: "مزدوج", default: 0, mode: "bi" },
      { code: "L08", ar: "القرب من مقابر أو مصانع أو مناطق صناعية", effect: "خافض", default: -8, mode: "fixed" },
      { code: "L09", ar: "مناطق منخفضة معرضة للغرق أو الفيضان", effect: "خافض كبير", default: -12, mode: "fixed" },
      { code: "L10", ar: "التلوث البيئي والضوضاء وخطوط الضغط العالي", effect: "خافض", default: -7, mode: "fixed" },
      { code: "L11", ar: "تصنيف المنطقة في المخطط العمراني (راقي/متوسط/شعبي)", effect: "رافع هيكلي", default: 5, mode: "bi" },
      { code: "L12", ar: "المناطق العشوائية أو غير الرسمية المجاورة", effect: "خافض", default: -6, mode: "fixed" },
    ],
  },
  {
    key: "bld", ar: "ثانياً — عوامل المبنى والوحدة", color: "#1D9E75",
    factors: [
      { code: "B01", ar: "الدور — أرضي / وسط / أخير", effect: "الأوسط الأفضل عموماً", default: 0, mode: "bi" },
      { code: "B02", ar: "المساحة الإجمالية الصافية (صالحة للاستخدام)", effect: "رافع أساسي", default: 3, mode: "fixed" },
      { code: "B03", ar: "جودة التوزيع الداخلي ومنطقية التقسيم", effect: "رافع", default: 3, mode: "fixed" },
      { code: "B04", ar: "قِدَم المبنى وعمره الإنشائي", effect: "خافض تدريجي", default: -5, mode: "range", min: -15, max: 0 },
      { code: "B05", ar: "جودة مواد البناء (خرسانة — حديد)", effect: "رافع هيكلي", default: 5, mode: "fixed" },
      { code: "B06", ar: "مستوى التشطيب (خام/بسيط/لوكس/سوبر لوكس)", effect: "رافع 20–40٪", default: 25, mode: "range", min: 0, max: 40 },
      { code: "B07", ar: "وجود مصعد وصيانته", effect: "ضروري فوق الدور الثالث", default: 4, mode: "fixed" },
      { code: "B08", ar: "التوجيه (شمالي/جنوبي) والإضاءة الطبيعية", effect: "رافع", default: 3, mode: "fixed" },
      { code: "B09", ar: "وجود بلكونة أو تراس أو حديقة خاصة", effect: "رافع", default: 4, mode: "fixed" },
      { code: "B10", ar: "عدد الحمامات نسبة للغرف", effect: "رافع عند الاتساق", default: 2, mode: "fixed" },
      { code: "B11", ar: "وجود رطوبة أو تشققات أو عيوب إنشائية", effect: "خافض كبير", default: -10, mode: "range", min: -20, max: -5 },
      { code: "B12", ar: "جراج أو موقف سيارة خاص أو مشترك", effect: "رافع في المدن الكبرى", default: 3, mode: "fixed" },
      { code: "B13", ar: "منظومة الأمن والحراسة في المبنى", effect: "رافع أمني", default: 4, mode: "fixed" },
      { code: "B14", ar: "وجود مخالفات بنائية أو دور مخالف", effect: "خافض وخطر قانوني", default: -8, mode: "fixed" },
    ],
  },
  {
    key: "leg", ar: "ثالثاً — عوامل قانونية وتوثيقية", color: "#475569",
    factors: [
      { code: "G01", ar: "سند ملكية موثق بالشهر العقاري", effect: "رافع كبير", default: 8, mode: "fixed" },
      { code: "G02", ar: "عقد إيجار قديم ممتد للورثة", effect: "خافض 30–70٪", default: -40, mode: "range", min: -70, max: -30 },
      { code: "G03", ar: "حجز قضائي أو رهن بنكي قائم", effect: "خافض — يعطّل التصرف", default: -15, mode: "fixed" },
      { code: "G04", ar: "استيفاء قيمة الجمعية / الحصة العقارية", effect: "رافع", default: 3, mode: "fixed" },
      { code: "G05", ar: "ترخيص بناء ساري ومطابق للواقع", effect: "رافع قانوني", default: 5, mode: "fixed" },
      { code: "G06", ar: "نزاع إرثي أو شراكة خلافية في الملكية", effect: "خافض — يُجمّد السيولة", default: -12, mode: "fixed" },
      { code: "G07", ar: "تعدد الملاك وتوزع الحصص (شيوع)", effect: "خافض وعائق للبيع", default: -7, mode: "fixed" },
      { code: "G08", ar: "التسجيل في السجل العيني حيثما يوجد", effect: "رافع للثقة", default: 5, mode: "fixed" },
      { code: "G09", ar: "طبيعة الأرض (ملك حر/أميرية/وقف/انتفاع)", effect: "يعتمد على نوع الحق", default: 0, mode: "bi" },
      { code: "G10", ar: "عقد ابتدائي غير موثق فقط (دون شهر)", effect: "خافض للثقة والسيولة", default: -8, mode: "fixed" },
    ],
  },
  {
    key: "inf", ar: "رابعاً — عوامل المرافق والبنية التحتية", color: "#0EA5E9",
    factors: [
      { code: "I01", ar: "توصيل الغاز الطبيعي داخل الوحدة", effect: "رافع", default: 2, mode: "fixed" },
      { code: "I02", ar: "شبكة صرف صحي وكهرباء ومياه سليمة", effect: "رافع أساسي", default: 4, mode: "fixed" },
      { code: "I03", ar: "انقطاع مزمن للمياه أو الكهرباء", effect: "خافض", default: -6, mode: "fixed" },
      { code: "I04", ar: "شبكة إنترنت فائق السرعة متاحة", effect: "رافع متزايد الأهمية", default: 3, mode: "fixed" },
      { code: "I05", ar: "نظام ضخ المياه وخزانات السطح وصيانتها", effect: "مزدوج حسب الصيانة", default: 0, mode: "bi" },
      { code: "I06", ar: "شبكة صرف قديمة أو عرضة للانسداد", effect: "خافض", default: -4, mode: "fixed" },
      { code: "I07", ar: "حديقة أو مساحات خضراء مشتركة مصانة", effect: "رافع", default: 3, mode: "fixed" },
    ],
  },
  {
    key: "mkt", ar: "خامساً — عوامل السوق والاقتصاد الكلي", color: "#8B5CF6",
    factors: [
      { code: "M01", ar: "معدل التضخم وتآكل قيمة الجنيه", effect: "رافع اسمي تاريخياً", default: 3, mode: "fixed" },
      { code: "M02", ar: "مستوى أسعار الفائدة وتكلفة التمويل", effect: "يرفع الطلب عند انخفاضها", default: 0, mode: "bi" },
      { code: "M03", ar: "ميزان العرض والطلب في المنطقة", effect: "محرك السوق الأساسي", default: 0, mode: "bi" },
      { code: "M04", ar: "توقيت البيع (موجة صاعدة/هابطة)", effect: "مزدوج حسب الظرف", default: 0, mode: "bi" },
      { code: "M05", ar: "مشاريع الدولة الكبرى القريبة (محاور/مطارات)", effect: "رافع مستقبلي", default: 6, mode: "fixed" },
      { code: "M06", ar: "ركود اقتصادي وانكماش القوة الشرائية", effect: "خافض للطلب", default: -5, mode: "fixed" },
      { code: "M07", ar: "تحويلات المغتربين والطلب بالعملة الأجنبية", effect: "رافع في مناطق محددة", default: 3, mode: "fixed" },
      { code: "M08", ar: "زيادة المعروض من وحدات مماثلة", effect: "خافض تنافسي", default: -4, mode: "fixed" },
    ],
  },
  {
    key: "inv", ar: "سادساً — عوامل الاستخدام والعائد الاستثماري", color: "#EF9F27",
    factors: [
      { code: "V01", ar: "إمكانية الاستخدام المزدوج (سكني + إداري)", effect: "رافع للمرونة", default: 5, mode: "fixed" },
      { code: "V02", ar: "نسبة العائد الإيجاري السنوي (Yield)", effect: "أساسي في التقييم الاستثماري", default: 4, mode: "range", min: 0, max: 10 },
      { code: "V03", ar: "إمكانية تقسيم الوحدة أو إضافة وحدات", effect: "رافع للوحدات الكبيرة", default: 4, mode: "fixed" },
      { code: "V04", ar: "وجود محلات تجارية بالدور الأرضي", effect: "رافع للمبنى / خافض للسكني المباشر", default: 3, mode: "bi" },
      { code: "V05", ar: "ارتفاع معدل الإشغال في المنطقة (Occupancy)", effect: "مؤشر طلب قوي", default: 4, mode: "fixed" },
      { code: "V06", ar: "القرب من مناطق سياحية أو ساحلية", effect: "رافع في المناطق المؤهلة", default: 6, mode: "fixed" },
      { code: "V07", ar: "العقار مُعلَن منذ فترة طويلة دون بيع", effect: "إشارة ضغط هبوطي", default: -5, mode: "fixed" },
    ],
  },
  {
    key: "egy", ar: "سابعاً — عوامل خاصة بالسوق المصري", color: "#D85A30",
    factors: [
      { code: "E01", ar: "طبيعة المبنى (حكومي/تعاوني/خاص/كمبوند)", effect: "يحدد السقف السعري", default: 5, mode: "bi" },
      { code: "E02", ar: "التصالح في مخالفات البناء وفق القانون", effect: "رافع لقيمة المخالفات المُصالَح عليها", default: 4, mode: "fixed" },
      { code: "E03", ar: "القرب من المناطق الحرة والاقتصادية (بورسعيد/السويس)", effect: "رافع متخصص", default: 6, mode: "fixed" },
      { code: "E04", ar: "المجاورة لمشاريع الإسكان الاجتماعي أو العشوائيات", effect: "خافض في الغالب", default: -5, mode: "fixed" },
      { code: "E05", ar: "تهديد نزع الملكية للمنفعة العامة", effect: "خافض حاد وفوري", default: -15, mode: "fixed" },
      { code: "E06", ar: "متأخرات ضريبية أو رسوم تنظيمية مستحقة", effect: "خافض وعبء قانوني", default: -6, mode: "fixed" },
    ],
  },
];

export type FactorState = { enabled: boolean; value: number };
export type FactorsStateMap = Record<string, FactorState>;

export function defaultFactorsState(): FactorsStateMap {
  const m: FactorsStateMap = {};
  COMPARABLE_FACTORS.forEach(b => b.factors.forEach(f => {
    m[f.code] = { enabled: false, value: f.default };
  }));
  return m;
}

export function totalFactorsAdjustmentPct(state: FactorsStateMap): number {
  // المجموع كنسبة مئوية (تطبق بأسلوب مضاعف: قيمة معدّلة = قيمة × (1 + مجموع/100))
  // مع cap ±60٪ لتجنّب التشوّه عند تراكم عدد كبير من العوامل.
  let sum = 0;
  Object.values(state).forEach(s => { if (s.enabled) sum += Number(s.value) || 0; });
  return Math.max(-60, Math.min(60, sum));
}
