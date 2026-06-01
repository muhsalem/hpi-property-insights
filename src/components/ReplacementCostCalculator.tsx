import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calculator, Hammer } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { useMemo, useState } from "react";
import { Slider } from "@/components/ui/slider";

/**
 * حاسبة تكلفة الإحلال التلقائية (Replacement Cost — Cost Approach)
 *
 * منهجية EAA + IVS 410:
 *   القيمة = (تكلفة الاستبدال الجديد × المساحة) - الإهلاك الإجمالي + قيمة الأرض
 *
 * تكلفة المتر تأتي من جدول مرجعي حديث 2026 لبورسعيد
 */

// تكلفة م² جديد (مادة + عمالة + إشراف) — بورسعيد 2026
const BASE_BUILD_COST: Record<string, Record<string, number>> = {
  // building_type → finish → ج/م²
  apartment: {
    "اكسترا سوبر لوكس": 18000,
    "سوبر لوكس": 14000,
    "لوكس": 11000,
    "نصف تشطيب": 7500,
    "بدون تشطيب": 5500,
  },
  villa: {
    "اكسترا سوبر لوكس": 22000,
    "سوبر لوكس": 17500,
    "لوكس": 13500,
    "نصف تشطيب": 9000,
    "بدون تشطيب": 6500,
  },
  building: {
    "اكسترا سوبر لوكس": 16000,
    "سوبر لوكس": 12500,
    "لوكس": 10000,
    "نصف تشطيب": 7000,
    "بدون تشطيب": 5000,
  },
  commercial: {
    "اكسترا سوبر لوكس": 20000,
    "سوبر لوكس": 16000,
    "لوكس": 12500,
    "نصف تشطيب": 8500,
    "بدون تشطيب": 6000,
  },
};

function getUnitCost(prop: any): number {
  const type = prop.building_type || "apartment";
  const finish = prop.finish || "لوكس";
  return BASE_BUILD_COST[type]?.[finish] || BASE_BUILD_COST.apartment["لوكس"];
}

