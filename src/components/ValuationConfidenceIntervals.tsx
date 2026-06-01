import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Target } from "lucide-react";
import { fmt } from "@/lib/valuation";

type Method = { name: string; value: number; weight: number; stdErr: number };

function ci95(value: number, stdErr: number) {
  const margin = 1.96 * stdErr;
  return { low: Math.max(0, value - margin), high: value + margin, margin };
}

export default function ValuationConfidenceIntervals({
  prop,
  area,
  txns,
}: { prop: any; area: any; txns: any[] }) {
  const methods = useMemo<Method[]>(() => {
    const sqm = Number(prop.area_sqm);
    const base = Number(prop.base_price);
    const psqm = Number(area?.base_price || base / sqm);

    // Sales Comparison — std err from txn variance
    const prices = (txns || []).map((t: any) => Number(t.price)).filter((p: number) => p > 0);
    const mean = prices.length ? prices.reduce((a: number, b: number) => a + b, 0) / prices.length : base;
    const variance = prices.length > 1 ? prices.reduce((s: number, p: number) => s + (p - mean) ** 2, 0) / (prices.length - 1) : (base * 0.08) ** 2;
    const salesStd = Math.sqrt(variance) / Math.sqrt(Math.max(1, prices.length));
    const salesValue = prices.length ? mean : base;

    // Cost Approach — typically ±10%
    const costValue = psqm * sqm * 0.85 + (area?.land_psqm || 0) * sqm * 0.3;
    const costStd = costValue * 0.10 / 1.96;

    // Income Approach — ±12%
    const annRent = base * 0.06;
    const capRate = 0.075;
    const incomeValue = annRent / capRate;
    const incomeStd = incomeValue * 0.12 / 1.96;

    // Residual (development) — ±18% (highest uncertainty)
    const residualValue = base * 0.92;
    const residualStd = residualValue * 0.18 / 1.96;

    return [
      { name: "المقارنة (Sales)", value: salesValue, weight: 0.45, stdErr: salesStd },
      { name: "التكلفة (Cost)", value: costValue, weight: 0.25, stdErr: costStd },
      { name: "الدخل (Income)", value: incomeValue, weight: 0.20, stdErr: incomeStd },
      { name: "المتبقي (Residual)", value: residualValue, weight: 0.10, stdErr: residualStd },
    ];
  }, [prop, area, txns]);

  // Weighted average value + combined std error
  const weighted = methods.reduce((s, m) => s + m.value * m.weight, 0);
  const combinedStd = Math.sqrt(methods.reduce((s, m) => s + (m.weight * m.stdErr) ** 2, 0));
  const combined = ci95(weighted, combinedStd);
  const reliabilityPct = Math.max(50, Math.min(99, 100 - (combined.margin / weighted) * 100));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          فترات الثقة 95% لكل طريقة تقييم (IVS 105)
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          هامش خطأ ±1.96σ مع وزن مرجّح حسب موثوقية كل منهج
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          {methods.map((m) => {
            const ci = ci95(m.value, m.stdErr);
            const marginPct = (ci.margin / m.value) * 100;
            return (
              <div key={m.name} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-sm">{m.name}</span>
                  <Badge variant="outline" className="text-[10px]">وزن {(m.weight * 100).toFixed(0)}%</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <div className="text-muted-foreground text-[10px]">الحد الأدنى</div>
                    <div className="font-bold text-red-600">{fmt(Math.round(ci.low))} ج</div>
                  </div>
                  <div className="text-center border-x">
                    <div className="text-muted-foreground text-[10px]">القيمة</div>
                    <div className="font-bold">{fmt(Math.round(m.value))} ج</div>
                  </div>
                  <div className="text-left">
                    <div className="text-muted-foreground text-[10px]">الحد الأعلى</div>
                    <div className="font-bold text-emerald-600">{fmt(Math.round(ci.high))} ج</div>
                  </div>
                </div>
                <div className="mt-2 h-2 bg-muted rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-red-400 via-primary to-emerald-400" style={{ width: `${100 - marginPct}%` }} />
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">هامش ±{marginPct.toFixed(1)}%</div>
              </div>
            );
          })}
        </div>

        <div className="border-2 border-primary rounded-lg p-4 bg-primary/5 mt-3">
          <div className="flex items-center justify-between mb-2">
            <span className="font-bold text-sm">القيمة النهائية المرجّحة (Reconciled)</span>
            <Badge className="bg-primary">موثوقية {reliabilityPct.toFixed(1)}%</Badge>
          </div>
          <div className="grid grid-cols-3 gap-2 text-sm">
            <div>
              <div className="text-[10px] text-muted-foreground">CI 95% أدنى</div>
              <div className="font-bold text-red-600">{fmt(Math.round(combined.low))} ج</div>
            </div>
            <div className="text-center">
              <div className="text-[10px] text-muted-foreground">القيمة</div>
              <div className="font-bold text-lg text-primary">{fmt(Math.round(weighted))} ج</div>
            </div>
            <div className="text-left">
              <div className="text-[10px] text-muted-foreground">CI 95% أعلى</div>
              <div className="font-bold text-emerald-600">{fmt(Math.round(combined.high))} ج</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
