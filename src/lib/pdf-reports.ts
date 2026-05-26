import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { fmt } from "./valuation";
import { getDailyPrice, getInvReturn, getBuildingCondition, getMarketIndicators } from "./domain";

const NAVY: [number, number, number] = [15, 35, 75];

function header(doc: jsPDF, title: string, subtitle: string) {
  const W = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY); doc.rect(0, 0, W, 28, "F");
  doc.setTextColor(255);
  doc.setFontSize(17); doc.text(title, W / 2, 12, { align: "center" });
  doc.setFontSize(9); doc.text(subtitle, W / 2, 20, { align: "center" });
  doc.setTextColor(0);
}

function footer(doc: jsPDF) {
  const W = doc.internal.pageSize.getWidth();
  const pages = doc.getNumberOfPages();
  for (let p = 1; p <= pages; p++) {
    doc.setPage(p); doc.setFontSize(8); doc.setTextColor(120);
    doc.text(`Page ${p}/${pages} | Port Said Appraiser | EES / IVS 2022`, W / 2, 290, { align: "center" });
  }
}

// === 1) Market Report — overall indicators ===
export function generateMarketReport(areas: any[], properties: any[]): jsPDF {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  const W = doc.internal.pageSize.getWidth();
  header(doc, "Market Report", `Date: ${new Date().toISOString().slice(0, 10)} | Areas: ${areas.length} | Listings: ${properties.length}`);
  let y = 38;
  const ind = getMarketIndicators(areas, properties);
  doc.setFontSize(13); doc.setFont("helvetica", "bold"); doc.text("Key Market Indicators", 14, y); y += 4;
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: NAVY },
    head: [["Axis", "Indicator", "Value"]],
    body: [
      ["Supply/Demand", "Vacancy Rate %", ind.sd.vacRate],
      ["Supply/Demand", "Absorption (units/mo)", String(ind.sd.absorpRate)],
      ["Supply/Demand", "Total Inventory", String(ind.sd.inventory)],
      ["Prices/ROI", "HPI Value", ind.pr.hpiVal],
      ["Prices/ROI", "Avg ROI %", ind.pr.avgROI],
      ["Prices/ROI", "Rental Yield %", ind.pr.avgRY],
      ["Prices/ROI", "Capital Appreciation %", ind.pr.capApp],
      ["Macro", "Interest Rate %", String(ind.macro.interestRate)],
      ["Macro", "Inflation %", String(ind.macro.inflation)],
      ["Macro", "Mortgage/GDP %", String(ind.macro.mortgageGDP)],
      ["Macro", "Price/Income", ind.macro.priceTOIncome],
      ["Developer", "Avg PPSQM (EGP)", fmt(ind.dev.avgPsqm)],
      ["Developer", "Build Cost (EGP)", fmt(ind.dev.avgBuildCost)],
      ["Developer", "Margin %", ind.dev.devMargin],
      ["Developer", "Avg IRR %", ind.dev.avgIRR],
      ["Location", "Infrastructure /5", ind.loc.avgInfra],
      ["Location", "Services /5", ind.loc.avgSvc],
      ["Location", "Population Demand %", ind.loc.popDemand],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  // Top areas by base price
  doc.setFontSize(13); doc.text("Top Areas by Base Price (EGP/sqm)", 14, y); y += 4;
  const top = [...areas].sort((a, b) => b.base_price - a.base_price).slice(0, 12);
  autoTable(doc, {
    startY: y, theme: "striped", styles: { fontSize: 9 }, headStyles: { fillColor: NAVY },
    head: [["#", "Area", "Base", "Current", "Growth %"]],
    body: top.map((a, i) => [String(i + 1), a.name, fmt(a.base_price), fmt(getDailyPrice(a.base_price, a.growth)), (a.growth * 100).toFixed(1)]),
  });

  footer(doc);
  return doc;
}

