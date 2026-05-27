import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { fmt } from "@/lib/valuation";
import { getDailyPrice, getInvReturn, getBuildingCondition, getBuildingAttachments, getHousingType } from "@/lib/domain";
import { ATT_CATS, HT_CLS, HT_IC } from "@/lib/constants";
import { generateUnitReport } from "@/lib/pdf-reports";
import { UnitIndicatorTree } from "@/components/UnitIndicatorTree";
import { FileDown, ArrowRight } from "lucide-react";

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

  const handlePDF = async () => {
    await generateUnitReport(prop as any, area as any);
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
        <Button onClick={handlePDF}><FileDown className="h-4 w-4 ml-1" />تقرير PDF</Button>
      </div>

      <div className="grid md:grid-cols-4 gap-3">
        <Stat label="السعر الحالي" value={`${fmt(inv.cur)} ج`} highlight />
        <Stat label="السعر/م²" value={`${fmt(Math.round(inv.cur / prop.area_sqm))} ج`} />
        <Stat label="ROI الكلي" value={`${inv.totROI}%`} />
        <Stat label="Rental Yield" value={`${inv.rYield}%`} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">المواصفات</CardTitle></CardHeader>
          <CardContent>
            <KV k="المساحة" v={`${prop.area_sqm} م²`} />
            <KV k="الدور" v={prop.floor ?? "-"} />
            <KV k="الإطلالة" v={prop.view ?? "-"} />
            <KV k="الغرف / الحمامات" v={`${prop.rooms ?? 0} / ${prop.baths ?? 0}`} />
            <KV k="سنة البناء" v={prop.year_built ?? "-"} />
            <KV k="سعر الشراء" v={prop.purchase_price ? `${fmt(prop.purchase_price)} ج` : "-"} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">حالة المبنى</CardTitle></CardHeader>
          <CardContent>
            <div className="text-center mb-3">
              <div className="text-5xl font-bold" style={{ color: cond.color }}>{cond.score}</div>
              <div className="text-sm mt-1" style={{ color: cond.color }}>{cond.grade}</div>
              <div className="text-xs text-muted-foreground">عمر المبنى: {cond.age} سنة</div>
            </div>
            <KV k="نوع المبنى" v={prop.building_type} />
            <KV k="التشطيب" v={prop.finish ?? "-"} />
            <KV k="عدد التجديدات" v={(prop.renovations as any[])?.length || 0} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">المرفقات والتجهيزات</CardTitle></CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-3">
            {ATT_CATS.map((c) => {
              const items = (att as any)[c.k] as string[];
              if (!items?.length) return null;
              return (
                <div key={c.k} className="border rounded p-3">
                  <div className="font-medium text-sm mb-2">{c.ic} {c.t}</div>
                  <ul className="text-xs space-y-1 text-muted-foreground">
                    {items.map((it, i) => <li key={i}>• {it}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
