/**
 * لوحة موحّدة — جودة الأحياء والتنمية الحضرية
 * تدمج:
 *  1) ملف الحي الرسمي (DISTRICTS_INFO) — الحدود، الشياخات، الخدمات، الحدائق
 *  2) مؤشرات SDG 11 + QULI (UN-Habitat) — محسوبة من بيانات الحي الفعلية
 *  3) دليل تطبيق المؤشرات في تقارير التقييم (5 محاور)
 *
 * الربط:
 *  - تقييمات (infra/services/safety/transport) من جدول areas ⇒ مدخلات SDG11
 *  - عدد الخدمات الفعلي من ملف الحي ⇒ مدخل nearbyCount لـ QULI
 *  - الكثافة + الحدائق ⇒ تعديل تلقائي على درجة "الخدمات" إن لم تكن مسجّلة
 *  - النتائج تُحوَّل لتعديل سعري قابل للاستدلال في التقرير
 */
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import {
  Building2, MapPin, Users, Ruler, Hospital, GraduationCap, Church,
  ShoppingBasket, Trees, Compass, Sparkles, Award, BookOpen, FileText,
  Calculator, ShieldAlert,
} from "lucide-react";
import { fmt } from "@/lib/valuation";
import { DISTRICTS_INFO, type DistrictInfoFull } from "@/lib/districts-info";
import { sdg11Score, quliScore } from "@/lib/global-indicators";

/** يُجمع كل الخدمات في ملف الحي إلى عدد إجمالي يُستخدم في QULI.nearbyCount */
function totalServices(d: DistrictInfoFull): number {
  const s = d.services || {};
  return Object.values(s).reduce<number>((acc, v) => acc + (typeof v === "number" ? v : 0), 0);
}

/** خدمات أساسية لحساب درجة "الخدمات" التلقائية (1-5) لو لم تتوفر بالقاعدة */
function autoServicesRating(d: DistrictInfoFull): number {
  const s = d.services || {};
  const hasHealth = (s.hospitals || 0) + (s.privateHospitals || 0) + (s.medicalCenters || 0) >= 3;
  const hasEdu = (s.schools || 0) >= 5;
  const hasFood = (s.bakeries || 0) + (s.markets || 0) + (s.supplyShops || 0) >= 5;
  const hasReligion = (s.mosques || 0) + (s.churches || 0) >= 3;
  const score = (hasHealth ? 1 : 0) + (hasEdu ? 1 : 0) + (hasFood ? 1 : 0) + (hasReligion ? 1 : 0) + 1;
  return Math.min(5, score);
}

/** يطابق بين ملف الحي وسجل قاعدة areas (بنفس الاسم/الـ id) */
function matchAreaRow(d: DistrictInfoFull, areas: any[]) {
  if (!areas?.length) return null;
  const cleanName = d.name.replace("حي ", "").replace("مدينة ", "");
  return (
    areas.find((a) => a.id === d.id) ||
    areas.find((a) => a.name?.includes(cleanName)) ||
    areas.find((a) => a.district_id === d.id) ||
    null
  );
}

