import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const leaveTypeSchema = z.object({
  code: z.string().trim().min(1).max(50).regex(/^[A-Za-z0-9_-]+$/),
  name: z.string().trim().min(1).max(100),
  paid: z.boolean().default(true),
  annualEntitlement: z.number().int().min(0).default(0),
  status: z.enum(["active", "inactive"]).default("active"),
});

export const leaveBalanceAdjustmentSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  year: z.number().int().min(2000).max(2100),
  days: z.number().int(),
  note: z.string().max(500).optional().nullable(),
});

export const leaveRequestSchema = z.object({
  employeeId: z.string().min(1),
  leaveTypeId: z.string().min(1),
  startDate: date,
  endDate: date,
  requestedDays: z.number().int().positive(),
  reason: z.string().max(1000).optional().nullable(),
}).superRefine((data, ctx) => {
  if (data.endDate < data.startDate) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["endDate"], message: "End date must be on or after start date" });
  }
});

export const leaveReviewSchema = z.object({
  note: z.string().max(500).optional().nullable(),
});
