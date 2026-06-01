import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, MapPin, TrendingUp, Plus } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { OnboardingDialog } from "@/components/OnboardingDialog";
// IndicatorsPanel نُقل إلى تبويب «السوق والأحياء» (ComprehensiveMarketPanel أكمل وأشمل)

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dash-stats"],
    queryFn: async () => {
      const [c, d, a, p, t, v] = await Promise.all([
        supabase.from("cities").select("id", { count: "exact", head: true }),
        supabase.from("districts").select("id", { count: "exact", head: true }),
        supabase.from("areas").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("valuations").select("id", { count: "exact", head: true }),
      ]);
      return {
        cities: c.count || 0, districts: d.count || 0, areas: a.count || 0,
        props: p.count || 0, txns: t.count || 0, vals: v.count || 0,
      };
    },
  });

  const { data: hierarchy } = useQuery({
    queryKey: ["dash-hierarchy"],
    queryFn: async () => {
      const [cities, districts, areas] = await Promise.all([
        supabase.from("cities").select("*").order("name"),
        supabase.from("districts").select("*").order("name"),
        supabase.from("areas").select("*").order("base_price", { ascending: false }),
      ]);
      return { cities: cities.data || [], districts: districts.data || [], areas: areas.data || [] };
    },
  });

  const { data: valuations } = useQuery({
    queryKey: ["my-vals"],
    queryFn: async () => {
      const { data } = await supabase.from("valuations").select("*, properties(type_label, area_sqm)").order("created_at", { ascending: false }).limit(5);
      return data || [];
    },
  });

  return (
    <div className="space-y-6" dir="rtl">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">مرحباً بك في ثَمين — منصة التقييم العقاري</p>
        </div>
        <Link to="/valuate"><Button><Plus className="h-4 w-4 ml-1" />تقييم جديد</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard icon={MapPin} label="المدن" value={stats?.cities || 0} />
        <StatCard icon={MapPin} label="الأحياء" value={stats?.districts || 0} />
        <StatCard icon={MapPin} label="المناطق" value={stats?.areas || 0} />
        <StatCard icon={Building2} label="العقارات" value={stats?.props || 0} />
        <StatCard icon={TrendingUp} label="الصفقات" value={stats?.txns || 0} />
        <StatCard icon={Building2} label="تقييماتي" value={stats?.vals || 0} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">التقسيم الإداري لمحافظة بورسعيد</CardTitle>
          <p className="text-xs text-muted-foreground">مدينة ← حي ← منطقة سكنية</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {hierarchy?.cities.map((city: any) => {
            const cDists = hierarchy.districts.filter((d: any) => d.city_ref === city.id || d.city_id === city.id);
            return (
              <div key={city.id} className="border rounded-lg p-3" style={{ borderRightWidth: 4, borderRightColor: city.color || "#888" }}>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-bold">مدينة {city.name}</div>
                  <span className="text-xs text-muted-foreground">{cDists.length} حي</span>
                </div>
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2">
                  {cDists.map((d: any) => {
                    const dAreas = hierarchy.areas.filter((a: any) => a.district_id === d.id);
                    const avg = dAreas.length ? dAreas.reduce((s: number, a: any) => s + Number(a.base_price), 0) / dAreas.length : 0;
                    return (
                      <div key={d.id} className="rounded border p-2 text-xs">
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-semibold flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full" style={{ background: d.color || "#888" }} />
                            {d.name}
                          </span>
                          <Badge variant="secondary" className="text-[10px]">{dAreas.length} منطقة</Badge>
                        </div>
                        <div className="text-muted-foreground mb-1">متوسط: {fmt(Math.round(avg))} ج/م²</div>
                        <div className="flex flex-wrap gap-1">
                          {dAreas.map((a: any) => (
                            <span key={a.id} className="px-1.5 py-0.5 rounded bg-muted text-[10px]">{a.name}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">آخر تقييماتي</CardTitle></CardHeader>
        <CardContent>
          {valuations?.length ? valuations.map((v: any) => (
            <div key={v.id} className="flex justify-between p-2 border-b text-sm">
              <span>{v.properties?.type_label || v.property_id}</span>
              <span className="font-bold">{fmt(v.final_value || 0)} ج</span>
            </div>
          )) : (
            <div className="text-center py-8 text-muted-foreground text-sm">
              لا توجد تقييمات بعد — <Link to="/valuate" className="text-primary underline">ابدأ تقييم</Link>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-4 flex justify-between items-center gap-3">
          <div>
            <div className="font-semibold text-sm">📊 مؤشرات السوق الشاملة</div>
            <div className="text-xs text-muted-foreground">انتقلت إلى تبويب «المؤشرات ← السوق والأحياء ← السوق الشاملة» بإصدار موسَّع (7 محاور، 40+ مؤشر).</div>
          </div>
          <Link to="/indicators"><Button variant="outline" size="sm">فتح المؤشرات</Button></Link>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: any) {
  return (
    <Card>
      <CardContent className="p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Icon className="h-5 w-5 text-primary" />
        </div>
        <div>
          <div className="text-2xl font-bold">{value}</div>
          <div className="text-xs text-muted-foreground">{label}</div>
        </div>
      </CardContent>
    </Card>
  );
}
