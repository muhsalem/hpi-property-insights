import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle } from "lucide-react";
import { affordabilityIndex } from "@/lib/advanced-indicators";
import { fmt } from "@/lib/valuation";

interface Props {
  medianPrice: number;
  annualIncome: number;
  baseRate: number;
}

/**
 * Stress Test - يحاكي تأثير ارتفاع سعر الفائدة على القدرة الشرائية
 */
export default function StressTestCard({ medianPrice, annualIncome, baseRate }: Props) {
  const scenarios = useMemo(() => {
    const rates = [baseRate, baseRate + 0.01, baseRate + 0.02, baseRate + 0.03];
    const tenors = [10, 15, 20, 25];
    return rates.map((r) => ({
      rate: r,
      tenors: tenors.map((t) => {
        const hai = affordabilityIndex(medianPrice, annualIncome, r, t);
        return {
          tenor: t,
          monthlyPayment: hai.monthlyPayment,
          hai: hai.hai,
          burdenPct: (hai.monthlyPayment / (annualIncome / 12)) * 100,
        };
      }),
    }));
  }, [medianPrice, annualIncome, baseRate]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          Stress Test — اختبار حساسية الفائدة
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          سيناريوهات تمويلية (10/15/20/25 سنة) × معدلات فائدة (+0% / +1% / +2% / +3%)
        </p>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs border-b bg-muted/30">
              <tr>
                <th className="p-2 text-right">معدل الفائدة</th>
                {[10, 15, 20, 25].map((t) => (
                  <th key={t} className="p-2 text-center">{t} سنة</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {scenarios.map((s) => (
                <tr key={s.rate} className="border-b last:border-0">
                  <td className="p-2 font-semibold">
                    {(s.rate * 100).toFixed(1)}%
                    {s.rate === baseRate && <Badge variant="secondary" className="mr-2 text-[10px]">حالي</Badge>}
                  </td>
                  {s.tenors.map((t) => {
                    const safe = t.burdenPct <= 35;
                    const stretched = t.burdenPct > 35 && t.burdenPct <= 50;
                    return (
                      <td key={t.tenor} className="p-2 text-center text-xs">
                        <div className="font-mono font-semibold">{fmt(Math.round(t.monthlyPayment))} ج</div>
                        <div className={`text-[10px] ${safe ? "text-green-600" : stretched ? "text-amber-600" : "text-red-600"}`}>
                          {t.burdenPct.toFixed(0)}% من الدخل
                        </div>
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-3 text-xs text-muted-foreground p-3 bg-muted/30 rounded">
          <b>التفسير:</b> النسبة الآمنة ≤ 35% من الدخل · 35-50% مرهقة · &gt;50% غير مستدامة (معايير البنك المركزي).
        </div>
      </CardContent>
    </Card>
  );
}
