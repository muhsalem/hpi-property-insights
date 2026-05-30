import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Map as MapIcon } from "lucide-react";
import { fmt } from "@/lib/valuation";

type Area = {
  id: string;
  name: string;
  district_id: string;
  lat: number;
  lng: number;
  base_price: number;
  growth: number;
  population?: number;
  buildings_count?: number;
  housing_units?: number;
};

type District = { id: string; name: string; color?: string };

const PORT_SAID_CENTER: [number, number] = [31.255, 32.298];

function priceColor(p: number) {
  if (p >= 20000) return "#dc2626";
  if (p >= 15000) return "#ea580c";
  if (p >= 12000) return "#ca8a04";
  if (p >= 9000) return "#16a34a";
  return "#0891b2";
}

export default function PortSaidMap() {
  const [areas, setAreas] = useState<Area[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mod, setMod] = useState<any>(null);

  useEffect(() => {
    Promise.all([
      import("react-leaflet"),
      import("leaflet/dist/leaflet.css" as any).catch(() => null),
    ]).then(([rl]) => setMod(rl));
    (async () => {
      const [a, d] = await Promise.all([
        supabase.from("areas").select("id,name,district_id,lat,lng,base_price,growth,population,buildings_count,housing_units"),
        supabase.from("districts").select("id,name,color"),
      ]);
      setAreas((a.data || []) as Area[]);
      setDistricts((d.data || []) as District[]);
    })();
  }, []);

  const districtMap = Object.fromEntries(districts.map((d) => [d.id, d]));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          خريطة بورسعيد التفاعلية — {areas.length} منطقة
        </CardTitle>
        <div className="flex flex-wrap gap-2 text-xs mt-2">
          <Badge style={{ backgroundColor: "#dc2626", color: "white" }}>≥ 20,000 جم/م²</Badge>
          <Badge style={{ backgroundColor: "#ea580c", color: "white" }}>15-20K</Badge>
          <Badge style={{ backgroundColor: "#ca8a04", color: "white" }}>12-15K</Badge>
          <Badge style={{ backgroundColor: "#16a34a", color: "white" }}>9-12K</Badge>
          <Badge style={{ backgroundColor: "#0891b2", color: "white" }}>أقل من 9K</Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-md overflow-hidden border" dir="ltr">
          {!mod ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">جارٍ تحميل الخريطة…</div>
          ) : (
            <mod.MapContainer center={PORT_SAID_CENTER} zoom={13} style={{ height: "100%", width: "100%" }}>
              <mod.LayersControl position="topright">
                <mod.LayersControl.BaseLayer checked name="OpenStreetMap">
                  <mod.TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </mod.LayersControl.BaseLayer>
                <mod.LayersControl.BaseLayer name="قمر صناعي">
                  <mod.TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </mod.LayersControl.BaseLayer>
              </mod.LayersControl>
              {areas.map((a) => (
                <mod.CircleMarker
                  key={a.id}
                  center={[Number(a.lat), Number(a.lng)]}
                  radius={9}
                  pathOptions={{
                    color: "white",
                    weight: 2,
                    fillColor: priceColor(Number(a.base_price)),
                    fillOpacity: 0.85,
                  }}
                >
                  <mod.Tooltip direction="top" offset={[0, -8]}>
                    <div className="text-right" dir="rtl" style={{ minWidth: 180 }}>
                      <div className="font-bold">{a.name}</div>
                      <div className="text-xs text-muted-foreground">{districtMap[a.district_id]?.name || ""}</div>
                      <div className="mt-1 text-xs">السعر: <b>{fmt(Number(a.base_price))} جم/م²</b></div>
                      <div className="text-xs">النمو: <b>{((a.growth || 0) * 100).toFixed(1)}%</b></div>
                      {!!a.population && <div className="text-xs">السكان: {fmt(a.population)}</div>}
                      {!!a.buildings_count && <div className="text-xs">المباني: {fmt(a.buildings_count)}</div>}
                    </div>
                  </mod.Tooltip>
                </mod.CircleMarker>
              ))}
            </mod.MapContainer>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
