import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getMarketIndicators } from "@/lib/domain";
import { fmt } from "@/lib/valuation";

export function IndicatorsPanel() {
  const { data } = useQuery({
    queryKey: ["indicators"],
    queryFn: async () => {
      const [a, p] = await Promise.all([
        supabase.from("areas").select("*"),
        supabase.from("properties").select("*"),
      ]);
      return { areas: a.data || [], listings: p.data || [] };
    },
  });
  if (!data) return null;
  const m = getMarketIndicators(data.areas, data.listings);
  const Item = ({ en, ar, val, color = "#185FA5" }: any) => (
    <div className="border rounded p-2">
      <div className="text-[10px] text-muted-foreground">{en}</div>
      <div className="text-[11px]">{ar}</div>
      <div className="text-base font-bold" style={{ color }}>{val}</div>
    </div>
  );
  const Section = ({ title, children }: any) => (
    <div className="space-y-1">
      <div className="text-xs font-semibold border-b pb-1">{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{children}</div>
    </div>
  );
  return (
    <Card>
      <CardHeader><CardTitle className="text-base">📊 مؤشرات السوق الشاملة — 18 مؤشر · 5 محاور</CardTitle></CardHeader>
      <CardContent className="space-y-3">
        <Section title="📦 العرض والطلب">
          <Item en="Vacancy Rate" ar="معدل الشواغر" val={m.sd.vacRate + "%"} color={parseFloat(m.sd.vacRate) < 15 ? "#1D9E75" : "#D85A30"} />
          <Item en="Absorption" ar="معدل الامتصاص" val={m.sd.absorpRate + " /شهر"} />
          <Item en="Inventory" ar="حجم المعروض" val={fmt(m.sd.inventory)} color="#EF9F27" />
          <Item en="Total Units" ar="إجمالي الوحدات" val={m.sd.totalSub} color="#555" />
        </Section>
        <Section title="💰 الأسعار والعائد">
          <Item en="HPI" ar="مؤشر الأسعار" val={m.pr.hpiVal} />
          <Item en="ROI" ar="العائد على الاستثمار" val={m.pr.avgROI + "%"} color="#1D9E75" />
          <Item en="Rental Yield" ar="العائد الإيجاري" val={m.pr.avgRY + "%"} color="#1D9E75" />
          <Item en="Capital Appr." ar="نمو رأس المال" val={"+" + m.pr.capApp + "%"} color="#1D9E75" />
        </Section>
        <Section title="🏦 الاقتصاد الكلي">
          <Item en="Interest Rate" ar="سعر الفائدة" val={m.macro.interestRate + "%"} color="#D85A30" />
          <Item en="Inflation" ar="التضخم" val={m.macro.inflation + "%"} color="#D85A30" />
          <Item en="Mortgage/GDP" ar="قروض/GDP" val={m.macro.mortgageGDP + "%"} color="#EF9F27" />
          <Item en="Price/Income" ar="سعر/الدخل" val={m.macro.priceTOIncome + "x"} color="#D85A30" />
        </Section>
        <Section title="🏗 المطور والمشروع">
          <Item en="Price/sqm" ar="سعر المتر" val={fmt(m.dev.avgPsqm) + " ج"} />
          <Item en="Build Cost" ar="تكلفة البناء/م²" val={fmt(m.dev.avgBuildCost) + " ج"} color="#EF9F27" />
          <Item en="Dev. Margin" ar="هامش المطور" val={m.dev.devMargin + "%"} color="#1D9E75" />
          <Item en="IRR" ar="العائد الداخلي" val={m.dev.avgIRR + "%"} color="#1D9E75" />
        </Section>
        <Section title="📍 الموقع">
          <Item en="Infrastructure" ar="البنية التحتية" val={m.loc.avgInfra + "/5"} />
          <Item en="Services" ar="الخدمات" val={m.loc.avgSvc + "/5"} />
          <Item en="Demand" ar="مؤشر الطلب" val={m.loc.popDemand + "%"} color="#1D9E75" />
        </Section>
      </CardContent>
    </Card>
  );
}
