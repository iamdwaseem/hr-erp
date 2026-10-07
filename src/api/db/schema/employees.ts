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

    // Local / Work-Country Contact
    localEmail: text("local_email"),
    localMobile: text("local_mobile"),
    localAddressLine1: text("local_address_line_1"),
    localAddressLine2: text("local_address_line_2"),
    localCity: text("local_city"),
    localState: text("local_state"),
    localPostalCode: text("local_postal_code"),
    localCountry: text("local_country"),

    // Home-Country Contact
    homeEmail: text("home_email"),
    homeMobile: text("home_mobile"),
    homeAlternatePhone: text("home_alternate_phone"),
    homeAddressLine1: text("home_address_line_1"),
    homeAddressLine2: text("home_address_line_2"),
    homeCity: text("home_city"),
    homeState: text("home_state"),
    homePostalCode: text("home_postal_code"),
    homeCountry: text("home_country"),

    // Emergency Contact
    emergencyContactName: text("emergency_contact_name"),
    emergencyContactRelationship: text("emergency_contact_relationship"),
    emergencyContactMobile: text("emergency_contact_mobile"),
    emergencyContactAlternatePhone: text("emergency_contact_alternate_phone"),
    emergencyContactEmail: text("emergency_contact_email"),
    emergencyContactAddress: text("emergency_contact_address"),

    // Legacy Contact (retained for backwards compatibility)
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
    localEmailIdx: index("emp_local_email_idx").on(table.localEmail),
  })
);

export type EmployeeEntity = typeof employees.$inferSelect;
export type NewEmployeeEntity = typeof employees.$inferInsert;
