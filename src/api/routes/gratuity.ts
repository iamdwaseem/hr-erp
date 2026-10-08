import { Hono } from "hono";
import { desc, eq, and } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware } from "../middleware/rbac";
import { PERMISSIONS } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { gratuityRecords, employeeSalaries } from "../db/schema/payroll";
import { employees } from "../db/schema/employees";
import { departments, designations } from "../db/schema/masters";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  calculateGratuityRequestSchema,
  saveGratuityRecordSchema,
} from "../../shared/schemas/payroll";
import {
  toMinorUnits,
  calculateUAEGratuity,
} from "../../shared/utils/payroll-calculations";

export const gratuityRoutes = new Hono<AppContext>();

gratuityRoutes.use("*", requireAuth());

// Helper for audit logging
async function logGratuityAudit(
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
    console.error("logGratuityAudit error", e);
  }
}

/**
 * POST /api/gratuity/calculate
 * Calculate/preview gratuity for an employee
 */
gratuityRoutes.post("/calculate", requirePermissionMiddleware(PERMISSIONS.GRATUITY_READ), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = calculateGratuityRequestSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    const empRows = await db
      .select()
      .from(employees)
      .where(eq(employees.id, data.employeeId))
      .limit(1);

    if (empRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Employee not found", 404);
    }

    const emp = empRows[0];
    let basicSalaryFils = 0;

    if (data.basicSalaryOverride !== undefined && data.basicSalaryOverride !== null) {
      basicSalaryFils = toMinorUnits(data.basicSalaryOverride);
    } else {
      // Find latest active salary
      const salaryRows = await db
        .select()
        .from(employeeSalaries)
        .where(
          and(
            eq(employeeSalaries.employeeId, data.employeeId),
            eq(employeeSalaries.status, "active")
          )
        )
        .orderBy(desc(employeeSalaries.effectiveFrom))
        .limit(1);

      if (salaryRows.length > 0) {
        basicSalaryFils = salaryRows[0].basicSalary;
      }
    }

    if (basicSalaryFils <= 0) {
      return jsonError(
        c,
        "NO_BASIC_SALARY",
        "Employee has no active basic salary. Please provide a basic salary override or assign a salary record.",
        400
      );
    }

    const calculation = calculateUAEGratuity({
      basicSalaryFils,
      joiningDate: emp.joiningDate,
      lastWorkingDate: data.lastWorkingDate,
      policyVersion: data.policyVersion || "uae_standard_v1",
    });

    await logGratuityAudit(c, "gratuity:calculated", "gratuity", emp.id, {
      employeeName: emp.fullName,
      serviceYears: calculation.serviceYearsDisplay,
      gratuityAmountFils: calculation.gratuityAmountFils,
    });

    return jsonSuccess(c, {
      employeeId: emp.id,
      employeeName: emp.fullName,
      employeeCode: emp.employeeCode,
      ...calculation,
    });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to calculate gratuity", 500);
  }
});

/**
 * POST /api/gratuity/records
 * Save/finalize gratuity calculation record
 */
