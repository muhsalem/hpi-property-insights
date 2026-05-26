// مولّد تقارير PDF بالعربي عبر تحويل HTML → Canvas → PDF
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";
import {
  salesComparison, incomeApproach, costApproach, residualMethod, profitMethod,
  reconcile, confidenceInterval, buildHPI, highestAndBestUse, fmt, pct,
  type Property, type Area, type Transaction, type AdjustmentRow,
} from "./valuation";
import { getDailyPrice, getInvReturn, getBuildingCondition, getBuildingAttachments, getHousingType, getMarketIndicators } from "./domain";
import { WTS, VMETA, ATT_CATS } from "./constants";

export type ReportMeta = {
  appraiserName?: string;
  appraiserLicense?: string;
  appraiserAuthority?: string;
  appraiserPhone?: string;
  clientName?: string;
  purpose?: string;            // الغرض من التقييم
  valuationDate?: string;      // تاريخ التقييم (قد يختلف عن تاريخ التقرير)
  validityDays?: number;       // مدة صلاحية التقرير
  inspectionDate?: string;
  scopeOfWork?: string;
};

// =========== Helpers ===========
const arNum = (n: number) => new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const arPct = (n: number) => `${new Intl.NumberFormat("ar-EG", { maximumFractionDigits: 1 }).format(n * 100)}٪`;
const arDate = () => new Date().toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

async function renderHtmlToPdf(html: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:-99999px;left:0;width:794px;background:#fff;direction:rtl;font-family:'Cairo','Tajawal','Segoe UI',Tahoma,Arial,sans-serif;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH;
    let position = 0;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) {
      position -= pageH;
      pdf.addPage();
      pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
      heightLeft -= pageH;
    }
    pdf.save(filename);
  } finally {
    document.body.removeChild(container);
  }
}

// =========== Shared layout ===========
const shellCSS = `
  .pg{padding:40px 32px;color:#1a1a1a;font-size:14px;line-height:1.7;}
  .hdr{background:linear-gradient(135deg,#0F234B,#1D4D8C);color:#fff;padding:24px 32px;margin:-40px -32px 24px;}
  .hdr h1{margin:0;font-size:24px;font-weight:800;}
  .hdr .sub{font-size:13px;opacity:.9;margin-top:6px;}
  .hdr .meta{display:flex;justify-content:space-between;margin-top:14px;font-size:12px;opacity:.95;}
  h2{font-size:17px;color:#0F234B;border-bottom:2px solid #0F234B;padding-bottom:6px;margin:24px 0 12px;font-weight:700;}
  h3{font-size:14px;color:#1D4D8C;margin:14px 0 8px;font-weight:700;}
  table{width:100%;border-collapse:collapse;margin:8px 0;font-size:12px;}
  th,td{border:1px solid #ddd;padding:7px 10px;text-align:right;}
  th{background:#0F234B;color:#fff;font-weight:700;}
  tr:nth-child(even) td{background:#f7f9fc;}
  .kv td:first-child{background:#eef2f7;font-weight:700;width:35%;}
  .final-box{background:linear-gradient(135deg,#0F234B,#1D4D8C);color:#fff;padding:20px;border-radius:8px;margin:16px 0;display:flex;justify-content:space-between;align-items:center;}
  .final-box .lbl{font-size:13px;opacity:.9;}
  .final-box .val{font-size:30px;font-weight:800;}
  .badge{display:inline-block;background:#1D9E75;color:#fff;padding:3px 10px;border-radius:12px;font-size:11px;margin:0 4px;}
  .badge.warn{background:#EF9F27;}
  .badge.red{background:#D85A30;}
  .grid2{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
  .grid3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;}
  .stat{background:#f7f9fc;border:1px solid #e5e9f0;border-radius:6px;padding:12px;text-align:center;}
  .stat .l{font-size:11px;color:#666;}
  .stat .v{font-size:18px;font-weight:800;color:#0F234B;margin-top:4px;}
  .note{background:#fff8e6;border-right:4px solid #EF9F27;padding:10px 14px;margin:12px 0;font-size:12px;}
  .foot{margin-top:24px;padding-top:12px;border-top:1px solid #ccc;text-align:center;font-size:11px;color:#666;}
  .method-card{background:#f7f9fc;border:1px solid #e5e9f0;border-radius:6px;padding:12px;margin:8px 0;}
  .method-card .head{display:flex;justify-content:space-between;align-items:center;}
  .method-card .name{font-weight:700;color:#0F234B;font-size:13px;}
  .method-card .val{font-weight:800;color:#1D9E75;font-size:16px;}
  .method-card .desc{font-size:11px;color:#666;margin-top:6px;}
  ul.attlist{list-style:none;padding:0;margin:4px 0;font-size:11px;}
  ul.attlist li{padding:3px 0;border-bottom:1px dashed #ddd;}
`;