// =====================================================
// 5 محاور تطبيق المؤشرات في التقييم (مدمجة من HousingUrbanGuidePanel)
// =====================================================
const AXES = [
  {
    id: "ax1", icon: FileText, title: "الاستدلال السوقي في تقارير التقييم",
    items: [
      { label: "أ", title: "RPPI / REPI — مؤشر أسعار العقارات", body: "يُكتب في فقرة \"تحليل اتجاه السوق\" كدليل سوقي صريح لتبرير اتجاه القيمة." },
      { label: "ب", title: "HAI — القدرة على التملّك", body: "تجاوز P/I لـ 10× ⇒ تحفظ في \"المخاطر السوقية\" + تخفيض القابلية للتسييل." },
    ],
  },
  {
    id: "ax2", icon: MapPin, title: "تحليل الموقع (SDG 11 + QULI)",
    items: [
      { label: "أ", title: "SDG 11 — جودة البنية والخدمات", body: "نقص خدمة عامة (مدرسة/مستشفى/مواصلات) في نطاق 800م ⇒ خصم 3-7% على معامل الموقع." },
      { label: "ب", title: "QULI — جودة الحياة الحضرية", body: "فرق QULI > 15 نقطة بين حيّين ⇒ فرق سعري 8-12% بعد عزل العوامل الأخرى." },
    ],
  },
  {
    id: "ax3", icon: Calculator, title: "نمذجة المشاريع — DCF وأسلوب الدخل",
    items: [
      { label: "أ", title: "ترخيص البناء (Doing Business)", body: "إضافة 9-14 شهراً مرحلة التصريح + 1.2-2.5% تكلفة في نموذج DCF لمصر." },
      { label: "ب", title: "LGAF — اليقين القانوني", body: "ضعف الشهر العقاري ⇒ +1.5-3% علاوة مخاطرة قانونية على WACC." },
    ],
  },
  {
    id: "ax4", icon: ShieldAlert, title: "تقييم المخاطر والعناية الواجبة",
    items: [
      { label: "أ", title: "المخاطر المناخية (IPCC AR6)", body: "بورسعيد — منطقة ساحلية ⇒ خصم 3-8% للأدوار الأرضية في الكورنيش." },
      { label: "ب", title: "تسجيل الملكية (World Bank)", body: "إدراج فقرة \"حالة التسجيل\" + زمن وتكلفة التسجيل في تقرير DD." },
    ],
  },
  {
    id: "ax5", icon: Award, title: "الاستشارات الاستراتيجية والتحكيم",
    items: [
      { label: "أ", title: "المقارنة الإقليمية والدولية", body: "تقرير ربع سنوي يقارن RPPI مصر بـ MENA + Turkey + Gulf ⇒ فجوات الفرصة الاستثمارية." },
      { label: "ب", title: "IVS + RICS Red Book", body: "شهادة خبرة وفق IVS 105 + RICS VPS-3 ⇒ مقبولة دولياً في التحكيم." },
    ],
  },
];

function ServiceStat({ icon: Icon, label, value }: { icon: any; label: string; value?: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded border bg-card p-2">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-bold">{fmt(value)}</div>
      </div>
    </div>
  );
}

