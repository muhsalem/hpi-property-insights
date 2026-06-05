import { DEED_LABELS, STATUS_META } from "@/components/RegistryRecordPanel";

function escapeCSV(v: unknown): string {
  if (v == null) return "";
  const s = String(v);
  if (/[\r\n,"]/.test(s)) return `"${s.replace(/"/g, "\"\"")}"`;
  return s;
}

function toCSV(rows: Record<string, unknown>[], headers: { key: string; label: string }[]): string {
  const head = headers.map((h) => escapeCSV(h.label)).join(",");
  const body = rows
    .map((row) => headers.map((h) => escapeCSV(row[h.key])).join(","))
    .join("\n");
  return "\uFEFF" + head + "\n" + body;
}

export function exportRegistryRecordsCSV(
  records: any[],
  propertyId: string,
  propertyLabel?: string,
) {
  const rows = records.map((r: any) => ({
    registry_office: r.registry_office ?? "",
    registration_no: r.registration_no ?? "",
    registration_date: r.registration_date
      ? new Date(r.registration_date).toLocaleDateString("ar-EG")
      : "",
    deed_type: DEED_LABELS[r.deed_type as string] ?? r.deed_type,
    status: STATUS_META[r.status as string]?.label ?? r.status,
    owner_name: r.owner_name ?? "",
    notes: r.notes ?? "",
    verified: r.verified_at ? "نعم" : "لا",
  }));
  const csv = toCSV(rows, [
    { key: "registry_office", label: "مأمورية الشهر العقاري" },
    { key: "registration_no", label: "رقم القيد" },
    { key: "registration_date", label: "تاريخ التسجيل" },
    { key: "deed_type", label: "نوع التصرف" },
    { key: "status", label: "الحالة" },
    { key: "owner_name", label: "اسم المالك" },
    { key: "notes", label: "ملاحظات" },
    { key: "verified", label: "مُتحقَّق" },
  ]);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `registry-${propertyLabel || propertyId}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
