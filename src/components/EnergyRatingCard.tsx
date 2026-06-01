import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Zap } from "lucide-react";
import { useMemo } from "react";

/**
 * Energy Performance Rating (EPR) — تقدير مبسّط على نمط الاتحاد الأوروبي A-G
 * يحسب استهلاك تقديري سنوي (kWh/m²) من سنة البناء + مستوى التشطيب + الإطلالة + الطابق
 * النتيجة تؤثّر على القيمة السوقية (دراسات JLL: A تفوق G بنسبة 5-15%)
 */

type Grade = { letter: string; color: string; min: number; max: number; uplift: number; label: string };

const GRADES: Grade[] = [
  { letter: "A", color: "#16a34a", min: 0, max: 50, uplift: 8, label: "اقتصادي جداً" },
  { letter: "B", color: "#65a30d", min: 50, max: 90, uplift: 5, label: "كفاءة عالية" },
  { letter: "C", color: "#ca8a04", min: 90, max: 150, uplift: 2, label: "كفاءة جيدة" },
  { letter: "D", color: "#d97706", min: 150, max: 230, uplift: 0, label: "متوسط" },
  { letter: "E", color: "#ea580c", min: 230, max: 330, uplift: -3, label: "أقل من المتوسط" },
  { letter: "F", color: "#dc2626", min: 330, max: 450, uplift: -6, label: "استهلاك مرتفع" },
  { letter: "G", color: "#7f1d1d", min: 450, max: 9999, uplift: -10, label: "غير اقتصادي" },
];

function gradeFor(kwhPerSqm: number): Grade {
  return GRADES.find((g) => kwhPerSqm < g.max) || GRADES[GRADES.length - 1];
}

export default function EnergyRatingCard({ prop }: { prop: any }) {
  const result = useMemo(() => {
    const year = prop.year_built || 1990;
    const age = new Date().getFullYear() - year;

    // قاعدة افتراضية: 220 kWh/m² لمبنى عمره 20 سنة بتشطيب متوسط في مناخ بورسعيد
    let base = 220;

    // العمر يزيد الاستهلاك (عزل أضعف، نوافذ قديمة)
    base += age * 2.2;

    // التشطيب يؤثر — تشطيبات عالية تأتي مع نوافذ وعزل أفضل
    const finishImpact: Record<string, number> = {
      "اكسترا سوبر لوكس": -85,
      "سوبر لوكس": -55,
      "لوكس": -25,
      "نصف تشطيب": 10,
      "بدون تشطيب": 40,
    };
    base += finishImpact[prop.finish] ?? 0;

    // الطابق العالي (تعرّض شمسي + رياح)
    const floor = Number(prop.floor) || 0;
    if (floor >= 8) base += 25;
    else if (floor === 0) base -= 10; // أرضي أبرد

    // الإطلالة على البحر/شارع رئيسي = مزيد من تكييف
    if (prop.view && (prop.view.includes("بحر") || prop.view.includes("رئيسي"))) base += 20;

    // مصعد ووحدات كثيرة بالمبنى = استهلاك مشترك أعلى
    if (prop.profile?.elev) base += 15;

    const kwh = Math.max(30, Math.round(base));
    const grade = gradeFor(kwh);
    const annualKwh = kwh * (prop.area_sqm || 100);
    const annualCost = annualKwh * 1.45; // متوسط تعرفة كهرباء مصرية للسكني 2026

    return { kwh, grade, annualKwh, annualCost };
  }, [prop]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          🔋 شهادة كفاءة الطاقة (Energy Performance Rating)
        </CardTitle>
        <p className="text-xs text-muted-foreground">تقدير على نمط EU EPC — استهلاك متوقع ودرجة كفاءة من A إلى G</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
          <div
            className="w-20 h-24 rounded-lg flex flex-col items-center justify-center text-white font-bold shadow-lg"
            style={{ backgroundColor: result.grade.color }}
          >
            <div className="text-4xl">{result.grade.letter}</div>
            <div className="text-[10px] mt-1 px-1 text-center leading-tight">{result.grade.label}</div>
          </div>
          <div className="flex-1 space-y-1.5">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">استهلاك تقديري:</span>
              <span className="font-bold">{result.kwh} kWh/م²/سنة</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">إجمالي سنوي:</span>
              <span className="font-bold">{result.annualKwh.toLocaleString()} kWh</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">تكلفة سنوية (تقديرية):</span>
              <span className="font-bold text-primary">{Math.round(result.annualCost).toLocaleString()} ج.م</span>
            </div>
            <div className="flex justify-between items-center text-sm pt-1 border-t">
              <span className="text-muted-foreground">أثر على القيمة:</span>
              <Badge variant={result.grade.uplift >= 0 ? "default" : "destructive"}>
                {result.grade.uplift >= 0 ? "+" : ""}{result.grade.uplift}%
              </Badge>
            </div>
          </div>
        </div>

        {/* مقياس A-G الكامل */}
        <div>
          <div className="text-xs font-semibold mb-1.5">📊 سُلّم التصنيف الكامل</div>
          <div className="space-y-1">
            {GRADES.map((g) => {
              const isCurrent = g.letter === result.grade.letter;
              return (
                <div key={g.letter} className="flex items-center gap-2" style={{ opacity: isCurrent ? 1 : 0.5 }}>
                  <div
                    className="w-7 h-6 rounded flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: g.color }}
                  >
                    {g.letter}
                  </div>
                  <div className="text-[11px] text-muted-foreground">
                    {g.min}–{g.max === 9999 ? "∞" : g.max} kWh/م²
                  </div>
                  <div className="text-[11px] flex-1">{g.label}</div>
                  <Badge variant="outline" className="text-[10px]">
                    {g.uplift >= 0 ? "+" : ""}{g.uplift}%
                  </Badge>
                  {isCurrent && <Badge className="text-[10px]">عقارك</Badge>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground p-2 bg-muted/40 rounded leading-relaxed">
          <b>المنهجية:</b> يُحسب الاستهلاك التقديري من عمر المبنى + جودة العزل (تستنتج من مستوى التشطيب) + الطابق والإطلالة. التعرفة المستخدمة 1.45 ج/kWh (شريحة سكني متوسطة). دراسات JLL وKnight Frank تُظهر أن مبنى بتصنيف A يفوق مبنى G بـ 5-15% في السعر.
        </div>
      </CardContent>
    </Card>
  );
}
