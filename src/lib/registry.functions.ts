import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * طبقة الشهر العقاري الإلكتروني — Egyptian Real Estate Registry
 * يدعم إدخال يدوي + بنية جاهزة لتكامل مستقبلي مع بوابة الشهر العقاري
 */

const RegistrySchema = z.object({
  id: z.string().uuid().optional(),
  property_id: z.string().min(1).max(255),
  registry_office: z.string().min(2).max(255),
  registration_no: z.string().max(100).nullable().optional(),
  registration_date: z.string().nullable().optional(),
  deed_type: z.enum(["sale", "gift", "mortgage", "inheritance", "release", "other"]).default("sale"),
  status: z.enum(["registered", "pending", "unregistered", "disputed", "unknown"]).default("unknown"),
  owner_name: z.string().max(255).nullable().optional(),
  parties: z.array(z.record(z.string(), z.any())).default([]),
  document_refs: z.array(z.string().max(500)).default([]),
  notes: z.string().max(3000).nullable().optional(),
});

export const upsertRegistryRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => RegistrySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const row = { ...data, appraiser_id: userId };
    if (data.id) {
      const { data: updated, error } = await supabase
        .from("registry_records")
        .update(row)
        .eq("id", data.id)
        .eq("appraiser_id", userId)
        .select()
        .single();
      if (error) throw new Error(error.message);
      return updated;
    }
    const { data: inserted, error } = await supabase
      .from("registry_records")
      .insert(row)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return inserted;
  });

export const listRegistryByProperty = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ property_id: z.string() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("registry_records")
      .select("*")
      .eq("appraiser_id", userId)
      .eq("property_id", data.property_id)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const verifyRegistryRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: updated, error } = await supabase
      .from("registry_records")
      .update({ verified_at: new Date().toISOString(), verified_by: userId })
      .eq("id", data.id)
      .eq("appraiser_id", userId)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return updated;
  });

export const deleteRegistryRecord = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("registry_records")
      .delete()
      .eq("id", data.id)
      .eq("appraiser_id", userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

/** نسخة احتياطية يدوية لتقييم — تُستدعى من زر "نسخ احتياطي" أو تلقائياً عند التوقيع */
export const createValuationBackup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ valuation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: v, error: rerr } = await supabase
      .from("valuations")
      .select("*")
      .eq("id", data.valuation_id)
      .eq("appraiser_id", userId)
      .single();
    if (rerr || !v) throw new Error(rerr?.message ?? "Valuation not found");

    // SHA-256 checksum
    const json = JSON.stringify(v);
    const enc = new TextEncoder().encode(json);
    const buf = await crypto.subtle.digest("SHA-256", enc);
    const checksum = Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    const { data: backup, error } = await supabase
      .from("valuation_backups")
      .insert({
        valuation_id: data.valuation_id,
        appraiser_id: userId,
        snapshot: v,
        checksum,
        signed_at: v.signed_at,
      })
      .select("id, checksum, created_at")
      .single();
    if (error) throw new Error(error.message);
    return backup;
  });

export const listValuationBackups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ valuation_id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: rows, error } = await supabase
      .from("valuation_backups")
      .select("id, checksum, signed_at, created_at")
      .eq("valuation_id", data.valuation_id)
      .eq("appraiser_id", userId)
      .order("created_at", { ascending: false });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });
