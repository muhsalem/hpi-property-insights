import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Building2, Ruler, Calendar, Sparkles, Layers, Wrench } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { getBuildingCondition, getBuildingAttachments, getDailyPrice } from "@/lib/domain";
import { ATT_CATS } from "@/lib/constants";

/**
 * 🏗 المؤشرات الفيزيائية للعقار (Physical Indicators)
 * ينظمها في 5 محاور + ملحقات + ترجيح أدنى/أعلى سعر
 */
export default function PhysicalIndicatorsCard({ prop, area }: { prop: any; area: any }) {
  const cond = getBuildingCondition(prop);
  const att = getBuildingAttachments(prop, area);
  const cur = getDailyPrice(prop.base_price, area.growth || 0);

  const profile = prop.profile || {};
  const floors = profile.floors || 1;
  const upf    = profile.upf || 1; // units per floor
  const hasElev = profile.elev;
  const totalUnits = floors * upf;
  const sqmPerRoom = prop.rooms ? Math.round(prop.area_sqm / prop.rooms) : prop.area_sqm;
  const landArea = profile.land_area || prop.area_sqm;

  // ترجيح أدنى/أعلى سعر — مدى التقييم
  // باستخدام معامل حالة المبنى وعمره + التشطيب
  const condFactor = cond.score / 100;           // 0..1
  const ageDiscount = Math.min(0.35, cond.age * 0.012); // خصم بسبب العمر
  const finishUplift = ({ "اكسترا سوبر لوكس": 0.18, "سوبر لوكس": 0.12, "لوكس": 0.06, "نصف تشطيب": 0, "بدون تشطيب": -0.05, "-": -0.08 } as any)[prop.finish] || 0;
  const psqm = cur / Math.max(1, prop.area_sqm);
  const lowPsqm  = Math.round(psqm * (1 - 0.10 - ageDiscount * 0.4 + Math.min(0, finishUplift)));
  const highPsqm = Math.round(psqm * (1 + 0.12 + condFactor * 0.08 + Math.max(0, finishUplift)));
  const lowTotal  = lowPsqm  * prop.area_sqm;
  const highTotal = highPsqm * prop.area_sqm;

  const totalAttachments = Object.values(att).reduce((s: number, arr: any) => s + (arr?.length || 0), 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          🏗 المؤشرات الفيزيائية للعقار — 5 محاور
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">

        {/* المحور 1: المساحة */}
        <Section icon={<Ruler className="h-4 w-4" />} title="1️⃣ المساحة">
          <Item label="مساحة الوحدة" value={`${prop.area_sqm} م²`} />
          <Item label="مساحة الأرض" value={`${fmt(landArea)} م²`} />
          <Item label="الطابق" value={prop.floor != null ? `${prop.floor}` : "—"} />
          <Item label="م²/غرفة" value={`${sqmPerRoom} م²`} />
        </Section>

        {/* المحور 2: العمر والحالة */}
        <Section icon={<Calendar className="h-4 w-4" />} title="2️⃣ العمر الزمني والحالة">
          <Item label="سنة الإنشاء" value={prop.year_built || "—"} />
          <Item label="عمر المبنى" value={`${cond.age} سنة`} />
          <Item label="درجة الحالة" value={`${cond.score}/100`} color={cond.color} />
          <Item label="التقييم" value={cond.grade} color={cond.color} />
        </Section>

        {/* المحور 3: التشطيب */}
        <Section icon={<Sparkles className="h-4 w-4" />} title="3️⃣ جودة البناء والتشطيب">
          <Item label="مستوى التشطيب" value={prop.finish || "—"} />
          <Item label="عدد التجديدات" value={`${(prop.renovations as any[])?.length || 0}`} />
          <Item label="نوع البناء" value={prop.building_type} />
          <Item label="درجة العيار" value={cond.score >= 80 ? "ممتاز" : cond.score >= 60 ? "جيد" : "متوسط"} color={cond.color} />
        </Section>

        {/* المحور 4: الغرف والوحدات */}
        <Section icon={<Layers className="h-4 w-4" />} title="4️⃣ عدد الغرف والوحدات">
          <Item label="عدد الغرف" value={`${prop.rooms ?? 0}`} />
          <Item label="عدد الحمامات" value={`${prop.baths ?? 0}`} />
          <Item label="إجمالي وحدات المبنى" value={`${totalUnits}`} />
          <Item label="الإطلالة" value={prop.view || "—"} />
        </Section>

        {/* المحور 5: التصميم والكفاءة */}
        <Section icon={<Wrench className="h-4 w-4" />} title="5️⃣ التصميم المعماري والكفاءة">
          <Item label="نوع المبنى" value={prop.building_type} />
          <Item label="عدد الطوابق" value={`${floors}`} />
          <Item label="وحدات/طابق" value={`${upf}`} />
          <Item label="مصعد" value={hasElev ? "✅ متوفر" : "❌ لا يوجد"} color={hasElev ? "#16a34a" : "#dc2626"} />
        </Section>

        {/* الملحقات */}
        <div>
          <div className="text-xs font-semibold mb-2 flex items-center gap-1">
            🧰 ملحقات العقار <Badge variant="secondary" className="text-[10px]">{totalAttachments} عنصر</Badge>
          </div>
          <div className="grid md:grid-cols-3 gap-2">
            {ATT_CATS.map((c) => {
              const items = (att as any)[c.k] as string[];
              if (!items?.length) return null;
              return (
                <div key={c.k} className="border rounded p-2">
                  <div className="font-medium text-xs mb-1">{c.ic} {c.t}</div>
                  <ul className="text-[11px] space-y-0.5 text-muted-foreground">
                    {items.map((it, i) => <li key={i}>• {it}</li>)}
                  </ul>
                </div>
              );
            })}
          </div>
        </div>

        {/* الترجيح: أدنى/أعلى/متوسط */}
        <div>
          <div className="text-xs font-semibold mb-2">⚖️ ترجيح القيمة — مدى التقييم النهائي</div>
          <div className="grid grid-cols-3 gap-2">
            <PriceBox label="أدنى سعر" psqm={lowPsqm} total={lowTotal} color="#dc2626" />
            <PriceBox label="القيمة المرجّحة" psqm={Math.round(psqm)} total={cur} color="#185FA5" highlight />
            <PriceBox label="أعلى سعر" psqm={highPsqm} total={highTotal} color="#16a34a" />
          </div>
          <div className="text-[11px] text-muted-foreground mt-2 p-2 bg-muted/40 rounded leading-relaxed">
            <b>منهجية الترجيح:</b> يُحسب الحدّان الأدنى والأعلى بناءً على معامل حالة المبنى ({cond.score}/100)،
            خصم العمر ({(ageDiscount * 100).toFixed(1)}%)، ومعامل التشطيب ({(finishUplift * 100).toFixed(0)}%).
            مدى التقييم = <b>±{Math.round(((highPsqm - lowPsqm) / 2 / psqm) * 100)}%</b> حول القيمة المرجّحة.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Section({ icon, title, children }: any) {
  return (
    <div>
      <div className="text-xs font-semibold mb-1.5 flex items-center gap-1">{icon}{title}</div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">{children}</div>
    </div>
  );
}

function Item({ label, value, color }: { label: string; value: any; color?: string }) {
  return (
    <div className="border rounded p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-sm font-bold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}

function PriceBox({ label, psqm, total, color, highlight }: { label: string; psqm: number; total: number; color: string; highlight?: boolean }) {
  return (
    <div className={`border rounded p-3 ${highlight ? "border-2" : ""}`} style={{ borderColor: highlight ? color : undefined }}>
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className="text-base font-bold mt-0.5" style={{ color }}>{fmt(psqm)} ج/م²</div>
      <div className="text-xs text-muted-foreground mt-0.5">إجمالي: {fmt(total)} ج</div>
    </div>
  );
}
