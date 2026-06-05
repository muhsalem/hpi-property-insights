import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { History, Download, ExternalLink, FileText } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MATERIALS_HISTORY, YEARS_20, HOUSING_MINISTRY_BULLETINS, type AnnualSeries } from "@/lib/materials-history";

const COLORS = ["#2563eb", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6", "#ec4899", "#0ea5e9"];

function toCSV(items: AnnualSeries[]) {
  const header = ["id", "name", "unit", "category", ...YEARS_20.map(String)];
  const rows = items.map((i) => [i.id, i.name, i.unit, i.category, ...YEARS_20.map((y) => i.values[y] ?? "")]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

function download(content: string, name: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

export default function MaterialsHistoryPanel() {
  const [selected, setSelected] = useState<string[]>(["rebar", "cement_42", "clay_brick", "ceramic"]);

  const toggleId = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const chartData = useMemo(
    () =>
      YEARS_20.map((y) => {
        const row: Record<string, number | string> = { year: String(y) };
        MATERIALS_HISTORY.filter((m) => selected.includes(m.id)).forEach((m) => {
          if (m.values[y]) row[m.name] = m.values[y];
        });
        return row;
      }),
    [selected],
  );

  const activeItems = MATERIALS_HISTORY.filter((m) => selected.includes(m.id));

  // CAGR — معدل النمو السنوي المركّب 2006→2026
  const stats = useMemo(
    () =>
      MATERIALS_HISTORY.map((m) => {
        const first = Object.entries(m.values).find(([, v]) => v > 0);
        const last = m.values[2026];
        if (!first || !last) return { ...m, cagr: 0, growth: 0 };
        const startYear = Number(first[0]);
        const startVal = first[1];
        const years = 2026 - startYear;
        const cagr = years > 0 ? (Math.pow(last / startVal, 1 / years) - 1) * 100 : 0;
        const growth = ((last - startVal) / startVal) * 100;
        return { ...m, cagr, growth, startYear, startVal };
      }),
    [],
  );

  return (
    <div dir="rtl" className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <History className="h-5 w-5 text-primary" />
                التطور التاريخي لأسعار مواد البناء — 20 سنة (2006 → 2026)
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                متوسط سنوي بالجنيه المصري · المصدر: نشرات وزارة الإسكان + CAPMAS + غرفة مواد البناء
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-blue-600 hover:bg-blue-700">21 سنة</Badge>
              <Badge variant="outline">{MATERIALS_HISTORY.length} مادة</Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Selector chips */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">اختر المواد للمقارنة</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 flex-wrap">
            {MATERIALS_HISTORY.map((m) => {
              const on = selected.includes(m.id);
              return (
                <button
                  key={m.id}
                  onClick={() => toggleId(m.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition ${
                    on
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background hover:bg-muted border-border"
                  }`}
                >
                  {m.name}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">منحنى الأسعار 2006 → 2026</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-96">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="year" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeItems.map((m, i) => (
                  <Line
                    key={m.id}
                    type="monotone"
                    dataKey={m.name}
                    stroke={COLORS[i % COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 2 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* CAGR table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm">معدل النمو السنوي المركّب (CAGR) والنمو الإجمالي</CardTitle>
            <Button
              size="sm"
              variant="outline"
              onClick={() => download(toCSV(MATERIALS_HISTORY), "materials-history-20y.csv", "text/csv")}
            >
              <Download className="h-4 w-4 ml-1" /> CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs border-b bg-muted/40">
              <tr>
                <th className="text-right p-2">المادة</th>
                <th className="text-right p-2">الوحدة</th>
                <th className="text-right p-2">سعر 2006</th>
                <th className="text-right p-2">سعر 2026</th>
                <th className="text-right p-2">النمو الإجمالي</th>
                <th className="text-right p-2">CAGR سنوي</th>
              </tr>
            </thead>
            <tbody>
              {stats.map((s) => (
                <tr key={s.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2 font-medium">{s.name}</td>
                  <td className="p-2 text-xs">{s.unit}</td>
                  <td className="p-2 font-mono text-xs">
                    {s.startVal?.toLocaleString()} <span className="text-muted-foreground">({s.startYear})</span>
                  </td>
                  <td className="p-2 font-mono text-xs font-bold">{s.values[2026]?.toLocaleString()}</td>
                  <td className="p-2 font-mono text-xs text-red-600">+{s.growth.toFixed(0)}%</td>
                  <td className="p-2 font-mono text-xs text-amber-600">{s.cagr.toFixed(1)}%/سنة</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {/* Ministry bulletins */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" />
            نشرات أسعار مواد البناء — وزارة الإسكان والمصادر الرسمية
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {HOUSING_MINISTRY_BULLETINS.map((b, i) => (
              <a
                key={i}
                href={b.url}
                target="_blank"
                rel="noopener noreferrer"
                className="block border rounded-lg p-3 hover:bg-muted/40 transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{b.title}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{b.publisher}</div>
                    <Badge variant="outline" className="mt-2 text-[10px]">
                      {b.period}
                    </Badge>
                  </div>
                  <ExternalLink className="h-4 w-4 text-muted-foreground shrink-0" />
                </div>
              </a>
            ))}
          </div>
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded text-[11px] text-amber-900 leading-relaxed">
            ⚠️ ملاحظة: بعض القيم التاريخية (خصوصاً قبل 2014) مُقدَّرة بناءً على الرقم القياسي العام لأسعار مواد البناء من CAPMAS، حيث لم تكن نشرات الوزارة الشهرية متوفرة بشكل منتظم قبل ذلك التاريخ.
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
