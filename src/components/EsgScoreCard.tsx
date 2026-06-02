import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Leaf, Users, Building2 } from "lucide-react";

// RICS Sustainability Report 2023 — ESG impact on valuation
type Axis = { key: string; label: string; icon: any; color: string; items: { key: string; label: string }[] };

const AXES: Axis[] = [
  { key: "E", label: "بيئي (Environmental)", icon: Leaf, color: "text-green-600", items: [
    { key: "energy", label: "كفاءة الطاقة" },
    { key: "water", label: "ترشيد المياه" },
    { key: "materials", label: "مواد مستدامة" },
    { key: "carbon", label: "بصمة كربونية" },
  ]},
  { key: "S", label: "اجتماعي (Social)", icon: Users, color: "text-blue-600", items: [
    { key: "access", label: "إتاحة لذوي الهمم" },
    { key: "comfort", label: "راحة الشاغلين" },
    { key: "community", label: "خدمة المجتمع" },
    { key: "safety", label: "أمان وسلامة" },
  ]},
  { key: "G", label: "حوكمة (Governance)", icon: Building2, color: "text-purple-600", items: [
    { key: "compliance", label: "التزام قانوني" },
    { key: "transparency", label: "شفافية المالك" },
    { key: "maintenance", label: "إدارة وصيانة" },
    { key: "documentation", label: "توثيق فني" },
  ]},
];

export default function EsgScoreCard() {
  const [scores, setScores] = useState<Record<string, number>>(() => {
    const init: Record<string, number> = {};
    AXES.forEach(a => a.items.forEach(i => init[`${a.key}_${i.key}`] = 6));
    return init;
  });

  const summary = useMemo(() => {
    return AXES.map(a => {
      const vals = a.items.map(i => scores[`${a.key}_${i.key}`] ?? 0);
      const avg = vals.reduce((s, v) => s + v, 0) / vals.length;
      return { key: a.key, label: a.label, color: a.color, avg };
    });
  }, [scores]);

  const totalScore = summary.reduce((s, x) => s + x.avg, 0) / summary.length;
  const grade = totalScore >= 8 ? "A — أخضر متميز" : totalScore >= 6.5 ? "B — جيد" : totalScore >= 5 ? "C — متوسط" : "D — يحتاج تطوير";
  const valuePremium = totalScore >= 8 ? "+8% to +12%" : totalScore >= 6.5 ? "+3% to +6%" : totalScore >= 5 ? "0%" : "-3% to -7%";

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Leaf className="h-5 w-5 text-green-600" />
          درجة الاستدامة ESG
        </CardTitle>
        <p className="text-xs text-muted-foreground">RICS Sustainability Report 2023 — تقييم الأثر البيئي/الاجتماعي/الحوكمي على القيمة</p>
      </CardHeader>
      <CardContent className="space-y-4">
        {AXES.map(axis => {
          const Icon = axis.icon;
          return (
            <div key={axis.key} className="space-y-2">
              <div className={`flex items-center gap-2 text-sm font-semibold ${axis.color}`}>
                <Icon className="h-4 w-4" /> {axis.label}
              </div>
              {axis.items.map(item => {
                const k = `${axis.key}_${item.key}`;
                const v = scores[k] ?? 0;
                return (
                  <div key={k} className="grid grid-cols-3 gap-2 items-center">
                    <span className="text-xs text-muted-foreground col-span-1">{item.label}</span>
                    <div className="col-span-1">
                      <Slider value={[v]} onValueChange={(nv) => setScores(s => ({ ...s, [k]: nv[0] }))} min={0} max={10} step={1} />
                    </div>
                    <span className="text-xs font-bold col-span-1 text-left">{v}/10</span>
                  </div>
                );
              })}
            </div>
          );
        })}

        <div className="pt-3 border-t grid grid-cols-3 gap-3">
          {summary.map(s => (
            <div key={s.key} className="p-2 rounded bg-muted/30 text-center">
              <div className={`text-xs ${s.color}`}>{s.key}</div>
              <div className="text-lg font-bold">{s.avg.toFixed(1)}</div>
            </div>
          ))}
        </div>

        <div className="p-3 rounded bg-green-50 dark:bg-green-950/20 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">التصنيف العام</div>
            <div className="font-bold text-green-700 dark:text-green-400">{grade}</div>
          </div>
          <div className="text-left">
            <div className="text-xs text-muted-foreground">أثر ESG على القيمة</div>
            <div className="font-bold">{valuePremium}</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
