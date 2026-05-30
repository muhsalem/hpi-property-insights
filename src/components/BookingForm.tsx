import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CheckCircle2, Loader2 } from "lucide-react";
import { z } from "zod";

const schema = z.object({
  full_name: z.string().trim().min(2, "الاسم قصير").max(100),
  phone: z.string().trim().min(8, "رقم الهاتف غير صحيح").max(20).regex(/^[0-9+\-\s]+$/, "أرقام فقط"),
  email: z.string().trim().email("بريد غير صحيح").max(255).optional().or(z.literal("")),
  property_type: z.string().min(1, "اختر نوع العقار"),
  district: z.string().max(100).optional(),
  area_sqm: z.coerce.number().positive().max(100000).optional(),
  message: z.string().max(1000).optional(),
});

export default function BookingForm() {
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [form, setForm] = useState({
    full_name: "",
    phone: "",
    email: "",
    property_type: "",
    district: "",
    area_sqm: "",
    message: "",
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});
    const parsed = schema.safeParse({ ...form, area_sqm: form.area_sqm || undefined });
    if (!parsed.success) {
      const errs: Record<string, string> = {};
      parsed.error.issues.forEach((i) => { errs[String(i.path[0])] = i.message; });
      setErrors(errs);
      return;
    }
    setLoading(true);
    const { error } = await supabase.from("bookings").insert({
      full_name: parsed.data.full_name,
      phone: parsed.data.phone,
      email: parsed.data.email || null,
      property_type: parsed.data.property_type,
      district: parsed.data.district || null,
      area_sqm: parsed.data.area_sqm || null,
      message: parsed.data.message || null,
    });
    setLoading(false);
    if (!error) setSubmitted(true);
    else setErrors({ form: "تعذّر الإرسال، حاول لاحقاً" });
  };

  if (submitted) {
    return (
      <Card className="border-green-500/30 bg-green-500/5">
        <CardContent className="py-12 text-center">
          <CheckCircle2 className="h-16 w-16 text-green-600 mx-auto mb-4" />
          <h3 className="text-2xl font-bold">تم استلام طلبك</h3>
          <p className="text-muted-foreground mt-2">سيتواصل معك المقيّم خلال 24 ساعة على الرقم المسجّل.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>احجز تقييماً معتمداً</CardTitle>
        <p className="text-sm text-muted-foreground">املأ البيانات وسيتواصل معك خبير التقييم</p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>الاسم بالكامل *</Label>
              <Input value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} maxLength={100} />
              {errors.full_name && <p className="text-xs text-destructive mt-1">{errors.full_name}</p>}
            </div>
            <div>
              <Label>رقم الهاتف *</Label>
              <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} maxLength={20} dir="ltr" />
              {errors.phone && <p className="text-xs text-destructive mt-1">{errors.phone}</p>}
            </div>
          </div>
          <div>
            <Label>البريد الإلكتروني</Label>
            <Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} maxLength={255} dir="ltr" />
            {errors.email && <p className="text-xs text-destructive mt-1">{errors.email}</p>}
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>نوع العقار *</Label>
              <Select value={form.property_type} onValueChange={(v) => setForm({ ...form, property_type: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="شقة">شقة سكنية</SelectItem>
                  <SelectItem value="فيلا">فيلا</SelectItem>
                  <SelectItem value="محل">محل تجاري</SelectItem>
                  <SelectItem value="مكتب">مكتب إداري</SelectItem>
                  <SelectItem value="أرض">أرض</SelectItem>
                  <SelectItem value="عمارة">عمارة</SelectItem>
                  <SelectItem value="مخزن">مخزن/صناعي</SelectItem>
                </SelectContent>
              </Select>
              {errors.property_type && <p className="text-xs text-destructive mt-1">{errors.property_type}</p>}
            </div>
            <div>
              <Label>الحي</Label>
              <Select value={form.district} onValueChange={(v) => setForm({ ...form, district: v })}>
                <SelectTrigger><SelectValue placeholder="اختر..." /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="الشرق">الشرق</SelectItem>
                  <SelectItem value="العرب">العرب</SelectItem>
                  <SelectItem value="المناخ">المناخ</SelectItem>
                  <SelectItem value="الضواحي">الضواحي</SelectItem>
                  <SelectItem value="الزهور">الزهور</SelectItem>
                  <SelectItem value="الجنوب">الجنوب</SelectItem>
                  <SelectItem value="الغرب">الغرب</SelectItem>
                  <SelectItem value="بورفؤاد">بورفؤاد</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>المساحة (م²)</Label>
              <Input type="number" value={form.area_sqm} onChange={(e) => setForm({ ...form, area_sqm: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>ملاحظات</Label>
            <Textarea value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} maxLength={1000} rows={3} />
          </div>
          {errors.form && <p className="text-sm text-destructive">{errors.form}</p>}
          <Button type="submit" size="lg" className="w-full" disabled={loading}>
            {loading ? <><Loader2 className="h-4 w-4 ml-2 animate-spin" />جارٍ الإرسال…</> : "أرسل الطلب"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