export default function ReplacementCostCalculator({ prop, area }: { prop: any; area: any }) {
  const unitCost = getUnitCost(prop);
  const buildArea = prop.area_sqm || 100;
  const age = prop.year_built ? new Date().getFullYear() - prop.year_built : 10;

  // العمر الاقتصادي الافتراضي حسب نوع المبنى (EAA 2024)
  const economicLifeMap: Record<string, number> = { apartment: 60, villa: 70, building: 55, commercial: 50 };
  const economicLife = economicLifeMap[prop.building_type || "apartment"] || 60;

  const [physicalDeprPct, setPhysicalDeprPct] = useState(Math.min(80, Math.round((age / economicLife) * 100)));
  const [functionalDeprPct, setFunctionalDeprPct] = useState(prop.finish === "بدون تشطيب" ? 15 : prop.finish === "نصف تشطيب" ? 8 : 3);
  const [externalDeprPct, setExternalDeprPct] = useState(5); // التقادم الخارجي (بيئي/سوقي)

  const calc = useMemo(() => {
    const totalReplacementCost = unitCost * buildArea;

    // الإهلاك الفيزيائي (Straight Line)
    const physicalDeprValue = totalReplacementCost * (physicalDeprPct / 100);
    // الإهلاك الوظيفي
    const functionalDeprValue = totalReplacementCost * (functionalDeprPct / 100);
    // الإهلاك الخارجي
    const externalDeprValue = totalReplacementCost * (externalDeprPct / 100);

    const totalDepreciation = physicalDeprValue + functionalDeprValue + externalDeprValue;
    const depreciatedValue = Math.max(0, totalReplacementCost - totalDepreciation);

    // قيمة الأرض (الحصة)
    const landArea = prop.profile?.land_area || buildArea / Math.max(1, prop.profile?.floors || 1);
    const landUnitPrice = Number(area?.land_psqm) || Number(area?.base_price) * 0.45 || 4000;
    const landValue = landArea * landUnitPrice;

    const finalCostValue = depreciatedValue + landValue;

    return {
      totalReplacementCost,
      physicalDeprValue,
      functionalDeprValue,
      externalDeprValue,
      totalDepreciation,
      depreciatedValue,
      landArea,
      landValue,
      finalCostValue,
    };
  }, [unitCost, buildArea, physicalDeprPct, functionalDeprPct, externalDeprPct, prop, area]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          🧮 حاسبة تكلفة الإحلال (Cost Approach — IVS 410)
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          القيمة بطريقة التكلفة = (تكلفة استبدال جديد × المساحة) − الإهلاك + قيمة الأرض
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* المدخلات التلقائية */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="تكلفة م² جديد" value={`${fmt(unitCost)} ج`} sub={`${prop.building_type} · ${prop.finish}`} />
          <Stat label="مساحة المبنى" value={`${fmt(buildArea)} م²`} />
          <Stat label="عمر المبنى" value={`${age} سنة`} sub={`الاقتصادي ${economicLife} سنة`} />
          <Stat label="مساحة الأرض" value={`${fmt(calc.landArea)} م²`} sub={`${fmt(Number(area?.land_psqm) || 0)} ج/م²`} />
        </div>

        {/* أنواع الإهلاك (Slider) */}
        <div className="space-y-3 p-3 bg-muted/30 rounded-lg">
          <div className="text-xs font-semibold">📉 محاور الإهلاك</div>

          <DeprSlider
            label="الإهلاك الفيزيائي (تآكل المواد)"
            hint={`افتراضي حسب العمر: ${Math.round((age / economicLife) * 100)}%`}
            value={physicalDeprPct}
            onChange={setPhysicalDeprPct}
            color="#dc2626"
            amount={calc.physicalDeprValue}
          />
          <DeprSlider
            label="الإهلاك الوظيفي (تصميم/تشطيب قديم)"
            hint="3-15% حسب جودة التشطيب وملاءمة التصميم"
            value={functionalDeprPct}
            onChange={setFunctionalDeprPct}
            color="#ea580c"
            amount={calc.functionalDeprValue}
            max={30}
          />
          <DeprSlider
            label="الإهلاك الخارجي (محيط/بيئة)"
            hint="مخاطر مناخية، تلوث، تغيّر سوقي للمنطقة"
            value={externalDeprPct}
            onChange={setExternalDeprPct}
            color="#ca8a04"
            amount={calc.externalDeprValue}
            max={25}
          />
        </div>

        {/* الناتج المرحلي */}
        <div className="space-y-2 text-sm">
          <Row label="تكلفة الاستبدال الكاملة" value={calc.totalReplacementCost} />
          <Row label="إجمالي الإهلاك" value={-calc.totalDepreciation} negative />
          <Row label="قيمة المبنى المستهلكة" value={calc.depreciatedValue} bold />
          <Row label="+ قيمة الأرض" value={calc.landValue} />
          <div className="border-t pt-2 mt-2">
            <Row label="🏆 القيمة النهائية بطريقة التكلفة" value={calc.finalCostValue} highlight />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <BreakBox label="مبنى" value={calc.depreciatedValue} pct={(calc.depreciatedValue / calc.finalCostValue) * 100} color="#185FA5" />
          <BreakBox label="أرض" value={calc.landValue} pct={(calc.landValue / calc.finalCostValue) * 100} color="#16a34a" />
          <BreakBox label="إهلاك" value={calc.totalDepreciation} pct={(calc.totalDepreciation / calc.totalReplacementCost) * 100} color="#dc2626" sub="من الكلفة" />
        </div>

        <div className="text-[11px] text-muted-foreground p-2 bg-muted/40 rounded leading-relaxed flex items-start gap-2">
          <Hammer className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
          <span>
            <b>تطبيق IVS 410:</b> تكاليف المتر مرجعية لبورسعيد 2026، شاملة المواد + العمالة + الإشراف الفني. لا تشمل القيمة المضافة للأرض من الموقع المميز (يُضاف هذا منفصلاً عبر طريقة المقارنة). تستخدم هذه الطريقة كأرضية للقيمة وللتأمين.
          </span>
        </div>
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, sub }: any) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold mt-0.5">{value}</div>
      {sub && <div className="text-[9px] text-muted-foreground">{sub}</div>}
    </div>
  );
}

function DeprSlider({ label, hint, value, onChange, color, amount, max = 80 }: any) {
  return (
    <div>
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-medium">{label}</span>
        <Badge style={{ backgroundColor: color, color: "white" }} className="text-[10px]">
          {value}% · {fmt(Math.round(amount))} ج
        </Badge>
      </div>
      <Slider value={[value]} max={max} step={1} onValueChange={(v: number[]) => onChange(v[0])} />
      <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>
    </div>
  );
}

function Row({ label, value, bold, highlight, negative }: any) {
  return (
    <div className={`flex justify-between items-center ${bold ? "font-bold" : ""} ${highlight ? "text-lg" : ""}`}>
      <span className={highlight ? "font-bold" : ""}>{label}</span>
      <span className={`font-mono ${negative ? "text-rose-600" : highlight ? "text-primary font-bold" : ""}`}>
        {value < 0 ? "−" : ""}{fmt(Math.abs(Math.round(value)))} ج
      </span>
    </div>
  );
}

function BreakBox({ label, value, pct, color, sub }: any) {
  return (
    <div className="border rounded p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold" style={{ color }}>{fmt(Math.round(value))}</div>
      <div className="text-[10px] text-muted-foreground">{pct.toFixed(0)}% {sub || ""}</div>
    </div>
  );
}
