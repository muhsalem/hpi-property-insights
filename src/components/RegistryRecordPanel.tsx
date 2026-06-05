import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Landmark, Plus, ShieldCheck, Trash2, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import {
  upsertRegistryRecord,
  listRegistryByProperty,
  verifyRegistryRecord,
  deleteRegistryRecord,
} from "@/lib/registry.functions";

const PORT_SAID_OFFICES = [
  "مأمورية شهر عقاري بورسعيد",
  "مأمورية شهر عقاري بورفؤاد",
  "مكتب توثيق بورسعيد",
];

const DEED_LABELS: Record<string, string> = {
  sale: "بيع",
  gift: "هبة",
  mortgage: "رهن",
  inheritance: "ميراث",
  release: "إفراغ/شطب",
  other: "أخرى",
};

const STATUS_META: Record<string, { label: string; color: string }> = {
  registered:   { label: "مسجل ✅",        color: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  pending:      { label: "قيد التسجيل ⏳", color: "bg-amber-100 text-amber-700 border-amber-300" },
  unregistered: { label: "غير مسجل",       color: "bg-slate-100 text-slate-700 border-slate-300" },
  disputed:     { label: "متنازع عليه ⚠️", color: "bg-red-100 text-red-700 border-red-300" },
  unknown:      { label: "غير معروف",      color: "bg-gray-100 text-gray-600 border-gray-300" },
};

type FormState = {
  id?: string;
  registry_office: string;
  registration_no: string;
  registration_date: string;
  deed_type: "sale" | "gift" | "mortgage" | "inheritance" | "release" | "other";
  status: "registered" | "pending" | "unregistered" | "disputed" | "unknown";
  owner_name: string;
  notes: string;
};

const emptyForm: FormState = {
  registry_office: PORT_SAID_OFFICES[0],
  registration_no: "",
  registration_date: "",
  deed_type: "sale",
  status: "unknown",
  owner_name: "",
  notes: "",
};

export default function RegistryRecordPanel({ propertyId }: { propertyId: string }) {
  const qc = useQueryClient();
  const list = useServerFn(listRegistryByProperty);
  const upsert = useServerFn(upsertRegistryRecord);
  const verify = useServerFn(verifyRegistryRecord);
  const del = useServerFn(deleteRegistryRecord);

  const { data: records = [], isLoading } = useQuery({
    queryKey: ["registry", propertyId],
    queryFn: () => list({ data: { property_id: propertyId } }),
    enabled: !!propertyId,
  });

  const [form, setForm] = useState<FormState>(emptyForm);
  const [open, setOpen] = useState(false);

  const saveMut = useMutation({
    mutationFn: () =>
      upsert({
        data: {
          ...form,
          property_id: propertyId,
          registration_no: form.registration_no || null,
          registration_date: form.registration_date || null,
          owner_name: form.owner_name || null,
          notes: form.notes || null,
          parties: [],
          document_refs: [],
        } as any,
      }),
    onSuccess: () => {
      toast.success("تم الحفظ بسجل الشهر العقاري");
      setForm(emptyForm);
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["registry", propertyId] });
    },
    onError: (e: any) => toast.error(e.message ?? "فشل الحفظ"),
  });

  const verifyMut = useMutation({
    mutationFn: (id: string) => verify({ data: { id } }),
    onSuccess: () => {
      toast.success("تم تثبيت التحقق من السجل");
      qc.invalidateQueries({ queryKey: ["registry", propertyId] });
    },
  });

  const delMut = useMutation({
    mutationFn: (id: string) => del({ data: { id } }),
    onSuccess: () => {
      toast.success("تم حذف السجل");
      qc.invalidateQueries({ queryKey: ["registry", propertyId] });
    },
  });

  return (
    <Card dir="rtl">
      <CardHeader>
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <Landmark className="h-5 w-5 text-primary" />
              الشهر العقاري الإلكتروني
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              تكامل يدوي مع مصلحة الشهر العقاري والتوثيق — يدعم إثبات الملكية ونوع التصرف لتعزيز التقييم
            </p>
          </div>
          <Button size="sm" onClick={() => setOpen((o) => !o)}>
            <Plus className="h-4 w-4 ml-1" /> سجل جديد
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {open && (
          <div className="border rounded-lg p-3 bg-muted/30 space-y-3">
            <div className="grid md:grid-cols-2 gap-3">
              <Field label="مأمورية الشهر العقاري">
                <Select value={form.registry_office} onValueChange={(v) => setForm({ ...form, registry_office: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PORT_SAID_OFFICES.map((o) => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="رقم القيد / رقم الشهر">
                <Input
                  value={form.registration_no}
                  onChange={(e) => setForm({ ...form, registration_no: e.target.value })}
                  placeholder="مثال: 12345 لسنة 2024"
                />
              </Field>
              <Field label="نوع التصرف">
                <Select value={form.deed_type} onValueChange={(v: any) => setForm({ ...form, deed_type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(DEED_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="حالة التسجيل">
                <Select value={form.status} onValueChange={(v: any) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_META).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </Field>
              <Field label="تاريخ التسجيل">
                <Input
                  type="date"
                  value={form.registration_date}
                  onChange={(e) => setForm({ ...form, registration_date: e.target.value })}
                />
              </Field>
              <Field label="اسم المالك">
                <Input
                  value={form.owner_name}
                  onChange={(e) => setForm({ ...form, owner_name: e.target.value })}
                />
              </Field>
            </div>
            <Field label="ملاحظات">
              <Textarea
                rows={2}
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </Field>
            <div className="flex gap-2 justify-end">
              <Button variant="ghost" size="sm" onClick={() => { setForm(emptyForm); setOpen(false); }}>إلغاء</Button>
              <Button size="sm" onClick={() => saveMut.mutate()} disabled={saveMut.isPending}>
                {saveMut.isPending && <Loader2 className="h-3 w-3 animate-spin ml-1" />}
                حفظ السجل
              </Button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="text-sm text-muted-foreground py-6 text-center">جاري التحميل…</div>
        ) : records.length === 0 ? (
          <div className="text-sm text-muted-foreground py-6 text-center border border-dashed rounded-lg">
            لا توجد سجلات شهر عقاري لهذا العقار بعد. أضف سجلاً لتعزيز قوة التقييم.
          </div>
        ) : (
          <div className="space-y-2">
            {records.map((r) => {
              const meta = STATUS_META[r.status as string] ?? STATUS_META.unknown;
              return (
                <div key={r.id} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={meta.color}>{meta.label}</Badge>
                        <Badge variant="secondary" className="text-[10px]">
                          {DEED_LABELS[r.deed_type as string] ?? r.deed_type}
                        </Badge>
                        {r.verified_at && (
                          <Badge className="bg-blue-600 text-[10px]">
                            <ShieldCheck className="h-3 w-3 ml-1" /> مُتحقَّق
                          </Badge>
                        )}
                      </div>
                      <div className="text-sm font-semibold mt-1.5">{r.registry_office}</div>
                      <div className="text-xs text-muted-foreground grid grid-cols-2 gap-x-3 gap-y-0.5 mt-1">
                        {r.registration_no && <div>📋 رقم: <b>{r.registration_no}</b></div>}
                        {r.registration_date && <div>📅 تاريخ: <b>{new Date(r.registration_date).toLocaleDateString("ar-EG")}</b></div>}
                        {r.owner_name && <div>👤 المالك: <b>{r.owner_name}</b></div>}
                      </div>
                      {r.notes && <div className="text-xs text-muted-foreground mt-1 italic">{r.notes}</div>}
                    </div>
                    <div className="flex gap-1">
                      {!r.verified_at && (
                        <Button size="sm" variant="outline" onClick={() => verifyMut.mutate(r.id)}>
                          <ShieldCheck className="h-3.5 w-3.5" />
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" onClick={() => delMut.mutate(r.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-2.5 bg-blue-50 border border-blue-200 rounded text-[11px] text-blue-900 leading-relaxed flex items-start gap-2">
          <ExternalLink className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          <div>
            للتحقق الرسمي ادخل على بوابة الحكومة المصرية للخدمات الإلكترونية:{" "}
            <a
              href="https://www.egypt.gov.eg/arabic/services/category-of-services/real-estate-publicity/default.aspx"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              خدمات الشهر العقاري والتوثيق
            </a>
            {" — "}يمكنك الاستعلام عن صحيفة العقار، طلب صحيفة ملكية، وحجز ميعاد توثيق.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <Label className="text-xs">{label}</Label>
      {children}
    </div>
  );
}
