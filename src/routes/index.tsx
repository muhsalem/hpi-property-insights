import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Building2, Calculator, TrendingUp, FileText, ShieldCheck, MapPin } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Landing,
});

function Landing() {
  const nav = useNavigate();
  const [authed, setAuthed] = useState(false);
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setAuthed(!!data.user));
  }, []);

  const features = [
    { icon: Calculator, title: "5 طرق تقييم", desc: "Sales · Income · Cost · Residual · Profit مع ترجيح WTS" },
    { icon: TrendingUp, title: "مؤشر HPI حقيقي", desc: "Repeat-Sales Method لتعديل القيم زمنياً تلقائياً" },
    { icon: FileText, title: "تقرير EES / IVS", desc: "PDF احترافي متوافق مع المعايير المصرية والدولية" },
    { icon: MapPin, title: "24 منطقة ببورسعيد", desc: "خريطة GPS كاملة مع تقييمات الجوار" },
    { icon: ShieldCheck, title: "Adjustment Grid", desc: "جدول تسويات بنكي قياسي لكل مقارنة" },
    { icon: Building2, title: "كل أنواع العقارات", desc: "شقق، فلل، محلات، أبراج، أراضي، صناعي" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <header className="border-b bg-background/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-6 w-6 text-primary" />
            <span className="font-bold text-lg">مقيّم بورسعيد</span>
          </div>
          <div className="flex gap-2">
            {authed ? (
              <Button onClick={() => nav({ to: "/dashboard" })}>لوحة التحكم</Button>
            ) : (
              <>
                <Link to="/login"><Button variant="outline">دخول</Button></Link>
                <Link to="/login"><Button>ابدأ مجاناً</Button></Link>
              </>
            )}
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
          <Link to={authed ? "/dashboard" : "/login"}>
            <Button size="lg" className="text-base">ابدأ التقييم الآن</Button>
          </Link>
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

      <footer className="border-t mt-20 py-6 text-center text-sm text-muted-foreground">
        © 2026 مقيّم بورسعيد · متوافق مع EES & IVS 2022
      </footer>
    </div>
  );
}
