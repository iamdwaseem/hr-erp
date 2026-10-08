import { z } from "zod";

// ==========================================
// SALARY STRUCTURE SCHEMAS
// ==========================================
export const createSalaryStructureSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  code: z
    .string()
    .min(1, "Code is required")
    .max(50)
    .regex(/^[A-Za-z0-9_-]+$/, "Code must contain only letters, numbers, hyphens and underscores"),
  description: z.string().max(500).optional().nullable(),
  basicSalary: z.number().min(0, "Basic salary must be non-negative"),
  housingAllowance: z.number().min(0, "Housing allowance must be non-negative").default(0),
  transportAllowance: z.number().min(0, "Transport allowance must be non-negative").default(0),
  otherAllowance: z.number().min(0, "Other allowance must be non-negative").default(0),
  otherDeductions: z.number().min(0, "Other deductions must be non-negative").default(0),
  currency: z.string().default("AED"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateSalaryStructureSchema = z.object({
  name: z.string().min(1, "Name is required").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  basicSalary: z.number().min(0, "Basic salary must be non-negative").optional(),
  housingAllowance: z.number().min(0, "Housing allowance must be non-negative").optional(),
  transportAllowance: z.number().min(0, "Transport allowance must be non-negative").optional(),
  otherAllowance: z.number().min(0, "Other allowance must be non-negative").optional(),
  otherDeductions: z.number().min(0, "Other deductions must be non-negative").optional(),
  currency: z.string().optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

// ==========================================
// EMPLOYEE SALARY ASSIGNMENT SCHEMAS
// ==========================================
export const assignEmployeeSalarySchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  salaryStructureId: z.string().optional().nullable(),
  basicSalary: z.number().min(0, "Basic salary must be non-negative"),
  housingAllowance: z.number().min(0, "Housing allowance must be non-negative").default(0),
  transportAllowance: z.number().min(0, "Transport allowance must be non-negative").default(0),
  otherAllowance: z.number().min(0, "Other allowance must be non-negative").default(0),
  deductions: z.number().min(0, "Deductions must be non-negative").default(0),
  currency: z.string().default("AED"),
  effectiveFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective From must be YYYY-MM-DD"),
  effectiveTo: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Effective To must be YYYY-MM-DD")
    .optional()
    .nullable(),
  notes: z.string().max(500).optional().nullable(),
});

// ==========================================
// PAYROLL PERIOD SCHEMAS
// ==========================================
export const createPayrollPeriodSchema = z
  .object({
    periodYear: z.number().int().min(2000).max(2100),
    periodMonth: z.number().int().min(1).max(12),
    startDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "Start Date must be YYYY-MM-DD"),
    endDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "End Date must be YYYY-MM-DD"),
    notes: z.string().max(500).optional().nullable(),
  })
  .superRefine((data, ctx) => {
    const start = new Date(`${data.startDate}T00:00:00Z`);
    const end = new Date(`${data.endDate}T00:00:00Z`);
    const expectedPrefix = `${data.periodYear}-${String(data.periodMonth).padStart(2, "0")}`;

    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || data.endDate < data.startDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be on or after start date" });
    }
    if (!data.startDate.startsWith(expectedPrefix) || !data.endDate.startsWith(expectedPrefix)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["startDate"], message: "Period dates must belong to the selected payroll month" });
    }
  });

// ==========================================
// PAYROLL ADJUSTMENT SCHEMAS
// ==========================================
export const createPayrollAdjustmentSchema = z.object({
  type: z.enum(["EARNING", "DEDUCTION"]),
  name: z.string().min(1, "Name is required").max(100),
  amount: z.number().positive("Amount must be greater than zero"),
  reason: z.string().max(500).optional().nullable(),
});

// ==========================================
// GRATUITY CALCULATION SCHEMAS
// ==========================================
export const calculateGratuityRequestSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  lastWorkingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Last working date must be YYYY-MM-DD"),
  basicSalaryOverride: z.number().min(0).optional().nullable(),
  policyVersion: z.string().default("uae_standard_v1"),
  notes: z.string().max(500).optional().nullable(),
});

export const saveGratuityRecordSchema = z.object({
  employeeId: z.string().min(1, "Employee ID is required"),
  lastWorkingDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Last working date must be YYYY-MM-DD"),
  basicSalaryAtCalculation: z.number().min(0),
  serviceYears: z.number().int().min(0),
  eligibleDays: z.number().min(0),
  gratuityAmount: z.number().min(0),
  currency: z.string().default("AED"),
  status: z.enum(["calculated", "finalized", "paid"]).default("calculated"),
  policyVersion: z.string().default("uae_standard_v1"),
  notes: z.string().max(500).optional().nullable(),
});

// ==========================================
// PAYSLIP SCHEMAS
// ==========================================
export const generatePayslipsSchema = z.object({
  payrollPeriodId: z.string().min(1, "Payroll period ID is required"),
  employeeIds: z.array(z.string()).optional(), // Optional: generate for specific subset or all
});
