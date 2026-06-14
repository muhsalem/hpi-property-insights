import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Hammer, Percent } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import {
  BUILDING_COMPONENTS,
  computeDepreciation,
  type Condition,
} from "@/lib/depreciation";

const CONDITION_LABEL: Record<Condition, string> = {
  excellent: "ممتاز",
  good: "جيد",
  fair: "مقبول",
  poor: "ضعيف",
};

export default function MultiComponentDepreciationPanel() {
  const [age, setAge] = useState(15);
  const [globalCond, setGlobalCond] = useState<Condition>("good");
  const [overrides, setOverrides] = useState<Partial<Record<string, Condition>>>({});

  const result = useMemo(
    () => computeDepreciation(age, globalCond, overrides),
    [age, globalCond, overrides],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Hammer className="h-5 w-5 text-primary" />
          منحنى إهلاك متعدد المكونات (IVS 410)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">عمر المبنى (سنة): {age}</Label>
            <Slider
              value={[age]}
              min={0}
              max={80}
              step={1}
              onValueChange={(v) => setAge(v[0])}
              className="mt-2"
            />
          </div>
          <div>
            <Label className="text-xs">الحالة العامة</Label>
            <Select value={globalCond} onValueChange={(v) => setGlobalCond(v as Condition)}>
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
                  <SelectItem key={c} value={c}>{CONDITION_LABEL[c]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="rounded-md border divide-y">
          {result.perComponent.map((r) => {
            const comp = BUILDING_COMPONENTS.find((c) => c.key === r.componentKey)!;
            return (
              <div key={r.componentKey} className="p-2 text-xs space-y-1">
                <div className="flex items-center justify-between">
                  <div className="font-medium">{r.label}</div>
                  <div className="text-muted-foreground">
                    حصة {Math.round(r.share * 100)}% · عمر افتراضي {comp.usefulLife} سنة
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={r.depreciationPct * 100} className="h-2 flex-1" />
                  <span className="w-12 text-left tabular-nums">{Math.round(r.depreciationPct * 100)}%</span>
                  <Select
                    value={overrides[r.componentKey] ?? globalCond}
                    onValueChange={(v) =>
                      setOverrides({ ...overrides, [r.componentKey]: v as Condition })
                    }
                  >
                    <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CONDITION_LABEL) as Condition[]).map((c) => (
                        <SelectItem key={c} value={c}>{CONDITION_LABEL[c]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            );
          })}
        </div>

        <div className="rounded-md bg-primary/10 p-3 flex items-center justify-between">
          <div className="text-sm font-semibold flex items-center gap-2">
            <Percent className="h-4 w-4" /> الإهلاك الكلي المرجّح
          </div>
          <div className="text-xl font-bold text-primary">
            {(result.totalDepreciationPct * 100).toFixed(1)}%
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground leading-6">
          منهجية متعددة المكونات: كل عنصر له عمر افتراضي مختلف (الهيكل 80 سنة، التشطيبات 20 سنة...).
          العمر الفعّال = العمر الزمني × معامل الحالة. النتيجة أدق من معادلة الإهلاك الموحّد ومتوافقة مع
          IVS 410 و Marshall &amp; Swift.
        </p>
      </CardContent>
    </Card>
  );
}
