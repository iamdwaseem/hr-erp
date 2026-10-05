import type { UserRole } from "../constants/roles";

export interface AuditActor {
  id: string;
  fullName: string;
  email: string;
  role?: UserRole | string;
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  actor: AuditActor;
  action: string;
  entityType: string;
  entityId: string | null;
  oldValue: Record<string, unknown> | string | null;
  newValue: Record<string, unknown> | string | null;
  details: Record<string, unknown> | string | null;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface AuditLogQueryFilters {
  page?: number;
  limit?: number;
  action?: string;
  entityType?: string;
  actor?: string;
  search?: string;
  sortOrder?: "asc" | "desc";
}

export interface AuditLogPaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}
