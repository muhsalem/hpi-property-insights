import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Gavel } from "lucide-react";
import { fmt, pct } from "@/lib/valuation";

// IVS 104 §170 — Forced Sale Value (Liquidation Value)
export default function ForcedSaleValueCard() {
  const [mv, setMv] = useState(5_000_000);
  const [discount, setDiscount] = useState(25); // % خصم الإكراه
  const [marketingDays, setMarketingDays] = useState(90); // أيام تسويق قسرية

  const timeFactor = Math.max(0, (180 - marketingDays) / 180) * 0.10; // كلما قلّ الوقت زاد الخصم
  const totalDiscount = discount / 100 + timeFactor;
  const fsv = mv * (1 - totalDiscount);
  const loss = mv - fsv;

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Gavel className="h-5 w-5 text-destructive" />
          قيمة البيع الجبري (Forced Sale Value)
        </CardTitle>
        <p className="text-xs text-muted-foreground">IVS 104 §170 — قيمة التصفية في ظل إكراه زمني</p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">القيمة السوقية (MV)</Label>
            <Input type="number" value={mv} onChange={(e) => setMv(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">فترة التسويق المتاحة (أيام)</Label>
            <Input type="number" value={marketingDays} onChange={(e) => setMarketingDays(+e.target.value || 0)} />
          </div>
        </div>

        <div>
          <Label className="text-xs">نسبة خصم الإكراه الأساسية: {discount}%</Label>
          <Slider value={[discount]} onValueChange={(v) => setDiscount(v[0])} min={10} max={50} step={1} className="mt-2" />
        </div>

        <div className="grid grid-cols-3 gap-3 pt-3 border-t">
          <div className="p-3 rounded bg-muted/30">
            <div className="text-[11px] text-muted-foreground">إجمالي الخصم</div>
            <div className="text-lg font-bold text-destructive">{pct(totalDiscount)}</div>
          </div>
          <div className="p-3 rounded bg-destructive/10">
            <div className="text-[11px] text-muted-foreground">قيمة البيع الجبري</div>
            <div className="text-lg font-bold">{fmt(fsv)} ج.م</div>
          </div>
          <div className="p-3 rounded bg-muted/30">
            <div className="text-[11px] text-muted-foreground">الخسارة المتوقعة</div>
            <div className="text-lg font-bold text-amber-600">{fmt(loss)} ج.م</div>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground bg-amber-50 dark:bg-amber-950/20 p-2 rounded">
          ⚠️ تُستخدم هذه القيمة لأغراض الضمان البنكي والتنفيذ القضائي فقط، ولا تُعد بديلاً عن القيمة السوقية.
        </p>
      </CardContent>
    </Card>
  );
}
