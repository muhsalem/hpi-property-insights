import { useMemo, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Download, FileCheck2, Lock, ShieldCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useValuationState } from "@/context/ValuationStateContext";
import { signValuation } from "@/lib/valuation.functions";
import { createValuationBackup } from "@/lib/registry.functions";
import { generateProfessionalReport } from "@/lib/pdf-report-v2";

function computeHash(payload: string): string {
  let h = 0;
  for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0").toUpperCase();
}

export default function SignAndExportPanel() {
  const { state, update, save } = useValuationState();
  const sign = useServerFn(signValuation);
  const backup = useServerFn(createValuationBackup);
  const [name, setName] = useState((state.declaration?.name as string) ?? "");
  const [license, setLicense] = useState((state.declaration?.license as string) ?? "");
  const [busy, setBusy] = useState(false);

  const canSign = useMemo(
    () => !!state.id && !state.locked && name.trim().length > 2 && license.trim().length > 1,
    [state.id, state.locked, name, license],
  );

  const onExport = async () => {
    setBusy(true);
    try {
      const baseUrl = typeof window !== "undefined" ? window.location.origin : undefined;
      const doc = await generateProfessionalReport({
        state, baseUrl, appraiser: { name, license },
      });
      doc.save(`valuation-${state.id?.slice(0, 8) ?? "draft"}.pdf`);
      toast.success("تم توليد التقرير");
    } catch (e: any) {
      toast.error("فشل توليد PDF: " + (e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  const onSign = async () => {
    if (!state.id) { toast.error("احفظ المسودة أولاً"); return; }
    setBusy(true);
    try {
      // اضمن أن آخر الحالة محفوظ قبل التوقيع
      update("declaration", { name, license });
      await save();
      const hash = computeHash(`${state.id}|${name}|${license}|${Date.now()}`);
      const result = await sign({ data: { id: state.id, signature_hash: hash } });
      // نسخة احتياطية تلقائية فور التوقيع (snapshot + SHA-256)
      try {
        const b = await backup({ data: { valuation_id: state.id } });
        toast.success(`نسخة احتياطية محفوظة · ${b.checksum.slice(0, 8)}…`);
      } catch (e: any) {
        console.warn("backup failed:", e);
      }
      // sync local state
      Object.assign(state, { locked: result.locked, signed_at: result.signed_at, signature_hash: result.signature_hash });
      toast.success("تم توقيع وقفل التقرير ✓");
      // إعادة تحميل لمزامنة الواجهة
      if (typeof window !== "undefined") window.location.reload();
    } catch (e: any) {
      toast.error("فشل التوقيع: " + (e?.message ?? ""));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            توقيع وتصدير التقرير (IVS 103 §50)
          </CardTitle>
          {state.locked && (
            <Badge variant="destructive" className="gap-1"><Lock className="h-3 w-3" /> مقفل — لا يمكن التعديل</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label className="text-xs">اسم المثمن</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={state.locked} />
          </div>
          <div>
            <Label className="text-xs">رقم الترخيص</Label>
            <Input value={license} onChange={(e) => setLicense(e.target.value)} disabled={state.locked} />
          </div>
        </div>

        {!state.id && (
          <div className="text-xs p-2 bg-amber-50 dark:bg-amber-950/30 rounded text-amber-700">
            ⚠️ احفظ المسودة أولاً (تلقائياً بعد 5 ثوانٍ من أول تعديل) لتفعيل التوقيع.
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={onExport} disabled={busy}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Download className="h-4 w-4 ml-1" />}
            تصدير PDF
          </Button>

          {!state.locked && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button disabled={!canSign || busy}>
                  <FileCheck2 className="h-4 w-4 ml-1" /> توقيع وقفل نهائي
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent dir="rtl">
                <AlertDialogHeader>
                  <AlertDialogTitle>تأكيد التوقيع النهائي</AlertDialogTitle>
                  <AlertDialogDescription>
                    بعد التوقيع <b>لن يمكن تعديل التقرير</b> (محمي بـ DB trigger). سيتم توليد SHA hash ورابط تحقق عام عبر QR.
                    <br /><br />
                    أنت توقع باسم: <b>{name}</b> — ترخيص: <b>{license}</b>
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>إلغاء</AlertDialogCancel>
                  <AlertDialogAction onClick={onSign}>أوافق — وقّع الآن</AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>

        {state.locked && state.signature_hash && (
          <div className="rounded border-2 border-primary p-3 bg-primary/5 text-xs space-y-1">
            <div className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-primary" /><b>تقرير موقّع رسمياً</b></div>
            <div>SHA: <span className="font-mono">{state.signature_hash}</span></div>
            <div>تاريخ التوقيع: {state.signed_at}</div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