function shell(title: string, subject: string, body: string) {
  return `<style>${shellCSS}</style>
  <div class="pg">
    <div class="hdr">
      <h1>${title}</h1>
      <div class="sub">${subject}</div>
      <div class="meta"><span>تاريخ التقرير: ${arDate()}</span><span>متوافق مع EES و IVS 2022</span></div>
    </div>
    ${body}
    <div class="foot">منصة مقيّم بورسعيد · تقرير تقييم عقاري احترافي · جميع القيم بالجنيه المصري</div>
  </div>`;
}

// =========== 1) تقرير الوحدة (شامل بكل طرق التقييم + المرجح) ===========
export function generateUnitReport(prop: Property, area: Area, opts?: { txns?: Transaction[]; comparables?: { prop: Property; txn: Transaction }[]; monthlyRent?: number; capRate?: number; annualRevenue?: number; opMargin?: number; meta?: ReportMeta }) {
  const txns = opts?.txns || [];
  const hpi = buildHPI(txns);
  const comparables = opts?.comparables || [];

  // مدخلات افتراضية محسوبة من بيانات العقار
  const estRent = opts?.monthlyRent ?? Math.round(prop.area_sqm * 18); // 18 ج/م²/شهر تقديري
  const capRate = opts?.capRate ?? 0.085;
  const annualRevenue = opts?.annualRevenue ?? prop.area_sqm * 18 * 12 * 4;
  const opMargin = opts?.opMargin ?? 0.25;

  // حساب الـ 5 طرق
  const sales = comparables.length ? salesComparison(prop, comparables, hpi) : { value: prop.base_price, grid: [] as AdjustmentRow[], outliers: [] as string[] };
  const income = incomeApproach(prop, estRent, capRate);
  const cost = costApproach(prop, area);
  const residual = prop.category === "res" ? residualMethod(prop.area_sqm * 0.5, area, prop.area_sqm, prop.base_price / prop.area_sqm * 1.15) : 0;
  const profitV = prop.category === "com" ? profitMethod(annualRevenue, opMargin) : 0;

  // الترجيح حسب نوع المبنى
  const w = WTS[prop.building_type] || WTS.APT;
  const weights = { sales: w.s / 100, income: w.i / 100, cost: w.c / 100, residual: w.r / 100, profit: w.p / 100 };
  const values = { sales: sales.value, income, cost: cost.total, residual, profit: profitV };
  const final = reconcile(values, weights);
  const ci = confidenceInterval([sales.value, income, cost.total, residual, profitV]);

  // مؤشرات تكميلية
  const inv = getInvReturn(prop, area);
  const cond = getBuildingCondition(prop);
  const att = getBuildingAttachments(prop, area);
  const ht = getHousingType(prop, area);

  const methodCard = (k: keyof typeof values, value: number) => {
    const m = VMETA.find((x) => x.k === k)!;
    const wt = (weights as any)[k] as number;
    return `<div class="method-card">
      <div class="head">
        <div class="name">${m.ic} ${m.ar}</div>
        <div class="val">${value > 0 ? arNum(value) + " ج" : "—"}</div>
      </div>
      <div class="desc">${m.desc}</div>
      <div style="margin-top:6px;font-size:11px;"><b>الوزن المرجح:</b> ${arPct(wt)} · <b>القيمة المرجحة:</b> ${arNum(value * wt)} ج</div>
    </div>`;
  };

  const body = `
    <h2>أولاً: بيانات العقار محل التقييم</h2>
    <table class="kv">
      <tr><td>رقم العقار</td><td>${prop.id}</td><td>نوع العقار</td><td>${prop.type_label}</td></tr>
      <tr><td>المنطقة</td><td>${area.name}</td><td>الحي / المدينة</td><td>${(area as any).districts?.name || "-"}</td></tr>
      <tr><td>المساحة</td><td>${arNum(prop.area_sqm)} م²</td><td>نوع المبنى</td><td>${prop.building_type}</td></tr>
      <tr><td>الدور</td><td>${prop.floor ?? "-"}</td><td>الإطلالة</td><td>${prop.view || "-"}</td></tr>
      <tr><td>التشطيب</td><td>${prop.finish || "-"}</td><td>سنة البناء</td><td>${prop.year_built ?? "-"}</td></tr>
      <tr><td>الغرف / الحمامات</td><td>${prop.rooms ?? 0} / ${prop.baths ?? 0}</td><td>تصنيف الإسكان</td><td>${ht}</td></tr>
    </table>

    <h2>ثانياً: حالة المبنى ومؤشرات الاستثمار</h2>
    <div class="grid3">
      <div class="stat"><div class="l">حالة المبنى</div><div class="v" style="color:${cond.color}">${arNum(cond.score)}/100</div><div style="font-size:11px;color:${cond.color}">${cond.grade}</div></div>
      <div class="stat"><div class="l">السعر اليومي الحالي</div><div class="v">${arNum(inv.cur)} ج</div></div>
      <div class="stat"><div class="l">السعر / م²</div><div class="v">${arNum(inv.cur / prop.area_sqm)} ج</div></div>
      <div class="stat"><div class="l">Capital Appreciation</div><div class="v">${arNum(parseFloat(inv.cap))}٪</div></div>
      <div class="stat"><div class="l">Rental Yield</div><div class="v">${arNum(parseFloat(inv.rYield))}٪</div></div>
      <div class="stat"><div class="l">Total ROI</div><div class="v">${arNum(parseFloat(inv.totROI))}٪</div></div>
    </div>

    <h2>ثالثاً: طرق التقييم الخمس (تفصيلياً)</h2>
    ${methodCard("sales", values.sales)}
    ${methodCard("income", values.income)}
    ${methodCard("cost", values.cost)}
    ${methodCard("residual", values.residual)}
    ${methodCard("profit", values.profit)}

    <div class="note"><b>منطق الترجيح:</b> ${w.why}</div>

    <h2>رابعاً: تفاصيل طريقة التكلفة</h2>
    <table>
      <tr><th>البند</th><th>القيمة (ج)</th><th>ملاحظات</th></tr>
      <tr><td>قيمة الأرض</td><td>${arNum(cost.land)}</td><td>${arNum(area.land_psqm)} ج/م² × مساحة الأرض المقدّرة</td></tr>
      <tr><td>تكلفة الإحلال الجديدة</td><td>${arNum(cost.building + cost.depreciation)}</td><td>معدل البناء حسب نوع المبنى</td></tr>
      <tr><td>الإهلاك</td><td>${arNum(cost.depreciation)}</td><td>${arNum((cost.depreciation / (cost.building + cost.depreciation)) * 100)}٪ بمعدل ١٫٥٪ سنوياً</td></tr>
      <tr><td>صافي تكلفة المبنى</td><td>${arNum(cost.building)}</td><td>بعد خصم الإهلاك</td></tr>
      <tr><td><b>إجمالي التكلفة</b></td><td><b>${arNum(cost.total)}</b></td><td>أرض + مبنى</td></tr>
    </table>

    <h2>خامساً: تفاصيل طريقة الدخل</h2>
    <table>
      <tr><th>البند</th><th>القيمة (ج)</th></tr>
      <tr><td>الإيجار الشهري المقدّر</td><td>${arNum(estRent)}</td></tr>
      <tr><td>الدخل السنوي الإجمالي GPI</td><td>${arNum(estRent * 12)}</td></tr>
      <tr><td>الدخل بعد معدل الإشغال (٨٪ شواغر)</td><td>${arNum(estRent * 12 * 0.92)}</td></tr>
      <tr><td>صافي الدخل التشغيلي NOI (بعد ٢٠٪ مصاريف)</td><td>${arNum(estRent * 12 * 0.92 * 0.8)}</td></tr>
      <tr><td>معدل الرسملة Cap Rate</td><td>${arPct(capRate)}</td></tr>
      <tr><td><b>القيمة بطريقة الدخل</b></td><td><b>${arNum(income)}</b></td></tr>
    </table>

    ${sales.grid.length ? `<h2>سادساً: جدول التسويات Adjustment Grid</h2>
    <table>
      <tr><th>المقارنة</th><th>سعر البيع</th><th>ج/م²</th><th>تسوية الموقع</th><th>تسوية المساحة</th><th>تسوية التشطيب</th><th>تسوية الزمن</th><th>ج/م² المعدّل</th><th>القيمة المعدّلة</th></tr>
      ${sales.grid.map(g => `<tr><td>${g.comparable_id}</td><td>${arNum(g.sale_price)}</td><td>${arNum(g.ppsqm)}</td><td>${arPct(g.adj_location)}</td><td>${arPct(g.adj_size)}</td><td>${arPct(g.adj_finish)}</td><td>${arPct(g.adj_time)}</td><td>${arNum(g.adjusted_ppsqm)}</td><td>${arNum(g.adjusted_total)}</td></tr>`).join("")}
    </table>` : ""}

    <h2>سابعاً: حساب القيمة النهائية المرجحة</h2>
    <table>
      <tr><th>الطريقة</th><th>القيمة (ج)</th><th>الوزن المرجح</th><th>القيمة المرجحة (ج)</th></tr>
      <tr><td>طريقة المقارنة السوقية</td><td>${arNum(values.sales)}</td><td>${arPct(weights.sales)}</td><td>${arNum(values.sales * weights.sales)}</td></tr>
      <tr><td>طريقة رسملة الدخل</td><td>${arNum(values.income)}</td><td>${arPct(weights.income)}</td><td>${arNum(values.income * weights.income)}</td></tr>
      <tr><td>طريقة التكلفة</td><td>${arNum(values.cost)}</td><td>${arPct(weights.cost)}</td><td>${arNum(values.cost * weights.cost)}</td></tr>
      <tr><td>طريقة القيمة المتبقية</td><td>${arNum(values.residual)}</td><td>${arPct(weights.residual)}</td><td>${arNum(values.residual * weights.residual)}</td></tr>
      <tr><td>طريقة الأرباح التشغيلية</td><td>${arNum(values.profit)}</td><td>${arPct(weights.profit)}</td><td>${arNum(values.profit * weights.profit)}</td></tr>
      <tr style="background:#e8f5ec;font-weight:800;"><td>المجموع</td><td>—</td><td>${arPct(weights.sales + weights.income + weights.cost + weights.residual + weights.profit)}</td><td>${arNum(final)}</td></tr>
    </table>

    <div class="final-box">
      <div>
        <div class="lbl">القيمة السوقية النهائية للعقار</div>
        <div style="font-size:11px;opacity:.85;margin-top:6px;">النطاق: ${arNum(ci.low)} — ${arNum(ci.high)} ج · معامل الاختلاف CV: ${arPct(ci.cv)}</div>
      </div>
      <div>
        <div class="val">${arNum(final)} ج</div>
        <div style="text-align:left;margin-top:4px;"><span class="badge ${ci.cv < 0.15 ? "" : ci.cv < 0.25 ? "warn" : "red"}">${ci.cv < 0.15 ? "موثوق" : ci.cv < 0.25 ? "متوسط الموثوقية" : "يحتاج تحقق"}</span></div>
      </div>
    </div>

    <h2>ثامناً: المرفقات والتجهيزات</h2>
    <div class="grid3">
      ${ATT_CATS.map(c => {
        const items = (att as any)[c.k] as string[];
        if (!items?.length) return "";
        return `<div class="method-card"><div class="name">${c.ic} ${c.t}</div><ul class="attlist">${items.map(it => `<li>• ${it}</li>`).join("")}</ul></div>`;
      }).join("")}
    </div>

    <div class="note"><b>إقرار المقيّم:</b> هذا التقرير أُعد وفقاً لمعايير الجمعية المصرية للمقيمين العقاريين (EES) ومعايير التقييم الدولية (IVS 2022). القيمة المذكورة هي تقدير سوقي بتاريخ التقرير ولا تُعد ضماناً لسعر بيع فعلي.</div>
  `;

  return renderHtmlToPdf(shell("تقرير تقييم وحدة عقارية", `${prop.type_label} — ${area.name} — #${prop.id}`, body), `unit-${prop.id}.pdf`);
}

