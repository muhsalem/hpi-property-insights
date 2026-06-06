import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Building2, Plus, Trash2, Sparkles, Store } from "lucide-react";

/**
 * المبنى متعدد الوحدات — تحديد كل دور من الأرضي لآخر دور،
 * مع إمكانية اعتبار الأرضي محلات تجارية، واستنتاج سعر وحدة هدف
 * بناءً على مثيلاتها في الأدوار الأعلى مع تعديل التشطيب.
 */

const FINISH = [
  { label: "بدون", factor: 0.82 },
  { label: "نصف تشطيب", factor: 0.92 },
  { label: "تشطيب جيد", factor: 1.0 },
  { label: "سوبر لوكس", factor: 1.10 },
  { label: "فاخر", factor: 1.20 },
];
const finishFactor = (l: string) => FINISH.find((f) => f.label === l)?.factor ?? 1;

type Unit = {
  id: string;
  label: string;
  area: number;
  finish: string;
  price: number; // إجمالي سعر الوحدة (ج.م)
  isTarget?: boolean;
};
type Floor = {
  id: string;
  level: number; // 0 = أرضي
  isCommercial: boolean;
  units: Unit[];
};

const uid = () => Math.random().toString(36).slice(2, 9);
const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

function buildInitial(): Floor[] {
  return [
    {
      id: uid(), level: 0, isCommercial: true,
      units: [
        { id: uid(), label: "محل 1", area: 45, finish: "تشطيب جيد", price: 1800000 },
        { id: uid(), label: "محل 2", area: 35, finish: "تشطيب جيد", price: 1400000 },
      ],
    },
    {
      id: uid(), level: 1, isCommercial: false,
      units: [
        { id: uid(), label: "شقة 1", area: 110, finish: "نصف تشطيب", price: 0, isTarget: true },
        { id: uid(), label: "شقة 2", area: 110, finish: "سوبر لوكس", price: 1750000 },
      ],
    },
    {
      id: uid(), level: 2, isCommercial: false,
      units: [
        { id: uid(), label: "شقة 1", area: 110, finish: "تشطيب جيد", price: 1500000 },
        { id: uid(), label: "شقة 2", area: 110, finish: "تشطيب جيد", price: 1520000 },
      ],
    },
  ];
}

