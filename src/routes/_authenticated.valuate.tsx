import { createFileRoute } from "@tanstack/react-router";
import { Calculator } from "lucide-react";
import ValuationWizardPanel from "@/components/ValuationWizardPanel";
import ReconciliationMatrix from "@/components/ReconciliationMatrix";
import ComparableAdjustmentGrid from "@/components/ComparableAdjustmentGrid";
import ValuerDeclarationCard from "@/components/ValuerDeclarationCard";
import HighestBestUsePanel from "@/components/HighestBestUsePanel";
import DcfAnalysisPanel from "@/components/DcfAnalysisPanel";
import SensitivityHeatmap from "@/components/SensitivityHeatmap";
import ForcedSaleValueCard from "@/components/ForcedSaleValueCard";
import InsuranceReinstatementCard from "@/components/InsuranceReinstatementCard";
import EsgScoreCard from "@/components/EsgScoreCard";
import MonteCarloSimulation from "@/components/MonteCarloSimulation";

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
          منصة تقرير تقييم احترافية — Wizard + مصفوفة توفيق + جدول تعديلات + إقرار مثمن (IVS / RICS / EAA)
        </p>
      </div>

      <ValuationWizardPanel />

      {/* ⭐ المرحلة 1 — الأساسيات القانونية */}
      <HighestBestUsePanel />
      <ComparableAdjustmentGrid subjectArea={110} />
      <ReconciliationMatrix />

      {/* ⭐ المرحلة 2 — التحليل المالي العميق */}
      <DcfAnalysisPanel />
      <SensitivityHeatmap />

      {/* ⭐ المرحلة 3 — المخاطر والاستدامة */}
      <div className="grid md:grid-cols-2 gap-4">
        <ForcedSaleValueCard />
        <InsuranceReinstatementCard />
      </div>
      <EsgScoreCard />
      <MonteCarloSimulation />

      {/* ⭐ الإقرار النهائي */}
      <ValuerDeclarationCard />
    </div>
  );
}
