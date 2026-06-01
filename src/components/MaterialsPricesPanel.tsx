import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowUp, ArrowDown, Download, Package, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { MATERIALS_DATA, MATERIAL_CATEGORIES, type MaterialItem } from "@/lib/materials-data";

const MONTHS = [
  { key: "jan", label: "يناير" },
  { key: "feb", label: "فبراير" },
  { key: "mar", label: "مارس" },
  { key: "apr", label: "أبريل" },
  { key: "may", label: "مايو" },
] as const;

const CHART_COLORS = ["hsl(var(--primary))", "#f59e0b", "#10b981", "#ef4444", "#8b5cf6"];

function downloadFile(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCSV(items: MaterialItem[]) {
  const header = ["id", "name", "category", "unit", "jan", "feb", "mar", "apr", "may", "change_pct"];
  const rows = items.map((i) => [i.id, i.name, i.category, i.unit, i.jan, i.feb, i.mar, i.apr, i.may, i.change]);
  return [header, ...rows].map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
}

export default function MaterialsPricesPanel() {
  const [category, setCategory] = useState<(typeof MATERIAL_CATEGORIES)[number]>("الكل");
  const filtered = useMemo(
    () => (category === "الكل" ? MATERIALS_DATA : MATERIALS_DATA.filter((m) => m.category === category)),
    [category],
  );

  const kpis = useMemo(() => {
    const avgChange = MATERIALS_DATA.reduce((s, m) => s + m.change, 0) / MATERIALS_DATA.length;
    const up = MATERIALS_DATA.filter((m) => m.change > 0).length;
    const down = MATERIALS_DATA.filter((m) => m.change < 0).length;
    const top = [...MATERIALS_DATA].sort((a, b) => b.change - a.change)[0];
    const bot = [...MATERIALS_DATA].sort((a, b) => a.change - b.change)[0];
    return { avgChange, up, down, top, bot };
  }, []);

  const top5 = useMemo(
    () => [...filtered].sort((a, b) => Math.abs(b.change) - Math.abs(a.change)).slice(0, 5),
    [filtered],
  );
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const activeIds = selectedIds.length ? selectedIds : top5.map((m) => m.id);
  const activeItems = MATERIALS_DATA.filter((m) => activeIds.includes(m.id));

  const chartData = MONTHS.map((mo) => {
    const row: any = { month: mo.label };
    activeItems.forEach((it) => {
      row[it.name] = it[mo.key as keyof MaterialItem];
    });
    return row;
  });

  return (
    <div dir="rtl" className="space-y-4">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Package className="h-5 w-5 text-primary" />
                نشرة أسعار مواد البناء
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-1">
                وزارة الإسكان والمرافق والمجتمعات العمرانية · مايو 2026
              </p>
            </div>
            <div className="flex gap-2 flex-wrap">
              <Badge className="bg-emerald-600 hover:bg-emerald-700">مايو 2026</Badge>
              <Badge variant="outline" className="border-amber-500 text-amber-700 bg-amber-50">
                أسعار استرشادية — شاملة ض.ق.م بدون نقل
              </Badge>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <KpiCard
          label="متوسط التغير يناير→مايو"
          value={`${kpis.avgChange >= 0 ? "+" : ""}${kpis.avgChange.toFixed(2)}%`}
          tone={kpis.avgChange >= 0 ? "up" : "down"}
        />
        <KpiCard label="منتجات ارتفع سعرها" value={String(kpis.up)} tone="up" />
        <KpiCard label="منتجات انخفض سعرها" value={String(kpis.down)} tone="down" />
        <KpiCard
          label="أعلى ارتفاع"
          value={`+${kpis.top.change.toFixed(2)}%`}
          sub={kpis.top.name}
          tone="up"
        />
        <KpiCard
          label="أعلى انخفاض"
          value={`${kpis.bot.change.toFixed(2)}%`}
          sub={kpis.bot.name}
          tone="down"
        />
      </div>

      {/* Filter tabs */}
      <Tabs value={category} onValueChange={(v) => setCategory(v as any)}>
        <TabsList className="flex flex-wrap h-auto w-full justify-start">
          {MATERIAL_CATEGORIES.map((c) => (
            <TabsTrigger key={c} value={c}>
              {c}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Chart */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <CardTitle className="text-sm">اتجاه الأسعار الشهرية (يناير → مايو)</CardTitle>
            <Select
              value={selectedIds.length === 0 ? "__top5" : selectedIds[0]}
              onValueChange={(v) => setSelectedIds(v === "__top5" ? [] : [v])}
            >
              <SelectTrigger className="w-64">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__top5">أعلى 5 منتجات (تغيراً)</SelectItem>
                {filtered.map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {activeItems.map((it, i) => (
                  <Line
                    key={it.id}
                    type="monotone"
                    dataKey={it.name}
                    stroke={CHART_COLORS[i % CHART_COLORS.length]}
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Table + export */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <CardTitle className="text-sm">جدول الأسعار التفصيلي ({filtered.length})</CardTitle>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  downloadFile(JSON.stringify(filtered, null, 2), "materials-prices.json", "application/json")
                }
              >
                <Download className="h-4 w-4 ml-1" /> JSON
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => downloadFile(toCSV(filtered), "materials-prices.csv", "text/csv")}
              >
                <Download className="h-4 w-4 ml-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-xs border-b bg-muted/40">
              <tr>
                <th className="text-right p-2">المنتج</th>
                <th className="text-right p-2">الفئة</th>
                <th className="text-right p-2">الوحدة</th>
                <th className="text-right p-2">يناير</th>
                <th className="text-right p-2">مارس</th>
                <th className="text-right p-2">مايو 2026</th>
                <th className="text-right p-2">تغير</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => (
                <tr key={m.id} className="border-b last:border-0 hover:bg-muted/30">
                  <td className="p-2 font-medium">{m.name}</td>
                  <td className="p-2 text-xs text-muted-foreground">{m.category}</td>
                  <td className="p-2 text-xs">{m.unit}</td>
                  <td className="p-2 font-mono text-xs">{m.jan.toLocaleString()}</td>
                  <td className="p-2 font-mono text-xs">{m.mar.toLocaleString()}</td>
                  <td className="p-2 font-mono text-xs font-bold">{m.may.toLocaleString()}</td>
                  <td className="p-2">
                    <ChangePill change={m.change} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "up" | "down" | "neutral";
}) {
  const Icon = tone === "up" ? TrendingUp : tone === "down" ? TrendingDown : null;
  const color =
    tone === "up" ? "text-emerald-600" : tone === "down" ? "text-red-600" : "text-foreground";
  return (
    <Card>
      <CardContent className="p-3">
        <div className="text-[11px] text-muted-foreground mb-1">{label}</div>
        <div className={`text-lg font-bold flex items-center gap-1 ${color}`}>
          {Icon && <Icon className="h-4 w-4" />}
          {value}
        </div>
        {sub && <div className="text-[10px] text-muted-foreground mt-1 line-clamp-1">{sub}</div>}
      </CardContent>
    </Card>
  );
}

function ChangePill({ change }: { change: number }) {
  if (change === 0) {
    return <Badge variant="outline" className="text-xs">ثابت</Badge>;
  }
  const isUp = change > 0;
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-semibold ${
        isUp ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"
      }`}
    >
      {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
      {isUp ? "+" : ""}
      {change.toFixed(2)}%
    </span>
  );
}
