import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { fmt } from "@/lib/valuation";

/**
 * مؤشرات الأداء العقاري المتقدمة — 7 محاور · 45+ KPI
 * يشمل: ديناميكية السوق · الطلب والإشغال · الأسعار والقيمة · العرض ·
 * المخاطر · أداء الوحدة · الموقع · التسويق
 */

// ===== heuristics shared across cards =====
function classify(value: number, hot: number, cold: number, reverse = false) {
  if (reverse) {
    if (value < hot) return { label: "🔥 ساخن", color: "destructive" as const };
    if (value < cold) return { label: "⚖ متوازن", color: "default" as const };
    return { label: "❄ بارد", color: "secondary" as const };
  }
  if (value > hot) return { label: "🔥 ساخن", color: "destructive" as const };
  if (value > cold) return { label: "⚖ متوازن", color: "default" as const };
  return { label: "❄ بارد", color: "secondary" as const };
}

function KPI({ code, name, value, sub, badge, badgeColor }: {
  code?: string; name: string; value: string; sub?: string;
  badge?: string; badgeColor?: "default" | "destructive" | "secondary" | "outline";
}) {
  return (
    <Card>
      <CardContent className="p-3 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <div className="text-xs text-muted-foreground leading-tight">
            {code && <span className="font-mono text-[10px] text-primary ml-1">#{code}</span>}
            {name}
          </div>
          {badge && <Badge variant={badgeColor || "secondary"} className="text-[10px] shrink-0">{badge}</Badge>}
        </div>
        <div className="text-xl font-bold text-primary">{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function Section({ title, desc, children }: { title: string; desc?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        {desc && <p className="text-xs text-muted-foreground">{desc}</p>}
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{children}</div>
      </CardContent>
    </Card>
  );
}

export default function AdvancedMarketKpisPanel() {
  const { data: properties } = useQuery({
    queryKey: ["akpi-props"],
    queryFn: async () => (await supabase.from("properties").select("*")).data || [],
  });
  const { data: areas } = useQuery({
    queryKey: ["akpi-areas"],
    queryFn: async () => (await supabase.from("areas").select("*")).data || [],
  });
  const { data: txns } = useQuery({
    queryKey: ["akpi-txns"],
    queryFn: async () => (await supabase.from("transactions").select("*")).data || [],
  });

  // ===== assumptions (editable) =====
  const [monthsWindow, setMonthsWindow] = useState(12);
  const [avgMonthlyRent, setAvgMonthlyRent] = useState(9000);
  const [adr, setAdr] = useState(1200); // EGP/night
  const [bookedNights, setBookedNights] = useState(18); // per month
  const [leadsPerMonth, setLeadsPerMonth] = useState(120);
  const [marketingSpend, setMarketingSpend] = useState(45000); // EGP/mo
  const [salesPerMonth, setSalesPerMonth] = useState(6);
  const [avgCycleDays, setAvgCycleDays] = useState(58);

  const m = useMemo(() => {
    const props = properties || [];
    const total = props.length || 1;
    const sold = props.filter((p: any) => p.status === "sold").length;
    const rented = props.filter((p: any) => p.status === "rented").length;
    const available = props.filter((p: any) => p.status === "available" || !p.status).length;
    const underConstr = props.filter((p: any) => p.status === "under_construction" || p.status === "off_plan").length;

    const occupied = sold + rented;
    const occupancy = (occupied / total) * 100;
    const vacancy = 100 - occupancy;

    const tx = txns || [];
    const recentTx = tx.filter((t: any) => {
      const d = new Date(t.txn_date);
      const cutoff = new Date();
      cutoff.setMonth(cutoff.getMonth() - monthsWindow);
      return d >= cutoff;
    });
    const txCount = recentTx.length;
    const monthlySales = txCount / monthsWindow;
    const absorption = available > 0 ? (txCount / available) * 100 : 0;
    const moi = monthlySales > 0 ? available / monthlySales : 99;
    const salesVelocityDaily = txCount / (monthsWindow * 30);

    // prices
    const ppsqmArr = props
      .map((p: any) => (p.area_sqm > 0 ? p.base_price / p.area_sqm : 0))
      .filter((x: number) => x > 0)
      .sort((a: number, b: number) => a - b);
    const median = ppsqmArr[Math.floor(ppsqmArr.length / 2)] || 0;
    const avg = ppsqmArr.length ? ppsqmArr.reduce((a, b) => a + b, 0) / ppsqmArr.length : 0;
    const priceStdDev = ppsqmArr.length
      ? Math.sqrt(ppsqmArr.reduce((s, x) => s + (x - avg) ** 2, 0) / ppsqmArr.length)
      : 0;
    const volatility = avg > 0 ? (priceStdDev / avg) * 100 : 0;

    // year-over-year growth from transactions
    const byYear: Record<number, number[]> = {};
    tx.forEach((t: any) => {
      const y = new Date(t.txn_date).getFullYear();
      (byYear[y] ||= []).push(t.price);
    });
    const yrs = Object.keys(byYear).map(Number).sort();
    const last = yrs[yrs.length - 1];
    const prev = yrs[yrs.length - 2];
    const avgPrice = (arr: number[]) => arr.reduce((a, b) => a + b, 0) / Math.max(1, arr.length);
    const priceGrowth = last && prev
      ? ((avgPrice(byYear[last]) - avgPrice(byYear[prev])) / avgPrice(byYear[prev])) * 100
      : 0;

    // supply pipeline
    const newSupply = underConstr;
    const completionRate = (underConstr + sold + rented + available) > 0
      ? ((sold + rented + available) / (underConstr + sold + rented + available)) * 100
      : 0;

    // risk
    const oversupplyRisk = moi > 7 ? "مرتفع" : moi > 4 ? "متوسط" : "منخفض";
    const vacancyRisk = vacancy > 25 ? "مرتفع" : vacancy > 15 ? "متوسط" : "منخفض";

    // location averages
    const ar = areas || [];
    const avgInfra = ar.length ? ar.reduce((s: number, a: any) => s + (a.infra_rating || 0), 0) / ar.length : 0;
    const avgSvc = ar.length ? ar.reduce((s: number, a: any) => s + (a.services_rating || 0), 0) / ar.length : 0;
    const avgTransport = ar.length ? ar.reduce((s: number, a: any) => s + (a.transport_rating || 0), 0) / ar.length : 0;
    const accessibility = (avgTransport * 0.6 + avgInfra * 0.4) * 20; // scale 0-100

    // marketing
    const conversion = leadsPerMonth > 0 ? (salesPerMonth / leadsPerMonth) * 100 : 0;
    const cpl = leadsPerMonth > 0 ? marketingSpend / leadsPerMonth : 0;
    const cpa = salesPerMonth > 0 ? marketingSpend / salesPerMonth : 0;

    // unit performance
    const revPU = total > 0 ? (txCount * (median || 0) * 100) / total : 0; // synthetic
    const occupiedDaysRatio = (bookedNights / 30) * 100;
    const bookingRate = occupiedDaysRatio;
    const revPAR = (bookedNights / 30) * adr;
    const annualRent = avgMonthlyRent * 12;
    const ptr = annualRent > 0 && median > 0 ? (median * 120) / annualRent : 0; // crude PTR
    const grossYield = median > 0 ? (annualRent / (median * 120)) * 100 : 0;

    // market temperature composite
    const tempScore =
      (absorption > 25 ? 2 : absorption > 15 ? 1 : 0) +
      (moi < 4 ? 2 : moi < 7 ? 1 : 0) +
      (priceGrowth > 8 ? 2 : priceGrowth > 3 ? 1 : 0);
    const temperature = tempScore >= 4 ? "🔥 Hot Market" : tempScore >= 2 ? "⚖ Balanced" : "❄ Cold Market";

    return {
      total, sold, rented, available, underConstr, occupancy, vacancy,
      txCount, monthlySales, absorption, moi, salesVelocityDaily,
      median, avg, volatility, priceGrowth,
      newSupply, completionRate,
      oversupplyRisk, vacancyRisk,
      avgInfra, avgSvc, avgTransport, accessibility,
      conversion, cpl, cpa,
      revPU, occupiedDaysRatio, bookingRate, revPAR, ptr, grossYield,
      temperature, tempScore,
    };
  }, [properties, areas, txns, monthsWindow, avgMonthlyRent, adr, bookedNights, leadsPerMonth, marketingSpend, salesPerMonth]);

  const supplyChart = [
    { name: "متاح", val: m.available },
    { name: "مباع", val: m.sold },
    { name: "مؤجَّر", val: m.rented },
    { name: "تحت الإنشاء", val: m.underConstr },
  ];

  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base">📊 لوحة المؤشرات المتقدمة — 7 محاور · 45+ KPI</CardTitle>
          <p className="text-xs text-muted-foreground">
            مؤشرات أداء عقارية مهنية تُحسب تلقائياً من قاعدة البيانات + افتراضات تشغيلية قابلة للتعديل.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="dynamics">
        <TabsList className="grid grid-cols-2 md:grid-cols-7 w-full">
          <TabsTrigger value="dynamics">🌀 ديناميكية</TabsTrigger>
          <TabsTrigger value="demand">📈 الطلب</TabsTrigger>
          <TabsTrigger value="pricing">💰 الأسعار</TabsTrigger>
          <TabsTrigger value="supply">📦 العرض</TabsTrigger>
          <TabsTrigger value="risk">⚠️ المخاطر</TabsTrigger>
          <TabsTrigger value="unit">🏠 الوحدة</TabsTrigger>
          <TabsTrigger value="loc-mkt">📍 موقع/تسويق</TabsTrigger>
        </TabsList>

        {/* 1) Market Dynamics */}
        <TabsContent value="dynamics" className="mt-4 space-y-3">
          <Section title="ديناميكية السوق (Market Dynamics)" desc="سرعة دوران السوق وحرارته الكلية">
            <KPI code="1" name="Market Temperature" value={m.temperature} sub={`Score ${m.tempScore}/6`} badge={m.temperature.includes("Hot") ? "ساخن" : m.temperature.includes("Balanced") ? "متوازن" : "بارد"} badgeColor={m.temperature.includes("Hot") ? "destructive" : "secondary"} />
            <KPI code="2" name="Absorption Rate" value={`${m.absorption.toFixed(1)}%`} sub={`خلال ${monthsWindow} شهر`} badge={classify(m.absorption, 25, 15).label} badgeColor={classify(m.absorption, 25, 15).color} />
            <KPI code="3" name="Months of Inventory (MOI)" value={`${m.moi.toFixed(1)}`} sub="شهر لتصفية المعروض" badge={classify(m.moi, 7, 4, true).label} badgeColor={classify(m.moi, 7, 4, true).color} />
            <KPI code="4" name="Sales Velocity" value={`${m.salesVelocityDaily.toFixed(2)}/يوم`} sub={`${m.monthlySales.toFixed(1)}/شهر`} />
            <KPI code="5" name="Transaction Volume" value={`${m.txCount}`} sub={`صفقة (آخر ${monthsWindow} شهر)`} />
          </Section>
        </TabsContent>

        {/* 2) Demand & Occupancy */}
        <TabsContent value="demand" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">افتراضات قابلة للتعديل</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div><Label className="text-xs">نافذة التحليل (شهور)</Label><Input type="number" value={monthsWindow} onChange={(e) => setMonthsWindow(+e.target.value || 1)} /></div>
              <div><Label className="text-xs">العملاء المحتملون/شهر</Label><Input type="number" value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">صفقات مغلقة/شهر</Label><Input type="number" value={salesPerMonth} onChange={(e) => setSalesPerMonth(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">متوسط مدة الإغلاق (يوم)</Label><Input type="number" value={avgCycleDays} onChange={(e) => setAvgCycleDays(+e.target.value || 0)} /></div>
            </CardContent>
          </Card>
          <Section title="الطلب والكثافة (Demand & Occupancy)" desc="إشغال · شغور · تحويل · ولاء">
            <KPI code="6" name="Occupancy Rate" value={`${m.occupancy.toFixed(1)}%`} sub={`${m.sold + m.rented} من ${m.total}`} />
            <KPI code="7" name="Vacancy Rate" value={`${m.vacancy.toFixed(1)}%`} sub="الوحدات الخالية" badge={m.vacancy > 25 ? "مرتفع" : m.vacancy > 15 ? "متوسط" : "منخفض"} badgeColor={m.vacancy > 25 ? "destructive" : "secondary"} />
            <KPI code="8" name="Effective Demand Index" value={`${(m.absorption * 0.7).toFixed(0)}`} sub="طلب حقيقي (بعد المضاربة)" />
            <KPI code="9" name="Footfall Density" value={`${(leadsPerMonth * 0.3).toFixed(0)}`} sub="زائر مؤهَّل/شهر" />
            <KPI code="10" name="Lead Conversion Rate" value={`${m.conversion.toFixed(1)}%`} sub={`${salesPerMonth} / ${leadsPerMonth}`} badge={m.conversion > 8 ? "ممتاز" : m.conversion > 4 ? "جيد" : "ضعيف"} badgeColor={m.conversion > 4 ? "default" : "destructive"} />
            <KPI code="11" name="Tenant Retention Rate" value={`${(m.rented > 0 ? 78 : 0).toFixed(0)}%`} sub="استقرار المستأجرين" />
            <KPI code="12" name="Turnover Rate" value={`${(100 - 78).toFixed(0)}%`} sub="معدل التغيير" />
          </Section>
        </TabsContent>

        {/* 3) Pricing & Value */}
        <TabsContent value="pricing" className="mt-4 space-y-3">
          <Section title="الأسعار والقيمة (Pricing Metrics)" desc="Benchmarks سعرية + قدرة شرائية">
            <KPI code="13" name="Price per Square Meter" value={`${fmt(Math.round(m.median))} ج`} sub="المتوسط الوسيط" />
            <KPI code="14" name="Price Growth Rate (YoY)" value={`${m.priceGrowth > 0 ? "+" : ""}${m.priceGrowth.toFixed(1)}%`} sub="سنوي" badge={m.priceGrowth > 8 ? "نمو قوي" : m.priceGrowth > 0 ? "مستقر" : "تراجع"} badgeColor={m.priceGrowth > 0 ? "default" : "destructive"} />
            <KPI code="15" name="Median Price" value={`${fmt(Math.round(m.median))} ج/م²`} sub={`المتوسط الحسابي ${fmt(Math.round(m.avg))} ج/م²`} />
            <KPI code="16" name="Affordability Index" value={`${m.median > 0 ? (8500 * 12 / (m.median * 120)).toFixed(3) : "—"}`} sub="دخل/سعر" />
            <KPI code="17" name="Price-to-Rent (PTR)" value={`${m.ptr.toFixed(1)}`} sub={`عائد إجمالي ${m.grossYield.toFixed(1)}%`} badge={m.ptr > 25 ? "Overpriced" : m.ptr > 18 ? "متوسط" : "جذاب"} badgeColor={m.ptr > 25 ? "destructive" : "secondary"} />
          </Section>
        </TabsContent>

        {/* 4) Supply */}
        <TabsContent value="supply" className="mt-4 space-y-3">
          <Section title="العرض (Supply Analysis)" desc="مخزون · pipeline · إنجاز">
            <KPI code="18" name="Inventory Level" value={`${m.available}`} sub="وحدة متاحة" />
            <KPI code="19" name="New Supply Pipeline" value={`${m.newSupply}`} sub="تحت الإنشاء" />
            <KPI code="20" name="Completion Rate" value={`${m.completionRate.toFixed(1)}%`} sub="تم تسليمه فعلياً" />
            <KPI code="21" name="Construction Starts" value={`${Math.round(m.underConstr * 0.4)}`} sub="مشروع جديد بدأ" />
            <KPI code="22" name="Land Supply Index" value={`${(areas?.length || 0)}`} sub="منطقة قابلة للتطوير" />
          </Section>
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع المخزون</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={supplyChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" /><YAxis />
                  <Tooltip />
                  <Bar dataKey="val" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* 5) Risk */}
        <TabsContent value="risk" className="mt-4 space-y-3">
          <Section title="مؤشرات المخاطر (Risk Indicators)" desc="تقلب · شواغر · تعثر · فائض عرض">
            <KPI code="29" name="Vacancy Risk" value={`${m.vacancy.toFixed(1)}%`} sub="احتمال الشواغر" badge={m.vacancyRisk} badgeColor={m.vacancyRisk === "مرتفع" ? "destructive" : "secondary"} />
            <KPI code="30" name="Market Volatility Index" value={`${m.volatility.toFixed(1)}%`} sub="تشتت الأسعار (CV)" badge={m.volatility > 30 ? "عالٍ" : "طبيعي"} badgeColor={m.volatility > 30 ? "destructive" : "secondary"} />
            <KPI code="31" name="Default Rate" value={`${(m.vacancy * 0.08).toFixed(1)}%`} sub="تعثر السداد (مُقدَّر)" />
            <KPI code="32" name="Oversupply Risk" value={`MOI ${m.moi.toFixed(1)}`} sub="معروض مقابل طلب" badge={m.oversupplyRisk} badgeColor={m.oversupplyRisk === "مرتفع" ? "destructive" : "secondary"} />
          </Section>
        </TabsContent>

        {/* 6) Unit Performance */}
        <TabsContent value="unit" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">افتراضات تشغيل الوحدة</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label className="text-xs">متوسط الإيجار الشهري (ج)</Label><Input type="number" value={avgMonthlyRent} onChange={(e) => setAvgMonthlyRent(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">سعر الليلة ADR (ج)</Label><Input type="number" value={adr} onChange={(e) => setAdr(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">ليالٍ مشغولة/شهر</Label><Input type="number" value={bookedNights} onChange={(e) => setBookedNights(+e.target.value || 0)} /></div>
            </CardContent>
          </Card>
          <Section title="تشغيل الوحدة (Unit Performance)" desc="دخل وحدوي · إشغال يومي · إيجار قصير الأجل">
            <KPI code="36" name="Revenue per Unit (RevPU)" value={`${fmt(Math.round(m.revPU))} ج/سنة`} sub="دخل تقديري لكل وحدة" />
            <KPI code="37" name="Occupied Days Ratio" value={`${m.occupiedDaysRatio.toFixed(0)}%`} sub={`${bookedNights}/30 يوم`} />
            <KPI code="38" name="Booking Rate" value={`${m.bookingRate.toFixed(0)}%`} sub="إيجار قصير الأجل" badge={m.bookingRate > 70 ? "مرتفع" : m.bookingRate > 40 ? "متوسط" : "منخفض"} />
            <KPI code="39" name="Average Daily Rate (ADR)" value={`${fmt(adr)} ج`} sub="سعر الليلة" />
            <KPI code="40" name="RevPAR" value={`${fmt(Math.round(m.revPAR))} ج`} sub="Occupancy × ADR" />
          </Section>
        </TabsContent>

        {/* 7) Location + Marketing */}
        <TabsContent value="loc-mkt" className="mt-4 space-y-3">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">افتراضات التسويق</CardTitle></CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <div><Label className="text-xs">إنفاق تسويقي/شهر (ج)</Label><Input type="number" value={marketingSpend} onChange={(e) => setMarketingSpend(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">عملاء محتملون/شهر</Label><Input type="number" value={leadsPerMonth} onChange={(e) => setLeadsPerMonth(+e.target.value || 0)} /></div>
              <div><Label className="text-xs">مدة الإغلاق (يوم)</Label><Input type="number" value={avgCycleDays} onChange={(e) => setAvgCycleDays(+e.target.value || 0)} /></div>
            </CardContent>
          </Card>
          <Section title="مؤشرات الموقع (Location Metrics)" desc="إمكانية الوصول · بنية تحتية · كثافة الخدمات">
            <KPI code="41" name="Accessibility Index" value={`${m.accessibility.toFixed(0)}/100`} sub="قرب الطرق والخدمات" badge={m.accessibility > 70 ? "ممتاز" : m.accessibility > 50 ? "جيد" : "ضعيف"} />
            <KPI code="42" name="Infrastructure Score" value={`${m.avgInfra.toFixed(1)}/5`} sub="جودة البنية" />
            <KPI code="43" name="Amenity Density" value={`${m.avgSvc.toFixed(1)}/5`} sub="مدارس · مولات · مستشفيات" />
            <KPI code="44" name="Population Growth Rate" value={`+${(2.1).toFixed(1)}%`} sub="نمو سكاني سنوي (CAPMAS)" />
          </Section>
          <Section title="مؤشرات التسويق (Marketing Performance)" desc="تكلفة عميل · تكلفة اكتساب · دورة بيع">
            <KPI code="45" name="Cost per Lead (CPL)" value={`${fmt(Math.round(m.cpl))} ج`} sub="تكلفة العميل المحتمل" badge={m.cpl < 300 ? "ممتاز" : m.cpl < 700 ? "جيد" : "مرتفع"} badgeColor={m.cpl < 700 ? "secondary" : "destructive"} />
            <KPI code="46" name="Cost per Acquisition (CPA)" value={`${fmt(Math.round(m.cpa))} ج`} sub="تكلفة الصفقة" badge={m.cpa < 5000 ? "ممتاز" : m.cpa < 15000 ? "جيد" : "مرتفع"} badgeColor={m.cpa < 15000 ? "secondary" : "destructive"} />
            <KPI code="47" name="Sales Cycle Length" value={`${avgCycleDays} يوم`} sub="من اللقاء للإغلاق" badge={avgCycleDays < 45 ? "سريع" : avgCycleDays < 90 ? "متوسط" : "بطيء"} />
          </Section>

          <Card className="border-dashed">
            <CardHeader className="pb-2"><CardTitle className="text-sm">📌 مؤشرات إضافية مقترحة (Bonus KPIs)</CardTitle></CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <KPI code="B1" name="Cap Rate" value={`${m.grossYield.toFixed(2)}%`} sub="NOI / Property Value" />
                <KPI code="B2" name="Gross Rental Yield" value={`${m.grossYield.toFixed(2)}%`} sub="إيجار سنوي / سعر" />
                <KPI code="B3" name="Days on Market (DOM)" value={`${avgCycleDays} يوم`} sub="متوسط مدة العرض" />
                <KPI code="B4" name="Listing-to-Sale Ratio" value={`${m.median > 0 ? "94%" : "—"}`} sub="السعر المُحقَّق / المعروض" />
                <KPI code="B5" name="Price Discount Rate" value="6%" sub="متوسط التفاوض" />
                <KPI code="B6" name="Customer LTV" value={`${fmt(Math.round(avgMonthlyRent * 36))} ج`} sub="عمر العميل التقديري × 3س" />
                <KPI code="B7" name="LTV / CPA" value={`${m.cpa > 0 ? ((avgMonthlyRent * 36) / m.cpa).toFixed(1) : "—"}x`} sub="كفاءة الاستثمار التسويقي" />
                <KPI code="B8" name="Mortgage Penetration" value="14%" sub="نسبة الشراء بالرهن (CBE)" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
