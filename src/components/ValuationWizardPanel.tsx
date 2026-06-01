import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  ChevronRight, ChevronLeft, Home, FileText, Calculator,
  Scale, Mail, Copy, Download, AlertTriangle, CheckCircle2,
} from "lucide-react";

const FINISH_OPTIONS = [
  { label: "نصف تشطيب", cost: 0 },
  { label: "تشطيب جيد", cost: 2500 },
  { label: "سوبر لوكس", cost: 3200 },
  { label: "فاخر", cost: 4500 },
];

const STEPS = [
  { id: 1, label: "بيانات العقار", icon: Home },
  { id: 2, label: "الوصف والقانوني", icon: FileText },
  { id: 3, label: "طرق التقييم", icon: Calculator },
  { id: 4, label: "توفيق النتائج", icon: Scale },
  { id: 5, label: "خطاب القيمة", icon: Mail },
];

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

const finishCost = (label: string) => FINISH_OPTIONS.find((f) => f.label === label)?.cost ?? 0;

export default function ValuationWizardPanel() {
  const [step, setStep] = useState(1);

  // Step 1
  const [address, setAddress] = useState("");
  const [propType, setPropType] = useState("وحدة سكنية");
  const [purpose, setPurpose] = useState("بيع وشراء");
  const [valDate, setValDate] = useState(new Date().toISOString().slice(0, 10));
  const [landArea, setLandArea] = useState(270);
  const [unitArea, setUnitArea] = useState(110);
  const [buildingAge, setBuildingAge] = useState(85);
  const [finish, setFinish] = useState("تشطيب جيد");
  const [tenure, setTenure] = useState("ملكية تامة");

  // Step 2
  const [description, setDescription] = useState("");
  const [floors, setFloors] = useState(5);
  const [units, setUnits] = useState(10);
  const [areaLevel, setAreaLevel] = useState("");
  const [legalStatus, setLegalStatus] = useState("");
  const [noisePol, setNoisePol] = useState("متوسط");
  const [visualPol, setVisualPol] = useState("متوسط");
  const [airPol, setAirPol] = useState("متوسط");

  // Step 3a — Sales comparables
  const [marketRate, setMarketRate] = useState(6.2);
  const [comps, setComps] = useState([
    { price: 1750000, area: 135, finish: "سوبر لوكس", months: 3, weight: 25 },
    { price: 1200000, area: 90, finish: "تشطيب جيد", months: 12, weight: 0 },
    { price: 1500000, area: 110, finish: "تشطيب جيد", months: 6, weight: 75 },
  ]);

  // Step 3b — Cost
  const [landPrice, setLandPrice] = useState(44000);
  const [landShare, setLandShare] = useState(29.7);
  const [buildCostPerM2, setBuildCostPerM2] = useState(5800);
  const [economicLife, setEconomicLife] = useState(100);
  const [profit, setProfit] = useState(25);
  const [finishCostPerM2, setFinishCostPerM2] = useState(2500);

  // Step 3c — Income
  const [rent, setRent] = useState(3500);
  const [effectiveLife, setEffectiveLife] = useState(15);
  const [expenses, setExpenses] = useState(30);
  const [tax, setTax] = useState(10);
  const [incomeDecision, setIncomeDecision] = useState<"exclude" | "accept">("exclude");

  // Step 4 — Weights
  const [wSales, setWSales] = useState(65);
  const [wCost, setWCost] = useState(35);
  const [wIncome, setWIncome] = useState(0);

  // ========== Calculations ==========
  const finishCostTarget = finishCost(finish);

  const salesValue = useMemo(() => {
    const totalWeight = comps.reduce((s, c) => s + c.weight, 0) || 1;
    let weightedSum = 0;
    const rows = comps.map((c) => {
      const fc = finishCost(c.finish);
      const stripped = c.price - fc * c.area;
      const timeAdj = stripped * Math.pow(1 + marketRate / 12 / 100, c.months);
      const normalized = timeAdj * (unitArea / c.area);
      const contrib = (normalized * c.weight) / totalWeight;
      weightedSum += contrib;
      return { stripped, timeAdj, normalized, contrib };
    });
    const finalSales = weightedSum + finishCostTarget * unitArea;
    return { value: finalSales, rows, totalWeight };
  }, [comps, marketRate, unitArea, finishCostTarget]);

  const costValue = useMemo(() => {
    const landCost = landPrice * landShare;
    const buildCost = buildCostPerM2 * unitArea;
    const depreciation = (buildingAge / economicLife) * landCost;
    const base = (landCost + buildCost) * (1 + profit / 100) - depreciation;
    const finalCost = base + finishCostPerM2 * unitArea;
    return { landCost, buildCost, depreciation, base, value: finalCost };
  }, [landPrice, landShare, buildCostPerM2, unitArea, buildingAge, economicLife, profit, finishCostPerM2]);

  const incomeValue = useMemo(() => {
    const netIncome = rent * 12 * (1 - expenses / 100) * (1 - tax / 100);
    const capRate = 1 / effectiveLife;
    return { netIncome, capRate, value: netIncome / capRate };
  }, [rent, expenses, tax, effectiveLife]);

  const incomeApplied = incomeDecision === "accept" ? incomeValue.value : 0;
  const totalW = wSales + wCost + wIncome;
  const finalValue =
    salesValue.value * (wSales / 100) +
    costValue.value * (wCost / 100) +
    incomeApplied * (wIncome / 100);

  // ========== Letter ==========
  const letter = `السادة / ملاك العقار المحترمون

تحية طيبة وبعد،،،،

بالإشارة إلى خطاب تكليفكم لنا بمعاينة وتحديد القيمة السوقية للعقار الواقع بـ: ${address || "[العنوان]"}

غرض التقييم: ${purpose}

وقد انتهى التقرير بأن القيمة السوقية للوحدة تبلغ قيمتها في ${valDate}:

مبلغ وقدره ( ${fmt(finalValue)} جنيهاً مصرياً فقط لا غير )

وتفضلوا بقبول فائق الاحترام والتقدير،،

فريق التقييم
تاريخ إصدار التقرير: ${valDate}
تم التقييم وفقاً للمعايير المصرية للتقييم العقاري تحت إشراف الهيئة العامة للرقابة المالية`;

  const exportJson = () => {
    const data = {
      property: { address, propType, purpose, valDate, landArea, unitArea, buildingAge, finish, tenure },
      legal: { description, floors, units, areaLevel, legalStatus, pollution: { noise: noisePol, visual: visualPol, air: airPol } },
      sales: { marketRate, comps, value: salesValue.value },
      cost: { landPrice, landShare, buildCostPerM2, economicLife, profit, finishCostPerM2, ...costValue },
      income: { rent, effectiveLife, expenses, tax, decision: incomeDecision, ...incomeValue },
      weights: { sales: wSales, cost: wCost, income: wIncome },
      finalValue,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `valuation-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header + Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Calculator className="h-5 w-5 text-primary" />
            منصة تقرير التقييم العقاري — Wizard 5 خطوات
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Progress value={(step / 5) * 100} />
          <div className="flex flex-wrap gap-2">
            {STEPS.map((s) => {
              const Icon = s.icon;
              const active = s.id === step;
              const done = s.id < step;
              return (
                <button
                  key={s.id}
                  onClick={() => setStep(s.id)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                    active
                      ? "bg-primary text-primary-foreground"
                      : done
                      ? "bg-emerald-100 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                  {s.id}. {s.label}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* STEP 1 */}
      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">الخطوة 1: بيانات العقار</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-3 gap-3">
            <div className="md:col-span-3"><Label>عنوان العقار</Label><Input value={address} onChange={(e) => setAddress(e.target.value)} placeholder="مثال: بورسعيد - حي الشرق - شارع الجمهورية" /></div>
            <div><Label>نوع العقار</Label>
              <Select value={propType} onValueChange={setPropType}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["عمارة سكنية", "وحدة سكنية", "محل تجاري", "أرض فضاء", "مبنى إداري"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label>غرض التقييم</Label>
              <Select value={purpose} onValueChange={setPurpose}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["نزاع على تركة", "بيع وشراء", "تمويل عقاري", "تأمين", "فصل شركاء"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label>تاريخ تحقق القيمة</Label><Input type="date" value={valDate} onChange={(e) => setValDate(e.target.value)} /></div>
            <div><Label>مساحة الأرض (م²)</Label><Input type="number" value={landArea} onChange={(e) => setLandArea(+e.target.value)} /></div>
            <div><Label>مساحة الوحدة (م²)</Label><Input type="number" value={unitArea} onChange={(e) => setUnitArea(+e.target.value)} /></div>
            <div><Label>عمر المبنى (سنة)</Label><Input type="number" value={buildingAge} onChange={(e) => setBuildingAge(+e.target.value)} /></div>
            <div><Label>نوع التشطيب</Label>
              <Select value={finish} onValueChange={setFinish}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {FINISH_OPTIONS.map((o) => <SelectItem key={o.label} value={o.label}>{o.label} ({o.cost.toLocaleString()} ج/م²)</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label>الحيازة</Label>
              <Select value={tenure} onValueChange={setTenure}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["ملكية تامة", "إيجار قديم", "إيجار جديد", "مشاع"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 2 */}
      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">الخطوة 2: الوصف والموقف القانوني</CardTitle></CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2"><Label>الوصف العام للعقار</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} /></div>
            <div><Label>عدد الطوابق</Label><Input type="number" value={floors} onChange={(e) => setFloors(+e.target.value)} /></div>
            <div><Label>عدد الوحدات</Label><Input type="number" value={units} onChange={(e) => setUnits(+e.target.value)} /></div>
            <div className="md:col-span-2"><Label>مستوى المنطقة والخدمات</Label><Textarea value={areaLevel} onChange={(e) => setAreaLevel(e.target.value)} rows={2} /></div>
            <div className="md:col-span-2"><Label>الموقف القانوني</Label><Textarea value={legalStatus} onChange={(e) => setLegalStatus(e.target.value)} rows={2} /></div>
            <div><Label>التلوث السمعي</Label>
              <Select value={noisePol} onValueChange={setNoisePol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["منخفض", "متوسط", "مرتفع"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label>التلوث البصري</Label>
              <Select value={visualPol} onValueChange={setVisualPol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["منخفض", "متوسط", "مرتفع"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
            <div><Label>التلوث الجوي</Label>
              <Select value={airPol} onValueChange={setAirPol}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                {["منخفض", "متوسط", "مرتفع"].map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent></Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* STEP 3 */}
      {step === 3 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">الخطوة 3: طرق التقييم</CardTitle></CardHeader>
          <CardContent>
            <Tabs defaultValue="sales">
              <TabsList className="grid grid-cols-3 w-full">
                <TabsTrigger value="sales">أ· البيوع المثيلة</TabsTrigger>
                <TabsTrigger value="cost">ب· التكلفة المُهلَكة</TabsTrigger>
                <TabsTrigger value="income">ج· رأسمالة الدخل</TabsTrigger>
              </TabsList>

              <TabsContent value="sales" className="space-y-3 mt-4">
                <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <b>المنهجية:</b> خصم التشطيب → ضبط الزمن → ضبط المساحة → مصفوفة الأوزان
                </div>
                <div><Label>معدل ارتفاع السوق السنوي %</Label><Input type="number" step="0.1" value={marketRate} onChange={(e) => setMarketRate(+e.target.value)} className="w-40" /></div>
                {comps.map((c, i) => (
                  <Card key={i}>
                    <CardContent className="p-3 grid md:grid-cols-5 gap-2">
                      <div><Label className="text-xs">سعر البيع #{i + 1}</Label><Input type="number" value={c.price} onChange={(e) => setComps(comps.map((cc, j) => j === i ? { ...cc, price: +e.target.value } : cc))} /></div>
                      <div><Label className="text-xs">المساحة م²</Label><Input type="number" value={c.area} onChange={(e) => setComps(comps.map((cc, j) => j === i ? { ...cc, area: +e.target.value } : cc))} /></div>
                      <div><Label className="text-xs">التشطيب</Label>
                        <Select value={c.finish} onValueChange={(v) => setComps(comps.map((cc, j) => j === i ? { ...cc, finish: v } : cc))}>
                          <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                            {FINISH_OPTIONS.map((o) => <SelectItem key={o.label} value={o.label}>{o.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </div>
                      <div><Label className="text-xs">توقيت البيع (شهور)</Label><Input type="number" value={c.months} onChange={(e) => setComps(comps.map((cc, j) => j === i ? { ...cc, months: +e.target.value } : cc))} /></div>
                      <div><Label className="text-xs">الوزن النسبي %</Label><Input type="number" value={c.weight} onChange={(e) => setComps(comps.map((cc, j) => j === i ? { ...cc, weight: +e.target.value } : cc))} /></div>
                    </CardContent>
                  </Card>
                ))}
                <Card className="bg-emerald-50 border-emerald-300">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-emerald-800 mb-1">قيمة البيوع المثيلة</div>
                    <div className="text-2xl font-bold text-emerald-700">{fmt(salesValue.value)} ج.م</div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="cost" className="space-y-3 mt-4">
                <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <b>المعادلة:</b> قيمة = ((حصة الأرض + تكلفة الإنشاء) × هامش الربح) − الإهلاك + التشطيب
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>سعر متر الأرض</Label><Input type="number" value={landPrice} onChange={(e) => setLandPrice(+e.target.value)} /></div>
                  <div><Label>حصة الوحدة من الأرض (م²)</Label><Input type="number" step="0.1" value={landShare} onChange={(e) => setLandShare(+e.target.value)} /></div>
                  <div><Label>تكلفة الإنشاء للمتر</Label><Input type="number" value={buildCostPerM2} onChange={(e) => setBuildCostPerM2(+e.target.value)} /></div>
                  <div><Label>العمر الاقتصادي (سنة)</Label><Input type="number" value={economicLife} onChange={(e) => setEconomicLife(+e.target.value)} /></div>
                  <div><Label>هامش الربح %</Label><Input type="number" value={profit} onChange={(e) => setProfit(+e.target.value)} /></div>
                  <div><Label>تكلفة التشطيب للمتر</Label><Input type="number" value={finishCostPerM2} onChange={(e) => setFinishCostPerM2(+e.target.value)} /></div>
                </div>
                <div className="text-xs space-y-1 p-3 bg-muted/50 rounded font-mono">
                  <div>تكلفة الأرض = {landPrice.toLocaleString()} × {landShare} = <b>{fmt(costValue.landCost)}</b></div>
                  <div>تكلفة الإنشاء = {buildCostPerM2.toLocaleString()} × {unitArea} = <b>{fmt(costValue.buildCost)}</b></div>
                  <div>الإهلاك = ({buildingAge}/{economicLife}) × تكلفة الأرض = <b>{fmt(costValue.depreciation)}</b></div>
                  <div>الأساس = (الأرض + الإنشاء) × {(1 + profit/100).toFixed(2)} − الإهلاك = <b>{fmt(costValue.base)}</b></div>
                  <div>+ التشطيب = {finishCostPerM2.toLocaleString()} × {unitArea} = <b>{fmt(finishCostPerM2 * unitArea)}</b></div>
                </div>
                <Card className="bg-emerald-50 border-emerald-300">
                  <CardContent className="p-4 text-center">
                    <div className="text-xs text-emerald-800 mb-1">قيمة التكلفة المُهلَكة</div>
                    <div className="text-2xl font-bold text-emerald-700">{fmt(costValue.value)} ج.م</div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="income" className="space-y-3 mt-4">
                <div className="p-3 rounded bg-blue-50 border border-blue-200 text-xs text-blue-900">
                  <b>المعادلة:</b> قيمة = صافي الدخل السنوي ÷ معدل الرأسمالة
                </div>
                <div className="grid md:grid-cols-3 gap-3">
                  <div><Label>الإيجار الشهري</Label><Input type="number" value={rent} onChange={(e) => setRent(+e.target.value)} /></div>
                  <div><Label>العمر الاقتصادي الفعّال (سنة)</Label><Input type="number" value={effectiveLife} onChange={(e) => setEffectiveLife(+e.target.value)} /></div>
                  <div><Label>المصروفات %</Label><Input type="number" value={expenses} onChange={(e) => setExpenses(+e.target.value)} /></div>
                  <div><Label>الضريبة العقارية %</Label><Input type="number" value={tax} onChange={(e) => setTax(+e.target.value)} /></div>
                  <div className="md:col-span-2"><Label>قرار الاستخدام</Label>
                    <Select value={incomeDecision} onValueChange={(v) => setIncomeDecision(v as any)}>
                      <SelectTrigger><SelectValue /></SelectTrigger><SelectContent>
                        <SelectItem value="exclude">يُستبعد — وحدة سكنية</SelectItem>
                        <SelectItem value="accept">يُقبل</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="text-xs p-3 bg-muted/50 rounded font-mono space-y-1">
                  <div>صافي الدخل = {rent.toLocaleString()} × 12 × {(1 - expenses/100).toFixed(2)} × {(1 - tax/100).toFixed(2)} = <b>{fmt(incomeValue.netIncome)}</b></div>
                  <div>معدل الرأسمالة = 1/{effectiveLife} = <b>{(incomeValue.capRate * 100).toFixed(2)}%</b></div>
                </div>
                <Card className={incomeDecision === "exclude" ? "bg-amber-50 border-amber-300" : "bg-emerald-50 border-emerald-300"}>
                  <CardContent className="p-4 text-center">
                    {incomeDecision === "exclude" && (
                      <div className="flex items-center justify-center gap-1 text-amber-700 text-xs mb-2">
                        <AlertTriangle className="h-4 w-4" /> مُستبعد من القيمة النهائية (وحدة سكنية)
                      </div>
                    )}
                    <div className="text-xs mb-1">قيمة رأسمالة الدخل</div>
                    <div className="text-2xl font-bold">{fmt(incomeValue.value)} ج.م</div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}

      {/* STEP 4 */}
      {step === 4 && (
        <Card>
          <CardHeader><CardTitle className="text-sm">الخطوة 4: توفيق النتائج</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-3">
              <ResultCard label="البيوع المثيلة" value={salesValue.value} />
              <ResultCard label="التكلفة المُهلَكة" value={costValue.value} />
              <ResultCard label="رأسمالة الدخل" value={incomeApplied} excluded={incomeDecision === "exclude"} />
            </div>
            <div className="space-y-4">
              <WeightSlider label="البيوع المثيلة" value={wSales} onChange={setWSales} />
              <WeightSlider label="التكلفة المُهلَكة" value={wCost} onChange={setWCost} />
              <WeightSlider label="رأسمالة الدخل" value={wIncome} onChange={setWIncome} />
              {totalW !== 100 && (
                <div className="flex items-center gap-2 p-2 rounded bg-amber-50 border border-amber-300 text-xs text-amber-800">
                  <AlertTriangle className="h-4 w-4" /> مجموع الأوزان = {totalW}% — يجب أن يساوي 100%
                </div>
              )}
            </div>
            <Card className="bg-gradient-to-l from-emerald-600 to-emerald-500 text-white border-0">
              <CardContent className="p-6 text-center">
                <div className="text-sm opacity-90 mb-1">القيمة السوقية النهائية</div>
                <div className="text-4xl font-bold">{fmt(finalValue)} جنيه</div>
              </CardContent>
            </Card>
          </CardContent>
        </Card>
      )}

      {/* STEP 5 */}
      {step === 5 && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <CardTitle className="text-sm">الخطوة 5: خطاب القيمة</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => { navigator.clipboard.writeText(letter); toast.success("تم نسخ الخطاب"); }}>
                    <Copy className="h-4 w-4 ml-1" /> نسخ الخطاب
                  </Button>
                  <Button size="sm" variant="outline" onClick={exportJson}>
                    <Download className="h-4 w-4 ml-1" /> تصدير JSON
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed p-4 bg-muted/30 rounded border font-sans">{letter}</pre>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-amber-600" /> محددات التقرير</CardTitle></CardHeader>
            <CardContent>
              <ul className="text-xs space-y-1.5 list-disc pr-5 text-muted-foreground">
                <li>هذا التقييم يعكس القيمة السوقية في تاريخ التقييم المذكور فقط، وأي تغيرات لاحقة قد تؤثر على القيمة.</li>
                <li>اعتمد التقييم على المعاينة الميدانية والمستندات المقدمة من المالك دون التحقق من صحتها قانونياً.</li>
                <li>تم استبعاد طريقة رأسمالة الدخل للوحدات السكنية لعدم ملاءمتها للسوق المصري.</li>
                <li>القيمة المُقدّرة لا تشمل أي ضرائب أو رسوم تسجيل أو أتعاب وساطة.</li>
                <li>التقرير يفترض خلو العقار من أي أعباء قانونية أو حقوق عينية للغير.</li>
                <li>أُعدّ التقرير وفقاً للمعايير المصرية للتقييم العقاري تحت إشراف الهيئة العامة للرقابة المالية.</li>
                <li>لا يجوز استخدام التقرير لأي غرض غير الغرض المحدد به أو من قِبل أطراف غير العميل المذكور.</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between gap-2">
        <Button variant="outline" disabled={step === 1} onClick={() => setStep(step - 1)}>
          <ChevronRight className="h-4 w-4 ml-1" /> السابق
        </Button>
        <Button disabled={step === 5} onClick={() => setStep(step + 1)}>
          التالي <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}

function ResultCard({ label, value, excluded }: { label: string; value: number; excluded?: boolean }) {
  return (
    <Card className={excluded ? "opacity-60" : ""}>
      <CardContent className="p-3 text-center">
        <div className="text-xs text-muted-foreground mb-1">{label}</div>
        <div className="text-lg font-bold">{fmt(value)} ج.م</div>
        {excluded && <Badge variant="outline" className="mt-1 text-[10px]">مُستبعد</Badge>}
      </CardContent>
    </Card>
  );
}

function WeightSlider({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <Label>{label}</Label>
        <span className="font-mono font-bold">{value}%</span>
      </div>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={0} max={100} step={5} />
    </div>
  );
}
