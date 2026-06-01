import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Shield, FileCheck, Edit, Trash2, PlusCircle } from "lucide-react";

const ACTION_META: Record<string, { label: string; icon: any; variant: any }> = {
  INSERT: { label: "إنشاء", icon: PlusCircle, variant: "default" },
  UPDATE: { label: "تعديل", icon: Edit, variant: "secondary" },
  DELETE: { label: "حذف", icon: Trash2, variant: "destructive" },
  SIGN: { label: "توقيع", icon: FileCheck, variant: "default" },
};

export default function AuditLogPanel({ valuationId }: { valuationId?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["audit-log", valuationId],
    queryFn: async () => {
      let q = supabase.from("valuation_audit_log").select("*").order("created_at", { ascending: false }).limit(50);
      if (valuationId) q = q.eq("valuation_id", valuationId);
      const { data } = await q;
      return data || [];
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" />
          سجل التدقيق — Audit Log
        </CardTitle>
        <p className="text-xs text-muted-foreground">سجل قانوني كامل لكل تعديل على التقييمات</p>
      </CardHeader>
      <CardContent>
        {isLoading && <Skeleton className="h-40 w-full" />}
        {!isLoading && !data?.length && (
          <p className="text-sm text-muted-foreground text-center py-8">لا يوجد سجل تدقيق بعد</p>
        )}
        {!isLoading && data && data.length > 0 && (
          <div className="space-y-2 max-h-96 overflow-auto">
            {data.map((log: any) => {
              const meta = ACTION_META[log.action] || ACTION_META.UPDATE;
              const Icon = meta.icon;
              return (
                <div key={log.id} className="flex items-start gap-3 p-3 border rounded text-sm">
                  <Icon className="h-4 w-4 mt-0.5 text-muted-foreground shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant={meta.variant} className="text-[10px]">{meta.label}</Badge>
                      <span className="text-xs text-muted-foreground">
                        {new Date(log.created_at).toLocaleString("ar-EG")}
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      تقييم: <span className="font-mono">{log.valuation_id.slice(0, 8)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
