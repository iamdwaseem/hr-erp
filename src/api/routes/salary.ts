import { Hono } from "hono";
import { asc, desc, eq, and, sql } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware } from "../middleware/rbac";
import { PERMISSIONS, ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { salaryStructures, employeeSalaries } from "../db/schema/payroll";
import { employees } from "../db/schema/employees";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  createSalaryStructureSchema,
  updateSalaryStructureSchema,
  assignEmployeeSalarySchema,
} from "../../shared/schemas/payroll";
import {
  toMinorUnits,
  calculateSalaryTotals,
} from "../../shared/utils/payroll-calculations";

export const salaryRoutes = new Hono<AppContext>();

salaryRoutes.use("*", requireAuth());

// Helper for audit logging
async function logSalaryAudit(
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
    console.error("logSalaryAudit error", e);
  }
}

// ==========================================
// 1. SALARY STRUCTURES
// ==========================================

/**
 * GET /api/salary/structures
 * List salary structures
 */
salaryRoutes.get("/structures", requirePermissionMiddleware(PERMISSIONS.SALARY_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const status = c.req.query("status");

    let query = db.select().from(salaryStructures);
    if (status && status !== "all") {
      query = query.where(eq(salaryStructures.status, status)) as any;
    }

    const rows = await query.orderBy(asc(salaryStructures.name));
    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch salary structures", 500);
  }
});

/**
 * POST /api/salary/structures
 * Create new salary structure
 */
