import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Department, Designation, Branch, DocumentTypeMaster } from "../../shared/types/master";

export function useDepartments(includeInactive = false) {
  return useQuery<Department[]>({
    queryKey: ["masters", "departments", { includeInactive }],
    queryFn: () =>
      apiClient.get<Department[]>(
        includeInactive ? "/masters/departments?all=true" : "/masters/departments"
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDesignations(includeInactive = false) {
  return useQuery<Designation[]>({
    queryKey: ["masters", "designations", { includeInactive }],
    queryFn: () =>
      apiClient.get<Designation[]>(
        includeInactive ? "/masters/designations?all=true" : "/masters/designations"
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useBranches(includeInactive = false) {
  return useQuery<Branch[]>({
    queryKey: ["masters", "branches", { includeInactive }],
    queryFn: () =>
      apiClient.get<Branch[]>(
        includeInactive ? "/masters/branches?all=true" : "/masters/branches"
      ),
    staleTime: 1000 * 60 * 5,
  });
}

export function useDocumentTypes(includeInactive = false) {
  return useQuery<DocumentTypeMaster[]>({
    queryKey: ["masters", "document-types", { includeInactive }],
    queryFn: () =>
      apiClient.get<DocumentTypeMaster[]>(
        includeInactive ? "/masters/document-types?all=true" : "/masters/document-types"
      ),
    staleTime: 1000 * 60 * 5,
  });
}

// Department Mutations
export function useCreateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string }) =>
      apiClient.post<Department>("/masters/departments", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
    },
  });
}

export function useUpdateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string }) =>
      apiClient.put<Department>(`/masters/departments/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
    },
  });
}

export function useDeactivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Department>(`/masters/departments/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
    },
  });
}

export function useActivateDepartment() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Department>(`/masters/departments/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "departments"] });
    },
  });
}

// Designation Mutations
export function useCreateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string }) =>
      apiClient.post<Designation>("/masters/designations", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
    },
  });
}

export function useUpdateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string }) =>
      apiClient.put<Designation>(`/masters/designations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
    },
  });
}

export function useDeactivateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Designation>(`/masters/designations/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
    },
  });
}

export function useActivateDesignation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Designation>(`/masters/designations/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "designations"] });
    },
  });
}

// Branch Mutations
export function useCreateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; city?: string | null; country?: string | null }) =>
      apiClient.post<Branch>("/masters/branches", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "branches"] });
    },
  });
}

export function useUpdateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; city?: string | null; country?: string | null }) =>
      apiClient.put<Branch>(`/masters/branches/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "branches"] });
    },
  });
}

export function useDeactivateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Branch>(`/masters/branches/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "branches"] });
    },
  });
}

export function useActivateBranch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Branch>(`/masters/branches/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "branches"] });
    },
  });
}

// Document Type Mutations
export function useCreateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; code: string; description?: string | null }) =>
      apiClient.post<DocumentTypeMaster>("/masters/document-types", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "document-types"] });
    },
  });
}

export function useUpdateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }: { id: string; name?: string; code?: string; description?: string | null }) =>
      apiClient.put<DocumentTypeMaster>(`/masters/document-types/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "document-types"] });
    },
  });
}

export function useDeactivateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DocumentTypeMaster>(`/masters/document-types/${id}/deactivate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "document-types"] });
    },
  });
}

export function useActivateDocumentType() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<DocumentTypeMaster>(`/masters/document-types/${id}/activate`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["masters", "document-types"] });
    },
  });
}
