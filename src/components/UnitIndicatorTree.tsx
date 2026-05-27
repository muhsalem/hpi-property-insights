import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { fmt } from "@/lib/valuation";
import { getInvReturn, getBuildingCondition } from "@/lib/domain";
import { TreePine, Home, DollarSign, TrendingUp, Building, MapPin, Shield, Gauge } from "lucide-react";

type Node = {
  code: string;
  ar: string;
  en: string;
  value: string | number;
  unit?: string;
  status?: "good" | "warn" | "bad" | "neutral";
  hint?: string;
};

type Branch = {
  key: string;
  ar: string;
  en: string;
  icon: any;
  color: string;
  nodes: Node[];
};

const COLOR = {
  good: "#1D9E75",
  warn: "#EF9F27",
  bad: "#D85A30",
  neutral: "#185FA5",
};

function statusOf(v: number, good: number, bad: number, dir: "up" | "down" = "up"): Node["status"] {
  if (dir === "up") return v >= good ? "good" : v <= bad ? "bad" : "warn";
  return v <= good ? "good" : v >= bad ? "bad" : "warn";
}

export function UnitIndicatorTree({ prop, area, txns = [] }: { prop: any; area: any; txns?: any[] }) {
  const tree = useMemo<Branch[]>(() => {
    const inv = getInvReturn(prop, area);
    const cond = getBuildingCondition(prop);
    const psqm = Math.round(inv.cur / prop.area_sqm);
    const age = new Date().getFullYear() - (prop.year_built || 2020);
    const growth = Number(area.growth || 0) * 100;
    const liq = txns.length;
    const monthlyRent = inv.annRent / 12;
    const grm = inv.cur / (inv.annRent || 1); // Gross Rent Multiplier
    const totROInum = Number(inv.totROI) || 0;
    const rYieldNum = Number(inv.rYield) || 0;
    const capNum = Number(inv.cap) || 0;
    const payback = 100 / (totROInum || 1); // سنوات الاسترداد
    const finishMap: Record<string, number> = { "سوبر لوكس": 95, "لوكس": 85, "نصف تشطيب": 65, "بدون": 40 };
    const finishScore = finishMap[prop.finish || ""] || 70;
    const rooms = prop.rooms || 0;
    const baths = prop.baths || 0;
    const roomDensity = rooms ? (Number(prop.area_sqm) / rooms).toFixed(1) : "-";
    const floor = prop.floor ?? 0;
    const seaView = (prop.view || "").includes("بحري");
    const infra = Number(area.infra_rating ?? 3);
    const safety = Number(area.safety_rating ?? 3);
    const services = Number(area.services_rating ?? 3);
    const transport = Number(area.transport_rating ?? 3);
    const locScore = ((infra + safety + services + transport) / 4 / 5) * 100;

    return [
      {
        key: "phys",
        ar: "الخصائص الفيزيائية",
        en: "Physical",
        icon: Home,
        color: "#185FA5",
        nodes: [
          { code: "P-01", ar: "المساحة الإجمالية", en: "Gross Floor Area", value: prop.area_sqm, unit: "م²", status: "neutral" },
          { code: "P-02", ar: "كثافة الغرف", en: "Room Density", value: roomDensity, unit: "م²/غرفة", status: "neutral" },
          { code: "P-03", ar: "نسبة الحمامات", en: "Bath Ratio", value: rooms ? (baths / rooms).toFixed(2) : "-", status: baths >= rooms / 2 ? "good" : "warn" },
          { code: "P-04", ar: "الدور", en: "Floor Level", value: floor, status: floor >= 2 && floor <= 7 ? "good" : "warn", hint: "الأدوار 2-7 الأفضل سوقياً" },
          { code: "P-05", ar: "الإطلالة", en: "View Premium", value: seaView ? "بحرية (+8%)" : (prop.view || "عادية"), status: seaView ? "good" : "neutral" },
        ],
      },
      {
        key: "cond",
        ar: "الحالة الإنشائية",
        en: "Structural Condition",
        icon: Building,
        color: cond.color,
        nodes: [
          { code: "C-01", ar: "درجة الحالة", en: "Condition Score", value: cond.score, unit: "/100", status: cond.score >= 75 ? "good" : cond.score >= 50 ? "warn" : "bad" },
          { code: "C-02", ar: "العمر الفعلي", en: "Effective Age", value: age, unit: "سنة", status: statusOf(age, 10, 30, "down") },
          { code: "C-03", ar: "العمر الاقتصادي المتبقي", en: "Remaining Economic Life", value: Math.max(0, 60 - age), unit: "سنة", status: 60 - age >= 30 ? "good" : "warn" },
          { code: "C-04", ar: "نسبة الإهلاك", en: "Depreciation %", value: Math.min(50, age * 1.5).toFixed(1), unit: "%", status: statusOf(age * 1.5, 15, 35, "down") },
          { code: "C-05", ar: "جودة التشطيب", en: "Finish Quality", value: finishScore, unit: "/100", status: statusOf(finishScore, 80, 50) },
          { code: "C-06", ar: "عدد التجديدات", en: "Renovations Count", value: (prop.renovations as any[])?.length || 0, status: "neutral" },
        ],
      },
      {
        key: "val",
        ar: "المؤشرات المالية",
        en: "Financial",
        icon: DollarSign,
        color: "#1D9E75",
        nodes: [
          { code: "F-01", ar: "القيمة السوقية", en: "Market Value", value: fmt(inv.cur), unit: "ج", status: "neutral" },
          { code: "F-02", ar: "سعر المتر", en: "Price per SQM", value: fmt(psqm), unit: "ج/م²", status: "neutral" },
          { code: "F-03", ar: "نسبة سعر الوحدة لمتوسط الحي", en: "Unit/District Ratio", value: (psqm / Number(area.base_price)).toFixed(2), unit: "x", status: statusOf(psqm / Number(area.base_price), 1.1, 0.9) },
          { code: "F-04", ar: "الإيجار الشهري المقدّر", en: "Monthly Rent Est.", value: fmt(monthlyRent), unit: "ج", status: "neutral" },
          { code: "F-05", ar: "مضاعف الإيجار الإجمالي (GRM)", en: "Gross Rent Multiplier", value: grm.toFixed(1), unit: "x", status: statusOf(grm, 12, 20, "down"), hint: "أقل = أسرع استرداد" },
        ],
      },
      {
        key: "roi",
        ar: "العائد والاستثمار",
        en: "Returns",
        icon: TrendingUp,
        color: "#1D9E75",
        nodes: [
          { code: "R-01", ar: "العائد الإيجاري", en: "Rental Yield", value: inv.rYield, unit: "%", status: statusOf(inv.rYield, 7, 4) },
          { code: "R-02", ar: "نمو رأس المال", en: "Capital Appreciation", value: inv.cap, unit: "%", status: statusOf(inv.cap, 8, 3) },
          { code: "R-03", ar: "إجمالي العائد (ROI)", en: "Total ROI", value: inv.totROI, unit: "%", status: statusOf(inv.totROI, 12, 6) },
          { code: "R-04", ar: "فترة الاسترداد", en: "Payback Period", value: payback.toFixed(1), unit: "سنة", status: statusOf(payback, 10, 20, "down") },
          { code: "R-05", ar: "نمو الحي السنوي", en: "District Growth", value: growth.toFixed(1), unit: "%", status: statusOf(growth, 7, 3) },
        ],
      },
      {
        key: "loc",
        ar: "الموقع والبيئة",
        en: "Location",
        icon: MapPin,
        color: "#EF9F27",
        nodes: [
          { code: "L-01", ar: "درجة الموقع الإجمالية", en: "Composite Location Score", value: locScore.toFixed(0), unit: "/100", status: statusOf(locScore, 75, 50) },
          { code: "L-02", ar: "البنية التحتية", en: "Infrastructure", value: infra, unit: "/5", status: statusOf(infra, 4, 2) },
          { code: "L-03", ar: "الخدمات", en: "Services", value: services, unit: "/5", status: statusOf(services, 4, 2) },
          { code: "L-04", ar: "النقل والمواصلات", en: "Transport", value: transport, unit: "/5", status: statusOf(transport, 4, 2) },
          { code: "L-05", ar: "الأمان", en: "Safety", value: safety, unit: "/5", status: statusOf(safety, 4, 2) },
        ],
      },
      {
        key: "risk",
        ar: "المخاطر والسيولة",
        en: "Risk & Liquidity",
        icon: Shield,
        color: "#D85A30",
        nodes: [
          { code: "K-01", ar: "سيولة العقار (عدد المعاملات)", en: "Liquidity Score", value: liq, unit: "صفقة", status: statusOf(liq, 3, 0) },
          { code: "K-02", ar: "تقلب الأسعار", en: "Price Volatility", value: txns.length >= 2 ? "متوسط" : "غير متاح", status: "neutral" },
          { code: "K-03", ar: "مخاطر التقادم", en: "Obsolescence Risk", value: age > 30 ? "مرتفع" : age > 15 ? "متوسط" : "منخفض", status: age > 30 ? "bad" : age > 15 ? "warn" : "good" },
          { code: "K-04", ar: "مخاطر السوق", en: "Market Risk", value: growth < 3 ? "مرتفع" : growth < 6 ? "متوسط" : "منخفض", status: growth < 3 ? "bad" : growth < 6 ? "warn" : "good" },
        ],
      },
      {
        key: "comp",
        ar: "الكفاءة والاستدامة",
        en: "Efficiency",
        icon: Gauge,
        color: "#7c3aed",
        nodes: [
          { code: "E-01", ar: "كفاءة استغلال المساحة", en: "Space Efficiency", value: rooms && baths ? Math.round((prop.area_sqm / (rooms + baths)) * 10) / 10 : "-", unit: "م²/وحدة", status: "neutral" },
          { code: "E-02", ar: "ملاءمة الحجم العائلي", en: "Family-Size Fit", value: rooms >= 3 ? "عائلي" : rooms === 2 ? "زوجي" : "فردي", status: "neutral" },
          { code: "E-03", ar: "مؤشر الاستدامة", en: "Sustainability Proxy", value: age < 10 ? "حديث" : age < 25 ? "متوسط" : "قديم", status: age < 10 ? "good" : age < 25 ? "warn" : "bad" },
          { code: "E-04", ar: "جاهزية الإشغال", en: "Move-in Readiness", value: finishScore >= 80 ? "فوري" : finishScore >= 60 ? "يحتاج تحسين" : "يحتاج تشطيب", status: finishScore >= 80 ? "good" : finishScore >= 60 ? "warn" : "bad" },
        ],
      },
    ];
  }, [prop, area, txns]);

  const totalNodes = tree.reduce((s, b) => s + b.nodes.length, 0);
  const goodCount = tree.reduce((s, b) => s + b.nodes.filter(n => n.status === "good").length, 0);
  const healthScore = Math.round((goodCount / totalNodes) * 100);

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <TreePine className="h-5 w-5 text-primary" />
            شجرة مؤشرات الوحدة — Housing Unit Indicator Tree
          </CardTitle>
          <div className="text-left">
            <div className="text-[10px] text-muted-foreground">صحة الوحدة</div>
            <div className="text-2xl font-bold" style={{ color: healthScore >= 60 ? COLOR.good : healthScore >= 35 ? COLOR.warn : COLOR.bad }}>
              {healthScore}%
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          {tree.length} محاور · {totalNodes} مؤشر · {goodCount} مؤشر إيجابي
        </p>
      </CardHeader>
      <CardContent>
        <Accordion type="multiple" defaultValue={["phys", "val", "roi"]} className="w-full">
          {tree.map((branch) => {
            const Icon = branch.icon;
            const goods = branch.nodes.filter(n => n.status === "good").length;
            const bads = branch.nodes.filter(n => n.status === "bad").length;
            return (
              <AccordionItem key={branch.key} value={branch.key}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-3 w-full">
                    <Icon className="h-4 w-4" style={{ color: branch.color }} />
                    <div className="flex-1 text-right">
                      <div className="font-semibold text-sm">{branch.ar}</div>
                      <div className="text-[10px] text-muted-foreground">{branch.en}</div>
                    </div>
                    <Badge variant="outline" className="text-[10px]">{branch.nodes.length}</Badge>
                    {goods > 0 && <Badge className="text-[10px] bg-green-100 text-green-800 hover:bg-green-100">✓ {goods}</Badge>}
                    {bads > 0 && <Badge className="text-[10px] bg-red-100 text-red-800 hover:bg-red-100">✗ {bads}</Badge>}
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="border-r-2 pr-3 mr-2 space-y-1.5" style={{ borderColor: branch.color }}>
                    {branch.nodes.map((n) => (
                      <div key={n.code} className="flex items-start justify-between py-1.5 px-2 rounded hover:bg-accent text-xs">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-[9px] font-mono text-muted-foreground">{n.code}</span>
                            <span className="font-medium">{n.ar}</span>
                          </div>
                          <div className="text-[10px] text-muted-foreground">{n.en}{n.hint ? ` — ${n.hint}` : ""}</div>
                        </div>
                        <div className="text-left whitespace-nowrap">
                          <span className="font-bold" style={{ color: n.status ? COLOR[n.status] : COLOR.neutral }}>
                            {n.value}
                          </span>
                          {n.unit && <span className="text-[10px] text-muted-foreground mr-1"> {n.unit}</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
