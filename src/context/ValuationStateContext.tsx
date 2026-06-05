import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { saveValuationDraft } from "@/lib/valuation.functions";
import { supabase } from "@/integrations/supabase/client";

/**
 * ValuationStateContext — حالة التقييم المركزية + autosave
 * كل المكونات تقرأ/تكتب عبر `useValuationState()` بدلاً من useState المحلي
 */

export interface ValuationState {
  id?: string;
  property_id?: string | null;
  standard: "egy" | "ivs" | "rics" | "uspap";
  locked: boolean;
  signed_at?: string | null;
  signature_hash?: string | null;
  subject: Record<string, any>;       // Subject + HBU
  approaches: Record<string, any>;    // DCF, Comps, Sensitivity
  reconciliation: Record<string, any>;
  risk: Record<string, any>;          // ESG, Forced Sale, Insurance, MC
  declaration: Record<string, any>;
}

const DEFAULT_STATE: ValuationState = {
  standard: "egy",
  locked: false,
  subject: {},
  approaches: {},
  reconciliation: {},
  risk: {},
  declaration: {},
};

type SaveStatus = "idle" | "saving" | "saved" | "error";

interface Ctx {
  state: ValuationState;
  update: <K extends keyof ValuationState>(key: K, patch: Partial<ValuationState[K]> | ValuationState[K]) => void;
  setState: (s: ValuationState) => void;
  save: () => Promise<void>;
  saveStatus: SaveStatus;
  lastSavedAt?: Date;
  isDirty: boolean;
}

const ValuationStateContext = createContext<Ctx | null>(null);

export function useValuationState() {
  const ctx = useContext(ValuationStateContext);
  if (!ctx) throw new Error("useValuationState must be used inside <ValuationStateProvider />");
  return ctx;
}

interface ProviderProps {
  initial?: Partial<ValuationState>;
  children: ReactNode;
  /** ms between autosaves (default 5000) */
  autosaveMs?: number;
}

export function ValuationStateProvider({ initial, children, autosaveMs = 5000 }: ProviderProps) {
  const [state, setStateRaw] = useState<ValuationState>({ ...DEFAULT_STATE, ...initial });
  const [saveStatus, setSaveStatus] = useState<SaveStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | undefined>();
  const [isDirty, setIsDirty] = useState(false);
  const save = useServerFn(saveValuationDraft);
  const stateRef = useRef(state);
  stateRef.current = state;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update: Ctx["update"] = useCallback((key, patch) => {
    setStateRaw((prev) => {
      const current = prev[key] as any;
      const next = typeof patch === "object" && patch !== null && !Array.isArray(patch)
        ? { ...current, ...patch }
        : patch;
      return { ...prev, [key]: next };
    });
    setIsDirty(true);
  }, []);

  const setState = useCallback((s: ValuationState) => {
    setStateRaw(s);
    setIsDirty(true);
  }, []);

  const doSave = useCallback(async () => {
    if (stateRef.current.locked) return;
    setSaveStatus("saving");
    try {
      const s = stateRef.current;
      const payload = {
        id: s.id,
        property_id: s.property_id ?? null,
        standard: s.standard,
        subject_snapshot: {
          subject: s.subject,
          approaches: s.approaches,
          reconciliation: s.reconciliation,
          risk: s.risk,
          declaration: s.declaration,
        },
        sales_value: s.approaches?.salesValue ?? null,
        cost_value: s.approaches?.costValue ?? null,
        income_value: s.approaches?.incomeValue ?? null,
        final_value: s.reconciliation?.final ?? null,
      };
      const result = await save({ data: payload });
      setStateRaw((prev) => ({ ...prev, id: result.id }));
      setLastSavedAt(new Date());
      setIsDirty(false);
      setSaveStatus("saved");
    } catch (e: any) {
      console.error("autosave failed", e);
      setSaveStatus("error");
      toast.error("فشل الحفظ التلقائي: " + (e?.message ?? "خطأ غير معروف"));
    }
  }, [save]);

  // Autosave (debounced)
  useEffect(() => {
    if (!isDirty || state.locked) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => { void doSave(); }, autosaveMs);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [state, isDirty, autosaveMs, doSave]);

  const value = useMemo<Ctx>(() => ({
    state, update, setState, save: doSave, saveStatus, lastSavedAt, isDirty,
  }), [state, update, setState, doSave, saveStatus, lastSavedAt, isDirty]);

  return <ValuationStateContext.Provider value={value}>{children}</ValuationStateContext.Provider>;
}
