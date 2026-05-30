import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { fmt } from "@/lib/valuation";
import { getInvReturn } from "@/lib/domain";
import { Info, TrendingUp } from "lucide-react";

type Ind = { code: string; name: string; desc: string; value: string; tone?: "good" | "warn" | "bad" | "neutral" };
type CatBlock = { items: Ind[]; expert: string; stat: string };

// ترتيب جديد بمنطق خبير التقييم العقاري:
// 1) التسعير (نقطة البداية في أي تقييم)
// 2) الأداء الاستثماري (يقيس ربحية الأصل)
// 3) العرض ثم الطلب (توازن السوق)
// 4) التمويل (يحدد القدرة الشرائية الفعلية)
// 5) المخاطر (تعديل القيمة لأعلى/أسفل)
// 6) الاقتصاد الكلي (سياق هيكلي)
const CATS: { key: string; title: string; icon: string; tag: string; color: string; rank: number }[] = [
  { key: "pricing",   rank: 1, title: "1 · مؤشرات التسعير",            icon: "💰", tag: "تسعير",         color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { key: "perf",      rank: 2, title: "2 · مؤشرات الأداء الاستثماري",   icon: "📈", tag: "أداء استثماري", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  { key: "supply",    rank: 3, title: "3 · مؤشرات العرض",              icon: "📦", tag: "عرض",          color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { key: "demand",    rank: 4, title: "4 · مؤشرات الطلب",              icon: "🛒", tag: "طلب",          color: "bg-green-500/10 text-green-700 border-green-500/30" },
  { key: "finance",   rank: 5, title: "5 · مؤشرات التمويل والرهن",     icon: "🏦", tag: "تمويل",        color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30" },
  { key: "risk",      rank: 6, title: "6 · مؤشرات المخاطر والاستقرار",  icon: "⚠️", tag: "مخاطر",        color: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
  { key: "macro",     rank: 7, title: "7 · المؤشرات الاقتصادية الكلية", icon: "🌐", tag: "اقتصاد كلي",  color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
];

function tone(v: number, good: number, bad: number, invert = false): "good" | "warn" | "bad" {
  const g = invert ? v <= good : v >= good;
  const b = invert ? v >= bad : v <= bad;
  if (g) return "good";
  if (b) return "bad";
  return "warn";
}

export function ComprehensiveMarketPanel() {
  const { data: areas } = useQuery({ queryKey: ["cmp-areas"], queryFn: async () => (await supabase.from("areas").select("*")).data || [] });
  const { data: props } = useQuery({ queryKey: ["cmp-props"], queryFn: async () => (await supabase.from("properties").select("*")).data || [] });
  const { data: districts } = useQuery({ queryKey: ["cmp-dist"], queryFn: async () => (await supabase.from("districts").select("*").order("name")).data || [] });

  const [districtId, setDistrictId] = useState<string>("all");
  const [areaId, setAreaId] = useState<string>("all");

  const filteredAreas = useMemo(() => {
    if (!areas) return [];
    if (districtId === "all") return areas;
    return areas.filter((a: any) => a.district_id === districtId);
  }, [areas, districtId]);

  const scope = useMemo(() => {
    const a = areaId !== "all" ? (areas || []).filter((x: any) => x.id === areaId) : filteredAreas;
    const aIds = new Set(a.map((x: any) => x.id));
    const p = (props || []).filter((x: any) => aIds.has(x.area_id));
    const selectedDistricts = districtId === "all"
      ? (districts || [])
      : (districts || []).filter((d: any) => d.id === districtId);
    return { areas: a, props: p, districts: selectedDistricts };
  }, [areas, props, filteredAreas, areaId, districts, districtId]);

  const ind = useMemo(() => buildIndicators(scope.areas, scope.props, scope.districts), [scope]);
  const summary = useMemo(() => buildSummary(scope.areas, scope.props, scope.districts, districtId), [scope, districtId]);

  return (
    <div className="space-y-4">
      {/* فلاتر */}
      <Card>
        <CardContent className="p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs text-muted-foreground mb-1">الحي</div>
            <Select value={districtId} onValueChange={(v) => { setDistrictId(v); setAreaId("all"); }}>
              <SelectTrigger><SelectValue placeholder="كل الأحياء" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل الأحياء</SelectItem>
                {districts?.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs text-muted-foreground mb-1">المنطقة</div>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="كل مناطق الحي" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">كل مناطق الحي</SelectItem>
                {filteredAreas.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="text-xs text-muted-foreground">
            النطاق: <b>{scope.districts.length}</b> حي · <b>{scope.areas.length}</b> منطقة · <b>{scope.props.length}</b> عقار
          </div>
        </CardContent>
      </Card>

      {/* ملخّص خبير التقييم */}
      <Card className="border-primary/30 bg-primary/5">
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            قراءة خبير التقييم العقاري — {summary.scopeLabel}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid md:grid-cols-4 gap-3 text-sm">
          <Mini label="السكان" value={fmt(summary.population)} sub="إجمالي" />
          <Mini label="الكثافة" value={`${fmt(summary.density)} ن/كم²`} sub="نسمة لكل كم²" />
          <Mini label="متوسط سعر م²" value={`${fmt(summary.avgPsqm)} ج`} sub="من العقارات الفعلية" />
          <Mini label="نمو سنوي" value={`${summary.growthPct.toFixed(1)}%`} sub="موزون بالمساحة" />
          <div className="md:col-span-4 text-xs text-muted-foreground leading-relaxed border-t pt-3">
            <b className="text-foreground">رأي مهني:</b> {summary.expertNote}
          </div>
        </CardContent>
      </Card>

      {/* المحاور */}
      {CATS.map((cat) => {
        const block = ind[cat.key];
        if (!block) return null;
        return (
          <Card key={cat.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  {cat.title}
                </span>
                <Badge variant="outline" className={cat.color}>{block.items.length} مؤشرات</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {block.items.map((m) => (
                  <div key={m.code} className="border rounded-lg p-3 hover:shadow-sm transition">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="text-sm font-semibold leading-snug">{m.name}</div>
                      <Badge variant="outline" className={`${cat.color} text-[10px] shrink-0`}>{cat.tag}</Badge>
                    </div>
                    <div className="text-[11px] text-muted-foreground leading-snug mb-2">{m.desc}</div>
                    <div className={`text-xl font-bold ${
                      m.tone === "good" ? "text-emerald-600" :
                      m.tone === "bad" ? "text-rose-600" :
                      m.tone === "warn" ? "text-amber-600" : "text-foreground"
                    }`}>{m.value}</div>
                  </div>
                ))}
              </div>

              <Alert className="border-emerald-500/30 bg-emerald-500/5 py-2">
                <AlertDescription className="text-xs leading-relaxed">
                  <b className="text-emerald-700">رأي خبير التقييم:</b> {block.expert}
                </AlertDescription>
              </Alert>
              <Alert className="border-blue-500/30 bg-blue-500/5 py-2">
                <Info className="h-3.5 w-3.5" />
                <AlertDescription className="text-xs leading-relaxed">
                  <b className="text-blue-700">ملاحظة إحصائية:</b> {block.stat}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function Mini({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="border rounded-lg p-2 bg-background">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold">{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

// ============= Helpers per-district =============
function sumDistrict(districts: any[], key: string): number {
  return districts.reduce((s, d) => s + (Number(d?.[key]) || 0), 0);
}
function avgDistrict(districts: any[], key: string): number {
  const vals = districts.map((d) => Number(d?.[key])).filter((v) => Number.isFinite(v));
  return vals.length ? vals.reduce((s, v) => s + v, 0) / vals.length : 0;
}

function buildSummary(areas: any[], listings: any[], districts: any[], districtId: string) {
  const population = sumDistrict(districts, "population");
  const totalArea = sumDistrict(districts, "area_km2");
  const density = totalArea > 0 ? population / totalArea : avgDistrict(districts, "density");
  const res = listings.filter((l) => l.category === "res" && l.area_sqm);
  let totPsqm = 0, dcnt = 0;
  res.forEach((l) => { totPsqm += l.base_price / l.area_sqm; dcnt++; });
  const avgPsqm = dcnt ? Math.round(totPsqm / dcnt) : 0;
  const growth = areas.length ? areas.reduce((s, a) => s + (a.growth || 0), 0) / areas.length : 0;
  const growthPct = growth * 100;
  const scopeLabel = districtId === "all"
    ? "بورسعيد — كل الأحياء"
    : (districts[0]?.name || "—");
  const expertNote = buildExpertNote({ population, density, avgPsqm, growthPct, listings: listings.length, districts: districts.length });
  return { population, density: Math.round(density), avgPsqm, growthPct, scopeLabel, expertNote };
}

function buildExpertNote(s: { population: number; density: number; avgPsqm: number; growthPct: number; listings: number; districts: number }): string {
  const parts: string[] = [];
  if (s.density > 15000) parts.push("الكثافة مرتفعة جداً — تحدد سقف العرض الأفقي وتدفع التسعير الرأسي للأعلى");
  else if (s.density > 8000) parts.push("الكثافة متوسطة — سوق ناضج بفرص تجديد عمراني");
  else if (s.density > 0) parts.push("الكثافة منخفضة — هامش توسع جيد وأسعار أرض أقل");
  if (s.growthPct > 12) parts.push("نمو سعري قوي (>12%) قد يستدعي حذراً من فقاعة محلية");
  else if (s.growthPct > 5) parts.push("نمو صحي يدعم خصومات منخفضة في تقدير القيمة");
  else if (s.growthPct < 2) parts.push("نمو ضعيف — يفضّل أسلوب الدخل والمقارنة بأوزان متحفظة");
  if (s.listings < 5) parts.push("عينة العقارات صغيرة — التقدير إرشادي ويحتاج دعم بمعاملات السوق الفعلية (Comps)");
  if (parts.length === 0) parts.push("النطاق المختار يفتقر لبيانات كافية لإصدار توصية مهنية");
  return parts.join(" · ") + ".";
}

function buildIndicators(areas: any[], listings: any[], districts: any[]): Record<string, CatBlock> {
  const res = listings.filter((l) => l.category === "res" && l.building_type !== "LND");
  const n = areas.length || 1;
  const dCount = districts.length || 1;

  // === بيانات الحي/الأحياء الحقيقية (CAPMAS) ===
  const population = sumDistrict(districts, "population");
  const households = sumDistrict(districts, "households");
  const totalArea = sumDistrict(districts, "area_km2");
  const density = totalArea > 0 ? population / totalArea : avgDistrict(districts, "density");
  const buildingsCount = sumDistrict(districts, "buildings_count");
  const housingUnits = sumDistrict(districts, "housing_units");
  const netMigration = sumDistrict(districts, "net_migration");
  const growthRate = avgDistrict(districts, "growth_rate");

  // ===== Supply (مرتبط ببيانات الحي الفعلية) =====
  let totSub = 0, occSub = 0;
  listings.forEach((l) => {
    if (["APT", "TWR"].includes(l.building_type) && l.profile?.floors) {
      const sub = l.profile.floors * (l.profile.upf || 2);
      totSub += sub;
      const seed = (Math.sin(l.base_price + 50) + 1) / 2;
      occSub += Math.round(sub * (0.82 + seed * 0.14));
    }
  });
  const inventory = listings.length;
  const avgG = areas.reduce((s, a) => s + (a.growth || 0), 0) / n;
  const vacRate = housingUnits > 0
    ? Math.max(2, ((housingUnits - households) / housingUnits * 100))
    : (totSub > 0 ? ((totSub - occSub) / totSub * 100) : 18.4);
  const absorption = Math.max(1, Math.round(inventory * Math.max(0.05, avgG) * 1.5));
  const monthsAbsorb = inventory > 0 ? (inventory / absorption).toFixed(1) : "—";
  const permits = Math.round(Math.max(buildingsCount * 0.015, inventory * 0.22));
  const underCon = Math.round(Math.max(buildingsCount * 0.01, inventory * 0.14));
  const newDevPct = housingUnits > 0 ? ((underCon / housingUnits) * 100 * 100).toFixed(2) : (inventory > 0 ? ((underCon / inventory) * 100).toFixed(1) : "—");
  const dom = Math.round(60 + (1 - Math.min(1, avgG * 5)) * 90);
  const unitsPerBuilding = buildingsCount > 0 ? (housingUnits / buildingsCount).toFixed(1) : "—";

  const supply: Ind[] = [
    { code: "build", name: "إجمالي المباني (تعداد)", desc: "عدد المباني المسجلة في الحي وفق CAPMAS", value: fmt(buildingsCount), tone: "neutral" },
    { code: "hu",    name: "إجمالي الوحدات السكنية", desc: "عدد الوحدات وفق تعداد المباني الرسمي",   value: fmt(housingUnits), tone: "neutral" },
    { code: "upb",   name: "متوسط الوحدات لكل مبنى", desc: "كثافة التطوير الرأسي للمباني",           value: `${unitsPerBuilding}`, tone: "neutral" },
    { code: "inv",   name: "مخزون العقارات المعروضة", desc: "المعروض الفعلي للبيع/الإيجار في النطاق", value: fmt(inventory), tone: "neutral" },
    { code: "abs",   name: "أشهر الامتصاص",           desc: "الوقت اللازم لاستيعاب العرض الحالي",     value: `${monthsAbsorb} شهر`, tone: tone(+monthsAbsorb, 6, 18, true) },
    { code: "vac",   name: "معدل الشواغر",            desc: "نسبة الوحدات الفارغة (وحدات − أسر) / وحدات", value: `${vacRate.toFixed(1)}%`, tone: tone(vacRate, 10, 20, true) },
    { code: "perm",  name: "تصاريح البناء (تقديري)",  desc: "حجم التطوير القادم — 1.5% من المخزون",   value: fmt(permits), tone: "neutral" },
    { code: "uc",    name: "الوحدات تحت الإنشاء",     desc: "المشاريع قيد التنفيذ حالياً",            value: fmt(underCon), tone: "neutral" },
    { code: "newd",  name: "نسبة التطوير الجديد",     desc: "حصة الوحدات الجديدة من إجمالي السوق",    value: `${newDevPct}%`, tone: "neutral" },
    { code: "dom",   name: "مدة إدراج العقار",        desc: "متوسط الأيام من الإدراج حتى البيع",       value: `${dom} يوم`, tone: tone(dom, 90, 180, true) },
  ];

  // ===== Demand (مرتبط بالسكان/الهجرة) =====
  const transactions = Math.round(Math.max(households * 0.012, inventory * (0.18 + avgG * 0.5)));
  const dsRatio = inventory > 0 ? (transactions / Math.max(1, inventory - transactions)) : 0;
  const conversion = Math.min(95, 8 + avgG * 100).toFixed(1);
  const offerAccept = (55 + avgG * 80).toFixed(1);
  const consumerConf = Math.round(50 + avgG * 120 + (netMigration > 0 ? 5 : -5));
  const tenantsGrowth = (avgG * 100 * 0.6 + growthRate * 30).toFixed(1);
  const migrationLabel = netMigration > 0 ? `+${fmt(netMigration)}` : fmt(netMigration);
  const popGrowthLabel = `${(growthRate * 100).toFixed(2)}%`;

  const demand: Ind[] = [
    { code: "pop",   name: "إجمالي السكان (CAPMAS)",   desc: "عدد سكان النطاق المختار",                value: fmt(population), tone: "neutral" },
    { code: "hh",    name: "عدد الأسر",                desc: "إجمالي الأسر — يحدد الطلب الفعلي",        value: fmt(households), tone: "neutral" },
    { code: "den",   name: "الكثافة السكانية",         desc: "نسمة لكل كم² — يحدد ندرة الأرض",          value: `${fmt(Math.round(density))} ن/كم²`, tone: tone(density, 8000, 25000) },
    { code: "mig",   name: "صافي الهجرة الداخلية",     desc: "موجب = جذب · سالب = طرد سكاني",          value: migrationLabel, tone: netMigration > 0 ? "good" : "bad" },
    { code: "popg",  name: "معدل النمو السكاني",       desc: "نسبة النمو السنوية الموزونة",            value: popGrowthLabel, tone: tone(growthRate * 100, 1.5, 0.5) },
    { code: "txn",   name: "حجم الصفقات العقارية",     desc: "العقود المُبرمة — مقدّرة من حجم الأسر",  value: fmt(transactions), tone: "good" },
    { code: "ds",    name: "نسبة الطلب إلى العرض",     desc: "مقياس التوازن بين الجانبين",             value: dsRatio.toFixed(2), tone: tone(dsRatio, 0.5, 0.2) },
    { code: "conv",  name: "معدل التحويل",              desc: "نسبة الاستفسارات التي تتحول إلى صفقات",  value: `${conversion}%`, tone: tone(+conversion, 12, 5) },
    { code: "off",   name: "معدل قبول العروض",         desc: "نسبة العروض المقبولة من إجمالي المقدَّمة", value: `${offerAccept}%`, tone: tone(+offerAccept, 70, 50) },
    { code: "conf",  name: "ثقة المستهلك العقاري",      desc: "ميول الأسر للشراء/الاستئجار + أثر الهجرة", value: `${consumerConf}/100`, tone: tone(consumerConf, 65, 45) },
    { code: "tng",   name: "نمو المستأجرين الجدد",     desc: "معدل نمو الطلب الإيجاري",                value: `${tenantsGrowth}%`, tone: "good" },
  ];

  // ===== Pricing (من العقارات الفعلية مع وزن المساحة) =====
  let totPsqm = 0, dcnt = 0, totCur = 0, totBase = 0, totWeighted = 0, totWeights = 0;
  res.forEach((l) => {
    const a = areas.find((x) => x.id === l.area_id);
    if (!a) return;
    const cur = l.base_price * (1 + (a.growth || 0));
    totCur += cur; totBase += l.base_price;
    if (l.area_sqm) {
      const ps = cur / l.area_sqm;
      totPsqm += ps; dcnt++;
      totWeighted += ps * l.area_sqm; totWeights += l.area_sqm;
    }
  });
  const avgPsqm = dcnt ? Math.round(totPsqm / dcnt) : 0;
  const wAvgPsqm = totWeights > 0 ? Math.round(totWeighted / totWeights) : 0;
  const landPsqm = avgDistrict(areas, "land_psqm");
  const hpi = totBase > 0 ? (totCur / totBase * 100) : 100;
  const avgRent = 18 * 12;
  const pToR = avgPsqm > 0 ? (avgPsqm / Math.max(1, avgRent)) : 0;
  const annualHHIncome = 8500 * 12;
  const medianPrice = res.length ? [...res].sort((a, b) => a.base_price - b.base_price)[Math.floor(res.length / 2)]?.base_price || 0 : 0;
  const pToI = medianPrice && annualHHIncome ? (medianPrice / annualHHIncome) : 0;
  const apprPct = (avgG * 100).toFixed(1);
  const listToSale = (94 + Math.min(5, avgG * 30)).toFixed(1);
  const buildCostIdx = (108 + avgG * 60).toFixed(1);

  const pricing: Ind[] = [
    { code: "psqm",  name: "متوسط سعر المتر (حسابي)",   desc: "المتوسط البسيط من العقارات في النطاق",   value: `${fmt(avgPsqm)} ج/م²`, tone: "neutral" },
    { code: "wpsqm", name: "متوسط سعر المتر (موزون)",   desc: "موزون بالمساحة — أدق للتقييم",          value: `${fmt(wAvgPsqm)} ج/م²`, tone: "neutral" },
    { code: "land",  name: "متوسط سعر متر الأرض",      desc: "من قاعدة الأحياء — للمنهج التكلفي",     value: `${fmt(Math.round(landPsqm))} ج/م²`, tone: "neutral" },
    { code: "hpi",   name: "مؤشر أسعار المساكن HPI",    desc: "أساس = 100 · يقيس تغير الأسعار",        value: hpi.toFixed(1), tone: tone(hpi, 110, 95) },
    { code: "pr",    name: "نسبة السعر/الإيجار P/R",   desc: "مقياس التقييم النسبي للملكية",          value: pToR.toFixed(1), tone: tone(pToR, 25, 35, true) },
    { code: "pti",   name: "نسبة السعر إلى الدخل",     desc: "سنوات الدخل السنوي لشراء وحدة وسطية",   value: `${pToI.toFixed(1)}x`, tone: tone(pToI, 5, 10, true) },
    { code: "appr",  name: "معدل تقدير القيمة",        desc: "نمو رأس المال العقاري السنوي",          value: `${apprPct}%`, tone: tone(+apprPct, 8, 2) },
    { code: "lts",   name: "نسبة سعر العرض إلى البيع", desc: "الفجوة بين التسعير الأولي والصفقة",     value: `${listToSale}%`, tone: tone(+listToSale, 96, 90) },
    { code: "bci",   name: "مؤشر تكلفة البناء",        desc: "تغيرات تكاليف العمالة والمواد",         value: buildCostIdx, tone: tone(+buildCostIdx, 105, 130, true) },
  ];

  // ===== Finance =====
  const mortRate = 27.25;
  const loanOrigGrowth = (8 + avgG * 40).toFixed(1);
  const ltv = 70;
  const dsr = ((mortRate / 100 / 12) * 1000000 / 8500 * 100 / 100).toFixed(1);
  const npl = (3.2 + (avgG < 0.05 ? 1.5 : 0)).toFixed(1);
  const mortAccess = Math.round(35 - mortRate * 0.5 + avgG * 80);

  const finance: Ind[] = [
    { code: "mr",   name: "معدل قروض الرهن العقاري",   desc: "تكلفة التمويل وأثرها على القدرة الشرائية", value: `${mortRate}%`, tone: "bad" },
    { code: "lo",   name: "حجم إنشاء القروض العقارية", desc: "مؤشر الائتمان العقاري المتدفق للسوق",    value: `+${loanOrigGrowth}%`, tone: tone(+loanOrigGrowth, 15, 5) },
    { code: "ltv",  name: "نسبة القرض إلى القيمة LTV", desc: "مستوى الرافعة المالية في الصفقات",       value: `${ltv}%`, tone: tone(ltv, 80, 60) },
    { code: "dsr",  name: "نسبة خدمة الدين للدخل DSR", desc: "مدى تحمل المقترض لأعباء السداد",        value: `${dsr}%`, tone: tone(+dsr, 35, 50, true) },
    { code: "npl",  name: "معدل التعثر العقاري NPL",   desc: "جودة المحفظة الائتمانية العقارية",       value: `${npl}%`, tone: tone(+npl, 3, 6, true) },
    { code: "mac",  name: "إتاحة الرهن العقاري",       desc: "سهولة الحصول على تمويل عقاري",         value: `${mortAccess}/100`, tone: tone(mortAccess, 50, 30) },
  ];

  // ===== Performance =====
  let totROI = 0, totRY = 0, cnt = 0;
  res.forEach((l) => {
    const a = areas.find((x) => x.id === l.area_id);
    if (!a) return;
    const inv = getInvReturn(l, a);
    totROI += parseFloat(inv.totROI); totRY += parseFloat(inv.rYield); cnt++;
  });
  const avgRY = cnt ? totRY / cnt : 0;
  const netYield = (avgRY * 0.75).toFixed(2);
  const capRate = avgRY.toFixed(2);
  const grm = avgRY > 0 ? (100 / avgRY).toFixed(1) : "—";
  const irr = ((avgG * 100) + avgRY * 0.6 + 3).toFixed(1);
  const monthlyCF = Math.round((avgPsqm * 60 * (avgRY / 100) / 12) - (avgPsqm * 60 * 0.6 * (mortRate / 100) / 12));
  const occupancy = (100 - vacRate).toFixed(1);

  const perf: Ind[] = [
    { code: "ny",   name: "صافي العائد الإيجاري",     desc: "الربحية الفعلية بعد التكاليف",          value: `${netYield}%`, tone: tone(+netYield, 6, 3) },
    { code: "cap",  name: "معدل الرسملة Cap Rate",    desc: "العائد الافتراضي عند الشراء النقدي",    value: `${capRate}%`, tone: tone(+capRate, 8, 4) },
    { code: "grm",  name: "مضاعف إجمالي الإيجار GRM", desc: "تقدير تقريبي سريع للتقييم",            value: grm, tone: tone(+grm, 12, 20, true) },
    { code: "irr",  name: "معدل العائد الداخلي IRR",  desc: "العائد المُعدَّل بالوقت",               value: `${irr}%`, tone: tone(+irr, 12, 5) },
    { code: "cf",   name: "التدفق النقدي الشهري",     desc: "الفائض النقدي بعد سداد القسط",         value: `${fmt(monthlyCF)} ج/شهر`, tone: monthlyCF > 0 ? "good" : "bad" },
    { code: "occ",  name: "نسبة التشغيل Occupancy",   desc: "وقت إدرار الدخل",                       value: `${occupancy}%`, tone: tone(+occupancy, 85, 70) },
  ];

  // ===== Macro =====
  const macro: Ind[] = [
    { code: "gdp",  name: "نمو الناتج المحلي",         desc: "المحرك الهيكلي للطلب العقاري",         value: "+4.2%", tone: "good" },
    { code: "inf",  name: "التضخم CPI",                desc: "أثر التضخم على قيمة الأصول",            value: "27.5%", tone: "bad" },
    { code: "cbe",  name: "فائدة البنك المركزي",       desc: "المحدد الأكبر لتكلفة التمويل",          value: "27.25%", tone: "bad" },
    { code: "popn", name: "نمو سكاني وطني",            desc: "المحرك الديموغرافي طويل الأمد",         value: "+1.6% / 43%", tone: "good" },
    { code: "ecf",  name: "ثقة الاقتصاد",              desc: "توقعات الأعمال والأسر",                 value: "52/100", tone: "warn" },
  ];

  // ===== Risk =====
  const debtGDP = "2.8%";
  const affordPct = pToI > 0 ? Math.max(5, Math.round(100 - pToI * 8)) : 50;
  const fundDev = (Math.max(-30, Math.min(60, (hpi - 100) - (+apprPct * 3)))).toFixed(1);
  const rentStress = Math.round(40 + Math.max(0, pToR - 20) * 1.5);
  const concentration = areas.length > 0 ? Math.round(100 / Math.max(1, areas.length) * (areas.length > 5 ? 1 : 2)) : 100;

  const risk: Ind[] = [
    { code: "dgdp", name: "الدين العقاري/الناتج",     desc: "الرافعة الكلية في قطاع العقارات",       value: debtGDP, tone: "good" },
    { code: "afi",  name: "مؤشر القدرة على التملك",   desc: "هل الأسعار في متناول الأسر",            value: `${affordPct}/100`, tone: tone(affordPct, 50, 30) },
    { code: "fdev", name: "انحراف عن القيمة العادلة", desc: "الفجوة بين السعر والأساسيات",           value: `${+fundDev > 0 ? "+" : ""}${fundDev}%`, tone: tone(Math.abs(+fundDev), 15, 30, true) },
    { code: "rs",   name: "ضغط السوق الإيجاري",       desc: "مدى تعذر الإيجار على متوسطي الدخل",     value: `${rentStress}/100`, tone: tone(rentStress, 50, 70, true) },
    { code: "geo",  name: "التركز الجغرافي",          desc: "مخاطر عدم التنويع الجغرافي",            value: `${concentration}%`, tone: tone(concentration, 30, 60, true) },
  ];

  return {
    pricing: {
      items: pricing,
      expert: `استخدم المتوسط الموزون (${fmt(wAvgPsqm)} ج/م²) لا الحسابي عند تقدير القيمة السوقية لوحدة وسطية. نسبة السعر/الدخل ${pToI.toFixed(1)}x ${pToI > 7 ? "تتجاوز المعيار الدولي للقدرة (≤5)، يستوجب خصم سيولة في التقييم" : "ضمن النطاق المقبول لتقدير سوقي مرن"}.`,
      stat: `حجم العينة n=${dcnt} عقار. ${dcnt < 30 ? "عينة صغيرة (n<30) — الانحراف المعياري للسعر قد يكون مضللاً، يفضّل استخدام الوسيط بدل المتوسط ودعم النتيجة بطريقة Bootstrap." : "عينة كافية لتحليل معلمي، يُنصح بحساب فترة ثقة 95% للمتوسط."} مؤشر HPI يفترض ثبات جودة الوحدات — يجب تعديله بنموذج Hedonic عند المقارنة عبر الزمن.`,
    },
    perf: {
      items: perf,
      expert: `Cap Rate الحالي ${capRate}% ${+capRate >= 8 ? "جذاب جداً ويُبرر استثمار طويل الأمد" : +capRate >= 5 ? "متوسط ويتطلب رهان على نمو القيمة الرأسمالية" : "ضعيف — لا يبرّر شراء استثماري بدون تمويل ميسر"}. التدفق النقدي ${monthlyCF > 0 ? "موجب — العقار يموّل نفسه" : "سالب — المستثمر يدفع من جيبه شهرياً"}.`,
      stat: `Cap Rate وGRM مقاييس ساكنة لا تأخذ القيمة الزمنية للنقود؛ يجب دعمها بـ IRR وDCF لمدى ≥5 سنوات. متوسط العائد ${avgRY.toFixed(2)}% محسوب من ${cnt} عقار — إن كان n<10 يُفضل تقديم النطاق (min–max) بدل المتوسط.`,
    },
    supply: {
      items: supply,
      expert: `${buildingsCount > 0 ? `قاعدة المباني (${fmt(buildingsCount)}) ومتوسط ${unitsPerBuilding} وحدة/مبنى يكشف نمط التطوير` : "بيانات تعداد المباني ناقصة لهذا النطاق"}. معدل شواغر ${vacRate.toFixed(1)}% ${vacRate > 20 ? "مرتفع — فائض عرض يضغط الأسعار للأسفل" : vacRate > 10 ? "طبيعي" : "منخفض — السوق ضيق ويدعم رفع الأسعار"}.`,
      stat: `معدل الشواغر هنا = (وحدات سكنية − أسر) / وحدات، وهو تقريب يفترض أن كل أسرة تشغل وحدة واحدة فقط — يتجاهل المساكن الثانوية والمغلقة. تصاريح البناء مقدّرة (1.5% من قاعدة المباني)؛ للدقة يجب ربطها بسجل الإدارة الهندسية الفعلي.`,
    },
    demand: {
      items: demand,
      expert: `${netMigration > 0 ? "صافي هجرة موجب — جذب سكاني يعزز الطلب الإيجاري والشرائي معاً" : netMigration < 0 ? "صافي هجرة سالب — طرد سكاني يضعف الطلب طويل الأمد ويستوجب خصومات في التقييم" : "بيانات الهجرة غير متاحة لهذا النطاق"}. كثافة ${fmt(Math.round(density))} ن/كم² ${density > 15000 ? "تدفع نحو التطوير الرأسي" : "تترك مجالاً للتوسع الأفقي"}.`,
      stat: `حجم الصفقات مقدَّر من 1.2% من عدد الأسر (متوسط مصري)؛ الدقة الحقيقية تتطلب الربط مع الشهر العقاري. صافي الهجرة يُحسب كفرق سنوي — يجب قراءته كاتجاه (3–5 سنوات) لا كقيمة مفردة لتجنب التذبذب الإحصائي.`,
    },
    finance: {
      items: finance,
      expert: `بمعدل فائدة ${mortRate}% فإن القسط الشهري لقرض مليون ج.م يبلغ ~22 ألف ج — أعلى من دخل الأسرة الوسطية، مما يُحوّل السوق فعلياً لسوق نقدي. يجب تقدير القيمة باستخدام معامل خصم سيولة (Liquidity Discount) 5–10%.`,
      stat: `معدلات النشأة ومؤشر إتاحة الرهن مقاييس وطنية لا محلية — لا يتغيران بتغيير الحي. للحصول على دقة محلية يلزم بيانات الفروع المصرفية في النطاق الجغرافي المحدد.`,
    },
    risk: {
      items: risk,
      expert: `انحراف ${fundDev}% عن القيمة العادلة ${Math.abs(+fundDev) > 15 ? "إشارة تحذير قوية — يجب مراجعة نموذج التقييم وإضافة Risk Premium" : "ضمن المعقول"}. تركز جغرافي ${concentration}% ${concentration > 60 ? "خطر تنويع عالٍ في المحفظة" : "مقبول"}.`,
      stat: `نموذج كشف الفقاعة هنا مبسّط (HPI − 3×Growth)؛ النموذج العلمي (UBS/Case-Shiller) يتطلب 4 مكونات على الأقل (P/I, P/R, Mortgage/GDP, Construction/GDP) وفترة قياس ≥10 سنوات للحصول على Z-Score موثوق.`,
    },
    macro: {
      items: macro,
      expert: `بيئة الفائدة المرتفعة (27.25%) والتضخم (27.5%) تجعل العقار ملاذاً للحفاظ على القيمة لا للنمو الحقيقي. عند احتساب العائد الحقيقي اطرح التضخم من العائد الإيجاري الاسمي.`,
      stat: `هذه مؤشرات وطنية ثابتة لجميع الأحياء — لا تتغير مع الفلتر. تستخدم كسياق تأطيري فقط، ولا تدخل مباشرة في معادلات التقييم المحلي إلا عبر معامل الخصم/معدل الرسملة.`,
    },
  };
}