// =========== 2) تقرير السوق العام ===========
export function generateMarketReport(areas: Area[], properties: Property[]) {
  const ind = getMarketIndicators(areas, properties);
  const top = [...areas].sort((a, b) => b.base_price - a.base_price).slice(0, 15);
  const body = `
    <h2>المؤشرات السوقية الرئيسية</h2>
    <table>
      <tr><th>المحور</th><th>المؤشر</th><th>القيمة</th></tr>
      <tr><td rowspan="3">العرض والطلب</td><td>معدل الشواغر</td><td>${ind.sd.vacRate}٪</td></tr>
      <tr><td>معدل الامتصاص (وحدة/شهر)</td><td>${arNum(ind.sd.absorpRate)}</td></tr>
      <tr><td>إجمالي الوحدات المعروضة</td><td>${arNum(ind.sd.inventory)}</td></tr>
      <tr><td rowspan="4">الأسعار والعائد</td><td>قيمة مؤشر HPI</td><td>${ind.pr.hpiVal}</td></tr>
      <tr><td>متوسط ROI الكلي</td><td>${ind.pr.avgROI}٪</td></tr>
      <tr><td>متوسط Rental Yield</td><td>${ind.pr.avgRY}٪</td></tr>
      <tr><td>Capital Appreciation</td><td>${ind.pr.capApp}٪</td></tr>
      <tr><td rowspan="4">الاقتصاد الكلي</td><td>سعر الفائدة</td><td>${arNum(ind.macro.interestRate)}٪</td></tr>
      <tr><td>التضخم</td><td>${arNum(ind.macro.inflation)}٪</td></tr>
      <tr><td>الرهن العقاري / GDP</td><td>${arNum(ind.macro.mortgageGDP)}٪</td></tr>
      <tr><td>السعر / الدخل السنوي</td><td>${ind.macro.priceTOIncome}</td></tr>
      <tr><td rowspan="4">المطورون</td><td>متوسط ج/م²</td><td>${arNum(ind.dev.avgPsqm)}</td></tr>
      <tr><td>تكلفة البناء</td><td>${arNum(ind.dev.avgBuildCost)} ج</td></tr>
      <tr><td>هامش المطور</td><td>${ind.dev.devMargin}٪</td></tr>
      <tr><td>متوسط IRR</td><td>${ind.dev.avgIRR}٪</td></tr>
      <tr><td rowspan="3">تقييم الموقع</td><td>البنية التحتية /٥</td><td>${ind.loc.avgInfra}</td></tr>
      <tr><td>الخدمات /٥</td><td>${ind.loc.avgSvc}</td></tr>
      <tr><td>الطلب السكاني</td><td>${ind.loc.popDemand}٪</td></tr>
    </table>

    <h2>أعلى ١٥ منطقة من حيث السعر</h2>
    <table>
      <tr><th>الترتيب</th><th>المنطقة</th><th>السعر الأساسي ج/م²</th><th>السعر الحالي ج/م²</th><th>النمو</th></tr>
      ${top.map((a, i) => `<tr><td>${arNum(i + 1)}</td><td>${a.name}</td><td>${arNum(a.base_price)}</td><td>${arNum(getDailyPrice(a.base_price, a.growth))}</td><td>${arPct(a.growth)}</td></tr>`).join("")}
    </table>
  `;
  return renderHtmlToPdf(shell("تقرير السوق العام", `تحليل شامل لـ ${arNum(areas.length)} منطقة و ${arNum(properties.length)} عقار`, body), `market-${Date.now()}.pdf`);
}

