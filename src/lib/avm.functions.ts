import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const AvmInput = z.object({
  area_sqm: z.number().min(20).max(2000),
  rooms: z.number().min(0).max(20),
  baths: z.number().min(0).max(10),
  floor: z.number().min(-2).max(50).optional(),
  year_built: z.number().min(1900).max(2030).optional(),
  finish: z.string().max(50).optional(),
  type_label: z.string().max(100),
  district_name: z.string().max(100),
  base_price_per_sqm: z.number().min(100).max(500000),
  comparables: z.array(z.object({
    price: z.number(),
    area_sqm: z.number(),
    district: z.string().optional(),
  })).max(20).optional(),
});

/**
 * AVM (Automated Valuation Model) - يستخدم Lovable AI لتقييم العقار
 * بناءً على المواصفات والمقارنات السوقية
 */
export const estimateAvm = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AvmInput.parse(input))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      return { success: false, error: "LOVABLE_API_KEY not configured" };
    }

    const compsText = data.comparables?.length
      ? data.comparables.map((c, i) => `${i + 1}) ${c.area_sqm}م² بسعر ${c.price.toLocaleString()} ج.م${c.district ? ` (${c.district})` : ""}`).join("\n")
      : "لا توجد صفقات مقارنة متاحة";

    const prompt = `أنت خبير تقييم عقاري معتمد في مصر (RICS + إيجبس). قيّم العقار التالي في بورسعيد:

🏠 المواصفات:
- النوع: ${data.type_label}
- المساحة: ${data.area_sqm} م²
- الغرف: ${data.rooms} | الحمامات: ${data.baths}
- الدور: ${data.floor ?? "غير محدد"} | سنة البناء: ${data.year_built ?? "غير محدد"}
- التشطيب: ${data.finish ?? "غير محدد"}
- الحي: ${data.district_name}
- سعر المتر الأساسي للحي: ${data.base_price_per_sqm.toLocaleString()} ج.م

📊 المقارنات السوقية:
${compsText}

أعطني تقدير AVM بصيغة JSON فقط (بدون أي نص آخر):
{
  "estimated_value": <رقم - القيمة المقدرة بالجنيه>,
  "min_value": <رقم - الحد الأدنى>,
  "max_value": <رقم - الحد الأقصى>,
  "confidence": <رقم بين 0 و 100 - درجة الثقة>,
  "price_per_sqm": <رقم - سعر المتر المقدر>,
  "reasoning": "<نص مختصر بالعربية يشرح المنطق>",
  "adjustments": [
    {"factor": "<اسم العامل>", "impact_pct": <نسبة مئوية + أو ->, "reason": "<السبب>"}
  ]
}`;

    try {
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: "أنت خبير تقييم عقاري. أعد JSON صحيح فقط بدون أي markdown أو نص إضافي." },
            { role: "user", content: prompt },
          ],
        }),
      });

      if (res.status === 429) return { success: false, error: "تجاوزت الحد المسموح، حاول لاحقاً" };
      if (res.status === 402) return { success: false, error: "نفدت أرصدة الذكاء الاصطناعي" };
      if (!res.ok) return { success: false, error: `AI error: ${res.status}` };

      const json = await res.json();
      const content = json.choices?.[0]?.message?.content ?? "";
      const cleaned = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      const parsed = JSON.parse(cleaned);
      return { success: true, ...parsed };
    } catch (err) {
      console.error("AVM error:", err);
      return { success: false, error: err instanceof Error ? err.message : "Unknown error" };
    }
  });
