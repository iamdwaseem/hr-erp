export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";

export interface LeaveType {
  id: string;
  code: string;
  name: string;
  paid: boolean;
  annualEntitlement: number;
  status: "active" | "inactive";
}

export interface LeaveBalance {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  year: number;
  opening: number;
  accrued: number;
  used: number;
  adjusted: number;
  available: number;
}

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  leaveTypeId: string;
  leaveTypeName?: string;
  startDate: string;
  endDate: string;
  requestedDays: number;
  reason: string | null;
  status: LeaveRequestStatus;
  reviewedAt: string | null;
  reviewNote: string | null;
  createdAt: string;
}
