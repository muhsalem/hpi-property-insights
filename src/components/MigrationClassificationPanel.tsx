import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, TrendingUp, TrendingDown, Minus } from "lucide-react";

type MigClass = "هجرة وافدة قوية" | "هجرة وافدة معتدلة" | "متوازن" | "هجرة نازحة معتدلة" | "هجرة نازحة قوية";

function classify(netMig: number, growth: number): { label: MigClass; color: string; icon: any; impact: string } {
  const score = (netMig ?? 0) * 0.6 + (growth ?? 0) * 100 * 0.4;
  if (score >= 1.5) return { label: "هجرة وافدة قوية", color: "bg-emerald-600", icon: TrendingUp, impact: "+8% إلى +15% ضغط طلب → ارتفاع أسعار متوقع" };
  if (score >= 0.5) return { label: "هجرة وافدة معتدلة", color: "bg-emerald-400", icon: TrendingUp, impact: "+3% إلى +7% طلب مستقر صاعد" };
  if (score >= -0.5) return { label: "متوازن", color: "bg-slate-400", icon: Minus, impact: "استقرار نسبي في الأسعار" };
  if (score >= -1.5) return { label: "هجرة نازحة معتدلة", color: "bg-amber-500", icon: TrendingDown, impact: "−3% إلى −6% تباطؤ في الطلب" };
  return { label: "هجرة نازحة قوية", color: "bg-red-600", icon: TrendingDown, impact: "−7% إلى −12% ضغط هابط على الأسعار" };
}

export default function MigrationClassificationPanel() {
  const { data: districts } = useQuery({
    queryKey: ["mig-districts"],
    queryFn: async () => (await supabase.from("districts").select("*").order("net_migration", { ascending: false })).data || [],
  });

  if (!districts) return <div className="text-center py-8 text-muted-foreground">جاري التحميل...</div>;

  const ranked = districts.map((d: any) => ({ ...d, ...classify(Number(d.net_migration || 0), Number(d.growth_rate || 0)) }));

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          تصنيف الهجرة الديموغرافية للأحياء
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          تصنيف مبني على صافي الهجرة (net_migration) ومعدل النمو السكاني — يحدد اتجاه الطلب العقاري
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {ranked.map((d: any) => {
            const Icon = d.icon;
            return (
              <div key={d.id} className="flex items-center gap-3 p-3 border rounded-lg">
                <div className={`p-2 rounded-full ${d.color} text-white`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{d.name}</span>
                    <Badge variant="outline" className="text-[10px]">{d.label}</Badge>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1">
                    صافي الهجرة: <b>{Number(d.net_migration || 0).toFixed(2)}</b> ‏· نمو: <b>{((d.growth_rate || 0) * 100).toFixed(1)}%</b>
                  </div>
                  <div className="text-[11px] text-primary mt-1">{d.impact}</div>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
