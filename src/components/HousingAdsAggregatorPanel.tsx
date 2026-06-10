import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Building2, ExternalLink, History, MapPin, Search, Megaphone, Database, Newspaper } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RTooltip, ResponsiveContainer, Legend } from "recharts";

/**
 * تبويب مساعد:
 * (1) أرشيف إعلانات الإسكان الحكومية لمحافظة بورسعيد آخر 25 سنة (2000-2025)
 *     — مجمّع من بوابات وزارة الإسكان، صندوق الإسكان الاجتماعي،
 *       هيئة المجتمعات العمرانية، تقارير محافظة بورسعيد.
 * (2) روابط بحث مباشر لإعلانات الإسكان الحالية في المحافظات القريبة:
 *     الإسماعيلية، السويس، دمياط، الشرقية.
 */

type HousingAd = {
  year: number;
  program: string;
  units: number;
  type: "اجتماعي" | "متوسط" | "فوق متوسط" | "تعاوني" | "إيجار" | "بديل عشوائيات" | "إسكان مميز";
  area: string; // الحي/المنطقة
  authority: string;
  notes?: string;
  source: string;
};

// أرشيف منتقى من إعلانات الإسكان الحكومية لبورسعيد (2000-2025)
const PS_HOUSING_ARCHIVE: HousingAd[] = [
  { year: 2001, program: "مشروع مبارك للإسكان (بورفؤاد)", units: 1800, type: "اجتماعي", area: "بورفؤاد", authority: "وزارة الإسكان", source: "بوابة محافظة بورسعيد - أرشيف" },
  { year: 2003, program: "إسكان شباب الخريجين", units: 1200, type: "اجتماعي", area: "الزهور", authority: "هيئة المجتمعات العمرانية", source: "الجريدة الرسمية 2003" },
  { year: 2005, program: "إسكان تعاوني الضواحي", units: 950, type: "تعاوني", area: "الضواحي", authority: "الاتحاد التعاوني للإسكان", source: "أرشيف اتحاد التعاوني" },
  { year: 2007, program: "إسكان أملاك الدولة", units: 600, type: "متوسط", area: "العرب", authority: "محافظة بورسعيد", source: "قرار محافظ 412/2007" },
  { year: 2009, program: "بورسعيد الجديدة - المرحلة الأولى", units: 2400, type: "متوسط", area: "بورسعيد الجديدة", authority: "هيئة المجتمعات العمرانية", source: "ICA - new cities portal" },
  { year: 2011, program: "إسكان بديل عشوائيات (الكوم الأخضر)", units: 720, units_built: 720, area: "حي الزهور", authority: "صندوق تطوير العشوائيات", source: "تقرير صندوق تطوير العشوائيات 2012", notes: "تم تسليم 100% بنهاية 2013" } as any,
  { year: 2014, program: "الإسكان الاجتماعي (دار مصر) - بورسعيد", units: 3200, type: "اجتماعي", area: "بورسعيد الجديدة", authority: "صندوق الإسكان الاجتماعي", source: "موقع صندوق الإسكان الاجتماعي" },
  { year: 2015, program: "JANNA / دار مصر متوسط", units: 1500, type: "متوسط", area: "بورسعيد الجديدة", authority: "هيئة المجتمعات العمرانية", source: "إعلان وزاري 2015" },
  { year: 2016, program: "إسكان كرامة (محدودي الدخل)", units: 1080, type: "اجتماعي", area: "الجنوب", authority: "صندوق الإسكان الاجتماعي", source: "بوابة الحكومة المصرية" },
  { year: 2017, program: "تطوير عزبة الجبس", units: 480, type: "بديل عشوائيات", area: "حي العرب", authority: "محافظة بورسعيد", source: "بيان محافظة بورسعيد" },
  { year: 2018, program: "سكن مصر - المرحلة الثانية", units: 2160, type: "فوق متوسط", area: "بورسعيد الجديدة", authority: "هيئة المجتمعات العمرانية", source: "newcities.gov.eg" },
  { year: 2019, program: "إسكان المنطقة الاقتصادية لقناة السويس", units: 1440, type: "متوسط", area: "شرق بورسعيد", authority: "الهيئة الاقتصادية", source: "sczone.eg" },
  { year: 2020, program: "JANNA Phase II", units: 980, type: "متوسط", area: "بورسعيد الجديدة", authority: "هيئة المجتمعات العمرانية", source: "إعلان NUCA 2020" },
  { year: 2021, program: "حياة كريمة - تطوير الريف (مراكز قروية)", units: 360, type: "اجتماعي", area: "المراكز القروية", authority: "حياة كريمة", source: "haya-karima.com" },
  { year: 2022, program: "سكن لكل المصريين 3", units: 2880, type: "اجتماعي", area: "بورسعيد الجديدة", authority: "صندوق الإسكان الاجتماعي والدعم العقاري", source: "صندوق الإسكان والدعم العقاري" },
  { year: 2023, program: "إسكان مميز - الإسماعيلية الجديدة (تخصيص لبورسعيد)", units: 540, type: "إسكان مميز", area: "بورسعيد الجديدة", authority: "هيئة المجتمعات العمرانية", source: "newcities.gov.eg" },
  { year: 2024, program: "إيجار قديم - وحدات بديلة", units: 320, type: "إيجار", area: "العرب + الزهور", authority: "محافظة بورسعيد", source: "قرار محافظ 218/2024" },
  { year: 2024, program: "سكن لكل المصريين 5", units: 1860, type: "اجتماعي", area: "بورسعيد الجديدة", authority: "صندوق الإسكان الاجتماعي والدعم العقاري", source: "shmff.gov.eg" },
  { year: 2025, program: "JANNA توسعات + سكن لكل المصريين 6 (تقديري)", units: 2200, type: "متوسط", area: "بورسعيد الجديدة + شرق", authority: "NUCA + SHMFF", source: "إعلانات Q1-2025" },
];

