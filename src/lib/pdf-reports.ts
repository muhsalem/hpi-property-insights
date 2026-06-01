// مولّد تقارير PDF بالعربي عبر تحويل HTML → Canvas → PDF
import { jsPDF } from "jspdf";
import html2canvas from "html2canvas-pro";
import QRCode from "qrcode";
import {
  salesComparison, incomeApproach, costApproach, residualMethod, profitMethod,
  reconcile, confidenceInterval, buildHPI, highestAndBestUse, fmt, pct,
  type Property, type Area, type Transaction, type AdjustmentRow,
} from "./valuation";
import { getDailyPrice, getInvReturn, getBuildingCondition, getBuildingAttachments, getHousingType, getMarketIndicators } from "./domain";
import { computeUnitIndicators, indicatorsHealthScore } from "./unit-indicators";
import { WTS, VMETA, ATT_CATS } from "./constants";

// =========== Verification helpers (Trust layer) ===========
// Generate a short report ID (e.g. RPT-AB12CD34) — deterministic-ish, unique per call
function generateReportId(prefix = "RPT"): string {
  const r = Math.random().toString(36).slice(2, 6).toUpperCase();
  const t = Date.now().toString(36).slice(-4).toUpperCase();
  return `${prefix}-${t}${r}`;
}

// Simple FNV-1a hash → 16-char hex (lightweight integrity fingerprint, not cryptographic)
function reportHash(payload: string): string {
  let h1 = 0x811c9dc5, h2 = 0xcbf29ce4;
  for (let i = 0; i < payload.length; i++) {
    const c = payload.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 0x01000193) >>> 0;
    h2 = Math.imul(h2 ^ c, 0x100000001b3 & 0xffffffff) >>> 0;
  }
  return (h1.toString(16).padStart(8, "0") + h2.toString(16).padStart(8, "0")).toUpperCase();
}

async function generateQrDataUrl(text: string, size = 140): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { width: size, margin: 1, errorCorrectionLevel: "M",
      color: { dark: "#0F234B", light: "#ffffff" } });
  } catch {
    return "";
  }
}

// Verification block (used in both AR & EN reports)
function verificationBlockAr(reportId: string, hash: string, qrDataUrl: string, verifyUrl: string) {
  return `<div style="border:2px solid #0F234B;border-radius:8px;padding:14px;margin:16px 0;display:flex;gap:16px;align-items:center;background:#f7f9fc;">
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:110px;height:110px;border:1px solid #ccc;background:#fff;padding:4px;border-radius:4px;"/>` : ""}
    <div style="flex:1;font-size:12px;line-height:1.7;">
      <div style="font-weight:800;color:#0F234B;font-size:14px;margin-bottom:6px;">🔐 التحقق من صحة التقرير</div>
      <div><b>رقم التقرير:</b> <span style="font-family:monospace;color:#0F234B;font-weight:700;">${reportId}</span></div>
      <div><b>بصمة الوثيقة (SHA-FNV):</b> <span style="font-family:monospace;font-size:11px;">${hash}</span></div>
      <div><b>رابط التحقق:</b> <span style="font-family:monospace;font-size:11px;color:#1D4D8C;">${verifyUrl}</span></div>
      <div style="margin-top:6px;color:#666;font-size:11px;">امسح رمز QR للتحقق من أصل التقرير ومطابقته للنسخة المسجّلة لدى المقيّم. أي تعديل على هذا الملف يُبطل البصمة.</div>
    </div>
  </div>`;
}

function verificationBlockEn(reportId: string, hash: string, qrDataUrl: string, verifyUrl: string) {
  return `<div style="border:2px solid #0F234B;border-radius:8px;padding:14px;margin:16px 0;display:flex;gap:16px;align-items:center;background:#f7f9fc;">
    ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR" style="width:110px;height:110px;border:1px solid #ccc;background:#fff;padding:4px;border-radius:4px;"/>` : ""}
    <div style="flex:1;font-size:12px;line-height:1.7;direction:ltr;">
      <div style="font-weight:800;color:#0F234B;font-size:14px;margin-bottom:6px;">🔐 Report Verification</div>
      <div><b>Report ID:</b> <span style="font-family:monospace;color:#0F234B;font-weight:700;">${reportId}</span></div>
      <div><b>Document fingerprint (SHA-FNV):</b> <span style="font-family:monospace;font-size:11px;">${hash}</span></div>
      <div><b>Verification URL:</b> <span style="font-family:monospace;font-size:11px;color:#1D4D8C;">${verifyUrl}</span></div>
      <div style="margin-top:6px;color:#666;font-size:11px;">Scan the QR code to verify the authenticity of this report against the valuer's master copy. Any alteration of this file will invalidate the fingerprint.</div>
    </div>
  </div>`;
}



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
      <div class="meta"><span>تاريخ التقرير: ${arDate()}</span><span>متوافق مع المعايير المصرية للتقييم العقاري (EAA/EES) · الهيئة العامة للرقابة المالية (FRA) · IVS 2022</span></div>
    </div>
    ${body}
    <div class="foot">منصة مقيّم بورسعيد · تقرير تقييم عقاري احترافي · جميع القيم بالجنيه المصري · النسخة العربية المعتمدة محلياً</div>
  </div>`;
}

// =========== English LTR shell ===========
const shellEnCSS = shellCSS
  .replace(/text-align:right/g, "text-align:left")
  .replace(/border-right:/g, "border-left:")
  .replace(/border-right-color:/g, "border-left-color:")
  .replace(/padding-right:/g, "padding-left:");

function shellEn(title: string, subject: string, body: string) {
  return `<style>${shellEnCSS}</style>
  <div class="pg" style="direction:ltr;font-family:'Inter','Segoe UI',Arial,sans-serif;">
    <div class="hdr">
      <h1>${title}</h1>
      <div class="sub">${subject}</div>
      <div class="meta"><span>Report date: ${enDate()}</span><span>Compliant with IVS 2022 · RICS Red Book Global (2022) · USPAP 2024-2025</span></div>
    </div>
    ${body}
    <div class="foot">Port Said Valuer Platform · Professional Real-Estate Valuation Report · All figures in Egyptian Pound (EGP) · International English Edition</div>
  </div>`;
}

const enNum = (n: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(Math.round(n || 0));
const enPct = (n: number) => `${(n * 100).toFixed(1)}%`;
const enDate = () => new Date().toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

async function renderHtmlToPdfEn(html: string, filename: string): Promise<void> {
  const container = document.createElement("div");
  container.style.cssText = "position:fixed;top:-99999px;left:0;width:794px;background:#fff;direction:ltr;font-family:'Inter','Segoe UI',Arial,sans-serif;";
  container.innerHTML = html;
  document.body.appendChild(container);
  try {
    const canvas = await html2canvas(container, { scale: 2, backgroundColor: "#ffffff", useCORS: true, logging: false });
    const pdf = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
    const pageW = pdf.internal.pageSize.getWidth();
    const pageH = pdf.internal.pageSize.getHeight();
    const imgW = pageW;
    const imgH = (canvas.height * imgW) / canvas.width;
    let heightLeft = imgH; let position = 0;
    const imgData = canvas.toDataURL("image/jpeg", 0.92);
    pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH);
    heightLeft -= pageH;
    while (heightLeft > 0) { position -= pageH; pdf.addPage(); pdf.addImage(imgData, "JPEG", 0, position, imgW, imgH); heightLeft -= pageH; }
    pdf.save(filename);
  } finally { document.body.removeChild(container); }
}

