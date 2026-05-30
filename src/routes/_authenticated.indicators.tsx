import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, BarChart, Bar, Legend } from "recharts";
import { Activity, Home, AlertCircle, Calculator, TrendingUp } from "lucide-react";
import { caseShillerIndex, hedonicModel, affordabilityIndex, bubbleIndex, RATING_LABELS_AR } from "@/lib/advanced-indicators";
import { buildHPI, fmt } from "@/lib/valuation";
import { buildHpiSeries } from "@/lib/domain";
import { sdg11Score, quliScore, climateRiskPS, EGYPT_LGAF, totalRiskPremium } from "@/lib/global-indicators";
import { ComprehensiveMarketPanel } from "@/components/ComprehensiveMarketPanel";
import PortSaidMap from "@/components/PortSaidMap";
import CapmasPanel from "@/components/CapmasPanel";
import HousingUrbanGuidePanel from "@/components/HousingUrbanGuidePanel";
import DistrictsInfoPanel from "@/components/DistrictsInfoPanel";
import LegalRegistrationPanel from "@/components/LegalRegistrationPanel";
import MortgageFinancePanel from "@/components/MortgageFinancePanel";

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

      <Tabs defaultValue="market">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="market">🗂️ السوق والأحياء</TabsTrigger>
          <TabsTrigger value="legal">⚖️ الشهر والتمويل</TabsTrigger>
          <TabsTrigger value="urban">🏙️ الإسكان والمخاطر</TabsTrigger>
          <TabsTrigger value="models">📊 النماذج الإحصائية</TabsTrigger>
        </TabsList>

        {/* ============ 1) السوق + الأحياء + GIS + CAPMAS ============ */}
        <TabsContent value="market" className="space-y-4 mt-4">
          <Tabs defaultValue="comprehensive">
            <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
              <TabsTrigger value="comprehensive">📈 السوق الشاملة</TabsTrigger>
              <TabsTrigger value="districts">🏘️ ملف الأحياء</TabsTrigger>
              <TabsTrigger value="map">🗺️ خريطة GIS</TabsTrigger>
              <TabsTrigger value="capmas">👥 CAPMAS</TabsTrigger>
            </TabsList>
            <TabsContent value="comprehensive" className="mt-4"><ComprehensiveMarketPanel /></TabsContent>
            <TabsContent value="districts" className="mt-4"><DistrictsInfoPanel /></TabsContent>
            <TabsContent value="map" className="mt-4"><PortSaidMap /></TabsContent>
            <TabsContent value="capmas" className="mt-4"><CapmasPanel /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============ 2) الشهر العقاري + التمويل العقاري ============ */}
        <TabsContent value="legal" className="space-y-4 mt-4">
          <Tabs defaultValue="registration">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="registration">⚖️ الشهر العقاري</TabsTrigger>
              <TabsTrigger value="finance">🏦 التمويل العقاري</TabsTrigger>
            </TabsList>
            <TabsContent value="registration" className="mt-4"><LegalRegistrationPanel /></TabsContent>
            <TabsContent value="finance" className="mt-4"><MortgageFinancePanel /></TabsContent>
          </Tabs>
        </TabsContent>

        {/* ============ 3) الإسكان + المخاطر ============ */}
        <TabsContent value="urban" className="space-y-4 mt-4">
          <Tabs defaultValue="housing">
            <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
              <TabsTrigger value="housing">🏙️ الإسكان والتنمية</TabsTrigger>
              <TabsTrigger value="affordability">🏠 HAI — القدرة</TabsTrigger>
              <TabsTrigger value="bubble">⚠️ مؤشر الفقاعة</TabsTrigger>
              <TabsTrigger value="quality">🏘️ جودة الحي</TabsTrigger>
              <TabsTrigger value="risk">🌊 LGAF + المناخ</TabsTrigger>
            </TabsList>
            <TabsContent value="housing" className="mt-4"><HousingUrbanGuidePanel /></TabsContent>
            {/* affordability / bubble / quality / risk content rendered from existing qr section below */}
          </Tabs>
        </TabsContent>



        {/* ============ 2) النماذج الإحصائية ============ */}
        <TabsContent value="models" className="space-y-4 mt-4">
          <Tabs defaultValue="hpi">
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="hpi">📊 HPI — مؤشر الأسعار</TabsTrigger>
              <TabsTrigger value="caseshiller">📈 Case-Shiller</TabsTrigger>
              <TabsTrigger value="hedonic">🧮 Hedonic OLS</TabsTrigger>
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

        {/* ============ CASE-SHILLER ============ */}
        <TabsContent value="caseshiller" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="المؤشر الحالي" value={cs.latest.toFixed(1)} sub={`أساس 2020 = 100`} />
            <Stat label="CAGR" value={`${cs.cagr.toFixed(1)}%`} sub="نمو سنوي مركّب" highlight />
            <Stat label="عينة Repeat-Sales" value={`${cs.series[0]?.n || 0}`} sub="زوج معاملات" />
          </div>
          <Card>
            <CardHeader><CardTitle className="text-base">منهجية Case-Shiller (Repeat-Sales المرجّح)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cs.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" /><YAxis />
                  <Tooltip />
                  <ReferenceLine y={100} stroke="#888" strokeDasharray="3 3" label="الأساس" />
                  <Line type="monotone" dataKey="index" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3">
                <b>المنهجية:</b> Karl Case & Robert Shiller (1987). يستخدم فقط العقارات المُباعة مرتين أو أكثر،
                ويُرجّح كل زوج عكسياً مع جذر فترة الاحتفاظ.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ HEDONIC ============ */}
        <TabsContent value="hedonic" className="space-y-4 mt-4">
          {!hed ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              عدد العقارات في القاعدة غير كافٍ لبناء نموذج Hedonic (يلزم ≥ 8).
            </CardContent></Card>
          ) : (
            <>
              <div className="grid grid-cols-4 gap-3">
                <Stat label="R²" value={hed.r2.toFixed(3)} sub="جودة الملاءمة" highlight={hed.r2 > 0.7} />
                <Stat label="Adjusted R²" value={hed.adjR2.toFixed(3)} sub="بعد التعديل" />
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
                  </div>
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
