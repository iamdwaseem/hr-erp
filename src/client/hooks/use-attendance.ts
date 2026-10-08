import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { AttendanceImport, AttendanceRecord } from "../../shared/types/attendance";

export const attendanceKeys = { all: ["attendance"] as const, imports: () => [...attendanceKeys.all, "imports"] as const, records: () => [...attendanceKeys.all, "records"] as const };

export function useAttendanceImports() {
  return useQuery<AttendanceImport[]>({ queryKey: attendanceKeys.imports(), queryFn: () => apiClient.get<AttendanceImport[]>("/attendance/imports") });
}

export function useImportAttendance() {
  const client = useQueryClient();
  return useMutation({ mutationFn: (payload: unknown) => apiClient.post<{ importId: string; acceptedCount: number; rejectedCount: number; rejected: Array<{ row: number; reason: string }> }>("/attendance/imports", payload), onSuccess: () => client.invalidateQueries({ queryKey: attendanceKeys.all }) });
}

export function useAttendanceRecords(params?: { employeeId?: string; startDate?: string; endDate?: string }) {
  return useQuery<AttendanceRecord[]>({ queryKey: [...attendanceKeys.records(), params], queryFn: () => apiClient.get<AttendanceRecord[]>("/attendance/records", { params }) });
}
