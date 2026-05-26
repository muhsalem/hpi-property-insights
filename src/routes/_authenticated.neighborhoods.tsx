import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MapPin, TrendingUp, Building, ChevronLeft } from "lucide-react";
import { fmt } from "@/lib/valuation";

export const Route = createFileRoute("/_authenticated/neighborhoods")({
  component: Neighborhoods,
});

function Neighborhoods() {
  const { data: hoods, isLoading } = useQuery({
    queryKey: ["hoods-full"],
    queryFn: async () => {
      const { data: areas } = await supabase
        .from("areas")
        .select("*, districts(name, color, city_name)")
        .order("base_price", { ascending: false });
      const { data: props } = await supabase
        .from("properties")
        .select("id, area_id, type_label, category, base_price, area_sqm, rooms");
      return (areas || []).map((a: any) => {
        const items = (props || []).filter((p: any) => p.area_id === a.id);
        const byType = items.reduce((acc: Record<string, any[]>, p: any) => {
          (acc[p.type_label] ||= []).push(p);
          return acc;
        }, {});
        return { ...a, items, byType };
      });
    },
  });

  if (isLoading) return <div className="text-center py-12 text-muted-foreground">جارٍ التحميل…</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">الأحياء</h1>
        <p className="text-sm text-muted-foreground">
          نظرة شاملة على {hoods?.length || 0} أحياء — كل حي يضم تشكيلة من العقارات السكنية والتجارية والصناعية.
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {hoods?.map((h: any) => (
          <Card key={h.id} className="overflow-hidden">
            <CardHeader className="pb-3" style={{ borderBottom: `3px solid ${h.districts?.color || "#888"}` }}>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" style={{ color: h.districts?.color }} />
                    {h.name}
                  </CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">{h.districts?.city_name}</p>
                </div>
                <div className="text-right">
                  <div className="font-bold text-base">{fmt(h.base_price)} ج/م²</div>
                  <Badge variant={h.growth > 0.5 ? "default" : "secondary"} className="text-xs mt-1">
                    <TrendingUp className="h-3 w-3 ml-1" />+{(h.growth * 100).toFixed(0)}%
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-3 space-y-3">
              <div className="grid grid-cols-4 gap-2 text-center text-xs">
                <Stat label="بنية" v={h.infra_rating} />
                <Stat label="أمان" v={h.safety_rating} />
                <Stat label="خدمات" v={h.services_rating} />
                <Stat label="مواصلات" v={h.transport_rating} />
              </div>

              <div>
                <div className="flex items-center gap-2 mb-2 text-sm font-semibold">
                  <Building className="h-4 w-4" />
                  العقارات المطروحة ({h.items.length})
                </div>
                <div className="space-y-2 max-h-72 overflow-auto">
                  {Object.entries(h.byType).map(([type, list]: any) => (
                    <div key={type} className="border rounded-md p-2">
                      <div className="flex justify-between items-center text-xs font-medium mb-1">
                        <span>{type}</span>
                        <Badge variant="outline">{list.length}</Badge>
                      </div>
                      <div className="space-y-1">
                        {list.map((p: any) => (
                          <Link
                            key={p.id}
                            to="/property/$id"
                            params={{ id: p.id }}
                            className="flex justify-between items-center text-xs hover:bg-accent rounded px-2 py-1"
                          >
                            <span className="text-muted-foreground">
                              {p.area_sqm} م² {p.rooms ? `· ${p.rooms} غ` : ""}
                            </span>
                            <span className="font-medium">{fmt(p.base_price)} ج</span>
                          </Link>
                        ))}
                      </div>
                    </div>
                  ))}
                  {h.items.length === 0 && (
                    <div className="text-center text-xs text-muted-foreground py-4">لا توجد عقارات بعد</div>
                  )}
                </div>
              </div>

              <Link to="/valuate" className="block">
                <Button variant="outline" size="sm" className="w-full">
                  تقييم وحدة في هذا الحي <ChevronLeft className="h-3 w-3 mr-1" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function Stat({ label, v }: { label: string; v: number | null }) {
  return (
    <div className="bg-muted rounded p-1.5">
      <div className="text-muted-foreground">{label}</div>
      <div className="font-bold">{v ?? "—"}/10</div>
    </div>
  );
}
