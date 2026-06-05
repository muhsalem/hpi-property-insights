import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Building, MapPin, FileText, BarChart3, Building2, Inbox } from "lucide-react";
// PDF library (jspdf + qrcode + Arabic fonts) is loaded on demand to keep the initial bundle small
const loadPdf = () => import("@/lib/pdf-reports");
import { toast } from "sonner";
import { EmptyState } from "@/components/EmptyState";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

const runPdf = <T,>(promise: Promise<T>, label: string): Promise<T> => {
  toast.promise(promise, {
    loading: `جارٍ توليد ${label}…`,
    success: `تم توليد ${label} ✓`,
    error: (e) => `فشل التوليد: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
  });
  return promise;
};

function ReportsPage() {
  const { data: areas, isLoading: areasLoading } = useQuery({ queryKey: ["areas-all"], queryFn: async () => (await supabase.from("areas").select("*").order("name")).data || [] });
  const { data: properties, isLoading: propsLoading } = useQuery({ queryKey: ["props-all"], queryFn: async () => (await supabase.from("properties").select("*").order("id")).data || [] });
  const { data: txns } = useQuery({ queryKey: ["txns-all"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });

  const [areaId, setAreaId] = useState("");
  const [propId, setPropId] = useState("");

  // تقرير المبنى
  const [bldAreaId, setBldAreaId] = useState("");
  const [bldLabel, setBldLabel] = useState("");
  const [bldUnitIds, setBldUnitIds] = useState<string[]>([]);

  const bldUnits = useMemo(
    () => (properties || []).filter((p: any) => p.area_id === bldAreaId),
    [properties, bldAreaId],
  );

  const toggleUnit = (id: string, on: boolean) => {
    setBldUnitIds((prev) => on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id));
  };
  const selectAllUnits = () => setBldUnitIds(bldUnits.map((u: any) => u.id));
  const clearUnits = () => setBldUnitIds([]);


  const downloadMarket = async () => {
    if (!areas?.length || !properties?.length) return toast.error("لا توجد بيانات");
    const { generateMarketReport } = await loadPdf();
    await runPdf(generateMarketReport(areas as any, properties as any), "تقرير السوق");
  };
  const downloadArea = async () => {
    const a = areas?.find((x: any) => x.id === areaId);
    if (!a) return toast.error("اختر منطقة");
    const { generateAreaReport } = await loadPdf();
    await runPdf(generateAreaReport(a as any, (properties || []) as any, (txns || []) as any), "تقرير المنطقة");
  };
  const downloadUnit = async (lang: "ar" | "en" = "ar") => {
    const p = properties?.find((x: any) => x.id === propId);
    const a = areas?.find((x: any) => x.id === p?.area_id);
    if (!p || !a) return toast.error("اختر عقار");
    const mod = await loadPdf();
    const fn = lang === "en" ? mod.generateUnitReportEN : mod.generateUnitReport;
    const label = lang === "en" ? "English IVS report" : "تقرير الوحدة (EAA)";
    await runPdf(fn(p as any, a as any, { txns: (txns || []) as any }), label);
  };
  const downloadCompare = async () => {
    if (!areas?.length) return toast.error("لا توجد بيانات");
    const { generateComparativeReport } = await loadPdf();
    await runPdf(generateComparativeReport(areas as any, (properties || []) as any), "التقرير المقارن");
  };

  const downloadBuilding = async () => {
    const a = areas?.find((x: any) => x.id === bldAreaId);
    if (!a) return toast.error("اختر المنطقة");
    const selected = bldUnits.filter((u: any) => bldUnitIds.includes(u.id));
    if (!selected.length) return toast.error("اختر وحدة واحدة على الأقل");
    if (!bldLabel.trim()) return toast.error("اكتب اسم/كود المبنى");
    const { generateBuildingReport } = await loadPdf();
    await runPdf(
      generateBuildingReport(bldLabel.trim(), a as any, selected as any, (txns || []) as any),
      `تقرير المبنى (${selected.length} وحدة)`,
    );
  };

  const noData = !areasLoading && !propsLoading && !areas?.length && !properties?.length;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مركز التقارير</h1>
        <p className="text-sm text-muted-foreground">5 أنواع تقارير PDF احترافية متوافقة مع IVS 2025</p>
      </div>

      {(areasLoading || propsLoading) && (
        <div className="grid md:grid-cols-2 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-36 w-full" />
          ))}
        </div>
      )}

      {noData && (
        <Card>
          <CardContent className="p-6">
            <EmptyState
              icon={<Inbox className="h-6 w-6" />}
              title="لا توجد بيانات بعد"
              description="أضف مناطق وعقارات لتتمكن من توليد التقارير. يمكنك البدء من صفحة التقييم."
              action={<Link to="/valuate"><Button size="sm">ابدأ تقييم</Button></Link>}
            />
          </CardContent>
        </Card>
      )}



      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><BarChart3 className="h-5 w-5 text-primary" />تقرير السوق العام</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">18 مؤشر سوقي + أعلى المناطق سعراً</p>
            <Button onClick={downloadMarket} className="w-full"><FileDown className="h-4 w-4 ml-1" />توليد التقرير</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><MapPin className="h-5 w-5 text-primary" />تقرير منطقة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
              <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
            <Button onClick={downloadArea} disabled={!areaId} className="w-full"><FileDown className="h-4 w-4 ml-1" />توليد التقرير</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><Building className="h-5 w-5 text-primary" />تقرير وحدة</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <Select value={propId} onValueChange={setPropId}>
              <SelectTrigger><SelectValue placeholder="اختر عقار" /></SelectTrigger>
              <SelectContent>{properties?.slice(0, 100).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.id} — {p.type_label}</SelectItem>)}</SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={() => downloadUnit("ar")} disabled={!propId} className="flex-1"><FileDown className="h-4 w-4 ml-1" />عربي (EAA/FRA)</Button>
              <Button onClick={() => downloadUnit("en")} disabled={!propId} variant="secondary" className="flex-1"><FileDown className="h-4 w-4 ml-1" />English (IVS)</Button>
              {propId && <Link to="/property/$id" params={{ id: propId }}><Button variant="outline">عرض</Button></Link>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5 text-primary" />تقرير مقارن</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">مقارنة جميع المناطق ({areas?.length || 0}) جنباً إلى جنب</p>
            <Button onClick={downloadCompare} className="w-full"><FileDown className="h-4 w-4 ml-1" />توليد التقرير</Button>
          </CardContent>
        </Card>
      </div>

      <Card className="border-primary/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Building2 className="h-5 w-5 text-primary" />تقرير مبنى متعدد الوحدات
          </CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            اختر المنطقة، اكتب اسم/كود المبنى، ثم حدّد الوحدات المراد ضمها. التقرير يحسب قيمة كل وحدة بطرق التقييم الخمس ويجمعها لإجمالي قيمة المبنى مع تحليل إحصائي.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>المنطقة</Label>
              <Select value={bldAreaId} onValueChange={(v) => { setBldAreaId(v); setBldUnitIds([]); }}>
                <SelectTrigger><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
                <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>اسم/كود المبنى</Label>
              <Input value={bldLabel} onChange={(e) => setBldLabel(e.target.value)} placeholder="مثال: برج النيل - الدور 1-5" />
            </div>
          </div>

          {bldAreaId && (
            <div>
              <div className="flex items-center justify-between mb-2">
                <Label className="text-sm">الوحدات المتاحة ({bldUnits.length}) — محدد: {bldUnitIds.length}</Label>
                <div className="flex gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={selectAllUnits}>تحديد الكل</Button>
                  <Button type="button" size="sm" variant="ghost" onClick={clearUnits}>مسح</Button>
                </div>
              </div>
              <div className="max-h-64 overflow-auto border rounded-md p-2 space-y-1">
                {bldUnits.length === 0 && <div className="text-sm text-muted-foreground p-2">لا توجد وحدات في هذه المنطقة</div>}
                {bldUnits.map((u: any) => (
                  <label key={u.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded cursor-pointer text-sm">
                    <Checkbox checked={bldUnitIds.includes(u.id)} onCheckedChange={(c) => toggleUnit(u.id, !!c)} />
                    <span className="font-mono text-xs">{u.id}</span>
                    <span className="flex-1">{u.type_label}</span>
                    <span className="text-muted-foreground">{u.area_sqm} م²</span>
                    <span className="text-muted-foreground text-xs">دور {u.floor ?? "-"}</span>
                  </label>
                ))}
              </div>
            </div>
          )}

          <Button onClick={downloadBuilding} disabled={!bldAreaId || !bldUnitIds.length || !bldLabel.trim()} className="w-full">
            <FileDown className="h-4 w-4 ml-1" />توليد تقرير المبنى ({bldUnitIds.length} وحدة)
          </Button>
        </CardContent>
      </Card>


      <Card>
        <CardHeader><CardTitle className="text-base">دليل العقارات السريع ({properties?.length || 0})</CardTitle></CardHeader>
        <CardContent className="max-h-96 overflow-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted sticky top-0"><tr><th className="text-right p-2">ID</th><th className="text-right p-2">النوع</th><th className="text-right p-2">المساحة</th><th className="text-right p-2"></th></tr></thead>
            <tbody>
              {properties?.map((p: any) => (
                <tr key={p.id} className="border-b">
                  <td className="p-2 font-mono text-xs">{p.id}</td>
                  <td className="p-2">{p.type_label}</td>
                  <td className="p-2">{p.area_sqm} م²</td>
                  <td className="p-2 text-left"><Link to="/property/$id" params={{ id: p.id }} className="text-primary text-xs hover:underline">عرض ←</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
