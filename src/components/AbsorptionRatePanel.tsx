import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Activity, TrendingUp, Package, Clock } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend } from "recharts";

/**
 * مؤشر امتصاص السوق (Absorption Rate) ومخزون العرض المستقبلي (Pipeline Supply)
 * - Absorption Rate = صفقات آخر 30 يوم ÷ إجمالي المعروض النشط
 * - Months of Inventory = إجمالي المعروض ÷ متوسط الصفقات الشهرية
 * - Pipeline = نسبة المباني تحت الإنشاء (تقدير من properties.year_built)
 */
export default function AbsorptionRatePanel() {
  const { data, isLoading } = useQuery({
    queryKey: ["absorption"],
    queryFn: async () => {
      const [p, t, a] = await Promise.all([
        supabase.from("properties").select("id,area_id,year_built,base_price"),
        supabase.from("transactions").select("price,txn_date,property_id"),
        supabase.from("areas").select("id,name,district_id"),
      ]);
      return { props: p.data || [], txns: t.data || [], areas: a.data || [] };
    },
  });

  const analysis = useMemo(() => {
    if (!data) return null;
    const { props, txns, areas } = data;
    const now = Date.now();
    const day = 24 * 3600 * 1000;
    const last30 = txns.filter((t: any) => now - new Date(t.txn_date).getTime() <= 30 * day);
    const last12mo = txns.filter((t: any) => now - new Date(t.txn_date).getTime() <= 365 * day);

    const totalInventory = props.length;
    const monthlySalesAvg = last12mo.length / 12;
    const monthsOfInventory = monthlySalesAvg > 0 ? totalInventory / monthlySalesAvg : 99;
    const absorptionRate = totalInventory > 0 ? (last30.length / totalInventory) * 100 : 0;

    // Pipeline: مبانٍ حديثة (آخر 3 سنوات) كنسبة من الإجمالي
    const newBuilds = props.filter((p: any) => p.year_built && new Date().getFullYear() - p.year_built <= 3).length;
    const pipelinePct = totalInventory > 0 ? (newBuilds / totalInventory) * 100 : 0;

    // حسب المنطقة
    const perArea = areas.map((a: any) => {
      const areaProps = props.filter((p: any) => p.area_id === a.id);
      const areaPropIds = new Set(areaProps.map((p: any) => p.id));
      const areaTxns12 = last12mo.filter((t: any) => areaPropIds.has(t.property_id));
      const moi = areaTxns12.length > 0 ? areaProps.length / (areaTxns12.length / 12) : 99;
      return {
        name: a.name,
        inventory: areaProps.length,
        sales12mo: areaTxns12.length,
        moi: +Math.min(moi, 60).toFixed(1),
      };
    }).filter((x) => x.inventory > 0).sort((a, b) => a.moi - b.moi).slice(0, 12);

    return { totalInventory, monthlySalesAvg, monthsOfInventory, absorptionRate, pipelinePct, newBuilds, perArea };
  }, [data]);

  if (isLoading || !analysis) return <Skeleton className="h-96 w-full" />;

  // معايير NAR: <6 شهور سوق بائعين، 6-9 متوازن، >9 سوق مشترين
  const moi = analysis.monthsOfInventory;
  const marketType = moi < 6 ? "سوق بائعين" : moi <= 9 ? "متوازن" : "سوق مشترين";
  const moiColor = moi < 6 ? "bg-green-500" : moi <= 9 ? "bg-amber-500" : "bg-rose-500";

  return (
    <div className="space-y-4" dir="rtl">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI icon={Activity} label="معدل الامتصاص الشهري" value={`${analysis.absorptionRate.toFixed(2)}%`} sub="من المعروض النشط" />
        <KPI icon={Clock} label="أشهر العرض" value={moi.toFixed(1)} sub={marketType} highlight color={moiColor} />
        <KPI icon={Package} label="إجمالي المعروض" value={analysis.totalInventory.toLocaleString()} sub={`${analysis.monthlySalesAvg.toFixed(1)} صفقة/شهر`} />
        <KPI icon={TrendingUp} label="معروض مستقبلي (Pipeline)" value={`${analysis.pipelinePct.toFixed(1)}%`} sub={`${analysis.newBuilds} مبنى حديث (≤3 سنوات)`} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            أشهر العرض حسب المنطقة (Months of Inventory)
          </CardTitle>
          <p className="text-xs text-muted-foreground">
            معيار NAR: &lt;6 شهور = سوق بائعين (طلب أعلى من العرض) · 6-9 متوازن · &gt;9 سوق مشترين (فائض عرض)
          </p>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={analysis.perArea} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={100} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend />
              <Bar dataKey="moi" name="أشهر العرض" fill="hsl(var(--primary))" />
              <Bar dataKey="sales12mo" name="صفقات/سنة" fill="hsl(var(--chart-2, 142 76% 36%))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-3 flex-wrap">
            <Badge variant={moi < 6 ? "default" : moi <= 9 ? "secondary" : "destructive"} className="text-sm">
              تصنيف السوق الحالي: {marketType}
            </Badge>
            <p className="text-xs text-muted-foreground flex-1">
              {moi < 6
                ? "العرض يُمتص بسرعة — أسعار صاعدة، توصية بالشراء قبل ارتفاع إضافي."
                : moi <= 9
                ? "العرض والطلب متوازنان — استقرار نسبي للأسعار."
                : "فائض في المعروض — قوة تفاوضية للمشتري وضغط هبوطي على الأسعار."}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KPI({ icon: Icon, label, value, sub, highlight, color }: any) {
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="p-3">
        <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
          <Icon className="h-3.5 w-3.5" />{label}
        </div>
        <div className={`text-2xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
        {color && <div className={`h-1 rounded mt-2 ${color}`} />}
      </CardContent>
    </Card>
  );
}
