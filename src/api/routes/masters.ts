import { Hono } from "hono";
import { asc, eq, and, ne } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { departments, designations, branches, documentTypes } from "../db/schema/masters";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  departmentSchema,
  updateDepartmentSchema,
  designationSchema,
  updateDesignationSchema,
  branchSchema,
  updateBranchSchema,
  documentTypeMasterSchema,
  updateDocumentTypeMasterSchema,
} from "../../shared/schemas/master";

export const mastersRoutes = new Hono<AppContext>();

// All master routes require authentication
mastersRoutes.use("*", requireAuth());

// Helper for audit logging
async function logMasterAudit(
  c: any,
  action: string,
  resourceType: string,
  resourceId: string,
  details?: Record<string, any>
) {
  try {
    const user = c.get("user");
    const db = getDb(c.env.DB);
    await db.insert(auditLogs).values({
      id: crypto.randomUUID(),
      userId: user?.sub,
      action,
      resourceType,
      resourceId,
      details: details ? JSON.stringify(details) : undefined,
      ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
      userAgent: c.req.header("user-agent") || "unknown",
      createdAt: new Date().toISOString(),
    });
  } catch {
    // Non-blocking
  }
}

// ==========================================
// 1. DEPARTMENTS
// ==========================================

mastersRoutes.get("/departments", async (c) => {
  try {
    const showAll = c.req.query("all") === "true";
    const db = getDb(c.env.DB);

    const query = db.select().from(departments);
    const result = showAll
      ? await query.orderBy(asc(departments.name))
      : await query.where(eq(departments.status, "active")).orderBy(asc(departments.name));

    return jsonSuccess(c, result);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to fetch departments",
      500
    );
  }
});

mastersRoutes.post("/departments", requireRole(ROLES.ADMIN), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = departmentSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid department data", 400, parseResult.error.flatten());
  }

  const { name, code } = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    const existing = await db
      .select({ id: departments.id, name: departments.name, code: departments.code })
      .from(departments)
      .where(eq(departments.code, code.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(c, "DUPLICATE_CODE", "Department code already exists", 400);
    }

    const newId = `dept_${crypto.randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    await db.insert(departments).values({
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logMasterAudit(c, "DEPARTMENT_CREATED", "departments", newId, { name, code: code.toUpperCase() });

    return jsonSuccess(c, { id: newId, name: name.trim(), code: code.toUpperCase().trim(), status: "active", createdAt: now, updatedAt: now }, 201);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to create department", 500);
  }
});

mastersRoutes.put("/departments/:id", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = updateDepartmentSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid department update data", 400, parseResult.error.flatten());
  }

  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Department not found", 404);

    const { name, code } = parseResult.data;
    const updates: Partial<typeof departments.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (code) {
      const upperCode = code.toUpperCase().trim();
      const duplicate = await db
        .select({ id: departments.id })
        .from(departments)
        .where(and(eq(departments.code, upperCode), ne(departments.id, id)))
        .limit(1);
      if (duplicate.length > 0) return jsonError(c, "DUPLICATE_CODE", "Department code already exists", 400);
      updates.code = upperCode;
    }

    await db.update(departments).set(updates).where(eq(departments.id, id));
    await logMasterAudit(c, "DEPARTMENT_UPDATED", "departments", id, updates);

    const updated = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    return jsonSuccess(c, updated[0]);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to update department", 500);
  }
});

mastersRoutes.post("/departments/:id/deactivate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Department not found", 404);

    const now = new Date().toISOString();
    await db.update(departments).set({ status: "inactive", updatedAt: now }).where(eq(departments.id, id));
    await logMasterAudit(c, "DEPARTMENT_DEACTIVATED", "departments", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "inactive", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to deactivate department", 500);
  }
});

mastersRoutes.post("/departments/:id/activate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(departments).where(eq(departments.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Department not found", 404);

    const now = new Date().toISOString();
    await db.update(departments).set({ status: "active", updatedAt: now }).where(eq(departments.id, id));
    await logMasterAudit(c, "DEPARTMENT_ACTIVATED", "departments", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "active", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to activate department", 500);
  }
});

// ==========================================
// 2. DESIGNATIONS
// ==========================================

mastersRoutes.get("/designations", async (c) => {
  try {
    const showAll = c.req.query("all") === "true";
    const db = getDb(c.env.DB);

    const query = db.select().from(designations);
    const result = showAll
      ? await query.orderBy(asc(designations.name))
      : await query.where(eq(designations.status, "active")).orderBy(asc(designations.name));

    return jsonSuccess(c, result);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to fetch designations",
      500
    );
  }
});

mastersRoutes.post("/designations", requireRole(ROLES.ADMIN), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = designationSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid designation data", 400, parseResult.error.flatten());
  }

  const { name, code } = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    const existing = await db
      .select({ id: designations.id })
      .from(designations)
      .where(eq(designations.code, code.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(c, "DUPLICATE_CODE", "Designation code already exists", 400);
    }

    const newId = `desig_${crypto.randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    await db.insert(designations).values({
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logMasterAudit(c, "DESIGNATION_CREATED", "designations", newId, { name, code: code.toUpperCase() });

    return jsonSuccess(c, { id: newId, name: name.trim(), code: code.toUpperCase().trim(), status: "active", createdAt: now, updatedAt: now }, 201);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to create designation", 500);
  }
});

mastersRoutes.put("/designations/:id", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = updateDesignationSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid designation update data", 400, parseResult.error.flatten());
  }

  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(designations).where(eq(designations.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Designation not found", 404);

    const { name, code } = parseResult.data;
    const updates: Partial<typeof designations.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (code) {
      const upperCode = code.toUpperCase().trim();
      const duplicate = await db
        .select({ id: designations.id })
        .from(designations)
        .where(and(eq(designations.code, upperCode), ne(designations.id, id)))
        .limit(1);
      if (duplicate.length > 0) return jsonError(c, "DUPLICATE_CODE", "Designation code already exists", 400);
      updates.code = upperCode;
    }

    await db.update(designations).set(updates).where(eq(designations.id, id));
    await logMasterAudit(c, "DESIGNATION_UPDATED", "designations", id, updates);

    const updated = await db.select().from(designations).where(eq(designations.id, id)).limit(1);
    return jsonSuccess(c, updated[0]);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to update designation", 500);
  }
});

