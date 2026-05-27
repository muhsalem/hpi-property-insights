import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { MapPin, TrendingUp, Building2, ChevronLeft, Layers } from "lucide-react";
import { fmt } from "@/lib/valuation";

export const Route = createFileRoute("/_authenticated/neighborhoods")({
  component: Neighborhoods,
});

function Neighborhoods() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-hierarchy"],
    queryFn: async () => {
      const [cities, districts, areas, props] = await Promise.all([
        supabase.from("cities").select("*").order("name"),
        supabase.from("districts").select("*").order("name"),
        supabase.from("areas").select("*").order("base_price", { ascending: false }),
        supabase.from("properties").select("id, area_id, type_label, base_price, area_sqm, rooms"),
      ]);
      return {
        cities: cities.data || [],
        districts: districts.data || [],
        areas: areas.data || [],
        props: props.data || [],
      };
    },
  });

  if (isLoading || !data) return <div className="text-center py-12 text-muted-foreground">جارٍ التحميل…</div>;

  const { cities, districts, areas, props } = data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Layers className="h-6 w-6 text-primary" />
          التقسيم الإداري — محافظة بورسعيد
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {cities.length} مدن · {districts.length} حي · {areas.length} منطقة سكنية
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {cities.map((city: any) => {
          const cityDistricts = districts.filter((d: any) => d.city_ref === city.id || d.city_id === city.id);
          const cityAreaIds = areas.filter((a: any) => cityDistricts.some((d: any) => d.id === a.district_id)).map((a: any) => a.id);
          const cityPropsCount = props.filter((p: any) => cityAreaIds.includes(p.area_id)).length;

          return (
            <Card key={city.id} className="overflow-hidden">
              <CardHeader className="pb-3" style={{ borderBottom: `4px solid ${city.color || "#888"}` }}>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5" style={{ color: city.color }} />
                      مدينة {city.name}
                    </CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">{city.governorate}</p>
                  </div>
                  <div className="text-right text-xs">
                    <Badge variant="outline">{cityDistricts.length} حي</Badge>
                    <div className="text-muted-foreground mt-1">
                      {cityAreaIds.length} منطقة · {cityPropsCount} عقار
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-3">
                <Accordion type="multiple" className="w-full">
                  {cityDistricts.map((d: any) => {
                    const dAreas = areas.filter((a: any) => a.district_id === d.id);
                    const avgPrice = dAreas.length
                      ? dAreas.reduce((s: number, a: any) => s + Number(a.base_price), 0) / dAreas.length
                      : 0;
                    return (
                      <AccordionItem key={d.id} value={d.id}>
                        <AccordionTrigger className="text-sm hover:no-underline">
                          <div className="flex items-center gap-2 w-full">
                            <span
                              className="w-2 h-2 rounded-full"
                              style={{ background: d.color || "#888" }}
                            />
                            <span className="font-semibold">{d.name}</span>
                            <Badge variant="secondary" className="mr-auto text-xs">
                              {dAreas.length} منطقة
                            </Badge>
                            <span className="text-xs text-muted-foreground">
                              متوسط {fmt(Math.round(avgPrice))} ج/م²
                            </span>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent>
                          <div className="space-y-1 pr-4">
                            {dAreas.map((a: any) => {
                              const aProps = props.filter((p: any) => p.area_id === a.id);
                              return (
                                <div
                                  key={a.id}
                                  className="flex justify-between items-center text-xs py-2 px-2 rounded hover:bg-accent border-r-2"
                                  style={{ borderColor: d.color || "#888" }}
                                >
                                  <div className="flex items-center gap-2">
                                    <Building2 className="h-3 w-3 text-muted-foreground" />
                                    <span className="font-medium">{a.name}</span>
                                    {aProps.length > 0 && (
                                      <Badge variant="outline" className="text-[10px]">
                                        {aProps.length} عقار
                                      </Badge>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-3 text-muted-foreground">
                                    <span>{fmt(a.base_price)} ج/م²</span>
                                    <Badge
                                      variant={Number(a.growth) > 0.05 ? "default" : "secondary"}
                                      className="text-[10px]"
                                    >
                                      <TrendingUp className="h-2.5 w-2.5 ml-0.5" />
                                      +{(Number(a.growth) * 100).toFixed(0)}%
                                    </Badge>
                                  </div>
                                </div>
                              );
                            })}
                            {dAreas.length === 0 && (
                              <div className="text-center text-xs text-muted-foreground py-3">
                                لا توجد مناطق بعد
                              </div>
                            )}
                          </div>
                        </AccordionContent>
                      </AccordionItem>
                    );
                  })}
                </Accordion>

                <Link to="/valuate" className="block mt-3">
                  <Button variant="outline" size="sm" className="w-full">
                    تقييم وحدة في مدينة {city.name} <ChevronLeft className="h-3 w-3 mr-1" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