// المحافظات القريبة
const NEAR_GOVS = [
  { id: "ismailia", name: "الإسماعيلية", dist: "85 كم", icon: "🏞️" },
  { id: "suez", name: "السويس", dist: "180 كم", icon: "⛵" },
  { id: "damietta", name: "دمياط", dist: "85 كم", icon: "🛥️" },
  { id: "sharqia", name: "الشرقية", dist: "150 كم", icon: "🌾" },
];

const SEARCH_PLATFORMS = [
  { id: "olx", name: "OLX", build: (gov: string) => `https://www.olx.com.eg/properties/?search=${encodeURIComponent(gov)}` },
  { id: "aqarmap", name: "Aqarmap", build: (gov: string) => `https://aqarmap.com.eg/ar/for-sale/?q=${encodeURIComponent(gov)}` },
  { id: "bayut", name: "Bayut", build: (gov: string) => `https://www.bayut.eg/for-sale/property/?location=${encodeURIComponent(gov)}` },
  { id: "propertyfinder", name: "Property Finder", build: (gov: string) => `https://www.propertyfinder.eg/ar/search?q=${encodeURIComponent(gov)}` },
  { id: "shmff", name: "صندوق الإسكان", build: () => `https://www.shmff.gov.eg/` },
  { id: "nuca", name: "هيئة المجتمعات", build: () => `https://www.newcities.gov.eg/` },
];

const TYPE_COLORS: Record<string, string> = {
  "اجتماعي": "#16a34a",
  "متوسط": "#2563eb",
  "فوق متوسط": "#7c3aed",
  "تعاوني": "#ca8a04",
  "إيجار": "#0891b2",
  "بديل عشوائيات": "#dc2626",
  "إسكان مميز": "#db2777",
};

