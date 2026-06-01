import { useEffect } from "react";
import L from "leaflet";
import "leaflet.heat";
import { useMap } from "react-leaflet";

type Point = { lat: number; lng: number; weight: number };

export default function GisHeatLayer({ points, max = 1, radius = 35, blur = 25 }: { points: Point[]; max?: number; radius?: number; blur?: number }) {
  const map = useMap();
  useEffect(() => {
    if (!map || !points.length) return;
    const data = points.map((p) => [p.lat, p.lng, p.weight] as [number, number, number]);
    // @ts-ignore - leaflet.heat extends L
    const layer = L.heatLayer(data, {
      radius,
      blur,
      max,
      gradient: { 0.2: "#0891b2", 0.4: "#16a34a", 0.6: "#ca8a04", 0.8: "#ea580c", 1.0: "#dc2626" },
    }).addTo(map);
    return () => {
      map.removeLayer(layer);
    };
  }, [map, points, max, radius, blur]);
  return null;
}
