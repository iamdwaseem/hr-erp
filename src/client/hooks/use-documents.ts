import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type {
  EmployeePassport,
  EmployeeVisa,
  EmployeeWorkPermit,
} from "../../shared/types/document";
import type {
  PassportInput,
  VisaInput,
  WorkPermitInput,
} from "../../shared/schemas/document";

// ==========================================
// PASSPORT HOOKS
// ==========================================

export function usePassport(employeeId: string) {
  return useQuery<EmployeePassport | null>({
    queryKey: ["employee", employeeId, "passport"],
    queryFn: () => apiClient.get<EmployeePassport | null>(`/employees/${employeeId}/passport`),
    enabled: Boolean(employeeId),
  });
}

export function useCreatePassport(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: PassportInput) =>
      apiClient.post<EmployeePassport>(`/employees/${employeeId}/passport`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "passport"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdatePassport(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<PassportInput>) =>
      apiClient.put<EmployeePassport>(`/employees/${employeeId}/passport`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "passport"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

// ==========================================
// VISA HOOKS
// ==========================================

export function useVisa(employeeId: string) {
  return useQuery<EmployeeVisa | null>({
    queryKey: ["employee", employeeId, "visa"],
    queryFn: () => apiClient.get<EmployeeVisa | null>(`/employees/${employeeId}/visa`),
    enabled: Boolean(employeeId),
  });
}

export function useCreateVisa(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: VisaInput) =>
      apiClient.post<EmployeeVisa>(`/employees/${employeeId}/visa`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "visa"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdateVisa(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<VisaInput>) =>
      apiClient.put<EmployeeVisa>(`/employees/${employeeId}/visa`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "visa"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

// ==========================================
// WORK PERMIT HOOKS
// ==========================================

export function useWorkPermit(employeeId: string) {
  return useQuery<EmployeeWorkPermit | null>({
    queryKey: ["employee", employeeId, "work-permit"],
    queryFn: () => apiClient.get<EmployeeWorkPermit | null>(`/employees/${employeeId}/work-permit`),
    enabled: Boolean(employeeId),
  });
}

export function useCreateWorkPermit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: WorkPermitInput) =>
      apiClient.post<EmployeeWorkPermit>(`/employees/${employeeId}/work-permit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "work-permit"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}

export function useUpdateWorkPermit(employeeId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<WorkPermitInput>) =>
      apiClient.put<EmployeeWorkPermit>(`/employees/${employeeId}/work-permit`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId, "work-permit"] });
      queryClient.invalidateQueries({ queryKey: ["employee", employeeId] });
    },
  });
}