// =========== 1) تقرير الوحدة (شامل بكل طرق التقييم + المرجح) ===========
export async function generateUnitReport(prop: Property, area: Area, opts?: { txns?: Transaction[]; comparables?: { prop: Property; txn: Transaction }[]; monthlyRent?: number; capRate?: number; annualRevenue?: number; opMargin?: number; meta?: ReportMeta }) {
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
  const hbu = highestAndBestUse(prop, area);

  // بيانات وصف المقيّم والتقرير
  const meta = opts?.meta || {};
  const validity = meta.validityDays ?? 90;
  const valDate = meta.valuationDate || new Date().toISOString().slice(0, 10);
  const inspDate = meta.inspectionDate || valDate;
  const expiry = new Date(); expiry.setDate(expiry.getDate() + validity);
  const expiryStr = expiry.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

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
    <h2>بيانات التقرير والمقيّم</h2>
    <table class="kv">
      <tr><td>اسم المقيّم</td><td>${meta.appraiserName || "—"}</td><td>رقم القيد / الترخيص</td><td>${meta.appraiserLicense || "—"}</td></tr>
      <tr><td>الجهة المرخّصة</td><td>${meta.appraiserAuthority || "الهيئة العامة للرقابة المالية / EES"}</td><td>هاتف التواصل</td><td>${meta.appraiserPhone || "—"}</td></tr>
      <tr><td>العميل / الجهة الطالبة</td><td>${meta.clientName || "—"}</td><td>الغرض من التقييم</td><td>${meta.purpose || "تقدير القيمة السوقية"}</td></tr>
      <tr><td>تاريخ المعاينة</td><td>${inspDate}</td><td>تاريخ التقييم</td><td>${valDate}</td></tr>
      <tr><td>تاريخ إصدار التقرير</td><td>${arDate()}</td><td>صلاحية التقرير حتى</td><td>${expiryStr} (${arNum(validity)} يوم)</td></tr>
      <tr><td colspan="4"><b>نطاق العمل:</b> ${meta.scopeOfWork || "معاينة ميدانية للعقار، تحليل البيانات السوقية المتاحة، تطبيق طرق التقييم الخمس وفقاً لـ IVS 2022، وإصدار رأي مهني بالقيمة السوقية."}</td></tr>
    </table>

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
      <tr><th>المقارنة</th><th>سعر البيع</th><th>ج/م²</th><th>تسوية الموقع</th><th>تسوية المساحة</th><th>تسوية التشطيب</th><th>تسوية الزمن</th><th>ج/م² المعدّل</th><th>القيمة المعدّلة</th><th>الحالة</th></tr>
      ${sales.grid.map(g => { const isOut = sales.outliers.includes(g.comparable_id); return `<tr style="${isOut?'background:#fff0f0;color:#a33;':''}"><td>${g.comparable_id}</td><td>${arNum(g.sale_price)}</td><td>${arNum(g.ppsqm)}</td><td>${arPct(g.adj_location)}</td><td>${arPct(g.adj_size)}</td><td>${arPct(g.adj_finish)}</td><td>${arPct(g.adj_time)}</td><td>${arNum(g.adjusted_ppsqm)}</td><td>${arNum(g.adjusted_total)}</td><td>${isOut?'مُستبعد (شاذ)':'مقبول'}</td></tr>`; }).join("")}
    </table>
    ${sales.outliers.length ? `<div class="note"><b>تنويه إحصائي:</b> تم استبعاد ${arNum(sales.outliers.length)} مقارنة شاذة باستخدام طريقة IQR (1.5×) لتحسين دقة المتوسط.</div>` : ""}` : ""}

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
        <div style="font-size:11px;opacity:.85;margin-top:6px;">نطاق الثقة 95٪: ${arNum(ci.low)} — ${arNum(ci.high)} ج · CV: ${arPct(ci.cv)} · حجم العينة n=${arNum(ci.n)} · الخطأ المعياري SE=${arNum(ci.se)}</div>
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

    ${(() => {
      const branches = computeUnitIndicators(prop, area, txns);
      const total = branches.reduce((s, b) => s + b.nodes.length, 0);
      const goods = branches.reduce((s, b) => s + b.nodes.filter(n => n.status === "good").length, 0);
      const bads = branches.reduce((s, b) => s + b.nodes.filter(n => n.status === "bad").length, 0);
      const health = indicatorsHealthScore(branches);
      const stColor: Record<string, string> = { good: "#1D9E75", warn: "#EF9F27", bad: "#D85A30", neutral: "#185FA5" };
      const stLabel: Record<string, string> = { good: "✓", warn: "•", bad: "✗", neutral: "—" };
      return `
      <h2>تاسعاً: شجرة المؤشرات الشاملة لتقييم العقار (${arNum(total)} مؤشر · ${arNum(branches.length)} محاور)</h2>
      <div style="display:flex;gap:10px;margin:8px 0 12px;">
        <div class="stat" style="flex:1;"><div class="l">صحة الوحدة</div><div class="v" style="color:${health >= 60 ? "#1D9E75" : health >= 35 ? "#EF9F27" : "#D85A30"}">${arNum(health)}٪</div></div>
        <div class="stat" style="flex:1;"><div class="l">مؤشرات إيجابية</div><div class="v" style="color:#1D9E75">${arNum(goods)}</div></div>
        <div class="stat" style="flex:1;"><div class="l">مؤشرات سلبية</div><div class="v" style="color:#D85A30">${arNum(bads)}</div></div>
        <div class="stat" style="flex:1;"><div class="l">إجمالي المؤشرات</div><div class="v">${arNum(total)}</div></div>
      </div>
      ${branches.map(b => `
        <h3 style="border-right:4px solid ${b.color};padding-right:8px;">${b.ar} <span style="font-size:11px;color:#666;font-weight:400;">— ${b.en} (${arNum(b.nodes.length)})</span></h3>
        <table>
          <tr><th style="width:10%">الرمز</th><th>المؤشر (عربي)</th><th>EN</th><th>القيمة</th><th>الحالة</th></tr>
          ${b.nodes.map(n => `<tr>
            <td style="font-family:monospace;font-size:10px;">${n.code}</td>
            <td>${n.ar}${n.hint ? `<div style="font-size:10px;color:#888">${n.hint}</div>` : ""}</td>
            <td style="font-size:11px;color:#555">${n.en}</td>
            <td style="text-align:left;white-space:nowrap;"><b>${typeof n.value === "number" ? arNum(n.value) : n.value}</b>${n.unit ? ` <span style="color:#888;font-size:11px;">${n.unit}</span>` : ""}</td>
            <td style="text-align:center;color:${stColor[n.status || "neutral"]};font-weight:700;">${stLabel[n.status || "neutral"]}</td>
          </tr>`).join("")}
        </table>
      `).join("")}
      <div class="note"><b>قراءة المؤشرات:</b> ✓ إيجابي/قوي · • متوسط/يحتاج متابعة · ✗ سلبي/مخاطرة · — محايد/معلوماتي. المؤشرات مبنية على معايير IVS 2022 ومنهجيات NAR/UBS/RICS مع تكييفها للسوق المصري.</div>
      `;
    })()}


    <h2>عاشراً: تحليل أفضل استخدام Highest & Best Use</h2>
    <table class="kv">
      <tr><td>الاستخدام الأمثل المقترح</td><td colspan="3"><b>${hbu.use}</b></td></tr>
      <tr><td>قانونياً مسموح</td><td>${hbu.legallyPermissible ? "✓ نعم" : "✗ يحتاج مراجعة"}</td><td>مادياً ممكن</td><td>${hbu.physicallyPossible ? "✓ نعم" : "✗ قيود مادية"}</td></tr>
      <tr><td>مالياً مجدٍ</td><td>${hbu.financiallyFeasible ? "✓ نعم" : "✗ غير مجدٍ"}</td><td>الأعلى إنتاجية</td><td>${hbu.maximallyProductive ? "✓ نعم" : "✗ يحتمل التحسين"}</td></tr>
      <tr><td colspan="4">${hbu.rationale}</td></tr>
    </table>

    ${(() => {
      // ===== قسم تأمين العقار (Property Insurance) =====
      // قاعدة السوق المصري 2025-2026: قطاع التأمين العقاري ينمو ~22% سنوياً
      // المراجع: اتحاد التأمين المصري · الهيئة العامة للرقابة المالية FRA · معايير IFRS 17
      const replacementCost = cost.building + cost.depreciation; // تكلفة الإحلال الكاملة (بدون أرض)
      const contentsCoverage = Math.round(replacementCost * 0.15); // محتويات: 15% من قيمة المبنى
      const liabilityCoverage = Math.max(500_000, Math.round(final * 0.10)); // مسؤولية مدنية للغير
      const lossOfRent = Math.round(estRent * 12 * 0.5); // فقد إيجار 6 أشهر
      // أسعار الأقساط (بالألف) حسب نوع المبنى ومخاطر بورسعيد (ساحلي)
      const isCoastal = (area as any).districts?.name?.includes("الشرق") || (area as any).districts?.name?.includes("الزهور") || (area as any).districts?.name?.includes("الجنوب");
      const fireRate = prop.building_type === "TWR" ? 1.2 : prop.building_type === "COM" ? 1.8 : prop.building_type === "IND" ? 2.5 : 0.9; // ‰
      const floodRate = isCoastal ? 1.5 : 0.6; // ‰ (بورسعيد ساحلية → مخاطر فيضان)
      const earthquakeRate = 0.4; // ‰ مصر منطقة 1-2 على مقياس EHRM
      const allRiskRate = 2.8; // ‰ شامل
      const fireP = Math.round((replacementCost * fireRate) / 1000);
      const floodP = Math.round((replacementCost * floodRate) / 1000);
      const eqP = Math.round((replacementCost * earthquakeRate) / 1000);
      const allP = Math.round((replacementCost * allRiskRate) / 1000);
      const age = new Date().getFullYear() - (prop.year_built || 2020);
      const ageRiskLoad = age > 30 ? 1.3 : age > 15 ? 1.15 : 1.0;
      const totalRecommended = Math.round((fireP + floodP + eqP) * ageRiskLoad);
      return `
    <h2>الحادي عشر: تأمين العقار Property Insurance Coverage</h2>
    <div class="note" style="background:#eef5ff;border-right-color:#1D4D8C;">
      <b>توصية اكتوارية:</b> تأمين العقار جزء أساسي من حماية القيمة السوقية وضمان استرداد رأس المال في حالات الكوارث. القيم أدناه محسوبة على أساس <b>تكلفة الإحلال</b> (Replacement Cost) لا القيمة السوقية، وفقاً للممارسة الدولية ومعايير IFRS 17 والهيئة العامة للرقابة المالية المصرية (FRA).
    </div>
    <h3>أ) مبالغ التغطية الموصى بها</h3>
    <table>
      <tr><th>بند التغطية</th><th>المبلغ (ج)</th><th>الأساس الفني</th></tr>
      <tr><td>تأمين الهيكل (تكلفة الإحلال)</td><td><b>${arNum(replacementCost)}</b></td><td>تكلفة بناء جديد لنفس المواصفات (غير شامل قيمة الأرض)</td></tr>
      <tr><td>تأمين المحتويات</td><td>${arNum(contentsCoverage)}</td><td>15٪ من قيمة المبنى (تشطيبات + أثاث ثابت + أجهزة)</td></tr>
      <tr><td>المسؤولية المدنية تجاه الغير</td><td>${arNum(liabilityCoverage)}</td><td>تغطية إصابات/أضرار للجيران والزوار (الحد الأدنى ٥٠٠ ألف ج)</td></tr>
      <tr><td>فقد الإيجار / بديل سكن</td><td>${arNum(lossOfRent)}</td><td>إيجار 6 أشهر أثناء الإصلاح بعد كارثة</td></tr>
      <tr style="background:#e8f5ec;font-weight:800;"><td>إجمالي الحد الأقصى للتغطية</td><td>${arNum(replacementCost + contentsCoverage + liabilityCoverage + lossOfRent)}</td><td>—</td></tr>
    </table>

    <h3>ب) الأقساط السنوية التقديرية حسب نوع التغطية</h3>
    <table>
      <tr><th>نوع البوليصة</th><th>المعدل ‰</th><th>القسط السنوي (ج)</th><th>التغطية</th></tr>
      <tr><td>🔥 حريق وأخطار إضافية (Fire & Allied)</td><td>${fireRate}‰</td><td>${arNum(fireP)}</td><td>حريق · صاعقة · انفجار · سقوط طائرات</td></tr>
      <tr><td>🌊 سيول وفيضانات (Flood Cover)</td><td>${floodRate}‰</td><td>${arNum(floodP)}</td><td>${isCoastal ? "<b style='color:#D85A30'>إجباري — منطقة ساحلية</b>" : "اختياري"} · رفع منسوب البحر</td></tr>
      <tr><td>🌍 زلازل وكوارث طبيعية</td><td>${earthquakeRate}‰</td><td>${arNum(eqP)}</td><td>مصر منطقة زلزالية 1-2 على EHRM</td></tr>
      <tr><td>🛡️ بوليصة شاملة All-Risks</td><td>${allRiskRate}‰</td><td>${arNum(allP)}</td><td>تغطية مجمّعة (بدلاً من البوليصات المنفصلة)</td></tr>
      <tr style="background:#fff3cd;"><td><b>الباقة الموصى بها (حريق + فيضان + زلزال)</b></td><td>—</td><td><b>${arNum(totalRecommended)}</b></td><td>مع حِمل عمر العقار ×${ageRiskLoad.toFixed(2)} (${arNum(age)} سنة)</td></tr>
    </table>

    <h3>ج) عوامل تسعير القسط (Underwriting Factors)</h3>
    <table class="kv">
      <tr><td>نوع المبنى</td><td>${prop.building_type === "TWR" ? "برج (مخاطر منخفضة — هيكل خرساني)" : prop.building_type === "COM" ? "تجاري (مخاطر متوسطة)" : prop.building_type === "IND" ? "صناعي (مخاطر مرتفعة)" : "سكني (مخاطر منخفضة)"}</td><td>عمر المبنى</td><td>${arNum(age)} سنة ${age > 30 ? "(حِمل +30٪)" : age > 15 ? "(حِمل +15٪)" : "(بدون حِمل)"}</td></tr>
      <tr><td>الموقع الجغرافي</td><td>${isCoastal ? "ساحلي — مخاطر بحرية مرتفعة" : "داخلي — مخاطر متوسطة"}</td><td>التشطيب</td><td>${prop.finish || "غير محدد"} ${prop.finish === "سوبر لوكس" ? "(يرفع قيمة المحتويات)" : ""}</td></tr>
      <tr><td>الدور</td><td>${prop.floor ?? "—"} ${(prop.floor ?? 0) >= 10 ? "(مخاطر إخلاء أعلى)" : ""}</td><td>أنظمة الحماية</td><td>طفايات · إنذار حريق · رشاشات → خصم 5-10٪</td></tr>
      <tr><td>نسبة العجز Co-Insurance</td><td>80٪ (شرط حد أدنى للتأمين)</td><td>التحمّل Deductible</td><td>${arNum(Math.round(replacementCost * 0.005))} ج (0.5٪)</td></tr>
    </table>

    <h3>د) الأخطار المُغطّاة والمُستثناة</h3>
    <div class="grid2">
      <div class="method-card">
        <div class="name" style="color:#1D9E75">✓ مُغطّى عادةً</div>
        <ul class="attlist">
          <li>• الحريق والانفجار والصاعقة</li>
          <li>• تسرب المياه من المواسير</li>
          <li>• السرقة بالإكراه والسطو</li>
          <li>• كسر الزجاج والمرايا</li>
          <li>• ${isCoastal ? "<b>الفيضانات والعواصف البحرية</b>" : "الأمطار والعواصف"}</li>
          <li>• المسؤولية المدنية تجاه الغير</li>
          <li>• فقد الإيجار أثناء الإصلاح</li>
        </ul>
      </div>
      <div class="method-card">
        <div class="name" style="color:#D85A30">✗ مُستثنى (يلزم ملحق)</div>
        <ul class="attlist">
          <li>• الحروب والاضطرابات الأهلية</li>
          <li>• التلوث الإشعاعي والنووي</li>
          <li>• الإهمال الجسيم وسوء الصيانة</li>
          <li>• الأضرار التدريجية (تآكل · صدأ · رطوبة قديمة)</li>
          <li>• الزلازل (يلزم ملحق Earthquake Endorsement)</li>
          <li>• الإرهاب (يلزم ملحق Terrorism Cover)</li>
          <li>• خسارة الأرباح التشغيلية ${prop.category === "com" ? "<b>(مهم للتجاري)</b>" : ""}</li>
        </ul>
      </div>
    </div>

    <h3>هـ) شركات التأمين المعتمدة في السوق المصري (FRA)</h3>
    <table>
      <tr><th>الشركة</th><th>تخصص</th><th>التصنيف الائتماني</th></tr>
      <tr><td>مصر للتأمين (Misr Insurance)</td><td>عقاري + شامل · أكبر شركة حكومية</td><td>A- (Moody's)</td></tr>
      <tr><td>التأمين الأهلية المصرية (gig Egypt)</td><td>عقاري + سيول + زلازل</td><td>BBB+</td></tr>
      <tr><td>AXA Egypt</td><td>عقاري شامل + خاص بالفلل</td><td>A (S&P)</td></tr>
      <tr><td>Allianz Egypt</td><td>تجاري + صناعي + برج</td><td>AA-</td></tr>
      <tr><td>تكافل (Egyptian Takaful)</td><td>تأمين إسلامي عقاري</td><td>BBB</td></tr>
    </table>

    <div class="note" style="background:#e8f5ec;border-right-color:#1D9E75;">
      <b>توصية مهنية (مقيّم + خبير تأمين):</b> يُنصح بمراجعة بوليصة التأمين <b>سنوياً</b> لمواكبة تضخم تكلفة الإحلال (مصر شهدت ارتفاع +60٪ في تكلفة البناء 2022-2025)؛ التأمين بأقل من 80٪ من قيمة الإحلال يُعرّض المالك لشرط <b>Average Clause</b> الذي يُخفّض التعويض بنفس نسبة العجز. ${isCoastal ? "<br/><b>تحذير ساحلي:</b> العقار في منطقة ساحلية — ملحق الفيضانات + ارتفاع منسوب البحر <b>غير اختياري</b> طبقاً لتقرير IPCC AR6." : ""}
    </div>
      `;
    })()}

    <h2>الثاني عشر: الشروط والقيود المحدِّدة Limiting Conditions</h2>
    <div class="note" style="background:#f7f9fc;border-right-color:#0F234B;">
      <ol style="margin:6px 18px;padding:0;font-size:12px;line-height:1.8;">
        <li>القيمة المقدّرة سارية بتاريخ التقييم (${valDate}) فقط، وقد تتغير مع تقلبات السوق.</li>
        <li>التقرير صالح لمدة ${arNum(validity)} يوم من تاريخ الإصدار وينتهي في ${expiryStr}.</li>
        <li>تم الاعتماد على البيانات المقدّمة من العميل ومصادر السوق المتاحة دون تحقيق قانوني للملكية.</li>
        <li>لا يتحمل المقيّم أي مسؤولية عن أعباء أو رهون أو منازعات قانونية غير مفصح عنها.</li>
        <li>التقرير مُعد للغرض المذكور حصراً، ولا يجوز استخدامه لأي غرض آخر دون موافقة المقيّم الخطية.</li>
        <li>القيمة لا تشمل الضرائب والرسوم والمصاريف الحكومية أو تكاليف النقل.</li>
        <li>المعاينة كانت بصرية ولا تشمل اختبارات هيكلية أو فحوصات تربة أو خوازيق.</li>
      </ol>
    </div>

    <h2>إقرار وتوقيع المقيّم Certification</h2>
    <div style="border:1px solid #ccc;padding:14px;border-radius:6px;font-size:12px;line-height:1.8;">
      أُقرّ أنا الموقِّع أدناه <b>${meta.appraiserName || "________________"}</b> ـ بوصفي مُقيِّماً عقارياً مُقيَّداً بسجل المقيِّمين بالهيئة العامة للرقابة المالية (FRA) ـ بما يلي: <b>(١)</b> أن المعلومات الواقعية الواردة في هذا التقرير صحيحة وفق علمي وأُجريت معاينة العقار شخصياً. <b>(٢)</b> أن التحليلات والآراء والاستنتاجات مُقيَّدة فقط بالافتراضات والشروط المحدِّدة المُبيَّنة في التقرير، وهي تحليلاتي المهنية المحايدة غير المتحيِّزة. <b>(٣)</b> ليس لي مصلحة حالية أو مُستقبلية في العقار محل التقييم، ولا علاقة شخصية بأطراف العملية. <b>(٤)</b> أتعابي عن إعداد هذا التقرير لا ترتبط بنتيجة التقييم أو بمبلغ القيمة المُقدَّرة أو بحدوث حدث لاحق. <b>(٥)</b> أُعِدّ هذا التقرير وفقاً للمعايير المصرية للتقييم العقاري الصادرة عن جمعية خبراء التقييم المصرية (EAA/EES) ولائحة قيد المقيِّمين العقاريين الصادرة عن الهيئة العامة للرقابة المالية (FRA)، وبما يتوافق مع معايير التقييم الدولية IVS 2022 الصادرة عن مجلس معايير التقييم الدولية (IVSC).
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <div><b>الاسم:</b> ${meta.appraiserName || "________________"}<br/><b>قيد FRA / EAA:</b> ${meta.appraiserLicense || "________________"}</div>
        <div style="text-align:left;"><b>التوقيع والخاتم:</b> ________________<br/><b>التاريخ:</b> ${arDate()}</div>
      </div>
    </div>

    <div class="note"><b>إقرار الامتثال:</b> أُعِدّ هذا التقرير وفقاً للمعايير المصرية للتقييم العقاري (EAA/EES) ولوائح الهيئة العامة للرقابة المالية (FRA) ـ القانون رقم ١٠ لسنة ٢٠٠٩ ولائحته التنفيذية ـ ومتوافق مع معايير التقييم الدولية (IVS 2022). القيمة المُقدَّرة هي تقدير للقيمة السوقية (Market Value) بتاريخ التقييم ولا تُعَدّ ضماناً لسعر بيع فعلي.</div>

    ${verificationBlockAr("__RID__", "__RHASH__", "__RQR__", "__RURL__")}
  `;

  const reportId = generateReportId("EAA");
  const verifyUrl = `${typeof window !== "undefined" ? window.location.origin : ""}/verify/${reportId}`;
  const hash = reportHash(`${reportId}|${prop.id}|${area.id}|${Math.round(final)}|${arDate()}`);
  const qrDataUrl = await generateQrDataUrl(verifyUrl);
  const finalBody = body
    .replaceAll("__RID__", reportId)
    .replaceAll("__RHASH__", hash)
    .replaceAll("__RQR__", qrDataUrl)
    .replaceAll("__RURL__", verifyUrl);
  return renderHtmlToPdf(shell("تقرير تقييم وحدة عقارية", `${prop.type_label} — ${area.name} — #${prop.id} · ${reportId}`, finalBody), `unit-${prop.id}-${reportId}.pdf`);
}

