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
  const totalBuildings = districts.reduce((s, d) => s + (d.buildings_count || 0), 0);
  const totalUnits = districts.reduce((s, d) => s + (d.housing_units || 0), 0);
  const netMig = districts.reduce((s, d) => s + (d.net_migration || 0), 0);

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
                  <th className="p-2">المساحة كم²</th>
                  <th className="p-2">الكثافة</th>
                  <th className="p-2">المباني</th>
                  <th className="p-2">الوحدات</th>
                  <th className="p-2">الهجرة</th>
                  <th className="p-2">النمو %</th>
                </tr>
              </thead>
              <tbody>
                {districts.map((d) => (
                  <tr key={d.id} className="border-b hover:bg-muted/30">
                    <td className="p-2 font-medium">{d.name}</td>
                    <td className="p-2">{fmt(d.population || 0)}</td>
                    <td className="p-2">{fmt(d.households || 0)}</td>
                    <td className="p-2">{d.area_km2 || "—"}</td>
                    <td className="p-2">{fmt(Math.round(d.density || 0))}</td>
                    <td className="p-2">{fmt(d.buildings_count || 0)}</td>
                    <td className="p-2">{fmt(d.housing_units || 0)}</td>
                    <td className="p-2">
                      <Badge variant={d.net_migration && d.net_migration > 0 ? "default" : "secondary"}>
                        {(d.net_migration || 0) > 0 ? "+" : ""}{fmt(d.net_migration || 0)}
                      </Badge>
                    </td>
                    <td className="p-2">{(d.growth_rate || 0).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            المصدر: الجهاز المركزي للتعبئة العامة والإحصاء (CAPMAS) — تعداد 2023.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