// =========== 3) تقرير منطقة ===========
export function generateAreaReport(area: Area, properties: Property[], txns: Transaction[]) {
  const inArea = properties.filter((p) => p.area_id === area.id);
  const inAreaTxns = txns.filter((t) => inArea.some((p) => p.id === t.property_id));
  const cur = getDailyPrice(area.base_price, area.growth);
  const body = `
    <h2>بيانات المنطقة الأساسية</h2>
    <table class="kv">
      <tr><td>السعر الأساسي</td><td>${arNum(area.base_price)} ج/م²</td><td>السعر الحالي</td><td>${arNum(cur)} ج/م²</td></tr>
      <tr><td>سعر الأرض</td><td>${arNum(area.land_psqm)} ج/م²</td><td>نوع الحيازة</td><td>${(area as any).land_own || "-"}</td></tr>
      <tr><td>معدل النمو</td><td>${arPct(area.growth)}</td><td>عدد العقارات</td><td>${arNum(inArea.length)}</td></tr>
      <tr><td>البنية التحتية</td><td>${area.infra_rating ?? "-"} /٥</td><td>الخدمات</td><td>${area.services_rating ?? "-"} /٥</td></tr>
      <tr><td>المواصلات</td><td>${area.transport_rating ?? "-"} /٥</td><td>الأمن</td><td>${area.safety_rating ?? "-"} /٥</td></tr>
    </table>

    ${(area as any).hood_desc ? `<h2>وصف الحي</h2><div class="note">${(area as any).hood_desc}</div>` : ""}

    <h2>العقارات في المنطقة (${arNum(inArea.length)})</h2>
    <table>
      <tr><th>الكود</th><th>النوع</th><th>المساحة</th><th>السعر الأساسي</th><th>السعر الحالي</th><th>سنة البناء</th></tr>
      ${inArea.slice(0, 30).map(p => `<tr><td>${p.id}</td><td>${p.type_label}</td><td>${arNum(p.area_sqm)} م²</td><td>${arNum(p.base_price)} ج</td><td>${arNum(getDailyPrice(p.base_price, area.growth))} ج</td><td>${p.year_built ?? "-"}</td></tr>`).join("")}
    </table>

    ${inAreaTxns.length ? `<h2>المعاملات المسجلة (${arNum(inAreaTxns.length)})</h2>
    <table>
      <tr><th>العقار</th><th>التاريخ</th><th>السعر</th></tr>
      ${inAreaTxns.slice(0, 20).map(t => `<tr><td>${t.property_id}</td><td>${t.txn_date}</td><td>${arNum(t.price)} ج</td></tr>`).join("")}
    </table>` : ""}
  `;
  return renderHtmlToPdf(shell("تقرير تحليل منطقة", `${area.name} — ${(area as any).districts?.name || ""}`, body), `area-${area.id}.pdf`);
}

