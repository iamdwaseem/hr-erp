import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { PayrollPeriod, PayrollRecord, PayrollAdjustment } from "../../shared/types/payroll";

export const payrollKeys = {
  all: ["payroll"] as const,
  periods: () => [...payrollKeys.all, "periods"] as const,
  period: (id: string) => [...payrollKeys.all, "periods", id] as const,
  records: (periodId: string, search?: string) =>
    [...payrollKeys.all, "records", periodId, { search }] as const,
  record: (id: string) => [...payrollKeys.all, "record", id] as const,
};

export function usePayrollPeriods() {
  return useQuery({
    queryKey: payrollKeys.periods(),
    queryFn: async () => {
      const res = await apiClient.get<PayrollPeriod[]>("/api/payroll/periods");
      return res || [];
    },
  });
}

export function usePayrollPeriod(id: string | null) {
  return useQuery({
    queryKey: payrollKeys.period(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<PayrollPeriod>(`/api/payroll/periods/${id}`);
      return res || null;
    },
    enabled: Boolean(id),
  });
}

export function useCreatePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      periodYear: number;
      periodMonth: number;
      startDate: string;
      endDate: string;
      notes?: string | null;
    }) => {
      const res = await apiClient.post<PayrollPeriod>("/api/payroll/periods", payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods() });
    },
  });
}

export function useGeneratePayroll() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (periodId: string) => {
      const res = await apiClient.post<{
        message: string;
        generatedCount: number;
        exceptionsCount: number;
        exceptions: Array<{ employeeId: string; employeeName: string; employeeCode: string; reason: string }>;
      }>(`/api/payroll/periods/${periodId}/generate`, {});
      return res;
    },
    onSuccess: (_, periodId) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.period(periodId) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.records(periodId) });
    },
  });
}

export function usePayrollRecords(periodId: string | null, search?: string) {
  return useQuery({
    queryKey: payrollKeys.records(periodId || "", search),
    queryFn: async () => {
      if (!periodId) return [];
      const query = search ? `?search=${encodeURIComponent(search)}` : "";
      const res = await apiClient.get<PayrollRecord[]>(
        `/api/payroll/periods/${periodId}/records${query}`
      );
      return res || [];
    },
    enabled: Boolean(periodId),
  });
}

export function usePayrollRecord(id: string | null) {
  return useQuery({
    queryKey: payrollKeys.record(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<PayrollRecord>(`/api/payroll/records/${id}`);
      return res || null;
    },
    enabled: Boolean(id),
  });
}

export function useAddPayrollAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      recordId,
      ...payload
    }: {
      recordId: string;
      type: "EARNING" | "DEDUCTION";
      name: string;
      amount: number;
      reason?: string | null;
    }) => {
      const res = await apiClient.post<PayrollAdjustment>(
        `/api/payroll/records/${recordId}/adjustments`,
        payload
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useDeletePayrollAdjustment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string; id: string }>(
        `/api/payroll/adjustments/${id}`
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.all });
    },
  });
}

export function useProcessPayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; id: string }>(
        `/api/payroll/periods/${id}/process`,
        {}
      );
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.period(id) });
    },
  });
}

export function useApprovePayrollPeriod() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; id: string }>(
        `/api/payroll/periods/${id}/approve`,
        {}
      );
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.period(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.records(id) });
    },
  });
}

export function useMarkPayrollPeriodPaid() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; id: string }>(
        `/api/payroll/periods/${id}/mark-paid`,
        {}
      );
      return res;
    },
    onSuccess: (_, id) => {
      queryClient.invalidateQueries({ queryKey: payrollKeys.periods() });
      queryClient.invalidateQueries({ queryKey: payrollKeys.period(id) });
      queryClient.invalidateQueries({ queryKey: payrollKeys.records(id) });
    },
  });
}
