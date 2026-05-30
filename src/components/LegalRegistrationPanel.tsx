import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import {
  LEGAL_STATUS_MAP,
  PORT_SAID_REGISTRATION_OFFICES,
  REQUIRED_DOCS,
  calcRegistrationFees,
  applyLegalDiscount,
  type LegalStatus,
} from "@/lib/legal-registration";
import { fmt } from "@/lib/valuation";
import { Scale, FileCheck, Building2, Calculator, AlertTriangle, CheckCircle2 } from "lucide-react";

export default function LegalRegistrationPanel() {
  const [status, setStatus] = useState<LegalStatus>("registered_personal");
  const [marketValue, setMarketValue] = useState(2_000_000);
  const [annualRental, setAnnualRental] = useState(60_000);
  const [isCommercial, setIsCommercial] = useState(false);

  const result = applyLegalDiscount(marketValue, status);
  const fees = calcRegistrationFees(marketValue, annualRental, isCommercial);

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold text-base flex items-center gap-2 mb-1">
            <Scale className="h-5 w-5 text-primary" />
            الشهر العقاري والسجل العيني — محافظة بورسعيد
          </h3>
          <p className="text-xs text-muted-foreground">
            تقييم المخاطر القانونية، حساب الرسوم والضرائب، ومأموريات الشهر العقاري المختصة لكل حي.
          </p>
        </CardContent>
      </Card>

      <Tabs defaultValue="status">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="status">🛡️ حالة التسجيل</TabsTrigger>
          <TabsTrigger value="fees">💰 حاسبة الرسوم</TabsTrigger>
          <TabsTrigger value="offices">🏛️ المأموريات</TabsTrigger>
          <TabsTrigger value="docs">📄 المستندات</TabsTrigger>
        </TabsList>

        {/* ========== الحالة القانونية + الخصم ========== */}
        <TabsContent value="status" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">معامل الخصم القانوني حسب نوع السند</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">القيمة السوقية المقدّرة (ج.م)</Label>
                  <Input
                    type="number"
                    value={marketValue}
                    onChange={(e) => setMarketValue(+e.target.value || 0)}
                  />
                </div>
                <div>
                  <Label className="text-xs">حالة العقار القانونية</Label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as LegalStatus)}
                    className="w-full h-9 px-3 rounded-md border bg-background text-sm"
                  >
                    {Object.values(LEGAL_STATUS_MAP).map((s) => (
                      <option key={s.key} value={s.key}>{s.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid sm:grid-cols-3 gap-2">
                <div className="rounded-lg border p-3 bg-muted/30">
                  <div className="text-[10px] text-muted-foreground">القيمة السوقية</div>
                  <div className="text-lg font-bold">{fmt(marketValue)} ج</div>
                </div>
                <div className="rounded-lg border p-3 bg-amber-50 dark:bg-amber-950/30">
                  <div className="text-[10px] text-muted-foreground">نسبة الخصم القانوني</div>
                  <div className="text-lg font-bold text-amber-700 dark:text-amber-400">
                    {result.discountPct.toFixed(0)}%
                  </div>
                  <div className="text-[10px] text-muted-foreground">+ {result.info.riskPremium}% علاوة مخاطر</div>
                </div>
                <div className="rounded-lg border-2 border-primary p-3 bg-primary/5">
                  <div className="text-[10px] text-muted-foreground">القيمة بعد الخصم</div>
                  <div className="text-lg font-bold text-primary">{fmt(result.legalValue)} ج</div>
                </div>
              </div>

              <div className="rounded-lg border-r-4 border-r-primary bg-card p-3 text-xs space-y-1">
                <div><b>الوصف:</b> {result.info.description}</div>
                <div className="text-primary"><b>توصية المقيّم:</b> {result.info.recommendation}</div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm">مقارنة جميع الحالات</CardTitle></CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="border-b text-right">
                    <tr>
                      <th className="p-2">الحالة</th>
                      <th className="p-2">معامل القيمة</th>
                      <th className="p-2">علاوة مخاطر</th>
                      <th className="p-2">قابلية الرهن البنكي</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(LEGAL_STATUS_MAP).map((s) => (
                      <tr key={s.key} className="border-b hover:bg-muted/30">
                        <td className="p-2 font-medium">{s.label}</td>
                        <td className="p-2">×{s.discount.toFixed(2)}</td>
                        <td className="p-2">+{s.riskPremium}%</td>
                        <td className="p-2">
                          {s.discount >= 0.95 ? (
                            <Badge className="bg-green-600">مقبول</Badge>
                          ) : s.discount >= 0.85 ? (
                            <Badge variant="secondary">مشروط</Badge>
                          ) : (
                            <Badge variant="destructive">غير مقبول</Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== حاسبة الرسوم ========== */}
        <TabsContent value="fees" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <Calculator className="h-4 w-4 text-primary" />
                حاسبة رسوم التسجيل والضرائب
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid sm:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">ثمن الصفقة (ج.م)</Label>
                  <Input type="number" value={marketValue} onChange={(e) => setMarketValue(+e.target.value || 0)} />
                </div>
                <div>
                  <Label className="text-xs">القيمة الإيجارية السنوية (ج.م)</Label>
                  <Input type="number" value={annualRental} onChange={(e) => setAnnualRental(+e.target.value || 0)} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">طبيعة الاستخدام</Label>
                  <div className="flex items-center gap-2 h-9">
                    <Switch checked={isCommercial} onCheckedChange={setIsCommercial} />
                    <span className="text-sm">{isCommercial ? "تجاري" : "سكني"}</span>
                  </div>
                </div>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <FeeBox label="رسم الشهر (2.5%)" value={fees.registrationFee} note="حد أقصى 100 ألف" />
                <FeeBox label="رسوم توثيق" value={fees.documentationFee} note="تقريبي" />
                <FeeBox label="ضريبة التصرفات (2.5%)" value={fees.transferTax} note="على البائع" />
                <FeeBox label="الضريبة العقارية/سنة" value={fees.realEstateTax} note={isCommercial ? "بدون إعفاء" : "بعد الإعفاء 24 ألف"} highlight="amber" />
              </div>

              <div className="grid sm:grid-cols-2 gap-2">
                <div className="rounded-lg border-2 border-primary p-3 bg-primary/5">
                  <div className="text-xs text-muted-foreground">إجمالي رسوم لمرة واحدة</div>
                  <div className="text-xl font-bold text-primary">{fmt(fees.totalOneTime)} ج</div>
                  <div className="text-[10px] text-muted-foreground">{((fees.totalOneTime / marketValue) * 100).toFixed(2)}% من قيمة الصفقة</div>
                </div>
                <div className="rounded-lg border-2 border-amber-500 p-3 bg-amber-50/50 dark:bg-amber-950/20">
                  <div className="text-xs text-muted-foreground">عبء سنوي متكرر</div>
                  <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{fmt(fees.annualBurden)} ج</div>
                  <div className="text-[10px] text-muted-foreground">ضريبة عقارية سنوية</div>
                </div>
              </div>

              <ul className="text-[11px] text-muted-foreground space-y-1 list-disc pr-4">
                {fees.notes.map((n, i) => <li key={i}>{n}</li>)}
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ========== المأموريات ========== */}
        <TabsContent value="offices" className="space-y-3 mt-4">
          <div className="grid md:grid-cols-2 gap-3">
            {PORT_SAID_REGISTRATION_OFFICES.map((o) => (
              <Card key={o.name} className="border-r-4 border-r-primary">
                <CardContent className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <h4 className="font-bold flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-primary" />
                      {o.name}
                    </h4>
                    <Badge variant={o.type === "ayni" ? "default" : "secondary"}>
                      {o.type === "ayni" ? "سجل عيني" : "شهر شخصي"}
                    </Badge>
                  </div>
                  <div className="text-xs"><b>النطاق:</b> {o.scope}</div>
                  {o.address && <div className="text-xs text-muted-foreground"><b>العنوان:</b> {o.address}</div>}
                </CardContent>
              </Card>
            ))}
          </div>
          <div className="rounded-lg border-r-4 border-r-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs">
            <b className="text-amber-700 dark:text-amber-400 flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> ملاحظة:
            </b>
            معظم بورسعيد لا يزال يعمل بنظام الشهر الشخصي (ق. 114/1946). السجل العيني (ق. 142/1964) مطبّق بنطاق محدود.
            راجع المأمورية المختصة قبل بدء أي إجراء.
          </div>
        </TabsContent>

        {/* ========== المستندات ========== */}
        <TabsContent value="docs" className="space-y-3 mt-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2">
                <FileCheck className="h-4 w-4 text-primary" />
                المستندات المطلوبة للشهر / تسجيل التصرف
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {REQUIRED_DOCS.map((d, i) => (
                  <div key={i} className="flex items-center justify-between gap-2 rounded border p-2 text-sm">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className={`h-4 w-4 ${d.critical ? "text-red-600" : "text-muted-foreground"}`} />
                      {d.name}
                    </div>
                    {d.critical ? (
                      <Badge variant="destructive" className="text-[10px]">إلزامي</Badge>
                    ) : (
                      <Badge variant="outline" className="text-[10px]">اختياري</Badge>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function FeeBox({ label, value, note, highlight }: { label: string; value: number; note?: string; highlight?: "amber" }) {
  return (
    <div className={`rounded-lg border p-3 ${highlight === "amber" ? "bg-amber-50/50 dark:bg-amber-950/20" : "bg-card"}`}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold">{fmt(value)} ج</div>
      {note && <div className="text-[10px] text-muted-foreground">{note}</div>}
    </div>
  );
}
