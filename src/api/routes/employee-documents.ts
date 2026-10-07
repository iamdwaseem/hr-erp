import { Hono, type Context } from "hono";
import { eq, or, like, sql } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { employees, type EmployeeEntity } from "../db/schema/employees";
import {
  employeePassports,
  employeeVisas,
  employeeWorkPermits,
} from "../db/schema/documents";
import { auditLogs } from "../db/schema/audit";
import {
  passportSchema,
  updatePassportSchema,
  visaSchema,
  updateVisaSchema,
  workPermitSchema,
  updateWorkPermitSchema,
} from "../../shared/schemas/document";
import {
  calculateDocumentStatus,
  calculateDaysRemaining,
  type EmployeePassport,
  type EmployeeVisa,
  type EmployeeWorkPermit,
} from "../../shared/types/document";
import { jsonSuccess, jsonError } from "../utils/response";

export const employeeDocumentsRoutes = new Hono<AppContext>();

employeeDocumentsRoutes.use("*", requireAuth());

/**
 * Helper to resolve employee target and enforce RBAC self-access rules.
 */
export async function resolveEmployeeAccess(
  c: Context<AppContext>,
  paramId: string
): Promise<{ employee: EmployeeEntity | null; errorResponse?: ReturnType<typeof jsonError> }> {
  const user = c.get("user")!;
  const db = getDb(c.env.DB);

  if (paramId === "me") {
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
      return {
        employee: null,
        errorResponse: jsonError(
          c,
          "NOT_FOUND",
          "No employee profile found linked to your user account",
          404
        ),
      };
    }
    return { employee: rows[0] };
  }

  const rows = await db
    .select()
    .from(employees)
    .where(eq(employees.id, paramId))
    .limit(1);

  if (!rows.length) {
    return {
      employee: null,
      errorResponse: jsonError(c, "NOT_FOUND", "Employee not found", 404),
    };
  }

  const employee = rows[0];

  // Strict backend RBAC: Only ADMIN and HR may access documents
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.HR) {
    return {
      employee: null,
      errorResponse: jsonError(
        c,
        "FORBIDDEN",
        "Access denied: You are not authorized to access employee documents",
        403
      ),
    };
  }

  return { employee };
}

export function checkDocumentWritePermission(c: Context<AppContext>) {
  const user = c.get("user")!;
  if (user.role !== ROLES.ADMIN && user.role !== ROLES.HR) {
    return jsonError(
      c,
      "FORBIDDEN",
      "Forbidden: You do not have permission to create or modify employee documents",
      403
    );
  }
  return null;
}

// ==========================================
// PASSPORT ENDPOINTS
// ==========================================

employeeDocumentsRoutes.get("/:id/passport", async (c) => {
  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(employeePassports)
    .where(eq(employeePassports.employeeId, employee.id))
    .limit(1);

  if (!rows.length) {
    return jsonSuccess(c, null);
  }

  const doc = rows[0];
  const computedStatus = calculateDocumentStatus(doc.expiryDate);

  const passport: EmployeePassport = {
    ...doc,
    status: computedStatus,
    daysRemaining: calculateDaysRemaining(doc.expiryDate),
  };

  return jsonSuccess(c, passport);
});

employeeDocumentsRoutes.post("/:id/passport", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = passportSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid passport details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();
  const calculatedStatus = calculateDocumentStatus(data.expiryDate);

  const existing = await db
    .select()
    .from(employeePassports)
    .where(eq(employeePassports.employeeId, employee.id))
    .limit(1);

  let resultId: string;

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeePassports)
      .set({
        passportNumber: data.passportNumber,
        nationality: data.nationality,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        placeOfIssue: data.placeOfIssue || null,
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeePassports.id, resultId));
  } else {
    resultId = `pass_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeePassports).values({
      id: resultId,
      employeeId: employee.id,
      passportNumber: data.passportNumber,
      nationality: data.nationality,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      placeOfIssue: data.placeOfIssue || null,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: existing.length > 0 ? "PASSPORT_UPDATE" : "PASSPORT_CREATE",
      resourceType: "passport",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, passportNumber: data.passportNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeePassports)
    .where(eq(employeePassports.id, resultId))
    .limit(1);

  return jsonSuccess(
    c,
    {
      ...saved[0],
      status: calculatedStatus,
      daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
    },
    undefined,
    201
  );
});

employeeDocumentsRoutes.put("/:id/passport", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = updatePassportSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid passport details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(employeePassports)
    .where(eq(employeePassports.employeeId, employee.id))
    .limit(1);

  let resultId: string;
  const targetExpiry = data.expiryDate || existing[0]?.expiryDate;
  const calculatedStatus = calculateDocumentStatus(targetExpiry);

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeePassports)
      .set({
        ...(data.passportNumber !== undefined && { passportNumber: data.passportNumber }),
        ...(data.nationality !== undefined && { nationality: data.nationality }),
        ...(data.issueDate !== undefined && { issueDate: data.issueDate }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
        ...(data.placeOfIssue !== undefined && { placeOfIssue: data.placeOfIssue || null }),
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeePassports.id, resultId));
  } else {
    if (!data.passportNumber || !data.nationality || !data.issueDate || !data.expiryDate) {
      return jsonError(c, "NOT_FOUND", "Passport record not found for this employee", 404);
    }
    resultId = `pass_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeePassports).values({
      id: resultId,
      employeeId: employee.id,
      passportNumber: data.passportNumber,
      nationality: data.nationality,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      placeOfIssue: data.placeOfIssue || null,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: "PASSPORT_UPDATE",
      resourceType: "passport",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, passportNumber: data.passportNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeePassports)
    .where(eq(employeePassports.id, resultId))
    .limit(1);

  return jsonSuccess(c, {
    ...saved[0],
    status: calculatedStatus,
    daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
  });
});

