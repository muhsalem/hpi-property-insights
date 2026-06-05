import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Landmark, Building2, Layers, RotateCcw, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// مرجع تكلفة الإحلال — متوافق مع ReplacementCostCalculator (بورسعيد 2026)
const BASE_BUILD_COST: Record<string, Record<string, number>> = {
  apartment: { "اكسترا سوبر لوكس": 18000, "سوبر لوكس": 14000, "لوكس": 11000, "نصف تشطيب": 7500, "بدون تشطيب": 5500 },
  villa: { "اكسترا سوبر لوكس": 22000, "سوبر لوكس": 17500, "لوكس": 13500, "نصف تشطيب": 9000, "بدون تشطيب": 6500 },
  building: { "اكسترا سوبر لوكس": 16000, "سوبر لوكس": 12500, "لوكس": 10000, "نصف تشطيب": 7000, "بدون تشطيب": 5000 },
  commercial: { "اكسترا سوبر لوكس": 20000, "سوبر لوكس": 16000, "لوكس": 12500, "نصف تشطيب": 8500, "بدون تشطيب": 6000 },
};
const ECONOMIC_LIFE: Record<string, number> = { apartment: 60, villa: 70, building: 55, commercial: 50 };
const getUnitCost = (type?: string, finish?: string) =>
  BASE_BUILD_COST[type || "apartment"]?.[finish || "لوكس"] || BASE_BUILD_COST.apartment["لوكس"];

type ZoningKey = "residential" | "commercial" | "mixed" | "industrial" | "touristic" | "agricultural";

const ZONING: Record<ZoningKey, { label: string; factor: number }> = {
  residential: { label: "سكني", factor: 1.0 },
  commercial: { label: "تجاري", factor: 1.45 },
  mixed: { label: "إداري/مختلط", factor: 1.2 },
  industrial: { label: "صناعي/مخازن", factor: 0.75 },
  touristic: { label: "سياحي/شاطئي", factor: 1.6 },
  agricultural: { label: "زراعي", factor: 0.35 },
};

const SHAPE = {
  regular: { label: "منتظم", factor: 1.0 },
  irregular: { label: "غير منتظم", factor: 0.93 },
  triangular: { label: "مثلث/ضيق", factor: 0.88 },
} as const;

const TOPO = {
  flat: { label: "مستوية", factor: 1.0 },
  sloped: { label: "منحدرة", factor: 0.94 },
  low: { label: "منخفضة/تحتاج ردم", factor: 0.85 },
} as const;

const ACCESS = {
  paved: { label: "شارع مرصوف", factor: 1.0 },
  main: { label: "شارع رئيسي", factor: 1.15 },
  unpaved: { label: "غير مرصوف", factor: 0.9 },
} as const;

const fmt = (n: number) =>
  new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.max(0, Math.round(n)));

