import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CITY_CENTERS, DISTRICT_POLY } from "@/lib/constants";
import { fmt } from "@/lib/valuation";
import "leaflet/dist/leaflet.css";

export const Route = createFileRoute("/_authenticated/map")({ component: MapPage });

function MapPage() {
  const { data } = useQuery({
    queryKey: ["map-data"],
    queryFn: async () => {
      const [d, a] = await Promise.all([
        supabase.from("districts").select("*"),
        supabase.from("areas").select("*"),
      ]);
      return { districts: d.data || [], areas: a.data || [] };
    },
  });

  const mapRef = useRef<HTMLDivElement>(null);
  const leafRef = useRef<any>(null);

  useEffect(() => {
    if (!data || !mapRef.current) return;
    let cancelled = false;
    (async () => {
      const L = (await import("leaflet")).default;
      if (cancelled) return;
      if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; }
      const map = L.map(mapRef.current!, { center: [31.245, 32.30], zoom: 11, scrollWheelZoom: true });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { attribution: "© OpenStreetMap", maxZoom: 19 }).addTo(map);
      leafRef.current = map;

      data.districts.forEach((d: any) => {
        const poly = DISTRICT_POLY[d.id];
        if (poly) {
          L.polygon(poly, { color: d.color || "#185FA5", weight: 2, fillOpacity: 0.15 })
            .bindTooltip(d.name, { permanent: false, direction: "center" })
            .addTo(map);
        }
      });

      data.areas.forEach((a: any) => {
        const d = data.districts.find((x: any) => x.id === a.district_id);
        const color = d?.color || "#185FA5";
        const popular = (a.growth || 0) > 0.55;
        L.circleMarker([a.lat, a.lng], {
          radius: popular ? 11 : 8,
          color: "#fff", weight: 2, fillColor: color, fillOpacity: 0.9,
        })
          .bindPopup(`
            <div style="direction:rtl;font-family:system-ui;min-width:200px">
              <div style="font-weight:700;font-size:14px;color:${color}">${a.name}</div>
              <div style="font-size:11px;color:#666;margin:4px 0">${d?.name || ""} · ${d?.city_name || ""}</div>
              <div style="font-size:11px;margin-top:6px">السعر الأساسي: <b>${fmt(a.base_price)}</b> ج.م</div>
              <div style="font-size:11px">النمو منذ 2020: <b style="color:#1D9E75">+${(a.growth*100).toFixed(0)}%</b></div>
              <div style="font-size:11px">سعر الأرض/م²: <b>${fmt(a.land_psqm)}</b> ج.م</div>
            </div>`)
          .addTo(map);
      });
    })();
    return () => { cancelled = true; if (leafRef.current) { leafRef.current.remove(); leafRef.current = null; } };
  }, [data]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">🗺️ الخريطة التفاعلية</h1>
        <p className="text-sm text-muted-foreground">{data?.areas.length || 0} حي · {Object.keys(CITY_CENTERS).length} مدن</p>
      </div>
      <Card>
        <CardContent className="p-0">
          <div ref={mapRef} style={{ height: "70vh", minHeight: 500, width: "100%", borderRadius: 8 }} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle className="text-sm">دليل الألوان</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2 text-xs">
          {data?.districts.map((d: any) => (
            <div key={d.id} className="flex items-center gap-1 px-2 py-1 rounded border">
              <span className="w-3 h-3 rounded-full" style={{ background: d.color }} />
              <span>{d.name}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
