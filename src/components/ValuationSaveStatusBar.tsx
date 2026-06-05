import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, AlertCircle, Save, Lock } from "lucide-react";
import { useValuationState } from "@/context/ValuationStateContext";

export default function ValuationSaveStatusBar() {
  const { saveStatus, lastSavedAt, isDirty, save, state } = useValuationState();

  const fmtTime = (d?: Date) =>
    d ? d.toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit", second: "2-digit" }) : "—";

  return (
    <div className="sticky top-0 z-40 flex items-center justify-between gap-3 rounded-lg border bg-card/95 backdrop-blur px-3 py-2 shadow-sm">
      <div className="flex items-center gap-2 text-xs">
        {state.locked && (
          <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> مقفل / موقّع</Badge>
        )}
        {state.id ? (
          <Badge variant="outline" className="font-mono text-[10px]">#{state.id.slice(0, 8)}</Badge>
        ) : (
          <Badge variant="secondary">مسودة جديدة</Badge>
        )}
        {saveStatus === "saving" && (
          <span className="flex items-center gap-1 text-muted-foreground"><Loader2 className="h-3 w-3 animate-spin" /> يحفظ…</span>
        )}
        {saveStatus === "saved" && !isDirty && (
          <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="h-3 w-3" /> محفوظ — {fmtTime(lastSavedAt)}</span>
        )}
        {saveStatus === "error" && (
          <span className="flex items-center gap-1 text-destructive"><AlertCircle className="h-3 w-3" /> فشل الحفظ</span>
        )}
        {isDirty && saveStatus !== "saving" && (
          <span className="text-amber-600">تغييرات غير محفوظة…</span>
        )}
      </div>
      <Button size="sm" variant="outline" onClick={() => void save()} disabled={saveStatus === "saving" || state.locked}>
        <Save className="h-3.5 w-3.5 ml-1" /> حفظ الآن
      </Button>
    </div>
  );
}
