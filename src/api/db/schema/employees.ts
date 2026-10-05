import { sqliteTable, text, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { departments, designations, branches } from "./masters";
import { users } from "./users";

export const employees = sqliteTable(
  "employees",
  {
    // Primary Key
    id: text("id").primaryKey(),

    // Link to User account for EMPLOYEE role self-access
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),

    // Identity
    employeeCode: text("employee_code").notNull().unique(),
    employeeId: text("employee_id").notNull().unique(),
    fullName: text("full_name").notNull(),
    profilePhotoUrl: text("profile_photo_url"),
    gender: text("gender"),
    dateOfBirth: text("date_of_birth"),
    nationality: text("nationality"),

    // Contact
    mobile: text("mobile"),
    email: text("email"),
    addressLine: text("address_line"),
    city: text("city"),
    state: text("state"),
    country: text("country"),

    // Employment
    joiningDate: text("joining_date").notNull(),
    departmentId: text("department_id").references(() => departments.id, { onDelete: "set null" }),
    designationId: text("designation_id").references(() => designations.id, { onDelete: "set null" }),
    branchId: text("branch_id").references(() => branches.id, { onDelete: "set null" }),
    employmentStatus: text("employment_status").notNull().default("active"),

    // System
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empCodeIdx: uniqueIndex("emp_code_idx").on(table.employeeCode),
    empIdIdx: uniqueIndex("emp_id_idx").on(table.employeeId),
    fullNameIdx: index("emp_full_name_idx").on(table.fullName),
    deptIdx: index("emp_dept_idx").on(table.departmentId),
    desigIdx: index("emp_desig_idx").on(table.designationId),
    branchIdx: index("emp_branch_idx").on(table.branchId),
    statusIdx: index("emp_status_idx").on(table.employmentStatus),
    nationalityIdx: index("emp_nationality_idx").on(table.nationality),
    userIdIdx: index("emp_user_id_idx").on(table.userId),
  })
);

export type EmployeeEntity = typeof employees.$inferSelect;
export type NewEmployeeEntity = typeof employees.$inferInsert;
