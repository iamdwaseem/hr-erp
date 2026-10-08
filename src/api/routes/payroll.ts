import { Hono } from "hono";
import { asc, desc, eq, and, or, sql } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware } from "../middleware/rbac";
import { PERMISSIONS } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import {
  payrollPeriods,
  payrollRecords,
  payrollAdjustments,
  employeeSalaries,
} from "../db/schema/payroll";
import { employees } from "../db/schema/employees";
import { attendanceRecords } from "../db/schema/attendance";
import { leaveTypes } from "../db/schema/leave";
import { departments, designations } from "../db/schema/masters";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  createPayrollPeriodSchema,
  createPayrollAdjustmentSchema,
} from "../../shared/schemas/payroll";
import {
  toMinorUnits,
  calculateSalaryTotals,
} from "../../shared/utils/payroll-calculations";

export const payrollRoutes = new Hono<AppContext>();

payrollRoutes.use("*", requireAuth());

function countWeekdays(startDate: string, endDate: string) {
  let count = 0;
  const current = new Date(`${startDate}T00:00:00Z`);
  const end = new Date(`${endDate}T00:00:00Z`);
  while (current <= end) {
    const day = current.getUTCDay();
    if (day !== 0 && day !== 6) count++;
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return count;
}

async function getAttendanceDays(db: any, employeeId: string, startDate: string, endDate: string) {
  const rows = await db
    .select({ status: attendanceRecords.status, paid: leaveTypes.paid })
    .from(attendanceRecords)
    .leftJoin(leaveTypes, eq(attendanceRecords.leaveTypeId, leaveTypes.id))
    .where(
      and(
        eq(attendanceRecords.employeeId, employeeId),
        sql`${attendanceRecords.attendanceDate} >= ${startDate}`,
        sql`${attendanceRecords.attendanceDate} <= ${endDate}`
      )
    );
  const paidLeaveDays = rows.filter((row: any) => row.status === "leave" && row.paid === true).length;
  const unpaidLeaveDays = rows.filter((row: any) => row.status === "leave" && row.paid === false).length;
  const absentDays = rows.filter((row: any) => row.status === "absent").length;
  return { paidLeaveDays, unpaidLeaveDays, absentDays };
}

// Helper for audit logging
async function logPayrollAudit(
  c: any,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  try {
    const user = c.get("user");
    const db = getDb(c.env.DB);
    let validUserId: string | null = null;
    if (user?.sub) {
      const u = await db
        .select({ id: users.id })
        .from(users)
        .where(eq(users.id, user.sub))
        .limit(1);
      if (u.length > 0) validUserId = user.sub;
    }
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: validUserId,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date().toISOString(),
    });
  } catch (e) {
    console.error("logPayrollAudit error", e);
  }
}

// Helper to recalculate a payroll record after adjustments
async function recalculatePayrollRecord(db: any, recordId: string) {
  const record = (
    await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, recordId))
      .limit(1)
  )[0];

  if (!record) return null;

  const adjustments = await db
    .select()
    .from(payrollAdjustments)
    .where(eq(payrollAdjustments.payrollRecordId, recordId));

  let addEarnings = 0;
  let addDeductions = 0;

  for (const adj of adjustments) {
    if (adj.type === "EARNING") {
      addEarnings += adj.amount;
    } else if (adj.type === "DEDUCTION") {
      addDeductions += adj.amount;
    }
  }

  const totals = calculateSalaryTotals({
    basicSalary: record.basicSalary,
    housingAllowance: record.housingAllowance,
    transportAllowance: record.transportAllowance,
    otherAllowance: record.otherAllowance,
    deductions: record.deductions,
    additionalEarnings: addEarnings,
    additionalDeductions: addDeductions + record.gratuityAdjustment,
  });

  const now = new Date().toISOString();
  await db
    .update(payrollRecords)
    .set({
      grossEarnings: totals.grossSalary,
      totalDeductions: totals.totalDeductions,
      netSalary: totals.netSalary,
      updatedAt: now,
    })
    .where(eq(payrollRecords.id, recordId));

  return totals;
}

// ==========================================
// 1. PAYROLL PERIODS
// ==========================================

/**
 * GET /api/payroll/periods
 * List all payroll periods with calculated financial aggregates
 */
