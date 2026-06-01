import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/valuation";
import { getDailyPrice, getInvReturn, getBuildingCondition, getBuildingAttachments, getHousingType } from "@/lib/domain";
import { ATT_CATS, HT_CLS, HT_IC } from "@/lib/constants";
const loadPdf = () => import("@/lib/pdf-reports");
import { UnitIndicatorTree } from "@/components/UnitIndicatorTree";
import PropertyGeoMap from "@/components/PropertyGeoMap";
import PhysicalIndicatorsCard from "@/components/PhysicalIndicatorsCard";
import { LEGAL_STATUS_MAP, applyLegalDiscount, calcRegistrationFees, type LegalStatus } from "@/lib/legal-registration";
import { FileDown, ArrowRight, Scale, FileCheck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/property/$id")({ component: PropertyDetail });

function PropertyDetail() {
  const { id } = Route.useParams();
  const { data, isLoading } = useQuery({
    queryKey: ["property", id],
    queryFn: async () => {
      const { data: prop } = await supabase.from("properties").select("*").eq("id", id).maybeSingle();
      if (!prop) return null;
      const { data: area } = await supabase.from("areas").select("*, districts(name)").eq("id", prop.area_id).maybeSingle();
      const { data: txns } = await supabase.from("transactions").select("*").eq("property_id", id).order("txn_date", { ascending: false });
      return { prop, area, txns: txns || [] };
    },
  });

  if (isLoading) return <div className="text-center py-12">جاري التحميل...</div>;
  if (!data?.prop || !data?.area) return <div className="text-center py-12">العقار غير موجود</div>;

  const { prop, area, txns } = data;
  const inv = getInvReturn(prop, area);
  const cond = getBuildingCondition(prop);
  const att = getBuildingAttachments(prop, area);
  const ht = getHousingType(prop, area);

  const handlePDF = async (lang: "ar" | "en" = "ar") => {
    const mod = await loadPdf();
    const fn = lang === "en" ? mod.generateUnitReportEN : mod.generateUnitReport;
    await fn(prop as any, area as any);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
            <Link to="/dashboard" className="hover:underline">اللوحة</Link> <ArrowRight className="h-3 w-3" />
            <span>{area.districts?.name}</span> <ArrowRight className="h-3 w-3" />
            <span>{area.name}</span>
          </div>
          <h1 className="text-2xl font-bold">{prop.type_label} <span className="text-base font-normal text-muted-foreground">#{prop.id}</span></h1>
          <div className="flex gap-2 mt-1">
            <Badge variant="outline">{prop.building_type}</Badge>
            <Badge className={HT_CLS[ht] || ""}>{HT_IC[ht]} {ht}</Badge>
            {prop.finish && <Badge variant="secondary">{prop.finish}</Badge>}
          </div>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => handlePDF("ar")}><FileDown className="h-4 w-4 ml-1" />عربي (EAA/FRA)</Button>
          <Button onClick={() => handlePDF("en")} variant="secondary"><FileDown className="h-4 w-4 ml-1" />English (IVS)</Button>
        </div>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="السعر الحالي" value={`${fmt(inv.cur)} ج`} highlight />
        <Stat label="السعر/م²" value={`${fmt(Math.round(inv.cur / prop.area_sqm))} ج`} />
        <Stat label="ROI الكلي" value={`${inv.totROI}%`} />
        <Stat label="Rental Yield" value={`${inv.rYield}%`} />
      </div>

      <UnitIndicatorTree prop={prop} area={area} txns={txns} />

      {/* 🗺 الأبعاد الجغرافية + خريطة الموقع */}
      <PropertyGeoMap area={area} prop={prop} />

      {/* 🏗 المؤشرات الفيزيائية + الملحقات + ترجيح أدنى/أعلى سعر */}
      <PhysicalIndicatorsCard prop={prop} area={area} />

      <Card>
        <CardHeader><CardTitle className="text-base">تحليل العائد</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <tbody>
              <tr className="border-b"><td className="p-2">السعر الحالي</td><td className="p-2 font-bold text-left">{fmt(inv.cur)} ج</td></tr>
              <tr className="border-b"><td className="p-2">سعر الشراء التقديري</td><td className="p-2 text-left">{fmt(inv.pp)} ج</td></tr>
              <tr className="border-b"><td className="p-2">الإيجار السنوي المقدّر</td><td className="p-2 text-left">{fmt(inv.annRent)} ج</td></tr>
              <tr className="border-b"><td className="p-2">Capital Appreciation</td><td className="p-2 text-left text-primary font-bold">{inv.cap}%</td></tr>
              <tr className="border-b"><td className="p-2">Rental Yield</td><td className="p-2 text-left text-primary font-bold">{inv.rYield}%</td></tr>
              <tr><td className="p-2 font-bold">Total ROI</td><td className="p-2 text-left font-bold text-primary text-lg">{inv.totROI}%</td></tr>
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* ====== البيانات القانونية والشهر العقاري ====== */}
      <LegalDataCard prop={prop} marketValue={inv.cur} annualRent={inv.annRent} />

      {txns.length > 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">سجل المعاملات ({txns.length})</CardTitle></CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead><tr className="border-b"><th className="text-right p-2">التاريخ</th><th className="text-right p-2">السعر</th><th className="text-right p-2">المصدر</th></tr></thead>
              <tbody>
                {txns.map((t: any) => (
                  <tr key={t.id} className="border-b">
                    <td className="p-2">{t.txn_date}</td>
                    <td className="p-2 font-bold">{fmt(t.price)} ج</td>
                    <td className="p-2 text-muted-foreground">{t.source ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <Card className={highlight ? "border-primary border-2" : ""}>
      <CardContent className="p-4">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className={`text-xl font-bold ${highlight ? "text-primary" : ""}`}>{value}</div>
      </CardContent>
    </Card>
  );
}

function KV({ k, v }: { k: string; v: any }) {
  return <div className="flex justify-between py-1.5 border-b text-sm"><span className="text-muted-foreground">{k}</span><span className="font-medium">{v}</span></div>;
}

function LegalDataCard({ prop, marketValue, annualRent }: { prop: any; marketValue: number; annualRent: number }) {
  const status: LegalStatus = (prop.legal_status as LegalStatus) || "unknown";
  const result = applyLegalDiscount(marketValue, status);
  const fees = calcRegistrationFees(marketValue, annualRent, prop.category === "commercial");
  const encumbrances: any[] = Array.isArray(prop.encumbrances) ? prop.encumbrances : [];

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          البيانات القانونية والشهر العقاري
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="rounded border p-2">
            <div className="text-[10px] text-muted-foreground">حالة التسجيل</div>
            <Badge className="mt-1">{result.info.label}</Badge>
          </div>
          <div className="rounded border p-2">
            <div className="text-[10px] text-muted-foreground">رقم سند الملكية</div>
            <div className="text-sm font-bold">{prop.title_deed_no || "—"}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-[10px] text-muted-foreground">المأمورية المختصة</div>
            <div className="text-sm font-bold">{prop.registration_office || "—"}</div>
          </div>
          <div className="rounded border p-2">
            <div className="text-[10px] text-muted-foreground">رخصة البناء</div>
            <div className="text-sm font-bold">{prop.building_permit_no || "—"}</div>
          </div>
        </div>

        <div className="grid sm:grid-cols-3 gap-2">
          <div className="rounded border p-3 bg-muted/30">
            <div className="text-[10px] text-muted-foreground">القيمة السوقية</div>
            <div className="text-base font-bold">{fmt(marketValue)} ج</div>
          </div>
          <div className="rounded border p-3 bg-amber-50 dark:bg-amber-950/30">
            <div className="text-[10px] text-muted-foreground">خصم قانوني</div>
            <div className="text-base font-bold text-amber-700 dark:text-amber-400">{result.discountPct.toFixed(0)}%</div>
          </div>
          <div className="rounded border-2 border-primary p-3 bg-primary/5">
            <div className="text-[10px] text-muted-foreground">القيمة القابلة للتسجيل</div>
            <div className="text-base font-bold text-primary">{fmt(result.legalValue)} ج</div>
          </div>
        </div>

        <div className="rounded border-r-4 border-r-primary bg-card p-2 text-xs">
          <b>توصية:</b> {result.info.recommendation}
        </div>

        {encumbrances.length > 0 && (
          <div className="rounded border p-2">
            <div className="text-xs font-semibold mb-1">القيود والرهون</div>
            <div className="flex flex-wrap gap-1">
              {encumbrances.map((e: any, i: number) => (
                <Badge key={i} variant="destructive" className="text-[10px]">{typeof e === "string" ? e : e.type}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border p-2 text-xs">
          <div className="font-semibold mb-1 flex items-center gap-1">
            <FileCheck className="h-3.5 w-3.5 text-primary" /> رسوم وضرائب التسجيل
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-1">
            <div><span className="text-muted-foreground">رسم الشهر:</span> <b>{fmt(fees.registrationFee)}</b></div>
            <div><span className="text-muted-foreground">توثيق:</span> <b>{fmt(fees.documentationFee)}</b></div>
            <div><span className="text-muted-foreground">ض. تصرفات:</span> <b>{fmt(fees.transferTax)}</b></div>
            <div><span className="text-muted-foreground">ض. عقارية/سنة:</span> <b>{fmt(fees.realEstateTax)}</b></div>
          </div>
        </div>

        {prop.reconciliation_status && (
          <div className="rounded border p-2 text-xs">
            <b>حالة التصالح (ق. 187/2023):</b> {prop.reconciliation_status}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