export default function LandValuationPanel({ propertyId }: { propertyId?: string } = {}) {
  // Land inputs
  const [area, setArea] = useState<number>(250);
  const [frontage, setFrontage] = useState<number>(12);
  const [depth, setDepth] = useState<number>(20);
  const [rate, setRate] = useState<number>(18000); // جنيه/م²
  const [zoning, setZoning] = useState<ZoningKey>("residential");
  const [shape, setShape] = useState<keyof typeof SHAPE>("regular");
  const [topo, setTopo] = useState<keyof typeof TOPO>("flat");
  const [access, setAccess] = useState<keyof typeof ACCESS>("paved");
  const [corner, setCorner] = useState<boolean>(false);
  const [twoFronts, setTwoFronts] = useState<boolean>(false);
  const [seaView, setSeaView] = useState<boolean>(false);

  // Building merge
  const [mergeBuilding, setMergeBuilding] = useState<boolean>(false);
  const [bua, setBua] = useState<number>(180);
  const [costPerSqm, setCostPerSqm] = useState<number>(9500);
  const [age, setAge] = useState<number>(8);
  const [usefulLife, setUsefulLife] = useState<number>(60);
  const [externalObs, setExternalObs] = useState<number>(0); // % تقادم خارجي
  const [autoFilled, setAutoFilled] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(false);

  // جلب بيانات المبنى تلقائيًا عند تفعيل الدمج
  useEffect(() => {
    if (!mergeBuilding || !propertyId || autoFilled) return;
    let cancelled = false;
    (async () => {
      setFetching(true);
      try {
        const { data, error } = await supabase
          .from("properties")
          .select("area_sqm, finish, building_type, year_built")
          .eq("id", propertyId)
          .maybeSingle();
        if (error) throw error;
        if (cancelled || !data) return;
        const unitCost = getUnitCost(data.building_type as any, data.finish as any);
        const life = ECONOMIC_LIFE[data.building_type as any] || 60;
        const computedAge = data.year_built ? Math.max(0, new Date().getFullYear() - data.year_built) : 8;
        setBua(Number(data.area_sqm) || 180);
        setCostPerSqm(unitCost);
        setAge(computedAge);
        setUsefulLife(life);
        setAutoFilled(true);
        toast.success("تم جلب بيانات المبنى من العقار");
      } catch (e: any) {
        toast.error("تعذر جلب بيانات المبنى: " + (e?.message ?? "خطأ"));
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();
    return () => { cancelled = true; };
  }, [mergeBuilding, propertyId, autoFilled]);


  const calc = useMemo(() => {
    const z = ZONING[zoning].factor;
    const s = SHAPE[shape].factor;
    const t = TOPO[topo].factor;
    const a = ACCESS[access].factor;
    const cornerF = corner ? 1.07 : 1;
    const twoF = twoFronts ? 1.05 : 1;
    const viewF = seaView ? 1.18 : 1;

    // Frontage/depth ratio adjustment (closer to 0.5–0.8 ideal)
    let ratioF = 1;
    if (depth > 0 && frontage > 0) {
      const r = frontage / depth;
      if (r < 0.3) ratioF = 0.92;
      else if (r > 1.5) ratioF = 0.96;
    }

    const totalFactor = z * s * t * a * cornerF * twoF * viewF * ratioF;
    const adjRate = rate * totalFactor;
    const landValue = adjRate * area;

    // Building (cost approach with straight-line depreciation + external obs)
    const replacementCost = bua * costPerSqm;
    const physDep = Math.min(0.85, Math.max(0, age / Math.max(1, usefulLife)));
    const depreciatedBuilding = replacementCost * (1 - physDep) * (1 - externalObs / 100);

    const combined = mergeBuilding ? landValue + depreciatedBuilding : landValue;

    return {
      totalFactor,
      adjRate,
      landValue,
      replacementCost,
      physDepPct: physDep * 100,
      depreciatedBuilding,
      combined,
    };
  }, [area, rate, zoning, shape, topo, access, corner, twoFronts, seaView, frontage, depth, mergeBuilding, bua, costPerSqm, age, usefulLife, externalObs]);

  const reset = () => {
    setArea(250); setFrontage(12); setDepth(20); setRate(18000);
    setZoning("residential"); setShape("regular"); setTopo("flat"); setAccess("paved");
    setCorner(false); setTwoFronts(false); setSeaView(false);
    setMergeBuilding(false); setBua(180); setCostPerSqm(9500); setAge(8); setUsefulLife(60); setExternalObs(0);
    setAutoFilled(false);
  };

  return (
    <Card dir="rtl">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          تقييم الأرض المخصص
          {mergeBuilding && <Badge variant="secondary" className="gap-1"><Layers className="h-3 w-3" /> مدمج مع المبنى</Badge>}
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={reset}>
          <RotateCcw className="h-4 w-4 ml-1" /> إعادة ضبط
        </Button>
      </CardHeader>

      <CardContent className="space-y-5">
        {/* Land core inputs */}
        <div className="grid md:grid-cols-4 gap-3">
          <Field label="المساحة (م²)" value={area} onChange={setArea} />
          <Field label="الواجهة (م)" value={frontage} onChange={setFrontage} />
          <Field label="العمق (م)" value={depth} onChange={setDepth} />
          <Field label="سعر المتر الأساسي (ج.م)" value={rate} onChange={setRate} step={500} />
        </div>

        <div className="grid md:grid-cols-4 gap-3">
          <SelectField label="نطاق التخطيط" value={zoning} onChange={(v) => setZoning(v as ZoningKey)}
            options={Object.entries(ZONING).map(([k, v]) => ({ value: k, label: `${v.label} ×${v.factor}` }))} />
          <SelectField label="الشكل" value={shape} onChange={(v) => setShape(v as any)}
            options={Object.entries(SHAPE).map(([k, v]) => ({ value: k, label: `${v.label} ×${v.factor}` }))} />
          <SelectField label="الطبوغرافيا" value={topo} onChange={(v) => setTopo(v as any)}
            options={Object.entries(TOPO).map(([k, v]) => ({ value: k, label: `${v.label} ×${v.factor}` }))} />
          <SelectField label="الوصول/الشارع" value={access} onChange={(v) => setAccess(v as any)}
            options={Object.entries(ACCESS).map(([k, v]) => ({ value: k, label: `${v.label} ×${v.factor}` }))} />
        </div>

        <div className="flex flex-wrap gap-4">
          <Toggle label="قطعة ركن (+7%)" value={corner} onChange={setCorner} />
          <Toggle label="واجهتين (+5%)" value={twoFronts} onChange={setTwoFronts} />
          <Toggle label="إطلالة بحر/قناة (+18%)" value={seaView} onChange={setSeaView} />
        </div>

        {/* Land result */}
        <div className="rounded-lg bg-muted/40 p-3 grid md:grid-cols-3 gap-3 text-sm">
          <Stat label="معامل التعديل الكلي" value={`×${calc.totalFactor.toFixed(3)}`} />
          <Stat label="سعر المتر المعدّل" value={`${fmt(calc.adjRate)} ج.م`} />
          <Stat label="قيمة الأرض" value={`${fmt(calc.landValue)} ج.م`} highlight />
        </div>

        <Separator />

        {/* Merge with building */}
        <div className="flex items-center justify-between">
          <Label className="flex items-center gap-2 text-sm font-medium">
            <Building2 className="h-4 w-4" /> دمج قيمة المبنى (طريقة التكلفة)
          </Label>
          <Switch checked={mergeBuilding} onCheckedChange={setMergeBuilding} />
        </div>

        {mergeBuilding && (
          <>
            <div className="grid md:grid-cols-5 gap-3">
              <Field label="مسطح البناء (م²)" value={bua} onChange={setBua} />
              <Field label="تكلفة الإحلال/م²" value={costPerSqm} onChange={setCostPerSqm} step={250} />
              <Field label="عمر المبنى (سنة)" value={age} onChange={setAge} />
              <Field label="العمر الافتراضي" value={usefulLife} onChange={setUsefulLife} />
              <Field label="تقادم خارجي %" value={externalObs} onChange={setExternalObs} />
            </div>
            <div className="rounded-lg bg-muted/40 p-3 grid md:grid-cols-3 gap-3 text-sm">
              <Stat label="تكلفة الإحلال" value={`${fmt(calc.replacementCost)} ج.م`} />
              <Stat label="نسبة الإهلاك الفعلي" value={`${calc.physDepPct.toFixed(1)}%`} />
              <Stat label="قيمة المبنى بعد الإهلاك" value={`${fmt(calc.depreciatedBuilding)} ج.م`} />
            </div>
          </>
        )}

        <div className="rounded-xl border-2 border-primary/40 bg-primary/5 p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-muted-foreground">القيمة الإجمالية {mergeBuilding ? "(أرض + مبنى)" : "(أرض فقط)"}</div>
            <div className="text-2xl font-bold text-primary mt-1">{fmt(calc.combined)} ج.م</div>
          </div>
          <Landmark className="h-10 w-10 text-primary/30" />
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (n: number) => void; step?: number }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Input type="number" value={value} step={step}
        onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}

function SelectField({ label, value, onChange, options }: { label: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (b: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer">
      <Switch checked={value} onCheckedChange={onChange} />
      <span>{label}</span>
    </label>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`font-semibold mt-0.5 ${highlight ? "text-primary text-lg" : ""}`}>{value}</div>
    </div>
  );
}
