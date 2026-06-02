import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Grid } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

/**
 * Sensitivity Heatmap — RICS VPGA 10
 * تحليل حساسية القيمة لتغير Cap Rate × Growth Rate
 * Value = NOI₁ / (CapRate - Growth)  →  Gordon Growth Model
 */
export default function SensitivityHeatmap() {
  const [noi, setNoi] = useState(85000);
  const [baseCap, setBaseCap] = useState(8);
  const [baseGrowth, setBaseGrowth] = useState(5);

  const capRates = useMemo(() => [6, 7, 8, 9, 10, 11], []);
  const growthRates = useMemo(() => [2, 3, 4, 5, 6, 7], []);

  const matrix = useMemo(() => {
    return capRates.map((cap) =>
      growthRates.map((g) => {
        const spread = cap - g;
        if (spread <= 0) return null;
        return (noi * (1 + g / 100)) / (spread / 100);
      })
    );
  }, [capRates, growthRates, noi]);

  const baseValue = useMemo(() => {
    const spread = baseCap - baseGrowth;
    return spread > 0 ? (noi * (1 + baseGrowth / 100)) / (spread / 100) : 0;
  }, [baseCap, baseGrowth, noi]);

  const allValid = matrix.flat().filter((v): v is number => v !== null);
  const min = Math.min(...allValid);
  const max = Math.max(...allValid);

  const colorFor = (v: number | null) => {
    if (v === null) return "bg-gray-200 dark:bg-gray-800";
    const ratio = (v - min) / (max - min || 1);
    if (ratio < 0.25) return "bg-red-200 dark:bg-red-950/60 text-red-900 dark:text-red-200";
    if (ratio < 0.5) return "bg-amber-200 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200";
    if (ratio < 0.75) return "bg-lime-200 dark:bg-lime-950/60 text-lime-900 dark:text-lime-200";
    return "bg-green-300 dark:bg-green-900/60 text-green-900 dark:text-green-200";
  };

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Grid className="h-5 w-5 text-primary" />
          خريطة الحساسية (Sensitivity Heatmap · RICS VPGA 10)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <div><Label className="text-[10px]">NOI السنوي (ج)</Label><Input type="number" value={noi} onChange={(e) => setNoi(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">Cap Rate المرجعي %</Label><Input type="number" value={baseCap} onChange={(e) => setBaseCap(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">Growth المرجعي %</Label><Input type="number" value={baseGrowth} onChange={(e) => setBaseGrowth(+e.target.value)} className="h-8 text-xs" /></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px] border-collapse">
            <thead>
              <tr>
                <th className="p-2 bg-muted text-right">Cap Rate ↓ \ Growth →</th>
                {growthRates.map((g) => (
                  <th key={g} className="p-2 bg-muted text-center">{g}%</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {capRates.map((cap, i) => (
                <tr key={cap}>
                  <td className="p-2 bg-muted font-bold text-center">{cap}%</td>
                  {growthRates.map((g, j) => {
                    const v = matrix[i][j];
                    const isBase = cap === baseCap && g === baseGrowth;
                    return (
                      <td
                        key={j}
                        className={`p-2 text-center font-mono ${colorFor(v)} ${isBase ? "ring-2 ring-primary font-bold" : ""}`}
                      >
                        {v !== null ? fmt(v / 1000) + "k" : "—"}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border p-3 bg-red-50 dark:bg-red-950/30 text-center">
            <div className="text-[10px] text-muted-foreground">الحد الأدنى (سيناريو سلبي)</div>
            <div className="text-sm font-bold text-red-600">{fmt(min)} ج</div>
          </div>
          <div className="rounded border-2 border-primary p-3 bg-primary/5 text-center">
            <div className="text-[10px] text-muted-foreground">السيناريو المرجعي</div>
            <div className="text-base font-bold text-primary">{fmt(baseValue)} ج</div>
          </div>
          <div className="rounded border p-3 bg-green-50 dark:bg-green-950/30 text-center">
            <div className="text-[10px] text-muted-foreground">الحد الأقصى (سيناريو إيجابي)</div>
            <div className="text-sm font-bold text-green-600">{fmt(max)} ج</div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground p-2 bg-muted/20 rounded leading-relaxed">
          <b>المعادلة (Gordon Growth):</b> Value = NOI × (1 + g) ÷ (Cap − g) · يستخدم لتحليل حساسية القيمة الجوهرية لتغير افتراضات معدل الرسملة ومعدل النمو طويل الأجل.
        </div>
      </CardContent>
    </Card>
  );
}
