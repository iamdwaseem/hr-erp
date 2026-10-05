import { Hono } from "hono";
import { eq, or, and, like, sql, desc, ne } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { employees } from "../db/schema/employees";
import { departments, designations, branches } from "../db/schema/masters";
import { auditLogs } from "../db/schema/audit";
import {
  employeeQuerySchema,
  createEmployeeSchema,
  updateEmployeeSchema,
} from "../../shared/schemas/employee";
import type { Employee, EmployeeListItem } from "../../shared/types/employee";
import { jsonSuccess, jsonError } from "../utils/response";

import { employeeDocumentsRoutes } from "./employee-documents";

export const employeesRoutes = new Hono<AppContext>();

// All employee routes require authentication
employeesRoutes.use("*", requireAuth());

// Mount Passport, Visa, and Work Permit subroutes
employeesRoutes.route("/", employeeDocumentsRoutes);

/**
 * GET /api/employees
 * List employees with search, filters, and pagination.
 * RBAC: ADMIN, HR, MANAGER only. EMPLOYEE is forbidden.
 */
employeesRoutes.get("/", async (c) => {
  const user = c.get("user")!;

  // Strict backend RBAC: Employees cannot browse employee master list
  if (user.role === ROLES.EMPLOYEE) {
    return jsonError(
      c,
      "FORBIDDEN",
      "Employees are only authorized to view their own profile",
      403
    );
  }

  const queryResult = employeeQuerySchema.safeParse(c.req.query());
  if (!queryResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid query parameters",
      400,
      queryResult.error.flatten()
    );
  }

  const {
    page,
    limit,
    search,
    departmentId,
    designationId,
    branchId,
    nationality,
    employmentStatus,
  } = queryResult.data;

  const db = getDb(c.env.DB);
  const conditions = [];

  // Multi-field search
  if (search && search.trim() !== "") {
    const term = `%${search.trim().toLowerCase()}%`;
    conditions.push(
      or(
        like(sql`lower(${employees.fullName})`, term),
        like(sql`lower(${employees.employeeCode})`, term),
        like(sql`lower(${employees.employeeId})`, term)
      )
    );
  }

  // Filters
  if (departmentId && departmentId.trim() !== "") {
    conditions.push(eq(employees.departmentId, departmentId));
  }
  if (designationId && designationId.trim() !== "") {
    conditions.push(eq(employees.designationId, designationId));
  }
  if (branchId && branchId.trim() !== "") {
    conditions.push(eq(employees.branchId, branchId));
  }
  if (nationality && nationality.trim() !== "") {
    conditions.push(
      like(sql`lower(${employees.nationality})`, `%${nationality.trim().toLowerCase()}%`)
    );
  }
  if (employmentStatus && employmentStatus.trim() !== "") {
    conditions.push(eq(employees.employmentStatus, employmentStatus));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const offset = (page - 1) * limit;

  try {
    // Total count query
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employees)
      .where(whereClause);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit) || 1;

    // Data query with joins
    const rows = await db
      .select({
        id: employees.id,
        employeeCode: employees.employeeCode,
        employeeId: employees.employeeId,
        fullName: employees.fullName,
        profilePhotoUrl: employees.profilePhotoUrl,
        nationality: employees.nationality,
        departmentId: employees.departmentId,
        departmentName: departments.name,
        designationId: employees.designationId,
        designationName: designations.name,
        branchId: employees.branchId,
        branchName: branches.name,
        joiningDate: employees.joiningDate,
        employmentStatus: employees.employmentStatus,
        createdAt: employees.createdAt,
      })
      .from(employees)
      .leftJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(designations, eq(employees.designationId, designations.id))
      .leftJoin(branches, eq(employees.branchId, branches.id))
      .where(whereClause)
      .orderBy(desc(employees.createdAt))
      .limit(limit)
      .offset(offset);

    const items: EmployeeListItem[] = rows.map((r) => ({
      ...r,
      employmentStatus: r.employmentStatus as EmployeeListItem["employmentStatus"],
    }));

    return jsonSuccess(c, items, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to retrieve employees",
      500
    );
  }
});

/**
 * GET /api/employees/:id
 * Retrieve single employee details.
 * Supports /api/employees/me for current user.
 * RBAC:
 * - ADMIN, HR, MANAGER can view any profile.
 * - EMPLOYEE can only view their own linked profile.
 */
