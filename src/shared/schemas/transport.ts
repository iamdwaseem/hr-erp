import { z } from "zod";

const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
const phoneRegex = /^[+]?[0-9\s\-()]{5,25}$/;

export const createRouteSchema = z.object({
  name: z.string().trim().min(1, "Route name is required").max(100),
  code: z
    .string()
    .trim()
    .min(1, "Route code is required")
    .max(50)
    .transform((val) => val.toUpperCase()),
  description: z.string().trim().max(500).optional().nullable(),
  pickupPoints: z.string().trim().max(1000).optional().nullable(),
  destinationBranchId: z.string().trim().optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateRouteSchema = createRouteSchema.partial();

export const createVehicleSchema = z.object({
  registrationNumber: z
    .string()
    .trim()
    .min(1, "Registration number is required")
    .max(50)
    .transform((val) => val.toUpperCase()),
  vehicleType: z.string().trim().min(1, "Vehicle type is required").max(50),
  capacity: z.coerce
    .number()
    .int("Capacity must be an integer")
    .positive("Capacity must be a positive integer"),
  driverName: z.string().trim().max(100).optional().nullable(),
  driverPhone: z
    .string()
    .trim()
    .regex(phoneRegex, "Invalid phone number format")
    .optional()
    .nullable()
    .or(z.literal("")),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const updateVehicleSchema = createVehicleSchema.partial();

export const createAssignmentSchema = z
  .object({
    employeeId: z.string().trim().min(1, "Employee is required"),
    routeId: z.string().trim().min(1, "Route is required"),
    vehicleId: z.string().trim().optional().nullable(),
    pickupPoint: z.string().trim().max(200).optional().nullable(),
    effectiveFrom: z
      .string()
      .trim()
      .regex(dateRegex, "Effective from date must be in YYYY-MM-DD format"),
    effectiveTo: z
      .string()
      .trim()
      .regex(dateRegex, "Effective to date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    status: z.enum(["active", "ended", "cancelled"]).default("active"),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.effectiveTo && data.effectiveTo.trim() !== "") {
        return data.effectiveTo >= data.effectiveFrom;
      }
      return true;
    },
    {
      message: "Effective to date cannot be before effective from date",
      path: ["effectiveTo"],
    }
  );

export const updateAssignmentSchema = z
  .object({
    routeId: z.string().trim().min(1, "Route is required").optional(),
    vehicleId: z.string().trim().optional().nullable(),
    pickupPoint: z.string().trim().max(200).optional().nullable(),
    effectiveFrom: z
      .string()
      .trim()
      .regex(dateRegex, "Effective from date must be in YYYY-MM-DD format")
      .optional(),
    effectiveTo: z
      .string()
      .trim()
      .regex(dateRegex, "Effective to date must be in YYYY-MM-DD format")
      .optional()
      .nullable()
      .or(z.literal("")),
    status: z.enum(["active", "ended", "cancelled"]).optional(),
    notes: z.string().trim().max(500).optional().nullable(),
  })
  .refine(
    (data) => {
      if (data.effectiveFrom && data.effectiveTo && data.effectiveTo.trim() !== "") {
        return data.effectiveTo >= data.effectiveFrom;
      }
      return true;
    },
    {
      message: "Effective to date cannot be before effective from date",
      path: ["effectiveTo"],
    }
  );

export const endAssignmentSchema = z.object({
  effectiveTo: z
    .string()
    .trim()
    .regex(dateRegex, "End date must be in YYYY-MM-DD format")
    .optional(),
  notes: z.string().trim().max(500).optional().nullable(),
});

export type CreateRouteInput = z.input<typeof createRouteSchema>;
export type UpdateRouteInput = z.input<typeof updateRouteSchema>;
export type CreateVehicleInput = z.input<typeof createVehicleSchema>;
export type UpdateVehicleInput = z.input<typeof updateVehicleSchema>;
export type CreateAssignmentInput = z.input<typeof createAssignmentSchema>;
export type UpdateAssignmentInput = z.input<typeof updateAssignmentSchema>;
export type EndAssignmentInput = z.input<typeof endAssignmentSchema>;