// ==========================================
// VISA ENDPOINTS
// ==========================================

employeeDocumentsRoutes.get("/:id/visa", async (c) => {
  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(employeeVisas)
    .where(eq(employeeVisas.employeeId, employee.id))
    .limit(1);

  if (!rows.length) {
    return jsonSuccess(c, null);
  }

  const doc = rows[0];
  const computedStatus = calculateDocumentStatus(doc.expiryDate);

  const visa: EmployeeVisa = {
    ...doc,
    status: computedStatus,
    daysRemaining: calculateDaysRemaining(doc.expiryDate),
  };

  return jsonSuccess(c, visa);
});

employeeDocumentsRoutes.post("/:id/visa", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = visaSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid visa details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();
  const calculatedStatus = calculateDocumentStatus(data.expiryDate);

  const existing = await db
    .select()
    .from(employeeVisas)
    .where(eq(employeeVisas.employeeId, employee.id))
    .limit(1);

  let resultId: string;

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeeVisas)
      .set({
        visaNumber: data.visaNumber,
        visaType: data.visaType,
        issuingState: data.issuingState || null,
        profession: data.profession || null,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        sponsorName: data.sponsorName || null,
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeeVisas.id, resultId));
  } else {
    resultId = `visa_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeeVisas).values({
      id: resultId,
      employeeId: employee.id,
      visaNumber: data.visaNumber,
      visaType: data.visaType,
      issuingState: data.issuingState || null,
      profession: data.profession || null,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      sponsorName: data.sponsorName || null,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: existing.length > 0 ? "VISA_UPDATE" : "VISA_CREATE",
      resourceType: "visa",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, visaNumber: data.visaNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeeVisas)
    .where(eq(employeeVisas.id, resultId))
    .limit(1);

  return jsonSuccess(
    c,
    {
      ...saved[0],
      status: calculatedStatus,
      daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
    },
    undefined,
    201
  );
});

employeeDocumentsRoutes.put("/:id/visa", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = updateVisaSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid visa details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(employeeVisas)
    .where(eq(employeeVisas.employeeId, employee.id))
    .limit(1);

  let resultId: string;
  const targetExpiry = data.expiryDate || existing[0]?.expiryDate;
  const calculatedStatus = calculateDocumentStatus(targetExpiry);

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeeVisas)
      .set({
        ...(data.visaNumber !== undefined && { visaNumber: data.visaNumber }),
        ...(data.visaType !== undefined && { visaType: data.visaType }),
        ...(data.issuingState !== undefined && { issuingState: data.issuingState || null }),
        ...(data.profession !== undefined && { profession: data.profession || null }),
        ...(data.issueDate !== undefined && { issueDate: data.issueDate }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
        ...(data.sponsorName !== undefined && { sponsorName: data.sponsorName || null }),
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeeVisas.id, resultId));
  } else {
    if (!data.visaNumber || !data.visaType || !data.issueDate || !data.expiryDate) {
      return jsonError(c, "NOT_FOUND", "Visa record not found for this employee", 404);
    }
    resultId = `visa_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeeVisas).values({
      id: resultId,
      employeeId: employee.id,
      visaNumber: data.visaNumber,
      visaType: data.visaType,
      issuingState: data.issuingState || null,
      profession: data.profession || null,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      sponsorName: data.sponsorName || null,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: "VISA_UPDATE",
      resourceType: "visa",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, visaNumber: data.visaNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeeVisas)
    .where(eq(employeeVisas.id, resultId))
    .limit(1);

  return jsonSuccess(c, {
    ...saved[0],
    status: calculatedStatus,
    daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
  });
});

// ==========================================
// WORK PERMIT ENDPOINTS
// ==========================================

