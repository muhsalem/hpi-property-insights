import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Loader2 } from "lucide-react";
import { estimateAvm } from "@/lib/avm.functions";
import { fmt } from "@/lib/valuation";

interface Props {
  property: {
    area_sqm: number;
    rooms?: number;
    baths?: number;
    floor?: number;
    year_built?: number;
    finish?: string;
    type_label: string;
    base_price?: number;
  };
  districtName: string;
  basePricePerSqm: number;
  comparables?: Array<{ price: number; area_sqm: number; district?: string }>;
}

export default function AvmAiPanel({ property, districtName, basePricePerSqm, comparables }: Props) {
  const avm = useServerFn(estimateAvm);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const r = await avm({
        data: {
          area_sqm: property.area_sqm,
          rooms: property.rooms ?? 0,
          baths: property.baths ?? 0,
          floor: property.floor,
          year_built: property.year_built,
          finish: property.finish,
          type_label: property.type_label,
          district_name: districtName,
          base_price_per_sqm: basePricePerSqm,
          comparables: comparables?.slice(0, 10),
        },
      });
      if (r.success) setResult(r);
      else setError(r.error || "فشل التقدير");
    } catch (e: any) {
      setError(e.message || "خطأ في الاتصال");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" />
            AVM — تقييم بالذكاء الاصطناعي
          </CardTitle>
          <Button size="sm" onClick={run} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "احسب التقدير"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {error && <div className="text-sm text-destructive bg-destructive/10 p-3 rounded">{error}</div>}
        {!result && !loading && !error && (
          <p className="text-xs text-muted-foreground">
            نموذج Google Gemini يحلل المواصفات + المقارنات السوقية + خصائص الحي لتوليد تقدير سعري مع نطاق ثقة.
          </p>
        )}
        {result && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">الحد الأدنى</div>
                <div className="text-lg font-bold">{fmt(result.min_value)} ج</div>
              </div>
              <div className="text-center p-3 bg-primary/10 rounded border-2 border-primary">
                <div className="text-xs text-muted-foreground">القيمة المرجحة</div>
                <div className="text-xl font-bold text-primary">{fmt(result.estimated_value)} ج</div>
                <div className="text-[10px] mt-1">{fmt(result.price_per_sqm)} ج/م²</div>
              </div>
              <div className="text-center p-3 bg-muted rounded">
                <div className="text-xs text-muted-foreground">الحد الأقصى</div>
                <div className="text-lg font-bold">{fmt(result.max_value)} ج</div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={result.confidence >= 80 ? "default" : result.confidence >= 60 ? "secondary" : "destructive"}>
                درجة الثقة: {result.confidence}%
              </Badge>
              <span className="text-xs text-muted-foreground">
                ±{(((result.max_value - result.min_value) / 2 / result.estimated_value) * 100).toFixed(1)}%
              </span>
            </div>
            {result.reasoning && (
              <div className="text-xs p-3 bg-muted/50 rounded leading-relaxed">{result.reasoning}</div>
            )}
            {result.adjustments?.length > 0 && (
              <div>
                <div className="text-xs font-semibold mb-2">عوامل التعديل:</div>
                <div className="space-y-1">
                  {result.adjustments.map((a: any, i: number) => (
                    <div key={i} className="flex justify-between text-xs p-2 bg-muted/30 rounded">
                      <span className="font-medium">{a.factor}</span>
                      <span className={`font-mono ${a.impact_pct > 0 ? "text-green-600" : "text-red-600"}`}>
                        {a.impact_pct > 0 ? "+" : ""}{a.impact_pct}%
                      </span>
                      <span className="text-muted-foreground text-[10px] flex-1 mr-2">{a.reason}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
