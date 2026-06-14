import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, Navigation, Footprints, Car } from "lucide-react";
import {
  fetchNearbyPois,
  CATEGORY_LABELS_AR,
  computeWalkability,
  isochroneRadius,
  type OverpassPoi,
} from "@/lib/overpass";
import { useValuationState } from "@/context/ValuationStateContext";

export default function NearbyServicesPanel() {
  const { state } = useValuationState();
  const [lat, setLat] = useState(state.subject?.lat?.toString() ?? "31.2653");
  const [lon, setLon] = useState(state.subject?.lng?.toString() ?? "32.3019");
  const [minutes, setMinutes] = useState(10);
  const [mode, setMode] = useState<"walk" | "drive">("walk");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<Record<string, OverpassPoi[]> | null>(null);
  const [error, setError] = useState<string | null>(null);

  const radius = isochroneRadius(minutes, mode);

  const fetch = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await fetchNearbyPois(parseFloat(lat), parseFloat(lon), radius);
      setData(result);
    } catch (e: any) {
      setError(e.message || "تعذّر جلب البيانات من OpenStreetMap");
    } finally {
      setLoading(false);
    }
  };

  const walkability = data ? computeWalkability(data) : null;
  const totalPois = data ? Object.values(data).reduce((s, arr) => s + arr.length, 0) : 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Navigation className="h-5 w-5 text-primary" />
          الخدمات المحيطة (Isochrone + Overpass API)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2 items-end">
          <div>
            <Label className="text-xs">خط العرض</Label>
            <Input value={lat} onChange={(e) => setLat(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">خط الطول</Label>
            <Input value={lon} onChange={(e) => setLon(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">الزمن (دقيقة)</Label>
            <Input
              type="number"
              value={minutes}
              onChange={(e) => setMinutes(Math.max(1, parseInt(e.target.value) || 10))}
              className="h-8 text-xs"
            />
          </div>
          <div className="flex gap-1">
            <Button
              size="sm"
              variant={mode === "walk" ? "default" : "outline"}
              onClick={() => setMode("walk")}
              className="h-8 flex-1"
            >
              <Footprints className="h-3 w-3 ml-1" /> مشي
            </Button>
            <Button
              size="sm"
              variant={mode === "drive" ? "default" : "outline"}
              onClick={() => setMode("drive")}
              className="h-8 flex-1"
            >
              <Car className="h-3 w-3 ml-1" /> سيارة
            </Button>
          </div>
          <Button size="sm" onClick={fetch} disabled={loading} className="h-8">
            {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : "بحث"}
          </Button>
        </div>

        <div className="text-xs text-muted-foreground">
          نطاق البحث: {radius} متر تقريبًا (≈ {minutes} دقيقة {mode === "walk" ? "مشيًا" : "بالسيارة"})
        </div>

        {error && (
          <div className="rounded-md bg-destructive/10 text-destructive text-xs p-2">{error}</div>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
              <div className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">إجمالي المنشآت</div>
                <div className="font-bold text-lg">{totalPois}</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">مؤشر المشي (Walk Score)</div>
                <div className="font-bold text-lg text-primary">{walkability}/100</div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">أقرب سوبر ماركت</div>
                <div className="font-bold text-sm">
                  {data.supermarket?.[0] ? `${Math.round(data.supermarket[0].distance ?? 0)} م` : "—"}
                </div>
              </div>
              <div className="rounded-md border p-2">
                <div className="text-[11px] text-muted-foreground">أقرب مدرسة</div>
                <div className="font-bold text-sm">
                  {data.school?.[0] ? `${Math.round(data.school[0].distance ?? 0)} م` : "—"}
                </div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-2 max-h-72 overflow-y-auto">
              {Object.entries(data).map(([cat, items]) => (
                <div key={cat} className="rounded-md border p-2">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold">{CATEGORY_LABELS_AR[cat] ?? cat}</span>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <div className="space-y-1 text-[11px]">
                    {items.slice(0, 4).map((p) => (
                      <div key={p.id} className="flex items-center justify-between">
                        <span className="truncate flex items-center gap-1">
                          <MapPin className="h-3 w-3 text-muted-foreground shrink-0" />
                          {p.name ?? "(بدون اسم)"}
                        </span>
                        <span className="text-muted-foreground shrink-0">
                          {Math.round(p.distance ?? 0)} م
                        </span>
                      </div>
                    ))}
                    {items.length === 0 && <div className="text-muted-foreground">لا توجد نتائج</div>}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <p className="text-[11px] text-muted-foreground">
          مصدر البيانات: OpenStreetMap عبر Overpass API. النطاق محسوب من سرعة افتراضية
          {mode === "walk" ? " 4.7 كم/س للمشي" : " 30 كم/س للسيارة"}.
        </p>
      </CardContent>
    </Card>
  );
}
