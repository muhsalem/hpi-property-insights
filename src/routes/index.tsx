import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calculator, TrendingUp, FileText, ShieldCheck, MapPin, Star, Quote } from "lucide-react";
import BookingForm from "@/components/BookingForm";

export const Route = createFileRoute("/")({
  component: Landing,
});

const TESTIMONIALS = [
  { name: "م. أحمد عبد الحميد", role: "مدير فرع — بنك مصر بورسعيد", stars: 5,
    text: "تقارير مقيّم بورسعيد التزمت بمعايير EES بالكامل، ووفّرت علينا أسابيع من المراجعة. صارت اعتمادنا الأول للرهونات العقارية بالمحافظة." },
  { name: "د. منى الفقي", role: "خبيرة عقارية — جمعية المثمنين", stars: 5,
    text: "ما يميّز المنصة هو مؤشر HPI المبني على بيع متكرر حقيقي — نتائج مطابقة لما نلمسه في السوق." },
  { name: "م. خالد سرحان", role: "مطوّر — الزهور الجديدة", stars: 5,
    text: "استخدمت طريقة المتبقي قبل شراء قطعة أرض، التقدير كان دقيقاً ضمن ±3٪ من السعر الفعلي. أداة لا غنى عنها." },
];

function Landing() {
  const features = [
    { icon: Calculator, title: "5 طرق تقييم", desc: "Sales · Income · Cost · Residual · Profit مع ترجيح WTS" },
    { icon: TrendingUp, title: "مؤشر HPI حقيقي", desc: "Repeat-Sales Method لتعديل القيم زمنياً تلقائياً" },
    { icon: FileText, title: "تقرير EES / IVS", desc: "PDF احترافي متوافق مع المعايير المصرية والدولية" },
    { icon: MapPin, title: "خريطة GIS تفاعلية", desc: "38 منطقة + 8 أحياء ببورسعيد على Leaflet" },
    { icon: ShieldCheck, title: "Adjustment Grid", desc: "جدول تسويات بنكي قياسي لكل مقارنة" },
    { icon: Building2, title: "بيانات CAPMAS 2023", desc: "السكان، المباني، الهجرة لكل حي" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30" dir="rtl">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">مقيّم بورسعيد</span>
          </div>
          <div className="flex gap-2">
            <a href="#booking"><Button variant="outline">احجز تقييماً</Button></a>
            <Link to="/dashboard"><Button>لوحة التحكم</Button></Link>
          </div>
        </div>
      </header>

      <section className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight">
          منصة التقييم العقاري <span className="text-primary">المحترفة</span>
        </h1>
        <p className="mt-6 text-xl text-muted-foreground max-w-2xl mx-auto">
          تقييم عقارات بورسعيد بمعايير EES و IVS 2022 — مع مؤشر HPI ديناميكي وتقارير PDF جاهزة للبنوك
        </p>
        <div className="mt-8 flex gap-3 justify-center">
          <a href="#booking"><Button size="lg" className="text-base">احجز تقييمك الآن</Button></a>
          <Link to="/dashboard"><Button size="lg" variant="outline" className="text-base">دخول المقيّمين</Button></Link>
        </div>
      </section>

      <section className="container mx-auto px-4 py-12 grid md:grid-cols-3 gap-4">
        {features.map((f) => (
          <Card key={f.title} className="border-2 hover:border-primary/50 transition">
            <CardContent className="p-6">
              <f.icon className="h-10 w-10 text-primary mb-3" />
              <h3 className="font-bold text-lg">{f.title}</h3>
              <p className="text-sm text-muted-foreground mt-1">{f.desc}</p>
            </CardContent>
          </Card>
        ))}
      </section>

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
                    <Star key={i} className="h-4 w-4 fill-yellow-500 text-yellow-500" />
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

      <section id="booking" className="container mx-auto px-4 py-16 max-w-3xl scroll-mt-20">
        <BookingForm />
      </section>

      <footer className="border-t mt-10 py-6 text-center text-sm text-muted-foreground">
        © 2026 مقيّم بورسعيد · متوافق مع EES & IVS 2022 · بيانات CAPMAS
      </footer>
    </div>
  );
}
