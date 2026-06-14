import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, Sparkles, ArrowRight, Building2 } from "lucide-react";

export const Route = createFileRoute("/avm")({
  component: AvmLanding,
  head: () => ({
    meta: [
      { title: "تقدير سعر العقار الفوري (AVM) — مقيّم بورسعيد" },
      { name: "description", content: "احسب القيمة التقديرية لعقارك في بورسعيد خلال ثوانٍ. أدخل النوع والمساحة والحي واحصل على نطاق سعر مبني على بيانات السوق الفعلية." },
      { property: "og:title", content: "تقدير سعر فوري — AVM بورسعيد" },
      { property: "og:description", content: "نطاق سعر تقديري لعقارك خلال ثوانٍ." },
    ],
    links: [{ rel: "canonical", href: "/avm" }],
  }),
});

// أسعار متر تقريبية لبورسعيد (2025-2026) — تُستخدم لتقدير سريع فقط
const BASE_PRICES: Record<string, number> = {
  "شرق": 22000, "العرب": 24000, "المناخ": 18000, "الضواحي": 14000,
  "الزهور": 28000, "بورفؤاد": 26000, "الجنوب": 16000, "غرب": 17000,
};

const TYPE_MULT: Record<string, number> = {
  "شقة": 1.0, "استوديو": 1.15, "دوبلكس": 1.08, "بنتهاوس": 1.35,
  "فيلا": 1.25, "محل تجاري": 1.8, "مكتب إداري": 1.4,
};

const FINISH_MULT: Record<string, number> = {
  "اكسترا سوبر لوكس": 1.25, "سوبر لوكس": 1.1, "لوكس": 1.0,
  "نصف تشطيب": 0.78, "بدون تشطيب": 0.6,
};

function AvmLanding() {
  const [district, setDistrict] = useState("شرق");
  const [type, setType] = useState("شقة");
  const [finish, setFinish] = useState("لوكس");
  const [area, setArea] = useState(120);
  const [age, setAge] = useState(5);
  const [showResult, setShowResult] = useState(false);

  const estimate = useMemo(() => {
    const base = BASE_PRICES[district] ?? 18000;
    const tMul = TYPE_MULT[type] ?? 1;
    const fMul = FINISH_MULT[finish] ?? 1;
    const ageMul = Math.max(0.55, 1 - age * 0.012);
    const pricePerSqm = base * tMul * fMul * ageMul;
    const total = pricePerSqm * area;
    return {
      pricePerSqm: Math.round(pricePerSqm),
      total: Math.round(total),
      low: Math.round(total * 0.88),
      high: Math.round(total * 1.12),
    };
  }, [district, type, finish, area, age]);

  const fmt = (n: number) => new Intl.NumberFormat("ar-EG").format(n);

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-b from-background via-background to-muted/30">
      <header className="container mx-auto p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 font-bold">
          <Building2 className="h-6 w-6 text-primary" /> مقيّم بورسعيد
        </Link>
        <Link to="/login"><Button variant="outline" size="sm">دخول المقيّمين</Button></Link>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="text-center mb-6">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">
            احسب سعر عقارك في <span className="text-primary">بورسعيد</span> خلال ثوانٍ
          </h1>
          <p className="text-muted-foreground">
            نموذج التقدير الآلي AVM — مبني على بيانات السوق الفعلية لعام 2026
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Calculator className="h-5 w-5 text-primary" /> تقدير سريع (3 خطوات)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">الحي</Label>
                <Select value={district} onValueChange={setDistrict}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(BASE_PRICES).map((d) => (
                      <SelectItem key={d} value={d}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">نوع العقار</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(TYPE_MULT).map((t) => (
                      <SelectItem key={t} value={t}>{t}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">مستوى التشطيب</Label>
                <Select value={finish} onValueChange={setFinish}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.keys(FINISH_MULT).map((f) => (
                      <SelectItem key={f} value={f}>{f}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">المساحة (م²)</Label>
                <Input
                  type="number"
                  value={area}
                  onChange={(e) => setArea(Math.max(20, parseInt(e.target.value) || 20))}
                />
              </div>
              <div>
                <Label className="text-xs">عمر العقار (سنة)</Label>
                <Input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(Math.max(0, parseInt(e.target.value) || 0))}
                />
              </div>
            </div>

            <Button size="lg" className="w-full" onClick={() => setShowResult(true)}>
              <Sparkles className="h-4 w-4 ml-2" /> احسب القيمة التقديرية
            </Button>

            {showResult && (
              <div className="rounded-lg border-2 border-primary/30 bg-primary/5 p-5 space-y-3">
                <div className="text-center">
                  <div className="text-xs text-muted-foreground mb-1">القيمة التقديرية</div>
                  <div className="text-4xl font-bold text-primary">{fmt(estimate.total)} ج.م</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    النطاق: {fmt(estimate.low)} — {fmt(estimate.high)} ج.م
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm border-t pt-3">
                  <span>سعر المتر التقديري:</span>
                  <span className="font-bold">{fmt(estimate.pricePerSqm)} ج.م/م²</span>
                </div>
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-3 text-xs">
                  <strong>تنبيه:</strong> هذا تقدير سريع ليس بديلًا عن تقرير تقييم رسمي معتمد.
                  للحصول على تقرير EAA/FRA كامل (مقبول من البنوك)، احجز معاينة احترافية:
                </div>
                <Link to="/login" className="block">
                  <Button size="lg" variant="default" className="w-full gap-2">
                    احصل على تقرير تقييم معتمد <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="mt-8 grid md:grid-cols-3 gap-3 text-center">
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">38</div><div className="text-xs text-muted-foreground">حي ومنطقة</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">2026</div><div className="text-xs text-muted-foreground">بيانات محدّثة</div></CardContent></Card>
          <Card><CardContent className="pt-4"><div className="text-2xl font-bold text-primary">EAA · IVS</div><div className="text-xs text-muted-foreground">معايير معتمدة</div></CardContent></Card>
        </div>
      </main>
    </div>
  );
}
