import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import QRCode from "qrcode";
import type { ValuationState } from "@/context/ValuationStateContext";

const fmt = (n: number | null | undefined) =>
  n == null ? "—" : Math.round(n).toLocaleString("en-US");

async function makeQRDataUrl(text: string): Promise<string> {
  try {
    return await QRCode.toDataURL(text, { width: 160, margin: 1, errorCorrectionLevel: "M" });
  } catch {
    return "";
  }
}

function simpleHash(input: string): string {
  let h = 0;
  for (let i = 0; i < input.length; i++) h = ((h << 5) - h + input.charCodeAt(i)) | 0;
  return Math.abs(h).toString(16).padStart(8, "0").toUpperCase();
}

interface PdfOptions {
  state: ValuationState;
  appraiser?: { name?: string; license?: string; authority?: string };
  baseUrl?: string;
}

/**
 * Professional Valuation Report v2 — IVS 103 + RICS Red Book
 * يضم: Executive Summary + كل المكونات + الإقرار + QR + SHA hash
 */
export async function generateProfessionalReport({ state, appraiser, baseUrl }: PdfOptions): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const id = state.id ?? "DRAFT";
  const sig = state.signature_hash ?? simpleHash(JSON.stringify({ id, t: Date.now() }));
  const verifyUrl = `${baseUrl ?? "https://app.local"}/verify/${id}`;
  const qr = await makeQRDataUrl(verifyUrl);

  const header = (title: string) => {
    doc.setFillColor(15, 35, 75);
    doc.rect(0, 0, W, 22, "F");
    doc.setTextColor(255);
    doc.setFontSize(14); doc.setFont("helvetica", "bold");
    doc.text(title, W / 2, 10, { align: "center" });
    doc.setFontSize(8); doc.setFont("helvetica", "normal");
    doc.text(`Report #${id.slice(0, 8)} | ${new Date().toISOString().slice(0, 10)} | ${state.standard.toUpperCase()}`, W / 2, 17, { align: "center" });
    doc.setTextColor(0);
  };

  const footer = () => {
    const p = doc.getNumberOfPages();
    for (let i = 1; i <= p; i++) {
      doc.setPage(i);
      doc.setFontSize(7); doc.setTextColor(120);
      doc.text(`Page ${i} / ${p}  •  SHA-${sig}  •  ${verifyUrl}`, W / 2, H - 5, { align: "center" });
      doc.setTextColor(0);
    }
  };

  // ===== Page 1: Cover + Executive Summary =====
  header("Real Estate Valuation Report");
  let y = 34;
  doc.setFontSize(18); doc.setFont("helvetica", "bold");
  doc.text("Executive Summary", W / 2, y, { align: "center" });
  y += 10;

  const subj = state.subject ?? {};
  const rec = state.reconciliation ?? {};
  const approaches = state.approaches ?? {};

  autoTable(doc, {
    startY: y,
    theme: "grid",
    styles: { fontSize: 10, cellPadding: 3 },
    headStyles: { fillColor: [15, 35, 75] },
    body: [
      ["Property Type", subj.propType ?? "—", "Area (m²)", String(subj.area ?? "—")],
      ["District", subj.district ?? "—", "Year Built", String(subj.yearBuilt ?? "—")],
      ["Purpose of Valuation", subj.purpose ?? "—", "Basis", "Market Value"],
      ["Inspection Date", subj.inspectionDate ?? "—", "Valuation Date", subj.valuationDate ?? new Date().toISOString().slice(0, 10)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Final Value box
  doc.setFillColor(15, 35, 75);
  doc.rect(14, y, W - 28, 22, "F");
  doc.setTextColor(255);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("FINAL MARKET VALUE", W / 2, y + 8, { align: "center" });
  doc.setFontSize(22); doc.setFont("helvetica", "bold");
  doc.text(`EGP ${fmt(rec.final ?? approaches.salesValue)}`, W / 2, y + 18, { align: "center" });
  doc.setTextColor(0);
  y += 28;

  // Approaches Summary
  doc.setFontSize(12); doc.setFont("helvetica", "bold");
  doc.text("Valuation Approaches", 14, y); y += 2;
  doc.setDrawColor(15, 35, 75); doc.line(14, y, W - 14, y); y += 4;
  autoTable(doc, {
    startY: y,
    theme: "striped",
    head: [["Approach", "Indicated Value (EGP)", "Weight %", "Contribution"]],
    body: [
      ["Market (Comparable Sales)", fmt(approaches.salesValue), String(rec.wMarket ?? 50), fmt((approaches.salesValue ?? 0) * (rec.wMarket ?? 50) / 100)],
      ["Cost Approach", fmt(approaches.costValue), String(rec.wCost ?? 20), fmt((approaches.costValue ?? 0) * (rec.wCost ?? 20) / 100)],
      ["Income (DCF)", fmt(approaches.incomeValue), String(rec.wIncome ?? 30), fmt((approaches.incomeValue ?? 0) * (rec.wIncome ?? 30) / 100)],
    ],
    headStyles: { fillColor: [15, 35, 75] },
    styles: { fontSize: 9 },
  });

  // ===== Page 2: Highest & Best Use + DCF Snapshot =====
  doc.addPage(); header("Real Estate Valuation Report");
  y = 30;
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Highest & Best Use (IVS 104 §140)", 14, y); y += 2;
  doc.line(14, y, W - 14, y); y += 4;
  const hbu = state.subject?.hbu ?? {};
  autoTable(doc, {
    startY: y,
    head: [["Scenario", "Legal", "Physical", "Financial", "Productive", "Score"]],
    body: (hbu.scenarios ?? [["Current Use", "Yes", "Yes", "Yes", "Yes", "—"]]),
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 35, 75] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // DCF
  const dcf = state.approaches?.dcf ?? {};
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Discounted Cash Flow (IVS 105 §50.31)", 14, y); y += 2;
  doc.line(14, y, W - 14, y); y += 4;
  autoTable(doc, {
    startY: y,
    body: [
      ["NPV (EGP)", fmt(dcf.npv), "IRR (%)", dcf.irr ? `${(dcf.irr * 100).toFixed(2)}%` : "—"],
      ["Holding Period (yrs)", String(dcf.years ?? 10), "Discount Rate (%)", String(dcf.discount ?? "—")],
      ["Terminal Value (EGP)", fmt(dcf.terminal), "Equity Multiple", dcf.em ? `${dcf.em.toFixed(2)}x` : "—"],
    ],
    theme: "grid",
    styles: { fontSize: 9 },
  });

  // ===== Page 3: Risk & ESG =====
  doc.addPage(); header("Real Estate Valuation Report");
  y = 30;
  doc.setFontSize(13); doc.setFont("helvetica", "bold");
  doc.text("Risk Analysis", 14, y); y += 2;
  doc.line(14, y, W - 14, y); y += 4;
  const risk = state.risk ?? {};
  autoTable(doc, {
    startY: y,
    head: [["Metric", "Value", "Standard"]],
    body: [
      ["Forced Sale Value (EGP)", fmt(risk.fsv), "IVS 104 §170"],
      ["Insurance Reinstatement (EGP)", fmt(risk.insurance), "RICS VPGA 9"],
      ["ESG Score", String(risk.esgScore ?? "—") + " / 100", "RICS Sustainability 2023"],
      ["Monte Carlo P5 (EGP)", fmt(risk.mcP5), "Risk Distribution"],
      ["Monte Carlo P95 (EGP)", fmt(risk.mcP95), "Risk Distribution"],
      ["Value at Risk 95% (EGP)", fmt(risk.var95), "Loss Scenario"],
    ],
    styles: { fontSize: 9 },
    headStyles: { fillColor: [15, 35, 75] },
  });

  // ===== Page 4: Declaration + Signature + QR =====
  doc.addPage(); header("Valuer Declaration & Certification");
  y = 32;
  const decl = state.declaration ?? {};
  const valuerName = decl.name ?? appraiser?.name ?? "—";
  const valuerLicense = decl.license ?? appraiser?.license ?? "—";
  const authority = decl.authority ?? appraiser?.authority ?? "FRA Egypt";

  doc.setFontSize(11); doc.setFont("helvetica", "bold");
  doc.text("Statement of Independence (RICS PS 2 / IVS 101)", 14, y); y += 6;
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  const declText = [
    "I hereby declare that I have no conflict of interest with the subject property or any party to the transaction.",
    "My fee is not contingent upon the valuation outcome or the magnitude of the appraised value.",
    "I possess the knowledge and experience required to value this property type in this market.",
    "This valuation complies with IVS 2025, RICS Red Book Global Standards, and Egyptian Appraisal Standards (EAA).",
    "The valuation is valid as of the date stated. Subsequent market changes are not reflected.",
  ];
  declText.forEach((t) => { const lines = doc.splitTextToSize(`• ${t}`, W - 28); doc.text(lines, 14, y); y += lines.length * 5 + 1; });

  y += 4;
  autoTable(doc, {
    startY: y,
    theme: "grid",
    body: [
      ["Valuer", valuerName, "License #", valuerLicense],
      ["Authority", authority, "Report Date", new Date().toISOString().slice(0, 10)],
      ["Valuation Date", decl.valuationDate ?? new Date().toISOString().slice(0, 10), "Signed", state.signed_at ? new Date(state.signed_at).toISOString().slice(0, 10) : "Pending"],
    ],
    styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 10;

  // Signature box + QR
  doc.setDrawColor(15, 35, 75);
  doc.rect(14, y, W - 28, 50);
  doc.setFontSize(10); doc.setFont("helvetica", "bold");
  doc.text("Digital Signature", 18, y + 8);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(`SHA: ${sig}`, 18, y + 16);
  doc.text(`Valuer: ${valuerName}`, 18, y + 22);
  doc.text(`License: ${valuerLicense}`, 18, y + 28);
  doc.text(`Status: ${state.locked ? "SIGNED & LOCKED" : "DRAFT — NOT SIGNED"}`, 18, y + 34);
  doc.setFontSize(7); doc.setTextColor(120);
  doc.text("Scan QR to verify authenticity →", 18, y + 44);
  doc.setTextColor(0);

  if (qr) {
    doc.addImage(qr, "PNG", W - 60, y + 5, 40, 40);
  }

  footer();
  return doc;
}
