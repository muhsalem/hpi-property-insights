import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { FileText, MapPin, Calculator, ShieldAlert, GraduationCap, BookOpen } from "lucide-react";

type SubItem = { label: string; title: string; body: string; example?: string };
type Axis = { id: string; title: string; icon: any; color: string; items: SubItem[] };

const AXES: Axis[] = [
  {
    id: "ax1",
    title: "في تقارير التقييم — الاستدلال بالمؤشرات كأدلة سوقية",
    icon: FileText,
    color: "from-blue-500/10 to-blue-500/5",
    items: [
      {
        label: "أ",
        title: "مؤشر أسعار العقارات (RPPI / REPI)",
        body: "استخدمه لتبرير الاتجاه السعري في تقديرات القيمة السوقية، ويُكتب كدليل سوقي صريح في فقرة \"تحليل اتجاه السوق\".",
        example: "وفقاً لمؤشر أسعار العقارات المصري، شهد الحي ارتفاعاً بنسبة X% خلال السنة الماضية، مما يدعم تقديرنا الحالي للقيمة.",
      },
      {
        label: "ب",
        title: "مؤشر القدرة على تحمل التكاليف (HAI)",
        body: "حلّل به طلب الشريحة المستهدفة. إذا تجاوزت نسبة السعر/الدخل 10 أضعاف، يُذكر كمؤشر مخاطرة على السيولة وإعادة التسويق.",
        example: "تجاوز نسبة P/I لـ 10× يستوجب إدراج تحفظ في فقرة \"المخاطر السوقية\" مع تخفيض القابلية للتسييل.",
      },
    ],
  },
  {
    id: "ax2",
    title: "في تحليل الموقع — مؤشرات جودة الحي والبنية التحتية",
    icon: MapPin,
    color: "from-emerald-500/10 to-emerald-500/5",
    items: [
      {
        label: "أ",
        title: "مؤشرات UN-Habitat والهدف 11 (SDG 11)",
        body: "للاستناد في تقييم جودة البنية التحتية، الوصول للخدمات، ونسبة العشوائيات في المنطقة — كلها تدخل في معامل الموقع.",
        example: "نقص خدمة عامة (مدرسة/مستشفى/مواصلات) ضمن نطاق 800م → خصم 3-7٪ على معامل الموقع.",
      },
      {
        label: "ب",
        title: "مؤشر جودة الحياة الحضرية (QULI)",
        body: "يدعم تحليل الجاذبية الحضرية ويبرّر الفوارق السعرية بين الأحياء في المدينة الواحدة.",
        example: "فرق QULI أكبر من 15 نقطة بين حيّين يُترجم كفرق سعري بنحو 8-12٪ بعد عزل العوامل الأخرى.",
      },
    ],
  },
  {
    id: "ax3",
    title: "في تقييم المشاريع التطويرية — DCF وأسلوب الدخل",
    icon: Calculator,
    color: "from-amber-500/10 to-amber-500/5",
    items: [
      {
        label: "أ",
        title: "مؤشر ترخيص البناء (Doing Business)",
        body: "يحدد مدة الحصول على التصاريح وتكلفتها — مدخل مباشر في نمذجة التدفقات النقدية للمشاريع (Phase 0 — التصريح).",
        example: "إضافة 9-14 شهراً مرحلة التصريح في نموذج DCF لمصر، مع تكلفة 1.2-2.5٪ من قيمة المبنى.",
      },
      {
        label: "ب",
        title: "مؤشر LGAF (إدارة الأراضي)",
        body: "يعكس درجة اليقين القانوني في ملكية الأرض، ويُستخدم لتقدير علاوة المخاطرة (Risk Premium) في معدل الخصم.",
        example: "ضعف الشهر العقاري في منطقة → إضافة 1.5-3٪ علاوة مخاطرة قانونية على WACC.",
      },
    ],
  },
  {
    id: "ax4",
    title: "في تقييم المخاطر وتقارير العناية الواجبة",
    icon: ShieldAlert,
    color: "from-rose-500/10 to-rose-500/5",
    items: [
      {
        label: "أ",
        title: "مؤشرات المدن المرنة والمخاطر المناخية",
        body: "إذا كان العقار في منطقة معرضة لمخاطر بيئية (فيضانات، حرارة شديدة، ارتفاع منسوب البحر)، يُدرج في تقرير التقييم قسم منفصل لتحليل المخاطر البيئية.",
        example: "بورسعيد: منطقة ساحلية معرضة لارتفاع منسوب البحر → خصم 3-8٪ للأدوار الأرضية في الكورنيش.",
      },
      {
        label: "ب",
        title: "مؤشر تسجيل الملكية العقارية (World Bank)",
        body: "يعكس مستوى الأمان القانوني للملكية في الدولة — عامل جوهري في العناية الواجبة للمستثمرين الأجانب.",
        example: "إدراج فقرة \"حالة التسجيل\" في تقرير DD مع زمن وتكلفة التسجيل المتوقعة.",
      },
    ],
  },
  {
    id: "ax5",
    title: "في الاستشارات والتقارير الاستراتيجية والبحثية",
    icon: GraduationCap,
    color: "from-purple-500/10 to-purple-500/5",
    items: [
      {
        label: "أ",
        title: "ربط البحث الأكاديمي بالتطبيق",
        body: "توظيف المؤشرات الدولية في إنتاج تقارير مقارنة لمصر في سياق إقليمي ودولي — نوع من الاستشارات نادر في السوق المصري.",
        example: "تقرير ربع سنوي يقارن RPPI مصر بـ MENA + Turkey + Gulf، ويستخلص فجوات الفرصة الاستثمارية.",
      },
      {
        label: "ب",
        title: "قيمة مضافة في التحكيم العقاري والنزاعات",
        body: "الإلمام بمعايير IVS وRICS Red Book يجعل المقيّم مرجعاً موثوقاً في نزاعات التقييم أمام المحاكم والجهات التحكيمية.",
        example: "صياغة شهادة خبرة وفق IVS 105 + RICS Red Book VPS-3 → مقبولة دولياً في التحكيم.",
      },
    ],
  },
];

