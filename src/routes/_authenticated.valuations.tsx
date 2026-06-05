import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { queryOptions, useSuspenseQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Plus, Lock, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { listMyValuations, deleteValuation } from "@/lib/valuation.functions";

const valuationsQuery = queryOptions({
  queryKey: ["my-valuations"],
  queryFn: () => listMyValuations(),
});

export const Route = createFileRoute("/_authenticated/valuations")({
  loader: ({ context }) => context.queryClient.ensureQueryData(valuationsQuery),
  component: ValuationsList,
  errorComponent: ({ error }) => (
    <div role="alert" className="p-4 text-sm text-destructive">تعذّر تحميل التقييمات: {error.message}</div>
  ),
  notFoundComponent: () => <div className="p-4 text-sm">الصفحة غير موجودة.</div>,
});

const fmt = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("ar-EG") + " ج");
const fmtDate = (s: string) => new Date(s).toLocaleString("ar-EG", { dateStyle: "short", timeStyle: "short" });

function ValuationsList() {
  const { data } = useSuspenseQuery(valuationsQuery);
  const router = useRouter();
  const del = useServerFn(deleteValuation);

  const onDelete = async (id: string) => {
    if (!confirm("حذف هذه المسودة؟")) return;
    try {
      await del({ data: { id } });
      toast.success("تم الحذف");
      router.invalidate();
    } catch (e: any) {
      toast.error(e?.message ?? "فشل الحذف");
    }
  };

  return (
    <div dir="rtl" className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="h-6 w-6 text-primary" /> تقييماتي
          </h1>
          <p className="text-sm text-muted-foreground mt-1">إدارة مسودات وتقارير التقييم العقاري</p>
        </div>
        <Button asChild>
          <Link to="/valuate"><Plus className="h-4 w-4 ml-1" /> تقييم جديد</Link>
        </Button>
      </div>

      {data.length === 0 ? (
        <Card><CardContent className="p-8 text-center text-muted-foreground text-sm">
          لا يوجد تقييمات بعد. ابدأ بإنشاء تقييم جديد.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {data.map((v) => (
            <Card key={v.id} className="border-r-4 border-r-primary">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <span className="font-mono text-xs text-muted-foreground">#{v.id.slice(0, 8)}</span>
                    {v.property_id && <Badge variant="outline">{v.property_id}</Badge>}
                    {v.locked && <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> مقفل</Badge>}
                    {v.status === "signed" ? (
                      <Badge className="bg-green-600 text-white">موقّع</Badge>
                    ) : (
                      <Badge variant="secondary">مسودة</Badge>
                    )}
                    <Badge variant="outline" className="uppercase">{v.standard}</Badge>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" asChild>
                      <Link to="/valuate" search={{ id: v.id } as any}>فتح</Link>
                    </Button>
                    {!v.locked && (
                      <Button size="sm" variant="ghost" onClick={() => onDelete(v.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div><div className="text-muted-foreground">القيمة النهائية</div><div className="font-bold text-primary">{fmt(v.final_value as any)}</div></div>
                  <div><div className="text-muted-foreground">آخر تحديث</div><div>{fmtDate(v.updated_at)}</div></div>
                  <div><div className="text-muted-foreground">تاريخ التوقيع</div><div>{v.signed_at ? fmtDate(v.signed_at) : "—"}</div></div>
                  <div><div className="text-muted-foreground">تاريخ الإنشاء</div><div>{fmtDate(v.created_at)}</div></div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
