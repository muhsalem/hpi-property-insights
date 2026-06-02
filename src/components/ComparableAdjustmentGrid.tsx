import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Grid3x3 } from "lucide-react";

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

interface Comp {
  id: number;
  ref: string;
  price: number;
  area: number;
  timeAdj: number;   // % تعديل زمني
  locAdj: number;    // % موقع
  sizeAdj: number;   // % مساحة
  condAdj: number;   // % حالة/تشطيب
  floorAdj: number;  // % دور
  viewAdj: number;   // % إطلالة
}

interface Props {
  subjectArea: number;
}

/**
 * Comparable Adjustment Grid — USPAP SR1-4
 * جدول تعديلات المقارنات الست (Time, Location, Size, Condition, Floor, View)
 */
export default function ComparableAdjustmentGrid({ subjectArea }: Props) {
  const [comps, setComps] = useState<Comp[]>([
    { id: 1, ref: "C-1", price: 1750000, area: 135, timeAdj: 2, locAdj: 0, sizeAdj: -3, condAdj: -5, floorAdj: 1, viewAdj: 3 },
    { id: 2, ref: "C-2", price: 1500000, area: 110, timeAdj: 4, locAdj: 2, sizeAdj: 0, condAdj: 0, floorAdj: 0, viewAdj: 0 },
    { id: 3, ref: "C-3", price: 1300000, area: 95, timeAdj: 6, locAdj: -1, sizeAdj: 2, condAdj: 3, floorAdj: -2, viewAdj: -3 },
  ]);

  const add = () =>
    setComps([
      ...comps,
      { id: Date.now(), ref: `C-${comps.length + 1}`, price: 1500000, area: 110, timeAdj: 0, locAdj: 0, sizeAdj: 0, condAdj: 0, floorAdj: 0, viewAdj: 0 },
    ]);
  const remove = (id: number) => setComps(comps.filter((c) => c.id !== id));
  const update = (id: number, field: keyof Comp, value: any) =>
    setComps(comps.map((c) => (c.id === id ? { ...c, [field]: value } : c)));

  const rows = useMemo(() => {
    return comps.map((c) => {
      const totalAdj = c.timeAdj + c.locAdj + c.sizeAdj + c.condAdj + c.floorAdj + c.viewAdj;
      const grossAdj = Math.abs(c.timeAdj) + Math.abs(c.locAdj) + Math.abs(c.sizeAdj) + Math.abs(c.condAdj) + Math.abs(c.floorAdj) + Math.abs(c.viewAdj);
      const pricePerM2 = c.price / c.area;
      const adjPricePerM2 = pricePerM2 * (1 + totalAdj / 100);
      const indicatedValue = adjPricePerM2 * subjectArea;
      const reliability = grossAdj < 15 ? "عالية" : grossAdj < 30 ? "متوسطة" : "منخفضة";
      return { ...c, totalAdj, grossAdj, pricePerM2, adjPricePerM2, indicatedValue, reliability };
    });
  }, [comps, subjectArea]);

  // وزن مقلوب: المقارنة الأقل تعديلاً = وزن أعلى
  const totalInvWeight = rows.reduce((s, r) => s + 1 / Math.max(r.grossAdj, 1), 0);
  const weighted = rows.reduce((s, r) => s + r.indicatedValue * (1 / Math.max(r.grossAdj, 1)) / totalInvWeight, 0);

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3x3 className="h-5 w-5 text-primary" />
            جدول تعديلات المقارنات (Adjustment Grid · USPAP SR1-4)
          </CardTitle>
          <Button size="sm" onClick={add}><Plus className="h-3.5 w-3.5 ml-1" />مقارنة</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-1.5 text-right">المرجع</th>
                <th className="p-1.5 text-right">السعر</th>
                <th className="p-1.5">المساحة</th>
                <th className="p-1.5">سعر/م²</th>
                <th className="p-1.5 text-amber-600">زمن%</th>
                <th className="p-1.5 text-amber-600">موقع%</th>
                <th className="p-1.5 text-amber-600">مساحة%</th>
                <th className="p-1.5 text-amber-600">حالة%</th>
                <th className="p-1.5 text-amber-600">دور%</th>
                <th className="p-1.5 text-amber-600">إطلالة%</th>
                <th className="p-1.5 bg-primary/10">صافي%</th>
                <th className="p-1.5 bg-primary/10">إجمالي%</th>
                <th className="p-1.5 bg-primary/10">سعر معدّل/م²</th>
                <th className="p-1.5 bg-primary/10 text-primary">القيمة المؤشّرة</th>
                <th className="p-1.5">موثوقية</th>
                <th className="p-1.5"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-b hover:bg-muted/20">
                  <td className="p-1"><Input value={r.ref} onChange={(e) => update(r.id, "ref", e.target.value)} className="h-7 text-[11px] w-14" /></td>
                  <td className="p-1"><Input type="number" value={r.price} onChange={(e) => update(r.id, "price", +e.target.value)} className="h-7 text-[11px] w-24" /></td>
                  <td className="p-1"><Input type="number" value={r.area} onChange={(e) => update(r.id, "area", +e.target.value)} className="h-7 text-[11px] w-16" /></td>
                  <td className="p-1 text-center font-mono">{fmt(r.pricePerM2)}</td>
                  {(["timeAdj", "locAdj", "sizeAdj", "condAdj", "floorAdj", "viewAdj"] as const).map((f) => (
                    <td key={f} className="p-1"><Input type="number" value={(r as any)[f]} onChange={(e) => update(r.id, f, +e.target.value)} className="h-7 text-[11px] w-14" /></td>
                  ))}
                  <td className={`p-1 text-center font-bold ${r.totalAdj > 0 ? "text-green-600" : r.totalAdj < 0 ? "text-red-600" : ""}`}>{r.totalAdj > 0 ? "+" : ""}{r.totalAdj}</td>
                  <td className="p-1 text-center font-mono">{r.grossAdj}</td>
                  <td className="p-1 text-center font-mono font-bold">{fmt(r.adjPricePerM2)}</td>
                  <td className="p-1 text-center font-bold text-primary">{fmt(r.indicatedValue)}</td>
                  <td className="p-1 text-center">
                    <Badge variant={r.reliability === "عالية" ? "default" : r.reliability === "متوسطة" ? "secondary" : "destructive"} className="text-[9px]">
                      {r.reliability}
                    </Badge>
                  </td>
                  <td className="p-1"><Button size="icon" variant="ghost" onClick={() => remove(r.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div className="rounded border p-3 bg-muted/30 text-center">
            <div className="text-[10px] text-muted-foreground">عدد المقارنات</div>
            <div className="text-base font-bold">{rows.length}</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">متوسط التعديل الإجمالي</div>
            <div className="text-base font-bold">{(rows.reduce((s, r) => s + r.grossAdj, 0) / rows.length).toFixed(1)}%</div>
          </div>
          <div className="rounded border-2 border-primary p-3 bg-primary/5 text-center">
            <div className="text-[10px] text-muted-foreground">القيمة بطريقة المقارنة (مرجّحة)</div>
            <div className="text-lg font-bold text-primary">{fmt(weighted)} ج</div>
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground p-2 bg-muted/20 rounded">
          <b>منهجية الترجيح:</b> يتم ترجيح المقارنات عكسياً مع إجمالي التعديلات — المقارنة الأقل تعديلاً (الأقرب للعقار محل التقييم) تحصل على وزن أعلى.
        </div>
      </CardContent>
    </Card>
  );
}
