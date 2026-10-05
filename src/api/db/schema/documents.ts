import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { employees } from "./employees";

export const employeePassports = sqliteTable(
  "employee_passports",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    passportNumber: text("passport_number").notNull(),
    nationality: text("nationality").notNull(),
    issueDate: text("issue_date").notNull(),
    expiryDate: text("expiry_date").notNull(),
    placeOfIssue: text("place_of_issue"),
    status: text("status").notNull().default("VALID"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdIdx: index("passport_emp_id_idx").on(table.employeeId),
    passportNumIdx: index("passport_num_idx").on(table.passportNumber),
    expiryIdx: index("passport_expiry_idx").on(table.expiryDate),
  })
);

export const employeeVisas = sqliteTable(
  "employee_visas",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    visaNumber: text("visa_number").notNull(),
    visaType: text("visa_type").notNull(),
    issuingState: text("issuing_state"),
    profession: text("profession"),
    issueDate: text("issue_date").notNull(),
    expiryDate: text("expiry_date").notNull(),
    sponsorName: text("sponsor_name"),
    status: text("status").notNull().default("VALID"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdIdx: index("visa_emp_id_idx").on(table.employeeId),
    visaNumIdx: index("visa_num_idx").on(table.visaNumber),
    expiryIdx: index("visa_expiry_idx").on(table.expiryDate),
  })
);

export const employeeWorkPermits = sqliteTable(
  "employee_work_permits",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "cascade" }),
    permitNumber: text("permit_number").notNull(),
    profession: text("profession"),
    issueDate: text("issue_date").notNull(),
    expiryDate: text("expiry_date").notNull(),
    status: text("status").notNull().default("VALID"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdIdx: index("work_permit_emp_id_idx").on(table.employeeId),
    permitNumIdx: index("work_permit_num_idx").on(table.permitNumber),
    expiryIdx: index("work_permit_expiry_idx").on(table.expiryDate),
  })
);

export type EmployeePassportEntity = typeof employeePassports.$inferSelect;
export type NewEmployeePassportEntity = typeof employeePassports.$inferInsert;

export type EmployeeVisaEntity = typeof employeeVisas.$inferSelect;
export type NewEmployeeVisaEntity = typeof employeeVisas.$inferInsert;

export type EmployeeWorkPermitEntity = typeof employeeWorkPermits.$inferSelect;
export type NewEmployeeWorkPermitEntity = typeof employeeWorkPermits.$inferInsert;
