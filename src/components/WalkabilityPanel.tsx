import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Footprints, Clock, MapPin } from "lucide-react";

/**
 * Walkability Score + Isochrone (تقريب جغرافي بـ Haversine)
 * - يحسب مسافة قاصدة لأقرب خدمات (مدرسة، مستشفى، حديقة) من إحداثيات المنطقة
 * - يعطي Score من 100 طبقاً لمنهجية Walk Score (≥90 ممتاز … <50 يعتمد على السيارة)
 * - Isochrone: تقدير الوصول مشياً (5 و 10 دقائق ≈ 400م و 800م)
 */

// نفس POIs المستخدمة في الخريطة — لتوحيد المرجع
const POIS = [
  { type: "school", name: "مدرسة بورسعيد الثانوية", lat: 31.262, lng: 32.302 },
  { type: "school", name: "مدرسة النصر", lat: 31.248, lng: 32.295 },
  { type: "school", name: "مدرسة الزهور", lat: 31.270, lng: 32.310 },
  { type: "school", name: "مدرسة العرب", lat: 31.240, lng: 32.288 },
  { type: "hospital", name: "مستشفى بورسعيد العام", lat: 31.258, lng: 32.300 },
  { type: "hospital", name: "مستشفى التأمين الصحي", lat: 31.252, lng: 32.293 },
  { type: "hospital", name: "مستشفى السلام الدولي", lat: 31.267, lng: 32.305 },
  { type: "park", name: "حديقة فريال", lat: 31.260, lng: 32.297 },
  { type: "park", name: "حديقة الشهيد", lat: 31.250, lng: 32.301 },
  { type: "park", name: "كورنيش بورسعيد", lat: 31.265, lng: 32.315 },
];

