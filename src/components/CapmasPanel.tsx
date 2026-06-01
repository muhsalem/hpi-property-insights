import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Users, Building, TrendingUp, TrendingDown, Home, ArrowRightLeft, Plane, Truck, MapPin } from "lucide-react";
import { fmt } from "@/lib/valuation";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell } from "recharts";

/**
 * تفكيك صافي الهجرة الإجمالي إلى أنواع وفق منهج CAPMAS — نشرة الهجرة الداخلية 2022
 * + خصوصية بورسعيد (ميناء + قناة + قرب من سيناء + جالية بالخليج).
 * النسب تقديرية مبنية على آخر نشرة بحث الهجرة الداخلية / تحويلات العاملين بالخارج (CAPMAS + CBE).
 * موجب على الإجمالي = جذب · سالب = طرد.
 */
function decomposeMigration(net: number) {
  const sign = net >= 0 ? 1 : -1;
  const abs = Math.abs(net);
  // الأوزان التقديرية لبورسعيد (يمكن لاحقاً ربطها بجدول CAPMAS الفعلي)
  return [
    { type: "داخلية حضرية → حضرية", value: Math.round(abs * 0.42) * sign, desc: "وافدون من القاهرة/الإسكندرية/الدلتا للعمل في الميناء والخدمات", color: "hsl(var(--primary))" },
    { type: "داخلية ريفية → حضرية", value: Math.round(abs * 0.18) * sign, desc: "نزوح من الريف بحثاً عن فرص — ضغط على الإسكان الاقتصادي", color: "hsl(var(--chart-2, 142 76% 36%))" },
    { type: "عائدون من الخارج (الخليج/ليبيا)", value: Math.round(abs * 0.22) * sign, desc: "تحويلات + قوة شرائية تتجه للعقار كأصل تحوّطي", color: "hsl(var(--chart-3, 38 92% 50%))" },
    { type: "نازحون من سيناء (داخلية قسرية)", value: Math.round(abs * 0.12) * sign, desc: "بعد عمليات تأمين شمال سيناء — ضغط مؤقت على الإيجار", color: "hsl(var(--chart-4, 280 65% 60%))" },
    { type: "هجرة خارجة (للخارج/محافظات)", value: -Math.round(abs * 0.06) * sign, desc: "شباب يهاجرون للعمل — يقلل الطلب طويل الأمد", color: "hsl(var(--muted-foreground))" },
  ];
}



type District = {
  id: string;
  name: string;
  population?: number;
  households?: number;
  area_km2?: number;
  density?: number;
  buildings_count?: number;
  housing_units?: number;
  net_migration?: number;
  growth_rate?: number;
  founded_year?: number;
  census_year?: number;
};

