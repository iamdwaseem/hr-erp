import { useQuery } from "@tanstack/react-query";
import { apiClient } from "../lib/api-client";
import type { AuditLogEntry, AuditLogQueryFilters } from "../../shared/types/audit";
import type { ApiMeta } from "../../shared/types/api";

export interface AuditLogsResult {
  data: AuditLogEntry[];
  meta?: ApiMeta;
}

export function useAuditLogs(filters?: AuditLogQueryFilters) {
  return useQuery<AuditLogsResult>({
    queryKey: ["audit-logs", filters],
    queryFn: async () => {
      const params: Record<string, string | number | undefined> = {};
      if (filters?.page) params.page = filters.page;
      if (filters?.limit) params.limit = filters.limit;
      if (filters?.action && filters.action !== "all") params.action = filters.action;
      if (filters?.entityType && filters.entityType !== "all") params.entityType = filters.entityType;
      if (filters?.actor && filters.actor !== "all") params.actor = filters.actor;
      if (filters?.search?.trim()) params.search = filters.search.trim();
      if (filters?.sortOrder) params.sortOrder = filters.sortOrder;

      const res = await apiClient.getWithMeta<AuditLogEntry[]>("/audit-logs", { params });
      return {
        data: res.data || [],
        meta: res.meta,
      };
    },
  });
}