// === 2) Area Report — single area drill-down ===
export function generateAreaReport(area: any, properties: any[], txns: any[]): jsPDF {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  header(doc, `Area Report: ${area.name}`, `District: ${area.district_id} | Growth ${(area.growth * 100).toFixed(1)}%`);
  let y = 38;
  const inArea = properties.filter((p) => p.area_id === area.id);
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 9 },
    body: [
      ["Base Price (EGP/sqm)", fmt(area.base_price), "Current (EGP/sqm)", fmt(getDailyPrice(area.base_price, area.growth))],
      ["Land PPSQM", fmt(area.land_psqm), "Land Ownership", area.land_own || "-"],
      ["Infrastructure /5", String(area.infra_rating ?? "-"), "Services /5", String(area.services_rating ?? "-")],
      ["Transport /5", String(area.transport_rating ?? "-"), "Safety /5", String(area.safety_rating ?? "-")],
      ["Listings", String(inArea.length), "Recorded Txns", String(txns.filter((t) => inArea.some((p) => p.id === t.property_id)).length)],
    ],
    columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 240, 240] }, 2: { fontStyle: "bold", fillColor: [240, 240, 240] } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  if (inArea.length) {
    doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Listings in Area", 14, y); y += 4;
    autoTable(doc, {
      startY: y, theme: "striped", styles: { fontSize: 8 }, headStyles: { fillColor: NAVY },
      head: [["ID", "Type", "Sqm", "Base", "Current", "Year"]],
      body: inArea.slice(0, 20).map((p) => [p.id, p.type_label, String(p.area_sqm), fmt(p.base_price), fmt(getDailyPrice(p.base_price, area.growth)), String(p.year_built ?? "-")]),
    });
  }

  if (area.hood_desc) {
    y = (doc as any).lastAutoTable.finalY + 6;
    doc.setFontSize(11); doc.setFont("helvetica", "normal");
    const lines = doc.splitTextToSize(area.hood_desc, 180);
    doc.text(lines, 14, y);
  }

  footer(doc);
  return doc;
}

// === 3) Unit Report — single property detailed ===
export function generateUnitReport(prop: any, area: any): jsPDF {
  const doc = new jsPDF({ orientation: "p", unit: "mm", format: "a4" });
  header(doc, `Unit Report: ${prop.id}`, `${prop.type_label} | ${area.name}`);
  let y = 38;
  const inv = getInvReturn(prop, area);
  const cond = getBuildingCondition(prop);
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 9 },
    body: [
      ["Type", prop.type_label, "Building", prop.building_type],
      ["Area (sqm)", String(prop.area_sqm), "Floor", String(prop.floor ?? "-")],
      ["Finish", prop.finish ?? "-", "Year Built", String(prop.year_built ?? "-")],
      ["View", prop.view ?? "-", "Rooms / Baths", `${prop.rooms ?? 0} / ${prop.baths ?? 0}`],
    ],
    columnStyles: { 0: { fontStyle: "bold", fillColor: [240, 240, 240] }, 2: { fontStyle: "bold", fillColor: [240, 240, 240] } },
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(12); doc.setFont("helvetica", "bold"); doc.text("Investment Returns", 14, y); y += 4;
  autoTable(doc, {
    startY: y, theme: "striped", styles: { fontSize: 9 }, headStyles: { fillColor: NAVY },
    head: [["Metric", "Value"]],
    body: [
      ["Current Price (EGP)", fmt(inv.cur)],
      ["Purchase Price (EGP)", fmt(inv.pp)],
      ["Capital Appreciation %", String(inv.cap)],
      ["Annual Rent (EGP)", fmt(inv.annRent)],
      ["Rental Yield %", String(inv.rYield)],
      ["Total ROI %", String(inv.totROI)],
    ],
  });
  y = (doc as any).lastAutoTable.finalY + 6;

  doc.setFontSize(12); doc.text("Building Condition", 14, y); y += 4;
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 9 }, headStyles: { fillColor: NAVY },
    head: [["Score", "Grade", "Age (yrs)"]],
    body: [[String(cond.score), cond.grade, String(cond.age)]],
  });

  footer(doc);
  return doc;
}

// === 4) Comparative Report — multiple areas side by side ===
export function generateComparativeReport(areas: any[], properties: any[]): jsPDF {
  const doc = new jsPDF({ orientation: "l", unit: "mm", format: "a4" });
  header(doc, "Comparative Analysis", `${areas.length} areas compared`);
  let y = 38;
  autoTable(doc, {
    startY: y, theme: "grid", styles: { fontSize: 8 }, headStyles: { fillColor: NAVY },
    head: [["Area", "Base EGP/m²", "Current", "Growth %", "Land EGP/m²", "Infra/5", "Svc/5", "Trans/5", "Listings"]],
    body: areas.map((a) => [
      a.name,
      fmt(a.base_price),
      fmt(getDailyPrice(a.base_price, a.growth)),
      (a.growth * 100).toFixed(1),
      fmt(a.land_psqm),
      String(a.infra_rating ?? "-"),
      String(a.services_rating ?? "-"),
      String(a.transport_rating ?? "-"),
      String(properties.filter((p) => p.area_id === a.id).length),
    ]),
  });
  footer(doc);
  return doc;
}