export default function UrbanQualityPanel() {
  const [areas, setAreas] = useState<any[]>([]);
  const [activeId, setActiveId] = useState<string>(DISTRICTS_INFO[0].id);

  useEffect(() => {
    supabase.from("areas").select("*").then(({ data }) => setAreas(data || []));
  }, []);

  const district = useMemo(
    () => DISTRICTS_INFO.find((x) => x.id === activeId) || DISTRICTS_INFO[0],
    [activeId],
  );
  const areaRow = useMemo(() => matchAreaRow(district, areas), [district, areas]);
  const density = district.population && district.area_km2
    ? Math.round(district.population / district.area_km2)
    : null;

  // ===== حساب SDG 11 =====
  // أولوية لتقييمات قاعدة areas، وإلا اشتقاق تلقائي من ملف الحي
  const sdgInput = {
    infra: areaRow?.infra_rating ?? (density ? (density > 8000 ? 4 : density > 3000 ? 3 : 2) : null),
    services: areaRow?.services_rating ?? autoServicesRating(district),
    safety: areaRow?.safety_rating ?? 3,
    transport: areaRow?.transport_rating ?? 3,
  };
  const sdg = sdg11Score(sdgInput);

  // ===== حساب QULI من ملف الحي + بيانات قاعدة areas =====
  const nearbyCount = Math.min(8, Math.round(totalServices(district) / 15) + (district.parks?.length || 0));
  const quli = sdg ? quliScore({
    sdg11: sdg.score,
    growthPct: (areaRow?.growth || 0) * 100,
    nearbyCount,
    premiumPct: 0,
  }) : null;

  // ===== أثر تقديري على القيمة =====
  const valueImpact = sdg?.valueImpactPct ?? 0;
  const totalSvc = totalServices(district);

  return (
    <div className="space-y-4" dir="rtl">
      {/* ============ Header موحّد + اختيار حي ============ */}
      <Card className="border-primary/30 bg-gradient-to-br from-primary/5 to-transparent">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-start gap-3 flex-1 min-w-[260px]">
              <Sparkles className="h-6 w-6 text-primary mt-0.5 shrink-0" />
              <div>
                <h3 className="font-bold text-lg">جودة الأحياء والتنمية الحضرية</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  دمج <b>ملف الحي الرسمي</b> + <b>مؤشرات UN-Habitat (SDG 11 + QULI)</b> + <b>دليل تطبيقها في التقييم</b>.
                  كل المؤشرات تُحسب آلياً من بيانات الحي المختار.
                </p>
              </div>
            </div>
            <Select value={activeId} onValueChange={setActiveId}>
              <SelectTrigger className="w-64 shrink-0"><SelectValue /></SelectTrigger>
              <SelectContent>
                {DISTRICTS_INFO.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ============ ملف الحي الرسمي (مختصر) ============ */}
      <Card className="border-r-4 border-r-primary">
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-2 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Building2 className="h-5 w-5 text-primary" />
                {district.name}
              </CardTitle>
              {district.address && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  <MapPin className="h-3 w-3" /> {district.address}
                </p>
              )}
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {district.population && (
                <Badge variant="secondary" className="gap-1">
                  <Users className="h-3 w-3" /> {fmt(district.population)}
                </Badge>
              )}
              {district.area_km2 && (
                <Badge variant="outline" className="gap-1">
                  <Ruler className="h-3 w-3" /> {district.area_km2} كم²
                </Badge>
              )}
              {density && <Badge className="gap-1">كثافة {fmt(density)}/كم²</Badge>}
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* الحدود */}
          <section>
            <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
              <Compass className="h-3.5 w-3.5" /> الحدود الإدارية
            </h4>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {district.boundaries.north && <div className="rounded border p-2"><b>شمالاً:</b> {district.boundaries.north}</div>}
              {district.boundaries.south && <div className="rounded border p-2"><b>جنوباً:</b> {district.boundaries.south}</div>}
              {district.boundaries.east && <div className="rounded border p-2"><b>شرقاً:</b> {district.boundaries.east}</div>}
              {district.boundaries.west && <div className="rounded border p-2"><b>غرباً:</b> {district.boundaries.west}</div>}
            </div>
          </section>

          {/* الخدمات */}
          <section>
            <h4 className="text-xs font-semibold mb-2 text-muted-foreground">
              الخدمات داخل الحي — {fmt(totalSvc)} مرفق
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              <ServiceStat icon={Hospital} label="مستشفيات" value={district.services.hospitals} />
              <ServiceStat icon={Hospital} label="مستشفيات خاصة" value={district.services.privateHospitals} />
              <ServiceStat icon={Hospital} label="مراكز طبية" value={district.services.medicalCenters} />
              <ServiceStat icon={GraduationCap} label="مدارس" value={district.services.schools} />
              <ServiceStat icon={GraduationCap} label="معاهد أزهرية" value={district.services.azharInstitutes} />
              <ServiceStat icon={Church} label="مساجد" value={district.services.mosques} />
              <ServiceStat icon={Church} label="كنائس" value={district.services.churches} />
              <ServiceStat icon={ShoppingBasket} label="مخابز" value={district.services.bakeries} />
              <ServiceStat icon={ShoppingBasket} label="أسواق" value={district.services.markets} />
            </div>
          </section>

          {/* الحدائق */}
          {district.parks?.length ? (
            <section>
              <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5 text-muted-foreground">
                <Trees className="h-3.5 w-3.5 text-green-600" /> المسطحات الخضراء — {district.parks.length}
              </h4>
              <div className="flex flex-wrap gap-1.5">
                {district.parks.map((p, i) => (
                  <Badge key={i} variant="outline" className="text-[11px] border-green-300 text-green-800 dark:text-green-300">{p}</Badge>
                ))}
              </div>
            </section>
          ) : null}
        </CardContent>
      </Card>

      {/* ============ مؤشرات SDG 11 + QULI (محسوبة من بيانات الحي أعلاه) ============ */}
      {sdg && (
        <Card className="border-primary/40">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Award className="h-4 w-4 text-primary" />
              مؤشرات جودة الحي — UN-Habitat SDG 11 + QULI
              <Badge variant="outline" className="text-[10px] mr-2">محسوبة آلياً من بيانات «{district.name}»</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="p-3 rounded border bg-card">
                <div className="text-[11px] text-muted-foreground">SDG 11 — جودة الحي</div>
                <div className="text-2xl font-bold mt-1" style={{ color: sdg.color }}>{sdg.score}/100</div>
                <Badge variant="secondary" className="mt-1 text-[10px]">{sdg.level}</Badge>
              </div>
              <div className="p-3 rounded border bg-card">
                <div className="text-[11px] text-muted-foreground">QULI — جودة الحياة</div>
                <div className="text-2xl font-bold mt-1" style={{ color: quli?.color || "inherit" }}>{quli?.score ?? "—"}/100</div>
                {quli && <Badge variant="secondary" className="mt-1 text-[10px]">{quli.level}</Badge>}
              </div>
              <div className="p-3 rounded border bg-card">
                <div className="text-[11px] text-muted-foreground">أثر على القيمة السوقية</div>
                <div className={`text-2xl font-bold mt-1 ${valueImpact >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {valueImpact >= 0 ? "+" : ""}{valueImpact}%
                </div>
                <div className="text-[10px] text-muted-foreground mt-1">تعديل سعري مقترح</div>
              </div>
              <div className="p-3 rounded border bg-card">
                <div className="text-[11px] text-muted-foreground">كثافة الخدمات (QULI)</div>
                <div className="text-2xl font-bold mt-1">{nearbyCount}/8</div>
                <div className="text-[10px] text-muted-foreground mt-1">{fmt(totalSvc)} مرفق + {district.parks?.length || 0} حديقة</div>
              </div>
            </div>

            <div className="grid md:grid-cols-2 gap-3">
              {/* تفكيك SDG 11 */}
              <div className="rounded border p-3">
                <div className="text-sm font-semibold mb-2">مكوّنات SDG 11 (مصدر البيانات)</div>
                {([
                  ["البنية التحتية", sdg.components.infra, areaRow?.infra_rating != null ? "قاعدة" : "كثافة سكانية"],
                  ["الخدمات", sdg.components.services, areaRow?.services_rating != null ? "قاعدة" : "ملف الحي"],
                  ["الأمان", sdg.components.safety, areaRow?.safety_rating != null ? "قاعدة" : "افتراضي"],
                  ["المواصلات", sdg.components.transport, areaRow?.transport_rating != null ? "قاعدة" : "افتراضي"],
                ] as const).map(([k, v, src]) => (
                  <div key={k} className="flex justify-between items-center text-sm py-1.5 border-b last:border-0">
                    <span className="flex items-center gap-2">
                      {k}
                      <Badge variant="outline" className="text-[9px] py-0">{src}</Badge>
                    </span>
                    <span className="font-mono">{v != null ? `${v}/5` : "—"}</span>
                  </div>
                ))}
              </div>

              {/* تفكيك QULI */}
              {quli && (
                <div className="rounded border p-3">
                  <div className="text-sm font-semibold mb-2">تفكيك QULI (الأوزان)</div>
                  {[
                    { k: "SDG 11", v: quli.breakdown.sdg11, w: "40%" },
                    { k: "النمو السعري", v: quli.breakdown.growth, w: "25%" },
                    { k: "كثافة الخدمات", v: quli.breakdown.services, w: "20%" },
                    { k: "الجاذبية", v: quli.breakdown.attractiveness, w: "15%" },
                  ].map((r) => (
                    <div key={r.k} className="space-y-1 py-1">
                      <div className="flex justify-between text-xs">
                        <span>{r.k} <span className="text-muted-foreground">({r.w})</span></span>
                        <span className="font-mono">{r.v}</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded overflow-hidden">
                        <div className="h-full bg-primary" style={{ width: `${r.v}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* صندوق الاستدلال الجاهز للتقرير */}
            <div className="rounded border bg-primary/5 p-3 text-xs leading-relaxed">
              <b>الاستدلال الجاهز في تقرير التقييم:</b>{" "}
              "وفقاً لمؤشر UN-Habitat SDG 11 المُركّب، يحقق حي «{district.name}» درجة {sdg.score}/100 ({sdg.level})
              مدعومة بـ {fmt(totalSvc)} مرفقاً خدمياً و{district.parks?.length || 0} مسطح أخضر،
              {quli ? ` ودرجة جودة حياة QULI تبلغ ${quli.score}/100 (${quli.level})،` : ""}
              مما يبرّر تعديلاً سعرياً قدره {valueImpact >= 0 ? "+" : ""}{valueImpact}% في طريقة البيع المقارن
              ضمن معامل الموقع."
            </div>
          </CardContent>
        </Card>
      )}

      {/* ============ دليل تطبيق المؤشرات في التقييم (5 محاور) ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" />
            دليل تطبيق المؤشرات في تقارير التقييم (5 محاور)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {AXES.map((axis, idx) => {
              const Icon = axis.icon;
              return (
                <AccordionItem key={axis.id} value={axis.id}>
                  <AccordionTrigger className="text-right hover:no-underline">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                        <Icon className="h-4 w-4 text-primary" />
                      </div>
                      <Badge variant="outline" className="text-xs">{idx + 1}</Badge>
                      <span className="font-semibold text-sm">{axis.title}</span>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent>
                    <div className="space-y-2 pt-2">
                      {axis.items.map((it, i) => (
                        <div key={i} className="rounded border p-3 bg-card">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]">{it.label}</Badge>
                            <span className="font-semibold text-sm">{it.title}</span>
                          </div>
                          <p className="text-xs text-muted-foreground leading-relaxed">{it.body}</p>
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
    </div>
  );
}
