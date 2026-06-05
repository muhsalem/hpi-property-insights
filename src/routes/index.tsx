import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Building2, Calculator, TrendingUp, FileText, ShieldCheck, MapPin, Star, Quote,
  Banknote, Users, Briefcase, Scale, BadgeCheck, BookOpen, Globe2,
} from "lucide-react";
import BookingForm from "@/components/BookingForm";

export const Route = createFileRoute("/")({
  component: Landing,
  head: () => ({
    meta: [
      { title: "مقيّم بورسعيد — منصة التقييم العقاري المعتمدة (EAA · FRA · IVS 2025)" },
      { name: "description", content: "منصة تقييم عقاري احترافية متخصصة في بورسعيد. 5 طرق تقييم، مؤشر HPI ديناميكي، تقارير عربي/إنجليزي متوافقة مع المعايير المصرية والدولية للبنوك والمستثمرين." },
      { property: "og:title", content: "مقيّم بورسعيد — التقييم العقاري المعتمد" },
      { property: "og:description", content: "تقارير EAA/FRA + IVS 2025 · مؤشر HPI · 38 منطقة · تمويل تقليدي وإسلامي" },
      { property: "og:url", content: "/" },
    ],
    links: [{ rel: "canonical", href: "/" }],
    scripts: [{
      type: "application/ld+json",
      children: JSON.stringify({
        "@context": "https://schema.org",
        "@type": "ProfessionalService",
        name: "مقيّم بورسعيد",
        areaServed: { "@type": "City", name: "Port Said, Egypt" },
        serviceType: "Real Estate Valuation",
        description: "Real estate valuation platform compliant with Egyptian (EAA/FRA) and international (IVS 2025, RICS) standards.",
      }),
    }],
  }),
});

const TESTIMONIALS = [
  { name: "م. أحمد عبد الحميد", role: "مدير فرع — بنك مصر بورسعيد", stars: 5,
    text: "تقارير مقيّم بورسعيد التزمت بمعايير EES بالكامل، ووفّرت علينا أسابيع من المراجعة. صارت اعتمادنا الأول للرهونات العقارية بالمحافظة." },
  { name: "د. منى الفقي", role: "خبيرة عقارية — جمعية المثمنين", stars: 5,
    text: "ما يميّز المنصة هو مؤشر HPI المبني على بيع متكرر حقيقي — نتائج مطابقة لما نلمسه في السوق." },
  { name: "م. خالد سرحان", role: "مطوّر — الزهور الجديدة", stars: 5,
    text: "استخدمت طريقة المتبقي قبل شراء قطعة أرض، التقدير كان دقيقاً ضمن ±3٪ من السعر الفعلي. أداة لا غنى عنها." },
];

const PERSONAS = [
  { icon: Banknote, title: "للبنوك والممولين", desc: "تقارير IVS/EAA معتمدة، Adjustment Grid بنكي، خصومات قانونية حسب حالة التسجيل، حساب رهن وقسط أوتوماتيكي." },
  { icon: BadgeCheck, title: "للمثمّنين المعتمدين", desc: "5 طرق تقييم آلية، مؤشر HPI لتسوية زمنية، Hedonic OLS، تصدير عربي/إنجليزي بتوقيع رقمي و QR." },
  { icon: TrendingUp, title: "للمستثمرين والمطوّرين", desc: "مؤشر فقاعة، Case-Shiller مُكيَّف لبورسعيد، تحليل ROI وCapital Appreciation لكل وحدة وحي." },
  { icon: Users, title: "للمشترين والأفراد", desc: "تقييم فوري لأي وحدة، حاسبة تمويل تقليدي وإسلامي (مرابحة/إجارة)، رسوم الشهر العقاري المتوقعة." },
];

const STANDARDS = [
  { label: "EAA / EES", desc: "المعايير المصرية للتقييم العقاري" },
  { label: "FRA · ق.10/2009", desc: "الهيئة العامة للرقابة المالية" },
  { label: "IVS 2025", desc: "International Valuation Standards" },
  { label: "RICS Red Book", desc: "Global Valuation Standards" },
  { label: "USPAP 2024–25", desc: "Uniform Standards of Appraisal" },
  { label: "CAPMAS 2023", desc: "بيانات الجهاز المركزي للإحصاء" },
];

