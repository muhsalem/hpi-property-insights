import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import { Building2, BarChart3, FileText, MapPin } from "lucide-react";

const KEY = "thameen_onboarded_v1";

export function OnboardingDialog() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    try {
      if (!localStorage.getItem(KEY)) setOpen(true);
    } catch {}
  }, []);

  const dismiss = () => {
    try {
      localStorage.setItem(KEY, "1");
    } catch {}
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && dismiss()}>
      <DialogContent dir="rtl" className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">👋 أهلاً بك في ثَمين</DialogTitle>
          <DialogDescription>
            منصة التقييم العقاري لبورسعيد — متوافقة مع معايير الهيئة المصرية للتقييم (EAA/FRA) والمعايير الدولية (IVS/RICS).
          </DialogDescription>
        </DialogHeader>

        <div className="grid sm:grid-cols-2 gap-3 my-2">
          <StepCard icon={Building2} title="ابدأ تقييم" desc="أدخل بيانات الوحدة واحصل على تقدير بـ 5 طرق" />
          <StepCard icon={BarChart3} title="استكشف المؤشرات" desc="40+ مؤشر سوقي شامل وفقاعة الأسعار" />
          <StepCard icon={MapPin} title="تصفح الأحياء" desc="خريطة تفاعلية لمناطق بورسعيد" />
          <StepCard icon={FileText} title="ولّد التقارير" desc="PDF احترافي عربي/إنجليزي مع QR للتحقق" />
        </div>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button variant="outline" onClick={dismiss}>تصفّح اللوحة</Button>
          <Link to="/valuate" onClick={dismiss}>
            <Button>ابدأ أول تقييم</Button>
          </Link>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function StepCard({ icon: Icon, title, desc }: any) {
  return (
    <div className="border rounded-lg p-3 flex items-start gap-3">
      <div className="h-9 w-9 rounded-md bg-primary/10 flex items-center justify-center shrink-0">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <div>
        <div className="text-sm font-semibold mb-0.5">{title}</div>
        <div className="text-xs text-muted-foreground leading-relaxed">{desc}</div>
      </div>
    </div>
  );
}
