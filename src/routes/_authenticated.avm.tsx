import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { runAVM } from "@/lib/avm.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Brain, Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";
import { fmt } from "@/lib/valuation";

export const Route = createFileRoute("/_authenticated/avm")({ component: AVMPage });

function AVMPage() {
  const { data: areas } = useQuery({
    queryKey: ["avm-areas"],
    queryFn: async () => (await supabase.from("areas").select("id, name, base_price, districts(name, city_name)").order("name")).data || [],
  });

  const avm = useServerFn(runAVM);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const [form, setForm] = useState({
    area_id: "",
    area_sqm: 120,
    rooms: 3,
    baths: 2,
    floor: 3,
    year_built: 2015,
    building_type: "APT",
    category: "res",
    finish: "نص تشطيب",
    view: "شارع رئيسي",
  });

  async function handleRun() {
    setError(null);
    setResult(null);
    if (!form.area_id) {
      setError("اختر المنطقة أولاً");
      return;
    }
    setLoading(true);
    try {
      const res = await avm({ data: form });
      if (res.error) setError(res.error);
      else setResult(res);
    } catch (e: any) {
      setError(e?.message || "فشل التشغيل");
    } finally {
      setLoading(false);
    }
  }

  const signalIcon = result?.result?.market_signal === "bullish" ? <TrendingUp className="h-4 w-4 text-green-600" /> :
    result?.result?.market_signal === "bearish" ? <TrendingDown className="h-4 w-4 text-red-600" /> : null;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Brain className="h-6 w-6 text-primary" />
          AVM — نموذج التقييم الآلي بالذكاء الاصطناعي
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          تقييم فوري للعقار باستخدام تحليل المعاملات المماثلة + نموذج لغوي كبير + بيانات السوق المحلية
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              بيانات العقار
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-xs">المنطقة</Label>
              <Select value={form.area_id} onValueChange={(v) => setForm({ ...form, area_id: v })}>
                <SelectTrigger><SelectValue placeholder="اختر منطقة سكنية" /></SelectTrigger>
                <SelectContent>
                  {areas?.map((a: any) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.name} — {a.districts?.name} ({fmt(a.base_price)} ج/م²)
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <Field label="المساحة (م²)" value={form.area_sqm} onChange={(v) => setForm({ ...form, area_sqm: +v })} />
              <Field label="الدور" value={form.floor} onChange={(v) => setForm({ ...form, floor: +v })} />
              <Field label="الغرف" value={form.rooms} onChange={(v) => setForm({ ...form, rooms: +v })} />
              <Field label="الحمامات" value={form.baths} onChange={(v) => setForm({ ...form, baths: +v })} />
              <Field label="سنة البناء" value={form.year_built} onChange={(v) => setForm({ ...form, year_built: +v })} />
              <div>
                <Label className="text-xs">نوع المبنى</Label>
                <Select value={form.building_type} onValueChange={(v) => setForm({ ...form, building_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="APT">شقة</SelectItem>
                    <SelectItem value="TWR">برج</SelectItem>
                    <SelectItem value="VIL">فيلا</SelectItem>
                    <SelectItem value="DPX">دوبلكس</SelectItem>
                    <SelectItem value="COM">تجاري</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">التشطيب</Label>
                <Select value={form.finish} onValueChange={(v) => setForm({ ...form, finish: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="سوبر لوكس">سوبر لوكس</SelectItem>
                    <SelectItem value="لوكس">لوكس</SelectItem>
                    <SelectItem value="نص تشطيب">نص تشطيب</SelectItem>
                    <SelectItem value="عظم">عظم</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">الإطلالة</Label>
                <Select value={form.view} onValueChange={(v) => setForm({ ...form, view: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="بحري">بحري مباشر</SelectItem>
                    <SelectItem value="جزء بحري">جزء بحري</SelectItem>
                    <SelectItem value="شارع رئيسي">شارع رئيسي</SelectItem>
                    <SelectItem value="شارع جانبي">شارع جانبي</SelectItem>
                    <SelectItem value="داخلي">داخلي</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleRun} disabled={loading} className="w-full">
              {loading ? (<><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ التقييم بالذكاء الاصطناعي…</>) : (<><Brain className="h-4 w-4 ml-2" />شغّل AVM</>)}
            </Button>
            {error && <div className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</div>}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">نتيجة التقييم</CardTitle>
          </CardHeader>
          <CardContent>
            {!result && !loading && (
              <div className="text-center text-muted-foreground text-sm py-12">
                املأ البيانات واضغط "شغّل AVM" للحصول على تقييم فوري
              </div>
            )}
            {loading && (
              <div className="text-center py-12">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="text-sm mt-3 text-muted-foreground">يحلل النموذج {result?.meta?.comps_used || "—"} عقاراً مماثلاً…</div>
              </div>
            )}
            {result?.result && (
              <div className="space-y-4">
                <div className="text-center bg-primary/5 border border-primary/20 rounded-lg p-4">
                  <div className="text-xs text-muted-foreground">القيمة التقديرية</div>
                  <div className="text-3xl font-bold text-primary mt-1">{fmt(result.result.estimated_value)} ج.م</div>
                  <div className="text-xs text-muted-foreground mt-1">{fmt(result.result.price_per_sqm)} ج.م/م²</div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span>هامش الثقة: {result.result.confidence_pct}%</span>
                    <span className="text-muted-foreground">{fmt(result.result.confidence_low)} — {fmt(result.result.confidence_high)} ج.م</span>
                  </div>
                  <Progress value={result.result.confidence_pct} className="h-2" />
                </div>

                <div className="flex items-center gap-2 text-sm">
                  {signalIcon}
                  <span className="font-medium">إشارة السوق:</span>
                  <Badge variant={result.result.market_signal === "bullish" ? "default" : result.result.market_signal === "bearish" ? "destructive" : "secondary"}>
                    {result.result.market_signal === "bullish" ? "صاعد" : result.result.market_signal === "bearish" ? "هابط" : "محايد"}
                  </Badge>
                </div>

                <div className="text-xs bg-muted p-3 rounded">
                  <div className="font-semibold mb-1">المنهجية</div>
                  <p className="text-muted-foreground">{result.result.methodology}</p>
                </div>

                {result.result.key_adjustments?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2">التعديلات الرئيسية</div>
                    <div className="space-y-1">
                      {result.result.key_adjustments.map((adj: any, i: number) => (
                        <div key={i} className="flex justify-between items-center text-xs border rounded px-2 py-1.5">
                          <div>
                            <div className="font-medium">{adj.factor}</div>
                            <div className="text-muted-foreground">{adj.reason}</div>
                          </div>
                          <Badge variant={adj.impact_pct > 0 ? "default" : "destructive"} className="text-[10px]">
                            {adj.impact_pct > 0 ? "+" : ""}{adj.impact_pct}%
                          </Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {result.result.risk_factors?.length > 0 && (
                  <div>
                    <div className="text-xs font-semibold mb-2 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3 text-orange-500" />
                      عوامل المخاطرة
                    </div>
                    <ul className="text-xs text-muted-foreground space-y-1">
                      {result.result.risk_factors.map((r: string, i: number) => (<li key={i}>• {r}</li>))}
                    </ul>
                  </div>
                )}

                <div className="text-xs bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-900 p-3 rounded">
                  <div className="font-semibold flex items-center gap-1 mb-1">
                    <CheckCircle2 className="h-3 w-3 text-green-600" />
                    التوصية
                  </div>
                  <p>{result.result.recommendation}</p>
                </div>

                <div className="text-[10px] text-muted-foreground border-t pt-2">
                  استُند إلى {result.meta?.comps_used} عقار مماثل · متوسط المنطقة {fmt(result.meta?.area_avg_price)} ج/م²
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: number; onChange: (v: string) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