mastersRoutes.post("/designations/:id/deactivate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(designations).where(eq(designations.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Designation not found", 404);

    const now = new Date().toISOString();
    await db.update(designations).set({ status: "inactive", updatedAt: now }).where(eq(designations.id, id));
    await logMasterAudit(c, "DESIGNATION_DEACTIVATED", "designations", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "inactive", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to deactivate designation", 500);
  }
});

mastersRoutes.post("/designations/:id/activate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(designations).where(eq(designations.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Designation not found", 404);

    const now = new Date().toISOString();
    await db.update(designations).set({ status: "active", updatedAt: now }).where(eq(designations.id, id));
    await logMasterAudit(c, "DESIGNATION_ACTIVATED", "designations", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "active", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to activate designation", 500);
  }
});

// ==========================================
// 3. BRANCHES
// ==========================================

mastersRoutes.get("/branches", async (c) => {
  try {
    const showAll = c.req.query("all") === "true";
    const db = getDb(c.env.DB);

    const query = db.select().from(branches);
    const result = showAll
      ? await query.orderBy(asc(branches.name))
      : await query.where(eq(branches.status, "active")).orderBy(asc(branches.name));

    return jsonSuccess(c, result);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to fetch branches",
      500
    );
  }
});

mastersRoutes.post("/branches", requireRole(ROLES.ADMIN), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = branchSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid branch data", 400, parseResult.error.flatten());
  }

  const { name, code, city, country } = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    const existing = await db
      .select({ id: branches.id })
      .from(branches)
      .where(eq(branches.code, code.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(c, "DUPLICATE_CODE", "Branch code already exists", 400);
    }

    const newId = `branch_${crypto.randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    await db.insert(branches).values({
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      city: city?.trim() || null,
      country: country?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logMasterAudit(c, "BRANCH_CREATED", "branches", newId, { name, code: code.toUpperCase() });

    return jsonSuccess(c, {
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      city: city?.trim() || null,
      country: country?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }, 201);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to create branch", 500);
  }
});

mastersRoutes.put("/branches/:id", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = updateBranchSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid branch update data", 400, parseResult.error.flatten());
  }

  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Branch not found", 404);

    const { name, code, city, country } = parseResult.data;
    const updates: Partial<typeof branches.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (city !== undefined) updates.city = city?.trim() || null;
    if (country !== undefined) updates.country = country?.trim() || null;
    if (code) {
      const upperCode = code.toUpperCase().trim();
      const duplicate = await db
        .select({ id: branches.id })
        .from(branches)
        .where(and(eq(branches.code, upperCode), ne(branches.id, id)))
        .limit(1);
      if (duplicate.length > 0) return jsonError(c, "DUPLICATE_CODE", "Branch code already exists", 400);
      updates.code = upperCode;
    }

    await db.update(branches).set(updates).where(eq(branches.id, id));
    await logMasterAudit(c, "BRANCH_UPDATED", "branches", id, updates);

    const updated = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    return jsonSuccess(c, updated[0]);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to update branch", 500);
  }
});

mastersRoutes.post("/branches/:id/deactivate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Branch not found", 404);

    const now = new Date().toISOString();
    await db.update(branches).set({ status: "inactive", updatedAt: now }).where(eq(branches.id, id));
    await logMasterAudit(c, "BRANCH_DEACTIVATED", "branches", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "inactive", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to deactivate branch", 500);
  }
});

mastersRoutes.post("/branches/:id/activate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(branches).where(eq(branches.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Branch not found", 404);

    const now = new Date().toISOString();
    await db.update(branches).set({ status: "active", updatedAt: now }).where(eq(branches.id, id));
    await logMasterAudit(c, "BRANCH_ACTIVATED", "branches", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "active", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to activate branch", 500);
  }
});

// ==========================================
// 4. DOCUMENT TYPES
// ==========================================

mastersRoutes.get("/document-types", async (c) => {
  try {
    const showAll = c.req.query("all") === "true";
    const db = getDb(c.env.DB);

    const query = db.select().from(documentTypes);
    const result = showAll
      ? await query.orderBy(asc(documentTypes.name))
      : await query.where(eq(documentTypes.status, "active")).orderBy(asc(documentTypes.name));

    return jsonSuccess(c, result);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to fetch document types",
      500
    );
  }
});

mastersRoutes.post("/document-types", requireRole(ROLES.ADMIN), async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = documentTypeMasterSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid document type data", 400, parseResult.error.flatten());
  }

  const { name, code, description } = parseResult.data;
  const db = getDb(c.env.DB);

  try {
    const existing = await db
      .select({ id: documentTypes.id })
      .from(documentTypes)
      .where(eq(documentTypes.code, code.toUpperCase()))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(c, "DUPLICATE_CODE", "Document type code already exists", 400);
    }

    const newId = `doc_type_${crypto.randomUUID().replace(/-/g, "").substring(0, 10)}`;
    const now = new Date().toISOString();

    await db.insert(documentTypes).values({
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    });

    await logMasterAudit(c, "DOCUMENT_TYPE_CREATED", "document_types", newId, { name, code: code.toUpperCase() });

    return jsonSuccess(c, {
      id: newId,
      name: name.trim(),
      code: code.toUpperCase().trim(),
      description: description?.trim() || null,
      status: "active",
      createdAt: now,
      updatedAt: now,
    }, 201);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to create document type", 500);
  }
});

mastersRoutes.put("/document-types/:id", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = updateDocumentTypeMasterSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(c, "VALIDATION_ERROR", "Invalid document type update data", 400, parseResult.error.flatten());
  }

  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Document type not found", 404);

    const { name, code, description } = parseResult.data;
    const updates: Partial<typeof documentTypes.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (name) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim() || null;
    if (code) {
      const upperCode = code.toUpperCase().trim();
      const duplicate = await db
        .select({ id: documentTypes.id })
        .from(documentTypes)
        .where(and(eq(documentTypes.code, upperCode), ne(documentTypes.id, id)))
        .limit(1);
      if (duplicate.length > 0) return jsonError(c, "DUPLICATE_CODE", "Document type code already exists", 400);
      updates.code = upperCode;
    }

    await db.update(documentTypes).set(updates).where(eq(documentTypes.id, id));
    await logMasterAudit(c, "DOCUMENT_TYPE_UPDATED", "document_types", id, updates);

    const updated = await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1);
    return jsonSuccess(c, updated[0]);
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to update document type", 500);
  }
});

mastersRoutes.post("/document-types/:id/deactivate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Document type not found", 404);

    const now = new Date().toISOString();
    await db.update(documentTypes).set({ status: "inactive", updatedAt: now }).where(eq(documentTypes.id, id));
    await logMasterAudit(c, "DOCUMENT_TYPE_DEACTIVATED", "document_types", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "inactive", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to deactivate document type", 500);
  }
});

mastersRoutes.post("/document-types/:id/activate", requireRole(ROLES.ADMIN), async (c) => {
  const id = c.req.param("id");
  const db = getDb(c.env.DB);
  try {
    const existing = await db.select().from(documentTypes).where(eq(documentTypes.id, id)).limit(1);
    if (!existing[0]) return jsonError(c, "NOT_FOUND", "Document type not found", 404);

    const now = new Date().toISOString();
    await db.update(documentTypes).set({ status: "active", updatedAt: now }).where(eq(documentTypes.id, id));
    await logMasterAudit(c, "DOCUMENT_TYPE_ACTIVATED", "document_types", id, { name: existing[0].name });

    return jsonSuccess(c, { ...existing[0], status: "active", updatedAt: now });
  } catch (err) {
    return jsonError(c, "DB_ERROR", err instanceof Error ? err.message : "Failed to activate document type", 500);
  }
});
