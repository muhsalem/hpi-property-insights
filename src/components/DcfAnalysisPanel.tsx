import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { TrendingUp } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend, Bar, ComposedChart } from "recharts";

const fmt = (n: number) => Math.round(n).toLocaleString("ar-EG");

/**
 * Discounted Cash Flow — IVS 105 §50.31
 * 10-year DCF + Terminal Value + IRR + NPV + Equity multiple
 */
export default function DcfAnalysisPanel() {
  const [purchasePrice, setPurchasePrice] = useState(1650000);
  const [annualRent, setAnnualRent] = useState(120000);
  const [vacancy, setVacancy] = useState(5);            // % معدل الشغور
  const [opex, setOpex] = useState(25);                 // % مصروفات تشغيلية
  const [rentGrowth, setRentGrowth] = useState(7);      // % نمو إيجار سنوي
  const [discountRate, setDiscountRate] = useState(12); // % معدل خصم
  const [exitCapRate, setExitCapRate] = useState(8);    // % Cap Rate عند الخروج
  const [holdYears, setHoldYears] = useState(10);

  const data = useMemo(() => {
    const rows: any[] = [];
    let cumulativeCF = -purchasePrice;
    for (let y = 1; y <= holdYears; y++) {
      const gpi = annualRent * Math.pow(1 + rentGrowth / 100, y - 1);
      const egi = gpi * (1 - vacancy / 100);
      const noi = egi * (1 - opex / 100);
      const isLast = y === holdYears;
      const nextYearNOI = noi * (1 + rentGrowth / 100);
      const terminal = isLast ? nextYearNOI / (exitCapRate / 100) : 0;
      const cf = noi + terminal;
      const dcf = cf / Math.pow(1 + discountRate / 100, y);
      cumulativeCF += cf;
      rows.push({ year: y, gpi, egi, noi, terminal, cf, dcf, cumulativeCF });
    }
    return rows;
  }, [purchasePrice, annualRent, vacancy, opex, rentGrowth, discountRate, exitCapRate, holdYears]);

  const npv = useMemo(() => -purchasePrice + data.reduce((s, r) => s + r.dcf, 0), [data, purchasePrice]);
  const equityMultiple = useMemo(
    () => (data.reduce((s, r) => s + r.cf, 0)) / purchasePrice,
    [data, purchasePrice]
  );

  // IRR via Newton-Raphson approximation
  const irr = useMemo(() => {
    const cfs = [-purchasePrice, ...data.map((r) => r.cf)];
    let rate = 0.1;
    for (let iter = 0; iter < 100; iter++) {
      let npvCalc = 0;
      let dnpv = 0;
      for (let t = 0; t < cfs.length; t++) {
        npvCalc += cfs[t] / Math.pow(1 + rate, t);
        if (t > 0) dnpv -= (t * cfs[t]) / Math.pow(1 + rate, t + 1);
      }
      const newRate = rate - npvCalc / dnpv;
      if (Math.abs(newRate - rate) < 1e-6) return newRate * 100;
      rate = newRate;
    }
    return rate * 100;
  }, [data, purchasePrice]);

  const verdict = npv > 0 && irr > discountRate ? "استثمار جذاب ✓" : "استثمار غير مجدٍ ✗";
  const verdictColor = npv > 0 && irr > discountRate ? "bg-green-600" : "bg-red-600";

  return (
    <Card className="border-r-4 border-r-primary">
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <TrendingUp className="h-5 w-5 text-primary" />
          تحليل التدفقات النقدية المخصومة (DCF · IVS 105 §50.31)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div><Label className="text-[10px]">سعر الشراء (ج)</Label><Input type="number" value={purchasePrice} onChange={(e) => setPurchasePrice(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">الإيجار السنوي (ج)</Label><Input type="number" value={annualRent} onChange={(e) => setAnnualRent(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">معدل الشغور %</Label><Input type="number" value={vacancy} onChange={(e) => setVacancy(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">مصروفات تشغيلية %</Label><Input type="number" value={opex} onChange={(e) => setOpex(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">نمو الإيجار %</Label><Input type="number" value={rentGrowth} onChange={(e) => setRentGrowth(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">معدل الخصم %</Label><Input type="number" value={discountRate} onChange={(e) => setDiscountRate(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">Cap Rate خروج %</Label><Input type="number" value={exitCapRate} onChange={(e) => setExitCapRate(+e.target.value)} className="h-8 text-xs" /></div>
          <div><Label className="text-[10px]">سنوات الاحتفاظ</Label><Input type="number" value={holdYears} onChange={(e) => setHoldYears(+e.target.value)} className="h-8 text-xs" /></div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-[11px]">
            <thead>
              <tr className="border-b bg-muted/40">
                <th className="p-1.5">السنة</th>
                <th className="p-1.5">GPI</th>
                <th className="p-1.5">EGI</th>
                <th className="p-1.5">NOI</th>
                <th className="p-1.5">Terminal</th>
                <th className="p-1.5">CF</th>
                <th className="p-1.5 bg-primary/10">DCF</th>
              </tr>
            </thead>
            <tbody>
              {data.map((r) => (
                <tr key={r.year} className="border-b">
                  <td className="p-1.5 text-center font-bold">{r.year}</td>
                  <td className="p-1.5 text-center">{fmt(r.gpi)}</td>
                  <td className="p-1.5 text-center">{fmt(r.egi)}</td>
                  <td className="p-1.5 text-center font-semibold">{fmt(r.noi)}</td>
                  <td className="p-1.5 text-center text-amber-600">{r.terminal ? fmt(r.terminal) : "—"}</td>
                  <td className="p-1.5 text-center">{fmt(r.cf)}</td>
                  <td className="p-1.5 text-center font-bold text-primary">{fmt(r.dcf)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="year" />
              <YAxis tickFormatter={(v) => (v / 1000).toFixed(0) + "k"} />
              <Tooltip formatter={(v: number) => fmt(v) + " ج"} />
              <Legend />
              <Bar dataKey="noi" fill="hsl(var(--primary))" name="NOI" />
              <Line dataKey="dcf" stroke="#16a34a" strokeWidth={2} name="DCF" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <div className="rounded border-2 border-primary p-3 bg-primary/5 text-center">
            <div className="text-[10px] text-muted-foreground">NPV</div>
            <div className={`text-base font-bold ${npv > 0 ? "text-green-600" : "text-red-600"}`}>{fmt(npv)} ج</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">IRR</div>
            <div className="text-base font-bold">{irr.toFixed(2)}%</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">Equity Multiple</div>
            <div className="text-base font-bold">{equityMultiple.toFixed(2)}×</div>
          </div>
          <div className="rounded border p-3 text-center">
            <div className="text-[10px] text-muted-foreground">القرار</div>
            <Badge className={`${verdictColor} text-white mt-1`}>{verdict}</Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
