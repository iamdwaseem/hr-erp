export type AttendanceStatus = "present" | "leave" | "absent" | "holiday" | "off";
export type AttendanceImportMode = "leave_only" | "full_attendance";

export interface AttendanceImportRow {
  employeeIdentifier: string;
  attendanceDate: string;
  status: AttendanceStatus;
  leaveTypeCode?: string | null;
  remarks?: string | null;
  sourceRowNumber: number;
  sourceIdentifier: string;
}

export interface AttendanceRecord {
  id: string;
  employeeId: string;
  employeeCode?: string;
  employeeName?: string;
  attendanceDate: string;
  status: AttendanceStatus;
  leaveTypeId: string | null;
  sourceImportId: string | null;
  sourceRowNumber: number | null;
  sourceIdentifier: string | null;
  remarks: string | null;
}

export interface AttendanceImport {
  id: string;
  fileName: string;
  mode: AttendanceImportMode;
  periodStart: string;
  periodEnd: string;
  rowCount: number;
  acceptedCount: number;
  rejectedCount: number;
  status: string;
  createdAt: string;
}
