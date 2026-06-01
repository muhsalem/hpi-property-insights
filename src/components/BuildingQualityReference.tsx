import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Check } from "lucide-react";

/**
 * مكتبة مرجعية لمستويات التشطيب
 * توضّح الفرق بين كل مستوى مع المواد المستخدمة وتأثيرها على القيمة
 */

type Level = {
  name: string;
  uplift: string;
  color: string;
  emoji: string;
  walls: string;
  floors: string;
  doors: string;
  kitchen: string;
  bathroom: string;
  electric: string;
};

const LEVELS: Level[] = [
  {
    name: "اكسترا سوبر لوكس",
    uplift: "+18%",
    color: "#7c3aed",
    emoji: "💎",
    walls: "ورق حائط فاخر / دهانات استيكو إيطالي + رخام",
    floors: "رخام إيطالي / باركيه أوك مصمت",
    doors: "أبواب صلب ماهوجني + قفل ذكي / Smart Lock",
    kitchen: "مطبخ كامل أكريليك ألماني + Built-in",
    bathroom: "أطقم ديورافيت / غروهي + بانيو جاكوزي",
    electric: "تكييف مركزي + إنارة LED + Home Automation",
  },
  {
    name: "سوبر لوكس",
    uplift: "+12%",
    color: "#2563eb",
    emoji: "✨",
    walls: "دهانات بلاستيك أعلى جودة + Decor جبس",
    floors: "بورسلين إسباني / HDF عالي",
    doors: "أبواب MDF خشب طبيعي + Yale أمان",
    kitchen: "مطبخ HPL مع كوارتز / جرانيت",
    bathroom: "أطقم Roca / Ideal Standard كاملة",
    electric: "تكييف سبليت 1.5 HP لكل غرفة + LED",
  },
  {
    name: "لوكس",
    uplift: "+6%",
    color: "#16a34a",
    emoji: "👍",
    walls: "دهانات بلاستيك عادي + Decor بسيط",
    floors: "سيراميك مصري سوبر / لامينيت",
    doors: "أبواب خشب MDF عادي + قفل أمان عادي",
    kitchen: "مطبخ MDF بدوارة + رخام مصري",
    bathroom: "أطقم محلية / IDEAL / السراج",
    electric: "تكييف 1 وحدة + تأسيس كامل",
  },
  {
    name: "نصف تشطيب",
    uplift: "0%",
    color: "#ca8a04",
    emoji: "🛠️",
    walls: "محارة + تأسيس كهرباء وسباكة فقط",
    floors: "بياض أرضيات بدون سيراميك",
    doors: "أبواب خشب بسيطة (أو غير مركبة)",
    kitchen: "تأسيس مواسير وسباكة فقط",
    bathroom: "تأسيس سباكة فقط (بدون أطقم)",
    electric: "تأسيس فقط بدون مفاتيح ولا تكييف",
  },
  {
    name: "بدون تشطيب",
    uplift: "-5%",
    color: "#dc2626",
    emoji: "🧱",
    walls: "طوب أحمر مكشوف + لا محارة",
    floors: "بلاطة خرسانية بدون أي تجهيز",
    doors: "بدون أبواب",
    kitchen: "—",
    bathroom: "—",
    electric: "—",
  },
];

export default function BuildingQualityReference({ currentFinish }: { currentFinish?: string }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          📚 المكتبة المرجعية لمستويات التشطيب
        </CardTitle>
        <p className="text-xs text-muted-foreground">
          مرجع المثمّن للتمييز بين مستويات التشطيب — يوضّح المواد المستخدمة وتأثيرها على القيمة السوقية
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid lg:grid-cols-5 md:grid-cols-2 gap-3">
          {LEVELS.map((l) => {
            const isCurrent = l.name === currentFinish;
            return (
              <div
                key={l.name}
                className="border rounded-lg p-3"
                style={{ borderColor: isCurrent ? l.color : undefined, borderWidth: isCurrent ? 2 : 1 }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="text-xl">{l.emoji}</div>
                  <Badge style={{ backgroundColor: l.color, color: "white" }} className="text-[10px]">{l.uplift}</Badge>
                </div>
                <div className="font-bold text-sm mb-2" style={{ color: l.color }}>
                  {l.name}
                  {isCurrent && <Check className="h-4 w-4 inline mr-1" />}
                </div>
                <div className="space-y-1.5 text-[11px]">
                  <Spec k="جدران" v={l.walls} />
                  <Spec k="أرضيات" v={l.floors} />
                  <Spec k="أبواب" v={l.doors} />
                  <Spec k="مطبخ" v={l.kitchen} />
                  <Spec k="حمامات" v={l.bathroom} />
                  <Spec k="كهرباء" v={l.electric} />
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-3 p-2.5 bg-muted/40 rounded text-[11px] text-muted-foreground leading-relaxed">
          <b>كيف يُحتسب الـ uplift؟</b> النسبة المئوية مضافة/مخصومة من سعر المتر المرجعي للمنطقة. المثمّن يُقدّر المستوى الفعلي بمعاينة المواد والتشطيبات وفقاً لهذا الجدول، ثم يطبّق المعامل في معادلة Hedonic.
        </div>
      </CardContent>
    </Card>
  );
}

function Spec({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex gap-1.5">
      <span className="text-muted-foreground font-semibold min-w-[42px]">{k}:</span>
      <span className="leading-tight">{v}</span>
    </div>
  );
}
