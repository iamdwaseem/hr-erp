const aliases: Record<string, string[]> = {
  employeeIdentifier: ["employee code", "employee id", "employee number", "emp code", "emp id", "staff id"],
  attendanceDate: ["date", "attendance date", "leave date", "day"],
  status: ["status", "attendance status", "leave status", "type"],
  leaveTypeCode: ["leave type", "leave code", "absence type"],
  remarks: ["remarks", "remark", "reason", "comments", "notes"],
};

export function normalizeHeader(value: unknown): string {
  return String(value ?? "").trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

export function suggestColumnMapping(headers: unknown[]): Record<string, string> {
  const normalized = headers.map((header) => ({ original: String(header ?? ""), value: normalizeHeader(header) }));
  const mapping: Record<string, string> = {};
  for (const [field, candidates] of Object.entries(aliases)) {
    const match = normalized.find((header) => candidates.includes(header.value));
    if (match) mapping[field] = match.original;
  }
  return mapping;
}

export function excelSerialToDate(value: number): string {
  const date = new Date(Date.UTC(1899, 11, 30) + value * 86400000);
  return date.toISOString().slice(0, 10);
}

export function normalizeImportDate(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) return excelSerialToDate(value);
  const text = String(value ?? "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return text;
  const match = text.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (!match) return null;
  const [, first, second, year] = match;
  const day = Number(first) > 12 ? first : second;
  const month = Number(first) > 12 ? second : first;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}
