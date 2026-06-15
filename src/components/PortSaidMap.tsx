import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Map as MapIcon, Flame, MapPin } from "lucide-react";
import { fmt } from "@/lib/valuation";
import GisHeatLayer from "@/components/GisHeatLayer";

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

// Demo POIs (in absence of OSM Overpass) — strategic landmarks in Port Said
const DEMO_POIS = {
  schools: [
    { name: "مدرسة بورسعيد الثانوية", lat: 31.262, lng: 32.302 },
    { name: "مدرسة النصر", lat: 31.248, lng: 32.295 },
    { name: "مدرسة الزهور", lat: 31.270, lng: 32.310 },
    { name: "مدرسة العرب", lat: 31.240, lng: 32.288 },
  ],
  hospitals: [
    { name: "مستشفى بورسعيد العام", lat: 31.258, lng: 32.300 },
    { name: "مستشفى التأمين الصحي", lat: 31.252, lng: 32.293 },
    { name: "مستشفى السلام الدولي", lat: 31.267, lng: 32.305 },
  ],
  parks: [
    { name: "حديقة فريال", lat: 31.260, lng: 32.297 },
    { name: "حديقة الشهيد", lat: 31.250, lng: 32.301 },
    { name: "كورنيش بورسعيد", lat: 31.265, lng: 32.315 },
  ],
};

function priceColor(p: number) {
  if (p >= 20000) return "#dc2626";
  if (p >= 15000) return "#ea580c";
  if (p >= 12000) return "#ca8a04";
  if (p >= 9000) return "#16a34a";
  return "#0891b2";
}