export default function BuildingFloorsPanel() {
  const [enabled, setEnabled] = useState(false);
  const [floors, setFloors] = useState<Floor[]>(buildInitial);
  // عوامل تعديل الأدوار
  const [floorPremiumPct, setFloorPremiumPct] = useState(1.5); // % لكل دور أعلى عن الهدف
  const [groundCommercialPremiumPct, setGroundCommercialPremiumPct] = useState(35); // % علاوة محلات أرضي

  const addFloor = () => {
    const next = (Math.max(...floors.map((f) => f.level)) ?? -1) + 1;
    setFloors([...floors, { id: uid(), level: next, isCommercial: false, units: [{ id: uid(), label: "شقة 1", area: 100, finish: "تشطيب جيد", price: 0 }] }]);
  };
  const removeFloor = (id: string) => setFloors(floors.filter((f) => f.id !== id));
  const updateFloor = (id: string, patch: Partial<Floor>) => setFloors(floors.map((f) => f.id === id ? { ...f, ...patch } : f));
  const addUnit = (fid: string) => updateFloor(fid, { units: [...floors.find(f=>f.id===fid)!.units, { id: uid(), label: `وحدة ${floors.find(f=>f.id===fid)!.units.length+1}`, area: 100, finish: "تشطيب جيد", price: 0 }] });
  const removeUnit = (fid: string, uidv: string) => {
    const f = floors.find(x=>x.id===fid)!;
    updateFloor(fid, { units: f.units.filter(u=>u.id!==uidv) });
  };
  const updateUnit = (fid: string, uidv: string, patch: Partial<Unit>) => {
    const f = floors.find(x=>x.id===fid)!;
    updateFloor(fid, { units: f.units.map(u => u.id===uidv ? { ...u, ...patch } : u) });
  };
  const setTarget = (fid: string, uidv: string) => {
    setFloors(floors.map(f => ({
      ...f,
      units: f.units.map(u => ({ ...u, isTarget: f.id===fid && u.id===uidv }))
    })));
  };

  // ابحث عن الوحدة الهدف
  const target = useMemo(() => {
    for (const f of floors) for (const u of f.units) if (u.isTarget) return { floor: f, unit: u };
    return null;
  }, [floors]);

  // استنتاج السعر من المثيلات في الأدوار الأعلى مع تعديل تشطيب وعلاوة دور
  const inference = useMemo(() => {
    if (!target) return null;
    const samples: { from: string; psqmRaw: number; psqmAdj: number; finishFx: number; floorAdj: number }[] = [];
    for (const f of floors) {
      if (f.id === target.floor.id) continue;
      if (f.isCommercial && !target.floor.isCommercial) continue; // لا نقارن محلات بشقة
      // فقط المثيلات في الأدوار الأعلى
      if (f.level <= target.floor.level) continue;
      for (const u of f.units) {
        if (!u.price || !u.area) continue;
        const psqm = u.price / u.area;
        // عَدِّل التشطيب: انقل سعر المثيل لتشطيب الهدف
        const finishFx = finishFactor(target.unit.finish) / finishFactor(u.finish);
        // عَدِّل الدور: كل دور أعلى = +floorPremiumPct%
        const dy = f.level - target.floor.level;
        const floorAdj = Math.pow(1 + floorPremiumPct / 100, -dy); // اخفض لو المثيل أعلى
        const psqmAdj = psqm * finishFx * floorAdj;
        samples.push({ from: `${f.level === 0 ? "أرضي" : `دور ${f.level}`} · ${u.label}`, psqmRaw: psqm, psqmAdj, finishFx, floorAdj });
      }
    }
    if (!samples.length) return { samples, avgPsqm: 0, total: 0 };
    const avgPsqm = samples.reduce((s, x) => s + x.psqmAdj, 0) / samples.length;
    let total = avgPsqm * target.unit.area;
    // علاوة محلات أرضي
    if (target.floor.isCommercial) total = total * (1 + groundCommercialPremiumPct / 100);
    return { samples, avgPsqm, total };
  }, [floors, target, floorPremiumPct, groundCommercialPremiumPct]);

  const applyInference = () => {
    if (!target || !inference) return;
    updateUnit(target.floor.id, target.unit.id, { price: Math.round(inference.total) });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <CardTitle className="text-base flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            المبنى متعدد الوحدات — استنتاج سعر الوحدة من مثيلاتها
          </CardTitle>
          <label className="flex items-center gap-2 text-xs">
            <span>تفعيل</span>
            <Switch checked={enabled} onCheckedChange={setEnabled} />
          </label>
        </div>
      </CardHeader>
      {enabled && (
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3 p-3 rounded bg-muted/30 border">
            <div>
              <Label className="text-xs">علاوة كل دور أعلى %</Label>
              <Input type="number" step="0.5" value={floorPremiumPct} onChange={(e)=>setFloorPremiumPct(+e.target.value)} />
            </div>
            <div>
              <Label className="text-xs">علاوة الأرضي التجاري % (محلات)</Label>
              <Input type="number" step="1" value={groundCommercialPremiumPct} onChange={(e)=>setGroundCommercialPremiumPct(+e.target.value)} />
            </div>
          </div>

          {floors.sort((a,b)=>a.level-b.level).map((f) => (
            <Card key={f.id} className={f.isCommercial ? "border-amber-300 bg-amber-50/40" : ""}>
              <CardContent className="p-3 space-y-2">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div className="flex items-center gap-2">
                    <Badge variant={f.level===0?"default":"secondary"}>{f.level===0?"الدور الأرضي":`دور ${f.level}`}</Badge>
                    <label className="flex items-center gap-1 text-xs">
                      <Store className="h-3.5 w-3.5" /> محلات تجارية
                      <Switch checked={f.isCommercial} onCheckedChange={(v)=>updateFloor(f.id,{isCommercial:v})} />
                    </label>
                  </div>
                  <div className="flex gap-1">
                    <Button size="sm" variant="outline" onClick={()=>addUnit(f.id)}><Plus className="h-3.5 w-3.5"/> وحدة</Button>
                    <Button size="sm" variant="ghost" onClick={()=>removeFloor(f.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                  </div>
                </div>
                {f.units.map((u) => (
                  <div key={u.id} className={`grid md:grid-cols-6 gap-2 items-end p-2 rounded border ${u.isTarget?"border-primary border-2 bg-primary/5":""}`}>
                    <div><Label className="text-[10px]">المسمى</Label><Input value={u.label} onChange={(e)=>updateUnit(f.id,u.id,{label:e.target.value})} /></div>
                    <div><Label className="text-[10px]">المساحة م²</Label><Input type="number" value={u.area} onChange={(e)=>updateUnit(f.id,u.id,{area:+e.target.value})} /></div>
                    <div><Label className="text-[10px]">التشطيب</Label>
                      <Select value={u.finish} onValueChange={(v)=>updateUnit(f.id,u.id,{finish:v})}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>{FINISH.map(x=><SelectItem key={x.label} value={x.label}>{x.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div><Label className="text-[10px]">السعر (ج.م)</Label><Input type="number" value={u.price} onChange={(e)=>updateUnit(f.id,u.id,{price:+e.target.value})} /></div>
                    <div className="text-[10px] text-muted-foreground">
                      {u.area>0 && u.price>0 ? `${fmt(u.price/u.area)} ج/م²` : "—"}
                    </div>
                    <div className="flex gap-1">
                      <Button size="sm" variant={u.isTarget?"default":"outline"} onClick={()=>setTarget(f.id,u.id)}>هدف</Button>
                      <Button size="sm" variant="ghost" onClick={()=>removeUnit(f.id,u.id)}><Trash2 className="h-3.5 w-3.5 text-destructive"/></Button>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          ))}

          <Button variant="outline" onClick={addFloor}><Plus className="h-4 w-4 ml-1"/> إضافة دور</Button>

          {/* استنتاج السعر */}
          {target && (
            <Card className="border-primary bg-primary/5">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary"/>
                  استنتاج سعر الوحدة الهدف: {target.floor.level===0?"أرضي":`دور ${target.floor.level}`} · {target.unit.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {!inference || inference.samples.length === 0 ? (
                  <div className="text-xs text-muted-foreground">لا توجد وحدات مثيلة في أدوار أعلى. أضف وحدات مماثلة بأسعار في الأدوار الأعلى.</div>
                ) : (
                  <>
                    <div className="text-xs space-y-1 font-mono">
                      {inference.samples.map((s, i) => (
                        <div key={i} className="flex justify-between gap-2">
                          <span>{s.from}</span>
                          <span>{fmt(s.psqmRaw)} → <b>{fmt(s.psqmAdj)}</b> ج/م² (تشطيب×{s.finishFx.toFixed(2)} · دور×{s.floorAdj.toFixed(3)})</span>
                        </div>
                      ))}
                    </div>
                    <div className="grid md:grid-cols-3 gap-2 pt-2 border-t">
                      <Stat label="متوسط ج/م² المعدّل" value={`${fmt(inference.avgPsqm)} ج`} />
                      <Stat label="مساحة الوحدة" value={`${target.unit.area} م²`} />
                      <Stat label="السعر المُستنتج" value={`${fmt(inference.total)} ج.م`} highlight />
                    </div>
                    <Button onClick={applyInference} className="w-full">
                      تطبيق السعر على الوحدة الهدف
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </CardContent>
      )}
    </Card>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className={`text-center p-2 rounded ${highlight ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
      <div className="text-[10px] opacity-80">{label}</div>
      <div className="text-sm font-bold">{value}</div>
    </div>
  );
}