gratuityRoutes.post("/records", requirePermissionMiddleware(PERMISSIONS.GRATUITY_MANAGE), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = saveGratuityRecordSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    const empRows = await db
      .select()
      .from(employees)
      .where(eq(employees.id, data.employeeId))
      .limit(1);

    if (empRows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Employee not found", 404);
    }

    const emp = empRows[0];
    if (data.lastWorkingDate < emp.joiningDate) {
      return jsonError(c, "INVALID_DATE_RANGE", "Last working date cannot be before joining date", 400);
    }
    const calculation = calculateUAEGratuity({
      basicSalaryFils: toMinorUnits(data.basicSalaryAtCalculation),
      joiningDate: emp.joiningDate,
      lastWorkingDate: data.lastWorkingDate,
      policyVersion: data.policyVersion || "uae_standard_v1",
    });

    if (
      data.serviceYears !== calculation.serviceYearsBasisPoints ||
      data.eligibleDays !== calculation.eligibleDays ||
      toMinorUnits(data.gratuityAmount) !== calculation.gratuityAmountFils
    ) {
      return jsonError(c, "CALCULATION_MISMATCH", "Saved gratuity values do not match the server calculation", 400);
    }
    const id = `grt_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    const newRecord = {
      id,
      employeeId: data.employeeId,
      payrollRecordId: null,
      joiningDate: emp.joiningDate,
      lastWorkingDate: data.lastWorkingDate,
      serviceYears: data.serviceYears,
      basicSalaryAtCalculation: toMinorUnits(data.basicSalaryAtCalculation),
      eligibleDays: data.eligibleDays,
      gratuityAmount: toMinorUnits(data.gratuityAmount),
      currency: data.currency || "AED",
      status: data.status || "calculated",
      calculationDate: now.split("T")[0],
      policyVersion: data.policyVersion || "uae_standard_v1",
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(gratuityRecords).values(newRecord);
    await logGratuityAudit(c, "gratuity:record_created", "gratuity_record", id, {
      employeeId: data.employeeId,
      employeeName: emp.fullName,
      gratuityAmount: newRecord.gratuityAmount,
    });

    return jsonSuccess(c, newRecord, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to save gratuity record", 500);
  }
});

/**
 * GET /api/gratuity/records
 * List all saved gratuity records
 */
gratuityRoutes.get("/records", requirePermissionMiddleware(PERMISSIONS.GRATUITY_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: gratuityRecords.id,
        employeeId: gratuityRecords.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        departmentName: departments.name,
        designationName: designations.name,
        joiningDate: gratuityRecords.joiningDate,
        lastWorkingDate: gratuityRecords.lastWorkingDate,
        serviceYears: gratuityRecords.serviceYears,
        basicSalaryAtCalculation: gratuityRecords.basicSalaryAtCalculation,
        eligibleDays: gratuityRecords.eligibleDays,
        gratuityAmount: gratuityRecords.gratuityAmount,
        currency: gratuityRecords.currency,
        status: gratuityRecords.status,
        calculationDate: gratuityRecords.calculationDate,
        policyVersion: gratuityRecords.policyVersion,
        notes: gratuityRecords.notes,
        createdAt: gratuityRecords.createdAt,
        updatedAt: gratuityRecords.updatedAt,
      })
      .from(gratuityRecords)
      .innerJoin(employees, eq(gratuityRecords.employeeId, employees.id))
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .orderBy(desc(gratuityRecords.calculationDate));

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch gratuity records", 500);
  }
});

/**
 * GET /api/gratuity/employees/:employeeId
 * List gratuity records for a single employee
 */
gratuityRoutes.get("/employees/:employeeId", requirePermissionMiddleware(PERMISSIONS.GRATUITY_READ), async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: gratuityRecords.id,
        employeeId: gratuityRecords.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        joiningDate: gratuityRecords.joiningDate,
        lastWorkingDate: gratuityRecords.lastWorkingDate,
        serviceYears: gratuityRecords.serviceYears,
        basicSalaryAtCalculation: gratuityRecords.basicSalaryAtCalculation,
        eligibleDays: gratuityRecords.eligibleDays,
        gratuityAmount: gratuityRecords.gratuityAmount,
        currency: gratuityRecords.currency,
        status: gratuityRecords.status,
        calculationDate: gratuityRecords.calculationDate,
        policyVersion: gratuityRecords.policyVersion,
        notes: gratuityRecords.notes,
        createdAt: gratuityRecords.createdAt,
        updatedAt: gratuityRecords.updatedAt,
      })
      .from(gratuityRecords)
      .innerJoin(employees, eq(gratuityRecords.employeeId, employees.id))
      .where(eq(gratuityRecords.employeeId, employeeId))
      .orderBy(desc(gratuityRecords.calculationDate));

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch employee gratuity records", 500);
  }
});
