import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Gauge, Sparkles, TrendingUp, Building2, MapPin, RefreshCw, Loader2, Database } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

/**
 * PropertyScorePanel — نموذج تنبؤ بدرجة العقار من 100
 * + دمج سعر المتر الفعلي من المقارنات السوقية (transactions × properties) حسب النوع والمنطقة
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

interface AreaOpt { id: string; name: string; base_price: number | null; land_psqm: number | null }
interface CompStat { count: number; avgPsqm: number; median: number; min: number; max: number; source: "comps" | "area_base" | "manual" }

export default function PropertyScorePanel() {
  const [propType, setPropType] = useState<string>("شقة");
  const [area, setArea] = useState<number>(120);
  const [marketRate, setMarketRate] = useState<number>(18000);
  const [manualOverride, setManualOverride] = useState(false);

  const [areaId, setAreaId] = useState<string>("");
  const [areas, setAreas] = useState<AreaOpt[]>([]);
  const [stats, setStats] = useState<CompStat | null>(null);
  const [loading, setLoading] = useState(false);

  const [ratings, setRatings] = useState<Record<string, Rating>>(
    Object.fromEntries(FACTORS.map((f) => [f.key, "good"])) as Record<string, Rating>,
  );
  const setR = (k: string, v: Rating) => setRatings((r) => ({ ...r, [k]: v }));

  // Load areas list
  useEffect(() => {
    supabase.from("areas").select("id,name,base_price,land_psqm").order("name")
      .then(({ data }) => setAreas((data as AreaOpt[]) ?? []));
  }, []);

  // Fetch comparables when area + type change
  async function fetchComparables() {
    if (!areaId) {
      toast.error("اختر المنطقة أولاً");
      return;
    }
    setLoading(true);
    try {
      const isLand = propType.startsWith("أرض");
      // get properties in this area matching type
      const { data: props } = await supabase
        .from("properties")
        .select("id, type_label, area_sqm, subcategory")
        .eq("area_id", areaId);
      const matched = (props ?? []).filter((p) =>
        p.type_label === propType || p.subcategory === propType,
      );
      const ids = matched.map((p) => p.id);
      let computed: CompStat | null = null;

      if (ids.length > 0) {
        const since = new Date(Date.now() - 1000 * 60 * 60 * 24 * 365 * 2).toISOString().slice(0, 10);
        const { data: txns } = await supabase
          .from("transactions")
          .select("property_id, price, txn_date")
          .in("property_id", ids)
          .gte("txn_date", since)
          .order("txn_date", { ascending: false })
          .limit(200);

        const areaMap = new Map(matched.map((p) => [p.id, Number(p.area_sqm) || 0]));
        const psqm: number[] = [];
        for (const t of txns ?? []) {
          const a = areaMap.get(t.property_id as string) ?? 0;
          if (a > 0 && Number(t.price) > 0) psqm.push(Number(t.price) / a);
        }
        if (psqm.length > 0) {
          psqm.sort((a, b) => a - b);
          const avg = psqm.reduce((s, n) => s + n, 0) / psqm.length;
          const median = psqm[Math.floor(psqm.length / 2)];
          computed = { count: psqm.length, avgPsqm: avg, median, min: psqm[0], max: psqm[psqm.length - 1], source: "comps" };
        }
      }

      if (!computed) {
        const a = areas.find((x) => x.id === areaId);
        const fallback = isLand ? Number(a?.land_psqm) : Number(a?.base_price);
        if (fallback && fallback > 0) {
          computed = { count: 0, avgPsqm: fallback, median: fallback, min: fallback, max: fallback, source: "area_base" };
          toast.info("لا توجد صفقات مطابقة — استخدمت سعر المتر المرجعي للمنطقة");
        } else {
          toast.warning("لا توجد بيانات مقارنات لهذه المنطقة والنوع");
        }
      }

      setStats(computed);
      if (computed && !manualOverride) {
        setMarketRate(Math.round(computed.median || computed.avgPsqm));
      }
    } catch (e: any) {
      toast.error("فشل جلب المقارنات: " + (e?.message ?? "خطأ"));
    } finally {
      setLoading(false);
    }
  }

  // Auto-fetch when area or type changes
  useEffect(() => {
    if (areaId) void fetchComparables();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [areaId, propType]);

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
          <Sparkles className="h-3 w-3" /> 9 عوامل + مقارنات سوقية
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Base */}
        <div className="grid md:grid-cols-4 gap-3">
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
            <Label className="text-xs flex items-center gap-1"><MapPin className="h-3 w-3" /> المنطقة</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
              <SelectContent>
                {areas.map((a) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">المساحة (م²)</Label>
            <Input type="number" value={area} onChange={(e) => setArea(+e.target.value || 0)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs flex items-center justify-between">
              <span>سعر المتر (ج.م)</span>
              <label className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <input type="checkbox" checked={manualOverride} onChange={(e) => setManualOverride(e.target.checked)} />
                يدوي
              </label>
            </Label>
            <Input
              type="number"
              value={marketRate}
              step={500}
              disabled={!manualOverride && !!stats}
              onChange={(e) => setMarketRate(+e.target.value || 0)}
            />
          </div>
        </div>

        {/* Comparables stats */}
        <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Database className="h-4 w-4 text-primary" />
              المقارنات السوقية ({propType})
            </div>
            <Button size="sm" variant="outline" onClick={fetchComparables} disabled={!areaId || loading}>
              {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              <span className="mr-1">تحديث</span>
            </Button>
          </div>
          {stats ? (
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2 text-xs">
              <MiniStat label="عدد الصفقات" value={String(stats.count)} />
              <MiniStat label="متوسط" value={`${fmt(stats.avgPsqm)} ج.م/م²`} />
              <MiniStat label="وسيط" value={`${fmt(stats.median)} ج.م/م²`} highlight />
              <MiniStat label="أدنى" value={`${fmt(stats.min)}`} />
              <MiniStat label="أعلى" value={`${fmt(stats.max)}`} />
              <div className="col-span-2 md:col-span-5">
                <Badge variant="outline" className="text-[10px]">
                  المصدر: {stats.source === "comps" ? "صفقات فعلية (آخر سنتين)" : stats.source === "area_base" ? "سعر مرجعي للمنطقة" : "إدخال يدوي"}
                </Badge>
              </div>
            </div>
          ) : (
            <div className="text-xs text-muted-foreground">اختر منطقة لتحميل المقارنات تلقائيًا.</div>
          )}
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

            <div className="grid md:grid-cols-3 gap-3">
              <Stat label={`سعر المتر (${stats?.source === "comps" ? "وسيط الصفقات" : stats?.source === "area_base" ? "مرجعي" : "يدوي"})`} value={`${fmt(marketRate)} ج.م/م²`} />
              <Stat label="القيمة السوقية المرجعية" value={`${fmt(calc.baseValue)} ج.م`} />
              <Stat label="القيمة المتوقعة بعد المعامل" value={`${fmt(calc.predicted)} ج.م`} highlight />
            </div>

            <div className="flex items-start gap-2 text-[11px] text-muted-foreground bg-muted/40 rounded-md p-2">
              <TrendingUp className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
              <span>
                سعر المتر يُحسب تلقائيًا من وسيط صفقات نفس النوع داخل المنطقة (آخر سنتين)، ثم يُعدّل بمعامل الدرجة من نموذج النقاط. فعّل "يدوي" لتجاوز قيمة المقارنات.
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

function MiniStat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`rounded-md border bg-card p-2 ${highlight ? "border-primary/50" : ""}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-xs font-semibold mt-0.5 ${highlight ? "text-primary" : ""}`}>{value}</div>
    </div>
  );
}