salaryRoutes.post("/structures", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = createSalaryStructureSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    // Check code uniqueness
    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.code, data.code))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(c, "CODE_EXISTS", `Salary structure with code '${data.code}' already exists`, 409);
    }

    const id = `str_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    const newStructure = {
      id,
      name: data.name,
      code: data.code.toUpperCase(),
      description: data.description || null,
      basicSalary: toMinorUnits(data.basicSalary),
      housingAllowance: toMinorUnits(data.housingAllowance),
      transportAllowance: toMinorUnits(data.transportAllowance),
      otherAllowance: toMinorUnits(data.otherAllowance),
      otherDeductions: toMinorUnits(data.otherDeductions),
      currency: data.currency || "AED",
      status: data.status || "active",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(salaryStructures).values(newStructure);
    await logSalaryAudit(c, "salary_structure:created", "salary_structure", id, {
      name: data.name,
      code: data.code,
    });

    return jsonSuccess(c, newStructure, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to create salary structure", 500);
  }
});

/**
 * GET /api/salary/structures/:id
 */
salaryRoutes.get("/structures/:id", requirePermissionMiddleware(PERMISSIONS.SALARY_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Salary structure not found", 404);
    }

    return jsonSuccess(c, rows[0]);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch salary structure", 500);
  }
});

/**
 * PUT /api/salary/structures/:id
 */
salaryRoutes.put("/structures/:id", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json();
    const parsed = updateSalaryStructureSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Salary structure not found", 404);
    }

    const data = parsed.data;
    const updates: Record<string, any> = {
      updatedAt: new Date().toISOString(),
    };

    if (data.name !== undefined) updates.name = data.name;
    if (data.description !== undefined) updates.description = data.description;
    if (data.basicSalary !== undefined) updates.basicSalary = toMinorUnits(data.basicSalary);
    if (data.housingAllowance !== undefined) updates.housingAllowance = toMinorUnits(data.housingAllowance);
    if (data.transportAllowance !== undefined) updates.transportAllowance = toMinorUnits(data.transportAllowance);
    if (data.otherAllowance !== undefined) updates.otherAllowance = toMinorUnits(data.otherAllowance);
    if (data.otherDeductions !== undefined) updates.otherDeductions = toMinorUnits(data.otherDeductions);
    if (data.currency !== undefined) updates.currency = data.currency;
    if (data.status !== undefined) updates.status = data.status;

    await db.update(salaryStructures).set(updates).where(eq(salaryStructures.id, id));
    await logSalaryAudit(c, "salary_structure:updated", "salary_structure", id, updates);

    const updated = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    return jsonSuccess(c, updated[0]);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to update salary structure", 500);
  }
});

/**
 * POST /api/salary/structures/:id/deactivate
 */
salaryRoutes.post("/structures/:id/deactivate", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Salary structure not found", 404);
    }

    await db
      .update(salaryStructures)
      .set({ status: "inactive", updatedAt: new Date().toISOString() })
      .where(eq(salaryStructures.id, id));

    await logSalaryAudit(c, "salary_structure:deactivated", "salary_structure", id);
    return jsonSuccess(c, { message: "Salary structure deactivated", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to deactivate salary structure", 500);
  }
});

/**
 * POST /api/salary/structures/:id/activate
 */
salaryRoutes.post("/structures/:id/activate", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Salary structure not found", 404);
    }

    await db
      .update(salaryStructures)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(salaryStructures.id, id));

    await logSalaryAudit(c, "salary_structure:activated", "salary_structure", id);
    return jsonSuccess(c, { message: "Salary structure activated", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to activate salary structure", 500);
  }
});

/**
 * DELETE /api/salary/structures/:id
 * ADMIN & HR safe delete: reject if historical employee salary assignments reference it
 */
salaryRoutes.delete("/structures/:id", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user")!;
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(salaryStructures)
      .where(eq(salaryStructures.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Salary structure not found", 404);
    }

    const usageCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeSalaries)
      .where(eq(employeeSalaries.salaryStructureId, id));

    const usageCount = Number(usageCountResult[0]?.count ?? 0);
    const isAdmin = user.role === ROLES.ADMIN;

    if (usageCount > 0 && !isAdmin) {
      return jsonError(
        c,
        "STRUCTURE_IN_USE",
        "Cannot delete salary structure referenced by historical salary records. Please deactivate it instead.",
        400
      );
    }

    // Admin cascade or nullify reference
    if (usageCount > 0 && isAdmin) {
      await db
        .update(employeeSalaries)
        .set({ salaryStructureId: null, updatedAt: new Date().toISOString() })
        .where(eq(employeeSalaries.salaryStructureId, id));
    }

    await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
    await logSalaryAudit(c, "salary_structure:deleted", "salary_structure", id, {
      name: existing[0].name,
      code: existing[0].code,
    });

    return jsonSuccess(c, { message: "Salary structure deleted successfully", id });
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to delete salary structure", 500);
  }
});

// ==========================================
// 2. EMPLOYEE SALARIES
// ==========================================

/**
 * GET /api/salary/employees
 * List all current employee salary records overview
 */
salaryRoutes.get("/employees", requirePermissionMiddleware(PERMISSIONS.SALARY_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: employeeSalaries.id,
        employeeId: employeeSalaries.employeeId,
        employeeName: employees.fullName,
        employeeCode: employees.employeeCode,
        salaryStructureId: employeeSalaries.salaryStructureId,
        salaryStructureName: salaryStructures.name,
        basicSalary: employeeSalaries.basicSalary,
        housingAllowance: employeeSalaries.housingAllowance,
        transportAllowance: employeeSalaries.transportAllowance,
        otherAllowance: employeeSalaries.otherAllowance,
        grossSalary: employeeSalaries.grossSalary,
        deductions: employeeSalaries.deductions,
        netSalary: employeeSalaries.netSalary,
        currency: employeeSalaries.currency,
        effectiveFrom: employeeSalaries.effectiveFrom,
        effectiveTo: employeeSalaries.effectiveTo,
        status: employeeSalaries.status,
        notes: employeeSalaries.notes,
        createdAt: employeeSalaries.createdAt,
        updatedAt: employeeSalaries.updatedAt,
      })
      .from(employeeSalaries)
      .innerJoin(employees, eq(employeeSalaries.employeeId, employees.id))
      .leftJoin(salaryStructures, eq(employeeSalaries.salaryStructureId, salaryStructures.id))
      .where(eq(employeeSalaries.status, "active"))
      .orderBy(asc(employees.fullName));

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch employee salaries", 500);
  }
});

/**
 * GET /api/salary/employees/:employeeId/current
 * Get current active salary record for employee
 */
salaryRoutes.get("/employees/:employeeId/current", requirePermissionMiddleware(PERMISSIONS.SALARY_READ), async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: employeeSalaries.id,
        employeeId: employeeSalaries.employeeId,
        salaryStructureId: employeeSalaries.salaryStructureId,
        salaryStructureName: salaryStructures.name,
        basicSalary: employeeSalaries.basicSalary,
        housingAllowance: employeeSalaries.housingAllowance,
        transportAllowance: employeeSalaries.transportAllowance,
        otherAllowance: employeeSalaries.otherAllowance,
        grossSalary: employeeSalaries.grossSalary,
        deductions: employeeSalaries.deductions,
        netSalary: employeeSalaries.netSalary,
        currency: employeeSalaries.currency,
        effectiveFrom: employeeSalaries.effectiveFrom,
        effectiveTo: employeeSalaries.effectiveTo,
        status: employeeSalaries.status,
        notes: employeeSalaries.notes,
        createdAt: employeeSalaries.createdAt,
        updatedAt: employeeSalaries.updatedAt,
      })
      .from(employeeSalaries)
      .leftJoin(salaryStructures, eq(employeeSalaries.salaryStructureId, salaryStructures.id))
      .where(
        and(
          eq(employeeSalaries.employeeId, employeeId),
          eq(employeeSalaries.status, "active")
        )
      )
      .orderBy(desc(employeeSalaries.effectiveFrom))
      .limit(1);

    if (rows.length === 0) {
      return jsonSuccess(c, null);
    }

    return jsonSuccess(c, rows[0]);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch active employee salary", 500);
  }
});

/**
 * GET /api/salary/employees/:employeeId/history
 * Get chronological salary history for employee
 */
salaryRoutes.get("/employees/:employeeId/history", requirePermissionMiddleware(PERMISSIONS.SALARY_READ), async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        id: employeeSalaries.id,
        employeeId: employeeSalaries.employeeId,
        salaryStructureId: employeeSalaries.salaryStructureId,
        salaryStructureName: salaryStructures.name,
        basicSalary: employeeSalaries.basicSalary,
        housingAllowance: employeeSalaries.housingAllowance,
        transportAllowance: employeeSalaries.transportAllowance,
        otherAllowance: employeeSalaries.otherAllowance,
        grossSalary: employeeSalaries.grossSalary,
        deductions: employeeSalaries.deductions,
        netSalary: employeeSalaries.netSalary,
        currency: employeeSalaries.currency,
        effectiveFrom: employeeSalaries.effectiveFrom,
        effectiveTo: employeeSalaries.effectiveTo,
        status: employeeSalaries.status,
        notes: employeeSalaries.notes,
        createdAt: employeeSalaries.createdAt,
        updatedAt: employeeSalaries.updatedAt,
      })
      .from(employeeSalaries)
      .leftJoin(salaryStructures, eq(employeeSalaries.salaryStructureId, salaryStructures.id))
      .where(eq(employeeSalaries.employeeId, employeeId))
      .orderBy(desc(employeeSalaries.effectiveFrom));

    return jsonSuccess(c, rows);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to fetch salary history", 500);
  }
});

/**
 * POST /api/salary/employees/assign
 * Assign or update employee salary.
 * Preserves historical records: closes active record and creates a new one.
 */
salaryRoutes.post("/employees/assign", requirePermissionMiddleware(PERMISSIONS.SALARY_MANAGE), async (c) => {
  try {
    const body = await c.req.json();
    const parsed = assignEmployeeSalarySchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", parsed.error.errors[0]?.message || "Invalid input", 400);
    }

    const db = getDb(c.env.DB);
    const data = parsed.data;

    // Verify employee exists
    const emp = await db
      .select()
      .from(employees)
      .where(eq(employees.id, data.employeeId))
      .limit(1);

    if (emp.length === 0) {
      return jsonError(c, "NOT_FOUND", "Employee not found", 404);
    }

    if (data.effectiveTo && data.effectiveTo < data.effectiveFrom) {
      return jsonError(c, "VALIDATION_ERROR", "Effective to date cannot be before effective from date", 400);
    }

    // Convert to minor units (fils) and calculate authoritative totals
    const basic = toMinorUnits(data.basicSalary);
    const housing = toMinorUnits(data.housingAllowance);
    const transport = toMinorUnits(data.transportAllowance);
    const other = toMinorUnits(data.otherAllowance);
    const deductions = toMinorUnits(data.deductions);

    const totals = calculateSalaryTotals({
      basicSalary: basic,
      housingAllowance: housing,
      transportAllowance: transport,
      otherAllowance: other,
      deductions: deductions,
    });

    const now = new Date().toISOString();

    // 1. Close any currently active salary records for this employee
    const activeRecords = await db
      .select()
      .from(employeeSalaries)
      .where(
        and(
          eq(employeeSalaries.employeeId, data.employeeId),
          eq(employeeSalaries.status, "active")
        )
      );

    for (const rec of activeRecords) {
      if (rec.effectiveFrom > data.effectiveFrom) {
        return jsonError(c, "SALARY_DATE_OVERLAP", "A salary record already starts after the requested effective date", 409);
      }
      if (rec.effectiveTo && rec.effectiveTo < data.effectiveFrom) {
        continue;
      }
      await db
        .update(employeeSalaries)
        .set({
          status: "closed",
          effectiveTo: rec.effectiveTo || data.effectiveFrom,
          updatedAt: now,
        })
        .where(eq(employeeSalaries.id, rec.id));
    }

    // 2. Create the new salary record
    const id = `sal_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const newSalaryRecord = {
      id,
      employeeId: data.employeeId,
      salaryStructureId: data.salaryStructureId || null,
      basicSalary: totals.basicSalary,
      housingAllowance: totals.housingAllowance,
      transportAllowance: totals.transportAllowance,
      otherAllowance: totals.otherAllowance,
      grossSalary: totals.grossSalary,
      deductions: totals.totalDeductions,
      netSalary: totals.netSalary,
      currency: data.currency || "AED",
      effectiveFrom: data.effectiveFrom,
      effectiveTo: data.effectiveTo || null,
      status: "active",
      notes: data.notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(employeeSalaries).values(newSalaryRecord);

    await logSalaryAudit(c, "employee_salary:assigned", "employee_salary", id, {
      employeeId: data.employeeId,
      employeeName: emp[0].fullName,
      basicSalary: totals.basicSalary,
      grossSalary: totals.grossSalary,
      netSalary: totals.netSalary,
      effectiveFrom: data.effectiveFrom,
    });

    return jsonSuccess(c, newSalaryRecord, 201);
  } catch (err: any) {
    return jsonError(c, "DB_ERROR", err.message || "Failed to assign employee salary", 500);
  }
});