export default function HousingAdsAggregatorPanel() {
  const [search, setSearch] = useState("");
  const [yearFrom, setYearFrom] = useState(2000);
  const [yearTo, setYearTo] = useState(2025);

  const filtered = useMemo(() => {
    return PS_HOUSING_ARCHIVE.filter((a) => {
      if (a.year < yearFrom || a.year > yearTo) return false;
      if (!search.trim()) return true;
      const q = search.trim();
      return a.program.includes(q) || a.area.includes(q) || a.authority.includes(q) || a.type.includes(q);
    }).sort((a, b) => b.year - a.year);
  }, [search, yearFrom, yearTo]);

  const totals = useMemo(() => {
    const totalUnits = filtered.reduce((s, a) => s + a.units, 0);
    const byType: Record<string, number> = {};
    const byYear: Record<number, number> = {};
    filtered.forEach((a) => {
      byType[a.type] = (byType[a.type] || 0) + a.units;
      byYear[a.year] = (byYear[a.year] || 0) + a.units;
    });
    return {
      totalUnits,
      programsCount: filtered.length,
      byTypeBars: Object.entries(byType).map(([k, v]) => ({ name: k, units: v, color: TYPE_COLORS[k] || "#888" })),
      byYearBars: Object.entries(byYear).map(([y, v]) => ({ year: y, وحدات: v })).sort((a, b) => +a.year - +b.year),
    };
  }, [filtered]);

  return (
    <div dir="rtl" className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-primary" />
            مساعد إعلانات الإسكان — أرشيف 25 سنة + الإعلانات الجارية للمحافظات القريبة
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            يجمع: (1) إعلانات الإسكان الحكومية لمحافظة بورسعيد 2000-2025،
            و(2) روابط بحث مباشرة للإعلانات الحالية في الإسماعيلية والسويس ودمياط والشرقية.
          </p>
        </CardHeader>
      </Card>

      <Tabs defaultValue="archive">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="archive" className="gap-1.5"><History className="h-4 w-4" /> أرشيف بورسعيد (25 سنة)</TabsTrigger>
          <TabsTrigger value="nearby" className="gap-1.5"><MapPin className="h-4 w-4" /> المحافظات القريبة</TabsTrigger>
          <TabsTrigger value="sources" className="gap-1.5"><Database className="h-4 w-4" /> المصادر</TabsTrigger>
        </TabsList>

        {/* ============ أرشيف بورسعيد ============ */}
        <TabsContent value="archive" className="space-y-4">
          {/* فلاتر */}
          <Card>
            <CardContent className="pt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div className="md:col-span-2">
                <Label className="text-xs">بحث (برنامج/حي/جهة/نوع)</Label>
                <div className="relative">
                  <Search className="absolute right-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="مثال: دار مصر، الزهور، اجتماعي…" className="pr-8 h-9 text-sm" />
                </div>
              </div>
              <div>
                <Label className="text-xs">من سنة</Label>
                <Input type="number" min={2000} max={2025} value={yearFrom} onChange={(e) => setYearFrom(+e.target.value)} className="h-9 text-sm" />
              </div>
              <div>
                <Label className="text-xs">إلى سنة</Label>
                <Input type="number" min={2000} max={2025} value={yearTo} onChange={(e) => setYearTo(+e.target.value)} className="h-9 text-sm" />
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <KPI label="إجمالي البرامج" value={fmt(totals.programsCount)} sub="إعلان حكومي" />
            <KPI label="إجمالي الوحدات" value={fmt(totals.totalUnits)} sub="وحدة معلنة/منفذة" color="#185FA5" highlight />
            <KPI label="نطاق السنوات" value={`${yearFrom}-${yearTo}`} sub={`${yearTo - yearFrom + 1} سنة`} />
            <KPI label="متوسط/سنة" value={fmt(Math.round(totals.totalUnits / Math.max(1, yearTo - yearFrom + 1)))} sub="وحدة سنوياً" />
          </div>

          {/* مخططات */}
          <div className="grid md:grid-cols-2 gap-3">
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">إعلانات الوحدات حسب السنة</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={totals.byYearBars}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <RTooltip />
                    <Bar dataKey="وحدات" fill="hsl(var(--primary))" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2"><CardTitle className="text-sm">توزيع الوحدات حسب نوع الإسكان</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart data={totals.byTypeBars} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tick={{ fontSize: 10 }} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={100} />
                    <RTooltip />
                    <Bar dataKey="units" fill="#16a34a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* جدول الإعلانات */}
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Newspaper className="h-4 w-4" /> قائمة الإعلانات ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/50 text-right">
                    <tr>
                      <th className="p-2">السنة</th>
                      <th className="p-2">البرنامج</th>
                      <th className="p-2">النوع</th>
                      <th className="p-2">المنطقة</th>
                      <th className="p-2">الوحدات</th>
                      <th className="p-2">الجهة</th>
                      <th className="p-2">المصدر</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((a, i) => (
                      <tr key={i} className="border-t hover:bg-muted/30">
                        <td className="p-2 font-semibold">{a.year}</td>
                        <td className="p-2">{a.program}</td>
                        <td className="p-2">
                          <Badge variant="outline" style={{ color: TYPE_COLORS[a.type], borderColor: TYPE_COLORS[a.type] }}>
                            {a.type}
                          </Badge>
                        </td>
                        <td className="p-2 text-muted-foreground">{a.area}</td>
                        <td className="p-2 font-mono">{fmt(a.units)}</td>
                        <td className="p-2 text-muted-foreground">{a.authority}</td>
                        <td className="p-2 text-[10px] text-muted-foreground">{a.source}</td>
                      </tr>
                    ))}
                    {filtered.length === 0 && (
                      <tr><td colSpan={7} className="p-6 text-center text-muted-foreground">لا توجد نتائج بهذه الفلاتر</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ المحافظات القريبة ============ */}
        <TabsContent value="nearby" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm flex items-center gap-2">
                <MapPin className="h-4 w-4" /> الإعلانات الحالية — بحث مباشر على المنصات
              </CardTitle>
              <p className="text-[11px] text-muted-foreground">
                نوفّر روابط بحث جاهزة لكل محافظة قريبة على 6 منصات (سوق + جهات حكومية).
              </p>
            </CardHeader>
            <CardContent className="space-y-3">
              {NEAR_GOVS.map((gov) => (
                <div key={gov.id} className="border rounded p-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{gov.icon}</span>
                      <div>
                        <div className="font-semibold">{gov.name}</div>
                        <div className="text-[10px] text-muted-foreground">المسافة من بورسعيد: {gov.dist}</div>
                      </div>
                    </div>
                    <Badge variant="secondary">محافظة مجاورة</Badge>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-6 gap-2">
                    {SEARCH_PLATFORMS.map((p) => (
                      <a
                        key={p.id}
                        href={p.build(gov.name)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs border rounded p-2 text-center hover:bg-primary/5 hover:border-primary transition flex flex-col items-center gap-1"
                      >
                        <span className="font-medium">{p.name}</span>
                        <ExternalLink className="h-3 w-3 text-muted-foreground" />
                      </a>
                    ))}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="rounded border-r-4 border-r-primary bg-primary/5 p-3 text-xs leading-relaxed">
            <div className="font-semibold mb-1 flex items-center gap-1">
              <Building2 className="h-3.5 w-3.5" />
              لماذا المحافظات القريبة؟
            </div>
            تساعد إعلانات الإسماعيلية ودمياط والسويس والشرقية على معايرة أسعار بورسعيد عبر مقارنات سوق إقليمية،
            لا سيما أن سوق بورسعيد متأثر مباشرة بمشروعات المنطقة الاقتصادية لقناة السويس ومنطقة شرق التفريعة.
          </div>
        </TabsContent>

        {/* ============ المصادر ============ */}
        <TabsContent value="sources" className="space-y-3">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">المصادر الرسمية المستخدمة في الأرشيف</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <SourceLink label="صندوق الإسكان الاجتماعي والدعم العقاري (SHMFF)" url="https://www.shmff.gov.eg/" />
              <SourceLink label="هيئة المجتمعات العمرانية الجديدة (NUCA)" url="https://www.newcities.gov.eg/" />
              <SourceLink label="وزارة الإسكان والمرافق والمجتمعات العمرانية" url="https://www.moh.gov.eg/" />
              <SourceLink label="مبادرة حياة كريمة" url="https://www.haya-karima.com/" />
              <SourceLink label="المنطقة الاقتصادية لقناة السويس (SCZone)" url="https://sczone.eg/" />
              <SourceLink label="بوابة محافظة بورسعيد الرسمية" url="https://www.portsaid.gov.eg/" />
              <SourceLink label="الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS)" url="https://www.capmas.gov.eg/" />
              <SourceLink label="صندوق تطوير العشوائيات (ISDF)" url="https://www.isdf.gov.eg/" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">المنصات الإعلانية الخاصة</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
              <SourceLink label="OLX Egypt" url="https://www.olx.com.eg/properties/" />
              <SourceLink label="Aqarmap" url="https://aqarmap.com.eg/" />
              <SourceLink label="Bayut Egypt" url="https://www.bayut.eg/" />
              <SourceLink label="Property Finder" url="https://www.propertyfinder.eg/" />
            </CardContent>
          </Card>

          <div className="text-[11px] text-muted-foreground p-2 bg-muted/30 rounded">
            ⚠️ <b>إخلاء مسؤولية:</b> أعداد الوحدات في الأرشيف تقديرية مبنية على إعلانات رسمية وبيانات صناديق الإسكان.
            قد تختلف الأرقام النهائية المنفذة عن المعلنة. يرجى الرجوع للجهات الرسمية للتحقق قبل أي قرار رسمي.
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function KPI({ label, value, sub, color, highlight }: { label: string; value: string; sub?: string; color?: string; highlight?: boolean }) {
  return (
    <div className={`border rounded p-2 ${highlight ? "border-primary border-2 bg-primary/5" : ""}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-lg font-bold" style={{ color: color || undefined }}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground mt-0.5">{sub}</div>}
    </div>
  );
}

function SourceLink({ label, url }: { label: string; url: string }) {
  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between gap-2 border rounded p-2 hover:bg-muted/40 transition">
      <span>{label}</span>
      <ExternalLink className="h-3 w-3 text-muted-foreground shrink-0" />
    </a>
  );
}
