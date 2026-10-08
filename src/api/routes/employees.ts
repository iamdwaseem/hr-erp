import { Hono } from "hono";
import { eq, or, and, like, sql, desc, ne } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { employees } from "../db/schema/employees";
import { employeeDocuments, employeePassports } from "../db/schema/documents";
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
import { employeeDocumentVaultRoutes } from "./employee-document-vault";

export const employeesRoutes = new Hono<AppContext>();

// All employee routes require authentication
employeesRoutes.use("*", requireAuth());

// Mount Passport, Visa, and Work Permit subroutes
employeesRoutes.route("/", employeeDocumentsRoutes);

// Mount Document Vault & R2 subroutes
employeesRoutes.route("/", employeeDocumentVaultRoutes);

/**
 * GET /api/employees
 * List employees with search, filters, and pagination.
 * RBAC: ADMIN, HR, MANAGER only. EMPLOYEE is forbidden.
 */
employeesRoutes.get("/", async (c) => {
  const user = c.get("user")!;

  // Strict backend RBAC: Only ADMIN and HR can browse employee master list
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.HR) {
    return jsonError(
      c,
      "FORBIDDEN",
      "Access is restricted to Administrator and HR personnel only",
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
        localEmail: employees.localEmail,
        localMobile: employees.localMobile,
        email: employees.email,
        mobile: employees.mobile,
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
      // Find employee linked by userId or email / localEmail
      const rows = await db
        .select()
        .from(employees)
        .where(
          or(
            eq(employees.userId, user.sub),
            like(sql`lower(${employees.localEmail})`, user.email.toLowerCase()),
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

      // Strict backend RBAC: Only ADMIN and HR can view employee details
      if (user.role !== ROLES.ADMIN && user.role !== ROLES.HR) {
        return jsonError(
          c,
          "FORBIDDEN",
          "Access is restricted to Administrator and HR personnel only",
          403
        );
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
    const auditNow = new Date().toISOString();
    const recordCreatedAt = data.recordCreatedAt && user.role === ROLES.ADMIN
      ? `${data.recordCreatedAt}T00:00:00.000Z`
      : auditNow;

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
    const now = recordCreatedAt;

    const resolvedLocalEmail = data.localEmail || data.email || null;
    const resolvedLocalMobile = data.localMobile || data.mobile || null;
    const resolvedLocalAddress1 = data.localAddressLine1 || data.addressLine || null;
    const resolvedLocalCity = data.localCity || data.city || null;
    const resolvedLocalState = data.localState || data.state || null;
    const resolvedLocalCountry = data.localCountry || data.country || null;

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

      // Local / Work-Country Contact
      localEmail: resolvedLocalEmail,
      localMobile: resolvedLocalMobile,
      localAddressLine1: resolvedLocalAddress1,
      localAddressLine2: data.localAddressLine2 || null,
      localCity: resolvedLocalCity,
      localState: resolvedLocalState,
      localPostalCode: data.localPostalCode || null,
      localCountry: resolvedLocalCountry,

      // Home-Country Contact
      homeEmail: data.homeEmail || null,
      homeMobile: data.homeMobile || null,
      homeAlternatePhone: data.homeAlternatePhone || null,
      homeAddressLine1: data.homeAddressLine1 || null,
      homeAddressLine2: data.homeAddressLine2 || null,
      homeCity: data.homeCity || null,
      homeState: data.homeState || null,
      homePostalCode: data.homePostalCode || null,
      homeCountry: data.homeCountry || null,

      // Emergency Contact
      emergencyContactName: data.emergencyContactName || null,
      emergencyContactRelationship: data.emergencyContactRelationship || null,
      emergencyContactMobile: data.emergencyContactMobile || null,
      emergencyContactAlternatePhone: data.emergencyContactAlternatePhone || null,
      emergencyContactEmail: data.emergencyContactEmail || null,
      emergencyContactAddress: data.emergencyContactAddress || null,

      // Legacy Contact (sync with local)
      mobile: resolvedLocalMobile,
      email: resolvedLocalEmail,
      addressLine: resolvedLocalAddress1,
      city: resolvedLocalCity,
      state: resolvedLocalState,
      country: resolvedLocalCountry,

      joiningDate: data.joiningDate,
      departmentId: data.departmentId || null,
      designationId: data.designationId || null,
      branchId: data.branchId || null,
      employmentStatus: data.employmentStatus,
      createdAt: now,
      updatedAt: now,
    });

    if (data.passport) {
      await db.insert(employeePassports).values({
        id: `psp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`,
        employeeId: newId,
        passportNumber: data.passport.passportNumber,
        nationality: data.passport.nationality,
        issueDate: data.passport.issueDate,
        expiryDate: data.passport.expiryDate,
        placeOfIssue: data.passport.placeOfIssue || null,
        status: "VALID",
        createdAt: auditNow,
        updatedAt: auditNow,
      });
    }

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
        createdAt: auditNow,
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

        // Local / Work-Country Contact
        ...((data.localEmail !== undefined || data.email !== undefined) && {
          localEmail: data.localEmail !== undefined ? (data.localEmail || null) : (data.email || null),
        }),
        ...((data.localMobile !== undefined || data.mobile !== undefined) && {
          localMobile: data.localMobile !== undefined ? (data.localMobile || null) : (data.mobile || null),
        }),
        ...((data.localAddressLine1 !== undefined || data.addressLine !== undefined) && {
          localAddressLine1: data.localAddressLine1 !== undefined ? (data.localAddressLine1 || null) : (data.addressLine || null),
        }),
        ...(data.localAddressLine2 !== undefined && { localAddressLine2: data.localAddressLine2 || null }),
        ...((data.localCity !== undefined || data.city !== undefined) && {
          localCity: data.localCity !== undefined ? (data.localCity || null) : (data.city || null),
        }),
        ...((data.localState !== undefined || data.state !== undefined) && {
          localState: data.localState !== undefined ? (data.localState || null) : (data.state || null),
        }),
        ...(data.localPostalCode !== undefined && { localPostalCode: data.localPostalCode || null }),
        ...((data.localCountry !== undefined || data.country !== undefined) && {
          localCountry: data.localCountry !== undefined ? (data.localCountry || null) : (data.country || null),
        }),

        // Home-Country Contact
        ...(data.homeEmail !== undefined && { homeEmail: data.homeEmail || null }),
        ...(data.homeMobile !== undefined && { homeMobile: data.homeMobile || null }),
        ...(data.homeAlternatePhone !== undefined && { homeAlternatePhone: data.homeAlternatePhone || null }),
        ...(data.homeAddressLine1 !== undefined && { homeAddressLine1: data.homeAddressLine1 || null }),
        ...(data.homeAddressLine2 !== undefined && { homeAddressLine2: data.homeAddressLine2 || null }),
        ...(data.homeCity !== undefined && { homeCity: data.homeCity || null }),
        ...(data.homeState !== undefined && { homeState: data.homeState || null }),
        ...(data.homePostalCode !== undefined && { homePostalCode: data.homePostalCode || null }),
        ...(data.homeCountry !== undefined && { homeCountry: data.homeCountry || null }),

        // Emergency Contact
        ...(data.emergencyContactName !== undefined && { emergencyContactName: data.emergencyContactName || null }),
        ...(data.emergencyContactRelationship !== undefined && { emergencyContactRelationship: data.emergencyContactRelationship || null }),
        ...(data.emergencyContactMobile !== undefined && { emergencyContactMobile: data.emergencyContactMobile || null }),
        ...(data.emergencyContactAlternatePhone !== undefined && { emergencyContactAlternatePhone: data.emergencyContactAlternatePhone || null }),
        ...(data.emergencyContactEmail !== undefined && { emergencyContactEmail: data.emergencyContactEmail || null }),
        ...(data.emergencyContactAddress !== undefined && { emergencyContactAddress: data.emergencyContactAddress || null }),

        // Legacy Contact sync
        ...((data.localEmail !== undefined || data.email !== undefined) && {
          email: data.localEmail !== undefined ? (data.localEmail || null) : (data.email || null),
        }),
        ...((data.localMobile !== undefined || data.mobile !== undefined) && {
          mobile: data.localMobile !== undefined ? (data.localMobile || null) : (data.mobile || null),
        }),
        ...((data.localAddressLine1 !== undefined || data.addressLine !== undefined) && {
          addressLine: data.localAddressLine1 !== undefined ? (data.localAddressLine1 || null) : (data.addressLine || null),
        }),
        ...((data.localCity !== undefined || data.city !== undefined) && {
          city: data.localCity !== undefined ? (data.localCity || null) : (data.city || null),
        }),
        ...((data.localState !== undefined || data.state !== undefined) && {
          state: data.localState !== undefined ? (data.localState || null) : (data.state || null),
        }),
        ...((data.localCountry !== undefined || data.country !== undefined) && {
          country: data.localCountry !== undefined ? (data.localCountry || null) : (data.country || null),
        }),

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

/**
 * DELETE /api/employees/:id
 * ADMIN-only hard delete. Permanently removes the employee and all dependent records.
 * Passports, visas, work permits, transport assignments cascade-delete via FK.
 * Employee documents in D1 are deleted; R2 objects are deleted individually.
 */
employeesRoutes.delete("/:id", requireRole(ROLES.ADMIN), async (c) => {
  const user = c.get("user")!;
  const id = c.req.param("id");
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

    const emp = existing[0];

    // 1. Collect and delete all R2-backed documents for this employee
    const docs = await db
      .select({ id: employeeDocuments.id, r2Key: employeeDocuments.r2Key })
      .from(employeeDocuments)
      .where(eq(employeeDocuments.employeeId, id));

    for (const doc of docs) {
      if (doc.r2Key) {
        await c.env.BUCKET.delete(doc.r2Key).catch(() => {});
      }
    }

    // 2. Delete the employee record (FK cascade removes passports, visas,
    //    work permits, employee_documents, transport assignments)
    await db.delete(employees).where(eq(employees.id, id));

    // 3. Audit log
    try {
      const now = new Date().toISOString();
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: user.sub,
        action: "EMPLOYEE_HARD_DELETE",
        resourceType: "employee",
        resourceId: id,
        details: JSON.stringify({
          employeeCode: emp.employeeCode,
          employeeId: emp.employeeId,
          fullName: emp.fullName,
          r2DocumentsDeleted: docs.length,
        }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    return jsonSuccess(c, {
      deleted: true,
      message: `Employee "${emp.fullName}" permanently deleted`,
      id,
    });
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to delete employee",
      500
    );
  }
});