const TYPE_AR: Record<string, string> = { school: "🏫 مدارس", hospital: "🏥 مستشفيات", park: "🌳 حدائق وكورنيش" };
const TYPE_WEIGHT: Record<string, number> = { school: 30, hospital: 35, park: 20 };

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371; // km
  const toRad = (x: number) => (x * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function scoreForDistance(km: number): number {
  // Walk Score مبسّط — 100 إذا < 400م، 0 إذا > 2.4 كم
  if (km <= 0.4) return 100;
  if (km >= 2.4) return 0;
  return Math.round(100 - ((km - 0.4) / 2.0) * 100);
}

export default function WalkabilityPanel() {
  const [areaId, setAreaId] = useState<string>("");
  const { data: areas, isLoading } = useQuery({
    queryKey: ["walk-areas"],
    queryFn: async () => (await supabase.from("areas").select("id,name,lat,lng,district_id")).data || [],
  });

  const selectedArea = areas?.find((a: any) => a.id === areaId) || areas?.[0];

  const analysis = useMemo(() => {
    if (!selectedArea) return null;
    const lat = Number(selectedArea.lat), lng = Number(selectedArea.lng);

    // أقرب خدمة لكل نوع
    const byType: Record<string, { name: string; km: number; score: number }> = {};
    for (const poi of POIS) {
      const km = haversine(lat, lng, poi.lat, poi.lng);
      if (!byType[poi.type] || km < byType[poi.type].km) {
        byType[poi.type] = { name: poi.name, km, score: scoreForDistance(km) };
      }
    }

    // Walk Score مرجح
    const totalWeight = Object.values(TYPE_WEIGHT).reduce((s, x) => s + x, 0);
    const weightedScore = Object.entries(TYPE_WEIGHT).reduce((s, [type, w]) => {
      return s + (byType[type]?.score || 0) * w;
    }, 0) / totalWeight;

    // Isochrone: عدد الخدمات داخل 400م (5 دقائق) و 800م (10 دقائق)
    const within5min = POIS.filter((p) => haversine(lat, lng, p.lat, p.lng) <= 0.4).length;
    const within10min = POIS.filter((p) => haversine(lat, lng, p.lat, p.lng) <= 0.8).length;
    const within15min = POIS.filter((p) => haversine(lat, lng, p.lat, p.lng) <= 1.2).length;

    return { byType, walkScore: Math.round(weightedScore), within5min, within10min, within15min };
  }, [selectedArea]);

  const scoreLabel = (s: number) =>
    s >= 90 ? "جنّة المشاة" : s >= 70 ? "صديق للمشاة جداً" : s >= 50 ? "قابل للمشي" : s >= 25 ? "يعتمد على السيارة" : "معتمد كلياً على السيارة";
  const scoreColor = (s: number) =>
    s >= 90 ? "bg-green-600" : s >= 70 ? "bg-green-500" : s >= 50 ? "bg-yellow-500" : s >= 25 ? "bg-orange-500" : "bg-rose-500";

  if (isLoading) return <Skeleton className="h-96 w-full" />;

  return (
    <div className="space-y-4" dir="rtl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardTitle className="text-base flex items-center gap-2">
              <Footprints className="h-4 w-4 text-primary" />
              Walkability Score — قابلية المشي
            </CardTitle>
            <Select value={areaId || selectedArea?.id} onValueChange={setAreaId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="اختر منطقة" /></SelectTrigger>
              <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {analysis && (
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
                <div className="text-5xl font-bold text-primary">{analysis.walkScore}</div>
                <div className="flex-1">
                  <Badge className="text-sm">{scoreLabel(analysis.walkScore)}</Badge>
                  <div className="h-2 bg-muted rounded mt-2 overflow-hidden">
                    <div className={`h-full ${scoreColor(analysis.walkScore)}`} style={{ width: `${analysis.walkScore}%` }} />
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    منطقة {selectedArea?.name} · مرجح حسب توفّر المدارس، المستشفيات، والمساحات الخضراء
                  </div>
                </div>
              </div>

              <div>
                <div className="text-sm font-semibold mb-2 flex items-center gap-1"><MapPin className="h-4 w-4" />أقرب خدمة من كل نوع</div>
                <div className="grid md:grid-cols-3 gap-3">
                  {Object.entries(analysis.byType).map(([type, info]) => (
                    <Card key={type}>
                      <CardContent className="p-3">
                        <div className="text-xs text-muted-foreground">{TYPE_AR[type]}</div>
                        <div className="text-sm font-bold mt-1 truncate">{info.name}</div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-sm">{(info.km * 1000).toFixed(0)} م</span>
                          <Badge variant={info.score >= 70 ? "default" : info.score >= 40 ? "secondary" : "destructive"}>
                            {info.score}/100
                          </Badge>
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1">
                          ≈ {Math.round((info.km / 5) * 60)} دقيقة مشي
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Clock className="h-4 w-4 text-primary" />Isochrone — خرائط الوصول الزمني
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-3 text-center">
                    <div className="p-3 border rounded">
                      <div className="text-3xl font-bold text-green-600">{analysis.within5min}</div>
                      <div className="text-xs text-muted-foreground mt-1">خدمات داخل 5 دقائق مشي</div>
                      <div className="text-[10px] text-muted-foreground">(≤ 400 م)</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-3xl font-bold text-amber-600">{analysis.within10min}</div>
                      <div className="text-xs text-muted-foreground mt-1">خدمات داخل 10 دقائق</div>
                      <div className="text-[10px] text-muted-foreground">(≤ 800 م)</div>
                    </div>
                    <div className="p-3 border rounded">
                      <div className="text-3xl font-bold text-blue-600">{analysis.within15min}</div>
                      <div className="text-xs text-muted-foreground mt-1">خدمات داخل 15 دقيقة</div>
                      <div className="text-[10px] text-muted-foreground">(≤ 1.2 كم)</div>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-3 p-2 bg-muted/30 rounded">
                    💡 <b>كيف يؤثر على القيمة؟</b> كل نقطة Walkability إضافية ترفع متوسط أسعار الوحدات بـ 0.5%-1% حسب دراسات CEOs for Cities. منطقة بسكور ≥70 تبيع بعلاوة 5-15% على منطقة بسكور &lt;50.
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
