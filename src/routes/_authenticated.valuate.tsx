import { createFileRoute, useSearch } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect } from "react";
import { z } from "zod";
import { Calculator, Loader2, Home, Scale, ShieldAlert, FileCheck } from "lucide-react";
import ValuationWizardPanel from "@/components/ValuationWizardPanel";
import LandValuationPanel from "@/components/LandValuationPanel";
import PropertyScorePanel from "@/components/PropertyScorePanel";
import BuildingFloorsPanel from "@/components/BuildingFloorsPanel";
import ReconciliationMatrix from "@/components/ReconciliationMatrix";
import ComparableAdjustmentGrid from "@/components/ComparableAdjustmentGrid";
import ValuerDeclarationCard from "@/components/ValuerDeclarationCard";
import HighestBestUsePanel from "@/components/HighestBestUsePanel";
import PriceHistoryChart from "@/components/PriceHistoryChart";
import DcfAnalysisPanel from "@/components/DcfAnalysisPanel";
import SensitivityHeatmap from "@/components/SensitivityHeatmap";
import ForcedSaleValueCard from "@/components/ForcedSaleValueCard";
import InsuranceReinstatementCard from "@/components/InsuranceReinstatementCard";
import EsgScoreCard from "@/components/EsgScoreCard";
import MonteCarloSimulation from "@/components/MonteCarloSimulation";
import ValuationStepper, { type ValuationStep } from "@/components/ValuationStepper";
import SignAndExportPanel from "@/components/SignAndExportPanel";
import { ValuationStateProvider, useValuationState, type ValuationState } from "@/context/ValuationStateContext";
import ValuationSaveStatusBar from "@/components/ValuationSaveStatusBar";
import { loadValuation } from "@/lib/valuation.functions";

const searchSchema = z.object({ id: z.string().uuid().optional() });

export const Route = createFileRoute("/_authenticated/valuate")({
  validateSearch: searchSchema,
  component: ValuatePage,
});

function ValuatePage() {
  const { id } = useSearch({ from: "/_authenticated/valuate" });
  const load = useServerFn(loadValuation);

  // إذا كان هناك id في الـ URL، حمّل التقييم
  const { data: loaded, isLoading } = useQuery({
    queryKey: ["valuation", id],
    queryFn: () => load({ data: { id: id! } }),
    enabled: !!id,
  });

  if (id && isLoading) {
    return (
      <div className="flex items-center justify-center p-12 text-muted-foreground">
        <Loader2 className="h-5 w-5 animate-spin ml-2" /> جاري تحميل التقييم…
      </div>
    );
  }

  const initial: Partial<ValuationState> | undefined = loaded
    ? {
        id: loaded.id,
        property_id: loaded.property_id,
        standard: loaded.standard as any,
        locked: loaded.locked,
        signed_at: loaded.signed_at,
        signature_hash: loaded.signature_hash,
        ...((loaded.subject_snapshot as any) ?? {}),
      }
    : undefined;

  return (
    <ValuationStateProvider initial={initial}>
      <ValuateContent />
    </ValuationStateProvider>
  );
}

function ValuateContent() {
  const { state } = useValuationState();

  // اضبط عنوان الصفحة
  useEffect(() => {
    document.title = state.id ? `تقييم #${state.id.slice(0, 8)}` : "تقييم جديد";
  }, [state.id]);

  const steps: ValuationStep[] = [
    {
      id: "subject",
      label: "بيانات العقار",
      icon: Home,
      content: (
        <div className="space-y-4">
          <ValuationWizardPanel />
        </div>
      ),
    },
    {
      id: "approaches",
      label: "طرق التقييم",
      icon: Calculator,
      content: (
        <div className="space-y-4">
          <PropertyScorePanel />
          <BuildingFloorsPanel />
          <LandValuationPanel propertyId={state.property_id ?? undefined} />
          <ComparableAdjustmentGrid subjectArea={110} />
          <DcfAnalysisPanel />
          <SensitivityHeatmap />
        </div>

      ),
    },
    {
      id: "reconciliation",
      label: "توفيق النتائج",
      icon: Scale,
      content: (
        <div className="space-y-4">
          <HighestBestUsePanel />
          <ReconciliationMatrix />
        </div>
      ),
    },
    {
      id: "risk",
      label: "المخاطر والاستدامة",
      icon: ShieldAlert,
      content: (
        <div className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <ForcedSaleValueCard />
            <InsuranceReinstatementCard />
          </div>
          <EsgScoreCard />
          <MonteCarloSimulation />
        </div>
      ),
    },
    {
      id: "declaration",
      label: "الإقرار والتوقيع",
      icon: FileCheck,
      content: (
        <div className="space-y-4">
          <ValuerDeclarationCard />
          <SignAndExportPanel />
        </div>
      ),
    },
  ];

  return (
    <div dir="rtl" className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Calculator className="h-6 w-6 text-primary" />
          {state.id ? `تقييم #${state.id.slice(0, 8)}` : "تقييم جديد"}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          منصة تقرير تقييم احترافية — 5 خطوات وفق IVS / RICS / EAA
        </p>
      </div>

      <ValuationSaveStatusBar />

      <ValuationStepper steps={steps} />
    </div>
  );
}
