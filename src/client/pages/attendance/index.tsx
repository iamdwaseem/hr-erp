import React, { useMemo, useState } from "react";
import * as XLSX from "xlsx";
import { FileSpreadsheet, Upload } from "lucide-react";
import { Button } from "../../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../../components/ui/card";
import { Input } from "../../components/ui/input";
import { Select } from "../../components/ui/select";
import { useImportAttendance, useAttendanceImports } from "../../hooks/use-attendance";
import { normalizeImportDate, suggestColumnMapping } from "../../../shared/utils/attendance-import";

export const AttendancePage: React.FC = () => {
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<Record<string, unknown>[]>([]);
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [fileName, setFileName] = useState("");
  const [periodStart, setPeriodStart] = useState("");
  const [periodEnd, setPeriodEnd] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const importMutation = useImportAttendance();
  const { data: imports = [] } = useAttendanceImports();

  const previewRows = useMemo(() => rows.slice(0, 10).map((row, index) => ({
    employeeIdentifier: String(row[mapping.employeeIdentifier] ?? "").trim(),
    attendanceDate: normalizeImportDate(row[mapping.attendanceDate]),
    status: String(row[mapping.status] ?? "leave").trim().toLowerCase() || "leave",
    leaveTypeCode: String(row[mapping.leaveTypeCode] ?? "").trim() || null,
    sourceRowNumber: index + 2,
  })), [rows, mapping]);

  const parseFile = async (file: File) => {
    const workbook = XLSX.read(await file.arrayBuffer(), { type: "array", cellDates: false });
    const sheet = workbook.Sheets[workbook.SheetNames[0]];
    const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "" });
    const headerRow = (matrix[0] || []).map((value) => String(value));
    const dataRows = matrix.slice(1).map((values) => Object.fromEntries(headerRow.map((header, index) => [header, values[index]])));
    setFileName(file.name); setHeaders(headerRow); setRows(dataRows); setMapping(suggestColumnMapping(headerRow)); setMessage(null);
  };

  const submit = async () => {
    if (!mapping.employeeIdentifier || !mapping.attendanceDate || !periodStart || !periodEnd) { setMessage("Map employee and date columns and select an import period."); return; }
    const normalizedRows = rows.map((row, index) => ({ employeeIdentifier: String(row[mapping.employeeIdentifier] ?? "").trim(), attendanceDate: normalizeImportDate(row[mapping.attendanceDate]) || "", status: "leave", leaveTypeCode: mapping.leaveTypeCode ? String(row[mapping.leaveTypeCode] ?? "").trim() || null : null, sourceRowNumber: index + 2, sourceIdentifier: String(row[mapping.employeeIdentifier] ?? "").trim() })).filter((row) => row.employeeIdentifier && row.attendanceDate);
    try { const result = await importMutation.mutateAsync({ fileName, mode: "leave_only", periodStart, periodEnd, mapping, rows: normalizedRows }); setMessage(`Imported ${result.acceptedCount} leave rows. Rejected: ${result.rejectedCount}.`); } catch (error: any) { setMessage(error.message || "Import failed"); }
  };

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold">Attendance Import</h1><p className="mt-1 text-sm text-muted-foreground">Import leave-only Excel sheets without treating missing rows as absence.</p></div>
    <Card><CardHeader><CardTitle className="flex items-center gap-2"><FileSpreadsheet className="h-5 w-5 text-primary" />Leave-only Excel import</CardTitle></CardHeader><CardContent className="space-y-4">
      <Input type="file" accept=".xlsx,.xls,.csv" onChange={(event) => event.target.files?.[0] && parseFile(event.target.files[0])} />
      <div className="grid gap-3 sm:grid-cols-2"><Input type="date" value={periodStart} onChange={(event) => setPeriodStart(event.target.value)} /><Input type="date" value={periodEnd} onChange={(event) => setPeriodEnd(event.target.value)} /></div>
      {headers.length > 0 && <div className="grid gap-3 sm:grid-cols-3">{["employeeIdentifier", "attendanceDate", "leaveTypeCode"].map((field) => <label key={field} className="text-sm"><span className="mb-1 block font-medium">{field}</span><Select value={mapping[field] || ""} onChange={(event) => setMapping({ ...mapping, [field]: event.target.value })}><option value="">Not mapped</option>{headers.map((header) => <option key={header} value={header}>{header}</option>)}</Select></label>)}</div>}
      {message && <div className="rounded-md bg-muted p-3 text-sm">{message}</div>}
      {previewRows.length > 0 && <div className="overflow-x-auto rounded-md border"><table className="w-full text-sm"><thead className="bg-muted/50"><tr><th className="p-2 text-left">Row</th><th className="p-2 text-left">Employee</th><th className="p-2 text-left">Date</th><th className="p-2 text-left">Status</th><th className="p-2 text-left">Leave Type</th></tr></thead><tbody>{previewRows.map((row, index) => <tr key={index} className="border-t"><td className="p-2">{row.sourceRowNumber}</td><td className="p-2">{row.employeeIdentifier}</td><td className="p-2">{row.attendanceDate || "Invalid"}</td><td className="p-2">leave</td><td className="p-2">{row.leaveTypeCode || "Not specified"}</td></tr>)}</tbody></table></div>}
      <Button onClick={submit} disabled={!rows.length || importMutation.isPending}><Upload className="mr-2 h-4 w-4" />Import leave rows</Button>
    </CardContent></Card>
    <Card><CardHeader><CardTitle>Import history</CardTitle></CardHeader><CardContent>{imports.length === 0 ? <p className="text-sm text-muted-foreground">No imports yet.</p> : <div className="space-y-2">{imports.map((item) => <div key={item.id} className="flex items-center justify-between border-b py-2 text-sm"><span>{item.fileName}</span><span className="text-muted-foreground">{item.acceptedCount} accepted / {item.rejectedCount} rejected</span></div>)}</div>}</CardContent></Card>
  </div>;
};
