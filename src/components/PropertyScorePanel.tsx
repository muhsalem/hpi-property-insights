import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, Sparkles, TrendingUp, Building2 } from "lucide-react";

/**
 * PropertyScorePanel — نموذج تنبؤ بدرجة العقار من 100
 * 9 عوامل بأوزان ثابتة + سعر متر سوقي اختياري للمعايرة
 */

const PROPERTY_TYPES = [
  "شقة","استوديو","دوبلكس","بنتهاوس","فيلا","تاون هاوس","توين هاوس","شاليه",
  "مكتب إداري","محل تجاري","عمارة كاملة","أرض سكنية","أرض زراعية","أرض تجارية","مبنى صناعي/مخزن",
] as const;

type Rating = "excellent" | "vgood" | "good" | "fair" | "weak";

const RATING_PCT: Record<Rating, number> = {
  excellent: 100, vgood: 80, good: 60, fair: 40, weak: 20,
};

const RATING_LABEL: Record<Rating, string> = {
  excellent: "ممتاز (100%)",
  vgood: "جيد جدًا (80%)",
  good: "جيد (60%)",
  fair: "مقبول (40%)",
  weak: "ضعيف (20%)",
};

interface Factor { key: string; label: string; weight: number; }

const FACTORS: Factor[] = [
  { key: "L", label: "الموقع",                weight: 30 },
  { key: "A", label: "المساحة",              weight: 15 },
  { key: "F", label: "مستوى التشطيب",         weight: 15 },
  { key: "C", label: "العمر والحالة",         weight: 10 },
  { key: "S", label: "الخدمات والمرافق",      weight: 10 },
  { key: "T", label: "المواصلات وسهولة الوصول", weight: 5 },
  { key: "V", label: "الإطلالة",             weight: 5 },
  { key: "D", label: "الطلب على المنطقة",     weight: 5 },
  { key: "I", label: "الجاذبية الاستثمارية",   weight: 5 },
];

const classify = (score: number) => {
  if (score >= 90) return { label: "ممتاز", color: "bg-emerald-500", multi: 1.12 };
  if (score >= 80) return { label: "جيد جدًا", color: "bg-teal-500", multi: 1.06 };
  if (score >= 70) return { label: "جيد", color: "bg-blue-500", multi: 1.0 };
  if (score >= 60) return { label: "مقبول", color: "bg-amber-500", multi: 0.92 };
  return { label: "ضعيف", color: "bg-rose-500", multi: 0.82 };
};

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

export default function PropertyScorePanel() {
  const [propType, setPropType] = useState<string>("شقة");
  const [area, setArea] = useState<number>(120);
  const [marketRate, setMarketRate] = useState<number>(18000); // ج.م/م² السوقي

  const [ratings, setRatings] = useState<Record<string, Rating>>(
    Object.fromEntries(FACTORS.map((f) => [f.key, "good"])) as Record<string, Rating>,
  );

  const setR = (k: string, v: Rating) => setRatings((r) => ({ ...r, [k]: v }));

  const calc = useMemo(() => {
    const breakdown = FACTORS.map((f) => {
      const pct = RATING_PCT[ratings[f.key]];
      const pts = (f.weight * pct) / 100;
      return { ...f, pct, pts };
    });
    const score = breakdown.reduce((s, b) => s + b.pts, 0);
    const tier = classify(score);
    const baseValue = area * marketRate;
    const predicted = baseValue * tier.multi;
    return { breakdown, score, tier, baseValue, predicted };
  }, [ratings, area, marketRate]);

  return (
    <Card dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Gauge className="h-5 w-5 text-primary" />
          نموذج التنبؤ بدرجة العقار (من 100)
        </CardTitle>
        <Badge variant="secondary" className="gap-1">
          <Sparkles className="h-3 w-3" /> 9 عوامل مرجّحة
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Property base */}
        <div className="grid md:grid-cols-3 gap-3">
          <div className="space-y-1">
            <Label className="text-xs flex items-center gap-1"><Building2 className="h-3 w-3" /> نوع العقار</Label>
            <Select value={propType} onValueChange={setPropType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PROPERTY_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المساحة (م²)</Label>
            <Input type="number" value={area} onChange={(e) => setArea(+e.target.value || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">سعر المتر السوقي المرجعي (ج.م)</Label>
            <Input type="number" value={marketRate} step={500} onChange={(e) => setMarketRate(+e.target.value || 0)} />
          </div>
        </div>

        <Separator />

        <Tabs defaultValue="rate">
          <TabsList className="grid grid-cols-2 w-full">
            <TabsTrigger value="rate">تقييم العوامل</TabsTrigger>
            <TabsTrigger value="result">النتيجة والتنبؤ</TabsTrigger>
          </TabsList>

          <TabsContent value="rate" className="space-y-3 pt-3">
            <div className="grid md:grid-cols-2 gap-3">
              {FACTORS.map((f) => (
                <div key={f.key} className="rounded-lg border p-3 space-y-2 bg-card">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">{f.label}</Label>
                    <Badge variant="outline" className="text-[10px]">{f.weight} نقطة</Badge>
                  </div>
                  <Select value={ratings[f.key]} onValueChange={(v) => setR(f.key, v as Rating)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(RATING_LABEL) as Rating[]).map((r) => (
                        <SelectItem key={r} value={r}>{RATING_LABEL[r]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="result" className="space-y-4 pt-3">
            {/* Score banner */}
            <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div>
                  <div className="text-xs text-muted-foreground">الدرجة الإجمالية</div>
                  <div className="text-3xl font-bold text-primary">
                    {calc.score.toFixed(1)} <span className="text-base text-muted-foreground">/ 100</span>
                  </div>
                </div>
                <div className="text-center">
                  <div className={`inline-flex items-center gap-1 text-white px-3 py-1.5 rounded-full text-sm font-semibold ${calc.tier.color}`}>
                    {calc.tier.label}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-1">معامل القيمة ×{calc.tier.multi.toFixed(2)}</div>
                </div>
              </div>
              <Progress value={calc.score} className="h-3" />
            </div>

            {/* Breakdown */}
            <div className="space-y-1.5">
              {calc.breakdown.map((b) => (
                <div key={b.key} className="grid grid-cols-12 items-center gap-2 text-xs">
                  <div className="col-span-4 truncate">{b.label}</div>
                  <div className="col-span-6">
                    <Progress value={b.pct} className="h-1.5" />
                  </div>
                  <div className="col-span-2 text-end font-medium">
                    {b.pts.toFixed(1)} / {b.weight}
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Predicted value */}
            <div className="grid md:grid-cols-3 gap-3">
              <Stat label="القيمة السوقية المرجعية" value={`${fmt(calc.baseValue)} ج.م`} />
              <Stat label="معامل التعديل حسب الدرجة" value={`×${calc.tier.multi.toFixed(2)}`} />
              <Stat label="القيمة المتوقعة" value={`${fmt(calc.predicted)} ج.م`} highlight />
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
              <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                هذا التنبؤ مؤشر إرشادي مبني على نظام نقاط مرجّح. للتقييم النهائي ادمج هذه النتيجة مع مقارنات الصفقات الفعلية في نفس المنطقة، إذ تبقى المقارنات السوقية أدق عامل في تحديد القيمة.
              </span>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/40 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold mt-0.5 ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
