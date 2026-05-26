import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { buildHPI, fmt } from "@/lib/valuation";
import { buildHpiSeries } from "@/lib/domain";
import { CITY_CENTERS, DISTRICT_POLY } from "@/lib/constants";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/hpi")({ component: HPIPage });

function HPIPage() {
  const { data: txns } = useQuery({ queryKey: ["hpi-txns"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });
  const { data: areas } = useQuery({ queryKey: ["hpi-areas"], queryFn: async () => (await supabase.from("areas").select("*, districts(name, color, city_name)").order("growth", { ascending: false })).data || [] });
  const { data: districts } = useQuery({ queryKey: ["hpi-districts"], queryFn: async () => (await supabase.from("districts").select("*")).data || [] });

  const [areaId, setAreaId] = useState<string>("");
  const selected = areas?.find((a: any) => a.id === areaId);

  const hpi = buildHPI(txns || []);
  const chartData = Object.entries(hpi).map(([year, val]) => ({ year, val: +val.toFixed(1) }));
  const last = chartData[chartData.length - 1]?.val || 100;
  const cagr = chartData.length > 1 ? (Math.pow(last / 100, 1 / (chartData.length - 1)) - 1) * 100 : 0;

  const areaSeries = useMemo(() => selected ? buildHpiSeries(selected) : [], [selected]);
  const topAreas = useMemo(() => (areas || []).slice(0, 10).map((a: any) => ({ name: a.name, growth: +(a.growth * 100).toFixed(1) })), [areas]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مؤشر أسعار العقارات HPI</h1>
        <p className="text-sm text-muted-foreground">Repeat-Sales · سنة الأساس 2020 = 100 · شامل لكل المدن</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">المؤشر العام</div><div className="text-2xl font-bold">{last.toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">CAGR سنوي</div><div className="text-2xl font-bold text-primary">{cagr.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي النمو</div><div className="text-2xl font-bold">+{(last - 100).toFixed(0)}%</div></CardContent></Card>
      </div>

      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid grid-cols-2 w-full max-w-md">
          <TabsTrigger value="charts">📊 المؤشرات</TabsTrigger>
          <TabsTrigger value="map">🗺️ الخريطة</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-4 mt-4">
          <Card>
            <CardHeader><CardTitle className="text-base">المؤشر العام عبر السنوات (Repeat-Sales)</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" /><YAxis />
                  <Tooltip />
                  <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex justify-between items-center gap-3 flex-wrap">
                <CardTitle className="text-base">HPI لكل حي</CardTitle>
                <Select value={areaId} onValueChange={setAreaId}>
                  <SelectTrigger className="w-64"><SelectValue placeholder="اختر حياً لعرض المنحنى" /></SelectTrigger>
                  <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {selected ? (
                <>
                  <div className="flex gap-3 mb-3 text-sm">
                    <Badge>نمو {(selected.growth * 100).toFixed(1)}%</Badge>
                    <Badge variant="outline">آخر مؤشر {areaSeries[areaSeries.length - 1]?.idx}</Badge>
                  </div>
                  <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={areaSeries}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="year" /><YAxis />
                      <Tooltip /><Legend />
                      <Line type="monotone" dataKey="idx" name={selected.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                    </LineChart>
                  </ResponsiveContainer>
                </>
              ) : (
                <div className="text-center py-12 text-muted-foreground text-sm">اختر حياً من القائمة لعرض منحنى المؤشر الخاص به</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">أعلى الأحياء نمواً</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={topAreas} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" unit="%" /><YAxis type="category" dataKey="name" width={100} fontSize={11} />
                  <Tooltip />
                  <Bar dataKey="growth" fill="hsl(var(--primary))" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="map" className="space-y-4 mt-4">
          <MapSection districts={districts || []} areas={areas || []} />
        </TabsContent>
      </Tabs>

      <Card>
        <CardHeader><CardTitle className="text-base">كيف تستخدم المؤشر؟</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• <b>تعديل القيم زمنياً:</b> قيمة 2022 × (HPI اليوم / HPI 2022)</p>
          <p>• <b>تقدير اتجاه السوق:</b> CAGR يدل على النمو المستدام</p>
          <p>• <b>تقييم المخاطر:</b> CAGR &gt; 12% = سوق ساخن، &lt; 5% = راكد</p>
          <p>• <b>إعادة التقييم الجماعية:</b> Mass Appraisal لمحفظة العقارات</p>
        </CardContent>
      </Card>
    </div>
  );
}

function MapSection({ districts, areas }: { districts: any[]; areas: any[] }) {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<any>(null);

  useEffect(() => {
    if (!mapRef.current || areas.length === 0) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
      const map = L.map(mapRef.current!, { center: [31.245, 32.30], zoom: 11, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      leafRef.current = map;

      districts.forEach((d: any) => {
        const poly = DISTRICT_POLY[d.id];
        if (poly) {
          L.polygon(poly, { color: d.color || "#185FA5", weight: 2, fillOpacity: 0.15 })
            .bindTooltip(d.name, { permanent: false, direction: "center" })
            .addTo(map);
        }
      });

      areas.forEach((a: any) => {
        const d = districts.find((x: any) => x.id === a.district_id);
        const color = d?.color || a.districts?.color || "#185FA5";
        const popular = (a.growth || 0) > 0.55;
        L.circleMarker([a.lat, a.lng], {
          radius: popular ? 12 : 9,
          color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.9,
        })
          .bindPopup(`
            <div style="direction:rtl;font-family:system-ui;min-width:200px">
              <div style="font-weight:700;font-size:14px;color:${color}">${a.name}</div>
              <div style="font-size:11px;color:#666;margin:4px 0">${a.districts?.city_name || d?.city_name || ""}</div>
              <div style="font-size:11px;margin-top:6px">السعر الأساسي: <b>${fmt(a.base_price)}</b> ج.م/م²</div>
              <div style="font-size:11px">النمو منذ 2020: <b style="color:#1D9E75">+${(a.growth*100).toFixed(0)}%</b></div>
              <div style="font-size:11px">سعر الأرض/م²: <b>${fmt(a.land_psqm)}</b> ج.م</div>
            </div>`)
          .addTo(map);
      });
    })();
    return () => { cancelled = true; if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; } };
  }, [districts, areas]);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <div ref={mapRef} style={{ height: "65vh", minHeight: 480, width: "100%", borderRadius: 8 }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">دليل الألوان · {areas.length} أحياء · {Object.keys(CITY_CENTERS).length} مدن</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          {districts.map((d: any) => (
            <div key={d.id} className="flex items-center gap-1 px-2 py-1 rounded border">
              <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
              <span>{d.name}</span>
              <span className="text-muted-foreground">({d.city_name})</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </>
  );
}
