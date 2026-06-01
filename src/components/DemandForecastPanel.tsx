import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from "recharts";
import { TrendingUp, Calendar } from "lucide-react";

// Holt linear trend forecast (double exponential smoothing)
function holtForecast(values: number[], periods: number, alpha = 0.6, beta = 0.3): number[] {
  if (values.length < 2) return Array(periods).fill(values[0] || 0);
  let level = values[0];
  let trend = values[1] - values[0];
  for (let i = 1; i < values.length; i++) {
    const prevLevel = level;
    level = alpha * values[i] + (1 - alpha) * (level + trend);
    trend = beta * (level - prevLevel) + (1 - beta) * trend;
  }
  const forecast: number[] = [];
  for (let h = 1; h <= periods; h++) forecast.push(level + h * trend);
  return forecast;
}

export default function DemandForecastPanel() {
  const { data: txns } = useQuery({
    queryKey: ["forecast-txns"],
    queryFn: async () => (await supabase.from("transactions").select("txn_date,price")).data || [],
  });
  const { data: districts } = useQuery({
    queryKey: ["forecast-districts"],
    queryFn: async () => (await supabase.from("districts").select("name,growth_rate,net_migration,population")).data || [],
  });

  const chartData = useMemo(() => {
    if (!txns || txns.length === 0) return [];
    // group by year
    const byYear: Record<string, number[]> = {};
    txns.forEach((t: any) => {
      const y = String(new Date(t.txn_date).getFullYear());
      (byYear[y] = byYear[y] || []).push(Number(t.price));
    });
    const years = Object.keys(byYear).sort();
    const counts = years.map((y) => byYear[y].length);
    const future = holtForecast(counts, 4).map((v) => Math.max(0, Math.round(v)));
    const lastYear = parseInt(years[years.length - 1] || "2025");
    const all = [
      ...years.map((y, i) => ({ year: y, historical: counts[i], forecast: null as any })),
      ...future.map((v, i) => ({ year: String(lastYear + i + 1), historical: null as any, forecast: v })),
    ];
    return all;
  }, [txns]);

  const demandScore = useMemo(() => {
    if (!districts) return null;
    const avgGrowth = districts.reduce((s: number, d: any) => s + Number(d.growth_rate || 0), 0) / Math.max(1, districts.length);
    const avgMig = districts.reduce((s: number, d: any) => s + Number(d.net_migration || 0), 0) / Math.max(1, districts.length);
    const score = Math.min(100, Math.max(0, 50 + avgGrowth * 1000 + avgMig * 15));
    const label = score >= 70 ? "طلب مرتفع متوقع" : score >= 50 ? "طلب متوسط" : "طلب منخفض";
    const color = score >= 70 ? "bg-emerald-600" : score >= 50 ? "bg-amber-500" : "bg-red-500";
    return { score: Math.round(score), label, color };
  }, [districts]);

  const lastHistYear = chartData.find((d: any) => d.historical && !chartData[chartData.indexOf(d) + 1]?.historical)?.year;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          توقّع الطلب المستقبلي (Holt Forecast — 4 سنوات)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          نموذج التنبؤ بالاتجاه الخطي مع تخفيف مزدوج — يجمع بين عدد المعاملات التاريخية ومؤشرات النمو الديموغرافي
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {demandScore && (
          <div className="flex items-center gap-3 p-3 border rounded-lg bg-muted/30">
            <div className={`px-3 py-2 rounded-lg ${demandScore.color} text-white text-2xl font-bold`}>{demandScore.score}</div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{demandScore.label}</div>
              <div className="text-[11px] text-muted-foreground">Demand Score (0-100) — مزيج من النمو + الهجرة</div>
            </div>
            <Badge variant="outline" className="gap-1"><Calendar className="h-3 w-3" />أفق 4 سنوات</Badge>
          </div>
        )}

        <ResponsiveContainer width="100%" height={280}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis dataKey="year" />
            <YAxis label={{ value: "عدد المعاملات", angle: -90, position: "insideLeft" }} />
            <Tooltip />
            <Legend />
            {lastHistYear && <ReferenceLine x={lastHistYear} stroke="hsl(var(--primary))" strokeDasharray="4 4" label="اليوم" />}
            <Line type="monotone" dataKey="historical" stroke="hsl(var(--primary))" strokeWidth={2} name="تاريخي" dot />
            <Line type="monotone" dataKey="forecast" stroke="hsl(var(--chart-2, 220 70% 50%))" strokeWidth={2} strokeDasharray="5 5" name="توقّع" dot />
          </LineChart>
        </ResponsiveContainer>

        <div className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
          <b>المنهجية:</b> α=0.6 (وزن البيانات الحديثة)، β=0.3 (تكيف الاتجاه). دقة النموذج تتحسّن بتراكم المعاملات.
        </div>
      </CardContent>
    </Card>
  );
}
