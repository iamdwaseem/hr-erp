import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { SalaryStructure, EmployeeSalary } from "../../shared/types/payroll";

export const salaryKeys = {
  all: ["salary"] as const,
  structures: (status?: string) => [...salaryKeys.all, "structures", { status }] as const,
  structure: (id: string) => [...salaryKeys.all, "structures", id] as const,
  employeeSalaries: () => [...salaryKeys.all, "employees"] as const,
  employeeCurrent: (employeeId: string) => [...salaryKeys.all, "employee", employeeId, "current"] as const,
  employeeHistory: (employeeId: string) => [...salaryKeys.all, "employee", employeeId, "history"] as const,
};

export function useSalaryStructures(status?: string) {
  return useQuery({
    queryKey: salaryKeys.structures(status),
    queryFn: async () => {
      const query = status ? `?status=${encodeURIComponent(status)}` : "";
      const res = await apiClient.get<SalaryStructure[]>(`/api/salary/structures${query}`);
      return res || [];
    },
  });
}

export function useSalaryStructure(id: string | null) {
  return useQuery({
    queryKey: salaryKeys.structure(id || ""),
    queryFn: async () => {
      if (!id) return null;
      const res = await apiClient.get<SalaryStructure>(`/api/salary/structures/${id}`);
      return res || null;
    },
    enabled: Boolean(id),
  });
}

export function useCreateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      code: string;
      description?: string | null;
      basicSalary: number;
      housingAllowance?: number;
      transportAllowance?: number;
      otherAllowance?: number;
      otherDeductions?: number;
      currency?: string;
      status?: "active" | "inactive";
    }) => {
      const res = await apiClient.post<SalaryStructure>("/api/salary/structures", payload);
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.structures() });
    },
  });
}

export function useUpdateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      ...payload
    }: {
      id: string;
      name?: string;
      description?: string | null;
      basicSalary?: number;
      housingAllowance?: number;
      transportAllowance?: number;
      otherAllowance?: number;
      otherDeductions?: number;
      currency?: string;
      status?: "active" | "inactive";
    }) => {
      const res = await apiClient.put<SalaryStructure>(`/api/salary/structures/${id}`, payload);
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.structures() });
      queryClient.invalidateQueries({ queryKey: salaryKeys.structure(vars.id) });
    },
  });
}

export function useDeactivateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; id: string }>(
        `/api/salary/structures/${id}/deactivate`,
        {}
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.structures() });
    },
  });
}

export function useActivateSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.post<{ message: string; id: string }>(
        `/api/salary/structures/${id}/activate`,
        {}
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.structures() });
    },
  });
}

export function useDeleteSalaryStructure() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await apiClient.delete<{ message: string; id: string }>(
        `/api/salary/structures/${id}`
      );
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.structures() });
    },
  });
}

export function useEmployeeSalaries() {
  return useQuery({
    queryKey: salaryKeys.employeeSalaries(),
    queryFn: async () => {
      const res = await apiClient.get<EmployeeSalary[]>("/api/salary/employees");
      return res || [];
    },
  });
}

export function useEmployeeCurrentSalary(employeeId: string | null) {
  return useQuery({
    queryKey: salaryKeys.employeeCurrent(employeeId || ""),
    queryFn: async () => {
      if (!employeeId) return null;
      const res = await apiClient.get<EmployeeSalary | null>(
        `/api/salary/employees/${employeeId}/current`
      );
      return res || null;
    },
    enabled: Boolean(employeeId),
  });
}

export function useEmployeeSalaryHistory(employeeId: string | null) {
  return useQuery({
    queryKey: salaryKeys.employeeHistory(employeeId || ""),
    queryFn: async () => {
      if (!employeeId) return [];
      const res = await apiClient.get<EmployeeSalary[]>(
        `/api/salary/employees/${employeeId}/history`
      );
      return res || [];
    },
    enabled: Boolean(employeeId),
  });
}

export function useAssignEmployeeSalary() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employeeId: string;
      salaryStructureId?: string | null;
      basicSalary: number;
      housingAllowance?: number;
      transportAllowance?: number;
      otherAllowance?: number;
      deductions?: number;
      currency?: string;
      effectiveFrom: string;
      effectiveTo?: string | null;
      notes?: string | null;
    }) => {
      const res = await apiClient.post<EmployeeSalary>("/api/salary/employees/assign", payload);
      return res;
    },
    onSuccess: (_, vars) => {
      queryClient.invalidateQueries({ queryKey: salaryKeys.employeeSalaries() });
      queryClient.invalidateQueries({ queryKey: salaryKeys.employeeCurrent(vars.employeeId) });
      queryClient.invalidateQueries({ queryKey: salaryKeys.employeeHistory(vars.employeeId) });
    },
  });
}
