import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Scale } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

interface Props {
  marketValue?: number;
  costValue?: number;
  incomeValue?: number;
}

/**
 * Reconciliation Matrix — IVS 105 §80
 * توفيق نتائج طرق التقييم الثلاث بأوزان مبررة + تبرير نصي
 */
export default function ReconciliationMatrix({
  marketValue = 0,
  costValue = 0,
  incomeValue = 0,
}: Props) {
  const [mv, setMv] = useState(marketValue || 1650000);
  const [cv, setCv] = useState(costValue || 1480000);
  const [iv, setIv] = useState(incomeValue || 1580000);

  const [wMarket, setWMarket] = useState(50);
  const [wCost, setWCost] = useState(20);
  const [wIncome, setWIncome] = useState(30);

  const [justification, setJustification] = useState(
    "تم إعطاء وزن أعلى لطريقة المقارنات السوقية لتوفر معاملات حديثة موثقة في نفس الحي. طريقة التكلفة استخدمت كمرجعية للحد الأدنى. طريقة الدخل ذات وزن متوسط نظراً لاستقرار سوق الإيجارات."
  );

  const total = wMarket + wCost + wIncome;
  const final = useMemo(() => {
    if (total === 0) return 0;
    return (mv * wMarket + cv * wCost + iv * wIncome) / total;
  }, [mv, cv, iv, wMarket, wCost, wIncome, total]);

  const values = [mv, cv, iv].filter((v) => v > 0);
  const spread = values.length > 1 ? ((Math.max(...values) - Math.min(...values)) / final) * 100 : 0;
  const consistency = spread < 10 ? "ممتاز" : spread < 20 ? "جيد" : spread < 30 ? "مقبول" : "ضعيف";
  const consistencyColor =
    spread < 10 ? "bg-green-600" : spread < 20 ? "bg-blue-600" : spread < 30 ? "bg-amber-600" : "bg-red-600";

  const Row = ({
    label,
    value,
    setValue,
    weight,
    setWeight,
    color,
  }: any) => (
    <div className="grid grid-cols-12 gap-2 items-center p-2 border rounded">
      <div className="col-span-3">
        <div className="text-xs font-semibold">{label}</div>
        <div className={`text-[10px] ${color}`}>المساهمة: {fmt((value * weight) / (total || 1))} ج</div>
      </div>
      <div className="col-span-3">
        <Input
          type="number"
          value={value}
          onChange={(e) => setValue(+e.target.value)}
          className="h-8 text-xs"
        />
      </div>
      <div className="col-span-5">
        <Slider value={[weight]} max={100} step={5} onValueChange={(v) => setWeight(v[0])} />
      </div>
      <div className="col-span-1 text-center font-bold text-sm">{weight}%</div>
    </div>
  );

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Scale className="h-5 w-5 text-primary" />
          مصفوفة توفيق النتائج (Reconciliation Matrix · IVS 105)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="space-y-2">
          <Row label="Market Approach (المقارنات)" value={mv} setValue={setMv} weight={wMarket} setWeight={setWMarket} color="text-blue-600" />
          <Row label="Cost Approach (التكلفة)" value={cv} setValue={setCv} weight={wCost} setWeight={setWCost} color="text-orange-600" />
          <Row label="Income Approach (الدخل)" value={iv} setValue={setIv} weight={wIncome} setWeight={setWIncome} color="text-green-600" />
        </div>

        {total !== 100 && (
          <div className="text-xs p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-700">
            ⚠️ مجموع الأوزان = {total}% (يُفضل أن يكون 100%)
          </div>
        )}

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border p-3 bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">تشتت النتائج</div>
            <div className="text-base font-bold">{spread.toFixed(1)}%</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">درجة الاتساق</div>
            <Badge className={`${consistencyColor} text-white mt-1`}>{consistency}</Badge>
          </div>
          <div className="rounded border-2 border-primary p-3 bg-primary/5 text-center">
            <div className="text-[10px] text-muted-foreground">القيمة النهائية المرجحة</div>
            <div className="text-lg font-bold text-primary">{fmt(final)} ج</div>
          </div>
        </div>

        <div>
          <Label className="text-xs">تبرير الأوزان (إلزامي — IVS 103 §50)</Label>
          <Textarea
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            rows={3}
            className="text-xs mt-1"
          />
        </div>
      </CardContent>
    </Card>
  );
}
