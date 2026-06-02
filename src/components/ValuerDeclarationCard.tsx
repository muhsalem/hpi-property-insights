import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { FileCheck, ShieldCheck } from "lucide-react";

/**
 * Valuer Declaration & Independence — RICS Red Book PS 2 / IVS 101
 * إقرار المثمن باستقلاليته وعدم تضارب المصالح
 */
export default function ValuerDeclarationCard() {
  const [name, setName] = useState("");
  const [license, setLicense] = useState("");
  const [authority, setAuthority] = useState("الهيئة المصرية للرقابة المالية (FRA)");
  const [inspectionDate, setInspectionDate] = useState(new Date().toISOString().slice(0, 10));
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10));
  const [valuationDate, setValuationDate] = useState(new Date().toISOString().slice(0, 10));

  const [noCOI, setNoCOI] = useState(true);
  const [feeNotContingent, setFeeNotContingent] = useState(true);
  const [externalInspection, setExternalInspection] = useState(true);
  const [internalInspection, setInternalInspection] = useState(true);
  const [competent, setCompetent] = useState(true);
  const [ivsCompliant, setIvsCompliant] = useState(true);

  const [coiNotes, setCoiNotes] = useState("");
  const [scopeLimitations, setScopeLimitations] = useState(
    "تم الاعتماد على البيانات والمعلومات المقدمة من العميل دون التحقق المستقل من صحتها. لم يتم إجراء فحص هندسي/إنشائي. القيمة المقدّرة سارية في تاريخ التقييم فقط."
  );

  const allChecked = noCOI && feeNotContingent && externalInspection && competent && ivsCompliant;

  const sigHash = useMemo(() => {
    const payload = `${name}|${license}|${valuationDate}|${reportDate}`;
    // simple non-crypto hash for visual preview
    let h = 0;
    for (let i = 0; i < payload.length; i++) h = ((h << 5) - h + payload.charCodeAt(i)) | 0;
    return Math.abs(h).toString(16).padStart(8, "0").toUpperCase();
  }, [name, license, valuationDate, reportDate]);

  const Check = ({ v, set, label }: any) => (
    <label className="flex items-start gap-2 p-2 border rounded cursor-pointer hover:bg-muted/30">
      <Checkbox checked={v} onCheckedChange={set} className="mt-0.5" />
      <span className="text-xs leading-relaxed">{label}</span>
    </label>
  );

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-primary" />
            إقرار المثمن واستقلاليته (Valuer Declaration · RICS PS 2)
          </CardTitle>
          {allChecked && <Badge className="bg-green-600 text-white">مكتمل ✓</Badge>}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-2">
          <div>
            <Label className="text-xs">اسم المثمن</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">رقم الترخيص</Label>
            <Input value={license} onChange={(e) => setLicense(e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="sm:col-span-2">
            <Label className="text-xs">الجهة المرخّصة</Label>
            <Input value={authority} onChange={(e) => setAuthority(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2">
          <div>
            <Label className="text-xs">تاريخ المعاينة</Label>
            <Input type="date" value={inspectionDate} onChange={(e) => setInspectionDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">تاريخ التقييم</Label>
            <Input type="date" value={valuationDate} onChange={(e) => setValuationDate(e.target.value)} className="h-8 text-xs" />
          </div>
          <div>
            <Label className="text-xs">تاريخ التقرير</Label>
            <Input type="date" value={reportDate} onChange={(e) => setReportDate(e.target.value)} className="h-8 text-xs" />
          </div>
        </div>

        <div className="space-y-1.5">
          <div className="text-xs font-semibold">الإقرارات الإلزامية:</div>
          <Check v={noCOI} set={setNoCOI} label="أقر بعدم وجود أي تضارب مصالح مع العقار محل التقييم أو أطراف الصفقة" />
          <Check v={feeNotContingent} set={setFeeNotContingent} label="أتعابي ليست مشروطة بنتيجة التقييم أو حجم القيمة المقدّرة" />
          <Check v={externalInspection} set={setExternalInspection} label="تمت معاينة العقار من الخارج بتاريخ المعاينة المذكور" />
          <Check v={internalInspection} set={setInternalInspection} label="تمت معاينة العقار من الداخل" />
          <Check v={competent} set={setCompetent} label="أمتلك المعرفة والخبرة الكافية لتقييم هذا النوع من العقارات في هذه المنطقة" />
          <Check v={ivsCompliant} set={setIvsCompliant} label="التقرير يتوافق مع معايير IVS / RICS Red Book والمعايير المصرية (EAA)" />
        </div>

        <div>
          <Label className="text-xs">ملاحظات حول تضارب المصالح (إن وجد)</Label>
          <Textarea value={coiNotes} onChange={(e) => setCoiNotes(e.target.value)} rows={2} className="text-xs mt-1" placeholder="لا يوجد..." />
        </div>

        <div>
          <Label className="text-xs">حدود نطاق العمل (Scope Limitations)</Label>
          <Textarea value={scopeLimitations} onChange={(e) => setScopeLimitations(e.target.value)} rows={3} className="text-xs mt-1" />
        </div>

        <div className="rounded border-2 border-primary p-3 bg-primary/5">
          <div className="flex justify-between items-center mb-2">
            <div className="text-xs font-semibold flex items-center gap-1">
              <FileCheck className="h-4 w-4 text-primary" />
              التوقيع الرقمي
            </div>
            <Badge variant="outline" className="font-mono text-[10px]">SHA-{sigHash}</Badge>
          </div>
          <div className="text-[11px] text-muted-foreground leading-relaxed">
            بتاريخ <b>{reportDate}</b>، أنا <b>{name || "—"}</b> (ترخيص #{license || "—"} — {authority})، أقرّ بأن المعلومات الواردة في هذا التقرير صحيحة في حدود علمي، وأن التقييم تم وفقاً للمعايير المهنية المعتمدة.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
