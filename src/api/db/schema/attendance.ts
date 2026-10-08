import { integer, index, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";
import { users } from "./users";

export const attendanceImports = sqliteTable(
  "attendance_imports",
  {
    id: text("id").primaryKey(),
    fileName: text("file_name").notNull(),
    mode: text("mode").notNull().default("leave_only"),
    periodStart: text("period_start").notNull(),
    periodEnd: text("period_end").notNull(),
    mapping: text("mapping").notNull(),
    checksum: text("checksum"),
    rowCount: integer("row_count").notNull().default(0),
    acceptedCount: integer("accepted_count").notNull().default(0),
    rejectedCount: integer("rejected_count").notNull().default(0),
    status: text("status").notNull().default("completed"),
    importedBy: text("imported_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    periodIdx: index("attendance_import_period_idx").on(table.periodStart, table.periodEnd),
    createdIdx: index("attendance_import_created_idx").on(table.createdAt),
  })
);

export const attendanceRecords = sqliteTable(
  "attendance_records",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id").notNull().references(() => employees.id, { onDelete: "cascade" }),
    attendanceDate: text("attendance_date").notNull(),
    status: text("status").notNull().default("present"),
    leaveTypeId: text("leave_type_id"),
    sourceImportId: text("source_import_id").references(() => attendanceImports.id, { onDelete: "set null" }),
    sourceRowNumber: integer("source_row_number"),
    sourceIdentifier: text("source_identifier"),
    remarks: text("remarks"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    employeeDateIdx: uniqueIndex("attendance_employee_date_idx").on(table.employeeId, table.attendanceDate),
    dateIdx: index("attendance_date_idx").on(table.attendanceDate),
    statusIdx: index("attendance_status_idx").on(table.status),
    importIdx: index("attendance_import_idx").on(table.sourceImportId),
  })
);

export type AttendanceImportEntity = typeof attendanceImports.$inferSelect;
export type NewAttendanceImportEntity = typeof attendanceImports.$inferInsert;
export type AttendanceRecordEntity = typeof attendanceRecords.$inferSelect;
export type NewAttendanceRecordEntity = typeof attendanceRecords.$inferInsert;