employeeDocumentsRoutes.get("/:id/work-permit", async (c) => {
  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const db = getDb(c.env.DB);
  const rows = await db
    .select()
    .from(employeeWorkPermits)
    .where(eq(employeeWorkPermits.employeeId, employee.id))
    .limit(1);

  if (!rows.length) {
    return jsonSuccess(c, null);
  }

  const doc = rows[0];
  const computedStatus = calculateDocumentStatus(doc.expiryDate);

  const workPermit: EmployeeWorkPermit = {
    ...doc,
    status: computedStatus,
    daysRemaining: calculateDaysRemaining(doc.expiryDate),
  };

  return jsonSuccess(c, workPermit);
});

employeeDocumentsRoutes.post("/:id/work-permit", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = workPermitSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid work permit details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();
  const calculatedStatus = calculateDocumentStatus(data.expiryDate);

  const existing = await db
    .select()
    .from(employeeWorkPermits)
    .where(eq(employeeWorkPermits.employeeId, employee.id))
    .limit(1);

  let resultId: string;

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeeWorkPermits)
      .set({
        permitNumber: data.permitNumber,
        profession: data.profession || null,
        issueDate: data.issueDate,
        expiryDate: data.expiryDate,
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeeWorkPermits.id, resultId));
  } else {
    resultId = `wp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeeWorkPermits).values({
      id: resultId,
      employeeId: employee.id,
      permitNumber: data.permitNumber,
      profession: data.profession || null,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: existing.length > 0 ? "WORK_PERMIT_UPDATE" : "WORK_PERMIT_CREATE",
      resourceType: "work_permit",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, permitNumber: data.permitNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeeWorkPermits)
    .where(eq(employeeWorkPermits.id, resultId))
    .limit(1);

  return jsonSuccess(
    c,
    {
      ...saved[0],
      status: calculatedStatus,
      daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
    },
    undefined,
    201
  );
});

employeeDocumentsRoutes.put("/:id/work-permit", async (c) => {
  const writeErr = checkDocumentWritePermission(c);
  if (writeErr) return writeErr;

  const { employee, errorResponse } = await resolveEmployeeAccess(c, c.req.param("id"));
  if (errorResponse) return errorResponse;
  if (!employee) return jsonError(c, "NOT_FOUND", "Employee not found", 404);

  const body = await c.req.json().catch(() => null);
  const parseResult = updateWorkPermitSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid work permit details",
      400,
      parseResult.error.flatten()
    );
  }

  const data = parseResult.data;
  const db = getDb(c.env.DB);
  const user = c.get("user")!;
  const now = new Date().toISOString();

  const existing = await db
    .select()
    .from(employeeWorkPermits)
    .where(eq(employeeWorkPermits.employeeId, employee.id))
    .limit(1);

  let resultId: string;
  const targetExpiry = data.expiryDate || existing[0]?.expiryDate;
  const calculatedStatus = calculateDocumentStatus(targetExpiry);

  if (existing.length > 0) {
    resultId = existing[0].id;
    await db
      .update(employeeWorkPermits)
      .set({
        ...(data.permitNumber !== undefined && { permitNumber: data.permitNumber }),
        ...(data.profession !== undefined && { profession: data.profession || null }),
        ...(data.issueDate !== undefined && { issueDate: data.issueDate }),
        ...(data.expiryDate !== undefined && { expiryDate: data.expiryDate }),
        status: calculatedStatus,
        updatedAt: now,
      })
      .where(eq(employeeWorkPermits.id, resultId));
  } else {
    if (!data.permitNumber || !data.issueDate || !data.expiryDate) {
      return jsonError(c, "NOT_FOUND", "Work permit record not found for this employee", 404);
    }
    resultId = `wp_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;
    await db.insert(employeeWorkPermits).values({
      id: resultId,
      employeeId: employee.id,
      permitNumber: data.permitNumber,
      profession: data.profession || null,
      issueDate: data.issueDate,
      expiryDate: data.expiryDate,
      status: calculatedStatus,
      createdAt: now,
      updatedAt: now,
    });
  }

  // Audit log
  try {
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user.sub,
      action: "WORK_PERMIT_UPDATE",
      resourceType: "work_permit",
      resourceId: resultId,
      details: JSON.stringify({ employeeId: employee.id, permitNumber: data.permitNumber }),
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: now,
    });
  } catch {
    // Non-blocking
  }

  const saved = await db
    .select()
    .from(employeeWorkPermits)
    .where(eq(employeeWorkPermits.id, resultId))
    .limit(1);

  return jsonSuccess(c, {
    ...saved[0],
    status: calculatedStatus,
    daysRemaining: calculateDaysRemaining(saved[0].expiryDate),
  });
});
