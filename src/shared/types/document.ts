export const DOCUMENT_STATUSES = {
  VALID: "VALID",
  EXPIRING_90_DAYS: "EXPIRING_90_DAYS",
  EXPIRING_30_DAYS: "EXPIRING_30_DAYS",
  EXPIRING_7_DAYS: "EXPIRING_7_DAYS",
  EXPIRED: "EXPIRED",
} as const;

export type DocumentStatus =
  (typeof DOCUMENT_STATUSES)[keyof typeof DOCUMENT_STATUSES];

export interface StatusBadgeConfig {
  label: string;
  variant: "success" | "warning" | "destructive" | "secondary";
}

export const DOCUMENT_STATUS_CONFIG: Record<DocumentStatus, StatusBadgeConfig> = {
  [DOCUMENT_STATUSES.VALID]: {
    label: "Valid",
    variant: "success",
  },
  [DOCUMENT_STATUSES.EXPIRING_90_DAYS]: {
    label: "Expiring (90 Days)",
    variant: "warning",
  },
  [DOCUMENT_STATUSES.EXPIRING_30_DAYS]: {
    label: "Expiring (30 Days)",
    variant: "warning",
  },
  [DOCUMENT_STATUSES.EXPIRING_7_DAYS]: {
    label: "Expiring (7 Days)",
    variant: "destructive",
  },
  [DOCUMENT_STATUSES.EXPIRED]: {
    label: "Expired",
    variant: "destructive",
  },
};

export function calculateDocumentStatus(
  expiryDateStr: string | null | undefined,
  referenceDate: Date = new Date()
): DocumentStatus {
  if (!expiryDateStr) return DOCUMENT_STATUSES.EXPIRED;

  const expiry = new Date(expiryDateStr);
  if (isNaN(expiry.getTime())) return DOCUMENT_STATUSES.EXPIRED;

  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  expiry.setHours(0, 0, 0, 0);

  const diffMs = expiry.getTime() - ref.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return DOCUMENT_STATUSES.EXPIRED;
  }
  if (diffDays <= 7) {
    return DOCUMENT_STATUSES.EXPIRING_7_DAYS;
  }
  if (diffDays <= 30) {
    return DOCUMENT_STATUSES.EXPIRING_30_DAYS;
  }
  if (diffDays <= 90) {
    return DOCUMENT_STATUSES.EXPIRING_90_DAYS;
  }
  return DOCUMENT_STATUSES.VALID;
}

export interface EmployeePassport {
  id: string;
  employeeId: string;
  passportNumber: string;
  nationality: string;
  issueDate: string;
  expiryDate: string;
  placeOfIssue: string | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeVisa {
  id: string;
  employeeId: string;
  visaNumber: string;
  visaType: string;
  issuingState: string | null;
  profession: string | null;
  issueDate: string;
  expiryDate: string;
  sponsorName: string | null;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeWorkPermit {
  id: string;
  employeeId: string;
  permitNumber: string;
  profession: string | null;
  issueDate: string;
  expiryDate: string;
  status: DocumentStatus;
  createdAt: string;
  updatedAt: string;
}