payrollRoutes.get("/periods", requirePermissionMiddleware(PERMISSIONS.PAYROLL_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const periods = await db
      .select()
      .from(payrollPeriods)
      .orderBy(desc(payrollPeriods.periodYear), desc(payrollPeriods.periodMonth));

    // Attach summary stats for each period
    const enriched = await Promise.all(
      periods.map(async (p) => {
        const stats = await db
          .select({
            count: sql<number>`count(*)`,
            totalGross: sql<number>`coalesce(sum(${payrollRecords.grossEarnings}), 0)`,
            totalNet: sql<number>`coalesce(sum(${payrollRecords.netSalary}), 0)`,
            totalDeductions: sql<number>`coalesce(sum(${payrollRecords.totalDeductions}), 0)`,
          })
          .from(payrollRecords)
          .where(eq(payrollRecords.payrollPeriodId, p.id));

        const s = stats[0];
        return {
          ...p,
          totalEmployees: Number(s?.count || 0),
          totalGross: Number(s?.totalGross || 0),
          totalNet: Number(s?.totalNet || 0),
          totalDeductions: Number(s?.totalDeductions || 0),
        };
      })
    );

    return jsonSuccess(c, enriched);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payroll periods", 500);
  }
});

/**
 * POST /api/payroll/periods
 * Create new payroll period
 */
payrollRoutes.post("/periods", requirePermissionMiddleware(PERMISSIONS.PAYROLL_MANAGE), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createPayrollPeriodSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    // Check duplicate period
    const existing = await db
      .select()
      .from(payrollPeriods)
      .where(
        and(
          eq(payrollPeriods.periodYear, data.periodYear),
          eq(payrollPeriods.periodMonth, data.periodMonth)
        )
      )
      .limit(1);

    if (existing.length > 0) {
      return jsonError(
        c,
        "PERIOD_EXISTS",
        `Payroll period for ${data.periodYear}-${String(data.periodMonth).padStart(2, "0")} already exists`,
        409
      );
    }

    const id = `prd_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    const newPeriod = {
      id,
      periodYear: data.periodYear,
      periodMonth: data.periodMonth,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "draft",
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(payrollPeriods).values(newPeriod);
    await logPayrollAudit(c, "payroll:period_created", "payroll_period", id, {
      year: data.periodYear,
      month: data.periodMonth,
    });

    return jsonSuccess(c, newPeriod, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to create payroll period", 500);
  }
});

/**
 * GET /api/payroll/periods/:id
 */
payrollRoutes.get("/periods/:id", requirePermissionMiddleware(PERMISSIONS.PAYROLL_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    const period = rows[0];
    const stats = await db
      .select({
        count: sql<number>`count(*)`,
        totalGross: sql<number>`coalesce(sum(${payrollRecords.grossEarnings}), 0)`,
        totalNet: sql<number>`coalesce(sum(${payrollRecords.netSalary}), 0)`,
        totalDeductions: sql<number>`coalesce(sum(${payrollRecords.totalDeductions}), 0)`,
      })
      .from(payrollRecords)
      .where(eq(payrollRecords.payrollPeriodId, id));

    const s = stats[0];
    return jsonSuccess(c, {
      ...period,
      totalEmployees: Number(s?.count || 0),
      totalGross: Number(s?.totalGross || 0),
      totalNet: Number(s?.totalNet || 0),
      totalDeductions: Number(s?.totalDeductions || 0),
    });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payroll period", 500);
  }
});

/**
 * POST /api/payroll/periods/:id/generate
 * Generate authoritative payroll snapshot for all active employees
 */
payrollRoutes.post("/periods/:id/generate", requirePermissionMiddleware(PERMISSIONS.PAYROLL_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const periodRows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id))
      .limit(1);

    if (periodRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    const period = periodRows[0];
    if (period.status === "approved" || period.status === "paid") {
      return jsonError(
        c,
        "PERIOD_LOCKED",
        `Cannot regenerate payroll for period with status '${period.status}'`,
        400
      );
    }

    // Fetch all active employees
    const activeEmps = await db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        employeeCode: employees.employeeCode,
        joiningDate: employees.joiningDate,
      })
      .from(employees)
      .where(eq(employees.employmentStatus, "active"));

    const exceptions: Array<{ employeeId: string; employeeName: string; employeeCode: string; reason: string }> = [];
    let generatedCount = 0;
    const now = new Date().toISOString();

    for (const emp of activeEmps) {
      // Find latest applicable salary record: effectiveFrom <= period.endDate
      const salaryRows = await db
        .select()
        .from(employeeSalaries)
        .where(
          and(
            eq(employeeSalaries.employeeId, emp.id),
            eq(employeeSalaries.status, "active"),
            sql`${employeeSalaries.effectiveFrom} <= ${period.endDate}`,
            or(
              sql`${employeeSalaries.effectiveTo} IS NULL`,
              sql`${employeeSalaries.effectiveTo} >= ${period.startDate}`
            )
          )
        )
        .orderBy(desc(employeeSalaries.effectiveFrom))
        .limit(1);

      if (salaryRows.length === 0) {
        exceptions.push({
          employeeId: emp.id,
          employeeName: emp.fullName,
          employeeCode: emp.employeeCode,
          reason: "No valid salary record assigned on or before the payroll period",
        });
        continue;
      }

      const sal = salaryRows[0];
      const workingDays = countWeekdays(period.startDate, period.endDate);
      const attendanceDays = await getAttendanceDays(db, emp.id, period.startDate, period.endDate);
      const payableDays = Math.max(0, workingDays - attendanceDays.unpaidLeaveDays - attendanceDays.absentDays);

      // Check if a payroll record already exists for this (period, employee)
      const existingRec = await db
        .select()
        .from(payrollRecords)
        .where(
          and(
            eq(payrollRecords.payrollPeriodId, id),
            eq(payrollRecords.employeeId, emp.id)
          )
        )
        .limit(1);

      if (existingRec.length > 0) {
        // Update snapshot values
        await db
          .update(payrollRecords)
          .set({
            salaryRecordId: sal.id,
            basicSalary: sal.basicSalary,
            housingAllowance: sal.housingAllowance,
            transportAllowance: sal.transportAllowance,
            otherAllowance: sal.otherAllowance,
            grossEarnings: sal.grossSalary,
            deductions: sal.deductions,
            totalDeductions: sal.deductions,
            netSalary: sal.netSalary,
            currency: sal.currency,
            workingDays,
            payableDays,
            unpaidDays: attendanceDays.unpaidLeaveDays + attendanceDays.absentDays,
            updatedAt: now,
          })
          .where(eq(payrollRecords.id, existingRec[0].id));

        // Reapply any existing adjustments
        await recalculatePayrollRecord(db, existingRec[0].id);
      } else {
        const recId = `pyr_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        await db.insert(payrollRecords).values({
          id: recId,
          payrollPeriodId: id,
          employeeId: emp.id,
          salaryRecordId: sal.id,
          basicSalary: sal.basicSalary,
          housingAllowance: sal.housingAllowance,
          transportAllowance: sal.transportAllowance,
          otherAllowance: sal.otherAllowance,
          grossEarnings: sal.grossSalary,
          deductions: sal.deductions,
          gratuityAdjustment: 0,
          totalDeductions: sal.deductions,
          netSalary: sal.netSalary,
          workingDays,
          payableDays,
          unpaidDays: attendanceDays.unpaidLeaveDays + attendanceDays.absentDays,
          currency: sal.currency,
          status: "calculated",
          createdAt: now,
          updatedAt: now,
        });
      }

      generatedCount++;
    }

    // Update period status to 'processed' if generated
    await db
      .update(payrollPeriods)
      .set({
        status: "processed",
        processedAt: now,
        updatedAt: now,
      })
      .where(eq(payrollPeriods.id, id));

    await logPayrollAudit(c, "payroll:generated", "payroll_period", id, {
      generatedCount,
      exceptionsCount: exceptions.length,
    });

    return jsonSuccess(c, {
      message: `Payroll generated for ${generatedCount} employee(s)`,
      generatedCount,
      exceptionsCount: exceptions.length,
      exceptions,
    });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to generate payroll", 500);
  }
});

