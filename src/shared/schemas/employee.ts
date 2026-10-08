import { z } from "zod";
import { passportSchema } from "./document";

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

export const optionalPhoneSchema = z
  .string()
  .trim()
  .regex(/^[+0-9\s\-()]{7,25}$/, "Invalid phone/mobile number")
  .optional()
  .or(z.literal(""))
  .nullable();

export const optionalEmailSchema = z
  .string()
  .trim()
  .email("Invalid email address")
  .optional()
  .or(z.literal(""))
  .nullable();

export const optionalDateStringSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .nullable()
  .refine(
    (val) => {
      if (!val) return true;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(val)) return false;
      const d = new Date(val);
      return !isNaN(d.getTime());
    },
    { message: "Date must be a valid date in YYYY-MM-DD format" }
  );

export const createEmployeeSchema = z.object({
  // Identification
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
  dateOfBirth: optionalDateStringSchema,
  nationality: z.string().trim().optional().nullable(),

  // Local / Work-Country Contact
  localEmail: optionalEmailSchema,
  localMobile: optionalPhoneSchema,
  localAddressLine1: z.string().trim().optional().nullable(),
  localAddressLine2: z.string().trim().optional().nullable(),
  localCity: z.string().trim().optional().nullable(),
  localState: z.string().trim().optional().nullable(),
  localPostalCode: z.string().trim().max(20, "Postal Code too long").optional().nullable(),
  localCountry: z.string().trim().optional().nullable(),

  // Home-Country Contact
  homeEmail: optionalEmailSchema,
  homeMobile: optionalPhoneSchema,
  homeAlternatePhone: optionalPhoneSchema,
  homeAddressLine1: z.string().trim().optional().nullable(),
  homeAddressLine2: z.string().trim().optional().nullable(),
  homeCity: z.string().trim().optional().nullable(),
  homeState: z.string().trim().optional().nullable(),
  homePostalCode: z.string().trim().max(20, "Postal Code too long").optional().nullable(),
  homeCountry: z.string().trim().optional().nullable(),

  // Emergency Contact
  emergencyContactName: z.string().trim().optional().nullable(),
  emergencyContactRelationship: z.string().trim().optional().nullable(),
  emergencyContactMobile: optionalPhoneSchema,
  emergencyContactAlternatePhone: optionalPhoneSchema,
  emergencyContactEmail: optionalEmailSchema,
  emergencyContactAddress: z.string().trim().optional().nullable(),

  // Legacy Contact (accepted for backwards compatibility)
  mobile: optionalPhoneSchema,
  email: optionalEmailSchema,
  addressLine: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  state: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),

  // Employment
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
  recordCreatedAt: optionalDateStringSchema,
  passport: z.preprocess(
    (value) => {
      if (!value || typeof value !== "object") return value;
      const fields = value as Record<string, unknown>;
      return Object.values(fields).every((field) => !field) ? undefined : value;
    },
    passportSchema.optional().nullable()
  ),
});

export type CreateEmployeeInput = z.infer<typeof createEmployeeSchema>;

export const updateEmployeeSchema = createEmployeeSchema.partial();

export type UpdateEmployeeInput = z.infer<typeof updateEmployeeSchema>;
