import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import ValuationWizardPanel from "@/components/ValuationWizardPanel";

export const Route = createFileRoute("/_authenticated/valuate")({ component: ValuatePage });

function ValuatePage() {
  return (
    <div dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          تقييم جديد
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          منصة تقرير تقييم بأسلوب Wizard — 5 خطوات · مع خيار AVM للملء التلقائي بالذكاء الاصطناعي
        </p>
      </div>
      <ValuationWizardPanel />
    </div>
  );
}