/**
 * GET /api/payroll/periods/:id/records
 * List employee payroll records for a period
 */
payrollRoutes.get("/periods/:id/records", requirePermissionMiddleware(PERMISSIONS.PAYROLL_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);
    const search = c.req.query("search");

    const rows = await db
      .select({
        id: payrollRecords.id,
        payrollPeriodId: payrollRecords.payrollPeriodId,
        employeeId: payrollRecords.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        designationName: designations.name,
        salaryRecordId: payrollRecords.salaryRecordId,
        basicSalary: payrollRecords.basicSalary,
        housingAllowance: payrollRecords.housingAllowance,
        transportAllowance: payrollRecords.transportAllowance,
        otherAllowance: payrollRecords.otherAllowance,
        grossEarnings: payrollRecords.grossEarnings,
        deductions: payrollRecords.deductions,
        gratuityAdjustment: payrollRecords.gratuityAdjustment,
        totalDeductions: payrollRecords.totalDeductions,
        netSalary: payrollRecords.netSalary,
        workingDays: payrollRecords.workingDays,
        payableDays: payrollRecords.payableDays,
        unpaidDays: payrollRecords.unpaidDays,
        currency: payrollRecords.currency,
        status: payrollRecords.status,
        createdAt: payrollRecords.createdAt,
        updatedAt: payrollRecords.updatedAt,
      })
      .from(payrollRecords)
      .innerJoin(employees, eq(payrollRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(eq(payrollRecords.payrollPeriodId, id))
      .orderBy(asc(employees.fullName));

    // Attach adjustments to records
    const recordIds = rows.map((r) => r.id);
    let allAdjustments: any[] = [];
    if (recordIds.length > 0) {
      allAdjustments = await db.select().from(payrollAdjustments);
    }

    const enriched = rows.map((r) => ({
      ...r,
      adjustments: allAdjustments.filter((a) => a.payrollRecordId === r.id),
    }));

    if (search) {
      const q = search.toLowerCase();
      const filtered = enriched.filter(
        (r) =>
          r.employeeName?.toLowerCase().includes(q) ||
          r.employeeCode?.toLowerCase().includes(q) ||
          r.departmentName?.toLowerCase().includes(q)
      );
      return jsonSuccess(c, filtered);
    }

    return jsonSuccess(c, enriched);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payroll records", 500);
  }
});

