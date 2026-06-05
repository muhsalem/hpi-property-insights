import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Valuation persistence layer — IVS 103 §60 (Record keeping)
 * طبقة حفظ التقييمات: مسودة → توقيع → قفل
 */

const SnapshotSchema = z.record(z.string(), z.any());

const SaveSchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().optional().nullable(),
  subject_snapshot: SnapshotSchema,
  standard: z.enum(["egy", "ivs", "rics", "uspap"]).default("egy"),
  notes: z.string().max(5000).optional().nullable(),
  sales_value: z.number().nullable().optional(),
  cost_value: z.number().nullable().optional(),
  income_value: z.number().nullable().optional(),
  final_value: z.number().nullable().optional(),
  weights: z.record(z.string(), z.number()).optional(),
  adjustment_grid: z.array(z.any()).optional(),
});

/** UPSERT مسودة تقييم */
export const saveValuationDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = {
      ...data,
      appraiser_id: userId,
      status: "draft" as const,
      updated_at: new Date().toISOString(),
    };

    if (data.id) {
      const { data: updated, error } = await supabase
        .from("valuations")
        .update(row)
        .eq("id", data.id)
        .eq("appraiser_id", userId)
        .select("id, updated_at, status, locked, signed_at")
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }

    const { data: inserted, error } = await supabase
      .from("valuations")
      .insert(row)
      .select("id, updated_at, status, locked, signed_at")
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

/** قراءة تقييم */
export const loadValuation = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: row, error } = await supabase
      .from("valuations")
      .select("*")
      .eq("id", data.id)
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

/** قائمة تقييمات المثمّن */
export const listMyValuations = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data, error } = await supabase
      .from("valuations")
      .select("id, property_id, status, locked, final_value, signed_at, updated_at, created_at, standard")
      .eq("appraiser_id", userId)
      .order("updated_at", { ascending: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return data ?? [];
  });

/** توقيع وقفل التقرير — IVS 103 §50 */
export const signValuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({
      id: z.string().uuid(),
      signature_hash: z.string().min(8).max(128),
    }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("valuations")
      .update({
        status: "signed",
        locked: true,
        signed_at: new Date().toISOString(),
        signed_by: userId,
        signature_hash: data.signature_hash,
      })
      .eq("id", data.id)
      .eq("appraiser_id", userId)
      .select("id, locked, signed_at, signature_hash, status")
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

/** حذف مسودة (غير الموقّعة فقط — trigger يمنع الموقّعة) */
export const deleteValuation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("valuations")
      .delete()
      .eq("id", data.id)
      .eq("appraiser_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
