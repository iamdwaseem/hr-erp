import { Hono } from "hono";
import { and, desc, eq, gte, lte, ne } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware } from "../middleware/rbac";
import { PERMISSIONS } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { employees } from "../db/schema/employees";
import { attendanceRecords } from "../db/schema/attendance";
import { leaveBalances, leaveRequests, leaveTransactions, leaveTypes } from "../db/schema/leave";
import { jsonError, jsonSuccess } from "../utils/response";
import { leaveBalanceAdjustmentSchema, leaveRequestSchema, leaveReviewSchema, leaveTypeSchema } from "../../shared/schemas/leave";

export const leaveRoutes = new Hono<AppContext>();
leaveRoutes.use("*", requireAuth());

function available(balance: typeof leaveBalances.$inferSelect) {
  return balance.opening + balance.accrued + balance.adjusted - balance.used;
}

function eachDate(startDate: string, endDate: string) {
  const dates: string[] = [];
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}

leaveRoutes.get("/types", requirePermissionMiddleware(PERMISSIONS.LEAVE_READ), async (c) => jsonSuccess(c, await getDb(c.env.DB).select().from(leaveTypes).orderBy(leaveTypes.name)));

leaveRoutes.post("/types", requirePermissionMiddleware(PERMISSIONS.LEAVE_MANAGE), async (c) => {
  const parsed = leaveTypeSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid leave type", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const existing = await db.select({ id: leaveTypes.id }).from(leaveTypes).where(eq(leaveTypes.code, parsed.data.code)).limit(1);
  if (existing.length) return jsonError(c, "CODE_EXISTS", "Leave type code already exists", 409);
  const now = new Date().toISOString();
  const item = { id: `lvt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, ...parsed.data, createdAt: now, updatedAt: now };
  await db.insert(leaveTypes).values(item);
  return jsonSuccess(c, item, 201);
});

leaveRoutes.put("/types/:id", requirePermissionMiddleware(PERMISSIONS.LEAVE_MANAGE), async (c) => {
  const parsed = leaveTypeSchema.partial().safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid leave type", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: leaveTypes.id }).from(leaveTypes).where(eq(leaveTypes.id, id)).limit(1);
  if (!existing.length) return jsonError(c, "NOT_FOUND", "Leave type not found", 404);
  await db.update(leaveTypes).set({ ...parsed.data, updatedAt: new Date().toISOString() }).where(eq(leaveTypes.id, id));
  return jsonSuccess(c, { id, ...parsed.data });
});

leaveRoutes.get("/balances", requirePermissionMiddleware(PERMISSIONS.LEAVE_READ), async (c) => {
  const db = getDb(c.env.DB);
  const year = Number(c.req.query("year") || new Date().getFullYear());
  const rows = await db.select({ balance: leaveBalances, employee: { id: employees.id, fullName: employees.fullName }, leaveType: { id: leaveTypes.id, name: leaveTypes.name, paid: leaveTypes.paid } }).from(leaveBalances).innerJoin(employees, eq(leaveBalances.employeeId, employees.id)).innerJoin(leaveTypes, eq(leaveBalances.leaveTypeId, leaveTypes.id)).where(eq(leaveBalances.year, year)).orderBy(employees.fullName);
  return jsonSuccess(c, rows.map((row) => ({ ...row.balance, employeeName: row.employee.fullName, leaveTypeName: row.leaveType.name, paid: row.leaveType.paid, available: available(row.balance) })));
});

leaveRoutes.post("/balances/adjust", requirePermissionMiddleware(PERMISSIONS.LEAVE_MANAGE), async (c) => {
  const parsed = leaveBalanceAdjustmentSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid leave balance adjustment", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const data = parsed.data;
  const employee = await db.select({ id: employees.id }).from(employees).where(eq(employees.id, data.employeeId)).limit(1);
  const type = await db.select({ id: leaveTypes.id }).from(leaveTypes).where(eq(leaveTypes.id, data.leaveTypeId)).limit(1);
  if (!employee.length || !type.length) return jsonError(c, "NOT_FOUND", "Employee or leave type not found", 404);
  let balance = (await db.select().from(leaveBalances).where(and(eq(leaveBalances.employeeId, data.employeeId), eq(leaveBalances.leaveTypeId, data.leaveTypeId), eq(leaveBalances.year, data.year))).limit(1))[0];
  const now = new Date().toISOString();
  if (!balance) {
    balance = { id: `lvb_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, year: data.year, opening: 0, accrued: 0, used: 0, adjusted: data.days, updatedAt: now };
    await db.insert(leaveBalances).values(balance);
  } else {
    await db.update(leaveBalances).set({ adjusted: balance.adjusted + data.days, updatedAt: now }).where(eq(leaveBalances.id, balance.id));
  }
  await db.insert(leaveTransactions).values({ id: `lvt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, employeeId: data.employeeId, leaveTypeId: data.leaveTypeId, balanceId: balance.id, year: data.year, kind: "adjustment", days: data.days, referenceId: null, note: data.note || null, createdBy: c.get("user")?.sub || null, createdAt: now });
  return jsonSuccess(c, { ...balance, adjusted: balance.adjusted + (balance.id ? 0 : data.days) });
});

leaveRoutes.get("/requests", requirePermissionMiddleware(PERMISSIONS.LEAVE_READ), async (c) => {
  const db = getDb(c.env.DB);
  const status = c.req.query("status");
  const rows = await db.select({ request: leaveRequests, employee: { id: employees.id, fullName: employees.fullName }, leaveType: { id: leaveTypes.id, name: leaveTypes.name, paid: leaveTypes.paid } }).from(leaveRequests).innerJoin(employees, eq(leaveRequests.employeeId, employees.id)).innerJoin(leaveTypes, eq(leaveRequests.leaveTypeId, leaveTypes.id)).where(status ? eq(leaveRequests.status, status) : undefined).orderBy(desc(leaveRequests.createdAt));
  return jsonSuccess(c, rows.map((row) => ({ ...row.request, employeeName: row.employee.fullName, leaveTypeName: row.leaveType.name, paid: row.leaveType.paid })));
});

leaveRoutes.post("/requests", requirePermissionMiddleware(PERMISSIONS.LEAVE_MANAGE), async (c) => {
  const parsed = leaveRequestSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid leave request", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const data = parsed.data;
  const overlap = await db.select({ id: leaveRequests.id }).from(leaveRequests).where(and(eq(leaveRequests.employeeId, data.employeeId), ne(leaveRequests.status, "rejected"), ne(leaveRequests.status, "cancelled"), lte(leaveRequests.startDate, data.endDate), gte(leaveRequests.endDate, data.startDate))).limit(1);
  if (overlap.length) return jsonError(c, "LEAVE_OVERLAP", "Employee already has an overlapping leave request", 409);
  const now = new Date().toISOString();
  const request = { id: `lvr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, ...data, reason: data.reason || null, status: "pending", submittedBy: c.get("user")?.sub || null, reviewedBy: null, reviewedAt: null, reviewNote: null, createdAt: now, updatedAt: now } as const;
  await db.insert(leaveRequests).values(request);
  return jsonSuccess(c, request, 201);
});

