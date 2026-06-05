import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, ShieldAlert, Loader2, FileX } from "lucide-react";
import { verifyValuation } from "@/lib/valuation-verify.functions";

export const Route = createFileRoute("/verify/$id")({
  component: VerifyPage,
  head: () => ({
    meta: [
      { title: "تحقق من تقرير تقييم" },
      { name: "description", content: "صفحة التحقق العام من صحة تقرير تقييم عقاري موقّع" },
    ],
  }),
});

const fmt = (n: number | null) => (n == null ? "—" : Math.round(n).toLocaleString("ar-EG") + " ج");
const fmtDate = (s: string | null) => (s ? new Date(s).toLocaleString("ar-EG") : "—");

function VerifyPage() {
  const { id } = Route.useParams();
  const verify = useServerFn(verifyValuation);
  const { data, isLoading } = useQuery({
    queryKey: ["verify", id],
    queryFn: () => verify({ data: { id } }),
  });

  return (
    <div dir="rtl" className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
      <Card className="w-full max-w-xl border-r-4 border-r-primary">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> :
              data?.found && data.isSigned ? <ShieldCheck className="h-6 w-6 text-green-600" /> :
              data?.found ? <ShieldAlert className="h-6 w-6 text-amber-600" /> :
              <FileX className="h-6 w-6 text-destructive" />}
            التحقق من تقرير التقييم
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          {isLoading && <div className="text-muted-foreground">جارٍ التحقق…</div>}
          {data && !data.found && (
            <div className="rounded border-2 border-destructive/30 bg-destructive/5 p-4 text-destructive">
              ❌ التقرير غير موجود أو معرّفه غير صحيح.
            </div>
          )}
          {data?.found && (
            <>
              <div className={`rounded border-2 p-4 ${data.isSigned ? "border-green-600/40 bg-green-50 dark:bg-green-950/30" : "border-amber-600/40 bg-amber-50 dark:bg-amber-950/30"}`}>
                <div className="text-base font-bold mb-1">
                  {data.isSigned ? "✅ تقرير موقّع رسمياً ومقفل" : "⚠️ تقرير مسودة — لم يُوقّع بعد"}
                </div>
                <div className="text-xs text-muted-foreground">
                  {data.isSigned ? "هذا التقرير محمي ضد التعديل بعد التوقيع الرقمي." : "هذا التقرير لا يزال قابلاً للتعديل."}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <Field label="رقم التقرير" value={data.id.slice(0, 8) + "…"} mono />
                <Field label="المعيار" value={(data.standard ?? "").toUpperCase()} />
                <Field label="القيمة النهائية" value={fmt(data.finalValue as any)} />
                <Field label="العقار" value={data.propertyId ?? "—"} />
                <Field label="تاريخ التوقيع" value={fmtDate(data.signedAt)} />
                <Field label="تاريخ الإنشاء" value={fmtDate(data.createdAt)} />
              </div>

              {data.signatureHash && (
                <div className="rounded border p-3 bg-muted/30">
                  <div className="text-[10px] text-muted-foreground mb-1">SHA Hash (للتحقق):</div>
                  <div className="font-mono text-xs break-all">{data.signatureHash}</div>
                </div>
              )}

              <Badge variant="outline" className="w-full justify-center py-2">
                التحقق متاح للعموم — لا توجد بيانات حساسة في هذه الصفحة
              </Badge>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded border p-2">
      <div className="text-[10px] text-muted-foreground">{label}</div>
      <div className={`font-semibold ${mono ? "font-mono" : ""}`}>{value}</div>
    </div>
  );
}