function Landing() {
  const features = [
    { icon: Calculator, title: "5 طرق تقييم", desc: "Sales · Income · Cost · Residual · Profit مع ترجيح WTS" },
    { icon: TrendingUp, title: "مؤشر HPI حقيقي", desc: "Repeat-Sales Method لتعديل القيم زمنياً تلقائياً" },
    { icon: FileText, title: "تقرير EES / IVS", desc: "PDF احترافي بـ QR ورقم تحقّق وبصمة وثيقة" },
    { icon: MapPin, title: "خريطة GIS تفاعلية", desc: "38 منطقة + 8 أحياء ببورسعيد على Leaflet" },
    { icon: Scale, title: "بيانات قانونية متكاملة", desc: "حالة التسجيل · رسوم الشهر · ق.187/2023 للتصالح" },
    { icon: Building2, title: "تمويل تقليدي وإسلامي", desc: "حاسبات الرهن، المرابحة، الإجارة، المشاركة المتناقصة" },
  ];

  return (
    <div className="min-h-screen bg-background" dir="rtl">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">مقيّم بورسعيد</span>
            <span className="hidden sm:inline text-xs text-muted-foreground border-r border-border pr-2 mr-1">منصة التقييم المعتمدة</span>
          </div>
          <nav className="hidden md:flex items-center gap-5 text-sm text-muted-foreground">
            <a href="#personas" className="hover:text-foreground">لمن المنصة</a>
            <a href="#features" className="hover:text-foreground">المزايا</a>
            <a href="#methodology" className="hover:text-foreground">المنهجية</a>
            <a href="#standards" className="hover:text-foreground">الاعتمادات</a>
          </nav>
          <div className="flex gap-2">
            <a href="#booking"><Button variant="outline">احجز تقييماً</Button></a>
            <Link to="/dashboard"><Button>لوحة التحكم</Button></Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 -z-10 bg-[radial-gradient(ellipse_at_top,_var(--brand-glow)/_18%,_transparent_60%)] opacity-50" />
        <div className="container mx-auto px-4 py-20 md:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary mb-6">
            <BadgeCheck className="h-3.5 w-3.5" />
            متوافق مع المعايير المصرية (EAA/FRA) والدولية (IVS 2025 · RICS · USPAP)
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">
            تقييم عقاري <span className="bg-clip-text text-transparent" style={{ backgroundImage: "var(--gradient-brand)" }}>موثّق</span> لسوق بورسعيد
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
            5 طرق تقييم آلية، مؤشر HPI ديناميكي، تقارير عربي/إنجليزي بتوقيع رقمي ورمز QR للتحقق — جاهزة للبنوك والمحاكم والمستثمرين.
          </p>
          <div className="mt-8 flex flex-wrap gap-3 justify-center">
            <a href="#booking"><Button size="lg" className="text-base shadow-lg">احجز تقييمك الآن</Button></a>
            <Link to="/dashboard"><Button size="lg" variant="outline" className="text-base">دخول المقيّمين</Button></Link>
          </div>
          {/* Quick stats */}
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto">
            {[
              { v: "38", l: "منطقة مغطاة" },
              { v: "8", l: "أحياء ببورسعيد" },
              { v: "5", l: "طرق تقييم معتمدة" },
              { v: "95%", l: "فترة ثقة الإحصائية" },
            ].map((s) => (
              <div key={s.l} className="rounded-lg border bg-card p-4">
                <div className="text-3xl font-bold text-primary">{s.v}</div>
                <div className="text-xs text-muted-foreground mt-1">{s.l}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Personas — for whom */}
      <section id="personas" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">منصة واحدة · 4 جماهير محترفة</h2>
          <p className="text-muted-foreground mt-2">صُمّمت أدوات وتقارير المنصة لتخدم كل طرف من أطراف السوق العقاري</p>
        </div>
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {PERSONAS.map((p) => (
            <Card key={p.title} className="border-2 hover:border-primary/40 transition">
              <CardContent className="p-6">
                <div className="rounded-lg bg-primary/10 w-12 h-12 flex items-center justify-center mb-4">
                  <p.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-bold text-lg">{p.title}</h3>
                <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{p.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="container mx-auto px-4 py-16 scroll-mt-20 bg-surface-1 rounded-2xl">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">ماذا تحصل عليه</h2>
          <p className="text-muted-foreground mt-2">عمق تحليلي يفوق المعايير، بواجهة بسيطة وسريعة</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {features.map((f) => (
            <Card key={f.title} className="border-2 hover:border-primary/50 transition">
              <CardContent className="p-6">
                <f.icon className="h-10 w-10 text-primary mb-3" />
                <h3 className="font-bold text-lg">{f.title}</h3>
                <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Methodology */}
      <section id="methodology" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold">المنهجية الإحصائية</h2>
          <p className="text-muted-foreground mt-2">شفافة، قابلة للتدقيق، مبنية على الأدبيات الأكاديمية</p>
        </div>
        <div className="grid md:grid-cols-3 gap-4">
          {[
            { icon: BookOpen, title: "Hedonic OLS (Rosen 1974)", desc: "انحدار خطي على خصائص العقار لتقدير القيمة الضمنية لكل خاصية (غرفة، حمام، طابق، عمر، موقع)." },
            { icon: TrendingUp, title: "Repeat-Sales HPI", desc: "مؤشر Case-Shiller مُكيَّف لبيانات بورسعيد — يقيس التغير الحقيقي بمعزل عن جودة الوحدات." },
            { icon: Briefcase, title: "WTS Reconciliation", desc: "ترجيح ذكي بين 5 طرق تقييم حسب نوع العقار، مع فترة ثقة 95% ومعامل اعتمادية." },
            { icon: ShieldCheck, title: "Adjustment Grid + IQR", desc: "جدول تسويات بنكي قياسي مع كشف القيم الشاذة عبر المدى الربيعي." },
            { icon: Scale, title: "Bubble Index متعدد المحاور", desc: "السعر/الدخل، عبء القسط، التضخم العقاري، نسبة الإيجار — مؤشر مركّب موزون." },
            { icon: Globe2, title: "تكامل CAPMAS", desc: "بيانات السكان والمباني والهجرة للجهاز المركزي للتعبئة العامة والإحصاء — لكل حي." },
          ].map((m) => (
            <div key={m.title} className="rounded-lg border bg-card p-5">
              <m.icon className="h-7 w-7 text-primary mb-3" />
              <h3 className="font-bold">{m.title}</h3>
              <p className="text-sm text-muted-foreground mt-1.5 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Standards / Trust strip */}
      <section id="standards" className="container mx-auto px-4 py-16 scroll-mt-20">
        <div className="rounded-2xl border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-8 md:p-10">
          <div className="text-center mb-8">
            <h2 className="text-2xl md:text-3xl font-bold">المعايير والاعتمادات</h2>
            <p className="text-muted-foreground mt-2">كل تقرير يصدر من المنصة يحمل QR ورقم تحقّق وبصمة وثيقة، ومُصاغ وفق:</p>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STANDARDS.map((s) => (
              <div key={s.label} className="rounded-lg border bg-background p-4 text-center hover:border-primary/40 transition">
                <div className="font-bold text-sm text-primary">{s.label}</div>
                <div className="text-[11px] text-muted-foreground mt-1 leading-snug">{s.desc}</div>
              </div>
            ))}
          </div>
          <div className="mt-6 text-center text-xs text-muted-foreground">
            * المقيّم المعتمد يقيَّد بسجل الهيئة العامة للرقابة المالية (FRA) طبقاً للقانون رقم 10 لسنة 2009 ولائحته التنفيذية.
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="container mx-auto px-4 py-16">
        <h2 className="text-3xl font-bold text-center mb-2">ماذا يقول عملاؤنا</h2>
        <p className="text-center text-muted-foreground mb-10">بنوك · مطوّرون · مقيّمون يثقون بنا</p>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <Card key={t.name} className="border-2">
              <CardContent className="p-6">
                <Quote className="h-8 w-8 text-primary/30 mb-3" />
                <p className="text-sm leading-relaxed">{t.text}</p>
                <div className="flex gap-0.5 mt-4 mb-3">
                  {Array.from({ length: t.stars }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-warning text-warning" />
                  ))}
                </div>
                <div className="border-t pt-3">
                  <div className="font-bold text-sm">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Booking */}
      <section id="booking" className="container mx-auto px-4 py-16 max-w-3xl scroll-mt-20">
        <BookingForm />
      </section>

      <footer className="border-t mt-10 py-8 text-center text-sm text-muted-foreground">
        <div className="container mx-auto px-4">
          <div className="font-bold text-foreground mb-1">مقيّم بورسعيد</div>
          <div>© 2026 جميع الحقوق محفوظة · متوافق مع EAA · FRA · IVS 2025 · RICS · USPAP</div>
          <div className="mt-2 text-xs">مصادر البيانات: الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS) · هيئة المجتمعات العمرانية الجديدة · الشهر العقاري</div>
        </div>
      </footer>
    </div>
  );
}
