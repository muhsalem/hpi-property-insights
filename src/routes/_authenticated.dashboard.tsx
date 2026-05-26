import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MapPin, TrendingUp, Plus } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { IndicatorsPanel } from "@/components/IndicatorsPanel";

export const Route = createFileRoute("/_authenticated/dashboard")({
  component: Dashboard,
});

function Dashboard() {
  const { data: stats } = useQuery({
    queryKey: ["dash-stats"],
    queryFn: async () => {
      const [a, p, t, v] = await Promise.all([
        supabase.from("areas").select("id", { count: "exact", head: true }),
        supabase.from("properties").select("id", { count: "exact", head: true }),
        supabase.from("transactions").select("id", { count: "exact", head: true }),
        supabase.from("valuations").select("id", { count: "exact", head: true }),
      ]);
      return { areas: a.count || 0, props: p.count || 0, txns: t.count || 0, vals: v.count || 0 };
    },
  });

  const { data: areas } = useQuery({
    queryKey: ["areas"],
    queryFn: async () => {
      const { data } = await supabase.from("areas").select("*, districts(name, color)").order("base_price", { ascending: false });
      return data || [];
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
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">لوحة التحكم</h1>
          <p className="text-sm text-muted-foreground">مرحباً بك في منصة التقييم العقاري</p>
        </div>
        <Link to="/valuate"><Button><Plus className="h-4 w-4 ml-1" />تقييم جديد</Button></Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard icon={MapPin} label="المناطق" value={stats?.areas || 0} />
        <StatCard icon={Building2} label="العقارات" value={stats?.props || 0} />
        <StatCard icon={TrendingUp} label="الصفقات" value={stats?.txns || 0} />
        <StatCard icon={Building2} label="تقييماتي" value={stats?.vals || 0} />
      </div>

      <div className="grid md:grid-cols-2 gap-4">
        <Card>
          <CardHeader><CardTitle className="text-base">مناطق بورسعيد ({areas?.length || 0})</CardTitle></CardHeader>
          <CardContent className="max-h-96 overflow-auto space-y-2">
            {areas?.map((a: any) => (
              <div key={a.id} className="flex justify-between items-center p-2 rounded border hover:bg-accent/50">
                <div>
                  <div className="font-medium text-sm">{a.name}</div>
                  <div className="text-xs text-muted-foreground">{a.districts?.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-sm">{fmt(a.base_price)} ج/م²</div>
                  <Badge variant={a.growth > 0.5 ? "default" : "secondary"} className="text-xs">+{(a.growth*100).toFixed(0)}%</Badge>
                </div>
              </div>
            ))}
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
      </div>

      <IndicatorsPanel />
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
