import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

/**
 * خريطة تدفق التحليل: السكان → السوق → النماذج → القدرة → الموقع → المخاطر → السعر
 * كل عقدة = مؤشر، كل خط = علاقة سببية بوزن تأثير (0-1).
 */

type AxisKey = "pop" | "market" | "model" | "afford" | "loc" | "risk" | "price";

const AXES: Record<AxisKey, { name: string; color: string; x: number }> = {
  pop:    { name: "السكان",     color: "#3b82f6", x: 80   },
  market: { name: "السوق",      color: "#10b981", x: 280  },
  model:  { name: "النماذج",    color: "#8b5cf6", x: 480  },
  afford: { name: "القدرة",     color: "#f59e0b", x: 680  },
  loc:    { name: "الموقع",     color: "#06b6d4", x: 880  },
  risk:   { name: "المخاطر",    color: "#ef4444", x: 1080 },
  price:  { name: "السعر",      color: "#dc2626", x: 1280 },
};

type Node = {
  id: string;
  label: string;
  axis: AxisKey;
  y: number;
  importance: 1 | 2 | 3; // 3 = حرج، 2 = مهم، 1 = داعم
  formula?: string;
  desc: string;
};

type Edge = {
  from: string;
  to: string;
  weight: number; // 0-1 شدة التأثير
  sign: "+" | "-"; // اتجاه التأثير
  note?: string;
};

const NODES: Node[] = [
  // ========== السكان ==========
  { id: "pop_total",      label: "إجمالي السكان",          axis: "pop", y: 60,  importance: 3, desc: "حجم السوق الكلي" },
  { id: "hh_formation",   label: "تكوين الأسر",            axis: "pop", y: 130, importance: 3, formula: "ΔHouseholds/سنة", desc: "محرك الطلب الجديد" },
  { id: "median_age",     label: "متوسط العمر",            axis: "pop", y: 200, importance: 2, desc: "يحدد نمط الطلب" },
  { id: "migration",      label: "صافي الهجرة",            axis: "pop", y: 270, importance: 3, desc: "ضغط طلب خارجي" },
  { id: "dep_ratio",      label: "نسبة الإعالة",           axis: "pop", y: 340, importance: 2, desc: "قدرة شرائية مستقبلية" },
  { id: "income",         label: "متوسط الدخل",            axis: "pop", y: 410, importance: 3, desc: "أساس القدرة المالية" },

  // ========== السوق ==========
  { id: "demand",         label: "الطلب الفعلي",           axis: "market", y: 80,  importance: 3, formula: "HH × معدل التملك", desc: "وحدات مطلوبة" },
  { id: "supply",         label: "العرض المتاح",           axis: "market", y: 160, importance: 3, desc: "وحدات معروضة" },
  { id: "absorption",     label: "معدل الامتصاص",          axis: "market", y: 240, importance: 3, formula: "مباعة/متاحة", desc: "سرعة تصفية السوق" },
  { id: "moi",            label: "أشهر المخزون (MOI)",      axis: "market", y: 320, importance: 2, formula: "Inv/Monthly Sales", desc: "<4 ساخن، >7 بارد" },
  { id: "deficit",        label: "العجز السكني",           axis: "market", y: 400, importance: 3, formula: "Demand − Supply", desc: "ضغط طلب صافي" },

  // ========== النماذج ==========
  { id: "hpi",            label: "HPI",                    axis: "model", y: 100, importance: 3, formula: "Repeat-Sales", desc: "اتجاه الأسعار" },
  { id: "case_shiller",   label: "Case-Shiller حقيقي",     axis: "model", y: 180, importance: 3, desc: "بعد خصم التضخم" },
  { id: "hedonic",        label: "Hedonic OLS",            axis: "model", y: 260, importance: 3, formula: "ln(P) = β·X", desc: "تفكيك مساهمات الخصائص" },
  { id: "bubble",         label: "مؤشر UBS للفقاعة",       axis: "model", y: 340, importance: 2, desc: "إنذار مبكر" },

  // ========== القدرة والتمويل ==========
  { id: "pi_ratio",       label: "Price-to-Income",        axis: "afford", y: 100, importance: 3, formula: "Price/Income", desc: ">5 صعب الوصول" },
  { id: "hai",            label: "HAI",                    axis: "afford", y: 180, importance: 3, desc: "مؤشر القدرة على التملك" },
  { id: "mortgage",       label: "نسبة التمويل",           axis: "afford", y: 260, importance: 2, desc: "وصول الرهن العقاري" },
  { id: "rent_burden",    label: "عبء الإيجار",            axis: "afford", y: 340, importance: 2, desc: "إيجار/دخل" },

  // ========== الموقع ==========
  { id: "walkability",    label: "المشي (Walkability)",    axis: "loc", y: 100, importance: 2, desc: "0-100" },
  { id: "amenity",        label: "كثافة الخدمات",          axis: "loc", y: 180, importance: 2, desc: "مدارس/مولات/مستشفيات" },
  { id: "infra",          label: "البنية التحتية",         axis: "loc", y: 260, importance: 3, desc: "صرف/كهرباء/طرق" },
  { id: "access",         label: "إمكانية الوصول",         axis: "loc", y: 340, importance: 2, desc: "Isochrone 15min" },

  // ========== المخاطر ==========
  { id: "lgaf",           label: "LGAF حوكمة الأراضي",     axis: "risk", y: 130, importance: 2, desc: "BMI Land Governance" },
  { id: "climate",        label: "مخاطر مناخية",           axis: "risk", y: 210, importance: 2, desc: "IPCC AR6 — بحر/سيول" },
  { id: "legal",          label: "تسجيل/قانوني",           axis: "risk", y: 290, importance: 3, desc: "سند ملكية" },
  { id: "risk_premium",   label: "علاوة المخاطر",          axis: "risk", y: 370, importance: 3, formula: "Σ خصومات", desc: "تخفيض السعر العادل" },

  // ========== السعر ==========
  { id: "fair_price",     label: "السعر العادل (FMV)",     axis: "price", y: 230, importance: 3, formula: "Hedonic × (1-Risk)", desc: "النتيجة النهائية" },
];

