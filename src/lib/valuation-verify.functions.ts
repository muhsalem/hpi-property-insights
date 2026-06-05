import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

/**
 * Public verification endpoint — لا يتطلب مصادقة
 * يعيد بيانات تحقق محدودة فقط (لا PII)
 */
export const verifyValuation = createServerFn({ method: "GET" })
  .inputValidator((input: unknown) =>
    z.object({ id: z.string().uuid() }).parse(input),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("valuations")
      .select("id, status, locked, signed_at, signature_hash, final_value, standard, property_id, created_at")
      .eq("id", data.id)
      .maybeSingle();
    if (error) return { found: false as const, error: error.message };
    if (!row) return { found: false as const };
    return {
      found: true as const,
      id: row.id,
      isSigned: !!row.signed_at && row.locked,
      signedAt: row.signed_at,
      signatureHash: row.signature_hash,
      finalValue: row.final_value,
      standard: row.standard,
      propertyId: row.property_id,
      createdAt: row.created_at,
      status: row.status,
    };
  });
