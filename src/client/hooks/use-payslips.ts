import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Payslip } from "../../shared/types/payroll";

export const payslipKeys = {
  all: ["payslips"] as const,
  list: (params?: { periodId?: string; employeeId?: string; search?: string }) =>
    [...payslipKeys.all, "list", params] as const,
  detail: (id: string) => [...payslipKeys.all, "detail", id] as const,
  employee: (employeeId: string) => [...payslipKeys.all, "employee", employeeId] as const,
};

export function usePayslips(params?: { periodId?: string; employeeId?: string; search?: string }) {
  return useQuery({
    queryKey: payslipKeys.list(params),
    queryFn: async () => {
      const searchParams = new URLSearchParams();
      if (params?.periodId) searchParams.set("periodId", params.periodId);
      if (params?.employeeId) searchParams.set("employeeId", params.employeeId);
      if (params?.search) searchParams.set("search", params.search);

      const qs = searchParams.toString();
      const res = await apiClient.get<Payslip[]>(`/api/payslips${qs ? `?${qs}` : ""}`);
      return res || [];
    },
  });
}

export function usePayslip(id: string | null) {
  return useQuery({
    queryKey: payslipKeys.detail(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<Payslip & Record<string, any>>(`/api/payslips/${id}`);
      return res || null;
    },
    enabled: Boolean(id),
  });
}

export function useEmployeePayslips(employeeId: string | null) {
  return useQuery({
    queryKey: payslipKeys.employee(employeeId || ""),
    queryFn: async () => {
      if (!employeeId) return [];
      const res = await apiClient.get<Payslip[]>(`/api/payslips/employee/${employeeId}`);
      return res || [];
    },
    enabled: Boolean(employeeId),
  });
}

export function useGeneratePayslips() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { payrollPeriodId: string; employeeIds?: string[] }) => {
      const res = await apiClient.post<{ message: string; generatedCount: number }>(
        "/api/payslips/generate",
        payload
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payslipKeys.all });
    },
  });
}

