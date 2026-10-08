import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { GratuityRecord } from "../../shared/types/payroll";
import type { GratuityCalculationResult } from "../../shared/utils/payroll-calculations";

export const gratuityKeys = {
  all: ["gratuity"] as const,
  records: () => [...gratuityKeys.all, "records"] as const,
  employeeHistory: (employeeId: string) => [...gratuityKeys.all, "employee", employeeId] as const,
};

export function useCalculateGratuity() {
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      lastWorkingDate: string;
      basicSalaryOverride?: number | null;
      policyVersion?: string;
      notes?: string | null;
    }) => {
      const res = await apiClient.post<
        GratuityCalculationResult & { employeeId: string; employeeName: string; employeeCode: string }
      >("/gratuity/calculate", payload);
      return res;
    },
  });
}

export function useSaveGratuityRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      lastWorkingDate: string;
      basicSalaryAtCalculation: number;
      serviceYears: number;
      eligibleDays: number;
      gratuityAmount: number;
      currency?: string;
      status?: "calculated" | "finalized" | "paid";
      policyVersion?: string;
      notes?: string | null;
    }) => {
      const res = await apiClient.post<GratuityRecord>("/gratuity/records", payload);
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: gratuityKeys.records() });
      queryClient.invalidateQueries({ queryKey: gratuityKeys.employeeHistory(vars.employeeId) });
    },
  });
}

export function useGratuityRecords() {
  return useQuery({
    queryKey: gratuityKeys.records(),
    queryFn: async () => {
      const res = await apiClient.get<GratuityRecord[]>("/gratuity/records");
      return res || [];
    },
  });
}

export function useEmployeeGratuityHistory(employeeId: string | null) {
  return useQuery({
    queryKey: gratuityKeys.employeeHistory(employeeId || ""),
    queryFn: async () => {
      if (!employeeId) return [];
      const res = await apiClient.get<GratuityRecord[]>(`/gratuity/employees/${employeeId}`);
      return res || [];
    },
    enabled: Boolean(employeeId),
  });
}