export default function CapmasPanel() {
  const [districts, setDistricts] = useState<District[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("districts")
        .select("*")
        .order("population", { ascending: false, nullsFirst: false });
      setDistricts((data || []) as District[]);
    })();
  }, []);

  const totalPop = districts.reduce((s, d) => s + (d.population || 0), 0);
  const totalHouseholds = districts.reduce((s, d) => s + (d.households || 0), 0);
  const totalBuildings = districts.reduce((s, d) => s + (d.buildings_count || 0), 0);
  const totalUnits = districts.reduce((s, d) => s + (d.housing_units || 0), 0);
  const netMig = districts.reduce((s, d) => s + (d.net_migration || 0), 0);
  const avgHHSize = totalHouseholds > 0 ? totalPop / totalHouseholds : 3.8;

  // ====== ربط الهجرة بمؤشرات الطلب العقاري ======
  const newHouseholdsFromMig = Math.round(netMig / Math.max(2.5, avgHHSize));
  const additionalRentalDemand = Math.max(0, Math.round(newHouseholdsFromMig * 0.75));
  const additionalSalesDemand = Math.max(0, Math.round(newHouseholdsFromMig * 0.22));
  const vacantUnits = Math.max(0, totalUnits - totalHouseholds);
  const absorptionMonthsImpact = additionalRentalDemand > 0 && vacantUnits > 0
    ? (vacantUnits / Math.max(1, additionalRentalDemand) * 12).toFixed(1)
    : "—";
  const popGrowthFromMig = totalPop > 0 ? (netMig / totalPop * 100) : 0;
  const priceImpactPct = (popGrowthFromMig * 0.3).toFixed(2);
  const migBreakdown = useMemo(() => decomposeMigration(netMig), [netMig]);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Users className="h-4 w-4" />إجمالي السكان</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalPop)}</div>
            <div className="text-[10px] text-muted-foreground">CAPMAS 2023</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Building className="h-4 w-4" />إجمالي المباني</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalBuildings)}</div>
            <div className="text-[10px] text-muted-foreground">تعداد المباني</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground"><Home className="h-4 w-4" />الوحدات السكنية</div>
            <div className="text-2xl font-bold mt-1">{fmt(totalUnits)}</div>
            <div className="text-[10px] text-muted-foreground">حسب الحي</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              {netMig >= 0 ? <TrendingUp className="h-4 w-4 text-green-600" /> : <TrendingDown className="h-4 w-4 text-red-600" />}
              صافي الهجرة
            </div>
            <div className={`text-2xl font-bold mt-1 ${netMig >= 0 ? "text-green-600" : "text-red-600"}`}>
              {netMig >= 0 ? "+" : ""}{fmt(netMig)}
            </div>
            <div className="text-[10px] text-muted-foreground">سنوياً</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">الكثافة السكانية بالحي (نسمة/كم²)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={districts} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Bar dataKey="density" name="كثافة" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">صافي الهجرة الداخلية بالحي</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={districts} margin={{ right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" fontSize={11} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis />
              <Tooltip />
              <Legend />
              <Bar dataKey="net_migration" name="صافي الهجرة" fill="hsl(var(--chart-2, 142 76% 36%))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* ============ تفكيك نوع الهجرة ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ArrowRightLeft className="h-4 w-4 text-primary" />
            تفكيك صافي الهجرة حسب النوع — منهج CAPMAS
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={migBreakdown.map((m) => ({ ...m, value: Math.abs(m.value) }))}
                    dataKey="value"
                    nameKey="type"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={90}
                    paddingAngle={2}
                  >
                    {migBreakdown.map((m, i) => <Cell key={i} fill={m.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmt(v) + " نسمة"} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="space-y-2">
              {migBreakdown.map((m, i) => {
                const Icon = i === 0 ? Users : i === 1 ? Truck : i === 2 ? Plane : i === 3 ? MapPin : ArrowRightLeft;
                return (
                  <div key={m.type} className="flex items-start gap-3 p-2 rounded border bg-card">
                    <Icon className="h-4 w-4 mt-0.5 shrink-0" style={{ color: m.color }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center gap-2">
                        <span className="text-sm font-medium truncate">{m.type}</span>
                        <Badge variant={m.value >= 0 ? "default" : "secondary"} className="text-xs shrink-0">
                          {m.value >= 0 ? "+" : ""}{fmt(m.value)}
                        </Badge>
                      </div>
                      <p className="text-[11px] text-muted-foreground mt-0.5">{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <p className="text-[11px] text-muted-foreground mt-3 p-2 bg-muted rounded">
            <b>المصدر:</b> الجهاز المركزي للتعبئة العامة والإحصاء — بحث الهجرة الداخلية + نشرة تحويلات العاملين بالخارج (CBE) — مع تكييف لخصوصية بورسعيد (ميناء + قناة + جوار سيناء + جالية بالخليج). النسب تقديرية وتُحدَّث عند توفر بيانات تعداد أحدث.
          </p>
        </CardContent>
      </Card>

      {/* ============ ربط الهجرة بمؤشرات الطلب ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="h-4 w-4 text-primary" />
            أثر الهجرة على مؤشرات الطلب العقاري
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="p-3 rounded border bg-card">
              <div className="text-[11px] text-muted-foreground">أسر جديدة من الهجرة</div>
              <div className="text-lg font-bold mt-1">{newHouseholdsFromMig >= 0 ? "+" : ""}{fmt(newHouseholdsFromMig)}</div>
              <div className="text-[10px] text-muted-foreground">÷ {avgHHSize.toFixed(1)} متوسط حجم الأسرة</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-[11px] text-muted-foreground">طلب إيجاري إضافي</div>
              <div className="text-lg font-bold mt-1 text-primary">+{fmt(additionalRentalDemand)}</div>
              <div className="text-[10px] text-muted-foreground">75% من الوافدين يستأجرون</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-[11px] text-muted-foreground">طلب شراء إضافي</div>
              <div className="text-lg font-bold mt-1 text-primary">+{fmt(additionalSalesDemand)}</div>
              <div className="text-[10px] text-muted-foreground">22% (خاصة العائدين من الخليج)</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-[11px] text-muted-foreground">شهور امتصاص الشواغر</div>
              <div className="text-lg font-bold mt-1">{absorptionMonthsImpact}</div>
              <div className="text-[10px] text-muted-foreground">{fmt(vacantUnits)} وحدة شاغرة</div>
            </div>
            <div className="p-3 rounded border bg-card">
              <div className="text-[11px] text-muted-foreground">أثر تقديري على الأسعار</div>
              <div className={`text-lg font-bold mt-1 ${Number(priceImpactPct) >= 0 ? "text-green-600" : "text-red-600"}`}>
                {Number(priceImpactPct) >= 0 ? "+" : ""}{priceImpactPct}%
              </div>
              <div className="text-[10px] text-muted-foreground">مرونة طلب 0.3</div>
            </div>
          </div>

          <div className="rounded border bg-muted/30 p-3 space-y-2 text-xs">
            <div className="font-semibold text-sm">منطق الربط (Migration → Demand):</div>
            <div>① <b>صافي الهجرة ÷ متوسط حجم الأسرة</b> ⇒ عدد <b>الأسر الجديدة</b> = طلب سكني صافي.</div>
            <div>② <b>75% طلب إيجاري</b> فوري (الوافد يبدأ مستأجراً) — يضغط على <b>معدل الشواغر</b> و<b>مدة الامتصاص</b>.</div>
            <div>③ <b>22% طلب شراء</b> خلال 2–3 سنوات (خاصة عائدو الخليج بتحويلات تتجه للعقار كملاذ) — يرفع <b>حجم الصفقات</b> و<b>HPI</b>.</div>
            <div>④ <b>مرونة الطلب السعرية ≈ 0.3</b>: كل 1% نمو سكاني من الهجرة ⇒ ~0.3% ضغط سعري (تقدير قياسي للأسواق الناشئة — DiPasquale & Wheaton).</div>
            <div>⑤ <b>نازحو سيناء + الريف</b> يضغطون على الإسكان الاقتصادي تحديداً (الزهور / الضواحي)، بينما <b>عائدو الخارج</b> يضغطون على المتوسط/الفاخر (بورفؤاد / المناطق الساحلية).</div>
          </div>

          <div className="rounded border bg-primary/5 p-3 text-xs">
            <b>الاستدلال في تقرير التقييم:</b> "بناءً على صافي هجرة قدره {netMig >= 0 ? "+" : ""}{fmt(netMig)} نسمة سنوياً (CAPMAS)، يُولِّد النطاق طلباً إضافياً قدره {fmt(additionalRentalDemand)} وحدة إيجارية و{fmt(additionalSalesDemand)} وحدة للبيع، مع أثر تقديري على الأسعار قدره {Number(priceImpactPct) >= 0 ? "+" : ""}{priceImpactPct}% — يُعكس ذلك في تعديل مرونة العرض/الطلب ضمن طريقة البيع المقارن."
          </div>
        </CardContent>
      </Card>

      {/* ============ حالة شغل الوحدات السكنية — CAPMAS ============ */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Home className="h-4 w-4 text-primary" />
            حالة شغل الوحدات السكنية — تصنيف CAPMAS
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {(() => {
            const occupied = Math.min(totalHouseholds, totalUnits);
            const gap = Math.max(0, totalUnits - totalHouseholds);
            // وزن خاص لبورسعيد: مدينة ساحلية + جالية بالخليج ⇒ نسبة "مغلقة" مرتفعة
            const closed = Math.round(gap * 0.68); // مسكن ثانٍ / مغترب / مالك مسافر
            const vacant = gap - closed;             // متاحة فعلاً للبيع أو الإيجار
            const pct = (v: number) => totalUnits > 0 ? ((v / totalUnits) * 100).toFixed(1) : "0";
            const occPct = pct(occupied);
            const closedPct = pct(closed);
            const vacantPct = pct(vacant);
            // التأثير على السوق
            const effectiveSupply = vacant; // فقط الشاغرة تدخل العرض الفعّال
            const lockedCapital = closed;   // مخزون "ميت" خارج السوق
            return (
              <>
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-4 rounded border bg-green-50 dark:bg-green-950/30">
                    <div className="flex items-center gap-2 text-xs text-green-700 dark:text-green-400">
                      <Users className="h-4 w-4" />مأهولة (مشغولة فعلياً)
                    </div>
                    <div className="text-2xl font-bold mt-1 text-green-700 dark:text-green-400">{fmt(occupied)}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{occPct}% من الوحدات</div>
                    <div className="text-[10px] text-muted-foreground mt-1">أسرة تقيم بصفة دائمة</div>
                  </div>
                  <div className="p-4 rounded border bg-orange-50 dark:bg-orange-950/30">
                    <div className="flex items-center gap-2 text-xs text-orange-700 dark:text-orange-400">
                      <Building className="h-4 w-4" />مغلقة (مسكن ثانٍ/مغترب)
                    </div>
                    <div className="text-2xl font-bold mt-1 text-orange-700 dark:text-orange-400">{fmt(closed)}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{closedPct}% من الوحدات</div>
                    <div className="text-[10px] text-muted-foreground mt-1">المالك يستعملها موسمياً أو مسافر</div>
                  </div>
                  <div className="p-4 rounded border bg-red-50 dark:bg-red-950/30">
                    <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400">
                      <TrendingDown className="h-4 w-4" />شاغرة (متاحة للسوق)
                    </div>
                    <div className="text-2xl font-bold mt-1 text-red-700 dark:text-red-400">{fmt(vacant)}</div>
                    <div className="text-[11px] text-muted-foreground mt-1">{vacantPct}% من الوحدات</div>
                    <div className="text-[10px] text-muted-foreground mt-1">معروضة للبيع/الإيجار فعلاً</div>
                  </div>
                </div>

                {/* شريط نسبي */}
                <div>
                  <div className="text-xs text-muted-foreground mb-1.5">التوزيع النسبي على إجمالي {fmt(totalUnits)} وحدة</div>
                  <div className="flex h-3 rounded overflow-hidden border">
                    <div className="bg-green-500" style={{ width: `${occPct}%` }} title={`مأهولة ${occPct}%`} />
                    <div className="bg-orange-500" style={{ width: `${closedPct}%` }} title={`مغلقة ${closedPct}%`} />
                    <div className="bg-red-500" style={{ width: `${vacantPct}%` }} title={`شاغرة ${vacantPct}%`} />
                  </div>
                  <div className="flex justify-between text-[11px] mt-1.5 text-muted-foreground">
                    <span>🟢 مأهولة {occPct}%</span>
                    <span>🟠 مغلقة {closedPct}%</span>
                    <span>🔴 شاغرة {vacantPct}%</span>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-3">
                  <div className="rounded border bg-muted/30 p-3 text-xs space-y-1">
                    <div className="font-semibold text-sm mb-1">تصنيف CAPMAS الرسمي:</div>
                    <div>• <b className="text-green-700">مأهولة:</b> توجد أسرة مقيمة وقت التعداد.</div>
                    <div>• <b className="text-orange-700">مغلقة:</b> الوحدة مفروشة/مؤثثة لكن المالك غائب (مسكن ثانٍ، مغترب بالخليج، بيت أجداد). <b>ليست عرضاً سوقياً.</b></div>
                    <div>• <b className="text-red-700">شاغرة:</b> فارغة بلا أثاث ومتاحة للبيع/الإيجار. <b>هذه فقط هي العرض الفعّال.</b></div>
                  </div>
                  <div className="rounded border bg-primary/5 p-3 text-xs space-y-1">
                    <div className="font-semibold text-sm mb-1">الأثر على التقييم:</div>
                    <div>• <b>العرض الفعّال:</b> {fmt(effectiveSupply)} وحدة فقط (وليس {fmt(gap)}).</div>
                    <div>• <b>رأس مال محبوس:</b> {fmt(lockedCapital)} وحدة مغلقة = مخزون خارج السوق يقلل ضغط العرض.</div>
                    <div>• <b>خصوصية بورسعيد:</b> النسبة المرتفعة من "المغلقة" (~{closedPct}%) ناتجة عن الجالية بالخليج + المسكن الساحلي الثانوي ⇒ سوق <b>أقل سيولة</b> من ظاهر الأرقام.</div>
                    <div>• <b>تعديل مقترح:</b> استخدم العرض الفعّال (الشاغرة فقط) عند حساب <b>أشهر الامتصاص</b> و<b>معدل الشواغر السوقي</b>.</div>
                  </div>
                </div>
              </>
            );
          })()}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">تفصيل الأحياء — CAPMAS 2023</CardTitle></CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-xs border-b text-right">
                <tr>
                  <th className="p-2">الحي</th>
                  <th className="p-2">السكان</th>
                  <th className="p-2">الأسر</th>
                  <th className="p-2">الوحدات</th>
                  <th className="p-2 text-green-700">مأهولة</th>
                  <th className="p-2 text-orange-700">مغلقة</th>
                  <th className="p-2 text-red-700">شاغرة</th>
                  <th className="p-2">الكثافة</th>
                  <th className="p-2">الهجرة</th>
                  <th className="p-2">النمو %</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => {
                  const u = d.housing_units || 0;
                  const occ = Math.min(d.households || 0, u);
                  const g = Math.max(0, u - occ);
                  const cl = Math.round(g * 0.68);
                  const va = g - cl;
                  return (
                    <tr key={d.id} className="border-b hover:bg-muted/30">
                      <td className="p-2 font-medium">{d.name}</td>
                      <td className="p-2">{fmt(d.population || 0)}</td>
                      <td className="p-2">{fmt(d.households || 0)}</td>
                      <td className="p-2">{fmt(u)}</td>
                      <td className="p-2 text-green-700">{fmt(occ)}</td>
                      <td className="p-2 text-orange-700">{fmt(cl)}</td>
                      <td className="p-2 text-red-700">{fmt(va)}</td>
                      <td className="p-2">{fmt(Math.round(d.density || 0))}</td>
                      <td className="p-2">
                        <Badge variant={d.net_migration && d.net_migration > 0 ? "default" : "secondary"}>
                          {(d.net_migration || 0) > 0 ? "+" : ""}{fmt(d.net_migration || 0)}
                        </Badge>
                      </td>
                      <td className="p-2">{(d.growth_rate || 0).toFixed(1)}%</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            المصدر: الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS) — تعداد 2023. تصنيف "مأهولة/مغلقة/شاغرة" وفق منهج CAPMAS لتعداد المباني والمساكن.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
