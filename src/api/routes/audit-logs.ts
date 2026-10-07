import { Hono } from "hono";
import { eq, or, and, inArray, like, sql, desc, asc } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { auditLogs } from "../db/schema/audit";
import { users } from "../db/schema/users";
import { jsonSuccess, jsonError } from "../utils/response";
import type { AuditLogEntry, AuditActor } from "../../shared/types/audit";

export const auditLogsRoutes = new Hono<AppContext>();

// Strict Backend RBAC: Only ADMIN may access audit logs (Phase 7B requirement)
auditLogsRoutes.use("*", requireAuth(), requireRole(ROLES.ADMIN));

const SENSITIVE_KEY_PATTERNS = [
  /password/i,
  /secret/i,
  /token/i,
  /jwt/i,
  /credential/i,
  /authorization/i,
  /cookie/i,
  /apikey/i,
  /api_key/i,
];

function sanitizeObject(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
    if (SENSITIVE_KEY_PATTERNS.some((pattern) => pattern.test(key))) {
      continue; // Exclude sensitive key completely
    }
    sanitized[key] = sanitizeObject(value);
  }
  return sanitized;
}

function parseAuditDetails(detailsStr: string | null): {
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  details: Record<string, unknown> | null;
} {
  if (!detailsStr) {
    return { oldValue: null, newValue: null, details: null };
  }

  try {
    const raw = JSON.parse(detailsStr);
    const sanitized = sanitizeObject(raw) as Record<string, unknown>;

    let oldValue: Record<string, unknown> | null = null;
    let newValue: Record<string, unknown> | null = null;

    if (sanitized && typeof sanitized === "object") {
      if ("previousStatus" in sanitized) {
        oldValue = { status: sanitized.previousStatus };
      }
      if ("newStatus" in sanitized) {
        newValue = { status: sanitized.newStatus };
      }
      if ("before" in sanitized && typeof sanitized.before === "object") {
        oldValue = sanitized.before as Record<string, unknown>;
      }
      if ("after" in sanitized && typeof sanitized.after === "object") {
        newValue = sanitized.after as Record<string, unknown>;
      }
      if ("oldValue" in sanitized && typeof sanitized.oldValue === "object") {
        oldValue = sanitized.oldValue as Record<string, unknown>;
      }
      if ("newValue" in sanitized && typeof sanitized.newValue === "object") {
        newValue = sanitized.newValue as Record<string, unknown>;
      }
    }

    return { oldValue, newValue, details: sanitized };
  } catch {
    return { oldValue: null, newValue: null, details: null };
  }
}

/**
 * GET /api/audit-logs
 * Retrieve paginated, filterable audit log entries.
 * Restricted to ADMIN and HR.
 */
auditLogsRoutes.get("/", async (c) => {
  const db = getDb(c.env.DB);
  const query = c.req.query();

  const page = Math.max(1, parseInt(query.page || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit || "20", 10) || 20));
  const actionFilter = query.action?.trim();
  const entityTypeFilter = query.entityType?.trim() || query.entity_type?.trim();
  const actorFilter = query.actor?.trim();
  const search = query.search?.trim().toLowerCase();
  const sortOrder = query.sortOrder?.toLowerCase() === "asc" ? "asc" : "desc";

  const conditions = [];

  // Action filter
  if (actionFilter && actionFilter !== "all" && actionFilter !== "ALL") {
    const upperAction = actionFilter.toUpperCase();
    if (["CREATE", "UPDATE", "DELETE", "LOGIN", "LOGOUT", "VERIFY"].includes(upperAction)) {
      conditions.push(like(sql`upper(${auditLogs.action})`, `%${upperAction}%`));
    } else {
      conditions.push(like(sql`lower(${auditLogs.action})`, `%${actionFilter.toLowerCase()}%`));
    }
  }

  // Entity Type filter
  if (entityTypeFilter && entityTypeFilter !== "all" && entityTypeFilter !== "ALL") {
    const lowerEntity = entityTypeFilter.toLowerCase();
    if (lowerEntity === "employee") {
      conditions.push(eq(auditLogs.resourceType, "employee"));
    } else if (lowerEntity === "passport") {
      conditions.push(eq(auditLogs.resourceType, "passport"));
    } else if (lowerEntity === "visa") {
      conditions.push(eq(auditLogs.resourceType, "visa"));
    } else if (lowerEntity === "work_permit" || lowerEntity === "work permit" || lowerEntity === "workpermit") {
      conditions.push(eq(auditLogs.resourceType, "work_permit"));
    } else if (lowerEntity === "document" || lowerEntity === "documents") {
      conditions.push(eq(auditLogs.resourceType, "document"));
    } else if (lowerEntity === "auth" || lowerEntity === "user" || lowerEntity === "user/auth") {
      conditions.push(inArray(auditLogs.resourceType, ["auth", "user"]));
    } else {
      conditions.push(like(sql`lower(${auditLogs.resourceType})`, `%${lowerEntity}%`));
    }
  }

  // Actor filter
  if (actorFilter && actorFilter !== "all") {
    const lowerActor = actorFilter.toLowerCase();
    conditions.push(
      or(
        eq(auditLogs.userId, actorFilter),
        like(sql`lower(${users.fullName})`, `%${lowerActor}%`),
        like(sql`lower(${users.email})`, `%${lowerActor}%`)
      )
    );
  }

  // Search filter
  if (search) {
    conditions.push(
      or(
        like(sql`lower(${users.fullName})`, `%${search}%`),
        like(sql`lower(${users.email})`, `%${search}%`),
        like(sql`lower(${auditLogs.action})`, `%${search}%`),
        like(sql`lower(${auditLogs.resourceType})`, `%${search}%`),
        like(sql`lower(${auditLogs.resourceId})`, `%${search}%`),
        like(sql`lower(${auditLogs.details})`, `%${search}%`)
      )
    );
  }

  try {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined);

    const total = Number(countResult[0]?.count || 0);
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;

    const rows = await db
      .select({
        id: auditLogs.id,
        userId: auditLogs.userId,
        action: auditLogs.action,
        resourceType: auditLogs.resourceType,
        resourceId: auditLogs.resourceId,
        details: auditLogs.details,
        ipAddress: auditLogs.ipAddress,
        userAgent: auditLogs.userAgent,
        createdAt: auditLogs.createdAt,
        userFullName: users.fullName,
        userEmail: users.email,
        userRole: users.role,
      })
      .from(auditLogs)
      .leftJoin(users, eq(auditLogs.userId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(sortOrder === "asc" ? asc(auditLogs.createdAt) : desc(auditLogs.createdAt))
      .limit(limit)
      .offset(offset);

    const entries: AuditLogEntry[] = rows.map((r) => {
      const { oldValue, newValue, details } = parseAuditDetails(r.details);
      const actor: AuditActor = {
        id: r.userId || "system",
        fullName:
          r.userFullName || (r.userId === "system" ? "System" : r.userId || "Unknown Actor"),
        email: r.userEmail || "",
        role: r.userRole || undefined,
      };

      return {
        id: r.id,
        timestamp: r.createdAt,
        actor,
        action: r.action,
        entityType: r.resourceType,
        entityId: r.resourceId,
        oldValue,
        newValue,
        details,
        ipAddress: r.ipAddress,
        userAgent: r.userAgent,
      };
    });

    return jsonSuccess(c, entries, {
      page,
      limit,
      total,
      totalPages,
    });
  } catch (err) {
    return jsonError(
      c,
      "DATABASE_ERROR",
      err instanceof Error ? err.message : "Failed to retrieve audit logs",
      500
    );
  }
});
