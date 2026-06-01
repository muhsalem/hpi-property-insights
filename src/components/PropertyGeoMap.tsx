import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MapPin, Compass, Navigation2 } from "lucide-react";
import { fmt } from "@/lib/valuation";

/**
 * يدمج الأبعاد الجغرافية للعقار محل التقييم:
 *  - إحداثيات (Lat/Lng) + المسافة عن مركز المدينة
 *  - الخريطة التفاعلية (Leaflet)
 *  - التوجيه (شمال/جنوب/شرق/غرب) من مركز بورسعيد
 *  - قرب الخدمات (من حقل nearby في DB)
 *  - مؤشرات بيئية (موقع ساحلي / داخلي)
 */

const PORT_SAID_CENTER = { lat: 31.255, lng: 32.298 };

function haversineKm(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.asin(Math.sqrt(h));
}

function bearing(from: { lat: number; lng: number }, to: { lat: number; lng: number }) {
  const φ1 = (from.lat * Math.PI) / 180;
  const φ2 = (to.lat * Math.PI) / 180;
  const Δλ = ((to.lng - from.lng) * Math.PI) / 180;
  const y = Math.sin(Δλ) * Math.cos(φ2);
  const x = Math.cos(φ1) * Math.sin(φ2) - Math.sin(φ1) * Math.cos(φ2) * Math.cos(Δλ);
  const θ = Math.atan2(y, x);
  return ((θ * 180) / Math.PI + 360) % 360;
}

function dirLabel(deg: number): string {
  const dirs = ["شمال", "شمال شرق", "شرق", "جنوب شرق", "جنوب", "جنوب غرب", "غرب", "شمال غرب"];
  return dirs[Math.round(deg / 45) % 8];
}

export default function PropertyGeoMap({ area, prop }: { area: any; prop: any }) {
  const [mod, setMod] = useState<any>(null);
  useEffect(() => {
    import("react-leaflet").then((rl) => setMod(rl));
  }, []);

  const lat = Number(area.lat);
  const lng = Number(area.lng);
  const distKm = haversineKm(PORT_SAID_CENTER, { lat, lng });
  const dir = dirLabel(bearing(PORT_SAID_CENTER, { lat, lng }));
  const isCoastal = Math.abs(lng - 32.30) < 0.04 && lat > 31.24;
  const nearby: any[] = Array.isArray(area.nearby) ? area.nearby : [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          الأبعاد الجغرافية للعقار محل التقييم
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <GeoItem icon="📍" label="الإحداثيات" value={`${lat.toFixed(4)}°N, ${lng.toFixed(4)}°E`} />
          <GeoItem icon="📏" label="المسافة من المركز" value={`${distKm.toFixed(2)} كم`} />
          <GeoItem icon="🧭" label="الاتجاه" value={dir} />
          <GeoItem icon={isCoastal ? "🌊" : "🏙️"} label="الموقع البيئي" value={isCoastal ? "ساحلي" : "داخلي"} highlight={isCoastal} />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
          <GeoItem icon="🏛️" label="الحي الإداري" value={area.districts?.name || area.district_id} />
          <GeoItem icon="👥" label="سكان الحي" value={area.population ? fmt(area.population) : "—"} />
          <GeoItem icon="🏘️" label="عدد المباني" value={area.buildings_count ? fmt(area.buildings_count) : "—"} />
          <GeoItem icon="🛣️" label="البنية التحتية" value={`${area.infra_rating || 3}/5`} />
        </div>

        {/* الخريطة */}
        <div className="h-[320px] rounded-md overflow-hidden border" dir="ltr">
          {!mod ? (
            <div className="h-full flex items-center justify-center text-muted-foreground text-sm">جارٍ تحميل الخريطة…</div>
          ) : (
            <mod.MapContainer center={[lat, lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
              <mod.LayersControl position="topright">
                <mod.LayersControl.BaseLayer checked name="خريطة">
                  <mod.TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                </mod.LayersControl.BaseLayer>
                <mod.LayersControl.BaseLayer name="قمر صناعي">
                  <mod.TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
                </mod.LayersControl.BaseLayer>
              </mod.LayersControl>

              {/* دائرة 500م حول العقار */}
              <mod.Circle center={[lat, lng]} radius={500} pathOptions={{ color: "#185FA5", fillOpacity: 0.08, weight: 1, dashArray: "4" }} />

              {/* العقار محل التقييم */}
              <mod.CircleMarker
                center={[lat, lng]}
                radius={14}
                pathOptions={{ color: "white", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
              >
                <mod.Tooltip permanent direction="top" offset={[0, -12]}>
                  <div className="text-right" dir="rtl">
                    <b>📍 العقار محل التقييم</b>
                    <div className="text-[10px]">{prop.type_label} · {prop.area_sqm} م²</div>
                  </div>
                </mod.Tooltip>
              </mod.CircleMarker>

              {/* مركز المدينة كمرجع */}
              <mod.CircleMarker
                center={[PORT_SAID_CENTER.lat, PORT_SAID_CENTER.lng]}
                radius={6}
                pathOptions={{ color: "white", weight: 2, fillColor: "#185FA5", fillOpacity: 0.8 }}
              >
                <mod.Tooltip direction="top" offset={[0, -8]}>مركز بورسعيد</mod.Tooltip>
              </mod.CircleMarker>
            </mod.MapContainer>
          )}
        </div>

        {nearby.length > 0 && (
          <div>
            <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">
              <Navigation2 className="h-3.5 w-3.5" /> الخدمات والمرافق المجاورة
            </div>
            <div className="flex flex-wrap gap-1">
              {nearby.map((n: any, i: number) => (
                <Badge key={i} variant="secondary" className="text-[10px]">
                  {typeof n === "string" ? n : `${n.name || n.type}${n.distance ? ` · ${n.distance}م` : ""}`}
                </Badge>
              ))}
            </div>
          </div>
        )}

        <div className="rounded border-r-4 border-r-primary bg-primary/5 p-2 text-xs leading-relaxed">
          <Compass className="h-3.5 w-3.5 inline ml-1 text-primary" />
          <b>التوصيف الجغرافي للتقرير:</b> يقع العقار في حي <b>{area.districts?.name || area.district_id}</b> على
          بُعد <b>{distKm.toFixed(2)} كم {dir}</b> من مركز بورسعيد، عند الإحداثيات ({lat.toFixed(4)}، {lng.toFixed(4)}).
          الموقع <b>{isCoastal ? "ساحلي" : "داخلي"}</b> بكثافة سكانية {area.population ? fmt(area.population) : "غير محدد"} نسمة
          ومستوى بنية تحتية {area.infra_rating || 3}/5.
        </div>
      </CardContent>
    </Card>
  );
}

function GeoItem({ icon, label, value, highlight }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`border rounded p-2 ${highlight ? "border-primary border-2 bg-primary/5" : ""}`}>
      <div className="text-[10px] text-muted-foreground">{icon} {label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
    </div>
  );
}
