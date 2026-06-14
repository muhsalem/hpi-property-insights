import { useEffect, useMemo, useState } from "react";
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
  ResponsiveContainer,
} from "recharts";
import { TrendingUp, TrendingDown, Info, Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { useValuationState } from "@/context/ValuationStateContext";

/**
 * PriceHistoryChart — رسم بياني لتطور سعر العقار منذ إنشائه
 * - يجلب الصفقات الحقيقية (transactions) إن وُجدت
 * - يولّد منحنى تقديري من سنة البناء إلى اليوم اعتمادًا على معدلات التضخم العقاري في مصر
 * - يُعلِّم النقاط الحرجة: ارتفاع/انخفاض/أحداث (تجديد، صفقة، أزمة، تعويم...)
 */

import { getMacro } from "@/lib/egypt-cpi";

// أحداث اقتصادية مؤثرة على السوق العقاري المصري (تقريبية)
const MARKET_EVENTS: Array<{ year: number; label: string; impactPct: number; type: "up" | "down" | "neutral" }> = [
  { year: 2011, label: "ثورة يناير — ركود مؤقت", impactPct: -8, type: "down" },
  { year: 2014, label: "استقرار سياسي — تعافٍ", impactPct: 12, type: "up" },
  { year: 2016, label: "تعويم الجنيه — قفزة أسعار", impactPct: 35, type: "up" },
  { year: 2020, label: "جائحة كورونا — تباطؤ", impactPct: -3, type: "down" },
  { year: 2022, label: "تعويم ثانٍ + تضخم", impactPct: 28, type: "up" },
  { year: 2024, label: "تعويم مارس 2024", impactPct: 40, type: "up" },
];

// معدل تضخم عقاري سنوي افتراضي عند غياب بيانات CPI
const BASE_ANNUAL_GROWTH = 0.07;

/** نمو سنوي مبني على CPI الفعلي (CAPMAS) مع تخفيف 0.85 لأن العقار يتأخر عن التضخم */
function annualGrowthFromCpi(year: number): number | null {
  const cur = getMacro(year);
  const prev = getMacro(year - 1);
  if (!cur || !prev) return null;
  const cpiGrowth = cur.cpi / prev.cpi - 1;
  return cpiGrowth * 0.85;
}

interface PricePoint {
  year: number;
  price: number;          // قيمة العقار الكلية
  pricePerSqm: number;    // سعر المتر
  source: "construction" | "estimate" | "transaction" | "valuation";
  event?: string;
  changePct?: number;
}

export default function PriceHistoryChart() {
  const { state } = useValuationState();
  const propertyId = state.property_id;
  const [loading, setLoading] = useState(false);
  const [property, setProperty] = useState<any>(null);
  const [transactions, setTransactions] = useState<Array<{ price: number; txn_date: string; notes?: string | null }>>([]);

  useEffect(() => {
    if (!propertyId) return;
    setLoading(true);
    (async () => {
      const [{ data: prop }, { data: tx }] = await Promise.all([
        supabase.from("properties").select("*").eq("id", propertyId).maybeSingle(),
        supabase
          .from("transactions")
          .select("price,txn_date,notes")
          .eq("property_id", propertyId)
          .order("txn_date", { ascending: true }),
      ]);
      setProperty(prop);
      setTransactions(tx ?? []);
      setLoading(false);
    })();
  }, [propertyId]);

  const { series, milestones, summary, narrative } = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const area = property?.area_sqm ?? state.subject?.area ?? 100;

    // سنة البداية: year_built أو purchase_date أو منذ 10 سنوات
    const startYear =
      property?.year_built ??
      (property?.purchase_date ? new Date(property.purchase_date).getFullYear() : null) ??
      (state.subject?.yearBuilt as number | undefined) ??
      currentYear - 10;

    // السعر الأصلي: purchase_price أو base_price مرتجع
    let startPrice =
      property?.purchase_price ??
      (property?.base_price && area ? property.base_price * area * 0.3 : null);

    // إذا لا يوجد، نقدّر بشكل عكسي من السعر الحالي
    const currentPrice =
      state.approaches?.salesValue ??
      state.reconciliation?.final ??
      (property?.base_price && area ? property.base_price * area : 1_000_000);

    if (!startPrice) {
      // عكس النمو إلى سنة البداية
      const years = Math.max(1, currentYear - startYear);
      startPrice = currentPrice / Math.pow(1 + BASE_ANNUAL_GROWTH, years);
    }

    // بناء السلسلة سنويًا
    const series: PricePoint[] = [];
    let price = startPrice;
    series.push({
      year: startYear,
      price: Math.round(price),
      pricePerSqm: Math.round(price / area),
      source: "construction",
      event: "إنشاء/شراء العقار",
    });

    for (let y = startYear + 1; y <= currentYear; y++) {
      const ev = MARKET_EVENTS.find((e) => e.year === y);
      // أولوية الحدث، ثم نمو CPI الفعلي، ثم الافتراضي
      const cpiGrowth = annualGrowthFromCpi(y);
      const growth = ev ? ev.impactPct / 100 : (cpiGrowth ?? BASE_ANNUAL_GROWTH);
      const prev = price;
      price = price * (1 + growth);

      // طبق صفقات حقيقية إن وُجدت في نفس السنة
      const txInYear = transactions.find((t) => new Date(t.txn_date).getFullYear() === y);
      if (txInYear) price = txInYear.price;

      series.push({
        year: y,
        price: Math.round(price),
        pricePerSqm: Math.round(price / area),
        source: txInYear ? "transaction" : ev ? "estimate" : "estimate",
        event: txInYear ? `صفقة موثقة${txInYear.notes ? ` — ${txInYear.notes}` : ""}` : ev?.label,
        changePct: Math.round(((price - prev) / prev) * 100),
      });
    }

    // آخر نقطة = القيمة الحالية المُقدّرة من التقييم
    if (series.length) {
      series[series.length - 1].price = Math.round(currentPrice);
      series[series.length - 1].pricePerSqm = Math.round(currentPrice / area);
      series[series.length - 1].source = "valuation";
      series[series.length - 1].event = "القيمة الحالية (التقييم)";
    }

    const milestones = series.filter((p) => p.event && p.year !== startYear);

    const first = series[0]?.price ?? 0;
    const last = series[series.length - 1]?.price ?? 0;
    const totalGrowthPct = first ? Math.round(((last - first) / first) * 100) : 0;
    const years = currentYear - startYear || 1;
    const cagr = first ? Math.round((Math.pow(last / first, 1 / years) - 1) * 100) : 0;

    // فقرة تفسيرية آلية
    const fmtAr = (n: number) => new Intl.NumberFormat("ar-EG").format(Math.round(n));
    const sentences: string[] = [];
    sentences.push(
      `بدأ تتبّع قيمة العقار من عام ${startYear} بقيمة تقديرية ${fmtAr(first)} ج.م (≈ ${fmtAr(first / area)} ج.م/م²)، ` +
        `ووصلت في عام ${currentYear} إلى ${fmtAr(last)} ج.م (≈ ${fmtAr(last / area)} ج.م/م²)، ` +
        `بإجمالي ${totalGrowthPct >= 0 ? "ارتفاع" : "انخفاض"} قدره ${Math.abs(totalGrowthPct)}% خلال ${years} سنة ` +
        `(معدل نمو سنوي مركّب ${cagr}%).`,
    );

    // أكبر قفزة وأكبر هبوط
    const changes = series.filter((p) => p.changePct !== undefined);
    if (changes.length) {
      const biggestUp = [...changes].sort((a, b) => (b.changePct! - a.changePct!))[0];
      const biggestDown = [...changes].sort((a, b) => (a.changePct! - b.changePct!))[0];
      if (biggestUp && biggestUp.changePct! > 0) {
        sentences.push(
          `أكبر قفزة سعرية كانت عام ${biggestUp.year} بنسبة +${biggestUp.changePct}% ` +
            `${biggestUp.event ? `نتيجة: ${biggestUp.event}` : ""}، حيث وصلت القيمة إلى ${fmtAr(biggestUp.price)} ج.م.`,
        );
      }
      if (biggestDown && biggestDown.changePct! < 0) {
        sentences.push(
          `أبرز تراجع حدث عام ${biggestDown.year} بنسبة ${biggestDown.changePct}% ` +
            `${biggestDown.event ? `بسبب: ${biggestDown.event}` : ""}، وانخفضت القيمة إلى ${fmtAr(biggestDown.price)} ج.م.`,
        );
      }
    }

    // الصفقات الموثقة
    const txMilestones = series.filter((p) => p.source === "transaction");
    if (txMilestones.length) {
      sentences.push(
        `تم رصد ${txMilestones.length} صفقة موثقة على العقار: ` +
          txMilestones
            .map((t) => `عام ${t.year} بقيمة ${fmtAr(t.price)} ج.م`)
            .join("، ") +
          "، وقد اعتُمدت كنقاط مرجعية حقيقية في المنحنى.",
      );
    }

    // الأحداث الكلية
    const macroEvents = series.filter(
      (p) => p.event && p.source !== "transaction" && p.year !== startYear && p.year !== currentYear,
    );
    if (macroEvents.length) {
      const ups = macroEvents.filter((e) => (e.changePct ?? 0) > 0);
      const downs = macroEvents.filter((e) => (e.changePct ?? 0) < 0);
      const parts: string[] = [];
      if (ups.length)
        parts.push(
          `دفعت أحداث (${ups.map((e) => e.event).join("، ")}) السعر للأعلى بمعدلات تراوحت بين ` +
            `${Math.min(...ups.map((e) => e.changePct!))}% و${Math.max(...ups.map((e) => e.changePct!))}%`,
        );
      if (downs.length)
        parts.push(
          `بينما تسببت (${downs.map((e) => e.event).join("، ")}) في تراجع مؤقت بين ` +
            `${Math.max(...downs.map((e) => e.changePct!))}% و${Math.min(...downs.map((e) => e.changePct!))}%`,
        );
      sentences.push("على المستوى الكلي، " + parts.join("، ") + ".");
    }

    sentences.push(
      `بناءً على ما سبق، يُعدّ الاتجاه العام للعقار ${totalGrowthPct > 50 ? "تصاعديًا قويًا يعكس جاذبية استثمارية مرتفعة" : totalGrowthPct > 0 ? "تصاعديًا معتدلًا متماشيًا مع السوق" : "متراجعًا يستدعي مراجعة عوامل الموقع والصيانة"}، ` +
        `وتدعم القيمة الحالية المُقدّرة (${fmtAr(last)} ج.م) المسار التاريخي للأسعار وعوامل السوق المحيطة.`,
    );

    const narrative = sentences.join(" ");

    return {
      series,
      milestones,
      summary: { first, last, totalGrowthPct, cagr, years, startYear, currentYear, area },
      narrative,
    };
  }, [property, transactions, state]);

  const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <TrendingUp className="h-5 w-5 text-primary" />
          تطور سعر العقار منذ الإنشاء
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin ml-2" /> جاري التحميل…
          </div>
        ) : (
          <>
            {/* ملخص */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              <Stat label="سنة البداية" value={String(summary.startYear)} />
              <Stat label="المدة" value={`${summary.years} سنة`} />
              <Stat
                label="إجمالي النمو"
                value={`${summary.totalGrowthPct > 0 ? "+" : ""}${summary.totalGrowthPct}%`}
                positive={summary.totalGrowthPct >= 0}
              />
              <Stat
                label="معدل النمو السنوي (CAGR)"
                value={`${summary.cagr > 0 ? "+" : ""}${summary.cagr}%`}
                positive={summary.cagr >= 0}
              />
            </div>

            {/* الرسم البياني */}
            <div className="h-72 w-full">
              <ResponsiveContainer>
                <ComposedChart data={series} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="priceFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                  <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => `${(v / 1_000_000).toFixed(1)}م`}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const p = payload[0].payload as PricePoint;
                      return (
                        <div className="rounded-md border bg-background p-2 text-xs shadow">
                          <div className="font-semibold">{p.year}</div>
                          <div>القيمة: {fmt(p.price)} ج.م</div>
                          <div>سعر المتر: {fmt(p.pricePerSqm)} ج.م/م²</div>
                          {p.changePct !== undefined && (
                            <div className={p.changePct >= 0 ? "text-emerald-600" : "text-red-600"}>
                              التغير: {p.changePct > 0 ? "+" : ""}
                              {p.changePct}%
                            </div>
                          )}
                          {p.event && <div className="mt-1 text-muted-foreground">{p.event}</div>}
                        </div>
                      );
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: 12 }} />
                  <Area
                    type="monotone"
                    dataKey="price"
                    name="القيمة الكلية"
                    stroke="hsl(var(--primary))"
                    fill="url(#priceFill)"
                    strokeWidth={2}
                  />
                  <Line
                    type="monotone"
                    dataKey="pricePerSqm"
                    name="سعر المتر"
                    stroke="hsl(var(--chart-2, 200 80% 50%))"
                    strokeWidth={1.5}
                    yAxisId={0}
                    dot={false}
                  />
                  {milestones.map((m) => (
                    <ReferenceDot
                      key={m.year}
                      x={m.year}
                      y={m.price}
                      r={5}
                      fill={
                        m.source === "transaction"
                          ? "hsl(var(--primary))"
                          : (m.changePct ?? 0) >= 0
                            ? "#10b981"
                            : "#ef4444"
                      }
                      stroke="#fff"
                      strokeWidth={2}
                    />
                  ))}
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* فقرة تفسيرية آلية */}
            <div className="mt-4 rounded-md border bg-muted/30 p-3">
              <div className="text-sm font-semibold flex items-center gap-1 mb-1">
                <Info className="h-4 w-4 text-primary" /> التحليل التفسيري الآلي
              </div>
              <p className="text-xs leading-7 text-foreground/90 whitespace-pre-line">
                {narrative}
              </p>
            </div>

            {/* قائمة الأحداث المؤثرة */}
            <div className="mt-4 space-y-2">
              <div className="text-sm font-semibold flex items-center gap-1">
                <Info className="h-4 w-4" /> العوامل المؤثرة على السعر
              </div>
              <div className="max-h-56 overflow-y-auto divide-y rounded-md border">
                {milestones.map((m) => (
                  <div key={m.year} className="flex items-center justify-between p-2 text-xs">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{m.year}</Badge>
                      <span>{m.event}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">{fmt(m.price)} ج.م</span>
                      {m.changePct !== undefined && (
                        <Badge
                          variant={m.changePct >= 0 ? "default" : "destructive"}
                          className="gap-1"
                        >
                          {m.changePct >= 0 ? (
                            <TrendingUp className="h-3 w-3" />
                          ) : (
                            <TrendingDown className="h-3 w-3" />
                          )}
                          {m.changePct > 0 ? "+" : ""}
                          {m.changePct}%
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
                {milestones.length === 0 && (
                  <div className="p-3 text-xs text-muted-foreground text-center">
                    لا توجد أحداث مسجلة
                  </div>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                * النقاط الحقيقية مأخوذة من جدول الصفقات الموثقة، والباقي تقديرات مبنية على معدلات
                التضخم العقاري المصري وأحداث السوق الرئيسية.
              </p>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, positive }: { label: string; value: string; positive?: boolean }) {
  return (
    <div className="rounded-lg border p-2">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div
        className={`text-sm font-bold ${
          positive === undefined ? "" : positive ? "text-emerald-600" : "text-red-600"
        }`}
      >
        {value}
      </div>
    </div>
  );
}