/**
 * GET /api/payroll/records/:id
 */
payrollRoutes.get("/records/:id", requirePermissionMiddleware(PERMISSIONS.PAYROLL_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: payrollRecords.id,
        payrollPeriodId: payrollRecords.payrollPeriodId,
        employeeId: payrollRecords.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        designationName: designations.name,
        salaryRecordId: payrollRecords.salaryRecordId,
        basicSalary: payrollRecords.basicSalary,
        housingAllowance: payrollRecords.housingAllowance,
        transportAllowance: payrollRecords.transportAllowance,
        otherAllowance: payrollRecords.otherAllowance,
        grossEarnings: payrollRecords.grossEarnings,
        deductions: payrollRecords.deductions,
        gratuityAdjustment: payrollRecords.gratuityAdjustment,
        totalDeductions: payrollRecords.totalDeductions,
        netSalary: payrollRecords.netSalary,
        workingDays: payrollRecords.workingDays,
        payableDays: payrollRecords.payableDays,
        unpaidDays: payrollRecords.unpaidDays,
        currency: payrollRecords.currency,
        status: payrollRecords.status,
        createdAt: payrollRecords.createdAt,
        updatedAt: payrollRecords.updatedAt,
      })
      .from(payrollRecords)
      .innerJoin(employees, eq(payrollRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(eq(payrollRecords.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll record not found", 404);
    }

    const adjustments = await db
      .select()
      .from(payrollAdjustments)
      .where(eq(payrollAdjustments.payrollRecordId, id));

    return jsonSuccess(c, {
      ...rows[0],
      adjustments,
    });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payroll record", 500);
  }
});

/**
 * POST /api/payroll/records/:id/adjustments
 * Add earning or deduction to payroll record & recalculate
 */
