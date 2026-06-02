import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, Legend, PieChart, Pie, Cell } from "recharts";
import { Users } from "lucide-react";

type IndStatus = "good" | "warn" | "bad" | "neutral";
const fmt = (n: number) => isFinite(n) ? new Intl.NumberFormat("ar-EG").format(Math.round(n)) : "-";
const pct = (n: number, d = 1) => isFinite(n) ? `${n.toFixed(d)}%` : "-";

function KPI({ code, ar, en, value, unit, status = "neutral", hint }: { code: string; ar: string; en: string; value: string | number; unit?: string; status?: IndStatus; hint?: string }) {
  const colors: Record<IndStatus, string> = {
    good: "border-emerald-500/40 bg-emerald-50/40 dark:bg-emerald-950/20",
    warn: "border-amber-500/40 bg-amber-50/40 dark:bg-amber-950/20",
    bad: "border-rose-500/40 bg-rose-50/40 dark:bg-rose-950/20",
    neutral: "border-border bg-card",
  };
  return (
    <div className={`border rounded-lg p-3 ${colors[status]}`}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] font-mono text-muted-foreground">{code}</span>
        {status !== "neutral" && <Badge variant={status === "good" ? "default" : status === "bad" ? "destructive" : "secondary"} className="text-[9px] h-4">{status === "good" ? "✓" : status === "bad" ? "✗" : "•"}</Badge>}
      </div>
      <div className="text-xs font-semibold leading-tight">{ar}</div>
      <div className="text-[10px] text-muted-foreground mb-1">{en}</div>
      <div className="text-lg font-bold">{typeof value === "number" ? fmt(value) : value}{unit && <span className="text-xs font-normal text-muted-foreground mr-1">{unit}</span>}</div>
      {hint && <div className="text-[10px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

const up = (v: number, g: number, b: number): IndStatus => v >= g ? "good" : v <= b ? "bad" : "warn";
const dn = (v: number, g: number, b: number): IndStatus => v <= g ? "good" : v >= b ? "bad" : "warn";

export default function DemographicsKpisPanel() {
  const { data: districts } = useQuery({
    queryKey: ["dem-districts"],
    queryFn: async () => (await supabase.from("districts").select("*").order("population", { ascending: false })).data || [],
  });
  const [districtId, setDistrictId] = useState<string>("all");

  // افتراضات قابلة للضبط — مصدر CAPMAS 2023 + World Bank
  const [medianAnnualIncome, setMedianAnnualIncome] = useState<number>(96000); // ج.م/سنة (≈ 8000 شهرياً)
  const [medianPropertyPrice, setMedianPropertyPrice] = useState<number>(1500000); // ج.م
  const [tfr, setTfr] = useState<number>(2.85); // معدل الخصوبة المصري
  const [unemploymentRate, setUnemploymentRate] = useState<number>(7.2); // % (CAPMAS 2024)
  const [femaleLfp, setFemaleLfp] = useState<number>(18.5); // مشاركة المرأة %
  const [vacancyRate, setVacancyRate] = useState<number>(12); // % وحدات فارغة (مصر ≈ 11.7M وحدة فارغة)
  const [avgEducationYears, setAvgEducationYears] = useState<number>(9.6); // متوسط سنوات التعليم
  const [marriageRatePer1000, setMarriageRatePer1000] = useState<number>(9.1); // زيجة/1000

  const all = districts || [];
  const sel = districtId === "all" ? null : all.find((d: any) => d.id === districtId);
  const rows = sel ? [sel] : all;

  const m = useMemo(() => {
    const sum = (k: string) => rows.reduce((s, x: any) => s + (Number(x[k]) || 0), 0);
    const pop = sum("population");
    const hh = sum("households");
    const units = sum("housing_units");
    const bld = sum("buildings_count");
    const area = sum("area_km2");
    const netMig = sum("net_migration");
    const avgGrowth = rows.length ? rows.reduce((s, x: any) => s + (Number(x.growth_rate) || 0), 0) / rows.length : 0;
    const density = area ? pop / area : 0;
    const hhSize = hh ? pop / hh : 0;
    const ppu = units ? pop / units : 0; // persons per unit
    const popToHousing = units ? pop / units : 0;
    // افتراضات معيارية (CAPMAS / UN-Habitat) — قابلة للضبط
    const avgUnitArea = 110; // م²
    const perCapitaArea = pop ? (units * avgUnitArea) / pop : 0; // م²/فرد
    const targetUnits = Math.round(hh * 1.05); // عرض متوازن = 1.05 × عدد الأسر
    const deficit = Math.max(0, targetUnits - units);
    const surplus = Math.max(0, units - targetUnits);
    const newHouseholdsPerYear = Math.round(hh * (avgGrowth / 100) * 1.2); // معدل تكوين أسر تقريبي
    const latentDemand = Math.round(deficit + newHouseholdsPerYear * 3); // طلب كامن (3 سنوات)
    // افتراضات تركيبة مصرية (CAPMAS 2017 + IDSC):
    const youthPct = 38; // 20-40
    const familyPct = 42;
    const seniorPct = 8;
    const childPct = 12;
    const medianAge = 26;
    const ownershipRate = 67; // مصر ≈ 67% تملّك
    const rentalRate = 100 - ownershipRate;
    // ضغط الطلب: pop/units مع مستهدف 3-4 شخص/وحدة
    const demandPressure = ppu > 0 ? Math.min(100, (ppu / 3.5) * 100) : 0;
    // التحضّر — بورسعيد ≈ 100% حضر
    const urbanizationRate = 100;
    // السكان النهاريين: قدّر +12% للمناطق الحضرية النشطة
    const daytimePop = Math.round(pop * 1.12);
    // معدل التنقّل (Mobility) ≈ |netMig| / pop × 100
    const mobilityRate = pop ? (Math.abs(netMig) / pop) * 100 : 0;
    // متوسط مدة الإقامة (سنوات) — كلما قلّ التنقّل زادت
    const avgStay = mobilityRate > 0 ? Math.min(40, 100 / Math.max(0.5, mobilityRate)) : 25;
    // التمدّد الحضري: مساحة مأهولة / كثافة منخفضة
    const sprawl = density > 0 && density < 8000 ? "مرتفع" : density < 15000 ? "متوسط" : "منخفض";

    // توقعات سكانية 5/10 سنوات
    const r = avgGrowth / 100;
    const forecast = Array.from({ length: 11 }, (_, i) => ({ year: new Date().getFullYear() + i, pop: Math.round(pop * Math.pow(1 + r, i)) }));

    // Cohort placeholder
    const cohort = [
      { fia: "0-14", count: Math.round(pop * 0.32) },
      { fia: "15-29", count: Math.round(pop * 0.28) },
      { fia: "30-44", count: Math.round(pop * 0.22) },
      { fia: "45-64", count: Math.round(pop * 0.12) },
      { fia: "65+", count: Math.round(pop * 0.06) },
    ];

    // تفضيلات الوحدات (سوق مصري)
    const prefs = [
      { name: "شقق", value: 72 },
      { name: "فيلات/دوبلكس", value: 14 },
      { name: "سكن مشترك/استوديو", value: 9 },
      { name: "تجاري/مختلط", value: 5 },
    ];

    return { pop, hh, units, bld, area, netMig, avgGrowth, density, hhSize, ppu, popToHousing, perCapitaArea, deficit, surplus, newHouseholdsPerYear, latentDemand, youthPct, familyPct, seniorPct, childPct, medianAge, ownershipRate, rentalRate, demandPressure, urbanizationRate, daytimePop, mobilityRate, avgStay, sprawl, forecast, cohort, prefs };
  }, [rows]);

  const distRows = useMemo(() => all.map((d: any) => ({
    name: d.name?.replace("حي ", ""),
    pop: Number(d.population) || 0,
    units: Number(d.housing_units) || 0,
    deficit: Math.max(0, Math.round((Number(d.households) || 0) * 1.05) - (Number(d.housing_units) || 0)),
    density: Number(d.density) || 0,
  })), [all]);

  // ════════ المحور 8: الاقتصاد السكاني (Socio-Economic) ════════
  const se = useMemo(() => {
    const pop = m.pop;
    const hh = m.hh;
    const units = m.units;
    // نِسب عمرية (يفضّل لاحقاً ربطها بـ DB)
    const childPct = 32, workingAgePct = 62, seniorPct = 6;
    const children = Math.round(pop * childPct / 100);
    const workingAge = Math.round(pop * workingAgePct / 100);
    const seniors = Math.round(pop * seniorPct / 100);
    // نسبة الإعالة
    const dependencyRatio = workingAge ? ((children + seniors) / workingAge) * 100 : 0;
    const childDep = workingAge ? (children / workingAge) * 100 : 0;
    const oldDep = workingAge ? (seniors / workingAge) * 100 : 0;
    // القوى العاملة
    const laborForce = Math.round(workingAge * 0.48); // معدل المشاركة الإجمالي ≈ 48%
    const employed = Math.round(laborForce * (1 - unemploymentRate / 100));
    const femaleWorking = Math.round((pop * 0.49) * (femaleLfp / 100));
    // الدخل والقدرة الشرائية
    const householdIncome = medianAnnualIncome * 1.4; // متوسط دخل الأسرة (أكثر من فرد عامل)
    const affordabilityIndex = householdIncome ? medianPropertyPrice / householdIncome : 0; // السنوات
    const affordCat = affordabilityIndex < 5 ? "ميسور" : affordabilityIndex < 8 ? "متوسط" : affordabilityIndex < 12 ? "صعب" : "غير ميسور بشدة";
    const affordStatus: IndStatus = affordabilityIndex < 5 ? "good" : affordabilityIndex < 8 ? "warn" : "bad";
    const piRatio = affordabilityIndex; // Price-to-Income
    // الإيجار: افتراض 8% من قيمة العقار سنوياً
    const annualRent = medianPropertyPrice * 0.08;
    const rentBurden = householdIncome ? (annualRent / householdIncome) * 100 : 0;
    // الإسكان والشغور
    const vacantUnits = Math.round(units * vacancyRate / 100);
    const occupiedUnits = units - vacantUnits;
    const effectiveSupply = occupiedUnits;
    const realDeficit = Math.max(0, Math.round(hh * 1.05) - effectiveSupply);
    // النمو الطبيعي والخصوبة
    const nrr = tfr * 0.475; // Net Reproduction Rate تقريبياً
    const birthsPerYear = Math.round((pop * 0.49) * 0.022 * (tfr / 2.85)); // معدل المواليد ≈ 22/1000 إناث في سن الإنجاب
    const newMarriages = Math.round(pop * marriageRatePer1000 / 1000);
    // التعليم
    const educationIndex = Math.min(100, (avgEducationYears / 15) * 100);
    const literacy = Math.min(100, 71 + avgEducationYears); // تقريبي

    return { dependencyRatio, childDep, oldDep, workingAge, laborForce, employed, femaleWorking, householdIncome, affordabilityIndex, affordCat, affordStatus, piRatio, annualRent, rentBurden, vacantUnits, occupiedUnits, realDeficit, nrr, birthsPerYear, newMarriages, educationIndex, literacy };
  }, [m, medianAnnualIncome, medianPropertyPrice, tfr, unemploymentRate, femaleLfp, vacancyRate, avgEducationYears, marriageRatePer1000]);

  const COLORS = ["#185FA5", "#1D9E75", "#EF9F27", "#D85A30", "#8B5CF6"];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <CardTitle className="text-base flex items-center gap-2"><Users className="h-4 w-4" />📊 مؤشرات الديموغرافيا والسكان — 55+ مؤشر · 8 محاور</CardTitle>
        <Select value={districtId} onValueChange={setDistrictId}>
          <SelectTrigger className="w-64"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">📍 المحافظة كاملة</SelectItem>
            {all.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="size">
          <TabsList className="grid grid-cols-2 md:grid-cols-8 w-full">
            <TabsTrigger value="size">الحجم والنمو</TabsTrigger>
            <TabsTrigger value="structure">التركيبة والأسرة</TabsTrigger>
            <TabsTrigger value="housing">السكن والإشغال</TabsTrigger>
            <TabsTrigger value="demand">الطلب السكاني</TabsTrigger>
            <TabsTrigger value="spatial">التوزيع المكاني</TabsTrigger>
            <TabsTrigger value="behavior">أنماط وتنقّل</TabsTrigger>
            <TabsTrigger value="socio">الاقتصاد السكاني</TabsTrigger>
            <TabsTrigger value="forecast">التوقعات</TabsTrigger>
          </TabsList>

          {/* 1) الحجم والنمو */}
          <TabsContent value="size" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="D-01" ar="إجمالي السكان" en="Total Population" value={m.pop} />
              <KPI code="D-02" ar="معدل النمو السكاني" en="Population Growth Rate" value={pct(m.avgGrowth, 2)} status={up(m.avgGrowth, 2, 0)} hint="سنوي" />
              <KPI code="D-03" ar="الهجرة الصافية" en="Net Migration" value={m.netMig} status={m.netMig > 0 ? "good" : m.netMig < 0 ? "bad" : "neutral"} hint={m.netMig > 0 ? "منطقة جاذبة" : "منطقة طاردة"} />
              <KPI code="D-04" ar="الكثافة السكانية" en="Population Density" value={m.density} unit="نسمة/كم²" status={m.density > 18000 ? "bad" : m.density > 10000 ? "warn" : "good"} />
              <KPI code="D-05" ar="المساحة المأهولة" en="Inhabited Area" value={m.area.toFixed(1)} unit="كم²" />
              <KPI code="D-06" ar="السكان النهاريين" en="Daytime Population" value={m.daytimePop} hint="مهم للتجاري/الإداري" />
              <KPI code="D-07" ar="نمو سنوي مطلق" en="Absolute Annual Growth" value={Math.round(m.pop * m.avgGrowth / 100)} unit="نسمة" />
              <KPI code="D-08" ar="حصة المحافظة" en="Share of Governorate" value={pct(100, 0)} hint="بورسعيد" />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">السكان حسب الحي</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="pop" fill="#185FA5" name="السكان" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 2) التركيبة والأسرة */}
          <TabsContent value="structure" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="S-01" ar="عدد الأسر" en="Number of Households" value={m.hh} hint="أدقّ من السكان للطلب" />
              <KPI code="S-02" ar="متوسط حجم الأسرة" en="Avg Household Size" value={m.hhSize.toFixed(2)} unit="فرد" status={dn(m.hhSize, 4, 6)} />
              <KPI code="S-03" ar="معدل تكوين أسر/سنة" en="Household Formation Rate" value={m.newHouseholdsPerYear} unit="أسرة/سنة" hint="مولّد طلب مباشر" />
              <KPI code="S-04" ar="متوسط العمر" en="Median Age" value={m.medianAge} unit="سنة" />
              <KPI code="S-05" ar="شريحة الشباب (20-40)" en="Youth %" value={pct(m.youthPct)} status="good" hint="طلب شراء/إيجار" />
              <KPI code="S-06" ar="شريحة العائلات" en="Families %" value={pct(m.familyPct)} hint="طلب وحدات كبيرة" />
              <KPI code="S-07" ar="شريحة كبار السن" en="Seniors %" value={pct(m.seniorPct)} hint="طلب خدمات ورعاية" />
              <KPI code="S-08" ar="شريحة الأطفال" en="Children %" value={pct(m.childPct)} />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">التوزيع العمري (Cohort)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={m.cohort}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="fia" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="count" fill="#1D9E75" name="عدد" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 3) السكن والإشغال */}
          <TabsContent value="housing" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="H-01" ar="إجمالي الوحدات السكنية" en="Total Housing Units" value={m.units} />
              <KPI code="H-02" ar="عدد المباني" en="Buildings Count" value={m.bld} />
              <KPI code="H-03" ar="نسبة السكان للوحدات" en="Population-to-Housing Ratio" value={m.popToHousing.toFixed(2)} status={dn(m.popToHousing, 3.5, 5)} hint="عالي = نقص وحدات" />
              <KPI code="H-04" ar="كثافة الإشغال" en="Persons per Unit" value={m.ppu.toFixed(2)} unit="فرد/وحدة" status={dn(m.ppu, 3.5, 5)} />
              <KPI code="H-05" ar="نصيب الفرد من المساحة" en="Per Capita Living Area" value={m.perCapitaArea.toFixed(1)} unit="م²/فرد" status={up(m.perCapitaArea, 25, 15)} />
              <KPI code="H-06" ar="معدل التملّك" en="Home Ownership Rate" value={pct(m.ownershipRate)} status="good" hint="مصر ≈ 67%" />
              <KPI code="H-07" ar="معدل الإيجار" en="Rental Ratio" value={pct(m.rentalRate)} hint="سوق إيجاري" />
              <KPI code="H-08" ar="العجز السكني" en="Housing Deficit" value={m.deficit} unit="وحدة" status={m.deficit > 0 ? "bad" : "good"} />
              <KPI code="H-09" ar="الفائض السكني" en="Housing Surplus" value={m.surplus} unit="وحدة" status={m.surplus > 0 ? "warn" : "neutral"} />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">العجز السكني حسب الحي</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Legend /><Bar dataKey="units" fill="#185FA5" name="وحدات" /><Bar dataKey="deficit" fill="#D85A30" name="عجز" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 4) الطلب السكاني */}
          <TabsContent value="demand" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="Q-01" ar="مؤشر ضغط الطلب" en="Demand Pressure Index" value={m.demandPressure.toFixed(0)} unit="/100" status={up(m.demandPressure, 80, 50)} hint="ضغط السكان على الوحدات" />
              <KPI code="Q-02" ar="الطلب الكامن" en="Latent Demand" value={m.latentDemand} unit="وحدة" status={m.latentDemand > 5000 ? "bad" : m.latentDemand > 1000 ? "warn" : "good"} hint="عجز + تكوين أسر 3 سنوات" />
              <KPI code="Q-03" ar="طلب جديد سنوي" en="New Annual Demand" value={m.newHouseholdsPerYear} unit="وحدة/سنة" />
              <KPI code="Q-04" ar="حدّة العجز" en="Deficit Intensity" value={m.hh ? pct((m.deficit / m.hh) * 100) : "-"} status={m.deficit / m.hh > 0.1 ? "bad" : "good"} />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">تفضيلات الوحدات (Preferences Index)</div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={m.prefs} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${e.value}%`}>
                    {m.prefs.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 5) التوزيع المكاني */}
          <TabsContent value="spatial" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="X-01" ar="الكثافة السكانية" en="Density" value={m.density} unit="ن/كم²" status={m.density > 18000 ? "bad" : m.density > 10000 ? "warn" : "good"} />
              <KPI code="X-02" ar="معدل التحضّر" en="Urbanization Rate" value={pct(m.urbanizationRate)} status="good" hint="بورسعيد حضري بالكامل" />
              <KPI code="X-03" ar="التمدّد الحضري" en="Urban Sprawl" value={m.sprawl} status={m.sprawl === "مرتفع" ? "warn" : "good"} />
              <KPI code="X-04" ar="السكان النهاريين" en="Daytime Population" value={m.daytimePop} hint="نهار/تجاري" />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">الكثافة حسب الحي</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={distRows}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="density" fill="#EF9F27" name="ن/كم²" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 6) أنماط وتنقّل */}
          <TabsContent value="behavior" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="B-01" ar="نمط السكن السائد" en="Lifestyle Pattern" value={m.density > 15000 ? "حضري كثيف" : "حضري متوسط"} hint="حضري / فاخر / اقتصادي" />
              <KPI code="B-02" ar="متوسط مدة الإقامة" en="Avg Stay Duration" value={m.avgStay.toFixed(1)} unit="سنة" status={up(m.avgStay, 15, 5)} hint="استقرار سكاني" />
              <KPI code="B-03" ar="معدل التنقّل" en="Mobility Rate" value={pct(m.mobilityRate, 2)} status={dn(m.mobilityRate, 1, 3)} hint="تنقل بين المناطق" />
              <KPI code="B-04" ar="نسبة العائلات/الأفراد" en="Family/Single Ratio" value={(m.familyPct / (100 - m.familyPct)).toFixed(2)} />
            </div>
          </TabsContent>

          {/* 7) الاقتصاد السكاني (Socio-Economic) */}
          <TabsContent value="socio" className="mt-4 space-y-3">
            <Card className="border-primary/30">
              <CardContent className="p-4">
                <div className="text-sm font-semibold mb-3">⚙️ افتراضات قابلة للضبط (Egypt CAPMAS 2023 · World Bank)</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div><Label className="text-xs">متوسط الدخل السنوي (ج.م)</Label><Input type="number" value={medianAnnualIncome} onChange={e => setMedianAnnualIncome(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">متوسط سعر الوحدة (ج.م)</Label><Input type="number" value={medianPropertyPrice} onChange={e => setMedianPropertyPrice(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">معدل الخصوبة TFR</Label><Input type="number" step="0.05" value={tfr} onChange={e => setTfr(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">معدل البطالة %</Label><Input type="number" step="0.1" value={unemploymentRate} onChange={e => setUnemploymentRate(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">مشاركة المرأة %</Label><Input type="number" step="0.5" value={femaleLfp} onChange={e => setFemaleLfp(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">معدل الشغور %</Label><Input type="number" step="0.5" value={vacancyRate} onChange={e => setVacancyRate(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">متوسط سنوات التعليم</Label><Input type="number" step="0.1" value={avgEducationYears} onChange={e => setAvgEducationYears(Number(e.target.value))} className="h-8" /></div>
                  <div><Label className="text-xs">معدل الزواج /1000</Label><Input type="number" step="0.1" value={marriageRatePer1000} onChange={e => setMarriageRatePer1000(Number(e.target.value))} className="h-8" /></div>
                </div>
              </CardContent>
            </Card>

            <div className="text-xs font-bold text-muted-foreground mt-3">▸ القدرة الشرائية والإسكان الميسور (الأهم)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="SE-01" ar="مؤشر القدرة على التملّك" en="Affordability Index (P/I)" value={se.affordabilityIndex.toFixed(1)} unit="سنة" status={se.affordStatus} hint={`السوق ${se.affordCat} · المعيار العالمي < 5`} />
              <KPI code="SE-02" ar="نسبة السعر للدخل" en="Price-to-Income Ratio" value={se.piRatio.toFixed(1)} unit="x" status={dn(se.piRatio, 5, 10)} hint="مصر ≈ 9x — مرتفع" />
              <KPI code="SE-03" ar="عبء الإيجار" en="Rent Burden" value={pct(se.rentBurden, 1)} status={dn(se.rentBurden, 25, 40)} hint="من دخل الأسرة" />
              <KPI code="SE-04" ar="متوسط دخل الأسرة" en="Household Income" value={se.householdIncome} unit="ج.م/سنة" hint="مع 1.4 معيل" />
            </div>

            <div className="text-xs font-bold text-muted-foreground mt-3">▸ نسب الإعالة والقوى العاملة</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="SE-05" ar="نسبة الإعالة الكلية" en="Total Dependency Ratio" value={pct(se.dependencyRatio, 1)} status={dn(se.dependencyRatio, 55, 75)} hint="معيار البنك الدولي < 60%" />
              <KPI code="SE-06" ar="إعالة الأطفال" en="Child Dependency" value={pct(se.childDep, 1)} hint="< 15 سنة" />
              <KPI code="SE-07" ar="إعالة كبار السن" en="Old-Age Dependency" value={pct(se.oldDep, 1)} hint="> 64 سنة" />
              <KPI code="SE-08" ar="السكان في سن العمل" en="Working-Age Population" value={se.workingAge} unit="فرد" hint="15-64 سنة (62%)" />
              <KPI code="SE-09" ar="إجمالي القوى العاملة" en="Labor Force" value={se.laborForce} hint="معدل المشاركة 48%" />
              <KPI code="SE-10" ar="عدد المشتغلين" en="Employed Population" value={se.employed} status="good" />
              <KPI code="SE-11" ar="معدل البطالة" en="Unemployment Rate" value={pct(unemploymentRate, 1)} status={dn(unemploymentRate, 7, 12)} />
              <KPI code="SE-12" ar="إناث في سوق العمل" en="Female Working Population" value={se.femaleWorking} hint={`LFP=${femaleLfp}%`} />
            </div>

            <div className="text-xs font-bold text-muted-foreground mt-3">▸ التعليم والخصوبة وتكوين الأسر</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="SE-13" ar="مؤشر التعليم" en="Education Index" value={pct(se.educationIndex, 1)} status={up(se.educationIndex, 75, 50)} hint="UNDP scale" />
              <KPI code="SE-14" ar="معدل القراءة والكتابة" en="Literacy Rate" value={pct(se.literacy, 1)} status={up(se.literacy, 85, 70)} />
              <KPI code="SE-15" ar="معدل الخصوبة الكلي" en="Total Fertility Rate (TFR)" value={tfr.toFixed(2)} unit="طفل/امرأة" hint={tfr > 2.1 ? "أعلى من إحلال" : "أقل من إحلال"} />
              <KPI code="SE-16" ar="معدل التكاثر الصافي" en="Net Reproduction Rate" value={se.nrr.toFixed(2)} status={up(se.nrr, 1, 0.8)} hint="NRR > 1 = نمو" />
              <KPI code="SE-17" ar="مواليد سنوياً" en="Annual Births" value={se.birthsPerYear} hint="مولّد طلب 2045+" />
              <KPI code="SE-18" ar="عقود زواج جديدة/سنة" en="New Marriages" value={se.newMarriages} status="good" hint="طلب فوري على السكن" />
              <KPI code="SE-19" ar="معدل الزواج" en="Crude Marriage Rate" value={marriageRatePer1000.toFixed(1)} unit="/1000" />
              <KPI code="SE-20" ar="معدل المواليد الخام" en="Crude Birth Rate" value={`${((se.birthsPerYear / m.pop) * 1000).toFixed(1)}`} unit="/1000" />
            </div>

            <div className="text-xs font-bold text-muted-foreground mt-3">▸ كفاءة العرض السكني (Effective Supply)</div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="SE-21" ar="معدل الشغور" en="Vacancy Rate" value={pct(vacancyRate, 1)} status={dn(vacancyRate, 8, 18)} hint="معيار CBRE < 10%" />
              <KPI code="SE-22" ar="الوحدات الفارغة" en="Vacant Units" value={se.vacantUnits} status={se.vacantUnits > m.units * 0.15 ? "bad" : "warn"} />
              <KPI code="SE-23" ar="الوحدات المأهولة" en="Occupied Units" value={se.occupiedUnits} status="good" />
              <KPI code="SE-24" ar="العجز الحقيقي" en="Effective Housing Deficit" value={se.realDeficit} unit="وحدة" status={se.realDeficit > 0 ? "bad" : "good"} hint="بعد خصم الشغور" />
            </div>

            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">هرم الإعالة (Dependency Pyramid)</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={[
                  { name: "أطفال (0-14)", value: se.childDep, fill: "#EF9F27" },
                  { name: "سن العمل (15-64)", value: 100, fill: "#1D9E75" },
                  { name: "كبار السن (65+)", value: se.oldDep, fill: "#D85A30" },
                ]}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="name" tick={{ fontSize: 11 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Bar dataKey="value" name="% من سن العمل" /></BarChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>

          {/* 8) التوقعات */}
          <TabsContent value="forecast" className="mt-4 space-y-3">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <KPI code="F-01" ar="توقع السكان 2030" en="Population 2030" value={m.forecast[5]?.pop || 0} />
              <KPI code="F-02" ar="توقع السكان 2035" en="Population 2035" value={m.forecast[10]?.pop || 0} />
              <KPI code="F-03" ar="نمو متراكم 10 سنوات" en="10y Cumulative Growth" value={m.pop ? pct(((m.forecast[10]?.pop || m.pop) / m.pop - 1) * 100) : "-"} status="good" />
              <KPI code="F-04" ar="الزخم الديموغرافي" en="Demographic Momentum" value={m.avgGrowth > 1.5 ? "مرتفع" : m.avgGrowth > 0.5 ? "متوسط" : "منخفض"} status={m.avgGrowth > 1.5 ? "good" : m.avgGrowth > 0.5 ? "warn" : "bad"} hint="استمرار النمو" />
            </div>
            <Card><CardContent className="p-4">
              <div className="text-sm font-semibold mb-2">توقّع السكان (Population Forecast)</div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={m.forecast}><CartesianGrid strokeDasharray="3 3" /><XAxis dataKey="year" tick={{ fontSize: 10 }} /><YAxis tick={{ fontSize: 10 }} /><Tooltip /><Line type="monotone" dataKey="pop" stroke="#185FA5" strokeWidth={2} name="السكان" /></LineChart>
              </ResponsiveContainer>
            </CardContent></Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
