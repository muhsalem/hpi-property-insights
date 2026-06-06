import { useEffect, useState } from "react";

/** خريطة مصغّرة تُولَّد من خط العرض/الطول مباشرة (Leaflet + OSM). */
export default function MiniLatLngMap({ lat, lng, label }: { lat: number; lng: number; label?: string }) {
  const [mod, setMod] = useState<any>(null);
  useEffect(() => { import("react-leaflet").then(setMod); }, []);

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return (
      <div className="h-[220px] rounded border bg-muted/30 flex items-center justify-center text-xs text-muted-foreground">
        أدخل خط العرض وخط الطول لعرض الخريطة
      </div>
    );
  }

  return (
    <div className="h-[260px] rounded-md overflow-hidden border" dir="ltr">
      {!mod ? (
        <div className="h-full flex items-center justify-center text-xs text-muted-foreground">جارٍ تحميل الخريطة…</div>
      ) : (
        <mod.MapContainer center={[lat, lng]} zoom={16} style={{ height: "100%", width: "100%" }} key={`${lat},${lng}`}>
          <mod.LayersControl position="topright">
            <mod.LayersControl.BaseLayer checked name="Street">
              <mod.TileLayer attribution="&copy; OpenStreetMap" url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            </mod.LayersControl.BaseLayer>
            <mod.LayersControl.BaseLayer name="Satellite">
              <mod.TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />
            </mod.LayersControl.BaseLayer>
          </mod.LayersControl>
          <mod.Circle center={[lat, lng]} radius={120} pathOptions={{ color: "#185FA5", fillOpacity: 0.1, weight: 1 }} />
          <mod.CircleMarker
            center={[lat, lng]}
            radius={12}
            pathOptions={{ color: "white", weight: 3, fillColor: "#dc2626", fillOpacity: 1 }}
          >
            <mod.Tooltip permanent direction="top" offset={[0, -10]}>
              <div dir="rtl" className="text-right">
                <b>📍 {label || "موقع العقار"}</b>
                <div className="text-[10px]">{lat.toFixed(5)}, {lng.toFixed(5)}</div>
              </div>
            </mod.Tooltip>
          </mod.CircleMarker>
        </mod.MapContainer>
      )}
    </div>
  );
}