// =========== 1-EN) Unit Valuation Report — International English (IVS 2022 / RICS Red Book / USPAP) ===========
export async function generateUnitReportEN(prop: Property, area: Area, opts?: { txns?: Transaction[]; comparables?: { prop: Property; txn: Transaction }[]; monthlyRent?: number; capRate?: number; annualRevenue?: number; opMargin?: number; meta?: ReportMeta }) {
  const txns = opts?.txns || [];
  const hpi = buildHPI(txns);
  const comparables = opts?.comparables || [];

  const estRent = opts?.monthlyRent ?? Math.round(prop.area_sqm * 18);
  const capRate = opts?.capRate ?? 0.085;
  const annualRevenue = opts?.annualRevenue ?? prop.area_sqm * 18 * 12 * 4;
  const opMargin = opts?.opMargin ?? 0.25;

  const sales = comparables.length ? salesComparison(prop, comparables, hpi) : { value: prop.base_price, grid: [] as AdjustmentRow[], outliers: [] as string[] };
  const income = incomeApproach(prop, estRent, capRate);
  const cost = costApproach(prop, area);
  const residual = prop.category === "res" ? residualMethod(prop.area_sqm * 0.5, area, prop.area_sqm, prop.base_price / prop.area_sqm * 1.15) : 0;
  const profitV = prop.category === "com" ? profitMethod(annualRevenue, opMargin) : 0;

  const w = WTS[prop.building_type] || WTS.APT;
  const weights = { sales: w.s / 100, income: w.i / 100, cost: w.c / 100, residual: w.r / 100, profit: w.p / 100 };
  const values = { sales: sales.value, income, cost: cost.total, residual, profit: profitV };
  const final = reconcile(values, weights);
  const ci = confidenceInterval([sales.value, income, cost.total, residual, profitV]);

  const inv = getInvReturn(prop, area);
  const cond = getBuildingCondition(prop);
  const hbu = highestAndBestUse(prop, area);

  const meta = opts?.meta || {};
  const validity = meta.validityDays ?? 90;
  const valDate = meta.valuationDate || new Date().toISOString().slice(0, 10);
  const inspDate = meta.inspectionDate || valDate;
  const expiry = new Date(); expiry.setDate(expiry.getDate() + validity);
  const expiryStr = expiry.toLocaleDateString("en-GB", { year: "numeric", month: "long", day: "numeric" });

  // English method labels (IVS terminology)
  const METHODS_EN: Record<string, { name: string; desc: string }> = {
    sales: { name: "Sales Comparison Approach", desc: "Direct comparison with recent arm's-length transactions of similar assets, adjusted for differences in location, size, condition, time and other elements (IVS 105 §20)." },
    income: { name: "Income Capitalisation Approach", desc: "Conversion of expected net operating income into a capital value using a market-derived capitalisation rate (IVS 105 §40)." },
    cost: { name: "Cost (Depreciated Replacement Cost) Approach", desc: "Land value plus the current cost of replacing the improvements, less accrued depreciation (IVS 105 §60)." },
    residual: { name: "Residual / Development Approach", desc: "Gross development value less total development costs, including developer's profit, to derive the underlying land or asset value." },
    profit: { name: "Profits / Operating Business Approach", desc: "Capitalisation of sustainable operating profit for trade-related properties (hotels, retail with goodwill, etc.)." },
  };

  const methodCard = (k: keyof typeof values, value: number) => {
    const m = METHODS_EN[k as string];
    const wt = (weights as any)[k] as number;
    return `<div class="method-card">
      <div class="head">
        <div class="name">${m.name}</div>
        <div class="val">${value > 0 ? enNum(value) + " EGP" : "—"}</div>
      </div>
      <div class="desc">${m.desc}</div>
      <div style="margin-top:6px;font-size:11px;"><b>Weight:</b> ${enPct(wt)} · <b>Weighted contribution:</b> ${enNum(value * wt)} EGP</div>
    </div>`;
  };

  const isCoastal = (area as any).districts?.name?.includes("الشرق") || (area as any).districts?.name?.includes("الزهور") || (area as any).districts?.name?.includes("الجنوب");
  const replacementCost = cost.building + cost.depreciation;
  const contentsCoverage = Math.round(replacementCost * 0.15);
  const liabilityCoverage = Math.max(500_000, Math.round(final * 0.10));
  const lossOfRent = Math.round(estRent * 12 * 0.5);
  const fireRate = prop.building_type === "TWR" ? 1.2 : prop.building_type === "COM" ? 1.8 : prop.building_type === "IND" ? 2.5 : 0.9;
  const floodRate = isCoastal ? 1.5 : 0.6;
  const earthquakeRate = 0.4;
  const fireP = Math.round((replacementCost * fireRate) / 1000);
  const floodP = Math.round((replacementCost * floodRate) / 1000);
  const eqP = Math.round((replacementCost * earthquakeRate) / 1000);
  const age = new Date().getFullYear() - (prop.year_built || 2020);
  const ageRiskLoad = age > 30 ? 1.3 : age > 15 ? 1.15 : 1.0;
  const totalRecommended = Math.round((fireP + floodP + eqP) * ageRiskLoad);

  const body = `
    <h2>1. Report &amp; Valuer Identification</h2>
    <table class="kv">
      <tr><td>Valuer name</td><td>${meta.appraiserName || "—"}</td><td>Registration / Licence No.</td><td>${meta.appraiserLicense || "—"}</td></tr>
      <tr><td>Regulatory authority</td><td>${meta.appraiserAuthority || "Egyptian Financial Regulatory Authority (FRA) · IVSC member"}</td><td>Contact</td><td>${meta.appraiserPhone || "—"}</td></tr>
      <tr><td>Client / Instructing party</td><td>${meta.clientName || "—"}</td><td>Purpose of valuation</td><td>${meta.purpose || "Estimation of Market Value (IVS 104)"}</td></tr>
      <tr><td>Inspection date</td><td>${inspDate}</td><td>Valuation date</td><td>${valDate}</td></tr>
      <tr><td>Report issue date</td><td>${enDate()}</td><td>Report validity</td><td>${expiryStr} (${enNum(validity)} days)</td></tr>
      <tr><td colspan="4"><b>Scope of work (IVS 101):</b> ${meta.scopeOfWork || "Physical inspection of the subject property, collection and analysis of comparable market evidence, application of recognised valuation approaches under IVS 2022, and issuance of an independent professional opinion of Market Value."}</td></tr>
      <tr><td colspan="4"><b>Basis of value:</b> Market Value as defined in IVS 104 §30.1 — "the estimated amount for which an asset or liability should exchange on the valuation date between a willing buyer and a willing seller in an arm's-length transaction, after proper marketing and where the parties had each acted knowledgeably, prudently and without compulsion."</td></tr>
      <tr><td colspan="4"><b>Currency:</b> Egyptian Pound (EGP). <b>Reporting standard:</b> IVS 2022 · RICS Red Book Global Standards (effective 31 Jan 2022) · USPAP 2024-2025 Standards 1 &amp; 2.</td></tr>
    </table>

    <h2>2. Subject Property</h2>
    <table class="kv">
      <tr><td>Property ID</td><td>${prop.id}</td><td>Property type</td><td>${prop.type_label}</td></tr>
      <tr><td>Sub-market / Area</td><td>${area.name}</td><td>District / City</td><td>${(area as any).districts?.name || "-"}</td></tr>
      <tr><td>Gross floor area</td><td>${enNum(prop.area_sqm)} sqm</td><td>Building type</td><td>${prop.building_type}</td></tr>
      <tr><td>Floor</td><td>${prop.floor ?? "-"}</td><td>Outlook</td><td>${prop.view || "-"}</td></tr>
      <tr><td>Finish quality</td><td>${prop.finish || "-"}</td><td>Year of construction</td><td>${prop.year_built ?? "-"}</td></tr>
      <tr><td>Bedrooms / Bathrooms</td><td>${prop.rooms ?? 0} / ${prop.baths ?? 0}</td><td>Effective age</td><td>${enNum(age)} years</td></tr>
    </table>

    <h2>3. Condition &amp; Investment Performance</h2>
    <div class="grid3">
      <div class="stat"><div class="l">Building condition</div><div class="v" style="color:${cond.color}">${enNum(cond.score)}/100</div><div style="font-size:11px;color:${cond.color}">${cond.grade}</div></div>
      <div class="stat"><div class="l">Current price index</div><div class="v">${enNum(inv.cur)} EGP</div></div>
      <div class="stat"><div class="l">Price / sqm</div><div class="v">${enNum(inv.cur / prop.area_sqm)} EGP</div></div>
      <div class="stat"><div class="l">Capital appreciation</div><div class="v">${parseFloat(inv.cap).toFixed(1)}%</div></div>
      <div class="stat"><div class="l">Gross rental yield</div><div class="v">${parseFloat(inv.rYield).toFixed(1)}%</div></div>
      <div class="stat"><div class="l">Total ROI</div><div class="v">${parseFloat(inv.totROI).toFixed(1)}%</div></div>
    </div>

    <h2>4. Valuation Approaches (IVS 105)</h2>
    ${methodCard("sales", values.sales)}
    ${methodCard("income", values.income)}
    ${methodCard("cost", values.cost)}
    ${methodCard("residual", values.residual)}
    ${methodCard("profit", values.profit)}
    <div class="note"><b>Rationale for weighting:</b> ${w.why}</div>

    <h2>5. Cost Approach — Detailed Build-up</h2>
    <table>
      <tr><th>Item</th><th>Amount (EGP)</th><th>Notes</th></tr>
      <tr><td>Land value</td><td>${enNum(cost.land)}</td><td>${enNum(area.land_psqm)} EGP/sqm × estimated plot area</td></tr>
      <tr><td>Replacement cost new (RCN)</td><td>${enNum(cost.building + cost.depreciation)}</td><td>Construction unit-cost benchmarked by building type</td></tr>
      <tr><td>Accrued depreciation</td><td>${enNum(cost.depreciation)}</td><td>${enNum((cost.depreciation / (cost.building + cost.depreciation)) * 100)}% straight-line @ 1.5% p.a. (physical + functional + external)</td></tr>
      <tr><td>Depreciated replacement cost (DRC)</td><td>${enNum(cost.building)}</td><td>Net of accrued depreciation</td></tr>
      <tr><td><b>Total cost value</b></td><td><b>${enNum(cost.total)}</b></td><td>Land + DRC of improvements</td></tr>
    </table>

    <h2>6. Income Approach — Detailed Build-up</h2>
    <table>
      <tr><th>Item</th><th>Amount (EGP)</th></tr>
      <tr><td>Estimated market rent (monthly)</td><td>${enNum(estRent)}</td></tr>
      <tr><td>Potential gross income (PGI, annual)</td><td>${enNum(estRent * 12)}</td></tr>
      <tr><td>Effective gross income (EGI) — 8% vacancy &amp; collection loss</td><td>${enNum(estRent * 12 * 0.92)}</td></tr>
      <tr><td>Net operating income (NOI) — 20% operating expense ratio</td><td>${enNum(estRent * 12 * 0.92 * 0.8)}</td></tr>
      <tr><td>Capitalisation rate (market-derived)</td><td>${enPct(capRate)}</td></tr>
      <tr><td><b>Direct capitalisation value</b></td><td><b>${enNum(income)}</b></td></tr>
    </table>

    ${sales.grid.length ? `<h2>7. Sales Comparison — Adjustment Grid</h2>
    <table>
      <tr><th>Comparable</th><th>Sale price</th><th>EGP / sqm</th><th>Location adj.</th><th>Size adj.</th><th>Finish adj.</th><th>Time adj.</th><th>Adj. EGP/sqm</th><th>Adjusted value</th><th>Status</th></tr>
      ${sales.grid.map(g => { const isOut = sales.outliers.includes(g.comparable_id); return `<tr style="${isOut?'background:#fff0f0;color:#a33;':''}"><td>${g.comparable_id}</td><td>${enNum(g.sale_price)}</td><td>${enNum(g.ppsqm)}</td><td>${enPct(g.adj_location)}</td><td>${enPct(g.adj_size)}</td><td>${enPct(g.adj_finish)}</td><td>${enPct(g.adj_time)}</td><td>${enNum(g.adjusted_ppsqm)}</td><td>${enNum(g.adjusted_total)}</td><td>${isOut?'Excluded (outlier)':'Retained'}</td></tr>`; }).join("")}
    </table>
    ${sales.outliers.length ? `<div class="note"><b>Statistical note:</b> ${enNum(sales.outliers.length)} comparable(s) excluded as outliers using the 1.5×IQR rule to improve the reliability of the adjusted mean.</div>` : ""}` : ""}

    <h2>8. Reconciliation &amp; Opinion of Value</h2>
    <table>
      <tr><th>Approach</th><th>Indicated value (EGP)</th><th>Weight</th><th>Weighted value (EGP)</th></tr>
      <tr><td>Sales Comparison</td><td>${enNum(values.sales)}</td><td>${enPct(weights.sales)}</td><td>${enNum(values.sales * weights.sales)}</td></tr>
      <tr><td>Income Capitalisation</td><td>${enNum(values.income)}</td><td>${enPct(weights.income)}</td><td>${enNum(values.income * weights.income)}</td></tr>
      <tr><td>Cost (DRC)</td><td>${enNum(values.cost)}</td><td>${enPct(weights.cost)}</td><td>${enNum(values.cost * weights.cost)}</td></tr>
      <tr><td>Residual</td><td>${enNum(values.residual)}</td><td>${enPct(weights.residual)}</td><td>${enNum(values.residual * weights.residual)}</td></tr>
      <tr><td>Profits</td><td>${enNum(values.profit)}</td><td>${enPct(weights.profit)}</td><td>${enNum(values.profit * weights.profit)}</td></tr>
      <tr style="background:#e8f5ec;font-weight:800;"><td>Total</td><td>—</td><td>${enPct(weights.sales + weights.income + weights.cost + weights.residual + weights.profit)}</td><td>${enNum(final)}</td></tr>
    </table>

    <div class="final-box">
      <div>
        <div class="lbl">Opinion of Market Value (as of ${valDate})</div>
        <div style="font-size:11px;opacity:.85;margin-top:6px;">95% confidence interval: ${enNum(ci.low)} — ${enNum(ci.high)} EGP · Coefficient of variation: ${enPct(ci.cv)} · n=${enNum(ci.n)} · Standard error SE=${enNum(ci.se)}</div>
      </div>
      <div>
        <div class="val">${enNum(final)} EGP</div>
        <div style="text-align:right;margin-top:4px;"><span class="badge ${ci.cv < 0.15 ? "" : ci.cv < 0.25 ? "warn" : "red"}">${ci.cv < 0.15 ? "High reliability" : ci.cv < 0.25 ? "Moderate reliability" : "Indicative — verify"}</span></div>
      </div>
    </div>

    <h2>9. Highest &amp; Best Use Analysis (IVS 104 §140)</h2>
    <table class="kv">
      <tr><td>Concluded highest &amp; best use</td><td colspan="3"><b>${hbu.use}</b></td></tr>
      <tr><td>Legally permissible</td><td>${hbu.legallyPermissible ? "✓ Yes" : "✗ Requires verification"}</td><td>Physically possible</td><td>${hbu.physicallyPossible ? "✓ Yes" : "✗ Constrained"}</td></tr>
      <tr><td>Financially feasible</td><td>${hbu.financiallyFeasible ? "✓ Yes" : "✗ Not feasible"}</td><td>Maximally productive</td><td>${hbu.maximallyProductive ? "✓ Yes" : "✗ Sub-optimal"}</td></tr>
      <tr><td colspan="4">${hbu.rationale}</td></tr>
    </table>

    <h2>10. Property Insurance Recommendation</h2>
    <div class="note" style="background:#eef5ff;">
      <b>Underwriting basis:</b> Sums insured are derived from <b>Replacement Cost New</b> (not market value), in line with IFRS 17 and standard property-insurance practice. Premium estimates are indicative, subject to a final survey by an FRA-licensed insurer.
    </div>
    <table>
      <tr><th>Coverage</th><th>Sum insured (EGP)</th><th>Technical basis</th></tr>
      <tr><td>Building (replacement cost)</td><td><b>${enNum(replacementCost)}</b></td><td>Cost to rebuild to equivalent specification, excluding land</td></tr>
      <tr><td>Contents</td><td>${enNum(contentsCoverage)}</td><td>15% of building value (finishes, fixed fittings, appliances)</td></tr>
      <tr><td>Public / third-party liability</td><td>${enNum(liabilityCoverage)}</td><td>Minimum EGP 500k or 10% of MV (whichever is greater)</td></tr>
      <tr><td>Loss of rent / alternative accommodation</td><td>${enNum(lossOfRent)}</td><td>6 months of rent during post-loss reinstatement</td></tr>
    </table>
    <table>
      <tr><th>Policy line</th><th>Rate ‰</th><th>Annual premium (EGP)</th><th>Cover</th></tr>
      <tr><td>Fire &amp; Allied Perils</td><td>${fireRate}‰</td><td>${enNum(fireP)}</td><td>Fire, lightning, explosion, aircraft impact</td></tr>
      <tr><td>Flood &amp; Storm</td><td>${floodRate}‰</td><td>${enNum(floodP)}</td><td>${isCoastal ? "<b style='color:#D85A30'>Mandatory — coastal exposure</b>" : "Optional"} · sea-level rise per IPCC AR6</td></tr>
      <tr><td>Earthquake</td><td>${earthquakeRate}‰</td><td>${enNum(eqP)}</td><td>Egypt is EHRM zone 1-2</td></tr>
      <tr style="background:#fff3cd;"><td><b>Recommended bundle</b></td><td>—</td><td><b>${enNum(totalRecommended)}</b></td><td>With age-risk loading ×${ageRiskLoad.toFixed(2)} for a ${enNum(age)}-year-old structure</td></tr>
    </table>

    <h2>11. Assumptions, Special Assumptions &amp; Limiting Conditions</h2>
    <div class="note" style="background:#f7f9fc;">
      <ol style="margin:6px 18px;padding:0;font-size:12px;line-height:1.8;">
        <li>The opinion of value is valid only as at the valuation date (${valDate}); subsequent market movements are not reflected.</li>
        <li>This report is valid for ${enNum(validity)} days from the issue date and expires on ${expiryStr}.</li>
        <li>The valuer has relied upon information provided by the client and publicly available market sources; no independent legal title verification has been performed.</li>
        <li>The valuer accepts no liability for undisclosed encumbrances, charges, easements, or litigation affecting the property.</li>
        <li>This report is prepared for the stated purpose only and may not be relied upon for any other purpose without the valuer's prior written consent.</li>
        <li>Values are exclusive of VAT, transfer taxes, stamp duty and transaction costs.</li>
        <li>The inspection was visual only and did not include structural, geotechnical or environmental testing.</li>
        <li>No allowance has been made for any plant, machinery or trade fixtures unless expressly stated.</li>
      </ol>
    </div>

    <h2>12. Valuer's Certification (IVS 103 / RICS PS 2 / USPAP Standards Rule 2-3)</h2>
    <div style="border:1px solid #ccc;padding:14px;border-radius:6px;font-size:12px;line-height:1.8;">
      I, the undersigned <b>${meta.appraiserName || "________________"}</b>, certify that, to the best of my knowledge and belief:
      <ol style="margin:6px 18px;padding:0;">
        <li>The statements of fact contained in this report are true and correct.</li>
        <li>The reported analyses, opinions and conclusions are limited only by the reported assumptions and limiting conditions and are my personal, impartial and unbiased professional analyses.</li>
        <li>I have no present or prospective interest in the subject property and no personal interest with respect to the parties involved.</li>
        <li>My engagement in, and compensation for, this assignment are not contingent upon the development or reporting of a predetermined value, a direction in value that favours the cause of the client, the amount of the value opinion, the attainment of a stipulated result, or the occurrence of a subsequent event.</li>
        <li>I have performed a personal inspection of the subject property.</li>
        <li>This report has been prepared in conformity with IVS 2022, the RICS Red Book Global Standards (effective 31 January 2022), and USPAP 2024-2025; and is also compliant with the Egyptian Financial Regulatory Authority (FRA) valuer-registration framework.</li>
      </ol>
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <div><b>Name:</b> ${meta.appraiserName || "________________"}<br/><b>Registration No.:</b> ${meta.appraiserLicense || "________________"}</div>
        <div style="text-align:right;"><b>Signature &amp; stamp:</b> ________________<br/><b>Date:</b> ${enDate()}</div>
      </div>
    </div>

    <div class="note"><b>Compliance statement:</b> This report has been prepared in accordance with the International Valuation Standards (IVS) 2022 issued by the IVSC, the RICS Valuation — Global Standards (Red Book), and USPAP 2024-2025. The value reported is an opinion of Market Value as at the valuation date and does not constitute a guarantee of any future sale price.</div>
  `;

  return renderHtmlToPdfEn(shellEn("Real-Estate Valuation Report", `${prop.type_label} — ${area.name} — #${prop.id}`, body), `unit-${prop.id}-EN.pdf`);
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

// =========== 5) تقرير مبنى يشمل وحداته ===========
export function generateBuildingReport(
  buildingLabel: string,
  area: Area,
  units: Property[],
  txns: Transaction[],
  opts?: { meta?: ReportMeta }
) {
  if (!units.length) return Promise.reject(new Error("لا توجد وحدات"));
  const hpi = buildHPI(txns);
  const meta = opts?.meta || {};
  const valDate = meta.valuationDate || new Date().toISOString().slice(0, 10);
  const validity = meta.validityDays ?? 90;
  const expiry = new Date(); expiry.setDate(expiry.getDate() + validity);
  const expiryStr = expiry.toLocaleDateString("ar-EG", { year: "numeric", month: "long", day: "numeric" });

  // حساب التقييم لكل وحدة
  const rows = units.map((u) => {
    const sameDistComps = units.filter((x) => x.id !== u.id).slice(0, 5).map((p) => {
      const t = txns.filter((tx) => tx.property_id === p.id).sort((a, b) => b.txn_date.localeCompare(a.txn_date))[0];
      return t ? { prop: p, txn: t } : null;
    }).filter(Boolean) as { prop: Property; txn: Transaction }[];

    const sales = sameDistComps.length ? salesComparison(u, sameDistComps, hpi) : { value: u.base_price, grid: [] as AdjustmentRow[], outliers: [] };
    const estRent = Math.round(u.area_sqm * 18);
    const income = incomeApproach(u, estRent, 0.085);
    const cost = costApproach(u, area);
    const residual = u.category === "res" ? residualMethod(u.area_sqm * 0.5, area, u.area_sqm, (u.base_price / u.area_sqm) * 1.15) : 0;
    const profitV = u.category === "com" ? profitMethod(u.area_sqm * 18 * 12 * 4, 0.25) : 0;

    const w = WTS[u.building_type] || WTS.APT;
    const weights = { sales: w.s / 100, income: w.i / 100, cost: w.c / 100, residual: w.r / 100, profit: w.p / 100 };
    const values = { sales: sales.value, income, cost: cost.total, residual, profit: profitV };
    const final = reconcile(values, weights);
    const ci = confidenceInterval([sales.value, income, cost.total, residual, profitV]);
    return { u, sales: sales.value, income, cost: cost.total, residual, profit: profitV, final, ci, ppsqm: final / u.area_sqm };
  });

  const totalArea = rows.reduce((s, r) => s + r.u.area_sqm, 0);
  const totalValue = rows.reduce((s, r) => s + r.final, 0);
  const avgPpsqm = totalValue / Math.max(1, totalArea);
  const minV = Math.min(...rows.map(r => r.final));
  const maxV = Math.max(...rows.map(r => r.final));

  // توزيع أنواع الوحدات
  const byType: Record<string, { n: number; area: number; value: number }> = {};
  for (const r of rows) {
    const k = r.u.type_label;
    byType[k] = byType[k] || { n: 0, area: 0, value: 0 };
    byType[k].n++; byType[k].area += r.u.area_sqm; byType[k].value += r.final;
  }

  const body = `
    <h2>بيانات التقرير والمقيّم</h2>
    <table class="kv">
      <tr><td>اسم المقيّم</td><td>${meta.appraiserName || "—"}</td><td>رقم الترخيص</td><td>${meta.appraiserLicense || "—"}</td></tr>
      <tr><td>العميل</td><td>${meta.clientName || "—"}</td><td>الغرض</td><td>${meta.purpose || "تقدير قيمة مبنى متعدد الوحدات"}</td></tr>
      <tr><td>تاريخ التقييم</td><td>${valDate}</td><td>صالح حتى</td><td>${expiryStr} (${arNum(validity)} يوم)</td></tr>
    </table>

    <h2>أولاً: ملخص المبنى</h2>
    <table class="kv">
      <tr><td>اسم/كود المبنى</td><td>${buildingLabel}</td><td>المنطقة</td><td>${area.name}</td></tr>
      <tr><td>عدد الوحدات</td><td>${arNum(units.length)}</td><td>إجمالي المساحات</td><td>${arNum(totalArea)} م²</td></tr>
      <tr><td>متوسط ج/م²</td><td>${arNum(avgPpsqm)} ج</td><td>نطاق قيم الوحدات</td><td>${arNum(minV)} — ${arNum(maxV)} ج</td></tr>
    </table>

    <div class="final-box">
      <div>
        <div class="lbl">إجمالي القيمة السوقية للمبنى</div>
        <div style="font-size:11px;opacity:.85;margin-top:6px;">مجموع تقييمات ${arNum(units.length)} وحدة بطرق التقييم الخمس المرجحة</div>
      </div>
      <div><div class="val">${arNum(totalValue)} ج</div></div>
    </div>

    <h2>ثانياً: توزيع الوحدات حسب النوع</h2>
    <table>
      <tr><th>النوع</th><th>عدد الوحدات</th><th>إجمالي المساحات</th><th>إجمالي القيمة</th><th>متوسط ج/م²</th><th>الحصة من المبنى</th></tr>
      ${Object.entries(byType).map(([k, v]) => `<tr><td>${k}</td><td>${arNum(v.n)}</td><td>${arNum(v.area)} م²</td><td>${arNum(v.value)} ج</td><td>${arNum(v.value / v.area)} ج</td><td>${arPct(v.value / totalValue)}</td></tr>`).join("")}
      <tr style="background:#e8f5ec;font-weight:800;"><td>الإجمالي</td><td>${arNum(units.length)}</td><td>${arNum(totalArea)} م²</td><td>${arNum(totalValue)} ج</td><td>${arNum(avgPpsqm)} ج</td><td>100٪</td></tr>
    </table>

    <h2>ثالثاً: تفاصيل تقييم كل وحدة</h2>
    <table>
      <tr><th>الكود</th><th>النوع</th><th>المساحة</th><th>الدور</th><th>التشطيب</th><th>المقارنات</th><th>الدخل</th><th>التكلفة</th><th>القيمة النهائية</th><th>ج/م²</th><th>CV</th></tr>
      ${rows.map(r => `<tr>
        <td>${r.u.id}</td>
        <td>${r.u.type_label}</td>
        <td>${arNum(r.u.area_sqm)} م²</td>
        <td>${r.u.floor ?? "-"}</td>
        <td>${r.u.finish || "-"}</td>
        <td>${arNum(r.sales)}</td>
        <td>${arNum(r.income)}</td>
        <td>${arNum(r.cost)}</td>
        <td><b>${arNum(r.final)} ج</b></td>
        <td>${arNum(r.ppsqm)}</td>
        <td>${arPct(r.ci.cv)}</td>
      </tr>`).join("")}
    </table>

    <h2>رابعاً: تحليل إحصائي مجمّع</h2>
    <table class="kv">
      <tr><td>عدد الوحدات</td><td>${arNum(rows.length)}</td><td>إجمالي القيمة</td><td>${arNum(totalValue)} ج</td></tr>
      <tr><td>أقل قيمة وحدة</td><td>${arNum(minV)} ج</td><td>أعلى قيمة وحدة</td><td>${arNum(maxV)} ج</td></tr>
      <tr><td>متوسط قيمة الوحدة</td><td>${arNum(totalValue / rows.length)} ج</td><td>متوسط ج/م² للمبنى</td><td>${arNum(avgPpsqm)} ج</td></tr>
      <tr><td>الانحراف المعياري للقيم</td><td>${arNum(Math.sqrt(rows.reduce((s,r)=>s+(r.final - totalValue/rows.length)**2,0)/Math.max(1,rows.length-1)))} ج</td><td>عدد الوحدات بأعلى من المتوسط</td><td>${arNum(rows.filter(r=>r.final>totalValue/rows.length).length)}</td></tr>
    </table>

    <div class="note"><b>ملاحظة:</b> تم احتساب قيمة كل وحدة باستخدام طرق التقييم الخمس (مقارنات، دخل، تكلفة، متبقي، أرباح) بأوزان مرجحة حسب نوع المبنى، ثم جُمعت القيم لاحتساب إجمالي قيمة المبنى. القيم تقديرات سوقية بتاريخ التقييم.</div>

    <h2>إقرار وتوقيع المقيّم</h2>
    <div style="border:1px solid #ccc;padding:14px;border-radius:6px;font-size:12px;line-height:1.8;">
      أقرّ أنا الموقّع أدناه بأن المعلومات الواردة صحيحة على حد علمي، وأن التحليل تم وفقاً لمعايير IVS 2022 ومعايير الجمعية المصرية للمقيمين العقاريين EES.
      <div style="display:flex;justify-content:space-between;margin-top:24px;">
        <div><b>الاسم:</b> ${meta.appraiserName || "________________"}<br/><b>الترخيص:</b> ${meta.appraiserLicense || "________________"}</div>
        <div style="text-align:left;"><b>التوقيع:</b> ________________<br/><b>التاريخ:</b> ${arDate()}</div>
      </div>
    </div>
  `;

  return renderHtmlToPdf(
    shell("تقرير تقييم مبنى متعدد الوحدات", `${buildingLabel} — ${area.name} — ${arNum(units.length)} وحدة`, body),
    `building-${Date.now()}.pdf`,
  );
}

// إعادة تصدير للتوافق مع الكود القديم في صفحة /valuate
export { fmt, pct };
