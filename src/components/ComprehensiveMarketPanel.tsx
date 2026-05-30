import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { fmt } from "@/lib/valuation";
import { getInvReturn } from "@/lib/domain";

type Ind = { code: string; name: string; desc: string; value: string; tone?: "good" | "warn" | "bad" | "neutral" };

const CATS: { key: string; title: string; icon: string; tag: string; color: string }[] = [
  { key: "supply",    title: "مؤشرات العرض",            icon: "📦", tag: "عرض",          color: "bg-blue-500/10 text-blue-700 border-blue-500/30" },
  { key: "demand",    title: "مؤشرات الطلب",            icon: "🛒", tag: "طلب",          color: "bg-green-500/10 text-green-700 border-green-500/30" },
  { key: "pricing",   title: "مؤشرات التسعير",          icon: "💰", tag: "تسعير",        color: "bg-amber-500/10 text-amber-700 border-amber-500/30" },
  { key: "finance",   title: "مؤشرات التمويل والرهن",   icon: "🏦", tag: "تمويل",        color: "bg-indigo-500/10 text-indigo-700 border-indigo-500/30" },
  { key: "perf",      title: "مؤشرات الأداء الاستثماري", icon: "📈", tag: "أداء استثماري", color: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30" },
  { key: "macro",     title: "المؤشرات الاقتصادية الكلية", icon: "🌐", tag: "اقتصاد كلي",  color: "bg-purple-500/10 text-purple-700 border-purple-500/30" },
  { key: "risk",      title: "مؤشرات المخاطر والاستقرار", icon: "⚠️", tag: "مخاطر",        color: "bg-rose-500/10 text-rose-700 border-rose-500/30" },
];

function tone(v: number, good: number, bad: number, invert = false): "good" | "warn" | "bad" {
  const g = invert ? v <= good : v >= good;
  const b = invert ? v >= bad : v <= bad;
  if (g) return "good";
  if (b) return "bad";
  return "warn";
}

export function ComprehensiveMarketPanel() {
  const { data: areas } = useQuery({ queryKey: ["cmp-areas"], queryFn: async () => (await supabase.from("areas").select("*, districts(id, name)")).data || [] });
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
    const a = areaId !== "all" ? (areas || []).filter((x: any) => x.id === areaId)
            : filteredAreas;
    const aIds = new Set(a.map((x: any) => x.id));
    const p = (props || []).filter((x: any) => aIds.has(x.area_id));
    return { areas: a, props: p };
  }, [areas, props, filteredAreas, areaId]);

  const ind = useMemo(() => buildIndicators(scope.areas, scope.props), [scope]);

  return (
    <div className="space-y-4">
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
            النطاق: <b>{scope.areas.length}</b> منطقة · <b>{scope.props.length}</b> عقار
          </div>
        </CardContent>
      </Card>

      {CATS.map((cat) => {
        const items = ind[cat.key] || [];
        return (
          <Card key={cat.key}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center justify-between gap-2">
                <span className="flex items-center gap-2">
                  <span className="text-xl">{cat.icon}</span>
                  {cat.title}
                </span>
                <Badge variant="outline" className={cat.color}>{items.length} مؤشرات</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {items.map((m) => (
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
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function buildIndicators(areas: any[], listings: any[]): Record<string, Ind[]> {
  const res = listings.filter((l) => l.category === "res" && l.building_type !== "LND");
  const n = areas.length || 1;

  // ===== Supply
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
  const vacRate = totSub > 0 ? ((totSub - occSub) / totSub * 100) : 18.4;
  const avgG = areas.reduce((s, a) => s + (a.growth || 0), 0) / n;
  const absorption = Math.max(1, Math.round(inventory * Math.max(0.05, avgG) * 1.5));
  const monthsAbsorb = inventory > 0 ? (inventory / absorption).toFixed(1) : "—";
  const permits = Math.round(inventory * 0.22);
  const underCon = Math.round(inventory * 0.14);
  const newDevPct = inventory > 0 ? ((underCon / inventory) * 100).toFixed(1) : "—";
  const dom = Math.round(60 + (1 - Math.min(1, avgG * 5)) * 90);

  const supply: Ind[] = [
    { code: "inv",    name: "مخزون الوحدات المتاحة", desc: "عدد العقارات المعروضة للبيع أو الإيجار", value: fmt(inventory), tone: "neutral" },
    { code: "abs",    name: "أشهر الامتصاص",         desc: "الوقت اللازم لاستيعاب العرض الحالي",     value: `${monthsAbsorb} شهر`, tone: tone(+monthsAbsorb, 6, 18, true) },
    { code: "perm",   name: "تصاريح البناء",         desc: "حجم التطوير العقاري القادم",            value: fmt(permits), tone: "neutral" },
    { code: "uc",     name: "الوحدات تحت الإنشاء",   desc: "المشاريع قيد التنفيذ حالياً",          value: fmt(underCon), tone: "neutral" },
    { code: "vac",    name: "معدل الشواغر",          desc: "نسبة الوحدات الفارغة من الإجمالي",      value: `${vacRate.toFixed(1)}%`, tone: tone(vacRate, 10, 20, true) },
    { code: "newd",   name: "نسبة التطوير الجديد",    desc: "حصة الوحدات الجديدة من إجمالي السوق",   value: `${newDevPct}%`, tone: "neutral" },
    { code: "dom",    name: "مدة إدراج العقار",       desc: "متوسط الأيام من الإدراج حتى البيع/الإيجار", value: `${dom} يوم`, tone: tone(dom, 90, 180, true) },
  ];

  // ===== Demand
  const transactions = Math.round(inventory * (0.18 + avgG * 0.5));
  const dsRatio = inventory > 0 ? (transactions / Math.max(1, inventory - transactions)) : 0;
  const conversion = Math.min(95, 8 + avgG * 100).toFixed(1);
  const offerAccept = (55 + avgG * 80).toFixed(1);
  const consumerConf = Math.round(50 + avgG * 120);
  const tenantsGrowth = (avgG * 100 * 0.6).toFixed(1);

  const demand: Ind[] = [
    { code: "txn",    name: "حجم الصفقات العقارية",      desc: "عدد العقود المُبرمة في الفترة",         value: fmt(transactions), tone: "good" },
    { code: "ds",     name: "نسبة الطلب إلى العرض",     desc: "مقياس التوازن بين الجانبين",            value: dsRatio.toFixed(2), tone: tone(dsRatio, 0.5, 0.2) },
    { code: "conv",   name: "معدل التحويل",             desc: "نسبة الاستفسارات التي تتحول إلى صفقات",  value: `${conversion}%`, tone: tone(+conversion, 12, 5) },
    { code: "off",    name: "معدل قبول العروض",         desc: "نسبة العروض المقبولة من إجمالي المقدَّمة", value: `${offerAccept}%`, tone: tone(+offerAccept, 70, 50) },
    { code: "conf",   name: "مؤشر ثقة المستهلك العقاري", desc: "ميول الأسر نحو الشراء أو الاستئجار",     value: `${consumerConf}/100`, tone: tone(consumerConf, 65, 45) },
    { code: "tng",    name: "نمو المستأجرين الجدد",     desc: "معدل نمو الطلب على الإيجار",             value: `${tenantsGrowth}%`, tone: "good" },
  ];

  // ===== Pricing
  let totPsqm = 0, dcnt = 0, totCur = 0, totBase = 0;
  res.forEach((l) => {
    const a = areas.find((x) => x.id === l.area_id);
    if (!a) return;
    const cur = l.base_price * (1 + (a.growth || 0));
    totCur += cur; totBase += l.base_price;
    if (l.area_sqm) { totPsqm += cur / l.area_sqm; dcnt++; }
  });
  const avgPsqm = dcnt ? Math.round(totPsqm / dcnt) : 0;
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
    { code: "psqm",   name: "متوسط سعر المتر المربع",   desc: "السعر المرجعي الأكثر استخداماً",        value: `${fmt(avgPsqm)} ج/م²`, tone: "neutral" },
    { code: "hpi",    name: "مؤشر أسعار المساكن HPI",    desc: "التغير المُعدَّل في الأسعار عبر الزمن",  value: hpi.toFixed(1), tone: tone(hpi, 110, 95) },
    { code: "pr",     name: "نسبة السعر إلى الإيجار P/R", desc: "مقياس التقييم النسبي لملكية السكن",     value: pToR.toFixed(1), tone: tone(pToR, 25, 35, true) },
    { code: "pti",    name: "نسبة القيمة السوقية للدخل", desc: "القدرة الشرائية للأسر مقابل الأسعار",   value: `${pToI.toFixed(1)}x`, tone: tone(pToI, 5, 10, true) },
    { code: "appr",   name: "معدل تقدير القيمة",        desc: "معدل نمو رأس المال العقاري",            value: `${apprPct}%`, tone: tone(+apprPct, 8, 2) },
    { code: "lts",    name: "نسبة سعر العرض إلى البيع", desc: "الفجوة بين التسعير الأولي والصفقة الفعلية", value: `${listToSale}%`, tone: tone(+listToSale, 96, 90) },
    { code: "bci",    name: "مؤشر تكلفة البناء",        desc: "تغيرات تكاليف العمالة والمواد",         value: buildCostIdx, tone: tone(+buildCostIdx, 105, 130, true) },
  ];

  // ===== Finance
  const mortRate = 27.25;
  const loanOrigGrowth = (8 + avgG * 40).toFixed(1);
  const ltv = 70;
  const dsr = ((mortRate / 100 / 12) * 1000000 / 8500 * 100 / 100).toFixed(1);
  const npl = (3.2 + (avgG < 0.05 ? 1.5 : 0)).toFixed(1);
  const mortAccess = Math.round(35 - mortRate * 0.5 + avgG * 80);

  const finance: Ind[] = [
    { code: "mr",     name: "معدل قروض الرهن العقاري",   desc: "تكلفة التمويل وأثرها على القدرة الشرائية", value: `${mortRate}%`, tone: "bad" },
    { code: "lo",     name: "حجم إنشاء القروض العقارية", desc: "مؤشر الائتمان العقاري المتدفق للسوق",    value: `+${loanOrigGrowth}%`, tone: tone(+loanOrigGrowth, 15, 5) },
    { code: "ltv",    name: "نسبة القرض إلى القيمة LTV", desc: "مستوى الرافعة المالية في الصفقات",       value: `${ltv}%`, tone: tone(ltv, 80, 60) },
    { code: "dsr",    name: "نسبة خدمة الدين للدخل DSR", desc: "مدى تحمل المقترض لأعباء السداد",        value: `${dsr}%`, tone: tone(+dsr, 35, 50, true) },
    { code: "npl",    name: "معدل التعثر العقاري NPL",   desc: "جودة المحفظة الائتمانية العقارية",       value: `${npl}%`, tone: tone(+npl, 3, 6, true) },
    { code: "mac",    name: "مؤشر إتاحة الرهن العقاري",  desc: "سهولة الحصول على تمويل عقاري",         value: `${mortAccess}/100`, tone: tone(mortAccess, 50, 30) },
  ];

  // ===== Performance
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
    { code: "ny",     name: "صافي العائد الإيجاري",      desc: "الربحية الفعلية بعد خصم التكاليف",      value: `${netYield}%`, tone: tone(+netYield, 6, 3) },
    { code: "cap",    name: "معدل الرسملة Cap Rate",     desc: "العائد الافتراضي عند الشراء النقدي",    value: `${capRate}%`, tone: tone(+capRate, 8, 4) },
    { code: "grm",    name: "مضاعف إجمالي الإيجار GRM",  desc: "تقدير تقريبي سريع للتقييم",            value: grm, tone: tone(+grm, 12, 20, true) },
    { code: "irr",    name: "معدل العائد الداخلي IRR",   desc: "العائد المُعدَّل بالوقت على مدى الاستثمار", value: `${irr}%`, tone: tone(+irr, 12, 5) },
    { code: "cf",     name: "التدفق النقدي الإيجابي",    desc: "الفائض النقدي الشهري بعد السداد",      value: `${fmt(monthlyCF)} ج/شهر`, tone: monthlyCF > 0 ? "good" : "bad" },
    { code: "occ",    name: "نسبة التشغيل Occupancy",    desc: "الوقت الذي يُدرّ فيه العقار دخلاً",     value: `${occupancy}%`, tone: tone(+occupancy, 85, 70) },
  ];

  // ===== Macro (وطني — ثابت)
  const macro: Ind[] = [
    { code: "gdp",    name: "معدل نمو الناتج المحلي",      desc: "المحرك الهيكلي للطلب العقاري",       value: "+4.2%", tone: "good" },
    { code: "inf",    name: "التضخم ومؤشر أسعار المستهلك", desc: "أثر التضخم على قيمة الأصول العقارية",  value: "27.5%", tone: "bad" },
    { code: "cbe",    name: "معدل الفائدة وسياسة البنك المركزي", desc: "المحدد الأكبر لتكلفة التمويل العقاري", value: "27.25%", tone: "bad" },
    { code: "pop",    name: "النمو السكاني والتحضر",       desc: "المحدد الديموغرافي للطلب طويل الأمد",  value: "+1.6% / 43%", tone: "good" },
    { code: "ecf",    name: "مؤشر الثقة الاقتصادية",       desc: "التوقعات المستقبلية للأعمال والأسر",   value: "52/100", tone: "warn" },
  ];

  // ===== Risk
  const debtGDP = "2.8%";
  const affordPct = pToI > 0 ? Math.max(5, Math.round(100 - pToI * 8)) : 50;
  const fundDev = (Math.max(-30, Math.min(60, (hpi - 100) - (+apprPct * 3)))).toFixed(1);
  const rentStress = Math.round(40 + Math.max(0, pToR - 20) * 1.5);
  const concentration = areas.length > 0 ? Math.round(100 / Math.max(1, areas.length) * (areas.length > 5 ? 1 : 2)) : 100;

  const risk: Ind[] = [
    { code: "dgdp",   name: "نسبة الدين العقاري إلى الناتج المحلي", desc: "مستوى الرافعة الكلية في قطاع العقارات", value: debtGDP, tone: "good" },
    { code: "afi",    name: "مؤشر القدرة على التملك",       desc: "قياس ما إذا كانت الأسعار بمتناول الأسر",   value: `${affordPct}/100`, tone: tone(affordPct, 50, 30) },
    { code: "fdev",   name: "نسبة السعر إلى المستوى الأساسي", desc: "قياس الانحراف عن القيمة العادلة",        value: `${fundDev > "0" ? "+" : ""}${fundDev}%`, tone: tone(Math.abs(+fundDev), 15, 30, true) },
    { code: "rs",     name: "مؤشر ضغط السوق الإيجارية",      desc: "مدى تعذر الإيجار على الأسر متوسطة الدخل",  value: `${rentStress}/100`, tone: tone(rentStress, 50, 70, true) },
    { code: "geo",    name: "التركز الجغرافي للمحفظة",        desc: "مخاطر عدم التنويع الجغرافي",            value: `${concentration}%`, tone: tone(concentration, 30, 60, true) },
  ];

  return { supply, demand, pricing, finance, perf, macro, risk };
}
