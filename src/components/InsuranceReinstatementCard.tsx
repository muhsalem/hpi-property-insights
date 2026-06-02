import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Shield } from "lucide-react";
import { fmt } from "@/lib/valuation";

// RICS VPGA 9 — Reinstatement Cost for Insurance Purposes
export default function InsuranceReinstatementCard() {
  const [area, setArea] = useState(110);
  const [rate, setRate] = useState(8000); // ج/م² تكلفة إنشاء جديدة
  const [demolition, setDemolition] = useState(15); // % إزالة وردم
  const [professional, setProfessional] = useState(10); // % أتعاب مهنية
  const [inflation, setInflation] = useState(12); // % احتياطي تضخم خلال البناء

  const buildingCost = area * rate;
  const demoCost = buildingCost * (demolition / 100);
  const profCost = buildingCost * (professional / 100);
  const subtotal = buildingCost + demoCost + profCost;
  const inflBuffer = subtotal * (inflation / 100);
  const total = subtotal + inflBuffer;

  return (
    <Card dir="rtl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5 text-primary" />
          تكلفة الاستبدال التأمينية (Reinstatement Cost)
        </CardTitle>
        <p className="text-xs text-muted-foreground">RICS VPGA 9 — قيمة إعادة بناء العقار لأغراض التأمين</p>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid md:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">المساحة (م²)</Label>
            <Input type="number" value={area} onChange={(e) => setArea(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">تكلفة الإنشاء (ج/م²)</Label>
            <Input type="number" value={rate} onChange={(e) => setRate(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">إزالة وردم %</Label>
            <Input type="number" value={demolition} onChange={(e) => setDemolition(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">أتعاب مهنية %</Label>
            <Input type="number" value={professional} onChange={(e) => setProfessional(+e.target.value || 0)} />
          </div>
          <div>
            <Label className="text-xs">احتياطي تضخم %</Label>
            <Input type="number" value={inflation} onChange={(e) => setInflation(+e.target.value || 0)} />
          </div>
        </div>

        <div className="space-y-1 text-sm pt-2 border-t">
          <Row label="تكلفة البناء الجديد" v={buildingCost} />
          <Row label="إزالة وردم" v={demoCost} />
          <Row label="أتعاب مهنية واستشارية" v={profCost} />
          <Row label="احتياطي تضخم خلال فترة البناء" v={inflBuffer} />
        </div>

        <div className="p-3 rounded bg-primary/10 flex items-center justify-between">
          <span className="text-sm font-bold">القيمة التأمينية الإجمالية</span>
          <span className="text-lg font-bold text-primary">{fmt(total)} ج.م</span>
        </div>
      </CardContent>
    </Card>
  );
}

function Row({ label, v }: { label: string; v: number }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{fmt(v)} ج.م</span>
    </div>
  );
}
