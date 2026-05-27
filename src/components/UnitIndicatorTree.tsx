import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { TreePine, Home, DollarSign, TrendingUp, Building, MapPin, Shield, Gauge, Activity, Scale, BarChart3 } from "lucide-react";
import { computeUnitIndicators, indicatorsHealthScore } from "@/lib/unit-indicators";

const COLOR = { good: "#1D9E75", warn: "#EF9F27", bad: "#D85A30", neutral: "#185FA5" } as const;
const ICONS: Record<string, any> = {
  phys: Home, cond: Building, val: DollarSign, roi: TrendingUp,
  loc: MapPin, mkt: BarChart3, macro: Activity, risk: Shield, sust: Gauge, legal: Scale,
};

export function UnitIndicatorTree({ prop, area, txns = [] }: { prop: any; area: any; txns?: any[] }) {
  const tree = useMemo(() => computeUnitIndicators(prop, area, txns), [prop, area, txns]);
  const totalNodes = tree.reduce((s, b) => s + b.nodes.length, 0);
  const goodCount = tree.reduce((s, b) => s + b.nodes.filter(n => n.status === "good").length, 0);
  const badCount = tree.reduce((s, b) => s + b.nodes.filter(n => n.status === "bad").length, 0);
  const healthScore = indicatorsHealthScore(tree);
  const fmtVal = (v: string | number) => typeof v === "number" ? new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 }).format(v) : v;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <TreePine className="h-5 w-5 text-primary" />
            شجرة مؤشرات تقييم الوحدة — Real Estate Valuation Indicators
          </CardTitle>
          <div className="text-left">
            <div className="text-[10px] text-muted-foreground">صحة الوحدة</div>
            <div className="text-2xl font-bold" style={{ color: healthScore >= 60 ? COLOR.good : healthScore >= 35 ? COLOR.warn : COLOR.bad }}>
              {healthScore}%
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tree.length} محاور · {totalNodes} مؤشر · ✓ {goodCount} إيجابي · ✗ {badCount} سلبي
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["phys", "val", "roi"]} className="w-full">
          {tree.map((branch) => {
            const Icon = ICONS[branch.key] || Gauge;
            const goods = branch.nodes.filter(n => n.status === "good").length;
            const bads = branch.nodes.filter(n => n.status === "bad").length;
            return (
              <AccordionItem key={branch.key} value={branch.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="h-4 w-4" style={{ color: branch.color }} />
                    <div className="flex-1 text-right">
                      <div className="font-semibold text-sm">{branch.ar}</div>
                      <div className="text-[10px] text-muted-foreground">{branch.en}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{branch.nodes.length}</Badge>
                    {goods > 0 && <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">✓ {goods}</Badge>}
                    {bads > 0 && <Badge className="text-[10px] bg-red-100 text-red-800 hover:bg-red-100">✗ {bads}</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-r-2 pr-3 mr-2 space-y-1.5" style={{ borderColor: branch.color }}>
                    {branch.nodes.map((n) => (
                      <div key={n.code} className="flex items-start justify-between py-1.5 px-2 rounded hover:bg-accent text-xs">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-muted-foreground">{n.code}</span>
                            <span className="font-medium">{n.ar}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{n.en}{n.hint ? ` — ${n.hint}` : ""}</div>
                        </div>
                        <div className="text-left whitespace-nowrap">
                          <span className="font-bold" style={{ color: n.status ? COLOR[n.status] : COLOR.neutral }}>
                            {fmtVal(n.value)}
                          </span>
                          {n.unit && <span className="text-[10px] text-muted-foreground mr-1"> {n.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
