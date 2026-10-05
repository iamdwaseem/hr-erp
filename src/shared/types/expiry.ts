import type { DocumentStatus } from "./document";

export interface ExpirySummary {
  workforce: {
    totalEmployees: number;
    activeEmployees: number;
    inactiveEmployees: number;
  };
  compliance: {
    expired: number;
    expiring7Days: number;
    expiring30Days: number;
    expiring90Days: number;
    valid: number;
    total: number;
  };
  byType: {
    passport: { expired: number; expiringSoon: number };
    visa: { expired: number; expiringSoon: number };
    workPermit: { expired: number; expiringSoon: number };
    uploadedDocuments: { expired: number; expiringSoon: number };
  };
}

export interface ExpiringDocumentItem {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  documentType: string;
  documentId: string;
  documentNumber: string | null;
  expiryDate: string;
  daysRemaining: number;
  status: DocumentStatus;
  department: string | null;
  branch: string | null;
  nationality: string | null;
}

export interface ExpiryQueryFilters {
  status?: string;
  documentType?: string;
  departmentId?: string;
  branchId?: string;
  nationality?: string;
  search?: string;
  page?: number;
  limit?: number;
}
