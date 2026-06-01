import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { lazy, Suspense, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from "recharts";
import { Activity, Home, AlertCircle, Calculator, TrendingUp } from "lucide-react";
import { caseShillerIndex, hedonicModel, affordabilityIndex, bubbleIndex, RATING_LABELS_AR } from "@/lib/advanced-indicators";
import { buildHPI, fmt } from "@/lib/valuation";
import { buildHpiSeries } from "@/lib/domain";
import { climateRiskPS, EGYPT_LGAF, totalRiskPremium } from "@/lib/global-indicators";

// Lazy-loaded heavy panels — only fetched when their tab is opened
const ComprehensiveMarketPanel = lazy(() =>
  import("@/components/ComprehensiveMarketPanel").then((m) => ({ default: m.ComprehensiveMarketPanel })),
);
const PortSaidMap = lazy(() => import("@/components/PortSaidMap"));
const CapmasPanel = lazy(() => import("@/components/CapmasPanel"));
const UrbanQualityPanel = lazy(() => import("@/components/UrbanQualityPanel"));
const LegalRegistrationPanel = lazy(() => import("@/components/LegalRegistrationPanel"));
const MortgageFinancePanel = lazy(() => import("@/components/MortgageFinancePanel"));
const SupplyAdsPanel = lazy(() => import("@/components/SupplyAdsPanel"));
const AbsorptionRatePanel = lazy(() => import("@/components/AbsorptionRatePanel"));
const WalkabilityPanel = lazy(() => import("@/components/WalkabilityPanel"));
const MigrationClassificationPanel = lazy(() => import("@/components/MigrationClassificationPanel"));
const DemandForecastPanel = lazy(() => import("@/components/DemandForecastPanel"));
const MaterialsPricesPanel = lazy(() => import("@/components/MaterialsPricesPanel"));

const PanelFallback = () => (
  <div className="space-y-3">
    <Skeleton className="h-8 w-1/3" />
    <Skeleton className="h-40 w-full" />
    <Skeleton className="h-40 w-full" />
  </div>
);

export const Route = createFileRoute("/_authenticated/indicators")({ component: IndicatorsPage });

function IndicatorsPage() {
  const { data: txns } = useQuery({ queryKey: ["ind-txns"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });
  const { data: properties } = useQuery({ queryKey: ["ind-props"], queryFn: async () => (await supabase.from("properties").select("*")).data || [] });
  const { data: areas } = useQuery({ queryKey: ["ind-areas"], queryFn: async () => (await supabase.from("areas").select("*, districts(name, color, city_name)").order("growth", { ascending: false })).data || [] });

  const cs = useMemo(() => caseShillerIndex(txns || [], 2020), [txns]);
  const hed = useMemo(() => hedonicModel(properties || [], areas || []), [properties, areas]);

  // ===== HPI =====
  const hpi = useMemo(() => buildHPI(txns || []), [txns]);
  const hpiChart = Object.entries(hpi).map(([year, val]) => ({ year, val: +val.toFixed(1) }));
  const hpiLast = hpiChart[hpiChart.length - 1]?.val || 100;
  const hpiCagr = hpiChart.length > 1 ? (Math.pow(hpiLast / 100, 1 / (hpiChart.length - 1)) - 1) * 100 : 0;
  const [areaId, setAreaId] = useState<string>("");
  const selectedArea = areas?.find((a: any) => a.id === areaId);
  const areaSeries = useMemo(() => selectedArea ? buildHpiSeries(selectedArea) : [], [selectedArea]);
  const topAreas = useMemo(() => (areas || []).slice(0, 10).map((a: any) => ({ name: a.name, growth: +(a.growth * 100).toFixed(1) })), [areas]);

  // Affordability
  const [income, setIncome] = useState(8500);
  const [rate, setRate] = useState(0.18);
  const medianPrice = useMemo(() => {
    const prices = (properties || []).map((p: any) => p.base_price).filter((x: number) => x > 0).sort((a: number, b: number) => a - b);
    return prices.length ? prices[Math.floor(prices.length / 2)] : 1500000;
  }, [properties]);
  const annualIncome = income * 12;
  const hai = affordabilityIndex(medianPrice, annualIncome, rate);

  const avgGrowth = useMemo(() => {
    const a = areas || [];
    return a.length ? (a.reduce((s: number, x: any) => s + (x.growth || 0), 0) / a.length) * 100 : 0;
  }, [areas]);
  const priceToIncome = medianPrice / annualIncome;
  const bubble = bubbleIndex({
    priceToIncome,
    priceToIncomeHistorical: 12,
    priceToRent: 22,
    priceToRentHistorical: 18,
    priceGrowth5y: avgGrowth * 5,
    incomeGrowth5y: 50,
    mortgageBurden: (hai.monthlyPayment / income) * 100,
  });

  return (
    <div className="space-y-4" dir="rtl">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          المؤشرات العقارية
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          منصة تقييم متكاملة — 9 محاور · سوق + قانوني + تمويل عقاري + نماذج إحصائية + معايير دولية
        </p>
      </div>

      {/*
        ترتيب منطقي للتقييم العقاري (من العام للخاص):
        1) السكان والسوق → سياق الطلب + بنية السوق + الموقع الجغرافي
        2) النماذج الإحصائية → قياس الأسعار والاتجاهات (HPI → Case-Shiller → Hedonic → Bubble)
        3) الإسكان والقدرة → جانب الطلب (إسكان عمراني + HAI + جودة الحي)
        4) المخاطر والإطار القانوني → علاوة المخاطرة + الشهر + التمويل
      */}
      <Tabs defaultValue="market">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="market">👥 السوق + الإعلانات + HAI</TabsTrigger>
          <TabsTrigger value="models">📊 النماذج الإحصائية</TabsTrigger>
          <TabsTrigger value="urban">🏘️ جودة الأحياء</TabsTrigger>
          <TabsTrigger value="legal">⚖️ المخاطر والإطار القانوني</TabsTrigger>
          <TabsTrigger value="materials">🧱 مواد البناء</TabsTrigger>
        </TabsList>

        <TabsContent value="materials" className="mt-4">
          <Suspense fallback={<PanelFallback />}><MaterialsPricesPanel /></Suspense>
        </TabsContent>

        {/* ============ 1) السكان (CAPMAS) → السوق الشاملة → خريطة GIS → إعلانات + HAI ============ */}
        <TabsContent value="market" className="space-y-4 mt-4">
          <Tabs defaultValue="demographics">
            <TabsList className="grid grid-cols-2 md:grid-cols-6 w-full">
              <TabsTrigger value="demographics">👥 الديموغرافيا</TabsTrigger>
              <TabsTrigger value="comprehensive">📈 السوق الشاملة</TabsTrigger>
              <TabsTrigger value="supply">📦 مؤشر العرض</TabsTrigger>
              <TabsTrigger value="demand">🛒 مؤشر الطلب</TabsTrigger>
              <TabsTrigger value="affordability">🏠 HAI — التملّك</TabsTrigger>
              <TabsTrigger value="map">🗺️ خريطة GIS</TabsTrigger>
            </TabsList>
            <TabsContent value="demographics" className="mt-4 space-y-4">
              <Suspense fallback={<PanelFallback />}><CapmasPanel /></Suspense>
              <Suspense fallback={<PanelFallback />}><MigrationClassificationPanel /></Suspense>
            </TabsContent>
            <TabsContent value="comprehensive" className="mt-4"><Suspense fallback={<PanelFallback />}><ComprehensiveMarketPanel /></Suspense></TabsContent>
            <TabsContent value="supply" className="mt-4 space-y-4">
              <Suspense fallback={<PanelFallback />}><SupplyAdsPanel /></Suspense>
              <Suspense fallback={<PanelFallback />}><AbsorptionRatePanel /></Suspense>
            </TabsContent>
            <TabsContent value="demand" className="mt-4"><Suspense fallback={<PanelFallback />}><DemandForecastPanel /></Suspense></TabsContent>
            <TabsContent value="map" className="mt-4"><Suspense fallback={<PanelFallback />}><PortSaidMap /></Suspense></TabsContent>

            <TabsContent value="affordability" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Home className="h-4 w-4" />مدخلات حساب القدرة على التملّك (HAI)</CardTitle></CardHeader>
                <CardContent className="grid md:grid-cols-3 gap-4">
                  <div><Label className="text-xs">متوسط دخل الأسرة الشهري (ج.م)</Label><Input type="number" value={income} onChange={(e) => setIncome(+e.target.value)} /></div>
                  <div><Label className="text-xs">معدل فائدة الرهن (سنوي)</Label><Input type="number" step="0.01" value={rate} onChange={(e) => setRate(+e.target.value)} /></div>
                  <div><Label className="text-xs">متوسط سعر الوحدة (محسوب)</Label><div className="text-lg font-bold mt-1">{fmt(medianPrice)} ج.م</div></div>
                </CardContent>
              </Card>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="مؤشر HAI" value={hai.hai.toFixed(0)} sub={hai.hai >= 100 ? "≥ 100 ميسور" : "< 100 غير ميسور"} highlight={hai.hai >= 100} />
                <Stat label="نسبة السعر/الدخل" value={hai.priceToIncome.toFixed(1)} sub="سنوات دخل" />
                <Stat label="القسط الشهري" value={`${fmt(hai.monthlyPayment)} ج`} sub={`${((hai.monthlyPayment / income) * 100).toFixed(0)}% من الدخل`} />
                <Stat label="الدخل المؤهّل" value={`${fmt(Math.round(hai.qualifyingIncome / 12))} ج/شهر`} sub="المطلوب للتملّك" />
              </div>
              <Card>
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <Badge variant={hai.status === "affordable" ? "default" : hai.status === "stretched" ? "secondary" : "destructive"} className="text-sm">{RATING_LABELS_AR[hai.status]}</Badge>
                    <p className="text-xs text-muted-foreground flex-1">معيار: ≤3 ميسور · 3-5 مرهق · 5-8 غير ميسور · &gt;8 غير ميسور بشدة (UN-Habitat).</p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============ 3) الإسكان — جودة الأحياء + Walkability ============ */}
        <TabsContent value="urban" className="space-y-4 mt-4">
          <Tabs defaultValue="quality">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="quality">🏘️ جودة الحي</TabsTrigger>
              <TabsTrigger value="walk">🚶 Walkability + Isochrone</TabsTrigger>
            </TabsList>
            <TabsContent value="quality" className="mt-4"><Suspense fallback={<PanelFallback />}><UrbanQualityPanel /></Suspense></TabsContent>
            <TabsContent value="walk" className="mt-4"><Suspense fallback={<PanelFallback />}><WalkabilityPanel /></Suspense></TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============ 4) المخاطر والإطار القانوني والتمويلي ============ */}
        <TabsContent value="legal" className="space-y-4 mt-4">
          <Tabs defaultValue="risk">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="risk">🌊 LGAF + المناخ</TabsTrigger>
              <TabsTrigger value="registration">⚖️ الشهر العقاري</TabsTrigger>
              <TabsTrigger value="finance">🏦 التمويل العقاري</TabsTrigger>
            </TabsList>

            <TabsContent value="risk" className="space-y-4 mt-4">
              <Card>
                <CardHeader><CardTitle className="text-base">🌍 LGAF — مؤشر إدارة الأراضي (البنك الدولي)</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <Stat label="LGAF (مصر)" value={`${EGYPT_LGAF.score}/5`} sub="يقين قانوني متوسط" />
                    <Stat label="تسجيل الملكية" value={`${EGYPT_LGAF.landRegScore}%`} sub={`ترتيب عالمي #${EGYPT_LGAF.propertyRegRank}`} />
                    <Stat label="ترخيص البناء" value={`${EGYPT_LGAF.buildPermitDays} يوم`} sub={`${EGYPT_LGAF.buildPermitCostPct}% من قيمة المبنى`} />
                    <Stat label="علاوة المخاطرة" value={`+${EGYPT_LGAF.riskPremiumPct}%`} sub="تُضاف لمعدل الخصم" highlight />
                  </div>
                  <p className="text-xs text-muted-foreground p-3 bg-muted rounded">{EGYPT_LGAF.note}</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <div className="flex justify-between items-center gap-3 flex-wrap">
                    <CardTitle className="text-base">🌊 مخاطر مناخية — بورسعيد (IPCC AR6)</CardTitle>
                    <Select value={areaId} onValueChange={setAreaId}>
                      <SelectTrigger className="w-64"><SelectValue placeholder="اختر حياً" /></SelectTrigger>
                      <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                </CardHeader>
                <CardContent>
                  {(() => {
                    const cr = climateRiskPS({ districtName: selectedArea?.districts?.name || selectedArea?.name, seafront: false });
                    const rp = totalRiskPremium(cr.score, hai.hai);
                    return (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Stat label="درجة المخاطر المناخية" value={`${cr.score}/100`} sub={cr.level} />
                          <Stat label="موقع ساحلي" value={cr.isCoastal ? "نعم" : "لا"} sub={cr.isCoastal ? "تعرض مرتفع" : "تعرض متوسط"} />
                          <Stat label="خصم مقترح من القيمة" value={`-${cr.valueDiscountPct}%`} sub="تعديل سوقي" />
                          <Stat label="إجمالي علاوة المخاطرة" value={`+${rp.total}%`} sub="على معدل الخصم" highlight />
                        </div>
                        <Card><CardContent className="p-4">
                          <div className="text-sm font-semibold mb-2">المخاطر التفصيلية</div>
                          <table className="w-full text-sm">
                            <thead className="text-xs border-b"><tr><th className="text-right p-2">المخاطر</th><th className="text-right p-2">المستوى</th><th className="text-right p-2">الأفق</th><th className="text-right p-2">المصدر</th></tr></thead>
                            <tbody>
                              {cr.risks.map((r) => (
                                <tr key={r.name} className="border-b last:border-0">
                                  <td className="p-2">{r.name}</td>
                                  <td className="p-2"><Badge variant={r.level === "حرج" ? "destructive" : r.level === "مرتفع" ? "default" : "secondary"}>{r.level}</Badge></td>
                                  <td className="p-2 text-xs">{r.horizon}</td>
                                  <td className="p-2 text-xs text-muted-foreground">{r.source}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </CardContent></Card>
                        <Card><CardContent className="p-4">
                          <div className="text-sm font-semibold mb-2">تركيب علاوة مخاطرة معدل الخصم</div>
                          <div className="space-y-1 text-sm">
                            <div className="flex justify-between"><span>مخاطر مناخية</span><span className="font-mono">+{rp.climate}%</span></div>
                            <div className="flex justify-between"><span>LGAF — يقين قانوني</span><span className="font-mono">+{rp.lgaf}%</span></div>
                            <div className="flex justify-between"><span>مخاطر القدرة على التملك</span><span className="font-mono">+{rp.affordability}%</span></div>
                            <div className="flex justify-between border-t pt-2 font-bold"><span>الإجمالي</span><span className="font-mono">+{rp.total}%</span></div>
                          </div>
                        </CardContent></Card>
                        <div className="text-xs text-muted-foreground p-3 bg-muted rounded">
                          <b>توصية:</b> {cr.recommendation}
                        </div>
                      </div>
                    );
                  })()}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="registration" className="mt-4"><Suspense fallback={<PanelFallback />}><LegalRegistrationPanel /></Suspense></TabsContent>
            <TabsContent value="finance" className="mt-4"><Suspense fallback={<PanelFallback />}><MortgageFinancePanel /></Suspense></TabsContent>
          </Tabs>
        </TabsContent>




        {/* ============ 2) النماذج الإحصائية ============ */}
        <TabsContent value="models" className="space-y-4 mt-4">
          <Tabs defaultValue="hpi">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="hpi">📊 HPI — مؤشر الأسعار</TabsTrigger>
              <TabsTrigger value="caseshiller">📈 Case-Shiller (مصر)</TabsTrigger>
              <TabsTrigger value="hedonic">🧮 Hedonic OLS</TabsTrigger>
              <TabsTrigger value="bubble">⚠️ مؤشر الفقاعة</TabsTrigger>
            </TabsList>


        {/* ============ HPI ============ */}
        <TabsContent value="hpi" className="space-y-4 mt-4">

          <div className="grid grid-cols-3 gap-3">
            <Stat label="المؤشر العام" value={hpiLast.toFixed(1)} sub="أساس 2020 = 100" />
            <Stat label="CAGR سنوي" value={`${hpiCagr.toFixed(1)}%`} sub="نمو مركّب" highlight />
            <Stat label="إجمالي النمو" value={`+${(hpiLast - 100).toFixed(0)}%`} sub="منذ 2020" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">المؤشر العام عبر السنوات (Repeat-Sales)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={hpiChart}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" /><YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <CardTitle className="text-base">HPI لكل حي</CardTitle>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="اختر حياً" /></SelectTrigger>
                  <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selectedArea ? (
                <>
                  <div className="flex gap-3 mb-3 text-sm">
                    <Badge>نمو {(selectedArea.growth * 100).toFixed(1)}%</Badge>
                    <Badge variant="outline">آخر مؤشر {areaSeries[areaSeries.length - 1]?.idx}</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={areaSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" /><YAxis />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="idx" name={selectedArea.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">اختر حياً من القائمة لعرض المنحنى</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">أعلى الأحياء نمواً</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAreas} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="%" /><YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="growth" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ CASE-SHILLER — مُعدَّل للسوق المصري / بورسعيد ============ */}
        <TabsContent value="caseshiller" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <Stat label="المؤشر الاسمي" value={cs.latest.toFixed(1)} sub="EGP — أساس 2020" />
            <Stat label="المؤشر الحقيقي" value={cs.latestReal.toFixed(1)} sub="مُعدَّل بـ CPI" highlight={cs.latestReal > 100} />
            <Stat label="CAGR اسمي" value={`${cs.cagr.toFixed(1)}%`} sub="نمو سنوي بالجنيه" />
            <Stat label="CAGR حقيقي" value={`${cs.realCagr.toFixed(1)}%`} sub="بعد خصم التضخم" highlight={cs.realCagr > 0} />
            <Stat label="أزواج مُهذَّبة" value={`${cs.trimmedPairs}`} sub="صدمات سعرية مُلطَّفة" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Case-Shiller — اسمي مقابل حقيقي (مُعدَّل بـ CPI المصري)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <LineChart data={cs.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" /><YAxis />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine y={100} stroke="#888" strokeDasharray="3 3" label="الأساس 100" />
                  {cs.series.filter(s => s.devaluation).map(s => (
                    <ReferenceLine key={s.year} x={s.year} stroke="hsl(var(--destructive))" strokeDasharray="2 4" label={{ value: "تعويم", fontSize: 10, fill: "hsl(var(--destructive))" }} />
                  ))}
                  <Line type="monotone" dataKey="index" name="اسمي (EGP)" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 4 }} />
                  <Line type="monotone" dataKey="real" name="حقيقي (مُعدَّل بالتضخم)" stroke="hsl(var(--destructive))" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
              <div className="mt-4 grid md:grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-muted rounded space-y-1">
                  <div className="font-semibold">تعديلات السوق المصري / بورسعيد:</div>
                  <div>• <b>تهذيب الصدمات:</b> سقف ±60% على العائد اللوغاريتمي السنوي لعزل تأثير تعويم الجنيه (2016 · 2022 · 2023 · 2024).</div>
                  <div>• <b>المؤشر الحقيقي:</b> قسمة المؤشر الاسمي على الرقم القياسي للأسعار (CAPMAS، أساس 2020).</div>
                  <div>• <b>وزن بورسعيد:</b> أزواج البيع &lt; سنتين تُخفَّض أوزانها 50% (ضوضاء المضاربة بعد إلغاء المنطقة الحرة 2002 وتوسعات السلام / بورسعيد الجديدة).</div>
                  <div>• <b>عينة رقيقة:</b> سنوات بأقل من 3 أزواج تستعمل متوسط آخر 3 سنوات.</div>
                </div>
                <div className="p-3 bg-muted rounded space-y-1">
                  <div className="font-semibold">قراءة النتيجة:</div>
                  <div>• إذا كان <b>المؤشر الحقيقي &gt; 100</b>: العقار نمى فعلياً فوق التضخم (تحوّط ناجح).</div>
                  <div>• إذا كان <b>الحقيقي &lt; 100</b>: النمو السعري اسمي فقط، والمشتري خسر قوة شرائية.</div>
                  <div>• الخطوط المنقّطة الحمراء = سنوات تعويم الجنيه (قفزات اسمية لا تعكس قيمة عقارية).</div>
                  <div>• المرجع المنهجي: Case & Shiller (1987) + تعديل CAPMAS-CPI + UN-Habitat Egypt 2024.</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BUBBLE INDEX (نُقل بجوار مؤشر الأسعار) ============ */}
        <TabsContent value="bubble" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="مؤشر الفقاعة" value={bubble.score.toFixed(2)} sub="UBS Methodology" highlight={bubble.score < 0.5} />
            <Stat label="التصنيف" value={RATING_LABELS_AR[bubble.rating]} sub="حالة السوق" />
            <Stat label="Price/Income" value={priceToIncome.toFixed(1)} sub="مقابل تاريخي 12" />
            <Stat label="نمو 5 سنوات" value={`${(avgGrowth * 5).toFixed(0)}%`} sub="متوسط الأسعار" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertCircle className="h-4 w-4 text-orange-500" />مكوّنات مؤشر الفقاعة</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bubble.components.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-mono">{c.value > 0 ? "+" : ""}{(c.value * 100).toFixed(1)}% · وزن {(c.weight * 100).toFixed(0)}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div className={`h-full ${c.value > 0.5 ? "bg-destructive" : c.value > 0.15 ? "bg-orange-500" : c.value > 0 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(100, Math.abs(c.value) * 200)}%` }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted rounded text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> دليل التصنيف:</div>
                <div>• &lt; -0.15: راكد · -0.15 إلى 0.15: متوازن · 0.15 إلى 0.5: مُبالَغ فيه</div>
                <div>• 0.5 إلى 1.0: <b className="text-orange-600">خطر فقاعة</b> · &gt; 1.0: <b className="text-destructive">فقاعة سعرية</b></div>
                <div className="pt-2 border-t mt-2">💡 <b>ملاحظة للسوق المصري:</b> مع التضخم العالي بعد 2022، قارن دائماً مؤشر الفقاعة بالمؤشر <b>الحقيقي</b> (Case-Shiller المُعدَّل بـ CPI) لتجنّب إنذار كاذب من النمو الاسمي.</div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>


        {/* ============ HEDONIC OLS — نموذج التسعير الهيدوني ============ */}
        <TabsContent value="hedonic" className="space-y-4 mt-4">
          {!hed ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              عدد العقارات في القاعدة غير كافٍ لبناء نموذج Hedonic (يلزم ≥ 8 عقارات بأسعار وموقع صحيح).
            </CardContent></Card>
          ) : (
            <>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">المنهجية — Rosen (1974) Hedonic Pricing</CardTitle>
                </CardHeader>
                <CardContent className="text-xs space-y-2 text-muted-foreground">
                  <div className="font-mono bg-muted p-3 rounded text-foreground text-center" dir="ltr">
                    ln(سعر/م²) = β₀ + β₁·غرف + β₂·حمامات + β₃·دور + β₄·عمر + β₅·بنية تحتية + β₆·ln(مستوى سعر الموقع) + ε
                  </div>
                  <div>• يفكّك سعر المتر إلى مساهمات منفصلة لكل خاصية بنائية وموقعية (Rosen 1974).</div>
                  <div>• الحلّ عبر المعادلات الطبيعية: <span dir="ltr" className="font-mono">β = (XᵀX)⁻¹Xᵀy</span> — انحدار خطي متعدد على لوغاريتم السعر.</div>
                  <div>• الأثر الهامشي = <span dir="ltr" className="font-mono">(e^β − 1) × 100%</span> — نسبة تغيّر السعر لكل وحدة من المتغير.</div>
                </CardContent>
              </Card>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <Stat label="R²" value={hed.r2.toFixed(3)} sub="جودة الملاءمة" highlight={hed.r2 > 0.7} />
                <Stat label="Adjusted R²" value={hed.adjR2.toFixed(3)} sub="مُعدَّل بعدد المتغيرات" />
                <Stat label="RMSE" value={hed.rmse.toFixed(3)} sub="على ln(price)" />
                <Stat label="حجم العينة n" value={`${hed.n}`} sub="عقار" />
              </div>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />معاملات الانحدار (OLS)</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs border-b">
                        <tr>
                          <th className="text-right p-2">المتغير</th><th className="text-right p-2">β</th>
                          <th className="text-right p-2">t-Stat</th><th className="text-right p-2">الأثر الهامشي</th>
                          <th className="text-right p-2">الدلالة</th>
                        </tr>
                      </thead>
                      <tbody>
                        {hed.coefficients.map((c) => (
                          <tr key={c.name} className="border-b">
                            <td className="p-2 font-medium">{c.name}</td>
                            <td className="p-2 font-mono text-xs">{c.beta}</td>
                            <td className="p-2 font-mono text-xs">{c.tStat}</td>
                            <td className="p-2">{c.pct}</td>
                            <td className="p-2">
                              {Math.abs(c.tStat) > 2.58 ? <Badge>***</Badge> :
                               Math.abs(c.tStat) > 1.96 ? <Badge variant="default">**</Badge> :
                               Math.abs(c.tStat) > 1.65 ? <Badge variant="secondary">*</Badge> :
                               <span className="text-xs text-muted-foreground">—</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    <div className="text-[10px] text-muted-foreground mt-2">
                      الدلالة الإحصائية: *** عند 1% · ** عند 5% · * عند 10%.
                    </div>
                  </div>
                </CardContent>
              </Card>

              <HedonicPredictor hed={hed} areas={areas || []} />

              <Card>
                <CardContent className="p-4 text-xs space-y-1 text-muted-foreground bg-muted/40">
                  <div className="font-semibold text-foreground">قراءة النموذج في تقرير التقييم:</div>
                  <div>• كل غرفة إضافية تُضيف <b>{hed.coefficients[1]?.pct}</b> لسعر المتر · كل حمام: <b>{hed.coefficients[2]?.pct}</b>.</div>
                  <div>• كل دور أعلى: <b>{hed.coefficients[3]?.pct}</b> · كل سنة عمر: <b>{hed.coefficients[4]?.pct}</b> (إهلاك ضمني).</div>
                  <div>• كل درجة تقييم بنية تحتية: <b>{hed.coefficients[5]?.pct}</b> — يبرّر تعديل الموقع في طريقة البيع المقارن.</div>
                  <div className="pt-1">جودة الملاءمة R² = <b>{hed.r2.toFixed(3)}</b>؛ النموذج يفسّر <b>{(hed.r2 * 100).toFixed(0)}%</b> من تباين أسعار المتر في العينة.</div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>
          </Tabs>
        </TabsContent>

        {/* qr content moved into urban tab */}
      </Tabs>

    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-2xl font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function HedonicPredictor({ hed, areas }: { hed: NonNullable<ReturnType<typeof hedonicModel>>; areas: any[] }) {
  const [rooms, setRooms] = useState(3);
  const [baths, setBaths] = useState(2);
  const [floor, setFloor] = useState(3);
  const [age, setAge] = useState(10);
  const [areaSqm, setAreaSqm] = useState(120);
  const [areaId, setAreaId] = useState<string>(areas[0]?.id || "");
  const a = areas.find((x: any) => x.id === areaId);
  const infra = a?.infra_rating ?? 6;
  const areaPriceLevel = a?.base_price || 15000;
  const ppsqm = hed.predict({ rooms, baths, floor, age, infra, areaPriceLevel });
  const total = ppsqm * areaSqm;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />آلة التنبؤ الهيدوني — تسعير عقار افتراضي</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div><Label className="text-xs">الحي</Label>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="اختر" /></SelectTrigger>
              <SelectContent>{areas.map((x: any) => <SelectItem key={x.id} value={x.id}>{x.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label className="text-xs">المساحة (م²)</Label><Input type="number" value={areaSqm} onChange={(e) => setAreaSqm(+e.target.value)} /></div>
          <div><Label className="text-xs">الغرف</Label><Input type="number" value={rooms} onChange={(e) => setRooms(+e.target.value)} /></div>
          <div><Label className="text-xs">الحمامات</Label><Input type="number" value={baths} onChange={(e) => setBaths(+e.target.value)} /></div>
          <div><Label className="text-xs">الدور</Label><Input type="number" value={floor} onChange={(e) => setFloor(+e.target.value)} /></div>
          <div><Label className="text-xs">العمر (سنة)</Label><Input type="number" value={age} onChange={(e) => setAge(+e.target.value)} /></div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Stat label="سعر المتر المتوقع" value={`${fmt(ppsqm)} ج`} sub="من النموذج" />
          <Stat label="القيمة الإجمالية" value={`${fmt(total)} ج`} sub={`${areaSqm} م²`} highlight />
          <Stat label="نطاق التذبذب ±" value={`${(hed.rmse * 100).toFixed(0)}%`} sub="بناءً على RMSE" />
        </div>
      </CardContent>
    </Card>
  );
}