payrollRoutes.post("/records/:id/adjustments", requirePermissionMiddleware(PERMISSIONS.PAYROLL_MANAGE), async (c) => {
  try {
    const recordId = c.req.param("id");
    const body = await c.req.json();
    const parsed = createPayrollAdjustmentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const user = c.get("user");

    const recordRows = await db
      .select()
      .from(payrollRecords)
      .where(eq(payrollRecords.id, recordId))
      .limit(1);

    if (recordRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll record not found", 404);
    }

    const record = recordRows[0];
    const period = (
      await db
        .select()
        .from(payrollPeriods)
        .where(eq(payrollPeriods.id, record.payrollPeriodId))
        .limit(1)
    )[0];

    if (period && (period.status === "approved" || period.status === "paid")) {
      return jsonError(c, "PERIOD_LOCKED", `Cannot add adjustments to ${period.status} payroll`, 400);
    }

    const data = parsed.data;
    const adjId = `adj_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    const newAdj = {
      id: adjId,
      payrollRecordId: recordId,
      type: data.type,
      name: data.name,
      amount: toMinorUnits(data.amount),
      reason: data.reason || null,
      createdBy: user?.sub || "system",
      createdAt: now,
    };

    await db.insert(payrollAdjustments).values(newAdj);
    await recalculatePayrollRecord(db, recordId);

    await logPayrollAudit(c, "payroll:adjustment_added", "payroll_adjustment", adjId, {
      payrollRecordId: recordId,
      type: data.type,
      name: data.name,
      amount: newAdj.amount,
    });

    return jsonSuccess(c, newAdj, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to add adjustment", 500);
  }
});

/**
 * DELETE /api/payroll/adjustments/:id
 */
payrollRoutes.delete("/adjustments/:id", requirePermissionMiddleware(PERMISSIONS.PAYROLL_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const adjRows = await db
      .select()
      .from(payrollAdjustments)
      .where(eq(payrollAdjustments.id, id))
      .limit(1);

    if (adjRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Adjustment not found", 404);
    }

    const adj = adjRows[0];
    const record = (
      await db
        .select()
        .from(payrollRecords)
        .where(eq(payrollRecords.id, adj.payrollRecordId))
        .limit(1)
    )[0];

    if (record) {
      const period = (
        await db
          .select()
          .from(payrollPeriods)
          .where(eq(payrollPeriods.id, record.payrollPeriodId))
          .limit(1)
      )[0];

      if (period && (period.status === "approved" || period.status === "paid")) {
        return jsonError(c, "PERIOD_LOCKED", `Cannot delete adjustments from ${period.status} payroll`, 400);
      }
    }

    await db.delete(payrollAdjustments).where(eq(payrollAdjustments.id, id));
    if (record) {
      await recalculatePayrollRecord(db, record.id);
    }

    await logPayrollAudit(c, "payroll:adjustment_removed", "payroll_adjustment", id);
    return jsonSuccess(c, { message: "Adjustment deleted successfully", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to delete adjustment", 500);
  }
});

/**
 * POST /api/payroll/periods/:id/process
 */
payrollRoutes.post("/periods/:id/process", requirePermissionMiddleware(PERMISSIONS.PAYROLL_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const periodRows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id))
      .limit(1);

    if (periodRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    const period = periodRows[0];
    if (period.status === "approved" || period.status === "paid") {
      return jsonError(c, "INVALID_TRANSITION", `Cannot process payroll after approval; current status is '${period.status}'`, 400);
    }

    const recordCount = await db
      .select({ count: sql<number>`count(*)` })
      .from(payrollRecords)
      .where(eq(payrollRecords.payrollPeriodId, id));
    if (Number(recordCount[0]?.count ?? 0) === 0) {
      return jsonError(c, "NO_PAYROLL_RECORDS", "Generate payroll records before processing this period", 400);
    }

    const now = new Date().toISOString();
    await db
      .update(payrollPeriods)
      .set({ status: "processed", processedAt: now, updatedAt: now })
      .where(eq(payrollPeriods.id, id));

    await logPayrollAudit(c, "payroll:processed", "payroll_period", id);
    return jsonSuccess(c, { message: "Payroll period marked as processed", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to process payroll period", 500);
  }
});

/**
 * POST /api/payroll/periods/:id/approve
 */
payrollRoutes.post("/periods/:id/approve", requirePermissionMiddleware(PERMISSIONS.PAYROLL_APPROVE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const periodRows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id))
      .limit(1);

    if (periodRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    const period = periodRows[0];
    if (period.status !== "processed") {
      return jsonError(c, "INVALID_TRANSITION", `Only processed payroll can be approved; current status is '${period.status}'`, 400);
    }

    const now = new Date().toISOString();
    await db
      .update(payrollPeriods)
      .set({ status: "approved", approvedAt: now, updatedAt: now })
      .where(eq(payrollPeriods.id, id));

    await db
      .update(payrollRecords)
      .set({ status: "approved", updatedAt: now })
      .where(eq(payrollRecords.payrollPeriodId, id));

    await logPayrollAudit(c, "payroll:approved", "payroll_period", id);
    return jsonSuccess(c, { message: "Payroll period approved successfully", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to approve payroll period", 500);
  }
});

/**
 * POST /api/payroll/periods/:id/mark-paid
 */
payrollRoutes.post("/periods/:id/mark-paid", requirePermissionMiddleware(PERMISSIONS.PAYROLL_APPROVE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const periodRows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, id))
      .limit(1);

    if (periodRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    if (periodRows[0].status !== "approved") {
      return jsonError(c, "INVALID_TRANSITION", `Only approved payroll can be marked as paid; current status is '${periodRows[0].status}'`, 400);
    }

    const now = new Date().toISOString();
    await db
      .update(payrollPeriods)
      .set({ status: "paid", paidAt: now, updatedAt: now })
      .where(eq(payrollPeriods.id, id));

    await db
      .update(payrollRecords)
      .set({ status: "paid", updatedAt: now })
      .where(eq(payrollRecords.payrollPeriodId, id));

    await logPayrollAudit(c, "payroll:marked_paid", "payroll_period", id);
    return jsonSuccess(c, { message: "Payroll period marked as paid and finalized", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to mark payroll as paid", 500);
  }
});
