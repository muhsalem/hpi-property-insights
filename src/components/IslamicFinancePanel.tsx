import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { Moon, Scale, CheckCircle2, AlertTriangle, TrendingUp } from "lucide-react";
import { EG_ISLAMIC_BANKS_2026, murabaha, ijara, musharaka, SHARIA_NOTES, EG_ISLAMIC_MARKET } from "@/lib/islamic-finance";
import { EG_BANKS_2026, emi } from "@/lib/mortgage";
import { fmt } from "@/lib/valuation";

export default function IslamicFinancePanel() {
  const [price, setPrice] = useState(2_000_000);
  const [downPct, setDownPct] = useState(20);
  const [years, setYears] = useState(20);
  const [bankIdx, setBankIdx] = useState(0);
  const [contract, setContract] = useState<"murabaha" | "ijara" | "musharaka">("murabaha");

  const bank = EG_ISLAMIC_BANKS_2026[bankIdx];
  const dp = (price * downPct) / 100;

  const mura = useMemo(() => murabaha({ cost: price, downPayment: dp, profitRate: bank.profitRate, years }), [price, dp, bank.profitRate, years]);
  const ija = useMemo(() => ijara({ propertyValue: price, downPayment: dp, rentalYield: bank.profitRate, years }), [price, dp, bank.profitRate, years]);
  const mush = useMemo(() => musharaka({ propertyValue: price, clientShare: dp, profitRate: bank.profitRate, years }), [price, dp, bank.profitRate, years]);

  // Conventional reference (NBE) for fair comparison
  const convRate = EG_BANKS_2026[2].rate; // NBE
  const convMonthly = emi(price - dp, convRate, years);
  const convTotal = convMonthly * years * 12;

  const comparisonData = [
    { name: "مرابحة", monthly: Math.round(mura.monthly), total: Math.round(mura.totalPaid + dp), profit: Math.round(mura.totalProfit) },
    { name: "إجارة منتهية بالتمليك", monthly: Math.round(ija.monthly), total: Math.round(ija.totalPaid + dp), profit: Math.round(ija.totalRental) },
    { name: "مشاركة متناقصة", monthly: Math.round(mush.firstMonthlyPayment), total: Math.round(mush.totalPaid + dp), profit: Math.round(mush.totalRent) },
    { name: "تقليدي (مرجعي)", monthly: Math.round(convMonthly), total: Math.round(convTotal + dp), profit: Math.round(convTotal - (price - dp)) },
  ];

  return (
    <div className="space-y-4" dir="rtl">
      {/* Market overview */}
      <Card className="bg-gradient-to-l from-emerald-500/10 to-transparent border-emerald-500/30">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-2">
            <Moon className="h-5 w-5 text-emerald-600" />
            <h3 className="font-bold">سوق التمويل الإسلامي في مصر — Q4 2025</h3>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            <Stat label="حصة السوق" value={`${(EG_ISLAMIC_MARKET.assetShare * 100).toFixed(1)}%`} sub="من الأصول البنكية" />
            <Stat label="إجمالي الأصول" value={`${(EG_ISLAMIC_MARKET.totalAssetsEGP / 1e9).toFixed(0)} مليار ج`} sub="2025" highlight />
            <Stat label="معدل النمو" value={`+${(EG_ISLAMIC_MARKET.growthYoY * 100).toFixed(0)}%`} sub="سنوياً — الأسرع نمواً" highlight />
            <Stat label="عدد البنوك" value={`${EG_ISLAMIC_MARKET.banksCount}`} sub="بنوك + نوافذ إسلامية" />
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="calc">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="calc">🧮 حاسبة الصيغ</TabsTrigger>
          <TabsTrigger value="compare">⚖️ مقارنة مع التقليدي</TabsTrigger>
          <TabsTrigger value="banks">🏦 البنوك الإسلامية</TabsTrigger>
          <TabsTrigger value="sharia">📖 الأحكام الشرعية</TabsTrigger>
        </TabsList>

        {/* ===== TAB 1: Calculator ===== */}
        <TabsContent value="calc" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">مدخلات التمويل الإسلامي</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-4">
              <div><Label className="text-xs">سعر العقار (ج.م)</Label><Input type="number" value={price} onChange={(e) => setPrice(+e.target.value)} /></div>
              <div><Label className="text-xs">مقدّم / حصة العميل (%)</Label><Input type="number" value={downPct} onChange={(e) => setDownPct(+e.target.value)} /></div>
              <div><Label className="text-xs">مدة التمويل (سنة)</Label><Input type="number" value={years} onChange={(e) => setYears(+e.target.value)} /></div>
              <div className="md:col-span-2">
                <Label className="text-xs">البنك الإسلامي / المنتج</Label>
                <Select value={String(bankIdx)} onValueChange={(v) => setBankIdx(+v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EG_ISLAMIC_BANKS_2026.map((b, i) => <SelectItem key={i} value={String(i)}>{b.bank} — {b.productAr} — {(b.profitRate * 100).toFixed(1)}%</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الصيغة المعروضة</Label>
                <Select value={contract} onValueChange={(v: any) => setContract(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="murabaha">مرابحة (Murabaha)</SelectItem>
                    <SelectItem value="ijara">إجارة منتهية بالتمليك (Ijara)</SelectItem>
                    <SelectItem value="musharaka">مشاركة متناقصة (Musharaka)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Selected contract details */}
          {contract === "murabaha" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المرابحة — Cost-Plus Sale</CardTitle>
                <p className="text-xs text-muted-foreground">يشتري البنك العقار ثم يبيعه للعميل بثمن مؤجل = التكلفة + هامش ربح متفق عليه.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Stat label="ثمن البيع الكلي" value={`${fmt(Math.round(mura.sellingPrice))} ج`} sub="ثابت لا يتغير" highlight />
                  <Stat label="القسط الشهري" value={`${fmt(Math.round(mura.monthly))} ج`} sub="ثابت طوال المدة" highlight />
                  <Stat label="هامش الربح الكلي" value={`${fmt(Math.round(mura.totalProfit))} ج`} sub={`${(mura.profitMarkup * 100).toFixed(1)}% من التمويل`} />
                  <Stat label="إجمالي المدفوع" value={`${fmt(Math.round(mura.totalPaid + dp))} ج`} sub="مع المقدّم" />
                </div>
                <div className="text-xs bg-muted/50 p-3 rounded">
                  ✅ <b>المزية الشرعية:</b> ثمن البيع محدد وقت العقد ولا يتغير حتى لو تأخر العميل. القسط الشهري ثابت يساعد على التخطيط المالي.
                </div>
              </CardContent>
            </Card>
          )}

          {contract === "ijara" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">الإجارة المنتهية بالتمليك — Lease-to-Own</CardTitle>
                <p className="text-xs text-muted-foreground">يملك البنك العقار ويؤجره للعميل، ومع نهاية المدة تنتقل الملكية للعميل بهبة أو بيع رمزي.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Stat label="حصة البنك" value={`${fmt(Math.round(ija.bankShare))} ج`} sub="مالك العقار" />
                  <Stat label="القسط الشهري" value={`${fmt(Math.round(ija.monthly))} ج`} sub="إيجار + قسط تملك" highlight />
                  <Stat label="مكوّن الإيجار (شهر 1)" value={`${fmt(Math.round(ija.firstRental))} ج`} sub="يتناقص تدريجياً" />
                  <Stat label="إجمالي الإيجارات" value={`${fmt(Math.round(ija.totalRental))} ج`} sub="عوض البنك" />
                </div>
                <div className="text-xs bg-muted/50 p-3 rounded">
                  ✅ <b>المزية:</b> العقار في ملك البنك خلال فترة الإجارة → التأمين الكبير والصيانة الإنشائية على البنك (شرعاً).
                  <br />
                  ⚠️ <b>تحذير:</b> الإيجار قد يُعاد تسعيره كل 3-5 سنوات حسب الاتفاق.
                </div>
              </CardContent>
            </Card>
          )}

          {contract === "musharaka" && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">المشاركة المتناقصة — Diminishing Partnership</CardTitle>
                <p className="text-xs text-muted-foreground">يملك العميل والبنك العقار شراكة، ويشتري العميل حصة البنك تدريجياً + يدفع إيجاراً على حصة البنك المتبقية.</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                  <Stat label="حصة البنك الابتدائية" value={`${fmt(Math.round(mush.bankShare))} ج`} sub={`${((mush.bankShare / price) * 100).toFixed(0)}%`} />
                  <Stat label="القسط الشهري الأول" value={`${fmt(Math.round(mush.firstMonthlyPayment))} ج`} sub="إيجار + تملك" highlight />
                  <Stat label="القسط الشهري الأخير" value={`${fmt(Math.round(mush.lastMonthlyPayment))} ج`} sub="تملك فقط — الإيجار = 0" />
                  <Stat label="إجمالي الإيجار" value={`${fmt(Math.round(mush.totalRent))} ج`} sub="يتناقص سنوياً" />
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={mush.rows}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="year" /><YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                    <Tooltip formatter={(v: number) => fmt(Math.round(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="bankShareEnd" name="حصة البنك المتبقية" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="rentForYear" name="إيجار السنة" stroke="hsl(var(--destructive))" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
                <div className="text-xs bg-muted/50 p-3 rounded mt-3">
                  ✅ <b>الأكثر مرونة شرعياً:</b> يجمع بين الإجارة والمشاركة الحقيقية. القسط يتناقص مع الوقت لأن حصة البنك تقل.
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* ===== TAB 2: Comparison ===== */}
        <TabsContent value="compare" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><Scale className="h-4 w-4" />مقارنة الصيغ الإسلامية مع التمويل التقليدي</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" fontSize={11} />
                  <YAxis tickFormatter={(v) => `${(v / 1000).toFixed(0)}k`} />
                  <Tooltip formatter={(v: number) => `${fmt(v)} ج`} />
                  <Legend />
                  <Bar dataKey="monthly" name="القسط الشهري" fill="hsl(var(--primary))" />
                  <Bar dataKey="profit" name="الربح/الفائدة الكلية" fill="hsl(var(--destructive))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs">
                  <tr>
                    <th className="text-right p-2">الصيغة</th>
                    <th className="text-right p-2">القسط الشهري</th>
                    <th className="text-right p-2">الإجمالي المدفوع</th>
                    <th className="text-right p-2">الربح/الفائدة</th>
                    <th className="text-right p-2">مقارنة بالتقليدي</th>
                  </tr>
                </thead>
                <tbody>
                  {comparisonData.map((r, i) => {
                    const diff = ((r.total - comparisonData[3].total) / comparisonData[3].total) * 100;
                    return (
                      <tr key={i} className="border-b">
                        <td className="p-2 font-medium">{r.name}</td>
                        <td className="p-2 font-mono">{fmt(r.monthly)} ج</td>
                        <td className="p-2 font-mono">{fmt(r.total)} ج</td>
                        <td className="p-2 font-mono">{fmt(r.profit)} ج</td>
                        <td className="p-2">
                          {i === 3 ? <Badge variant="outline">المرجع</Badge> :
                            diff > 1 ? <Badge variant="destructive">+{diff.toFixed(1)}%</Badge> :
                              diff < -1 ? <Badge className="bg-green-600">{diff.toFixed(1)}%</Badge> :
                                <Badge variant="secondary">≈ متعادل</Badge>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-xs space-y-2">
              <p><b>📊 خلاصة الخبير:</b></p>
              <ul className="list-disc pr-6 space-y-1">
                <li>هامش الربح في المرابحة المصرية غالباً <b>أعلى 0.5-1%</b> من الفائدة التقليدية لتغطية مخاطر التملك المؤقت.</li>
                <li>المشاركة المتناقصة الأوفر على المدى الطويل لأن الإيجار يتناقص مع تملك العميل لحصة أكبر.</li>
                <li>الإجارة المنتهية بالتمليك أنسب لمن يفضل عدم تحمل الصيانة الإنشائية الكبرى.</li>
                <li>القسط الإسلامي <b>ثابت</b> طوال المدة → حماية من ارتفاع الفائدة (ميزة مهمة في مصر بظل تقلبات سعر الفائدة).</li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 3: Banks list ===== */}
        <TabsContent value="banks" className="space-y-4 mt-4">
          <Card>
            <CardContent className="p-0 overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-xs">
                  <tr>
                    <th className="text-right p-2">البنك / النافذة</th>
                    <th className="text-right p-2">المنتج</th>
                    <th className="text-right p-2">هامش الربح</th>
                    <th className="text-right p-2">أقصى مدة</th>
                    <th className="text-right p-2">نسبة التمويل</th>
                    <th className="text-right p-2">الحد الأدنى للدخل</th>
                  </tr>
                </thead>
                <tbody>
                  {EG_ISLAMIC_BANKS_2026.map((b, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-2 font-medium">{b.bank}{b.note && <div className="text-[10px] text-muted-foreground">{b.note}</div>}</td>
                      <td className="p-2"><Badge variant="outline">{b.productAr}</Badge></td>
                      <td className="p-2 font-mono">{(b.profitRate * 100).toFixed(1)}%</td>
                      <td className="p-2">{b.maxYears} سنة</td>
                      <td className="p-2">{(b.maxFinanceRatio * 100).toFixed(0)}%</td>
                      <td className="p-2 font-mono">{fmt(b.minIncome)} ج</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ===== TAB 4: Sharia rulings ===== */}
        <TabsContent value="sharia" className="space-y-4 mt-4">
          <div className="grid md:grid-cols-2 gap-4">
            <Card className="border-destructive/40">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="h-4 w-4 text-destructive" />المحظورات الشرعية</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {SHARIA_NOTES.prohibitions.map((p, i) => (
                  <div key={i} className="flex gap-2"><span className="text-destructive">✗</span><span>{p}</span></div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-green-500/40">
              <CardHeader><CardTitle className="text-base flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-green-600" />المزايا الشرعية</CardTitle></CardHeader>
              <CardContent className="space-y-2 text-sm">
                {SHARIA_NOTES.advantages.map((a, i) => (
                  <div key={i} className="flex gap-2"><span className="text-green-600">✓</span><span>{a}</span></div>
                ))}
              </CardContent>
            </Card>
          </div>

          <Card className="border-yellow-500/40">
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><TrendingUp className="h-4 w-4 text-yellow-600" />مخاطر ينبغي معرفتها</CardTitle></CardHeader>
            <CardContent className="space-y-2 text-sm">
              {SHARIA_NOTES.risks.map((r, i) => (
                <div key={i} className="flex gap-2"><span className="text-yellow-600">⚠</span><span>{r}</span></div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4 text-xs text-muted-foreground">
              <b>📖 الجهات المُقِرَّة:</b> {SHARIA_NOTES.fatwa}
              <br />
              <b>الإطار التنظيمي في مصر:</b> هيئة الرقابة المالية (FRA) + البنك المركزي المصري + هيئة رقابة شرعية مستقلة داخل كل بنك (تتبع معايير AAOIFI).
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
