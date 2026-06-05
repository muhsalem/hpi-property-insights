# خطة تنفيذ التوصيات الكاملة

نطاق ضخم — سأنفذه على **6 مراحل متتالية** في رسائل متعاقبة، كل مرحلة قابلة للاستخدام بمفردها. أبدأ بعد موافقتك.

---

## المرحلة 1 — طبقة الحفظ (Persistence) ⭐ الأهم
- إنشاء `src/lib/valuation.functions.ts` يضم:
  - `saveValuationDraft` — UPSERT في `valuations` مع `subject_snapshot` jsonb
  - `loadValuation` — قراءة بحسب id
  - `signValuation` — قفل + توقيع + SHA hash
  - `listMyValuations` — قائمة تقييمات المثمّن
- جميعها محمية بـ `requireSupabaseAuth`
- Context provider `ValuationStateProvider` يلف صفحة `/valuate` ويوفر `state` + `update(path, value)` + autosave كل 5 ثوانٍ (debounced)
- ربط كل المكونات الـ 12 (DCF, HBU, ESG, Reconciliation, Adjustment Grid…) بالـ context بدلاً من `useState` المحلي

## المرحلة 2 — Wizard موحّد (Tabs/Stepper)
- مكوّن `ValuationStepper` بـ 5 خطوات:
  1. **Subject** — Wizard الأساسي + HBU
  2. **Approaches** — Adjustment Grid + DCF + Sensitivity
  3. **Reconciliation** — مصفوفة التوفيق
  4. **Risk & ESG** — Forced Sale + Insurance + ESG + Monte Carlo
  5. **Declaration & PDF** — الإقرار + توليد PDF + توقيع
- شريط تقدم + Validation لكل خطوة قبل الانتقال

## المرحلة 3 — PDF v2 احترافي
- تحديث `src/lib/pdf-report.ts` ليضم:
  - Executive Summary (صفحة أولى)
  - كل المكونات الجديدة (Reconciliation, HBU, DCF, ESG, Monte Carlo)
  - صفحة الإقرار + التوقيع + QR Code (رابط التحقق) + SHA hash
  - Header/Footer مع شعار + ترقيم
- QR يحوي `/verify/{valuationId}` (route عام للتحقق)

## المرحلة 4 — Lock & Sign Flow في UI
- زر **"توقيع وقفل التقرير"** في خطوة Declaration
- Dialog تأكيد → استدعاء `signValuation` serverFn → trigger DB يمنع التعديل لاحقاً
- شارة "موقّع/مقفل" + إخفاء أزرار التحرير
- صفحة `/verify/$id` عامة تعرض ملخص + hash للتحقق من الـ QR

## المرحلة 5 — Zod Validation شاملة
- `src/lib/valuation.schemas.ts` يضم schemas لكل قسم (subject, comps, dcf, esg…)
- حدود: مساحة 1-100000، نسب 0-100، أوزان مجموعها = 100
- رسائل خطأ عربية + عرض inline تحت كل حقل غير صالح
- تطبيق على client (قبل الإرسال) + server (في `inputValidator` لكل serverFn)

## المرحلة 6 — Unit Tests للحسابات المالية
- `vitest` configured (موجود مسبقاً غالباً)
- اختبارات في `src/lib/__tests__/`:
  - `valuation.test.ts` — IRR (مقارنة بقيم Excel)، NPV، Gordon Growth
  - `monte-carlo.test.ts` — توزيع طبيعي + statistical bounds
  - `comparable.test.ts` — وزن مقلوب للتعديلات
  - `reconciliation.test.ts` — مجموع أوزان + قيمة نهائية
- ~30 test case تغطي edge cases (cap=growth، NOI سالب، إلخ)

---

## ملاحظات تنفيذية

- **الترتيب إلزامي**: المرحلة 1 شرط لكل ما بعدها (لا معنى لـ Lock بدون Save).
- **حجم كل مرحلة**: 2-5 ملفات جديدة + تعديلات على `/valuate`.
- **لا تغييرات في DB**: الجداول الحالية كافية (`valuations.subject_snapshot` jsonb مرن).
- **بعد كل مرحلة**: ملخص قصير + التالي تلقائياً ما لم توقفني.

هل أبدأ بالمرحلة 1 فوراً؟
