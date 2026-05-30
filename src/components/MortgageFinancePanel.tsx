import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Calculator, CheckCircle2, XCircle, Banknote, Receipt, TrendingUp } from "lucide-react";
import { EG_BANKS_2026, emi, amortization, eligibility, transactionCosts, isBankable } from "@/lib/mortgage";
import { fmt } from "@/lib/valuation";
import IslamicFinancePanel from "@/components/IslamicFinancePanel";

export default function MortgageFinancePanel() {
  const { data: areas } = useQuery({ queryKey: ["mf-areas"], queryFn: async () => (await supabase.from("areas").select("*")).data || [] });
  const { data: txns } = useQuery({ queryKey: ["mf-txns"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });
  const { data: properties } = useQuery({ queryKey: ["mf-props"], queryFn: async () => (await supabase.from("properties").select("*")).data || [] });

  // ===== Mortgage inputs =====
  const [price, setPrice] = useState(2_000_000);
  const [downPct, setDownPct] = useState(20);
  const [income, setIncome] = useState(15_000);
  const [years, setYears] = useState(20);
  const [bankIdx, setBankIdx] = useState(2);
  const [legalStatus, setLegalStatus] = useState("registered_ayni");

  const bank = EG_BANKS_2026[bankIdx];
  const downPayment = (price * downPct) / 100;
  const elig = useMemo(() => eligibility({
    price, downPayment, monthlyIncome: income, rate: bank.rate, years, maxLTV: bank.maxLTV, minIncome: bank.minIncome,
  }), [price, downPayment, income, bank, years]);
  const amort = useMemo(() => amortization(elig.loan, bank.rate, years), [elig.loan, bank.rate, years]);
  const bankability = isBankable(legalStatus);
  const costs = useMemo(() => transactionCosts(price), [price]);

  // ===== Bank comparison =====
  const bankCompare = EG_BANKS_2026.map((b) => {
    const e = eligibility({ price, downPayment, monthlyIncome: income, rate: b.rate, years: Math.min(years, b.maxYears), maxLTV: b.maxLTV, minIncome: b.minIncome });
    return { bank: b.bank.length > 30 ? b.bank.slice(0, 28) + "…" : b.bank, monthly: Math.round(e.monthly), rate: (b.rate * 100).toFixed(1), eligible: e.eligible };
  });

  // ===== Comparables =====
  const [compAreaId, setCompAreaId] = useState<string>("");
  const comps = useMemo(() => {
    if (!compAreaId || !properties || !txns) return [];
    const propsInArea = properties.filter((p: any) => p.area_id === compAreaId);
    const propIds = new Set(propsInArea.map((p: any) => p.id));
    return (txns as any[])
      .filter((t) => propIds.has(t.property_id))
      .sort((a, b) => new Date(b.txn_date).getTime() - new Date(a.txn_date).getTime())
      .slice(0, 15)
      .map((t) => {
        const p = propsInArea.find((x: any) => x.id === t.property_id);
        return {
          date: t.txn_date,
          type: p?.type_label || "—",
          area: p?.area_sqm || 0,
          price: +t.price,
          pricePerSqm: p?.area_sqm ? +t.price / p.area_sqm : 0,
          source: t.source || "—",
        };
      });
  }, [compAreaId, properties, txns]);

  const compStats = useMemo(() => {
    if (!comps.length) return null;
    const psm = comps.map((c) => c.pricePerSqm).filter((x) => x > 0).sort((a, b) => a - b);
    const med = psm[Math.floor(psm.length / 2)];
    const avg = psm.reduce((s, x) => s + x, 0) / psm.length;
    return { count: comps.length, median: med, avg, min: psm[0], max: psm[psm.length - 1] };
  }, [comps]);

  return (
    <div className="space-y-4" dir="rtl">
      <Tabs defaultValue="calc">
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="calc">🧮 حاسبة التمويل</TabsTrigger>
          <TabsTrigger value="islamic">🌙 تمويل إسلامي</TabsTrigger>
          <TabsTrigger value="banks">🏦 مقارنة البنوك</TabsTrigger>
          <TabsTrigger value="costs">💸 رسوم الصفقة</TabsTrigger>
          <TabsTrigger value="comps">📊 Comparables</TabsTrigger>
        </TabsList>

        <TabsContent value="islamic" className="space-y-4 mt-4">
          <IslamicFinancePanel />
        </TabsContent>

        {/* ===== TAB 1: CALCULATOR ===== */}
        <TabsContent value="calc" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Calculator className="h-4 w-4" />مدخلات التمويل العقاري</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div><Label className="text-xs">سعر العقار (ج.م)</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
              <div><Label className="text-xs">مقدّم (%)</Label><Input type="number" value={downPct} onChange={(e) => setDownPct(+e.target.value)} /></div>
              <div><Label className="text-xs">الدخل الشهري (ج.م)</Label><Input type="number" value={income} onChange={(e) => setIncome(+e.target.value)} /></div>
              <div><Label className="text-xs">مدة القرض (سنة)</Label><Input type="number" value={years} onChange={(e) => setYears(+e.target.value)} /></div>
              <div>
                <Label className="text-xs">البنك / الجهة</Label>
                <Select value={String(bankIdx)} onValueChange={(v) => setBankIdx(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EG_BANKS_2026.map((b, i) => <SelectItem key={i} value={String(i)}>{b.bank} — {(b.rate * 100).toFixed(1)}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">حالة الشهر العقاري</Label>
                <Select value={legalStatus} onValueChange={setLegalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="registered_ayni">مسجّل عيني</SelectItem>
                    <SelectItem value="registered_personal">مسجّل شخصي</SelectItem>
                    <SelectItem value="court_judgment">حكم محكمة</SelectItem>
                    <SelectItem value="reconciled">موفّق وضعه</SelectItem>
                    <SelectItem value="customary">عرفي</SelectItem>
                    <SelectItem value="possession">وضع يد</SelectItem>
                    <SelectItem value="unknown">غير معروف</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Bankability alert */}
          <Card className={bankability.bankable ? "border-green-500/40" : "border-destructive/40"}>
            <CardContent className="p-4 flex items-center gap-3">
              {bankability.bankable ? <CheckCircle2 className="h-5 w-5 text-green-600" /> : <XCircle className="h-5 w-5 text-destructive" />}
              <div className="flex-1">
                <div className="font-semibold text-sm">{bankability.bankable ? "العقار قابل للتمويل" : "العقار غير قابل للتمويل"}</div>
                <div className="text-xs text-muted-foreground">{bankability.reason}</div>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Stat label="القسط الشهري" value={`${fmt(Math.round(elig.monthly))} ج`} sub={`${(elig.dti * 100).toFixed(1)}% من الدخل`} highlight={elig.dtiOk} />
            <Stat label="قيمة القرض" value={`${fmt(elig.loan)} ج`} sub={`LTV ${(elig.ltv * 100).toFixed(0)}% / حد ${(bank.maxLTV * 100).toFixed(0)}%`} highlight={elig.ltvOk} />
            <Stat label="إجمالي الفوائد" value={`${fmt(Math.round(amort.totalInterest))} ج`} sub={`${((amort.totalInterest / elig.loan) * 100).toFixed(0)}% من القرض`} />
            <Stat label="إجمالي المدفوع" value={`${fmt(Math.round(amort.totalPaid + downPayment))} ج`} sub="قرض + مقدّم" />
          </div>

          {/* Eligibility checklist */}
          <Card>
            <CardHeader><CardTitle className="text-base">الأهلية للتمويل (شروط البنك المركزي + {bank.bank})</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              <CheckRow ok={elig.dtiOk} label={`DTI (نسبة القسط للدخل) ${(elig.dti * 100).toFixed(1)}% ≤ 40%`} />
              <CheckRow ok={elig.ltvOk} label={`LTV ${(elig.ltv * 100).toFixed(0)}% ≤ ${(bank.maxLTV * 100).toFixed(0)}%`} />
              <CheckRow ok={elig.incomeOk} label={`الدخل ${fmt(income)} ≥ ${fmt(bank.minIncome)} ج/شهر`} />
              <CheckRow ok={bankability.bankable} label={`حالة الشهر العقاري — ${bankability.reason}`} />
              <div className="pt-2 mt-2 border-t text-xs text-muted-foreground">
                💡 أقصى قرض ممكن وفق DTI=40%: <b>{fmt(Math.round(elig.maxLoanByDTI))} ج.م</b>
              </div>
            </CardContent>
          </Card>

          {/* Amortization chart */}
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4" />جدول الاستهلاك (Amortization)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={amort.rows}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" label={{ value: "السنة", position: "insideBottom", offset: -5 }} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => fmt(Math.round(v))} />
                  <Legend />
                  <Line type="monotone" dataKey="balance" name="الرصيد المتبقي" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                  <Line type="monotone" dataKey="interest" name="فائدة الشهر" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
                  <Line type="monotone" dataKey="principal" name="أصل الشهر" stroke="#10b981" strokeWidth={1.5} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 2: BANK COMPARISON ===== */}
        <TabsContent value="banks" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Banknote className="h-4 w-4" />مقارنة القسط الشهري عبر البنوك المصرية</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={bankCompare} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="bank" width={200} fontSize={10} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} ج/شهر`} />
                  <Bar dataKey="monthly" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs">
                  <tr>
                    <th className="text-right p-2">البنك</th>
                    <th className="text-right p-2">الفائدة</th>
                    <th className="text-right p-2">القسط</th>
                    <th className="text-right p-2">الأهلية</th>
                  </tr>
                </thead>
                <tbody>
                  {bankCompare.map((b, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2">{b.bank}</td>
                      <td className="p-2 font-mono">{b.rate}%</td>
                      <td className="p-2 font-mono">{fmt(b.monthly)} ج</td>
                      <td className="p-2">{b.eligible ? <Badge className="bg-green-600">مؤهل</Badge> : <Badge variant="destructive">غير مؤهل</Badge>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 3: TRANSACTION COSTS ===== */}
        <TabsContent value="costs" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />على المشتري</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Row k="عمولة الوسيط (2.5%)" v={costs.buyer.brokerCommission} />
                <Row k="رسوم الشهر العقاري (2.5% بحد 100ك)" v={costs.buyer.registrationFee} />
                <Row k="ضريبة التصرف (2.5%)" v={costs.buyer.transferTax} />
                <Row k="دراسة البنك (~1%)" v={costs.buyer.bankStudyFee} />
                <Row k="تأمين الحياة (سنوي ~0.5%)" v={costs.buyer.lifeInsurance} />
                <Row k="تأمين العقار (~0.2%)" v={costs.buyer.propertyInsurance} />
                <Row k="رسوم توثيق ومستندات" v={costs.buyer.notaryAndDocs} />
                <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                  <span>الإجمالي على المشتري</span><span>{fmt(Math.round(costs.buyer.total))} ج</span>
                </div>
                <div className="text-xs text-muted-foreground pt-1">
                  ≈ {((costs.buyer.total / price) * 100).toFixed(1)}% من سعر العقار
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><Receipt className="h-4 w-4" />على البائع</CardTitle></CardHeader>
              <CardContent className="text-sm space-y-1">
                <Row k="عمولة الوسيط (2.5%)" v={costs.seller.brokerCommission} />
                <Row k="ضريبة الأرباح الرأسمالية" v={costs.seller.capitalGains} note="معفى للسكن الرئيسي" />
                <div className="border-t pt-2 mt-2 font-bold flex justify-between">
                  <span>الإجمالي على البائع</span><span>{fmt(Math.round(costs.seller.total))} ج</span>
                </div>
                <div className="border-t pt-3 mt-3 text-xs text-muted-foreground">
                  <b>صافي البائع:</b> {fmt(Math.round(price - costs.seller.total))} ج
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground">
              💡 <b>ملاحظة الوكيل العقاري:</b> العمولة المتعارف عليها في السوق المصري 2.5% من كل طرف (5% إجمالي).
              يمكن التفاوض على 2% للصفقات &gt; 10 مليون أو 3% للصفقات &lt; 1 مليون.
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 4: COMPARABLES ===== */}
        <TabsContent value="comps" className="space-y-4 mt-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <CardTitle className="text-base">مقارنات السوق (آخر 15 صفقة)</CardTitle>
                <Select value={compAreaId} onValueChange={setCompAreaId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="اختر حياً للمقارنة" /></SelectTrigger>
                  <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!compAreaId ? (
                <div className="text-center py-8 text-muted-foreground text-sm">اختر حياً لعرض الصفقات الأخيرة</div>
              ) : !comps.length ? (
                <div className="text-center py-8 text-muted-foreground text-sm">لا توجد صفقات مسجّلة في هذا الحي</div>
              ) : (
                <>
                  {compStats && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                      <Stat label="عدد الصفقات" value={`${compStats.count}`} sub="آخر 15" />
                      <Stat label="متوسط سعر المتر" value={`${fmt(Math.round(compStats.avg))} ج`} sub="حسابي" highlight />
                      <Stat label="وسيط سعر المتر" value={`${fmt(Math.round(compStats.median))} ج`} sub="median" />
                      <Stat label="نطاق السعر" value={`${fmt(Math.round(compStats.min))} - ${fmt(Math.round(compStats.max))}`} sub="ج/م²" />
                    </div>
                  )}
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="text-xs border-b bg-muted">
                        <tr>
                          <th className="text-right p-2">التاريخ</th>
                          <th className="text-right p-2">النوع</th>
                          <th className="text-right p-2">المساحة</th>
                          <th className="text-right p-2">السعر</th>
                          <th className="text-right p-2">سعر المتر</th>
                          <th className="text-right p-2">المصدر</th>
                        </tr>
                      </thead>
                      <tbody>
                        {comps.map((c, i) => (
                          <tr key={i} className="border-b">
                            <td className="p-2 font-mono text-xs">{c.date}</td>
                            <td className="p-2">{c.type}</td>
                            <td className="p-2">{c.area} م²</td>
                            <td className="p-2 font-mono">{fmt(c.price)}</td>
                            <td className="p-2 font-mono font-semibold">{fmt(Math.round(c.pricePerSqm))}</td>
                            <td className="p-2 text-xs text-muted-foreground">{c.source}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ label, value, sub, highlight }: { label: string; value: string; sub?: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary/40" : ""}>
      <CardContent className="p-3">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-lg font-bold mt-1 ${highlight ? "text-primary" : ""}`}>{value}</div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function CheckRow({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {ok ? <CheckCircle2 className="h-4 w-4 text-green-600" /> : <XCircle className="h-4 w-4 text-destructive" />}
      <span className={ok ? "" : "text-destructive"}>{label}</span>
    </div>
  );
}

function Row({ k, v, note }: { k: string; v: number; note?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-muted-foreground">{k}{note && <span className="text-xs"> ({note})</span>}</span>
      <span className="font-mono">{fmt(Math.round(v))} ج</span>
    </div>
  );
}
