export type SalaryStructureStatus = "active" | "inactive";
export type EmployeeSalaryStatus = "active" | "closed";
export type PayrollPeriodStatus =
  | "draft"
  | "processing"
  | "processed"
  | "approved"
  | "paid"
  | "cancelled";
export type PayrollRecordStatus = "calculated" | "pending" | "approved" | "paid";
export type PayrollAdjustmentType = "EARNING" | "DEDUCTION";
export type GratuityRecordStatus = "calculated" | "finalized" | "paid";
export type PayslipStatus = "generated" | "sent" | "paid";

export interface SalaryStructure {
  id: string;
  name: string;
  code: string;
  description: string | null;
  basicSalary: number; // in fils
  housingAllowance: number; // in fils
  transportAllowance: number; // in fils
  otherAllowance: number; // in fils
  otherDeductions: number; // in fils
  currency: string;
  status: SalaryStructureStatus;
  createdAt: string;
  updatedAt: string;
}

export interface EmployeeSalary {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  salaryStructureId: string | null;
  salaryStructureName?: string;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossSalary: number;
  deductions: number;
  netSalary: number;
  currency: string;
  effectiveFrom: string;
  effectiveTo: string | null;
  status: EmployeeSalaryStatus;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayrollPeriod {
  id: string;
  periodYear: number;
  periodMonth: number;
  startDate: string;
  endDate: string;
  status: PayrollPeriodStatus;
  processedAt: string | null;
  approvedAt: string | null;
  paidAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
  // Computed stats
  totalEmployees?: number;
  totalGross?: number;
  totalNet?: number;
  totalDeductions?: number;
}

export interface PayrollAdjustment {
  id: string;
  payrollRecordId: string;
  type: PayrollAdjustmentType;
  name: string;
  amount: number; // in fils
  reason: string | null;
  createdBy: string | null;
  createdAt: string;
}

export interface PayrollRecord {
  id: string;
  payrollPeriodId: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  salaryRecordId: string | null;
  basicSalary: number;
  housingAllowance: number;
  transportAllowance: number;
  otherAllowance: number;
  grossEarnings: number;
  deductions: number;
  gratuityAdjustment: number;
  totalDeductions: number;
  netSalary: number;
  workingDays: number;
  payableDays: number;
  unpaidDays: number;
  currency: string;
  status: PayrollRecordStatus;
  createdAt: string;
  updatedAt: string;
  adjustments?: PayrollAdjustment[];
}

export interface GratuityRecord {
  id: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  payrollRecordId: string | null;
  joiningDate: string;
  lastWorkingDate: string;
  serviceYears: number; // basis points
  basicSalaryAtCalculation: number;
  eligibleDays: number;
  gratuityAmount: number;
  currency: string;
  status: GratuityRecordStatus;
  calculationDate: string;
  policyVersion: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Payslip {
  id: string;
  payrollRecordId: string;
  payslipNumber: string;
  employeeId: string;
  employeeName?: string;
  employeeCode?: string;
  departmentName?: string;
  designationName?: string;
  payrollPeriodId: string;
  periodYear?: number;
  periodMonth?: number;
  generatedAt: string;
  status: PayslipStatus;
  createdAt: string;
  updatedAt: string;
  // Detailed embedded snapshot data for viewing/printing
  recordDetails?: PayrollRecord;
}
