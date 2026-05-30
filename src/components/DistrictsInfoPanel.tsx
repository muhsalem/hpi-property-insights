import { useState } from "react";
import { DISTRICTS_INFO, type DistrictInfoFull } from "@/lib/districts-info";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { fmt } from "@/lib/valuation";
import {
  Building2, Phone, MapPin, Users, Ruler, Hospital, GraduationCap,
  Church, ShoppingBasket, Trees, Landmark, Compass,
} from "lucide-react";

function ServiceStat({ icon: Icon, label, value }: { icon: any; label: string; value?: number }) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-card p-2">
      <Icon className="h-4 w-4 text-primary shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-[10px] text-muted-foreground truncate">{label}</div>
        <div className="text-sm font-bold">{fmt(value)}</div>
      </div>
    </div>
  );
}

function DistrictCard({ d }: { d: DistrictInfoFull }) {
  const density = d.population && d.area_km2 ? Math.round(d.population / d.area_km2) : null;
  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2 flex-wrap">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              {d.name}
            </CardTitle>
            {d.address && (
              <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                <MapPin className="h-3 w-3" /> {d.address}
              </p>
            )}
            {d.phone && (
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                <Phone className="h-3 w-3" /> {d.phone}
              </p>
            )}
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {d.population && (
              <Badge variant="secondary" className="gap-1">
                <Users className="h-3 w-3" /> {fmt(d.population)}
                {d.populationDate && <span className="opacity-60 text-[9px]">({d.populationDate})</span>}
              </Badge>
            )}
            {d.area_km2 && (
              <Badge variant="outline" className="gap-1">
                <Ruler className="h-3 w-3" /> {d.area_km2} كم²
              </Badge>
            )}
            {density && (
              <Badge className="gap-1">كثافة {fmt(density)}/كم²</Badge>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* الحدود */}
        <section>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
            <Compass className="h-4 w-4 text-primary" /> الحدود الإدارية
          </h4>
          <div className="grid sm:grid-cols-2 gap-2 text-xs">
            {d.boundaries.north && <div className="rounded border p-2"><b>شمالاً (بحري):</b> {d.boundaries.north}</div>}
            {d.boundaries.south && <div className="rounded border p-2"><b>جنوباً:</b> {d.boundaries.south}</div>}
            {d.boundaries.east && <div className="rounded border p-2"><b>شرقاً:</b> {d.boundaries.east}</div>}
            {d.boundaries.west && <div className="rounded border p-2"><b>غرباً:</b> {d.boundaries.west}</div>}
            {d.boundaries.qibli && <div className="rounded border p-2 sm:col-span-2"><b>قبلياً:</b> {d.boundaries.qibli}</div>}
          </div>
        </section>

        {/* الشياخات */}
        {d.sheyakhat && d.sheyakhat.length > 0 && (
          <section>
            <h4 className="text-sm font-semibold mb-2">الشياخات</h4>
            <div className="grid sm:grid-cols-2 gap-2 text-xs">
              {d.sheyakhat.map((s, i) => (
                <div key={i} className="rounded border p-2">
                  <div className="font-semibold flex items-center justify-between">
                    <span>{s.name}</span>
                    {s.pop && <Badge variant="secondary" className="text-[10px]">{fmt(s.pop)} نسمة</Badge>}
                  </div>
                  {s.note && <div className="text-muted-foreground mt-1">{s.note}</div>}
                </div>
              ))}
            </div>
          </section>
        )}

        {/* المعالم ومحاور التنمية */}
        {(d.landmarks?.length || d.developmentAxes?.length) && (
          <section className="grid md:grid-cols-2 gap-3">
            {d.landmarks?.length ? (
              <div>
                <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
                  <Landmark className="h-4 w-4 text-primary" /> أبرز المعالم
                </h4>
                <div className="flex flex-wrap gap-1.5">
                  {d.landmarks.map((l, i) => (
                    <Badge key={i} variant="outline" className="text-[11px]">{l}</Badge>
                  ))}
                </div>
              </div>
            ) : null}
            {d.developmentAxes?.length ? (
              <div>
                <h4 className="text-sm font-semibold mb-2">محاور التنمية</h4>
                <div className="space-y-1.5">
                  {d.developmentAxes.map((a, i) => (
                    <div key={i} className="rounded border p-2 text-xs">
                      <div className="font-semibold text-primary">{a.title}</div>
                      <div className="text-muted-foreground">{a.body}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </section>
        )}

        {/* القرى */}
        {d.villages?.length ? (
          <section>
            <h4 className="text-sm font-semibold mb-2">القرى والعزب</h4>
            <div className="flex flex-wrap gap-1">
              {d.villages.map((v, i) => (
                <Badge key={i} variant="secondary" className="text-[10px]">{v}</Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* الخدمات */}
        <section>
          <h4 className="text-sm font-semibold mb-2">الخدمات داخل الحي</h4>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            <ServiceStat icon={Hospital} label="مستشفيات" value={d.services.hospitals} />
            <ServiceStat icon={Hospital} label="مستشفيات خاصة" value={d.services.privateHospitals} />
            <ServiceStat icon={Hospital} label="مراكز/وحدات طبية" value={d.services.medicalCenters} />
            <ServiceStat icon={GraduationCap} label="مدارس" value={d.services.schools} />
            <ServiceStat icon={GraduationCap} label="معاهد أزهرية" value={d.services.azharInstitutes} />
            <ServiceStat icon={Church} label="مساجد" value={d.services.mosques} />
            <ServiceStat icon={Church} label="زوايا" value={d.services.zawaya} />
            <ServiceStat icon={Church} label="كنائس" value={d.services.churches} />
            <ServiceStat icon={ShoppingBasket} label="مخابز" value={d.services.bakeries} />
            <ServiceStat icon={ShoppingBasket} label="بدالين تموين" value={d.services.supplyShops} />
            <ServiceStat icon={ShoppingBasket} label="مكاتب تموين" value={d.services.supplyOffices} />
            <ServiceStat icon={ShoppingBasket} label="أسواق" value={d.services.markets} />
          </div>
        </section>

        {/* الحدائق */}
        {d.parks?.length ? (
          <section>
            <h4 className="text-sm font-semibold mb-2 flex items-center gap-1.5">
              <Trees className="h-4 w-4 text-green-600" /> الحدائق والمسطحات الخضراء
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {d.parks.map((p, i) => (
                <Badge key={i} variant="outline" className="text-[11px] border-green-300 text-green-800 dark:text-green-300">
                  {p}
                </Badge>
              ))}
            </div>
          </section>
        ) : null}

        {/* ملاحظة المقيّم */}
        <div className="rounded-lg border-r-4 border-r-amber-500 bg-amber-50/50 dark:bg-amber-950/20 p-3 text-xs">
          <b className="text-amber-700 dark:text-amber-400">رأي المقيّم العقاري:</b>{" "}
          {density
            ? density > 10000
              ? "كثافة سكانية مرتفعة — الطلب على الوحدات الصغيرة مرتفع، يُفضّل تقدير معامل ندرة موجب في التقييم."
              : density > 3000
              ? "كثافة متوسطة — السوق متوازن، يصلح للبيع المقارن مع توافر مثيلات حديثة."
              : "كثافة منخفضة — السوق ناشئ، استخدم منهج التكلفة أو الدخل واحذر من قلة المثيلات."
            : "بيانات السكان غير متاحة — اعتمد على المنطقة المحيطة كقاعدة استدلال."}
        </div>
      </CardContent>
    </Card>
  );
}

export default function DistrictsInfoPanel() {
  const [active, setActive] = useState(DISTRICTS_INFO[0].id);
  return (
    <div className="space-y-3" dir="rtl">
      <Card>
        <CardContent className="p-4">
          <h3 className="font-bold text-base mb-1">📋 ملف الأحياء الرسمي — محافظة بورسعيد</h3>
          <p className="text-xs text-muted-foreground">
            بيانات إدارية وخدمية رسمية لكل حي (الحدود، الشياخات، السكان، الخدمات، الحدائق) — مرجع
            للتقييم العقاري واختيار المثيلات وتحديد معامل الموقع.
          </p>
        </CardContent>
      </Card>

      <Tabs value={active} onValueChange={setActive}>
        <TabsList className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 w-full h-auto">
          {DISTRICTS_INFO.map((d) => (
            <TabsTrigger key={d.id} value={d.id} className="text-xs py-2">
              {d.name.replace("حي ", "").replace("مدينة ", "")}
            </TabsTrigger>
          ))}
        </TabsList>
        {DISTRICTS_INFO.map((d) => (
          <TabsContent key={d.id} value={d.id} className="mt-3">
            <DistrictCard d={d} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