export default function PortSaidMap({ property }: { property?: { lat: number; lng: number; label?: string; price?: number; area_sqm?: number } } = {}) {
  const [areas, setAreas] = useState<Area[]>([]);
  const [districts, setDistricts] = useState<District[]>([]);
  const [mod, setMod] = useState<any>(null);
  const [showHeat, setShowHeat] = useState(true);
  const hasProp = !!property && Number.isFinite(property.lat) && Number.isFinite(property.lng);
  const center: [number, number] = hasProp ? [property!.lat, property!.lng] : PORT_SAID_CENTER;
  const initZoom = hasProp ? 16 : 13;

  useEffect(() => {
    import("react-leaflet").then((rl) => setMod(rl));
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

  const heatPoints = useMemo(() => {
    const maxP = Math.max(1, ...areas.map((a) => Number(a.base_price)));
    return areas.map((a) => ({ lat: Number(a.lat), lng: Number(a.lng), weight: Number(a.base_price) / maxP }));
  }, [areas]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapIcon className="h-5 w-5 text-primary" />
          خريطة بورسعيد التفاعلية — {areas.length} منطقة
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2 text-xs mt-2">
          <Badge style={{ backgroundColor: "#dc2626", color: "white" }}>≥ 20,000 جم/م²</Badge>
          <Badge style={{ backgroundColor: "#ea580c", color: "white" }}>15-20K</Badge>
          <Badge style={{ backgroundColor: "#ca8a04", color: "white" }}>12-15K</Badge>
          <Badge style={{ backgroundColor: "#16a34a", color: "white" }}>9-12K</Badge>
          <Badge style={{ backgroundColor: "#0891b2", color: "white" }}>أقل من 9K</Badge>
          <Button
            size="sm"
            variant={showHeat ? "default" : "outline"}
            className="h-7 mr-auto"
            onClick={() => setShowHeat((v) => !v)}
          >
            <Flame className="h-3.5 w-3.5 ml-1" />
            {showHeat ? "إخفاء" : "إظهار"} خريطة الحرارة
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[500px] rounded-md overflow-hidden border" dir="ltr">
          {!mod ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">جارٍ تحميل الخريطة…</div>
          ) : (
            <mod.MapContainer center={center} zoom={initZoom} style={{ height: "100%", width: "100%" }} key={`${center[0]},${center[1]},${initZoom}`}>
              <mod.LayersControl position="topright">
                <mod.LayersControl.BaseLayer checked name="OpenStreetMap">
                  <mod.TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </mod.LayersControl.BaseLayer>
                <mod.LayersControl.BaseLayer name="قمر صناعي">
                  <mod.TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </mod.LayersControl.BaseLayer>

                <mod.LayersControl.Overlay checked name="🏘️ مناطق + أسعار">
                  <mod.LayerGroup>
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
                  </mod.LayerGroup>
                </mod.LayersControl.Overlay>

                <mod.LayersControl.Overlay name="🏫 مدارس">
                  <mod.LayerGroup>
                    {DEMO_POIS.schools.map((p, i) => (
                      <mod.CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#2563eb", fillColor: "#3b82f6", fillOpacity: 0.9, weight: 1.5 }}>
                        <mod.Tooltip>{p.name}</mod.Tooltip>
                      </mod.CircleMarker>
                    ))}
                  </mod.LayerGroup>
                </mod.LayersControl.Overlay>

                <mod.LayersControl.Overlay name="🏥 مستشفيات">
                  <mod.LayerGroup>
                    {DEMO_POIS.hospitals.map((p, i) => (
                      <mod.CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#dc2626", fillColor: "#ef4444", fillOpacity: 0.9, weight: 1.5 }}>
                        <mod.Tooltip>{p.name}</mod.Tooltip>
                      </mod.CircleMarker>
                    ))}
                  </mod.LayerGroup>
                </mod.LayersControl.Overlay>

                <mod.LayersControl.Overlay name="🌳 حدائق ومناطق خضراء">
                  <mod.LayerGroup>
                    {DEMO_POIS.parks.map((p, i) => (
                      <mod.CircleMarker key={i} center={[p.lat, p.lng]} radius={6} pathOptions={{ color: "#15803d", fillColor: "#22c55e", fillOpacity: 0.9, weight: 1.5 }}>
                        <mod.Tooltip>{p.name}</mod.Tooltip>
                      </mod.CircleMarker>
                    ))}
                  </mod.LayerGroup>
                </mod.LayersControl.Overlay>
              </mod.LayersControl>

              {showHeat && heatPoints.length > 0 && (
                <GisHeatLayer points={heatPoints} max={1} radius={45} blur={30} />
              )}
              {hasProp && (
                <>
                  <mod.Circle
                    center={[property!.lat, property!.lng]}
                    radius={150}
                    pathOptions={{ color: "#dc2626", fillColor: "#dc2626", fillOpacity: 0.08, weight: 1, dashArray: "4" }}
                  />
                  <mod.CircleMarker
                    center={[property!.lat, property!.lng]}
                    radius={14}
                    pathOptions={{ color: "white", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
                  >
                    <mod.Tooltip permanent direction="top" offset={[0, -14]}>
                      <div className="text-right" dir="rtl" style={{ minWidth: 160 }}>
                        <b>📍 {property!.label || "العقار محل التقييم"}</b>
                        <div className="text-[10px] mt-0.5">
                          {property!.lat.toFixed(5)}°N, {property!.lng.toFixed(5)}°E
                        </div>
                        {(property!.price || property!.area_sqm) && (
                          <div className="text-[10px] text-muted-foreground">
                            {property!.area_sqm ? `${property!.area_sqm} م²` : ""}
                            {property!.price ? ` · ${fmt(property!.price)} جم/م²` : ""}
                          </div>
                        )}
                      </div>
                    </mod.Tooltip>
                  </mod.CircleMarker>
                </>
              )}
            </mod.MapContainer>
          )}
        </div>
        <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          {hasProp
            ? `📍 موقع العقار محدد على الخريطة عند (${property!.lat.toFixed(5)}، ${property!.lng.toFixed(5)})`
            : "طبقات قابلة للتشغيل والإيقاف من زر اللوحة أعلى يسار الخريطة (مدارس · مستشفيات · حدائق · حرارة الأسعار)"}
          <MapPin className="h-3 w-3" />
        </div>
      </CardContent>
    </Card>
  );
}
