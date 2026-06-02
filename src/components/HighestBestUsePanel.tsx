import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Target, CheckCircle2, XCircle } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

interface UseScenario {
  id: number;
  name: string;
  legallyPermitted: boolean;
  physicallyPossible: boolean;
  financiallyFeasible: boolean;
  maxProductivity: number; // القيمة المتوقعة
  notes: string;
}

/**
 * Highest & Best Use — IVS 104 §140
 * تحليل أعلى وأفضل استخدام (4 معايير: قانوني · فيزيائي · مالي · أقصى إنتاجية)
 */
export default function HighestBestUsePanel() {
  const [scenarios, setScenarios] = useState<UseScenario[]>([
    { id: 1, name: "الاستخدام الحالي (سكني)", legallyPermitted: true, physicallyPossible: true, financiallyFeasible: true, maxProductivity: 1650000, notes: "الاستخدام السائد في المنطقة" },
    { id: 2, name: "تحويل للاستخدام التجاري (محلات)", legallyPermitted: true, physicallyPossible: true, financiallyFeasible: true, maxProductivity: 2100000, notes: "الدور الأرضي على شارع رئيسي" },
    { id: 3, name: "إعادة تطوير (هدم + برج)", legallyPermitted: true, physicallyPossible: true, financiallyFeasible: false, maxProductivity: 1850000, notes: "تكلفة الهدم مرتفعة + قيود ارتفاع" },
    { id: 4, name: "تحويل لفندق/Airbnb", legallyPermitted: false, physicallyPossible: true, financiallyFeasible: true, maxProductivity: 2400000, notes: "غير مسموح بالنشاط السياحي في الحي" },
  ]);

  const [conclusion, setConclusion] = useState(
    "بعد تحليل المعايير الأربعة، يُعد التحويل للاستخدام التجاري هو الاستخدام الأعلى والأفضل، حيث يستوفي جميع الشروط القانونية والفيزيائية والمالية ويحقق أقصى قيمة (2,100,000 ج)."
  );

  const update = (id: number, field: keyof UseScenario, value: any) =>
    setScenarios(scenarios.map((s) => (s.id === id ? { ...s, [field]: value } : s)));

  const evaluated = useMemo(() => {
    return scenarios.map((s) => {
      const passes = s.legallyPermitted && s.physicallyPossible && s.financiallyFeasible;
      return { ...s, passes };
    });
  }, [scenarios]);

  const hbu = useMemo(() => {
    const valid = evaluated.filter((s) => s.passes);
    if (valid.length === 0) return null;
    return valid.reduce((max, s) => (s.maxProductivity > max.maxProductivity ? s : max), valid[0]);
  }, [evaluated]);

  const Cell = ({ v, set }: { v: boolean; set: (b: boolean) => void }) => (
    <button onClick={() => set(!v)} className="mx-auto block">
      {v ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-red-500" />}
    </button>
  );

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          أعلى وأفضل استخدام (Highest & Best Use · IVS 104)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-2 text-right">السيناريو</th>
                <th className="p-2 text-center">قانوني</th>
                <th className="p-2 text-center">فيزيائي</th>
                <th className="p-2 text-center">مالي</th>
                <th className="p-2 text-center">القيمة المتوقعة</th>
                <th className="p-2 text-right">ملاحظات</th>
                <th className="p-2 text-center">النتيجة</th>
              </tr>
            </thead>
            <tbody>
              {evaluated.map((s) => (
                <tr key={s.id} className={`border-b ${hbu?.id === s.id ? "bg-primary/10" : ""}`}>
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2"><Cell v={s.legallyPermitted} set={(b) => update(s.id, "legallyPermitted", b)} /></td>
                  <td className="p-2"><Cell v={s.physicallyPossible} set={(b) => update(s.id, "physicallyPossible", b)} /></td>
                  <td className="p-2"><Cell v={s.financiallyFeasible} set={(b) => update(s.id, "financiallyFeasible", b)} /></td>
                  <td className="p-2"><Input type="number" value={s.maxProductivity} onChange={(e) => update(s.id, "maxProductivity", +e.target.value)} className="h-7 text-xs w-28" /></td>
                  <td className="p-2"><Input value={s.notes} onChange={(e) => update(s.id, "notes", e.target.value)} className="h-7 text-xs" /></td>
                  <td className="p-2 text-center">
                    {hbu?.id === s.id ? <Badge className="bg-primary text-white">HBU ⭐</Badge> :
                      s.passes ? <Badge variant="secondary" className="text-[10px]">مقبول</Badge> :
                      <Badge variant="destructive" className="text-[10px]">مرفوض</Badge>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {hbu && (
          <div className="rounded border-2 border-primary p-3 bg-primary/5">
            <div className="text-xs font-semibold mb-1">📌 الاستخدام الأعلى والأفضل:</div>
            <div className="text-base font-bold text-primary">{hbu.name}</div>
            <div className="text-sm mt-1">القيمة المتوقعة: <b>{fmt(hbu.maxProductivity)} ج</b></div>
          </div>
        )}

        <div>
          <Label className="text-xs">الاستنتاج التحليلي</Label>
          <Textarea value={conclusion} onChange={(e) => setConclusion(e.target.value)} rows={3} className="text-xs mt-1" />
        </div>
      </CardContent>
    </Card>
  );
}
