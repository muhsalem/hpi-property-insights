import { createServerFn } from "@tanstack/react-start";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

const AVMInput = z.object({
  area_id: z.string().min(1),
  area_sqm: z.number().min(20).max(20000),
  rooms: z.number().min(0).max(20).optional(),
  baths: z.number().min(0).max(20).optional(),
  floor: z.number().min(0).max(60).optional(),
  year_built: z.number().min(1900).max(new Date().getFullYear() + 2).optional(),
  building_type: z.string().min(1),
  category: z.string().min(1),
  finish: z.string().optional(),
  view: z.string().optional(),
});

export const runAVM = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => AVMInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;

    // Fetch comps + area context
    const [{ data: area }, { data: similar }, { data: txns }] = await Promise.all([
      supabase.from("areas").select("*, districts(name, city_name)").eq("id", data.area_id).maybeSingle(),
      supabase.from("properties").select("*").eq("area_id", data.area_id).limit(40),
      supabase.from("transactions").select("price, txn_date, property_id").order("txn_date", { ascending: false }).limit(60),
    ]);

    if (!area) throw new Error("Area not found");

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("AI service not configured");

    const compactComps = (similar || []).slice(0, 25).map((p: any) => ({
      sqm: p.area_sqm,
      rooms: p.rooms,
      baths: p.baths,
      floor: p.floor,
      year: p.year_built,
      type: p.type_label,
      finish: p.finish,
      view: p.view,
      price: p.base_price,
      price_per_sqm: Math.round(p.base_price / p.area_sqm),
    }));

    const prompt = `أنت نموذج تقييم آلي للعقارات (AVM) خبير في سوق محافظة بورسعيد، مصر.

العقار المطلوب تقييمه:
${JSON.stringify({
  مدينة: area.districts?.city_name,
  حي: area.districts?.name,
  منطقة: area.name,
  متوسط_سعر_المنطقة_للمتر: area.base_price,
  معدل_النمو_السنوي: `${(area.growth * 100).toFixed(1)}%`,
  تقييم_البنية_التحتية: `${area.infra_rating}/10`,
  تقييم_الأمان: `${area.safety_rating}/10`,
  تقييم_الخدمات: `${area.services_rating}/10`,
  تقييم_المواصلات: `${area.transport_rating}/10`,
  المساحة_م2: data.area_sqm,
  الغرف: data.rooms,
  الحمامات: data.baths,
  الدور: data.floor,
  سنة_البناء: data.year_built,
  نوع_المبنى: data.building_type,
  الفئة: data.category,
  التشطيب: data.finish,
  الإطلالة: data.view,
}, null, 2)}

العقارات المماثلة في نفس المنطقة (${compactComps.length} عقار):
${JSON.stringify(compactComps, null, 2)}

آخر المعاملات في السوق:
${JSON.stringify((txns || []).slice(0, 15), null, 2)}

طبّق منهجية AVM احترافية تشمل:
1. تحليل العقارات المماثلة (Comparable Sales Approach)
2. تعديلات السعر لكل فرق (مساحة، دور، تشطيب، عمر، إطلالة)
3. حساب السعر/م² المتوقع
4. هامش الثقة (Confidence Interval) بناءً على تشتت العينة
5. تحديد عوامل المخاطرة

أعِد النتيجة كـ JSON صحيح فقط، بدون أي تعليقات:
{
  "estimated_value": <number>,
  "price_per_sqm": <number>,
  "confidence_low": <number>,
  "confidence_high": <number>,
  "confidence_pct": <number 0-100>,
  "methodology": "<شرح موجز للمنهجية>",
  "key_adjustments": [{"factor": "<اسم>", "impact_pct": <number>, "reason": "<سبب>"}],
  "risk_factors": ["<عامل خطر 1>", "<عامل خطر 2>"],
  "market_signal": "<bullish|neutral|bearish>",
  "recommendation": "<نصيحة موجزة للمشتري/البائع>"
}`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: "أنت محرّك AVM احترافي. ترد بـ JSON صحيح فقط، بدون أي نص إضافي خارج JSON." },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (response.status === 429) {
      return { error: "تم تجاوز حد الاستخدام، حاول بعد قليل", result: null };
    }
    if (response.status === 402) {
      return { error: "رصيد AI Gateway نفد، يرجى شحن الرصيد", result: null };
    }
    if (!response.ok) {
      const txt = await response.text();
      console.error("AVM AI error:", response.status, txt);
      return { error: `فشل استدعاء النموذج (${response.status})`, result: null };
    }

    const json = await response.json();
    const content = json.choices?.[0]?.message?.content;
    if (!content) return { error: "استجابة فارغة من النموذج", result: null };

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch {
      // Try to extract JSON if wrapped
      const match = content.match(/\{[\s\S]*\}/);
      if (!match) return { error: "تعذّر قراءة استجابة النموذج", result: null };
      parsed = JSON.parse(match[0]);
    }

    return {
      error: null,
      result: parsed,
      meta: {
        comps_used: compactComps.length,
        area_avg_price: area.base_price,
        area_name: area.name,
      },
    };
  });
