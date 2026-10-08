import { integer, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";
import { users } from "./users";

export const leaveTypes = sqliteTable(
  "leave_types",
  {
    id: text("id").primaryKey(),
    code: text("code").notNull(),
    name: text("name").notNull(),
    paid: integer("paid", { mode: "boolean" }).notNull().default(true),
    annualEntitlement: integer("annual_entitlement").notNull().default(0),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    codeIdx: uniqueIndex("leave_type_code_idx").on(table.code),
    statusIdx: index("leave_type_status_idx").on(table.status),
  })
);

export const leaveBalances = sqliteTable(
  "leave_balances",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: text("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "restrict" }),
    year: integer("year").notNull(),
    opening: integer("opening").notNull().default(0),
    accrued: integer("accrued").notNull().default(0),
    used: integer("used").notNull().default(0),
    adjusted: integer("adjusted").notNull().default(0),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    employeeTypeYearIdx: uniqueIndex("leave_balance_employee_type_year_idx").on(table.employeeId, table.leaveTypeId, table.year),
    yearIdx: index("leave_balance_year_idx").on(table.year),
  })
);

export const leaveRequests = sqliteTable(
  "leave_requests",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: text("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "restrict" }),
    startDate: text("start_date").notNull(),
    endDate: text("end_date").notNull(),
    requestedDays: integer("requested_days").notNull(),
    reason: text("reason"),
    status: text("status").notNull().default("pending"),
    submittedBy: text("submitted_by").references(() => users.id, { onDelete: "set null" }),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: text("reviewed_at"),
    reviewNote: text("review_note"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    employeeDateIdx: index("leave_request_employee_date_idx").on(table.employeeId, table.startDate, table.endDate),
    statusIdx: index("leave_request_status_idx").on(table.status),
  })
);

export const leaveTransactions = sqliteTable(
  "leave_transactions",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    leaveTypeId: text("leave_type_id").notNull().references(() => leaveTypes.id, { onDelete: "restrict" }),
    balanceId: text("balance_id").notNull().references(() => leaveBalances.id, { onDelete: "cascade" }),
    year: integer("year").notNull(),
    kind: text("kind").notNull(),
    days: integer("days").notNull(),
    referenceId: text("reference_id"),
    note: text("note"),
    createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    balanceIdx: index("leave_transaction_balance_idx").on(table.balanceId),
    employeeYearIdx: index("leave_transaction_employee_year_idx").on(table.employeeId, table.year),
  })
);

export type LeaveTypeEntity = typeof leaveTypes.$inferSelect;
export type NewLeaveTypeEntity = typeof leaveTypes.$inferInsert;
export type LeaveBalanceEntity = typeof leaveBalances.$inferSelect;
export type NewLeaveBalanceEntity = typeof leaveBalances.$inferInsert;
export type LeaveRequestEntity = typeof leaveRequests.$inferSelect;
export type NewLeaveRequestEntity = typeof leaveRequests.$inferInsert;
export type LeaveTransactionEntity = typeof leaveTransactions.$inferSelect;
export type NewLeaveTransactionEntity = typeof leaveTransactions.$inferInsert;
