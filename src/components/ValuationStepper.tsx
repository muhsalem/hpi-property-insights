import { useState, type ReactNode } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { ChevronRight, ChevronLeft, Check, Home, Calculator, Scale, ShieldAlert, FileCheck } from "lucide-react";
import { cn } from "@/lib/utils";

export interface ValuationStep {
  id: string;
  label: string;
  icon: typeof Home;
  content: ReactNode;
}

interface Props {
  steps: ValuationStep[];
  /** Optional callback when user advances */
  onStepChange?: (idx: number) => void;
}

const STEP_ICONS = { subject: Home, approaches: Calculator, reconciliation: Scale, risk: ShieldAlert, declaration: FileCheck };

export default function ValuationStepper({ steps, onStepChange }: Props) {
  const [active, setActive] = useState(0);
  const total = steps.length;
  const progress = ((active + 1) / total) * 100;
  const go = (i: number) => {
    const next = Math.max(0, Math.min(total - 1, i));
    setActive(next);
    onStepChange?.(next);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-3">
      <Card className="border-r-4 border-r-primary">
        <CardContent className="p-3 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 flex-1">
              {steps.map((s, i) => {
                const Icon = s.icon;
                const isActive = i === active;
                const isDone = i < active;
                return (
                  <button
                    key={s.id}
                    onClick={() => go(i)}
                    className={cn(
                      "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs whitespace-nowrap border transition",
                      isActive && "bg-primary text-primary-foreground border-primary shadow",
                      isDone && !isActive && "bg-green-600/10 text-green-700 border-green-600/30",
                      !isActive && !isDone && "bg-muted/40 text-muted-foreground hover:bg-muted",
                    )}
                  >
                    {isDone ? <Check className="h-3.5 w-3.5" /> : <Icon className="h-3.5 w-3.5" />}
                    <span className="font-semibold">{i + 1}.</span>
                    <span>{s.label}</span>
                  </button>
                );
              })}
            </div>
            <Badge variant="outline" className="shrink-0">{active + 1} / {total}</Badge>
          </div>
          <Progress value={progress} className="h-1.5" />
        </CardContent>
      </Card>

      <div className="min-h-[400px]">
        {steps[active]?.content}
      </div>

      <div className="flex items-center justify-between pt-2 border-t">
        <Button variant="outline" onClick={() => go(active - 1)} disabled={active === 0}>
          <ChevronRight className="h-4 w-4 ml-1" /> السابق
        </Button>
        <span className="text-xs text-muted-foreground">
          {steps[active]?.label}
        </span>
        <Button onClick={() => go(active + 1)} disabled={active === total - 1}>
          التالي <ChevronLeft className="h-4 w-4 mr-1" />
        </Button>
      </div>
    </div>
  );
}

export { STEP_ICONS };