export default function HousingUrbanGuidePanel() {
  return (
    <div className="space-y-4">
      <Card className="border-primary/30 bg-primary/5">
        <CardContent className="p-5">
          <div className="flex items-start gap-3">
            <BookOpen className="h-6 w-6 text-primary mt-0.5 shrink-0" />
            <div>
              <h3 className="font-bold text-lg">دليل مؤشرات الإسكان والتنمية الحضرية</h3>
              <p className="text-sm text-muted-foreground mt-1">
                خمسة محاور تطبيقية تبيّن كيف يوظِّف المقيّم المؤشرات الدولية والمحلية في تقارير التقييم،
                تحليل الموقع، نمذجة المشاريع، تقييم المخاطر، والاستشارات الاستراتيجية.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {AXES.map((axis, idx) => {
        const Icon = axis.icon;
        return (
          <Card key={axis.id} className={`bg-gradient-to-br ${axis.color}`}>
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-background flex items-center justify-center shrink-0">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <span>
                  <Badge variant="outline" className="ml-2">{idx + 1}</Badge>
                  {axis.title}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="single" collapsible className="w-full">
                {axis.items.map((it, i) => (
                  <AccordionItem key={i} value={`${axis.id}-${i}`}>
                    <AccordionTrigger className="text-right hover:no-underline">
                      <div className="flex items-center gap-3">
                        <Badge className="h-6 w-6 rounded-full p-0 flex items-center justify-center">{it.label}</Badge>
                        <span className="font-semibold">{it.title}</span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent>
                      <p className="text-sm leading-relaxed">{it.body}</p>
                      {it.example && (
                        <div className="mt-3 p-3 bg-background/60 rounded-md border-r-4 border-primary">
                          <div className="text-xs text-muted-foreground font-semibold mb-1">مثال تطبيقي</div>
                          <p className="text-sm italic">{it.example}</p>
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
