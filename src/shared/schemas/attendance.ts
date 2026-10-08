import { z } from "zod";

const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD");

export const attendanceStatusSchema = z.enum(["present", "leave", "absent", "holiday", "off"]);

export const attendanceImportRowSchema = z.object({
  employeeIdentifier: z.string().trim().min(1),
  attendanceDate: date,
  status: attendanceStatusSchema.default("leave"),
  leaveTypeCode: z.string().trim().max(50).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
  sourceRowNumber: z.number().int().positive(),
  sourceIdentifier: z.string().trim().min(1),
});

export const attendanceImportSchema = z.object({
  fileName: z.string().trim().min(1).max(255),
  mode: z.enum(["leave_only", "full_attendance"]).default("leave_only"),
  periodStart: date,
  periodEnd: date,
  mapping: z.record(z.string(), z.string()).default({}),
  rows: z.array(attendanceImportRowSchema).min(1).max(10000),
}).superRefine((data, ctx) => {
  if (data.periodEnd < data.periodStart) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["periodEnd"], message: "Period end must be on or after period start" });
  }
  data.rows.forEach((row, index) => {
    if (row.attendanceDate < data.periodStart || row.attendanceDate > data.periodEnd) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rows", index, "attendanceDate"], message: "Attendance date is outside the import period" });
    }
    if (data.mode === "leave_only" && row.status !== "leave") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["rows", index, "status"], message: "Leave-only imports may contain only leave rows" });
    }
  });
});

export const updateAttendanceRecordSchema = z.object({
  status: attendanceStatusSchema,
  leaveTypeCode: z.string().trim().max(50).optional().nullable(),
  remarks: z.string().max(500).optional().nullable(),
});
