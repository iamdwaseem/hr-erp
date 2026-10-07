import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";

// ==========================================
// 1. SALARY STRUCTURES
// ==========================================
export const salaryStructures = sqliteTable(
  "salary_structures",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    description: text("description"),
    // Monetary values stored in minor units (fils/cents: 1 AED = 100 fils)
    basicSalary: integer("basic_salary").notNull().default(0),
    housingAllowance: integer("housing_allowance").notNull().default(0),
    transportAllowance: integer("transport_allowance").notNull().default(0),
    otherAllowance: integer("other_allowance").notNull().default(0),
    otherDeductions: integer("other_deductions").notNull().default(0),
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("active"), // 'active' | 'inactive'
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    codeIdx: uniqueIndex("salary_structure_code_idx").on(table.code),
    nameIdx: index("salary_structure_name_idx").on(table.name),
    statusIdx: index("salary_structure_status_idx").on(table.status),
  })
);

// ==========================================
// 2. EMPLOYEE SALARIES (HISTORICAL SNAPSHOTS)
// ==========================================
export const employeeSalaries = sqliteTable(
  "employee_salaries",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    salaryStructureId: text("salary_structure_id").references(
      () => salaryStructures.id,
      { onDelete: "set null" }
    ),
    // All amounts in minor units (fils)
    basicSalary: integer("basic_salary").notNull().default(0),
    housingAllowance: integer("housing_allowance").notNull().default(0),
    transportAllowance: integer("transport_allowance").notNull().default(0),
    otherAllowance: integer("other_allowance").notNull().default(0),
    grossSalary: integer("gross_salary").notNull().default(0),
    deductions: integer("deductions").notNull().default(0),
    netSalary: integer("net_salary").notNull().default(0),
    currency: text("currency").notNull().default("AED"),
    effectiveFrom: text("effective_from").notNull(), // YYYY-MM-DD
    effectiveTo: text("effective_to"), // YYYY-MM-DD nullable
    status: text("status").notNull().default("active"), // 'active' | 'closed'
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdx: index("emp_sal_employee_idx").on(table.employeeId),
    structIdx: index("emp_sal_struct_idx").on(table.salaryStructureId),
    statusIdx: index("emp_sal_status_idx").on(table.status),
    effectiveFromIdx: index("emp_sal_effective_from_idx").on(table.effectiveFrom),
  })
);

// ==========================================
// 3. PAYROLL PERIODS
// ==========================================
export const payrollPeriods = sqliteTable(
  "payroll_periods",
  {
    id: text("id").primaryKey(),
    periodYear: integer("period_year").notNull(),
    periodMonth: integer("period_month").notNull(), // 1 - 12
    startDate: text("start_date").notNull(), // YYYY-MM-DD
    endDate: text("end_date").notNull(), // YYYY-MM-DD
    status: text("status").notNull().default("draft"), // 'draft' | 'processing' | 'processed' | 'approved' | 'paid' | 'cancelled'
    processedAt: text("processed_at"),
    approvedAt: text("approved_at"),
    paidAt: text("paid_at"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    periodUniqueIdx: uniqueIndex("payroll_period_year_month_idx").on(
      table.periodYear,
      table.periodMonth
    ),
    statusIdx: index("payroll_period_status_idx").on(table.status),
  })
);

// ==========================================
// 4. PAYROLL RECORDS (PER EMPLOYEE PER PERIOD)
// ==========================================
export const payrollRecords = sqliteTable(
  "payroll_records",
  {
    id: text("id").primaryKey(),
    payrollPeriodId: text("payroll_period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    salaryRecordId: text("salary_record_id").references(
      () => employeeSalaries.id,
      { onDelete: "set null" }
    ),
    // Snapshot salary values in minor units (fils)
    basicSalary: integer("basic_salary").notNull(),
    housingAllowance: integer("housing_allowance").notNull().default(0),
    transportAllowance: integer("transport_allowance").notNull().default(0),
    otherAllowance: integer("other_allowance").notNull().default(0),
    grossEarnings: integer("gross_earnings").notNull(),
    deductions: integer("deductions").notNull().default(0),
    gratuityAdjustment: integer("gratuity_adjustment").notNull().default(0),
    totalDeductions: integer("total_deductions").notNull().default(0),
    netSalary: integer("net_salary").notNull(),
    // Attendance metadata placeholders
    workingDays: integer("working_days").notNull().default(30),
    payableDays: integer("payable_days").notNull().default(30),
    unpaidDays: integer("unpaid_days").notNull().default(0),
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("calculated"), // 'calculated' | 'pending' | 'approved' | 'paid'
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    periodEmpUniqueIdx: uniqueIndex("payroll_rec_period_emp_idx").on(
      table.payrollPeriodId,
      table.employeeId
    ),
    periodIdx: index("payroll_rec_period_idx").on(table.payrollPeriodId),
    empIdx: index("payroll_rec_emp_idx").on(table.employeeId),
    statusIdx: index("payroll_rec_status_idx").on(table.status),
  })
);