employeesRoutes.get("/:id", async (c) => {
  const user = c.get("user")!;
  const paramId = c.req.param("id");
  const db = getDb(c.env.DB);

  try {
    let employeeRecord;

    if (paramId === "me") {
      // Find employee linked by userId or email
      const rows = await db
        .select()
        .from(employees)
        .where(
          or(
            eq(employees.userId, user.sub),
            like(sql`lower(${employees.email})`, user.email.toLowerCase())
          )
        )
        .limit(1);

      if (!rows.length) {
        return jsonError(
          c,
          "NOT_FOUND",
          "No employee profile found linked to your user account",
          404
        );
      }
      employeeRecord = rows[0];
    } else {
      const rows = await db
        .select()
        .from(employees)
        .where(eq(employees.id, paramId))
        .limit(1);

      if (!rows.length) {
        return jsonError(c, "NOT_FOUND", "Employee not found", 404);
      }
      employeeRecord = rows[0];

      // Strict backend RBAC: If EMPLOYEE role, must match own profile
      if (user.role === ROLES.EMPLOYEE) {
        const isOwnProfile =
          employeeRecord.userId === user.sub ||
          (employeeRecord.email &&
            employeeRecord.email.toLowerCase() === user.email.toLowerCase());

        if (!isOwnProfile) {
          return jsonError(
            c,
            "FORBIDDEN",
            "Access denied: You are only authorized to view your own employee profile",
            403
          );
        }
      }
    }

    // Load master details
    const [dept, desig, branch] = await Promise.all([
      employeeRecord.departmentId
        ? db
            .select()
            .from(departments)
            .where(eq(departments.id, employeeRecord.departmentId))
            .limit(1)
            .then((r) => r[0] || null)
        : null,
      employeeRecord.designationId
        ? db
            .select()
            .from(designations)
            .where(eq(designations.id, employeeRecord.designationId))
            .limit(1)
            .then((r) => r[0] || null)
        : null,
      employeeRecord.branchId
        ? db
            .select()
            .from(branches)
            .where(eq(branches.id, employeeRecord.branchId))
            .limit(1)
            .then((r) => r[0] || null)
        : null,
    ]);

    const fullEmployee: Employee = {
      ...employeeRecord,
      employmentStatus: employeeRecord.employmentStatus as Employee["employmentStatus"],
      department: dept,
      designation: desig,
      branch: branch,
    };

    return jsonSuccess(c, fullEmployee);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to retrieve employee",
      500
    );
  }
});

/**
 * POST /api/employees
 * Create a new employee.
 * RBAC: ADMIN and HR only. MANAGER and EMPLOYEE are forbidden.
 */
