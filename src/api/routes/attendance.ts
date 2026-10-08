import { Hono } from "hono";
import { and, desc, eq, gte, lte, or } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware } from "../middleware/rbac";
import { PERMISSIONS } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { attendanceImports, attendanceRecords } from "../db/schema/attendance";
import { leaveTypes } from "../db/schema/leave";
import { employees } from "../db/schema/employees";
import { jsonError, jsonSuccess } from "../utils/response";
import { attendanceImportSchema, updateAttendanceRecordSchema } from "../../shared/schemas/attendance";

export const attendanceRoutes = new Hono<AppContext>();
attendanceRoutes.use("*", requireAuth());

async function resolveEmployee(db: any, identifier: string) {
  const rows = await db.select().from(employees).where(or(eq(employees.employeeCode, identifier), eq(employees.employeeId, identifier))).limit(2);
  return rows.length === 1 ? rows[0] : null;
}

attendanceRoutes.get("/imports", requirePermissionMiddleware(PERMISSIONS.ATTENDANCE_READ), async (c) => {
  const db = getDb(c.env.DB);
  return jsonSuccess(c, await db.select().from(attendanceImports).orderBy(desc(attendanceImports.createdAt)).limit(100));
});

attendanceRoutes.post("/imports", requirePermissionMiddleware(PERMISSIONS.ATTENDANCE_IMPORT), async (c) => {
  try {
    const parsed = attendanceImportSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid attendance import", 400, parsed.error.flatten());
    const db = getDb(c.env.DB);
    const user = c.get("user");
    const data = parsed.data;
    const importId = `attimp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();
    const rejected: Array<{ row: number; reason: string }> = [];
    const accepted: Array<{ employee: typeof employees.$inferSelect; row: typeof data.rows[number]; leaveType: typeof leaveTypes.$inferSelect | null }> = [];
    const seen = new Set<string>();

    for (const row of data.rows) {
      const employee = await resolveEmployee(db, row.employeeIdentifier);
      if (!employee) { rejected.push({ row: row.sourceRowNumber, reason: `Employee not found or identifier is ambiguous: ${row.employeeIdentifier}` }); continue; }
      const key = `${employee.id}:${row.attendanceDate}`;
      if (seen.has(key)) { rejected.push({ row: row.sourceRowNumber, reason: "Duplicate employee/date in import" }); continue; }
      seen.add(key);
      const existing = await db.select({ id: attendanceRecords.id }).from(attendanceRecords).where(and(eq(attendanceRecords.employeeId, employee.id), eq(attendanceRecords.attendanceDate, row.attendanceDate))).limit(1);
      if (existing.length) { rejected.push({ row: row.sourceRowNumber, reason: "Attendance record already exists for employee/date" }); continue; }
      let leaveType: typeof leaveTypes.$inferSelect | null = null;
      if (row.leaveTypeCode) {
        leaveType = (await db.select().from(leaveTypes).where(and(eq(leaveTypes.code, row.leaveTypeCode), eq(leaveTypes.status, "active"))).limit(1))[0] || null;
        if (!leaveType) { rejected.push({ row: row.sourceRowNumber, reason: `Unknown leave type: ${row.leaveTypeCode}` }); continue; }
      }
      accepted.push({ employee, row, leaveType });
    }

    await db.insert(attendanceImports).values({ id: importId, fileName: data.fileName, mode: data.mode, periodStart: data.periodStart, periodEnd: data.periodEnd, mapping: JSON.stringify(data.mapping), rowCount: data.rows.length, acceptedCount: accepted.length, rejectedCount: rejected.length, status: "completed", importedBy: user?.sub || null, createdAt: now });
    for (const item of accepted) {
      await db.insert(attendanceRecords).values({ id: `att_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, employeeId: item.employee.id, attendanceDate: item.row.attendanceDate, status: item.row.status, leaveTypeId: item.leaveType?.id || null, sourceImportId: importId, sourceRowNumber: item.row.sourceRowNumber, sourceIdentifier: item.row.sourceIdentifier, remarks: item.row.remarks || null, createdAt: now, updatedAt: now });
    }
    return jsonSuccess(c, { importId, acceptedCount: accepted.length, rejectedCount: rejected.length, rejected }, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to import attendance", 500);
  }
});

attendanceRoutes.get("/records", requirePermissionMiddleware(PERMISSIONS.ATTENDANCE_READ), async (c) => {
  const db = getDb(c.env.DB);
  const employeeId = c.req.query("employeeId");
  const startDate = c.req.query("startDate");
  const endDate = c.req.query("endDate");
  const conditions = [];
  if (employeeId) conditions.push(eq(attendanceRecords.employeeId, employeeId));
  if (startDate) conditions.push(gte(attendanceRecords.attendanceDate, startDate));
  if (endDate) conditions.push(lte(attendanceRecords.attendanceDate, endDate));
  const rows = await db.select({ record: attendanceRecords, employee: { id: employees.id, employeeCode: employees.employeeCode, fullName: employees.fullName } }).from(attendanceRecords).leftJoin(employees, eq(attendanceRecords.employeeId, employees.id)).where(conditions.length ? and(...conditions) : undefined).orderBy(desc(attendanceRecords.attendanceDate)).limit(1000);
  return jsonSuccess(c, rows.map((row) => ({ ...row.record, employee: row.employee })));
});

attendanceRoutes.put("/records/:id", requirePermissionMiddleware(PERMISSIONS.ATTENDANCE_MANAGE), async (c) => {
  const parsed = updateAttendanceRecordSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid attendance record", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: attendanceRecords.id }).from(attendanceRecords).where(eq(attendanceRecords.id, id)).limit(1);
  if (!existing.length) return jsonError(c, "NOT_FOUND", "Attendance record not found", 404);
  await db.update(attendanceRecords).set({ status: parsed.data.status, remarks: parsed.data.remarks || null, updatedAt: new Date().toISOString() }).where(eq(attendanceRecords.id, id));
  return jsonSuccess(c, { id, ...parsed.data });
});