leaveRoutes.post("/requests/:id/approve", requirePermissionMiddleware(PERMISSIONS.LEAVE_APPROVE), async (c) => reviewRequest(c, "approved"));
leaveRoutes.post("/requests/:id/reject", requirePermissionMiddleware(PERMISSIONS.LEAVE_APPROVE), async (c) => reviewRequest(c, "rejected"));

async function reviewRequest(c: any, status: "approved" | "rejected") {
  const parsed = leaveReviewSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid leave review", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const request = (await db.select().from(leaveRequests).where(eq(leaveRequests.id, id)).limit(1))[0];
  if (!request) return jsonError(c, "NOT_FOUND", "Leave request not found", 404);
  if (request.status !== "pending") return jsonError(c, "INVALID_TRANSITION", "Only pending leave requests can be reviewed", 400);
  if (status === "approved") {
    let balance = (await db.select().from(leaveBalances).where(and(eq(leaveBalances.employeeId, request.employeeId), eq(leaveBalances.leaveTypeId, request.leaveTypeId), eq(leaveBalances.year, Number(request.startDate.slice(0, 4))))).limit(1))[0];
    if (!balance) return jsonError(c, "NO_BALANCE", "Create a leave balance before approving this request", 400);
    if (available(balance) < request.requestedDays) return jsonError(c, "INSUFFICIENT_BALANCE", "Leave balance is insufficient", 400);
    const now = new Date().toISOString();
    await db.update(leaveBalances).set({ used: balance.used + request.requestedDays, updatedAt: now }).where(eq(leaveBalances.id, balance.id));
    await db.insert(leaveTransactions).values({ id: `lvt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, employeeId: request.employeeId, leaveTypeId: request.leaveTypeId, balanceId: balance.id, year: balance.year, kind: "usage", days: request.requestedDays, referenceId: request.id, note: null, createdBy: c.get("user")?.sub || null, createdAt: now });
    for (const attendanceDate of eachDate(request.startDate, request.endDate)) {
      const existing = await db.select({ id: attendanceRecords.id }).from(attendanceRecords).where(and(eq(attendanceRecords.employeeId, request.employeeId), eq(attendanceRecords.attendanceDate, attendanceDate))).limit(1);
      if (existing.length) {
        await db.update(attendanceRecords).set({ status: "leave", leaveTypeId: request.leaveTypeId, remarks: `Approved leave request ${request.id}`, updatedAt: now }).where(eq(attendanceRecords.id, existing[0].id));
      } else {
        await db.insert(attendanceRecords).values({ id: `att_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, employeeId: request.employeeId, attendanceDate, status: "leave", leaveTypeId: request.leaveTypeId, sourceImportId: null, sourceRowNumber: null, sourceIdentifier: null, remarks: `Approved leave request ${request.id}`, createdAt: now, updatedAt: now });
      }
    }
  }
  const now = new Date().toISOString();
  await db.update(leaveRequests).set({ status, reviewedBy: c.get("user")?.sub || null, reviewedAt: now, reviewNote: parsed.data.note || null, updatedAt: now }).where(eq(leaveRequests.id, id));
  return jsonSuccess(c, { id, status });
}
