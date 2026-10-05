import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { Department, Designation, Branch } from "../../shared/types/employee";

export function useDepartments() {
  return useQuery<Department[]>({
    queryKey: ["masters", "departments"],
    queryFn: () => apiClient.get<Department[]>("/masters/departments"),
    staleTime: 1000 * 60 * 10, // 10 minutes
  });
}

export function useDesignations() {
  return useQuery<Designation[]>({
    queryKey: ["masters", "designations"],
    queryFn: () => apiClient.get<Designation[]>("/masters/designations"),
    staleTime: 1000 * 60 * 10,
  });
}

export function useBranches() {
  return useQuery<Branch[]>({
    queryKey: ["masters", "branches"],
    queryFn: () => apiClient.get<Branch[]>("/masters/branches"),
    staleTime: 1000 * 60 * 10,
  });
}