const EDGES: Edge[] = [
  // السكان → السوق
  { from: "pop_total",    to: "demand",       weight: 0.9, sign: "+", note: "كل ساكن = طلب محتمل" },
  { from: "hh_formation", to: "demand",       weight: 1.0, sign: "+", note: "محرك مباشر للطلب الجديد" },
  { from: "hh_formation", to: "deficit",      weight: 0.85, sign: "+" },
  { from: "migration",    to: "demand",       weight: 0.7, sign: "+" },
  { from: "migration",    to: "absorption",   weight: 0.6, sign: "+" },
  { from: "median_age",   to: "demand",       weight: 0.4, sign: "+", note: "شباب = طلب أول مرة" },
  { from: "dep_ratio",    to: "income",       weight: 0.5, sign: "-" },

  // السوق → النماذج
  { from: "demand",       to: "hpi",          weight: 0.8, sign: "+" },
  { from: "supply",       to: "hpi",          weight: 0.7, sign: "-" },
  { from: "absorption",   to: "hpi",          weight: 0.75, sign: "+", note: "سوق ساخن يرفع HPI" },
  { from: "moi",          to: "hpi",          weight: 0.6, sign: "-" },
  { from: "deficit",      to: "case_shiller", weight: 0.65, sign: "+" },
  { from: "absorption",   to: "bubble",       weight: 0.7, sign: "+" },

  // النماذج → القدرة
  { from: "hpi",          to: "pi_ratio",     weight: 0.9, sign: "+" },
  { from: "case_shiller", to: "hai",          weight: 0.85, sign: "-" },
  { from: "income",       to: "pi_ratio",     weight: 0.95, sign: "-" },
  { from: "income",       to: "hai",          weight: 0.95, sign: "+" },
  { from: "mortgage",     to: "hai",          weight: 0.7, sign: "+" },

  // الموقع → النماذج
  { from: "walkability",  to: "hedonic",      weight: 0.55, sign: "+" },
  { from: "amenity",      to: "hedonic",      weight: 0.7, sign: "+" },
  { from: "infra",        to: "hedonic",      weight: 0.85, sign: "+", note: "أكبر معامل في OLS" },
  { from: "access",       to: "hedonic",      weight: 0.6, sign: "+" },

  // المخاطر
  { from: "lgaf",         to: "risk_premium", weight: 0.6, sign: "+" },
  { from: "climate",      to: "risk_premium", weight: 0.7, sign: "+" },
  { from: "legal",        to: "risk_premium", weight: 0.85, sign: "+" },

  // → السعر العادل
  { from: "hedonic",      to: "fair_price",   weight: 1.0, sign: "+", note: "أساس التقدير" },
  { from: "case_shiller", to: "fair_price",   weight: 0.6, sign: "+" },
  { from: "hai",          to: "fair_price",   weight: 0.5, sign: "+", note: "سقف الطلب الفعّال" },
  { from: "risk_premium", to: "fair_price",   weight: 0.8, sign: "-", note: "خصم نهائي" },
  { from: "bubble",       to: "fair_price",   weight: 0.4, sign: "-" },
  { from: "deficit",      to: "fair_price",   weight: 0.5, sign: "+" },
];

