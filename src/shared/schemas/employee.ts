import { z } from "zod";

export const EMPLOYMENT_STATUSES = [
  "active",
  "probation",
  "terminated",
  "resigned",
  "on_leave",
] as const;

export const employeeQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(10),
  search: z.string().optional(),
  departmentId: z.string().optional(),
  designationId: z.string().optional(),
  branchId: z.string().optional(),
  nationality: z.string().optional(),
  employmentStatus: z.string().optional(),
});

export type EmployeeQueryInput = z.infer<typeof employeeQuerySchema>;

export const createEmployeeSchema = z.object({
  employeeCode: z
    .string()
    .trim()
    .min(1, "Employee Code is required")
    .max(50, "Employee Code too long"),
  employeeId: z
    .string()
    .trim()
    .min(1, "Employee ID is required")
    .max(50, "Employee ID too long"),
  fullName: z
    .string()
    .trim()
    .min(2, "Full Name must be at least 2 characters")
    .max(100, "Full Name too long"),
  profilePhotoUrl: z
    .string()
    .url("Must be a valid URL")
    .optional()
    .or(z.literal(""))
    .nullable(),
  gender: z.string().optional().nullable(),
  dateOfBirth: z.string().optional().nullable(),
  nationality: z.string().optional().nullable(),

  mobile: z
    .string()
    .trim()
    .regex(/^[+0-9\s\-()]{7,20}$/, "Invalid phone/mobile number")
    .optional()
    .or(z.literal(""))
    .nullable(),
  email: z
    .string()
    .trim()
    .email("Invalid email address")
    .optional()
    .or(z.literal(""))
    .nullable(),
  addressLine: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),

  joiningDate: z
    .string()
    .min(1, "Joining Date is required")
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Joining Date must be in YYYY-MM-DD format"),
  departmentId: z.string().optional().nullable(),
  designationId: z.string().optional().nullable(),
  branchId: z.string().optional().nullable(),
  employmentStatus: z.enum(EMPLOYMENT_STATUSES, {
    errorMap: () => ({ message: "Please select a valid employment status" }),
  }).default("active"),
  userId: z.string().optional().nullable(),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
