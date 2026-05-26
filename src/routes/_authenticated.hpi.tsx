import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { buildHPI } from "@/lib/valuation";
import { buildHpiSeries } from "@/lib/domain";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";

export const Route = createFileRoute("/_authenticated/hpi")({ component: HPIPage });

function HPIPage() {
  const { data: txns } = useQuery({ queryKey: ["hpi-txns"], queryFn: async () => (await supabase.from("transactions").select("*")).data || [] });
  const { data: areas } = useQuery({ queryKey: ["hpi-areas"], queryFn: async () => (await supabase.from("areas").select("*, districts(name)").order("growth", { ascending: false })).data || [] });

  const [areaId, setAreaId] = useState<string>("");
  const selected = areas?.find((a: any) => a.id === areaId);

  const hpi = buildHPI(txns || []);
  const chartData = Object.entries(hpi).map(([year, val]) => ({ year, val: +val.toFixed(1) }));
  const last = chartData[chartData.length - 1]?.val || 100;
  const cagr = chartData.length > 1 ? (Math.pow(last / 100, 1 / (chartData.length - 1)) - 1) * 100 : 0;

  const areaSeries = useMemo(() => selected ? buildHpiSeries(selected) : [], [selected]);
  const topAreas = useMemo(() => (areas || []).slice(0, 10).map((a: any) => ({ name: a.name, growth: +(a.growth * 100).toFixed(1) })), [areas]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">مؤشر أسعار العقارات HPI</h1>
        <p className="text-sm text-muted-foreground">Repeat-Sales · سنة الأساس 2020 = 100 · شامل لكل المدن</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">المؤشر العام</div><div className="text-2xl font-bold">{last.toFixed(1)}</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">CAGR سنوي</div><div className="text-2xl font-bold text-primary">{cagr.toFixed(1)}%</div></CardContent></Card>
        <Card><CardContent className="p-4"><div className="text-xs text-muted-foreground">إجمالي النمو</div><div className="text-2xl font-bold">+{(last - 100).toFixed(0)}%</div></CardContent></Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">المؤشر العام عبر السنوات (Repeat-Sales)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" /><YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="val" stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-3 flex-wrap">
            <CardTitle className="text-base">HPI لكل منطقة</CardTitle>
            <Select value={areaId} onValueChange={setAreaId}>
              <SelectTrigger className="w-64"><SelectValue placeholder="اختر منطقة لعرض المنحنى" /></SelectTrigger>
              <SelectContent>{areas?.map((a: any) => <SelectItem key={a.id} value={a.id}>{a.name} — {a.districts?.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {selected ? (
            <>
              <div className="flex gap-3 mb-3 text-sm">
                <Badge>نمو {(selected.growth * 100).toFixed(1)}%</Badge>
                <Badge variant="outline">آخر مؤشر {areaSeries[areaSeries.length - 1]?.idx}</Badge>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={areaSeries}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="year" /><YAxis />
                  <Tooltip /><Legend />
                  <Line type="monotone" dataKey="idx" name={selected.name} stroke="hsl(var(--primary))" strokeWidth={2} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </>
          ) : (
            <div className="text-center py-12 text-muted-foreground text-sm">اختر منطقة من القائمة لعرض منحنى المؤشر الخاص بها</div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">أعلى المناطق نمواً (Top 10)</CardTitle></CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={topAreas} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" unit="%" /><YAxis type="category" dataKey="name" width={100} fontSize={11} />
              <Tooltip />
              <Bar dataKey="growth" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">كيف تستخدم المؤشر؟</CardTitle></CardHeader>
        <CardContent className="text-sm space-y-2 text-muted-foreground">
          <p>• <b>تعديل القيم زمنياً:</b> قيمة 2022 × (HPI اليوم / HPI 2022)</p>
          <p>• <b>تقدير اتجاه السوق:</b> CAGR يدل على النمو المستدام</p>
          <p>• <b>تقييم المخاطر:</b> CAGR &gt; 12% = سوق ساخن، &lt; 5% = راكد</p>
          <p>• <b>إعادة التقييم الجماعية:</b> Mass Appraisal لمحفظة العقارات</p>
        </CardContent>
      </Card>
    </div>
  );
}
