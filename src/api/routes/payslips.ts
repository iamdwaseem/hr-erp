import { Hono } from "hono";
import { desc, eq, and } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import {
  payslips,
  payrollRecords,
  payrollPeriods,
  payrollAdjustments,
} from "../db/schema/payroll";
import { employees } from "../db/schema/employees";
import { departments, designations } from "../db/schema/masters";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import { generatePayslipsSchema } from "../../shared/schemas/payroll";

export const payslipsRoutes = new Hono<AppContext>();

payslipsRoutes.use("*", requireAuth());
payslipsRoutes.use("*", requireRole(ROLES.ADMIN, ROLES.HR));

// Helper for audit logging
async function logPayslipAudit(
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
    console.error("logPayslipAudit error", e);
  }
}

/**
 * GET /api/payslips
 * List all payslips with filters
 */
payslipsRoutes.get("/", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const periodId = c.req.query("periodId");
    const employeeId = c.req.query("employeeId");
    const search = c.req.query("search");

    let query = db
      .select({
        id: payslips.id,
        payrollRecordId: payslips.payrollRecordId,
        payslipNumber: payslips.payslipNumber,
        employeeId: payslips.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        designationName: designations.name,
        payrollPeriodId: payslips.payrollPeriodId,
        periodYear: payrollPeriods.periodYear,
        periodMonth: payrollPeriods.periodMonth,
        generatedAt: payslips.generatedAt,
        status: payslips.status,
        createdAt: payslips.createdAt,
        updatedAt: payslips.updatedAt,
      })
      .from(payslips)
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(payrollPeriods, eq(payslips.payrollPeriodId, payrollPeriods.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id));

    const conditions = [];
    if (periodId) conditions.push(eq(payslips.payrollPeriodId, periodId));
    if (employeeId) conditions.push(eq(payslips.employeeId, employeeId));

    const rows = await (conditions.length > 0
      ? query.where(and(...conditions))
      : query
    ).orderBy(desc(payslips.generatedAt));

    if (search) {
      const q = search.toLowerCase();
      const filtered = rows.filter(
        (p) =>
          p.employeeName?.toLowerCase().includes(q) ||
          p.employeeCode?.toLowerCase().includes(q) ||
          p.payslipNumber?.toLowerCase().includes(q)
      );
      return jsonSuccess(c, filtered);
    }

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payslips", 500);
  }
});

/**
 * POST /api/payslips/generate
 * Bulk generate payslips for a payroll period
 */
payslipsRoutes.post("/generate", async (c) => {
  try {
    const body = await c.req.json();
    const parsed = generatePayslipsSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    // Verify payroll period exists
    const periodRows = await db
      .select()
      .from(payrollPeriods)
      .where(eq(payrollPeriods.id, data.payrollPeriodId))
      .limit(1);

    if (periodRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payroll period not found", 404);
    }

    const period = periodRows[0];

    // Fetch payroll records for this period
    const records = await db
      .select({
        id: payrollRecords.id,
        employeeId: payrollRecords.employeeId,
        employeeCode: employees.employeeCode,
      })
      .from(payrollRecords)
      .innerJoin(employees, eq(payrollRecords.employeeId, employees.id))
      .where(eq(payrollRecords.payrollPeriodId, data.payrollPeriodId));

    if (records.length === 0) {
      return jsonError(
        c,
        "NO_PAYROLL_RECORDS",
        "No payroll records found for this period. Please generate payroll first.",
        400
      );
    }

    let generatedCount = 0;
    const now = new Date().toISOString();
    const periodTag = `${period.periodYear}${String(period.periodMonth).padStart(2, "0")}`;

    for (const rec of records) {
      if (data.employeeIds && !data.employeeIds.includes(rec.employeeId)) {
        continue;
      }

      // Check if payslip already exists for this record
      const existing = await db
        .select()
        .from(payslips)
        .where(eq(payslips.payrollRecordId, rec.id))
        .limit(1);

      if (existing.length === 0) {
        const pId = `psl_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
        const payslipNumber = `PSL-${periodTag}-${rec.employeeCode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

        await db.insert(payslips).values({
          id: pId,
          payrollRecordId: rec.id,
          payslipNumber,
          employeeId: rec.employeeId,
          payrollPeriodId: data.payrollPeriodId,
          generatedAt: now,
          status: "generated",
          createdAt: now,
          updatedAt: now,
        });
        generatedCount++;
      }
    }

    await logPayslipAudit(c, "payslip:generated", "payslip", data.payrollPeriodId, {
      payrollPeriodId: data.payrollPeriodId,
      periodTag,
      generatedCount,
    });

    return jsonSuccess(c, {
      message: `Generated ${generatedCount} payslip(s)`,
      generatedCount,
    }, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to generate payslips", 500);
  }
});

/**
 * GET /api/payslips/:id
 * Retrieve detailed payslip snapshot for viewing or printing
 */
payslipsRoutes.get("/:id", async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const payslipRows = await db
      .select({
        id: payslips.id,
        payrollRecordId: payslips.payrollRecordId,
        payslipNumber: payslips.payslipNumber,
        employeeId: payslips.employeeId,
        payrollPeriodId: payslips.payrollPeriodId,
        generatedAt: payslips.generatedAt,
        status: payslips.status,
        createdAt: payslips.createdAt,
        updatedAt: payslips.updatedAt,
        // Employee details
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        joiningDate: employees.joiningDate,
        departmentName: departments.name,
        designationName: designations.name,
        // Period details
        periodYear: payrollPeriods.periodYear,
        periodMonth: payrollPeriods.periodMonth,
        startDate: payrollPeriods.startDate,
        endDate: payrollPeriods.endDate,
        periodStatus: payrollPeriods.status,
        // Payroll snapshot data
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
      })
      .from(payslips)
      .innerJoin(payrollRecords, eq(payslips.payrollRecordId, payrollRecords.id))
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(payrollPeriods, eq(payslips.payrollPeriodId, payrollPeriods.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .where(eq(payslips.id, id))
      .limit(1);

    if (payslipRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Payslip not found", 404);
    }

    const item = payslipRows[0];
    const adjustments = await db
      .select()
      .from(payrollAdjustments)
      .where(eq(payrollAdjustments.payrollRecordId, item.payrollRecordId));

    return jsonSuccess(c, {
      ...item,
      adjustments,
    });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch payslip details", 500);
  }
});

/**
 * GET /api/payslips/employee/:employeeId
 */
payslipsRoutes.get("/employee/:employeeId", async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: payslips.id,
        payrollRecordId: payslips.payrollRecordId,
        payslipNumber: payslips.payslipNumber,
        employeeId: payslips.employeeId,
        payrollPeriodId: payslips.payrollPeriodId,
        periodYear: payrollPeriods.periodYear,
        periodMonth: payrollPeriods.periodMonth,
        grossEarnings: payrollRecords.grossEarnings,
        netSalary: payrollRecords.netSalary,
        currency: payrollRecords.currency,
        generatedAt: payslips.generatedAt,
        status: payslips.status,
        createdAt: payslips.createdAt,
      })
      .from(payslips)
      .innerJoin(payrollRecords, eq(payslips.payrollRecordId, payrollRecords.id))
      .innerJoin(payrollPeriods, eq(payslips.payrollPeriodId, payrollPeriods.id))
      .where(eq(payslips.employeeId, employeeId))
      .orderBy(desc(payslips.generatedAt));

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch employee payslips", 500);
  }
});