employeesRoutes.post("/", requireRole(ROLES.ADMIN, ROLES.HR), async (c) => {
  const user = c.get("user")!;
  const body = await c.req.json().catch(() => null);
  const parseResult = createEmployeeSchema.safeParse(body);

  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid employee data",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    // Check uniqueness of employeeCode
    const existingCode = await db
      .select({ id: employees.id })
      .from(employees)
      .where(like(sql`lower(${employees.employeeCode})`, data.employeeCode.toLowerCase()))
      .limit(1);

    if (existingCode.length > 0) {
      return jsonError(
        c,
        "CONFLICT",
        `Employee Code "${data.employeeCode}" is already in use`,
        409
      );
    }

    // Check uniqueness of employeeId
    const existingId = await db
      .select({ id: employees.id })
      .from(employees)
      .where(like(sql`lower(${employees.employeeId})`, data.employeeId.toLowerCase()))
      .limit(1);

    if (existingId.length > 0) {
      return jsonError(
        c,
        "CONFLICT",
        `Employee ID "${data.employeeId}" is already in use`,
        409
      );
    }

    const newId = `emp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    const now = new Date().toISOString();

    await db.insert(employees).values({
      id: newId,
      userId: data.userId || null,
      employeeCode: data.employeeCode,
      employeeId: data.employeeId,
      fullName: data.fullName,
      profilePhotoUrl: data.profilePhotoUrl || null,
      gender: data.gender || null,
      dateOfBirth: data.dateOfBirth || null,
      nationality: data.nationality || null,
      mobile: data.mobile || null,
      email: data.email || null,
      addressLine: data.addressLine || null,
      city: data.city || null,
      state: data.state || null,
      country: data.country || null,
      joiningDate: data.joiningDate,
      departmentId: data.departmentId || null,
      designationId: data.designationId || null,
      branchId: data.branchId || null,
      employmentStatus: data.employmentStatus,
      createdAt: now,
      updatedAt: now,
    });

    // Write audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.sub,
        action: "EMPLOYEE_CREATE",
        resourceType: "employee",
        resourceId: newId,
        details: JSON.stringify({
          employeeCode: data.employeeCode,
          employeeId: data.employeeId,
          fullName: data.fullName,
          departmentId: data.departmentId,
        }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const created = await db
      .select()
      .from(employees)
      .where(eq(employees.id, newId))
      .limit(1);

    return jsonSuccess(c, created[0], undefined, 201);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to create employee",
      500
    );
  }
});

/**
 * PUT /api/employees/:id
 * Update an existing employee.
 * RBAC: ADMIN and HR only. MANAGER and EMPLOYEE are forbidden.
 */
employeesRoutes.put("/:id", requireRole(ROLES.ADMIN, ROLES.HR), async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);

  const parseResult = updateEmployeeSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid update data",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    const existing = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    if (!existing.length) {
      return jsonError(c, "NOT_FOUND", "Employee not found", 404);
    }

    // Check unique employeeCode if changed
    if (data.employeeCode && data.employeeCode !== existing[0].employeeCode) {
      const codeCheck = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            like(sql`lower(${employees.employeeCode})`, data.employeeCode.toLowerCase()),
            ne(employees.id, id)
          )
        )
        .limit(1);

      if (codeCheck.length > 0) {
        return jsonError(
          c,
          "CONFLICT",
          `Employee Code "${data.employeeCode}" is already in use by another record`,
          409
        );
      }
    }

    // Check unique employeeId if changed
    if (data.employeeId && data.employeeId !== existing[0].employeeId) {
      const idCheck = await db
        .select({ id: employees.id })
        .from(employees)
        .where(
          and(
            like(sql`lower(${employees.employeeId})`, data.employeeId.toLowerCase()),
            ne(employees.id, id)
          )
        )
        .limit(1);

      if (idCheck.length > 0) {
        return jsonError(
          c,
          "CONFLICT",
          `Employee ID "${data.employeeId}" is already in use by another record`,
          409
        );
      }
    }

    const now = new Date().toISOString();

    await db
      .update(employees)
      .set({
        ...(data.employeeCode !== undefined && { employeeCode: data.employeeCode }),
        ...(data.employeeId !== undefined && { employeeId: data.employeeId }),
        ...(data.fullName !== undefined && { fullName: data.fullName }),
        ...(data.profilePhotoUrl !== undefined && { profilePhotoUrl: data.profilePhotoUrl || null }),
        ...(data.gender !== undefined && { gender: data.gender || null }),
        ...(data.dateOfBirth !== undefined && { dateOfBirth: data.dateOfBirth || null }),
        ...(data.nationality !== undefined && { nationality: data.nationality || null }),
        ...(data.mobile !== undefined && { mobile: data.mobile || null }),
        ...(data.email !== undefined && { email: data.email || null }),
        ...(data.addressLine !== undefined && { addressLine: data.addressLine || null }),
        ...(data.city !== undefined && { city: data.city || null }),
        ...(data.state !== undefined && { state: data.state || null }),
        ...(data.country !== undefined && { country: data.country || null }),
        ...(data.joiningDate !== undefined && { joiningDate: data.joiningDate }),
        ...(data.departmentId !== undefined && { departmentId: data.departmentId || null }),
        ...(data.designationId !== undefined && { designationId: data.designationId || null }),
        ...(data.branchId !== undefined && { branchId: data.branchId || null }),
        ...(data.employmentStatus !== undefined && { employmentStatus: data.employmentStatus }),
        updatedAt: now,
      })
      .where(eq(employees.id, id));

    // Audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.sub,
        action: "EMPLOYEE_UPDATE",
        resourceType: "employee",
        resourceId: id,
        details: JSON.stringify(data),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const updated = await db
      .select()
      .from(employees)
      .where(eq(employees.id, id))
      .limit(1);

    return jsonSuccess(c, updated[0]);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to update employee",
      500
    );
  }
});
