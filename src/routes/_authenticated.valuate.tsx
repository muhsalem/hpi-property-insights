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
import { FileDown, Save, Calculator } from "lucide-react";
import {
  buildHPI, salesComparison, incomeApproach, costApproach, residualMethod, profitMethod,
  reconcile, confidenceInterval, fmt, pct,
} from "@/lib/valuation";
import { generateUnitReport } from "@/lib/pdf-reports";
import { ComparableFactorsPanel } from "@/components/ComparableFactorsPanel";


export const Route = createFileRoute("/_authenticated/valuate")({ component: ValuatePage });

function ValuatePage() {
  const { data: areas } = useQuery({
    queryKey: ["areas-all"],
    queryFn: async () => (await supabase.from("areas").select("*, districts(name)").order("name")).data || [],
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

  // Subject form
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

  // Profit inputs
  const [annualRevenue, setAnnualRevenue] = useState(2400000);
  const [opMargin, setOpMargin] = useState(0.25);

  // بيانات التقرير والمقيّم
  const [appraiserName, setAppraiserName] = useState("");
  const [appraiserLicense, setAppraiserLicense] = useState("");
  const [appraiserPhone, setAppraiserPhone] = useState("");
  const [clientName, setClientName] = useState("");
  const [purpose, setPurpose] = useState("تقدير القيمة السوقية للبيع");
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().slice(0, 10));
  const [validityDays, setValidityDays] = useState(90);

  // تحميل بيانات المقيّم من ملفه الشخصي
  useMemo(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) return;
      supabase.from("profiles").select("full_name, license_no, phone").eq("id", data.user.id).single().then(({ data: p }) => {
        if (p) {
          setAppraiserName(p.full_name || "");
          setAppraiserLicense(p.license_no || "");
          setAppraiserPhone(p.phone || "");
        }
      });
    });
  }, []);

  // Weights
  const [wSales, setWSales] = useState(50);
  const [wIncome, setWIncome] = useState(25);
  const [wCost, setWCost] = useState(15);
  const [wResidual, setWResidual] = useState(5);
  const [wProfit, setWProfit] = useState(5);

  const selectedArea = areas?.find((a: any) => a.id === areaId);

  // Comparables: pick from same district/area
  const comparables = useMemo(() => {
    if (!selectedArea || !properties || !txns) return [];
    const sameDist = properties.filter((p: any) => p.area_id === areaId || areas?.find((a:any)=>a.id===p.area_id && a.district_id === selectedArea.district_id));
    const result: any[] = [];
    for (const p of sameDist.slice(0, 6)) {
      const t = txns.filter((t: any) => t.property_id === p.id).sort((a:any,b:any)=>b.txn_date.localeCompare(a.txn_date))[0];
      if (t) result.push({ prop: p, txn: t });
    }
    return result;
  }, [selectedArea, properties, txns, areaId, areas]);

  const subject = useMemo(() => selectedArea ? ({
    id: "SUBJECT", area_id: areaId, category, type_label: typeLabel,
    area_sqm: areaSqm, floor, view, finish, base_price: selectedArea.base_price,
    year_built: yearBuilt, building_type: buildingType,
  }) : null, [selectedArea, areaId, category, typeLabel, areaSqm, floor, view, finish, yearBuilt, buildingType]);

  const result = useMemo(() => {
    if (!subject || !selectedArea) return null;
    const sales = comparables.length ? salesComparison(subject as any, comparables, hpi) : { value: 0, grid: [], outliers: [] as string[] };
    const income = incomeApproach(subject as any, monthlyRent, capRate);
    const cost = costApproach(subject as any, selectedArea);
    const residual = subject.category === "res" ? residualMethod(areaSqm * 0.5, selectedArea, areaSqm, selectedArea.base_price * 1.15) : 0;
    const profit = subject.category === "com" ? profitMethod(annualRevenue, opMargin) : 0;
    const weights = { sales: wSales/100, income: wIncome/100, cost: wCost/100, residual: wResidual/100, profit: wProfit/100 };
    const values = { sales: sales.value, income, cost: cost.total, residual, profit };
    const final = reconcile(values, weights);
    const ci = confidenceInterval([sales.value, income, cost.total, residual, profit]);
    return { sales, income, cost, residual, profit, values, weights, final, ci };
  }, [subject, selectedArea, comparables, hpi, monthlyRent, capRate, annualRevenue, opMargin, wSales, wIncome, wCost, wResidual, wProfit, areaSqm]);

  const handleSave = async () => {
    if (!result || !subject) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return toast.info("الحفظ السحابي يحتاج حساب، لكن يمكنك توليد التقرير واستخدام المنصة بدون تسجيل");
    const { error } = await supabase.from("valuations").insert({
      appraiser_id: u.user.id, property_id: null,
      subject_snapshot: subject, sales_value: result.sales.value, income_value: result.income,
      cost_value: result.cost.total, residual_value: result.residual, profit_value: result.profit,
      adjustment_grid: result.sales.grid, weights: result.weights, final_value: result.final,
      confidence_interval: result.ci.cv, status: "draft",
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
        monthlyRent, capRate, annualRevenue, opMargin,
        meta: { appraiserName, appraiserLicense, appraiserPhone, clientName, purpose, valuationDate, validityDays },
      },
    );
    toast.success("تم توليد التقرير بالعربي");
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2"><Calculator className="h-6 w-6" />تقييم جديد</h1>
          <p className="text-sm text-muted-foreground">5 طرق تقييم + Adjustment Grid + HPI</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSave} disabled={!result}><Save className="h-4 w-4 ml-1" />حفظ</Button>
          <Button onClick={handlePDF} disabled={!result}><FileDown className="h-4 w-4 ml-1" />تقرير PDF</Button>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">بيانات العقار محل التقييم</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>المنطقة</Label>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                  <SelectContent>{areas?.map((a:any)=><SelectItem key={a.id} value={a.id}>{a.name} ({a.districts?.name})</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div><Label>نوع العقار</Label><Input value={typeLabel} onChange={e=>setTypeLabel(e.target.value)} /></div>
              <div><Label>الفئة</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="res">سكني</SelectItem>
                    <SelectItem value="com">تجاري</SelectItem>
                    <SelectItem value="ind">صناعي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>نوع المبنى</Label>
                <Select value={buildingType} onValueChange={setBuildingType}>
                  <SelectTrigger><SelectValue/></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APT">شقة</SelectItem><SelectItem value="VIL">فيلا</SelectItem>
                    <SelectItem value="TWR">برج</SelectItem><SelectItem value="DPX">دوبلكس</SelectItem>
                    <SelectItem value="COM">تجاري</SelectItem><SelectItem value="LND">أرض</SelectItem><SelectItem value="IND">صناعي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div><Label>المساحة (م²)</Label><Input type="number" value={areaSqm} onChange={e=>setAreaSqm(+e.target.value)} /></div>
              <div><Label>الدور</Label><Input type="number" value={floor} onChange={e=>setFloor(+e.target.value)} /></div>
              <div><Label>الإطلالة</Label>
                <Select value={view} onValueChange={setView}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                  <SelectItem value="بحري مباشر">بحري مباشر</SelectItem><SelectItem value="بحري">بحري</SelectItem>
                  <SelectItem value="شارع رئيسي">شارع رئيسي</SelectItem><SelectItem value="حديقة">حديقة</SelectItem>
                  <SelectItem value="داخلي">داخلي</SelectItem>
                </SelectContent></Select>
              </div>
              <div><Label>التشطيب</Label>
                <Select value={finish} onValueChange={setFinish}><SelectTrigger><SelectValue/></SelectTrigger><SelectContent>
                  <SelectItem value="سوبر لوكس">سوبر لوكس</SelectItem><SelectItem value="لوكس">لوكس</SelectItem>
                  <SelectItem value="نصف تشطيب">نصف تشطيب</SelectItem><SelectItem value="بدون">بدون</SelectItem>
                </SelectContent></Select>
              </div>
              <div><Label>سنة البناء</Label><Input type="number" value={yearBuilt} onChange={e=>setYearBuilt(+e.target.value)} /></div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">مدخلات الدخل والترجيح</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Tabs defaultValue="income">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="income">الدخل</TabsTrigger>
                <TabsTrigger value="profit">الربح</TabsTrigger>
                <TabsTrigger value="weights">الترجيح</TabsTrigger>
              </TabsList>
              <TabsContent value="income" className="space-y-3 mt-3">
                <div><Label>الإيجار الشهري (ج)</Label><Input type="number" value={monthlyRent} onChange={e=>setMonthlyRent(+e.target.value)} /></div>
                <div><Label>Cap Rate: {pct(capRate)}</Label><Slider value={[capRate*100]} onValueChange={v=>setCapRate(v[0]/100)} min={4} max={15} step={0.25} /></div>
              </TabsContent>
              <TabsContent value="profit" className="space-y-3 mt-3">
                <div><Label>الإيراد السنوي (ج)</Label><Input type="number" value={annualRevenue} onChange={e=>setAnnualRevenue(+e.target.value)} /></div>
                <div><Label>هامش التشغيل: {pct(opMargin)}</Label><Slider value={[opMargin*100]} onValueChange={v=>setOpMargin(v[0]/100)} min={5} max={50} step={1} /></div>
              </TabsContent>
              <TabsContent value="weights" className="space-y-2 mt-3 text-sm">
                <WeightSlider label="Sales" value={wSales} setValue={setWSales} />
                <WeightSlider label="Income" value={wIncome} setValue={setWIncome} />
                <WeightSlider label="Cost" value={wCost} setValue={setWCost} />
                <WeightSlider label="Residual" value={wResidual} setValue={setWResidual} />
                <WeightSlider label="Profit" value={wProfit} setValue={setWProfit} />
                <div className="text-xs text-muted-foreground">المجموع: {wSales+wIncome+wCost+wResidual+wProfit}%</div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">بيانات التقرير والمقيّم (تظهر في الـ PDF)</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            <div><Label>اسم المقيّم</Label><Input value={appraiserName} onChange={e=>setAppraiserName(e.target.value)} placeholder="الاسم الكامل" /></div>
            <div><Label>رقم الترخيص / القيد</Label><Input value={appraiserLicense} onChange={e=>setAppraiserLicense(e.target.value)} placeholder="مثال: FRA-1234" /></div>
            <div><Label>هاتف التواصل</Label><Input value={appraiserPhone} onChange={e=>setAppraiserPhone(e.target.value)} /></div>
            <div><Label>اسم العميل / الجهة الطالبة</Label><Input value={clientName} onChange={e=>setClientName(e.target.value)} /></div>
            <div><Label>الغرض من التقييم</Label>
              <Select value={purpose} onValueChange={setPurpose}>
                <SelectTrigger><SelectValue/></SelectTrigger>
                <SelectContent>
                  <SelectItem value="تقدير القيمة السوقية للبيع">البيع</SelectItem>
                  <SelectItem value="تقدير القيمة السوقية للرهن العقاري">الرهن العقاري</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض التأمين">التأمين</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض الميراث">الميراث</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض الضرائب">الضرائب</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض المحاسبة">القوائم المالية</SelectItem>
                  <SelectItem value="تقدير القيمة لأغراض التقاضي">التقاضي</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div><Label>تاريخ التقييم</Label><Input type="date" value={valuationDate} onChange={e=>setValuationDate(e.target.value)} /></div>
            <div><Label>صلاحية التقرير (أيام)</Label><Input type="number" value={validityDays} onChange={e=>setValidityDays(+e.target.value)} /></div>
          </div>
        </CardContent>
      </Card>



      {result && (
        <>
          <Card className="border-primary border-2">
            <CardHeader><CardTitle>النتيجة النهائية</CardTitle></CardHeader>
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
                <thead><tr className="border-b"><th className="text-right p-2">الطريقة</th><th className="text-right p-2">القيمة</th><th className="text-right p-2">الترجيح</th></tr></thead>
                <tbody>
                  <Row label="المقارنات Sales" value={result.sales.value} weight={result.weights.sales} />
                  <Row label="الدخل Income" value={result.income} weight={result.weights.income} />
                  <Row label="التكلفة Cost" value={result.cost.total} weight={result.weights.cost} />
                  <Row label="المتبقي Residual" value={result.residual} weight={result.weights.residual} />
                  <Row label="الربح Profit" value={result.profit} weight={result.weights.profit} />
                </tbody>
              </table>
            </CardContent>
          </Card>

          {result.sales.grid.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">جدول التسويات Adjustment Grid</CardTitle></CardHeader>
              <CardContent className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted">
                    <tr>
                      <th className="p-2 text-right">المقارنة</th><th className="p-2">سعر البيع</th><th className="p-2">ج/م²</th>
                      <th className="p-2">موقع</th><th className="p-2">مساحة</th><th className="p-2">تشطيب</th>
                      <th className="p-2">دور</th><th className="p-2">إطلالة</th><th className="p-2">زمن</th>
                      <th className="p-2">ج/م² معدّل</th><th className="p-2">القيمة المعدّلة</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.sales.grid.map(g => (
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
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}

function Row({ label, value, weight }: { label: string; value: number; weight: number }) {
  return (
    <tr className="border-b">
      <td className="p-2">{label}</td>
      <td className="p-2 font-bold">{value > 0 ? fmt(value) + " ج" : "—"}</td>
      <td className="p-2">{pct(weight)}</td>
    </tr>
  );
}

function WeightSlider({ label, value, setValue }: { label: string; value: number; setValue: (v:number)=>void }) {
  return (
    <div>
      <Label className="text-xs">{label}: {value}%</Label>
      <Slider value={[value]} onValueChange={v=>setValue(v[0])} min={0} max={100} step={5} />
    </div>
  );
}
