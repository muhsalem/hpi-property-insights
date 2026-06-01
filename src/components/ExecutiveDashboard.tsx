import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity, Thermometer, Crown, Flame } from "lucide-react";
import { fmt } from "@/lib/valuation";

type Area = { id: string; name: string; base_price: number; growth: number };
type Prop = { id: string; base_price: number; area_sqm: number };

export default function ExecutiveDashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ["exec-dash"],
    queryFn: async () => {
      const [a, p, t] = await Promise.all([
        supabase.from("areas").select("id,name,base_price,growth"),
        supabase.from("properties").select("id,base_price,area_sqm"),
        supabase.from("transactions").select("price,txn_date"),
      ]);
      return { areas: (a.data || []) as Area[], props: (p.data || []) as Prop[], txns: (t.data || []) as any[] };
    },
  });

  if (isLoading || !data) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full" />)}
      </div>
    );
  }

  const { areas, props, txns } = data;
  const avgPrice = areas.length ? areas.reduce((s, a) => s + Number(a.base_price), 0) / areas.length : 0;
  const avgGrowth = areas.length ? areas.reduce((s, a) => s + Number(a.growth), 0) / areas.length : 0;
  const top = [...areas].sort((a, b) => Number(b.base_price) - Number(a.base_price))[0];
  const hottest = [...areas].sort((a, b) => Number(b.growth) - Number(a.growth))[0];

  // Market temperature: weighted score (price-momentum + transaction-volume)
  const recent = txns.filter((x) => new Date(x.txn_date).getTime() > Date.now() - 365 * 24 * 3600 * 1000).length;
  const tempScore = Math.min(100, Math.round((avgGrowth * 100 * 5) + (recent / Math.max(1, props.length)) * 50));
  const tempLabel = tempScore >= 75 ? "ساخن جداً" : tempScore >= 55 ? "نشط" : tempScore >= 35 ? "متوازن" : "هادئ";
  const tempColor = tempScore >= 75 ? "bg-red-500" : tempScore >= 55 ? "bg-orange-500" : tempScore >= 35 ? "bg-yellow-500" : "bg-blue-500";

  const trend = avgGrowth >= 0;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Activity className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-bold">لوحة المؤشرات التنفيذية</h2>
        <Badge variant="secondary" className="mr-auto">{areas.length} منطقة · {props.length} عقار · {txns.length} صفقة</Badge>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="border-r-4 border-r-primary">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Activity className="h-3 w-3" />متوسط سعر السوق
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{fmt(Math.round(avgPrice))}</div>
            <div className="text-[10px] text-muted-foreground">جم/م² · على مستوى المحافظة</div>
          </CardContent>
        </Card>

        <Card className={`border-r-4 ${trend ? "border-r-green-500" : "border-r-red-500"}`}>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              {trend ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
              متوسط نمو الأسعار
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${trend ? "text-green-600" : "text-red-600"}`}>
              {trend ? "+" : ""}{(avgGrowth * 100).toFixed(2)}%
            </div>
            <div className="text-[10px] text-muted-foreground">سنوي · مرجح بعدد المناطق</div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Crown className="h-3 w-3" />أعلى منطقة سعراً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold truncate">{top?.name || "—"}</div>
            <div className="text-sm">{fmt(Math.round(Number(top?.base_price || 0)))} جم/م²</div>
          </CardContent>
        </Card>

        <Card className="border-r-4 border-r-rose-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-1">
              <Flame className="h-3 w-3" />الأسرع نمواً
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-base font-bold truncate">{hottest?.name || "—"}</div>
            <div className="text-sm text-rose-600">+{((Number(hottest?.growth || 0)) * 100).toFixed(2)}%</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Thermometer className="h-4 w-4 text-primary" />
            مؤشر حرارة السوق (Market Temperature)
            <Badge className="mr-auto" variant="outline">{tempLabel}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold w-16">{tempScore}</div>
            <div className="flex-1">
              <div className="h-3 bg-muted rounded overflow-hidden">
                <div className={`h-full ${tempColor} transition-all`} style={{ width: `${tempScore}%` }} />
              </div>
              <div className="flex justify-between text-[10px] text-muted-foreground mt-1">
                <span>هادئ</span><span>متوازن</span><span>نشط</span><span>ساخن</span>
              </div>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            مؤشر مركّب من نمو الأسعار السنوي + كثافة الصفقات في آخر ١٢ شهر — يساعد المثمّن في تقدير سيولة السوق وسرعة التداول.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
