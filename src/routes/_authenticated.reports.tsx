import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDown, Building, MapPin, FileText, BarChart3, Building2 } from "lucide-react";
import { generateMarketReport, generateAreaReport, generateUnitReport, generateComparativeReport, generateBuildingReport } from "@/lib/pdf-reports";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/reports")({ component: ReportsPage });

function ReportsPage() {
  const { data: areas } = useQuery({ queryKey: ["areas-all"], queryFn: async () => (await supabase.from("areas").select("*").order("name")).data || [] });
  const { data: properties } = useQuery({ queryKey: ["props-all"], queryFn: async () => (await supabase.from("properties").select("*").order("id")).data || [] });
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
    await generateMarketReport(areas as any, properties as any);
    toast.success("تم توليد تقرير السوق");
  };
  const downloadArea = async () => {
    const a = areas?.find((x: any) => x.id === areaId);
    if (!a) return toast.error("اختر منطقة");
    await generateAreaReport(a as any, (properties || []) as any, (txns || []) as any);
    toast.success("تم توليد تقرير المنطقة");
  };
  const downloadUnit = async () => {
    const p = properties?.find((x: any) => x.id === propId);
    const a = areas?.find((x: any) => x.id === p?.area_id);
    if (!p || !a) return toast.error("اختر عقار");
    await generateUnitReport(p as any, a as any, { txns: (txns || []) as any });
    toast.success("تم توليد تقرير الوحدة");
  };
  const downloadCompare = async () => {
    if (!areas?.length) return toast.error("لا توجد بيانات");
    await generateComparativeReport(areas as any, (properties || []) as any);
    toast.success("تم توليد التقرير المقارن");
  };

  const downloadBuilding = async () => {
    const a = areas?.find((x: any) => x.id === bldAreaId);
    if (!a) return toast.error("اختر المنطقة");
    const selected = bldUnits.filter((u: any) => bldUnitIds.includes(u.id));
    if (!selected.length) return toast.error("اختر وحدة واحدة على الأقل");
    if (!bldLabel.trim()) return toast.error("اكتب اسم/كود المبنى");
    await generateBuildingReport(bldLabel.trim(), a as any, selected as any, (txns || []) as any);
    toast.success(`تم توليد تقرير المبنى (${selected.length} وحدة)`);
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مركز التقارير</h1>
        <p className="text-sm text-muted-foreground">5 أنواع تقارير PDF احترافية متوافقة مع IVS 2022</p>
      </div>


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
              <Button onClick={downloadUnit} disabled={!propId} className="flex-1"><FileDown className="h-4 w-4 ml-1" />PDF</Button>
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
