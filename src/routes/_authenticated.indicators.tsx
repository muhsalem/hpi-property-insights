import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import { Activity, Home, AlertCircle, Calculator, TrendingUp } from "lucide-react";
import { caseShillerIndex, hedonicModel, affordabilityIndex, bubbleIndex, RATING_LABELS_AR } from "@/lib/advanced-indicators";
import { fmt } from "@/lib/valuation";

export const Route = createFileRoute("/_authenticated/indicators")({ component: IndicatorsPage });

function IndicatorsPage() {
  const { data: txns } = useQuery({ queryKey: ["ind-txns"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });
  const { data: properties } = useQuery({ queryKey: ["ind-props"], queryFn: async () => (await supabase.from("properties").select("*")).data || [] });
  const { data: areas } = useQuery({ queryKey: ["ind-areas"], queryFn: async () => (await supabase.from("areas").select("*")).data || [] });

  const cs = useMemo(() => caseShillerIndex(txns || [], 2020), [txns]);
  const hed = useMemo(() => hedonicModel(properties || [], areas || []), [properties, areas]);

  // Affordability inputs (configurable — Egypt defaults)
  const [income, setIncome] = useState(8500); // EGP/month median household income Port Said
  const [rate, setRate] = useState(0.18);
  const medianPrice = useMemo(() => {
    const prices = (properties || []).map((p: any) => p.base_price).filter((x: number) => x > 0).sort((a: number, b: number) => a - b);
    return prices.length ? prices[Math.floor(prices.length / 2)] : 1500000;
  }, [properties]);
  const annualIncome = income * 12;
  const hai = affordabilityIndex(medianPrice, annualIncome, rate);

  // Bubble Index inputs
  const avgGrowth = useMemo(() => {
    const a = areas || [];
    return a.length ? (a.reduce((s: number, x: any) => s + (x.growth || 0), 0) / a.length) * 100 : 0;
  }, [areas]);
  const priceToIncome = medianPrice / annualIncome;
  // Historical baselines (assumed for Egypt market)
  const bubble = bubbleIndex({
    priceToIncome,
    priceToIncomeHistorical: 12, // healthy benchmark for emerging markets
    priceToRent: 22, // assumed avg
    priceToRentHistorical: 18,
    priceGrowth5y: avgGrowth * 5,
    incomeGrowth5y: 50, // ~10%/yr (inflation-driven)
    mortgageBurden: (hai.monthlyPayment / income) * 100,
  });

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6 text-primary" />
          المؤشرات الاقتصادية المتقدمة
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Case-Shiller · Hedonic Pricing · Housing Affordability · Bubble Index
        </p>
      </div>

      <Tabs defaultValue="caseshiller">
        <TabsList className="grid grid-cols-4 w-full">
          <TabsTrigger value="caseshiller">📈 Case-Shiller</TabsTrigger>
          <TabsTrigger value="hedonic">🧮 Hedonic</TabsTrigger>
          <TabsTrigger value="affordability">🏠 Affordability</TabsTrigger>
          <TabsTrigger value="bubble">⚠️ Bubble Index</TabsTrigger>
        </TabsList>

        {/* ============ CASE-SHILLER ============ */}
        <TabsContent value="caseshiller" className="space-y-4 mt-4">
          <div className="grid grid-cols-3 gap-3">
            <Stat label="المؤشر الحالي" value={cs.latest.toFixed(1)} sub={`أساس 2020 = 100`} />
            <Stat label="CAGR" value={`${cs.cagr.toFixed(1)}%`} sub="نمو سنوي مركّب" highlight />
            <Stat label="عينة Repeat-Sales" value={`${cs.series[0]?.n || 0}`} sub="زوج معاملات" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">منهجية Case-Shiller (Repeat-Sales المرجّح)</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={cs.series}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" />
                  <YAxis />
                  <Tooltip />
                  <ReferenceLine y={100} stroke="#888" strokeDasharray="3 3" label="الأساس" />
                  <Line type="monotone" dataKey="index" stroke="hsl(var(--primary))" strokeWidth={3} dot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
              <p className="text-xs text-muted-foreground mt-3">
                <b>المنهجية:</b> طوّرها Karl Case & Robert Shiller (1987). يستخدم فقط العقارات المُباعة مرتين أو أكثر،
                ويُرجّح كل زوج عكسياً مع جذر فترة الاحتفاظ لتقليل أثر الانحرافات. المؤشر السلسلي geometric chaining.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ HEDONIC ============ */}
        <TabsContent value="hedonic" className="space-y-4 mt-4">
          {!hed ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">
              عدد العقارات في القاعدة غير كافٍ لبناء نموذج Hedonic (يلزم ≥ 8). أضف المزيد من العقارات أولاً.
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
                  <CardTitle className="text-base flex items-center gap-2">
                    <Calculator className="h-4 w-4" />
                    معاملات الانحدار (OLS)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs border-b">
                        <tr>
                          <th className="text-right p-2">المتغير</th>
                          <th className="text-right p-2">β (Coefficient)</th>
                          <th className="text-right p-2">t-Statistic</th>
                          <th className="text-right p-2">الأثر الهامشي</th>
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
                  <p className="text-xs text-muted-foreground mt-3">
                    <b>النموذج:</b> ln(Price/sqm) = β₀ + β₁·Rooms + β₂·Baths + β₃·Floor + β₄·Age + β₅·Infra + β₆·ln(Location Price) + ε
                    <br />
                    <b>الدلالة الإحصائية:</b> *** عند 1%, ** عند 5%, * عند 10%. الأثر الهامشي = (e^β − 1) × 100% للسعر.
                  </p>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* ============ AFFORDABILITY ============ */}
        <TabsContent value="affordability" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Home className="h-4 w-4" />
                مدخلات حساب القدرة على التملّك
              </CardTitle>
            </CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div>
                <Label className="text-xs">متوسط دخل الأسرة الشهري (ج.م)</Label>
                <Input type="number" value={income} onChange={(e) => setIncome(+e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">معدل فائدة الرهن (سنوي)</Label>
                <Input type="number" step="0.01" value={rate} onChange={(e) => setRate(+e.target.value)} />
              </div>
              <div>
                <Label className="text-xs">متوسط سعر الوحدة (محسوب)</Label>
                <div className="text-lg font-bold mt-1">{fmt(medianPrice)} ج.م</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="مؤشر HAI" value={hai.hai.toFixed(0)} sub={hai.hai >= 100 ? "≥ 100 ميسور" : "< 100 غير ميسور"} highlight={hai.hai >= 100} />
            <Stat label="نسبة السعر/الدخل" value={hai.priceToIncome.toFixed(1)} sub="سنوات دخل لشراء وحدة" />
            <Stat label="القسط الشهري" value={`${fmt(hai.monthlyPayment)} ج`} sub={`${((hai.monthlyPayment / income) * 100).toFixed(0)}% من الدخل`} />
            <Stat label="الدخل المؤهّل" value={`${fmt(Math.round(hai.qualifyingIncome / 12))} ج/شهر`} sub="المطلوب للتملّك" />
          </div>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Badge variant={hai.status === "affordable" ? "default" : hai.status === "stretched" ? "secondary" : "destructive"} className="text-sm">
                  {RATING_LABELS_AR[hai.status]}
                </Badge>
                <p className="text-xs text-muted-foreground flex-1">
                  معيار النسبة: ≤3 ميسور · 3-5 مرهق · 5-8 غير ميسور · &gt;8 غير ميسور بشدة (UN-Habitat).
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ============ BUBBLE ============ */}
        <TabsContent value="bubble" className="space-y-4 mt-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="مؤشر الفقاعة" value={bubble.score.toFixed(2)} sub="UBS Methodology" highlight={bubble.score < 0.5} />
            <Stat label="التصنيف" value={RATING_LABELS_AR[bubble.rating]} sub="حالة السوق" />
            <Stat label="Price/Income" value={priceToIncome.toFixed(1)} sub="مقابل تاريخي 12" />
            <Stat label="نمو 5 سنوات" value={`${(avgGrowth * 5).toFixed(0)}%`} sub="متوسط الأسعار" />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-orange-500" />
                مكوّنات مؤشر الفقاعة
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {bubble.components.map((c) => (
                  <div key={c.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>{c.name}</span>
                      <span className="font-mono">
                        {c.value > 0 ? "+" : ""}{(c.value * 100).toFixed(1)}% · وزن {(c.weight * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded overflow-hidden">
                      <div
                        className={`h-full ${c.value > 0.5 ? "bg-destructive" : c.value > 0.15 ? "bg-orange-500" : c.value > 0 ? "bg-yellow-500" : "bg-green-500"}`}
                        style={{ width: `${Math.min(100, Math.abs(c.value) * 200)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 bg-muted rounded text-xs space-y-1">
                <div className="font-semibold flex items-center gap-1"><TrendingUp className="h-3 w-3" /> دليل التصنيف:</div>
                <div>• &lt; -0.15: راكد · -0.15 إلى 0.15: متوازن · 0.15 إلى 0.5: مُبالَغ فيه</div>
                <div>• 0.5 إلى 1.0: <b className="text-orange-600">خطر فقاعة</b> · &gt; 1.0: <b className="text-destructive">فقاعة سعرية</b></div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
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