const W = 1400;
const H = 480;

export default function IndicatorsFlowMap() {
  const [selected, setSelected] = useState<string | null>(null);
  const [filterAxis, setFilterAxis] = useState<AxisKey | "all">("all");

  const nodeMap = useMemo(() => Object.fromEntries(NODES.map(n => [n.id, n])), []);

  const related = useMemo(() => {
    if (!selected) return new Set<string>();
    const s = new Set<string>([selected]);
    EDGES.forEach(e => {
      if (e.from === selected) s.add(e.to);
      if (e.to === selected) s.add(e.from);
    });
    return s;
  }, [selected]);

  const isVisibleEdge = (e: Edge) => {
    if (selected) return e.from === selected || e.to === selected;
    if (filterAxis === "all") return true;
    return nodeMap[e.from]?.axis === filterAxis || nodeMap[e.to]?.axis === filterAxis;
  };

  const isVisibleNode = (n: Node) => {
    if (selected) return related.has(n.id);
    if (filterAxis === "all") return true;
    return n.axis === filterAxis;
  };

  const selectedNode = selected ? nodeMap[selected] : null;
  const selectedEdges = selected
    ? EDGES.filter(e => e.from === selected || e.to === selected)
    : [];

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <CardTitle className="text-lg">🔗 خريطة تدفق التحليل — من السكان إلى السعر</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              30 مؤشر · 7 محاور · 32 علاقة سببية موزونة — انقر أي مؤشر لعزل علاقاته
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <Button size="sm" variant={filterAxis === "all" && !selected ? "default" : "outline"}
                    onClick={() => { setFilterAxis("all"); setSelected(null); }}>
              عرض الكل
            </Button>
            {(Object.keys(AXES) as AxisKey[]).map(k => (
              <Button key={k} size="sm"
                      variant={filterAxis === k && !selected ? "default" : "outline"}
                      style={filterAxis === k ? { backgroundColor: AXES[k].color, borderColor: AXES[k].color } : { borderColor: AXES[k].color, color: AXES[k].color }}
                      onClick={() => { setFilterAxis(k); setSelected(null); }}>
                {AXES[k].name}
              </Button>
            ))}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {/* Axis headers */}
        <div className="overflow-x-auto rounded-lg border bg-muted/20">
          <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ minWidth: 900, direction: "ltr" }}>
            {/* Axis column backgrounds */}
            {(Object.keys(AXES) as AxisKey[]).map(k => {
              const ax = AXES[k];
              const active = filterAxis === k || filterAxis === "all" || (selected && nodeMap[selected]?.axis === k);
              return (
                <g key={k} opacity={active ? 1 : 0.25}>
                  <rect x={ax.x - 75} y={20} width={150} height={H - 40} rx={12}
                        fill={ax.color} fillOpacity={0.04} stroke={ax.color} strokeOpacity={0.3} strokeDasharray="4 3" />
                  <text x={ax.x} y={14} textAnchor="middle" fill={ax.color}
                        fontSize={14} fontWeight={700}>{ax.name}</text>
                </g>
              );
            })}

            {/* Edges */}
            <defs>
              {Object.entries(AXES).map(([k, ax]) => (
                <marker key={k} id={`arrow-${k}`} viewBox="0 0 10 10" refX="9" refY="5"
                        markerWidth="6" markerHeight="6" orient="auto">
                  <path d="M0,0 L10,5 L0,10 z" fill={ax.color} />
                </marker>
              ))}
              <marker id="arrow-neg" viewBox="0 0 10 10" refX="9" refY="5"
                      markerWidth="6" markerHeight="6" orient="auto">
                <path d="M0,0 L10,5 L0,10 z" fill="#ef4444" />
              </marker>
            </defs>

            {EDGES.map((e, i) => {
              const from = nodeMap[e.from];
              const to = nodeMap[e.to];
              if (!from || !to) return null;
              const visible = isVisibleEdge(e);
              const x1 = AXES[from.axis].x + 70;
              const y1 = from.y;
              const x2 = AXES[to.axis].x - 70;
              const y2 = to.y;
              const cx = (x1 + x2) / 2;
              const stroke = e.sign === "-" ? "#ef4444" : AXES[from.axis].color;
              const marker = e.sign === "-" ? "url(#arrow-neg)" : `url(#arrow-${from.axis})`;
              return (
                <path key={i}
                      d={`M ${x1} ${y1} C ${cx} ${y1}, ${cx} ${y2}, ${x2} ${y2}`}
                      fill="none"
                      stroke={stroke}
                      strokeWidth={1 + e.weight * 3}
                      strokeOpacity={visible ? 0.55 + e.weight * 0.35 : 0.05}
                      strokeDasharray={e.sign === "-" ? "5 3" : undefined}
                      markerEnd={marker} />
              );
            })}

            {/* Nodes */}
            {NODES.map(n => {
              const ax = AXES[n.axis];
              const visible = isVisibleNode(n);
              const isSel = selected === n.id;
              const r = 8 + n.importance * 3;
              return (
                <g key={n.id} opacity={visible ? 1 : 0.15}
                   style={{ cursor: "pointer" }}
                   onClick={() => setSelected(isSel ? null : n.id)}>
                  <circle cx={ax.x} cy={n.y} r={r + 6}
                          fill={ax.color} fillOpacity={isSel ? 0.3 : 0} />
                  <circle cx={ax.x} cy={n.y} r={r}
                          fill={ax.color}
                          stroke={isSel ? "#000" : "#fff"}
                          strokeWidth={isSel ? 3 : 2} />
                  {n.importance === 3 && (
                    <circle cx={ax.x} cy={n.y} r={r - 4}
                            fill="none" stroke="#fff" strokeWidth={1.5} strokeOpacity={0.7} />
                  )}
                  <text x={ax.x} y={n.y + r + 14}
                        textAnchor="middle"
                        fontSize={11}
                        fontWeight={600}
                        fill="currentColor"
                        style={{ direction: "rtl", pointerEvents: "none" }}>
                    {n.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>

        {/* Legend */}
        <div className="mt-4 grid md:grid-cols-3 gap-3 text-xs">
          <div className="p-3 bg-muted rounded space-y-1">
            <div className="font-semibold mb-1">📊 حجم العقدة = الأهمية</div>
            <div className="flex items-center gap-2"><span className="inline-block rounded-full bg-foreground" style={{width:20,height:20}} /> حرج (3) — محرك أساسي</div>
            <div className="flex items-center gap-2"><span className="inline-block rounded-full bg-foreground" style={{width:14,height:14}} /> مهم (2) — مؤثر مباشر</div>
            <div className="flex items-center gap-2"><span className="inline-block rounded-full bg-foreground" style={{width:10,height:10}} /> داعم (1) — سياق</div>
          </div>
          <div className="p-3 bg-muted rounded space-y-1">
            <div className="font-semibold mb-1">➡️ الخطوط = اتجاه التأثير</div>
            <div>• <b>سُمك الخط</b> = شدة التأثير (وزن 0-1)</div>
            <div>• <b>خط ملوّن متصل</b> = علاقة موجبة (+)</div>
            <div>• <b>خط أحمر متقطع</b> = علاقة عكسية (-)</div>
            <div>• <b>الاتجاه</b> = سهم سببي</div>
          </div>
          <div className="p-3 bg-muted rounded space-y-1">
            <div className="font-semibold mb-1">🧭 منطق التدفق</div>
            <div>السكان → يولّدون <b>الطلب</b></div>
            <div>الطلب + العرض → <b>HPI / Case-Shiller</b></div>
            <div>HPI + الدخل → <b>القدرة (HAI)</b></div>
            <div>الموقع → معاملات <b>Hedonic</b></div>
            <div>Hedonic − علاوة المخاطر = <b>السعر العادل</b></div>
          </div>
        </div>

        {/* Selected node details */}
        {selectedNode && (
          <Card className="mt-4 border-2" style={{ borderColor: AXES[selectedNode.axis].color }}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base">{selectedNode.label}</CardTitle>
                    <Badge style={{ backgroundColor: AXES[selectedNode.axis].color }}>{AXES[selectedNode.axis].name}</Badge>
                    <Badge variant="outline">
                      {selectedNode.importance === 3 ? "حرج" : selectedNode.importance === 2 ? "مهم" : "داعم"}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">{selectedNode.desc}</p>
                  {selectedNode.formula && (
                    <code className="text-xs bg-muted px-2 py-1 rounded mt-2 inline-block" dir="ltr">{selectedNode.formula}</code>
                  )}
                </div>
                <Button size="sm" variant="ghost" onClick={() => setSelected(null)}>إغلاق ✕</Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold mb-2 text-muted-foreground">⬇️ يؤثر على ({selectedEdges.filter(e=>e.from===selected).length})</div>
                  <div className="space-y-1">
                    {selectedEdges.filter(e => e.from === selected).map((e, i) => {
                      const t = nodeMap[e.to];
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30 cursor-pointer hover:bg-muted"
                             onClick={() => setSelected(e.to)}>
                          <Badge variant={e.sign === "+" ? "default" : "destructive"} className="text-xs">{e.sign}</Badge>
                          <span className="font-medium">{t.label}</span>
                          <Badge variant="outline" className="ml-auto text-xs">وزن {(e.weight * 100).toFixed(0)}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
                <div>
                  <div className="text-xs font-semibold mb-2 text-muted-foreground">⬆️ يتأثر بـ ({selectedEdges.filter(e=>e.to===selected).length})</div>
                  <div className="space-y-1">
                    {selectedEdges.filter(e => e.to === selected).map((e, i) => {
                      const f = nodeMap[e.from];
                      return (
                        <div key={i} className="flex items-center gap-2 text-xs p-2 rounded border bg-muted/30 cursor-pointer hover:bg-muted"
                             onClick={() => setSelected(e.from)}>
                          <Badge variant={e.sign === "+" ? "default" : "destructive"} className="text-xs">{e.sign}</Badge>
                          <span className="font-medium">{f.label}</span>
                          <Badge variant="outline" className="ml-auto text-xs">وزن {(e.weight * 100).toFixed(0)}%</Badge>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}
      </CardContent>
    </Card>
  );
}
