import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { FileDown, Save, Calculator, MapPin, Info } from "lucide-react";
import {
  buildHPI, salesComparison, incomeApproach, costApproach, highestAndBestUse,
  reconcile, confidenceInterval, fmt, pct,
} from "@/lib/valuation";
import { generateUnitReport } from "@/lib/pdf-reports";
import { ComparableFactorsPanel } from "@/components/ComparableFactorsPanel";
import { findDistrictProfile, PORT_SAID_RULES } from "@/lib/portsaid-context";
import { climateRiskPS, EGYPT_LGAF, totalRiskPremium, sdg11Score } from "@/lib/global-indicators";
import { ShieldAlert, TrendingUp } from "lucide-react";

export const Route = createFileRoute("/_authenticated/valuate")({ component: ValuatePage });

function ValuatePage() {
  const { data: areas } = useQuery({
    queryKey: ["areas-all"],
    queryFn: async () => (await supabase.from("areas").select("*, districts(name, city_name)").order("name")).data || [],
  });
  const { data: properties } = useQuery({
    queryKey: ["props-all"],
    queryFn: async () => (await supabase.from("properties").select("*").order("id")).data || [],
  });
  const { data: txns } = useQuery({
    queryKey: ["txns-all"],
    queryFn: async () => (await supabase.from("transactions").select("*")).data || [],
  });

  const hpi = useMemo(() => buildHPI(txns || []), [txns]);

  // Subject
  const [areaId, setAreaId] = useState("");
  const [typeLabel, setTypeLabel] = useState("شقة سكنية");
  const [areaSqm, setAreaSqm] = useState(120);
  const [floor, setFloor] = useState(3);
  const [view, setView] = useState("داخلي");
  const [finish, setFinish] = useState("لوكس");
  const [yearBuilt, setYearBuilt] = useState(2020);
  const [buildingType, setBuildingType] = useState("APT");
  const [category, setCategory] = useState("res");

  // Income inputs
  const [monthlyRent, setMonthlyRent] = useState(15000);
  const [capRate, setCapRate] = useState(0.085);
  const [vacancy, setVacancy] = useState(0.08);
  const [opex, setOpex] = useState(0.20);

  // عوامل المقارن
  const [factorsPct, setFactorsPct] = useState(0);

  // مخاطر دولية
  const [applyClimate, setApplyClimate] = useState(true);
  const [applyLGAF, setApplyLGAF] = useState(true);
  const [seafront, setSeafront] = useState(false);

  // التقرير
  const [appraiserName, setAppraiserName] = useState("");
  const [appraiserLicense, setAppraiserLicense] = useState("");
  const [appraiserPhone, setAppraiserPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("تقدير القيمة السوقية للبيع");
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().slice(0, 10));
  const [validityDays, setValidityDays] = useState(90);

  // Weights (3 طرق فقط)
  const [wSales, setWSales] = useState(60);
  const [wIncome, setWIncome] = useState(20);
  const [wCost, setWCost] = useState(20);

  const selectedArea = areas?.find((a: any) => a.id === areaId);
  const districtProfile = useMemo(
    () => findDistrictProfile(selectedArea?.districts?.name),
    [selectedArea],
  );

  // Comparables: نفس الحي أولاً
  const comparables = useMemo(() => {
    if (!selectedArea || !properties || !txns) return [];
    const sameDist = properties.filter(
      (p: any) =>
        p.area_id === areaId ||
        areas?.find((a: any) => a.id === p.area_id && a.district_id === selectedArea.district_id),
    );
    const result: any[] = [];
    for (const p of sameDist.slice(0, 6)) {
      const t = txns
        .filter((t: any) => t.property_id === p.id)
        .sort((a: any, b: any) => b.txn_date.localeCompare(a.txn_date))[0];
      if (t) result.push({ prop: p, txn: t });
    }
    return result;
  }, [selectedArea, properties, txns, areaId, areas]);

  const subject = useMemo(
    () =>
      selectedArea
        ? {
            id: "SUBJECT", area_id: areaId, category, type_label: typeLabel,
            area_sqm: areaSqm, floor, view, finish, base_price: selectedArea.base_price,
            year_built: yearBuilt, building_type: buildingType,
          }
        : null,
    [selectedArea, areaId, category, typeLabel, areaSqm, floor, view, finish, yearBuilt, buildingType],
  );

  const result = useMemo(() => {
    if (!subject || !selectedArea) return null;
    const salesRaw = comparables.length
      ? salesComparison(subject as any, comparables, hpi)
      : { value: 0, grid: [], outliers: [] as string[] };
    // تطبيق عوامل الخبير (٪) على قيمة البيع المقارن
    const salesAdjusted = salesRaw.value * (1 + factorsPct / 100);
    // تطبيق علاوة الحي حسب التقسيم الإداري لبورسعيد
    const districtPremium = districtProfile?.premiumPct ?? 0;
    const salesFinal = salesAdjusted * (1 + districtPremium / 100);

    const income = incomeApproach(subject as any, monthlyRent, capRate, vacancy, opex);
    const cost = costApproach(subject as any, selectedArea);

    const weights = { sales: wSales / 100, income: wIncome / 100, cost: wCost / 100, residual: 0, profit: 0 };
    const values = { sales: salesFinal, income, cost: cost.total, residual: 0, profit: 0 };
    const final = reconcile(values, weights);
    const ci = confidenceInterval([salesFinal, income, cost.total]);
    return { salesRaw, salesAdjusted, salesFinal, income, cost, districtPremium, values, weights, final, ci };
  }, [subject, selectedArea, comparables, hpi, monthlyRent, capRate, vacancy, opex, wSales, wIncome, wCost, factorsPct, districtProfile]);

  const handleSave = async () => {
    if (!result || !subject) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.info("الحفظ السحابي يحتاج حساب — يمكنك توليد التقرير مباشرة");
    const { error } = await supabase.from("valuations").insert({
      appraiser_id: u.user.id, property_id: null,
      subject_snapshot: subject,
      sales_value: result.salesFinal, income_value: result.income,
      cost_value: result.cost.total, residual_value: 0, profit_value: 0,
      adjustment_grid: result.salesRaw.grid, weights: result.weights,
      final_value: result.final, confidence_interval: result.ci.cv, status: "draft",
    });
    if (error) return toast.error(error.message);
    toast.success("تم الحفظ في تقييماتك");
  };

  const handlePDF = async () => {
    if (!result || !subject || !selectedArea) return;
    await generateUnitReport(
      { ...(subject as any), id: "SUBJ-" + Date.now().toString(36).toUpperCase() },
      selectedArea as any,
      {
        txns: (txns || []) as any, comparables: comparables as any,
        monthlyRent, capRate, annualRevenue: 0, opMargin: 0,
        meta: { appraiserName, appraiserLicense, appraiserPhone, clientName, purpose, valuationDate, validityDays },
      },
    );
    toast.success("تم توليد التقرير");
  };

  const totalW = wSales + wIncome + wCost;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6" />عمل تقييم</h1>
          <p className="text-sm text-muted-foreground">
            3 طرق أساسية: البيع المقارن (مع 64 عاملاً) · التكلفة · الدخل — قيمة مرجّحة نهائية
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={!result}><Save className="h-4 w-4 ml-1" />حفظ</Button>
          <Button onClick={handlePDF} disabled={!result}><FileDown className="h-4 w-4 ml-1" />تقرير PDF</Button>
        </div>
      </div>

      {/* بيانات العقار */}
      <Card>
        <CardHeader><CardTitle className="text-base">بيانات العقار محل التقييم</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 lg:grid-cols-5 gap-3">
            <div>
              <Label>المنطقة</Label>
              <Select value={areaId} onValueChange={setAreaId}>
                <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} ({a.districts?.name})</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>نوع العقار</Label><Input value={typeLabel} onChange={e => setTypeLabel(e.target.value)} /></div>
            <div><Label>الفئة</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="res">سكني</SelectItem><SelectItem value="com">تجاري</SelectItem><SelectItem value="ind">صناعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>نوع المبنى</Label>
              <Select value={buildingType} onValueChange={setBuildingType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="APT">شقة</SelectItem><SelectItem value="VIL">فيلا</SelectItem>
                  <SelectItem value="TWR">برج</SelectItem><SelectItem value="DPX">دوبلكس</SelectItem>
                  <SelectItem value="COM">تجاري</SelectItem><SelectItem value="LND">أرض</SelectItem><SelectItem value="IND">صناعي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>المساحة (م²)</Label><Input type="number" value={areaSqm} onChange={e => setAreaSqm(+e.target.value)} /></div>
            <div><Label>الدور</Label><Input type="number" value={floor} onChange={e => setFloor(+e.target.value)} /></div>
            <div><Label>الإطلالة</Label>
              <Select value={view} onValueChange={setView}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="بحري مباشر">بحري مباشر</SelectItem><SelectItem value="بحري">بحري</SelectItem>
                <SelectItem value="شارع رئيسي">شارع رئيسي</SelectItem><SelectItem value="حديقة">حديقة</SelectItem>
                <SelectItem value="داخلي">داخلي</SelectItem>
              </SelectContent></Select>
            </div>
            <div><Label>التشطيب</Label>
              <Select value={finish} onValueChange={setFinish}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                <SelectItem value="سوبر لوكس">سوبر لوكس</SelectItem><SelectItem value="لوكس">لوكس</SelectItem>
                <SelectItem value="نصف تشطيب">نصف تشطيب</SelectItem><SelectItem value="بدون">بدون</SelectItem>
              </SelectContent></Select>
            </div>
            <div><Label>سنة البناء</Label><Input type="number" value={yearBuilt} onChange={e => setYearBuilt(+e.target.value)} /></div>
          </div>

          {districtProfile && (
            <div className="mt-3 p-3 rounded border bg-muted/30 text-xs flex gap-2">
              <MapPin className="h-4 w-4 text-primary flex-shrink-0" />
              <div>
                <b>{districtProfile.name}</b> — تأسس {districtProfile.founded} ·
                الاستخدام السائد: <Badge variant="outline" className="text-[10px]">{districtProfile.dominantUse}</Badge> ·
                علاوة الموقع: <b className={districtProfile.premiumPct >= 0 ? "text-primary" : "text-destructive"}>
                  {districtProfile.premiumPct >= 0 ? "+" : ""}{districtProfile.premiumPct}%
                </b>
                <div className="text-muted-foreground mt-0.5">{districtProfile.notes}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* بيانات التقرير */}
      <Card>
        <CardHeader><CardTitle className="text-base">بيانات التقرير والمقيّم</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>اسم المقيّم</Label><Input value={appraiserName} onChange={e => setAppraiserName(e.target.value)} /></div>
            <div><Label>رقم الترخيص</Label><Input value={appraiserLicense} onChange={e => setAppraiserLicense(e.target.value)} /></div>
            <div><Label>الهاتف</Label><Input value={appraiserPhone} onChange={e => setAppraiserPhone(e.target.value)} /></div>
            <div><Label>اسم العميل</Label><Input value={clientName} onChange={e => setClientName(e.target.value)} /></div>
            <div><Label>الغرض من التقييم</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="تقدير القيمة السوقية للبيع">البيع</SelectItem>
                  <SelectItem value="تقدير القيمة السوقية للرهن العقاري">الرهن العقاري</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض التأمين">التأمين</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض الميراث">الميراث</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض الضرائب">الضرائب</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ التقييم</Label><Input type="date" value={valuationDate} onChange={e => setValuationDate(e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>

      {/* === الطرق الثلاث في تبويب موحّد === */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            طرق حساب التقييم — اختر التبويب لكل طريقة
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="sales">
            <TabsList className="grid grid-cols-4 w-full">
              <TabsTrigger value="sales">🏘️ البيع المقارن</TabsTrigger>
              <TabsTrigger value="cost">🧱 التكلفة</TabsTrigger>
              <TabsTrigger value="income">💰 الدخل</TabsTrigger>
              <TabsTrigger value="weights">⚖️ الترجيح</TabsTrigger>
            </TabsList>

            {/* البيع المقارن + العوامل */}
            <TabsContent value="sales" className="space-y-4 mt-4">
              {!result ? (
                <p className="text-sm text-muted-foreground py-6 text-center">اختر منطقة لبدء التقييم</p>
              ) : (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <Stat label="قيمة المقارن قبل التعديل" value={fmt(result.salesRaw.value)} sub="ج.م" />
                    <Stat label="بعد عوامل الخبير" value={fmt(result.salesAdjusted)} sub={`${factorsPct >= 0 ? "+" : ""}${factorsPct.toFixed(1)}%`} />
                    <Stat label="بعد علاوة الحي" value={fmt(result.salesFinal)} sub={`${result.districtPremium >= 0 ? "+" : ""}${result.districtPremium}%`} highlight />
                  </div>

                  {result.salesRaw.grid.length > 0 && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead className="bg-muted">
                          <tr>
                            <th className="p-2 text-right">المقارنة</th><th className="p-2">سعر البيع</th><th className="p-2">ج/م²</th>
                            <th className="p-2">موقع</th><th className="p-2">مساحة</th><th className="p-2">تشطيب</th>
                            <th className="p-2">دور</th><th className="p-2">إطلالة</th><th className="p-2">زمن</th>
                            <th className="p-2">ج/م² معدّل</th><th className="p-2">المعدّلة</th>
                          </tr>
                        </thead>
                        <tbody>
                          {result.salesRaw.grid.map(g => (
                            <tr key={g.comparable_id} className="border-b">
                              <td className="p-2 font-medium">{g.comparable_id}</td>
                              <td className="p-2">{fmt(g.sale_price)}</td><td className="p-2">{fmt(g.ppsqm)}</td>
                              <td className="p-2">{pct(g.adj_location)}</td><td className="p-2">{pct(g.adj_size)}</td>
                              <td className="p-2">{pct(g.adj_finish)}</td><td className="p-2">{pct(g.adj_floor)}</td>
                              <td className="p-2">{pct(g.adj_view)}</td><td className="p-2 text-primary">{pct(g.adj_time)}</td>
                              <td className="p-2 font-bold">{fmt(g.adjusted_ppsqm)}</td>
                              <td className="p-2 font-bold">{fmt(g.adjusted_total)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {result.salesRaw.value > 0 && (
                    <ComparableFactorsPanel
                      baseValue={result.salesRaw.value}
                      onAdjustedChange={(_, totalPct) => setFactorsPct(totalPct)}
                    />
                  )}
                </>
              )}
            </TabsContent>

            {/* التكلفة */}
            <TabsContent value="cost" className="space-y-4 mt-4">
              {!result ? <p className="text-sm text-muted-foreground py-6 text-center">اختر منطقة</p> : (
                <>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Stat label="قيمة الأرض" value={fmt(result.cost.land)} sub="ج.م" />
                    <Stat label="تكلفة البناء (بعد الإهلاك)" value={fmt(result.cost.building)} sub="ج.م" />
                    <Stat label="الإهلاك المتراكم" value={fmt(result.cost.depreciation)} sub="ج.م" />
                    <Stat label="إجمالي قيمة التكلفة" value={fmt(result.cost.total)} sub="ج.م" highlight />
                  </div>
                  <div className="p-3 rounded bg-muted/30 text-xs text-muted-foreground flex gap-2">
                    <Info className="h-4 w-4 flex-shrink-0" />
                    <div>القيمة = قيمة الأرض + (تكلفة الاستبدال الجديدة − الإهلاك المتراكم). معدل الإهلاك يعتمد على عمر المبنى (~1.5%/سنة بحد أقصى 50%).</div>
                  </div>
                </>
              )}
            </TabsContent>

            {/* الدخل */}
            <TabsContent value="income" className="space-y-4 mt-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-3">
                  <div><Label>الإيجار الشهري (ج)</Label><Input type="number" value={monthlyRent} onChange={e => setMonthlyRent(+e.target.value)} /></div>
                  <div><Label>Cap Rate: {pct(capRate)}</Label><Slider value={[capRate * 100]} onValueChange={v => setCapRate(v[0] / 100)} min={4} max={15} step={0.25} /></div>
                  <div><Label>نسبة الشغور: {pct(vacancy)}</Label><Slider value={[vacancy * 100]} onValueChange={v => setVacancy(v[0] / 100)} min={0} max={30} step={1} /></div>
                  <div><Label>المصروفات التشغيلية: {pct(opex)}</Label><Slider value={[opex * 100]} onValueChange={v => setOpex(v[0] / 100)} min={5} max={50} step={1} /></div>
                </div>
                {result && (
                  <div className="space-y-3">
                    <Stat label="الإيراد الإجمالي السنوي GPI" value={fmt(monthlyRent * 12)} sub="ج.م" />
                    <Stat label="الإيراد الفعّال EGI" value={fmt(monthlyRent * 12 * (1 - vacancy))} sub={`بعد شغور ${pct(vacancy)}`} />
                    <Stat label="صافي الدخل التشغيلي NOI" value={fmt(monthlyRent * 12 * (1 - vacancy) * (1 - opex))} sub={`بعد مصروفات ${pct(opex)}`} />
                    <Stat label="قيمة الدخل = NOI / Cap" value={fmt(result.income)} sub="ج.م" highlight />
                  </div>
                )}
              </div>
            </TabsContent>

            {/* الترجيح */}
            <TabsContent value="weights" className="space-y-3 mt-4 max-w-md">
              <WeightSlider label="البيع المقارن" value={wSales} setValue={setWSales} />
              <WeightSlider label="التكلفة" value={wCost} setValue={setWCost} />
              <WeightSlider label="الدخل" value={wIncome} setValue={setWIncome} />
              <div className={`text-xs ${totalW === 100 ? "text-primary" : "text-destructive"}`}>
                المجموع: {totalW}% {totalW !== 100 && "— يجب أن يساوي 100%"}
              </div>
              <p className="text-xs text-muted-foreground">
                نصيحة: للسكني يفضّل ترجيح المقارن 60–70٪، للتجاري المؤجّر يفضّل ترجيح الدخل 50٪+، للعقارات الجديدة أو المتخصصة يرفع وزن التكلفة.
              </p>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* النتيجة النهائية */}
      {result && (
        <Card className="border-primary border-2">
          <CardHeader><CardTitle>القيمة المرجّحة النهائية</CardTitle></CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-primary text-primary-foreground rounded-lg">
                <div className="text-xs">القيمة السوقية النهائية</div>
                <div className="text-3xl font-bold">{fmt(result.final)}</div>
                <div className="text-xs">جنيه مصري</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-xs">النطاق</div>
                <div className="text-sm font-bold">{fmt(result.ci.low)} — {fmt(result.ci.high)}</div>
              </div>
              <div className="text-center p-4 bg-muted rounded-lg">
                <div className="text-xs">معامل الاختلاف CV</div>
                <div className="text-xl font-bold">{pct(result.ci.cv)}</div>
                <Badge variant={result.ci.cv < 0.15 ? "default" : "secondary"}>{result.ci.cv < 0.15 ? "موثوق" : "تحقّق"}</Badge>
              </div>
            </div>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-right p-2">الطريقة</th><th className="text-right p-2">القيمة</th><th className="text-right p-2">الترجيح</th><th className="text-right p-2">المساهمة</th></tr></thead>
              <tbody>
                <Row label="البيع المقارن (معدّل)" value={result.salesFinal} weight={result.weights.sales} />
                <Row label="التكلفة" value={result.cost.total} weight={result.weights.cost} />
                <Row label="الدخل" value={result.income} weight={result.weights.income} />
              </tbody>
            </table>
            <div className="mt-3 p-3 rounded border bg-muted/30 text-xs text-muted-foreground">
              <b>ملاحظة بورسعيد:</b> {PORT_SAID_RULES.note} علاوة الواجهة البحرية المعتمدة: {PORT_SAID_RULES.seafrontPremiumMin}–{PORT_SAID_RULES.seafrontPremiumMax}٪.
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <div className={`p-3 rounded border ${highlight ? "border-primary bg-primary/5" : "bg-muted/30"}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`text-lg font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function Row({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <tr className="border-b">
      <td className="p-2">{label}</td>
      <td className="p-2 font-bold">{value > 0 ? fmt(value) + " ج" : "—"}</td>
      <td className="p-2">{pct(weight)}</td>
      <td className="p-2 text-muted-foreground">{fmt(value * weight)} ج</td>
    </tr>
  );
}

function WeightSlider({ label, value, setValue }: { label: string; value: number; setValue: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}: {value}%</Label>
      <Slider value={[value]} onValueChange={v => setValue(v[0])} min={0} max={100} step={5} />
    </div>
  );
}
