import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Dice5, Play } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

// Box-Muller transform → توزيع طبيعي
function randNormal(mean: number, std: number) {
  const u = 1 - Math.random();
  const v = Math.random();
  return mean + std * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

export default function MonteCarloSimulation() {
  const [baseValue, setBaseValue] = useState(5_000_000);
  const [volatility, setVolatility] = useState(12); // %
  const [iterations, setIterations] = useState(10000);
  const [results, setResults] = useState<number[]>([]);
  const [running, setRunning] = useState(false);

  const run = () => {
    setRunning(true);
    setTimeout(() => {
      const arr: number[] = [];
      const std = baseValue * (volatility / 100);
      for (let i = 0; i < iterations; i++) {
        arr.push(Math.max(0, randNormal(baseValue, std)));
      }
      setResults(arr);
      setRunning(false);
    }, 50);
  };

  const stats = useMemo(() => {
    if (!results.length) return null;
    const sorted = [...results].sort((a, b) => a - b);
    const mean = results.reduce((s, v) => s + v, 0) / results.length;
    const median = sorted[Math.floor(sorted.length / 2)];
    const p5 = sorted[Math.floor(sorted.length * 0.05)];
    const p95 = sorted[Math.floor(sorted.length * 0.95)];
    const var95 = baseValue - p5; // Value at Risk

    // عمل 20 bucket
    const min = sorted[0], max = sorted[sorted.length - 1];
    const buckets = 20;
    const step = (max - min) / buckets;
    const hist: { range: string; count: number; mid: number }[] = [];
    for (let i = 0; i < buckets; i++) {
      const lo = min + i * step, hi = lo + step;
      const count = results.filter(v => v >= lo && v < hi).length;
      hist.push({ range: `${(lo/1e6).toFixed(1)}م`, count, mid: (lo + hi) / 2 });
    }
    return { mean, median, p5, p95, var95, hist };
  }, [results, baseValue]);

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Dice5 className="h-5 w-5 text-indigo-600" />
          محاكاة مونت كارلو (Monte Carlo)
        </CardTitle>
        <p className="text-xs text-muted-foreground">10,000 سيناريو لقياس توزيع القيم المحتملة وقيمة المخاطرة (VaR 95%)</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-4 gap-3">
          <div>
            <Label className="text-xs">القيمة الأساسية</Label>
            <Input type="number" value={baseValue} onChange={(e) => setBaseValue(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">التذبذب %</Label>
            <Input type="number" value={volatility} onChange={(e) => setVolatility(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">عدد المحاكاة</Label>
            <Input type="number" value={iterations} onChange={(e) => setIterations(+e.target.value || 0)} />
          </div>
          <div className="flex items-end">
            <Button onClick={run} disabled={running} className="w-full gap-1">
              <Play className="h-4 w-4" /> {running ? "..." : "تشغيل"}
            </Button>
          </div>
        </div>

        {stats && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 pt-3 border-t">
              <Stat label="المتوسط" v={stats.mean} />
              <Stat label="الوسيط" v={stats.median} />
              <Stat label="P5 (سيناريو سيئ)" v={stats.p5} tone="bad" />
              <Stat label="P95 (سيناريو جيد)" v={stats.p95} tone="good" />
              <Stat label="VaR 95%" v={stats.var95} tone="bad" />
            </div>

            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={stats.hist}>
                  <XAxis dataKey="range" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <ReferenceLine x={stats.hist.find(h => h.mid >= baseValue)?.range} stroke="hsl(var(--primary))" strokeDasharray="3 3" label={{ value: "الأساس", fontSize: 10 }} />
                  <Bar dataKey="count" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <p className="text-[11px] text-muted-foreground bg-muted/30 p-2 rounded">
              📊 احتمال أن تنخفض القيمة عن {fmt(stats.p5)} ج.م لا يتجاوز 5% — استخدم هذا الرقم لتحديد هامش الأمان البنكي.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, v, tone }: { label: string; v: number; tone?: "good" | "bad" }) {
  const color = tone === "good" ? "text-green-600" : tone === "bad" ? "text-destructive" : "";
  return (
    <div className="p-2 rounded bg-muted/30">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-sm font-bold ${color}`}>{fmt(v)}</div>
    </div>
  );
}