// =========== 4) تقرير مقارن ===========
export function generateComparativeReport(areas: Area[], properties: Property[]) {
  const body = `
    <h2>مقارنة شاملة بين المناطق (${arNum(areas.length)})</h2>
    <table>
      <tr><th>المنطقة</th><th>ج/م² أساسي</th><th>ج/م² حالي</th><th>النمو</th><th>سعر الأرض</th><th>بنية</th><th>خدمات</th><th>مواصلات</th><th>عقارات</th></tr>
      ${areas.map(a => `<tr>
        <td><b>${a.name}</b></td>
        <td>${arNum(a.base_price)}</td>
        <td>${arNum(getDailyPrice(a.base_price, a.growth))}</td>
        <td>${arPct(a.growth)}</td>
        <td>${arNum(a.land_psqm)}</td>
        <td>${a.infra_rating ?? "-"}</td>
        <td>${a.services_rating ?? "-"}</td>
        <td>${a.transport_rating ?? "-"}</td>
        <td>${arNum(properties.filter(p => p.area_id === a.id).length)}</td>
      </tr>`).join("")}
    </table>

    <h2>الترتيب حسب معدل النمو</h2>
    <table>
      <tr><th>الترتيب</th><th>المنطقة</th><th>النمو</th><th>التصنيف</th></tr>
      ${[...areas].sort((a, b) => b.growth - a.growth).slice(0, 20).map((a, i) => {
        const cat = a.growth > 0.5 ? "ساخن" : a.growth > 0.3 ? "نشط" : a.growth > 0.15 ? "مستقر" : "هادئ";
        return `<tr><td>${arNum(i + 1)}</td><td>${a.name}</td><td>${arPct(a.growth)}</td><td>${cat}</td></tr>`;
      }).join("")}
    </table>
  `;
  return renderHtmlToPdf(shell("التقرير المقارن", `مقارنة ${arNum(areas.length)} منطقة جنباً إلى جنب`, body), `compare-${Date.now()}.pdf`);
}

// إعادة تصدير للتوافق مع الكود القديم في صفحة /valuate
export { fmt, pct };
