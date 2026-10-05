import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type {
  ExpirySummary,
  ExpiringDocumentItem,
  ExpiryQueryFilters,
} from "../../shared/types/expiry";

export function useExpirySummary() {
  return useQuery<ExpirySummary>({
    queryKey: ["expiry", "summary"],
    queryFn: () => apiClient.get<ExpirySummary>("/expiry/summary"),
  });
}

export function useExpiringDocuments(filters?: ExpiryQueryFilters) {
  return useQuery<ExpiringDocumentItem[]>({
    queryKey: ["expiry", "documents", filters],
    queryFn: () => {
      const params: Record<string, string | number | undefined> = {};
      if (filters?.status && filters.status !== "all") params.status = filters.status;
      if (filters?.documentType && filters.documentType !== "all")
        params.documentType = filters.documentType;
      if (filters?.departmentId && filters.departmentId !== "all")
        params.departmentId = filters.departmentId;
      if (filters?.branchId && filters.branchId !== "all")
        params.branchId = filters.branchId;
      if (filters?.nationality && filters.nationality !== "all")
        params.nationality = filters.nationality;
      if (filters?.search?.trim()) params.search = filters.search.trim();
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;

      return apiClient.get<ExpiringDocumentItem[]>("/expiry/documents", { params });
    },
  });
}
