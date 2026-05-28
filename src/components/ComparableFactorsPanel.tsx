import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Scale, RotateCcw } from "lucide-react";
import {
  COMPARABLE_FACTORS,
  defaultFactorsState,
  totalFactorsAdjustmentPct,
  type FactorsStateMap,
} from "@/lib/comparable-factors";

type Props = {
  baseValue: number;                          // قيمة البيع المقارن قبل تعديلات الخبير
  onAdjustedChange?: (adjusted: number, totalPct: number, state: FactorsStateMap) => void;
};

export function ComparableFactorsPanel({ baseValue, onAdjustedChange }: Props) {
  const [state, setState] = useState<FactorsStateMap>(() => defaultFactorsState());

  const totalPct = useMemo(() => totalFactorsAdjustmentPct(state), [state]);
  const adjusted = useMemo(() => baseValue * (1 + totalPct / 100), [baseValue, totalPct]);

  useMemo(() => { onAdjustedChange?.(adjusted, totalPct, state); }, [adjusted, totalPct, state, onAdjustedChange]);

  const setEnabled = (code: string, v: boolean) =>
    setState(prev => ({ ...prev, [code]: { ...prev[code], enabled: v } }));
  const setValue = (code: string, v: number) =>
    setState(prev => ({ ...prev, [code]: { ...prev[code], value: v } }));
  const reset = () => setState(defaultFactorsState());

  const fmt = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(n);
  const totalEnabled = Object.values(state).filter(s => s.enabled).length;
  const positives = Object.values(state).filter(s => s.enabled && s.value > 0).length;
  const negatives = Object.values(state).filter(s => s.enabled && s.value < 0).length;
  const color = totalPct > 0 ? "#1D9E75" : totalPct < 0 ? "#D85A30" : "#185FA5";

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Scale className="h-5 w-5 text-primary" />
            عوامل خبير التقييم على البيع المقارن — 64 عاملاً في 7 محاور
          </CardTitle>
          <Button variant="ghost" size="sm" onClick={reset}><RotateCcw className="h-3.5 w-3.5 ml-1" />إعادة ضبط</Button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
          <Stat label="القيمة الأصلية SC" value={fmt(baseValue) + " ج"} />
          <Stat label="إجمالي التعديل" value={(totalPct >= 0 ? "+" : "") + totalPct.toFixed(1) + "%"} color={color} />
          <Stat label="القيمة بعد التعديل" value={fmt(adjusted) + " ج"} color={color} bold />
          <Stat label="عوامل مفعّلة" value={`${totalEnabled} (↑${positives} / ↓${negatives})`} />
        </div>
      </CardHeader>

      <CardContent>
        <Accordion type="multiple" className="w-full">
          {COMPARABLE_FACTORS.map(branch => {
            const onCount = branch.factors.filter(f => state[f.code]?.enabled).length;
            return (
              <AccordionItem key={branch.key} value={branch.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <div className="h-3 w-3 rounded-full" style={{ background: branch.color }} />
                    <div className="flex-1 text-right font-semibold text-sm">{branch.ar}</div>
                    <Badge variant="outline" className="text-[10px]">{branch.factors.length} عامل</Badge>
                    {onCount > 0 && <Badge className="text-[10px] bg-primary/10 text-primary hover:bg-primary/10">{onCount} مفعّل</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-r-2 pr-3 mr-2 space-y-1" style={{ borderColor: branch.color }}>
                    {branch.factors.map(f => {
                      const s = state[f.code];
                      const sign = s.value > 0 ? "text-[#1D9E75]" : s.value < 0 ? "text-[#D85A30]" : "text-muted-foreground";
                      return (
                        <div key={f.code} className={`flex items-center gap-2 py-1.5 px-2 rounded text-xs ${s.enabled ? "bg-accent/50" : "hover:bg-accent/30"}`}>
                          <Checkbox checked={s.enabled} onCheckedChange={v => setEnabled(f.code, !!v)} />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="text-[9px] font-mono text-muted-foreground">{f.code}</span>
                              <span className="font-medium">{f.ar}</span>
                            </div>
                            <div className="text-[10px] text-muted-foreground">{f.effect}</div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              value={s.value}
                              onChange={e => setValue(f.code, +e.target.value)}
                              disabled={!s.enabled}
                              className="w-20 h-7 text-xs text-center"
                              step="0.5"
                            />
                            <span className={`text-xs font-bold w-5 ${sign}`}>%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, color, bold }: { label: string; value: string; color?: string; bold?: boolean }) {
  return (
    <div className="text-center p-2 bg-muted rounded">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`${bold ? "text-lg font-bold" : "text-sm font-semibold"}`} style={color ? { color } : undefined}>{value}</div>
    </div>
  );
}