// ==========================================
// 5. PAYROLL ADJUSTMENTS (EARNINGS & DEDUCTIONS)
// ==========================================
export const payrollAdjustments = sqliteTable(
  "payroll_adjustments",
  {
    id: text("id").primaryKey(),
    payrollRecordId: text("payroll_record_id")
      .notNull()
      .references(() => payrollRecords.id, { onDelete: "cascade" }),
    type: text("type").notNull(), // 'EARNING' | 'DEDUCTION'
    name: text("name").notNull(),
    amount: integer("amount").notNull(), // positive integer in minor units (fils)
    reason: text("reason"),
    createdBy: text("created_by"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    recIdx: index("payroll_adj_rec_idx").on(table.payrollRecordId),
    typeIdx: index("payroll_adj_type_idx").on(table.type),
  })
);

// ==========================================
// 6. GRATUITY RECORDS
// ==========================================
export const gratuityRecords = sqliteTable(
  "gratuity_records",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    payrollRecordId: text("payroll_record_id").references(
      () => payrollRecords.id,
      { onDelete: "set null" }
    ),
    joiningDate: text("joining_date").notNull(),
    lastWorkingDate: text("last_working_date").notNull(),
    serviceYears: integer("service_years").notNull(), // stored as basis points: 2.50 years = 250
    basicSalaryAtCalculation: integer("basic_salary_at_calculation").notNull(),
    eligibleDays: integer("eligible_days").notNull(), // e.g. 21, 30, etc.
    gratuityAmount: integer("gratuity_amount").notNull(), // in fils
    currency: text("currency").notNull().default("AED"),
    status: text("status").notNull().default("calculated"), // 'calculated' | 'finalized' | 'paid'
    calculationDate: text("calculation_date").notNull(),
    policyVersion: text("policy_version").notNull().default("uae_standard_v1"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdx: index("gratuity_emp_idx").on(table.employeeId),
    statusIdx: index("gratuity_status_idx").on(table.status),
    calcDateIdx: index("gratuity_calc_date_idx").on(table.calculationDate),
  })
);

// ==========================================
// 7. PAYSLIPS
// ==========================================
export const payslips = sqliteTable(
  "payslips",
  {
    id: text("id").primaryKey(),
    payrollRecordId: text("payroll_record_id")
      .notNull()
      .references(() => payrollRecords.id, { onDelete: "cascade" }),
    payslipNumber: text("payslip_number").notNull().unique(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    payrollPeriodId: text("payroll_period_id")
      .notNull()
      .references(() => payrollPeriods.id, { onDelete: "cascade" }),
    generatedAt: text("generated_at").notNull(),
    status: text("status").notNull().default("generated"), // 'generated' | 'sent' | 'paid'
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    payslipNumIdx: uniqueIndex("payslip_number_idx").on(table.payslipNumber),
    recIdx: index("payslip_rec_idx").on(table.payrollRecordId),
    empIdx: index("payslip_emp_idx").on(table.employeeId),
    periodIdx: index("payslip_period_idx").on(table.payrollPeriodId),
  })
);

export type SalaryStructureEntity = typeof salaryStructures.$inferSelect;
export type NewSalaryStructureEntity = typeof salaryStructures.$inferInsert;

export type EmployeeSalaryEntity = typeof employeeSalaries.$inferSelect;
export type NewEmployeeSalaryEntity = typeof employeeSalaries.$inferInsert;

export type PayrollPeriodEntity = typeof payrollPeriods.$inferSelect;
export type NewPayrollPeriodEntity = typeof payrollPeriods.$inferInsert;

export type PayrollRecordEntity = typeof payrollRecords.$inferSelect;
export type NewPayrollRecordEntity = typeof payrollRecords.$inferInsert;

export type PayrollAdjustmentEntity = typeof payrollAdjustments.$inferSelect;
export type NewPayrollAdjustmentEntity = typeof payrollAdjustments.$inferInsert;

export type GratuityRecordEntity = typeof gratuityRecords.$inferSelect;
export type NewGratuityRecordEntity = typeof gratuityRecords.$inferInsert;

export type PayslipEntity = typeof payslips.$inferSelect;
export type NewPayslipEntity = typeof payslips.$inferInsert;
