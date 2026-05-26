import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { buildHPI } from "@/lib/valuation";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export const Route = createFileRoute("/_authenticated/hpi")({ component: HPIPage });

function HPIPage() {
  const { data } = useQuery({
    queryKey: ["hpi-data"],
    queryFn: async () => {
      const { data: txns } = await supabase.from("transactions").select("*");
      return txns || [];
    },
  });

  const hpi = buildHPI(data || []);
  const chartData = Object.entries(hpi).map(([year, val]) => ({ year, val: +val.toFixed(1) }));
  const last = chartData[chartData.length - 1]?.val || 100;
  const cagr = chartData.length > 1 ? (Math.pow(last/100, 1/(chartData.length-1)) - 1) * 100 : 0;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مؤشر أسعار العقارات HPI</h1>
        <p className="text-sm text-muted-foreground">طريقة Repeat-Sales · سنة الأساس 2020 = 100</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">المؤشر الحالي</div><div className="text-2xl font-bold">{last.toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">CAGR سنوي</div><div className="text-2xl font-bold text-primary">{cagr.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي النمو</div><div className="text-2xl font-bold">+{(last-100).toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">المؤشر عبر السنوات</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" /><YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">جدول المؤشر</CardTitle></CardHeader>
        <CardContent>
          <table className="w-full text-sm">
            <thead><tr className="border-b"><th className="text-right p-2">السنة</th><th className="text-right p-2">المؤشر</th><th className="text-right p-2">تغيّر سنوي</th></tr></thead>
            <tbody>
              {chartData.map((r, i) => {
                const prev = i > 0 ? chartData[i-1].val : 100;
                const ch = ((r.val/prev) - 1) * 100;
                return <tr key={r.year} className="border-b"><td className="p-2">{r.year}</td><td className="p-2 font-bold">{r.val}</td><td className="p-2">{i>0 ? `${ch >= 0 ? "+" : ""}${ch.toFixed(1)}%` : "—"}</td></tr>;
              })}
            </tbody>
          </table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">كيف تستخدم المؤشر؟</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• <b>تعديل القيم زمنياً:</b> قيمة 2022 × (HPI اليوم / HPI 2022)</p>
          <p>• <b>تقدير اتجاه السوق:</b> CAGR يدل على نمو متوسط مستدام</p>
          <p>• <b>تقييم المخاطر:</b> CAGR &gt; 12% = سوق ساخن، &lt; 5% = راكد</p>
          <p>• <b>إعادة التقييم الجماعية:</b> Mass Appraisal لمحفظة العقارات</p>
        </CardContent>
      </Card>
    </div>
  );
}
