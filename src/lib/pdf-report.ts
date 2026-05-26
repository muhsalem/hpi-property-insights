import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmt, pct, type AdjustmentRow } from "./valuation";

export type ReportInput = {
  appraiser: { name: string; license?: string };
  subject: { id: string; type_label: string; area_name: string; area_sqm: number; floor?: number|null; finish?: string|null; year_built?: number|null };
  values: { sales?: number; income?: number; cost?: number; residual?: number; profit?: number };
  weights: Record<string, number>;
  final: number;
  ci: { low: number; mid: number; high: number; cv: number };
  grid: AdjustmentRow[];
  hpi: Record<number, number>;
  notes?: string;
};

export function generatePDF(r: ReportInput): jsPDF {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(15, 35, 75);
  doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(18); doc.text("Real Estate Valuation Report", W/2, 12, { align: "center" });
  doc.setFontSize(10); doc.text("EES / IVS 2022 Compliant - Port Said, Egypt", W/2, 20, { align: "center" });
  doc.setTextColor(0);

  let y = 38;
  doc.setFontSize(11); doc.setFont("helvetica","bold");
  doc.text(`Report #: ${r.subject.id}-${Date.now().toString(36).toUpperCase()}`, 14, y);
  doc.text(`Date: ${new Date().toISOString().slice(0,10)}`, W-14, y, { align: "right" });
  y += 8;

  // Subject
  doc.setFontSize(13); doc.text("Subject Property", 14, y); y += 2;
  doc.setDrawColor(15,35,75); doc.line(14, y, W-14, y); y += 5;
  autoTable(doc, {
    startY: y,
    body: [
      ["Type", r.subject.type_label, "Area (sqm)", String(r.subject.area_sqm)],
      ["Location", r.subject.area_name, "Floor", String(r.subject.floor ?? "-")],
      ["Finish", r.subject.finish ?? "-", "Year Built", String(r.subject.year_built ?? "-")],
    ],
    theme: "grid", styles: { fontSize: 9, cellPadding: 2 },
    columnStyles: { 0: { fontStyle: "bold", fillColor: [240,240,240] }, 2: { fontStyle: "bold", fillColor: [240,240,240] } },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Valuation summary
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.text("Valuation Methods", 14, y); y += 2;
  doc.line(14, y, W-14, y); y += 5;
  const methodRows = [
    ["Sales Comparison", r.values.sales ? fmt(r.values.sales) + " EGP" : "—", pct(r.weights.sales || 0)],
    ["Income (Direct Cap)", r.values.income ? fmt(r.values.income) + " EGP" : "—", pct(r.weights.income || 0)],
    ["Cost Approach", r.values.cost ? fmt(r.values.cost) + " EGP" : "—", pct(r.weights.cost || 0)],
    ["Residual Method", r.values.residual ? fmt(r.values.residual) + " EGP" : "—", pct(r.weights.residual || 0)],
    ["Profit Method", r.values.profit ? fmt(r.values.profit) + " EGP" : "—", pct(r.weights.profit || 0)],
  ];
  autoTable(doc, {
    startY: y, head: [["Method", "Value", "Weight"]], body: methodRows,
    theme: "striped", headStyles: { fillColor: [15,35,75] }, styles: { fontSize: 9 },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Final value box
  doc.setFillColor(15, 35, 75); doc.rect(14, y, W-28, 22, "F");
  doc.setTextColor(255); doc.setFontSize(11);
  doc.text("FINAL MARKET VALUE", 18, y+8);
  doc.setFontSize(20); doc.setFont("helvetica","bold");
  doc.text(`${fmt(r.final)} EGP`, W-18, y+12, { align: "right" });
  doc.setFontSize(9); doc.setFont("helvetica","normal");
  doc.text(`Range: ${fmt(r.ci.low)} - ${fmt(r.ci.high)} | CV: ${pct(r.ci.cv)}`, 18, y+18);
  doc.setTextColor(0);
  y += 30;

  // Adjustment grid
  if (r.grid.length) {
    if (y > 220) { doc.addPage(); y = 20; }
    doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.text("Adjustment Grid (Sales Comparison)", 14, y); y += 2;
    doc.line(14, y, W-14, y); y += 4;
    autoTable(doc, {
      startY: y,
      head: [["Comp", "Sale", "PPSQM", "Loc%", "Size%", "Finish%", "Time%", "Adj PPSQM", "Adj Total"]],
      body: r.grid.map(g => [
        g.comparable_id, fmt(g.sale_price), fmt(g.ppsqm),
        pct(g.adj_location), pct(g.adj_size), pct(g.adj_finish), pct(g.adj_time),
        fmt(g.adjusted_ppsqm), fmt(g.adjusted_total),
      ]),
      theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: [15,35,75] },
    });
    y = (doc as any).lastAutoTable.finalY + 6;
  }

  // HPI
  if (y > 220) { doc.addPage(); y = 20; }
  doc.setFontSize(13); doc.setFont("helvetica","bold"); doc.text("HPI Trend (Base 2020 = 100)", 14, y); y += 2;
  doc.line(14, y, W-14, y); y += 4;
  const years = Object.keys(r.hpi).map(Number).sort();
  autoTable(doc, {
    startY: y,
    head: [["Year", ...years.map(String)]],
    body: [["HPI", ...years.map(y => r.hpi[y].toFixed(1))]],
    theme: "grid", styles: { fontSize: 9, halign: "center" }, headStyles: { fillColor: [15,35,75] },
  });
  y = (doc as any).lastAutoTable.finalY + 8;

  // Signature
  if (y > 250) { doc.addPage(); y = 20; }
  doc.setFontSize(10);
  doc.text(`Appraiser: ${r.appraiser.name}`, 14, y);
  if (r.appraiser.license) doc.text(`License: ${r.appraiser.license}`, 14, y+5);
  doc.text("Signature: ____________________", W-14, y, { align: "right" });

  // Footer
  const pages = doc.getNumberOfPages();
  for (let p=1; p<=pages; p++) {
    doc.setPage(p);
    doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Page ${p} of ${pages} | EES / IVS 2022 | Generated by Port Said Appraiser`, W/2, 290, { align: "center" });
  }

  return doc;
}
