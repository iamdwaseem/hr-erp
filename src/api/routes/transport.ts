import { Hono } from "hono";
import { asc, desc, eq, and, ne, sql, or, like } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requirePermissionMiddleware, requireRole } from "../middleware/rbac";
import { PERMISSIONS, ROLES } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import {
  transportRoutes,
  transportRouteStops,
  transportVehicles,
  employeeTransportAssignments,
  transportTrips,
  transportTripPassengers,
} from "../db/schema/transport";
import { branches } from "../db/schema/masters";
import { employees } from "../db/schema/employees";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { jsonSuccess, jsonError } from "../utils/response";
import {
  createRouteSchema,
  updateRouteSchema,
  createVehicleSchema,
  updateVehicleSchema,
  createAssignmentSchema,
  updateAssignmentSchema,
  endAssignmentSchema,
  createRouteStopSchema,
  updateRouteStopSchema,
  createTransportTripSchema,
  updateTripStatusSchema,
  updateBoardingStatusSchema,
} from "../../shared/schemas/transport";

export const transportRoutesHandler = new Hono<AppContext>();

// Require authentication and RBAC for all transport endpoints
transportRoutesHandler.use("*", requireAuth());

// Helper for audit logging
async function logTransportAudit(
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
      const u = await db.select({ id: users.id }).from(users).where(eq(users.id, user.sub)).limit(1);
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
  } catch {
    // Non-blocking
  }
}

// ==========================================
// 1. OVERVIEW & STATS
// ==========================================

transportRoutesHandler.get("/overview", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const today = new Date().toISOString().split("T")[0];

    // Count active routes
    const activeRoutesResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(transportRoutes)
      .where(eq(transportRoutes.status, "active"));
    const activeRoutesCount = Number(activeRoutesResult[0]?.count ?? 0);

    // Count active vehicles and sum capacity
    const activeVehiclesResult = await db
      .select({
        count: sql<number>`count(*)`,
        totalCapacity: sql<number>`coalesce(sum(${transportVehicles.capacity}), 0)`,
      })
      .from(transportVehicles)
      .where(eq(transportVehicles.status, "active"));
    const activeVehiclesCount = Number(activeVehiclesResult[0]?.count ?? 0);
    const totalVehicleCapacity = Number(activeVehiclesResult[0]?.totalCapacity ?? 0);

    // Count unique employees with active assignments
    const activeAssignmentsCountResult = await db
      .select({
        count: sql<number>`count(distinct ${employeeTransportAssignments.employeeId})`,
      })
      .from(employeeTransportAssignments)
      .where(
        and(
          eq(employeeTransportAssignments.status, "active"),
          sql`${employeeTransportAssignments.effectiveFrom} <= ${today}`,
          or(sql`${employeeTransportAssignments.effectiveTo} IS NULL`, sql`${employeeTransportAssignments.effectiveTo} >= ${today}`)
        )
      );
    const assignedEmployeesCount = Number(activeAssignmentsCountResult[0]?.count ?? 0);

    const availableCapacity = Math.max(0, totalVehicleCapacity - assignedEmployeesCount);

    // Recent 5 assignments
    const recentRows = await db
      .select({
        assignment: employeeTransportAssignments,
        employee: {
          id: employees.id,
          employeeCode: employees.employeeCode,
          employeeId: employees.employeeId,
          fullName: employees.fullName,
        },
        route: {
          id: transportRoutes.id,
          name: transportRoutes.name,
          code: transportRoutes.code,
        },
        vehicle: {
          id: transportVehicles.id,
          registrationNumber: transportVehicles.registrationNumber,
          vehicleType: transportVehicles.vehicleType,
        },
      })
      .from(employeeTransportAssignments)
      .leftJoin(employees, eq(employeeTransportAssignments.employeeId, employees.id))
      .leftJoin(transportRoutes, eq(employeeTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(employeeTransportAssignments.vehicleId, transportVehicles.id))
      .orderBy(desc(employeeTransportAssignments.createdAt))
      .limit(5);

    const recentAssignments = recentRows.map((r) => ({
      ...r.assignment,
      employee: r.employee,
      route: r.route,
      vehicle: r.vehicle,
    }));

    return jsonSuccess(c, {
      activeRoutesCount,
      activeVehiclesCount,
      assignedEmployeesCount,
      totalVehicleCapacity,
      availableCapacity,
      recentAssignments,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to retrieve transport overview", 500);
  }
});

// ==========================================
// 2. ROUTES
// ==========================================

transportRoutesHandler.get("/routes", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const search = c.req.query("search")?.trim().toLowerCase();
    const status = c.req.query("status");
    const showAll = c.req.query("all") === "true";

    let conditions = [];

    if (!showAll && !status) {
      conditions.push(eq(transportRoutes.status, "active"));
    } else if (status && status !== "all") {
      conditions.push(eq(transportRoutes.status, status));
    }

    if (search) {
      conditions.push(
        or(
          like(sql`lower(${transportRoutes.name})`, `%${search}%`),
          like(sql`lower(${transportRoutes.code})`, `%${search}%`),
          like(sql`lower(coalesce(${transportRoutes.pickupPoints}, ''))`, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        route: transportRoutes,
        branch: {
          id: branches.id,
          name: branches.name,
          code: branches.code,
          city: branches.city,
        },
        activeAssignmentsCount: sql<number>`(
          SELECT count(*) FROM employee_transport_assignments
          WHERE employee_transport_assignments.route_id = ${transportRoutes.id}
          AND employee_transport_assignments.status = 'active'
          AND employee_transport_assignments.effective_from <= date('now')
          AND (employee_transport_assignments.effective_to IS NULL OR employee_transport_assignments.effective_to >= date('now'))
        )`,
      })
      .from(transportRoutes)
      .leftJoin(branches, eq(transportRoutes.destinationBranchId, branches.id))
      .where(whereClause)
      .orderBy(asc(transportRoutes.name));

    const result = rows.map((r) => ({
      ...r.route,
      destinationBranch: r.branch?.id ? r.branch : null,
      activeAssignmentsCount: Number(r.activeAssignmentsCount || 0),
    }));

    return jsonSuccess(c, result);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to list routes", 500);
  }
});

transportRoutesHandler.get("/routes/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        route: transportRoutes,
        branch: {
          id: branches.id,
          name: branches.name,
          code: branches.code,
          city: branches.city,
        },
        activeAssignmentsCount: sql<number>`(
          SELECT count(*) FROM employee_transport_assignments
          WHERE employee_transport_assignments.route_id = ${transportRoutes.id}
          AND employee_transport_assignments.status = 'active'
          AND employee_transport_assignments.effective_from <= date('now')
          AND (employee_transport_assignments.effective_to IS NULL OR employee_transport_assignments.effective_to >= date('now'))
        )`,
      })
      .from(transportRoutes)
      .leftJoin(branches, eq(transportRoutes.destinationBranchId, branches.id))
      .where(eq(transportRoutes.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Route not found", 404);
    }

    const r = rows[0];
    return jsonSuccess(c, {
      ...r.route,
      destinationBranch: r.branch?.id ? r.branch : null,
      activeAssignmentsCount: Number(r.activeAssignmentsCount || 0),
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to get route", 500);
  }
});

transportRoutesHandler.post("/routes", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = createRouteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid route data", 400, parsed.error.flatten());
    }

    const { name, code, description, pickupPoints, destinationBranchId, status } = parsed.data;
    const db = getDb(c.env.DB);

    // Uniqueness check for route code
    const existingCode = await db
      .select({ id: transportRoutes.id })
      .from(transportRoutes)
      .where(eq(transportRoutes.code, code))
      .limit(1);

    if (existingCode.length > 0) {
      return jsonError(c, "DUPLICATE_CODE", `Route with code "${code}" already exists`, 409);
    }

    // Verify branch if provided
    if (destinationBranchId) {
      const branchExists = await db
        .select({ id: branches.id })
        .from(branches)
        .where(eq(branches.id, destinationBranchId))
        .limit(1);
      if (branchExists.length === 0) {
        return jsonError(c, "BRANCH_NOT_FOUND", "Destination branch does not exist", 400);
      }
    }

    const now = new Date().toISOString();
    const id = `route_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const newRoute = {
      id,
      name,
      code,
      description: description || null,
      pickupPoints: pickupPoints || null,
      destinationBranchId: destinationBranchId || null,
      status: status || "active",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(transportRoutes).values(newRoute);

    await logTransportAudit(c, "transport:route:created", "transport_route", id, {
      name,
      code,
      destinationBranchId,
    });

    return jsonSuccess(c, newRoute, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to create route", 500);
  }
});

transportRoutesHandler.put("/routes/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = updateRouteSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid route update data", 400, parsed.error.flatten());
    }

    const db = getDb(c.env.DB);
    const existing = await db.select().from(transportRoutes).where(eq(transportRoutes.id, id)).limit(1);
    if (existing.length === 0) return jsonError(c, "NOT_FOUND", "Route not found", 404);

    const updates: Partial<typeof transportRoutes.$inferInsert> = { updatedAt: new Date().toISOString() };
    if (parsed.data.name !== undefined) updates.name = parsed.data.name;
    if (parsed.data.description !== undefined) updates.description = parsed.data.description || null;
    if (parsed.data.pickupPoints !== undefined) updates.pickupPoints = parsed.data.pickupPoints || null;
    if (parsed.data.destinationBranchId !== undefined) updates.destinationBranchId = parsed.data.destinationBranchId || null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.code && parsed.data.code !== existing[0].code) {
      const codeConflict = await db.select({ id: transportRoutes.id }).from(transportRoutes)
        .where(and(eq(transportRoutes.code, parsed.data.code), ne(transportRoutes.id, id))).limit(1);
      if (codeConflict.length > 0) return jsonError(c, "DUPLICATE_CODE", `Route with code "${parsed.data.code}" already exists`, 409);
      updates.code = parsed.data.code;
    }

    await db.update(transportRoutes).set(updates).where(eq(transportRoutes.id, id));
    await logTransportAudit(c, "transport:route:updated", "transport_route", id, updates);
    const updated = await db.select().from(transportRoutes).where(eq(transportRoutes.id, id)).limit(1);
    return jsonSuccess(c, updated[0]);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to update route", 500);
  }
});

transportRoutesHandler.post("/routes/:id/activate", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Route not found", 404);
    }

    await db
      .update(transportRoutes)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(transportRoutes.id, id));

    await logTransportAudit(c, "transport:route:activated", "transport_route", id);

    return jsonSuccess(c, { message: "Route activated successfully", id, status: "active" });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to activate route", 500);
  }
});

transportRoutesHandler.post("/routes/:id/deactivate", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Route not found", 404);
    }

    await db
      .update(transportRoutes)
      .set({ status: "inactive", updatedAt: new Date().toISOString() })
      .where(eq(transportRoutes.id, id));

    await logTransportAudit(c, "transport:route:deactivated", "transport_route", id);

    return jsonSuccess(c, { message: "Route deactivated successfully", id, status: "inactive" });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to deactivate route", 500);
  }
});

// Delete route:
// - HR: blocked if any assignments exist (historical or active)
// - ADMIN: force-deletes the route AND all its assignments regardless
transportRoutesHandler.delete("/routes/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user")!;
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(transportRoutes)
      .where(eq(transportRoutes.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Route not found", 404);
    }

    const isAdmin = user.role === ROLES.ADMIN;

    const assignmentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.routeId, id));

    const assignmentCount = Number(assignmentCountResult[0]?.count ?? 0);

    if (assignmentCount > 0 && !isAdmin) {
      return jsonError(
        c,
        "ROUTE_HAS_ASSIGNMENTS",
        "Cannot delete route with existing assignments. Please deactivate the route instead.",
        400
      );
    }

    // Admin: cascade-delete assignments first, then route
    if (assignmentCount > 0 && isAdmin) {
      await db
        .delete(employeeTransportAssignments)
        .where(eq(employeeTransportAssignments.routeId, id));
    }

    await db.delete(transportRoutes).where(eq(transportRoutes.id, id));
    await logTransportAudit(c, isAdmin ? "transport:route:hard_deleted" : "transport:route:deleted", "transport_route", id, {
      name: existing[0].name,
      code: existing[0].code,
      assignmentsPurged: isAdmin ? assignmentCount : 0,
    });

    return jsonSuccess(c, {
      message: isAdmin && assignmentCount > 0
        ? `Route deleted along with ${assignmentCount} assignment(s)`
        : "Route deleted successfully",
      id,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to delete route", 500);
  }
});

// ==========================================
// 3. VEHICLES
// ==========================================

transportRoutesHandler.get("/vehicles", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const search = c.req.query("search")?.trim().toLowerCase();
    const status = c.req.query("status");
    const vehicleType = c.req.query("vehicleType")?.trim();
    const showAll = c.req.query("all") === "true";

    let conditions = [];

    if (!showAll && !status) {
      conditions.push(eq(transportVehicles.status, "active"));
    } else if (status && status !== "all") {
      conditions.push(eq(transportVehicles.status, status));
    }

    if (vehicleType) {
      conditions.push(eq(transportVehicles.vehicleType, vehicleType));
    }

    if (search) {
      conditions.push(
        or(
          like(sql`lower(${transportVehicles.registrationNumber})`, `%${search}%`),
          like(sql`lower(${transportVehicles.vehicleType})`, `%${search}%`),
          like(sql`lower(coalesce(${transportVehicles.driverName}, ''))`, `%${search}%`),
          like(sql`lower(coalesce(${transportVehicles.driverPhone}, ''))`, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        vehicle: transportVehicles,
        activeAssignmentsCount: sql<number>`(
          SELECT count(*) FROM employee_transport_assignments
          WHERE employee_transport_assignments.vehicle_id = ${transportVehicles.id}
          AND employee_transport_assignments.status = 'active'
          AND employee_transport_assignments.effective_from <= date('now')
          AND (employee_transport_assignments.effective_to IS NULL OR employee_transport_assignments.effective_to >= date('now'))
        )`,
      })
      .from(transportVehicles)
      .where(whereClause)
      .orderBy(asc(transportVehicles.registrationNumber));

    const result = rows.map((r) => ({
      ...r.vehicle,
      activeAssignmentsCount: Number(r.activeAssignmentsCount || 0),
    }));

    return jsonSuccess(c, result);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to list vehicles", 500);
  }
});

transportRoutesHandler.get("/vehicles/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        vehicle: transportVehicles,
        activeAssignmentsCount: sql<number>`(
          SELECT count(*) FROM employee_transport_assignments
          WHERE employee_transport_assignments.vehicle_id = ${transportVehicles.id}
          AND employee_transport_assignments.status = 'active'
          AND employee_transport_assignments.effective_from <= date('now')
          AND (employee_transport_assignments.effective_to IS NULL OR employee_transport_assignments.effective_to >= date('now'))
        )`,
      })
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Vehicle not found", 404);
    }

    const r = rows[0];
    return jsonSuccess(c, {
      ...r.vehicle,
      activeAssignmentsCount: Number(r.activeAssignmentsCount || 0),
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to get vehicle", 500);
  }
});

transportRoutesHandler.post("/vehicles", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = createVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid vehicle data", 400, parsed.error.flatten());
    }

    const { registrationNumber, vehicleType, capacity, driverName, driverPhone, status } = parsed.data;
    const db = getDb(c.env.DB);

    // Uniqueness check for registration number
    const existingReg = await db
      .select({ id: transportVehicles.id })
      .from(transportVehicles)
      .where(eq(transportVehicles.registrationNumber, registrationNumber))
      .limit(1);

    if (existingReg.length > 0) {
      return jsonError(
        c,
        "DUPLICATE_REGISTRATION",
        `Vehicle with registration number "${registrationNumber}" already exists`,
        409
      );
    }

    const now = new Date().toISOString();
    const id = `veh_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const newVehicle = {
      id,
      registrationNumber,
      vehicleType,
      capacity,
      driverName: driverName || null,
      driverPhone: driverPhone || null,
      status: status || "active",
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(transportVehicles).values(newVehicle);

    await logTransportAudit(c, "transport:vehicle:created", "transport_vehicle", id, {
      registrationNumber,
      vehicleType,
      capacity,
      driverName,
    });

    return jsonSuccess(c, newVehicle, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to create vehicle", 500);
  }
});

transportRoutesHandler.put("/vehicles/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = updateVehicleSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid vehicle update data", 400, parsed.error.flatten());
    }

    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Vehicle not found", 404);
    }

    const updates: Partial<typeof transportVehicles.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (parsed.data.vehicleType !== undefined) updates.vehicleType = parsed.data.vehicleType;
    if (parsed.data.capacity !== undefined) updates.capacity = parsed.data.capacity;
    if (parsed.data.driverName !== undefined) updates.driverName = parsed.data.driverName || null;
    if (parsed.data.driverPhone !== undefined) updates.driverPhone = parsed.data.driverPhone || null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;

    if (parsed.data.registrationNumber && parsed.data.registrationNumber !== existing[0].registrationNumber) {
      const regConflict = await db
        .select({ id: transportVehicles.id })
        .from(transportVehicles)
        .where(
          and(
            eq(transportVehicles.registrationNumber, parsed.data.registrationNumber),
            ne(transportVehicles.id, id)
          )
        )
        .limit(1);
      if (regConflict.length > 0) {
        return jsonError(
          c,
          "DUPLICATE_REGISTRATION",
          `Vehicle with registration number "${parsed.data.registrationNumber}" already exists`,
          409
        );
      }
      updates.registrationNumber = parsed.data.registrationNumber;
    }

    await db.update(transportVehicles).set(updates).where(eq(transportVehicles.id, id));

    await logTransportAudit(c, "transport:vehicle:updated", "transport_vehicle", id, updates);

    const updated = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    return jsonSuccess(c, updated[0]);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to update vehicle", 500);
  }
});

transportRoutesHandler.post("/vehicles/:id/activate", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Vehicle not found", 404);
    }

    await db
      .update(transportVehicles)
      .set({ status: "active", updatedAt: new Date().toISOString() })
      .where(eq(transportVehicles.id, id));

    await logTransportAudit(c, "transport:vehicle:activated", "transport_vehicle", id);

    return jsonSuccess(c, { message: "Vehicle activated successfully", id, status: "active" });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to activate vehicle", 500);
  }
});

transportRoutesHandler.post("/vehicles/:id/deactivate", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Vehicle not found", 404);
    }

    await db
      .update(transportVehicles)
      .set({ status: "inactive", updatedAt: new Date().toISOString() })
      .where(eq(transportVehicles.id, id));

    await logTransportAudit(c, "transport:vehicle:deactivated", "transport_vehicle", id);

    return jsonSuccess(c, { message: "Vehicle deactivated successfully", id, status: "inactive" });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to deactivate vehicle", 500);
  }
});

// Delete vehicle:
// - HR: blocked if any assignments exist (historical or active)
// - ADMIN: force-deletes the vehicle AND nullifies vehicle reference in assignments
transportRoutesHandler.delete("/vehicles/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const user = c.get("user")!;
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(transportVehicles)
      .where(eq(transportVehicles.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Vehicle not found", 404);
    }

    const isAdmin = user.role === ROLES.ADMIN;

    const assignmentCountResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.vehicleId, id));

    const assignmentCount = Number(assignmentCountResult[0]?.count ?? 0);

    if (assignmentCount > 0 && !isAdmin) {
      return jsonError(
        c,
        "VEHICLE_HAS_ASSIGNMENTS",
        "Cannot delete vehicle with existing assignments. Please deactivate the vehicle instead.",
        400
      );
    }

    // Admin: nullify vehicle reference in assignments so assignments are preserved
    if (assignmentCount > 0 && isAdmin) {
      await db
        .update(employeeTransportAssignments)
        .set({ vehicleId: null, updatedAt: new Date().toISOString() })
        .where(eq(employeeTransportAssignments.vehicleId, id));
    }

    await db.delete(transportVehicles).where(eq(transportVehicles.id, id));
    await logTransportAudit(c, isAdmin ? "transport:vehicle:hard_deleted" : "transport:vehicle:deleted", "transport_vehicle", id, {
      registrationNumber: existing[0].registrationNumber,
      assignmentsUpdated: isAdmin ? assignmentCount : 0,
    });

    return jsonSuccess(c, {
      message: isAdmin && assignmentCount > 0
        ? `Vehicle deleted; ${assignmentCount} assignment(s) had their vehicle reference cleared`
        : "Vehicle deleted successfully",
      id,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to delete vehicle", 500);
  }
});

// ==========================================
// 4. ASSIGNMENTS
// ==========================================

transportRoutesHandler.get("/assignments", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const db = getDb(c.env.DB);
    const employeeId = c.req.query("employeeId");
    const routeId = c.req.query("routeId");
    const vehicleId = c.req.query("vehicleId");
    const status = c.req.query("status");
    const search = c.req.query("search")?.trim().toLowerCase();

    let conditions = [];

    if (employeeId) {
      conditions.push(eq(employeeTransportAssignments.employeeId, employeeId));
    }
    if (routeId) {
      conditions.push(eq(employeeTransportAssignments.routeId, routeId));
    }
    if (vehicleId) {
      conditions.push(eq(employeeTransportAssignments.vehicleId, vehicleId));
    }
    if (status && status !== "all") {
      conditions.push(eq(employeeTransportAssignments.status, status));
    }

    if (search) {
      conditions.push(
        or(
          like(sql`lower(${employees.fullName})`, `%${search}%`),
          like(sql`lower(${employees.employeeCode})`, `%${search}%`),
          like(sql`lower(${employees.employeeId})`, `%${search}%`),
          like(sql`lower(${transportRoutes.name})`, `%${search}%`),
          like(sql`lower(${transportRoutes.code})`, `%${search}%`),
          like(sql`lower(coalesce(${transportVehicles.registrationNumber}, ''))`, `%${search}%`),
          like(sql`lower(coalesce(${employeeTransportAssignments.pickupPoint}, ''))`, `%${search}%`)
        )
      );
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const rows = await db
      .select({
        assignment: employeeTransportAssignments,
        employee: {
          id: employees.id,
          employeeCode: employees.employeeCode,
          employeeId: employees.employeeId,
          fullName: employees.fullName,
          localMobile: employees.localMobile,
          localEmail: employees.localEmail,
          employmentStatus: employees.employmentStatus,
        },
        route: {
          id: transportRoutes.id,
          name: transportRoutes.name,
          code: transportRoutes.code,
          destinationBranchId: transportRoutes.destinationBranchId,
        },
        vehicle: {
          id: transportVehicles.id,
          registrationNumber: transportVehicles.registrationNumber,
          vehicleType: transportVehicles.vehicleType,
          driverName: transportVehicles.driverName,
          driverPhone: transportVehicles.driverPhone,
        },
      })
      .from(employeeTransportAssignments)
      .leftJoin(employees, eq(employeeTransportAssignments.employeeId, employees.id))
      .leftJoin(transportRoutes, eq(employeeTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(employeeTransportAssignments.vehicleId, transportVehicles.id))
      .where(whereClause)
      .orderBy(desc(employeeTransportAssignments.effectiveFrom), desc(employeeTransportAssignments.createdAt));

    const result = rows.map((r) => ({
      ...r.assignment,
      employee: r.employee,
      route: r.route,
      vehicle: r.vehicle?.id ? r.vehicle : null,
    }));

    return jsonSuccess(c, result);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to list assignments", 500);
  }
});

transportRoutesHandler.get("/assignments/employee/:employeeId/current", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);
    const today = new Date().toISOString().split("T")[0];

    const rows = await db
      .select({
        assignment: employeeTransportAssignments,
        employee: {
          id: employees.id,
          employeeCode: employees.employeeCode,
          employeeId: employees.employeeId,
          fullName: employees.fullName,
          localMobile: employees.localMobile,
          localEmail: employees.localEmail,
          employmentStatus: employees.employmentStatus,
        },
        route: {
          id: transportRoutes.id,
          name: transportRoutes.name,
          code: transportRoutes.code,
          destinationBranchId: transportRoutes.destinationBranchId,
        },
        vehicle: {
          id: transportVehicles.id,
          registrationNumber: transportVehicles.registrationNumber,
          vehicleType: transportVehicles.vehicleType,
          driverName: transportVehicles.driverName,
          driverPhone: transportVehicles.driverPhone,
        },
      })
      .from(employeeTransportAssignments)
      .leftJoin(employees, eq(employeeTransportAssignments.employeeId, employees.id))
      .leftJoin(transportRoutes, eq(employeeTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(employeeTransportAssignments.vehicleId, transportVehicles.id))
      .where(
        and(
          eq(employeeTransportAssignments.employeeId, employeeId),
          eq(employeeTransportAssignments.status, "active"),
          sql`${employeeTransportAssignments.effectiveFrom} <= ${today}`,
          or(
            sql`${employeeTransportAssignments.effectiveTo} IS NULL`,
            sql`${employeeTransportAssignments.effectiveTo} >= ${today}`
          )
        )
      )
      .orderBy(desc(employeeTransportAssignments.effectiveFrom))
      .limit(1);

    if (rows.length === 0) return jsonSuccess(c, null);

    const r = rows[0];
    return jsonSuccess(c, {
      ...r.assignment,
      employee: r.employee,
      route: r.route,
      vehicle: r.vehicle?.id ? r.vehicle : null,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to get current assignment", 500);
  }
});

transportRoutesHandler.get("/assignments/employee/:employeeId/history", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const employeeId = c.req.param("employeeId");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        assignment: employeeTransportAssignments,
        route: {
          id: transportRoutes.id,
          name: transportRoutes.name,
          code: transportRoutes.code,
        },
        vehicle: {
          id: transportVehicles.id,
          registrationNumber: transportVehicles.registrationNumber,
          vehicleType: transportVehicles.vehicleType,
          driverName: transportVehicles.driverName,
          driverPhone: transportVehicles.driverPhone,
        },
      })
      .from(employeeTransportAssignments)
      .leftJoin(transportRoutes, eq(employeeTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(employeeTransportAssignments.vehicleId, transportVehicles.id))
      .where(eq(employeeTransportAssignments.employeeId, employeeId))
      .orderBy(desc(employeeTransportAssignments.effectiveFrom), desc(employeeTransportAssignments.createdAt));

    const result = rows.map((r) => ({
      ...r.assignment,
      route: r.route,
      vehicle: r.vehicle?.id ? r.vehicle : null,
    }));

    return jsonSuccess(c, result);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to get assignment history", 500);
  }
});

transportRoutesHandler.get("/assignments/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const rows = await db
      .select({
        assignment: employeeTransportAssignments,
        employee: {
          id: employees.id,
          employeeCode: employees.employeeCode,
          employeeId: employees.employeeId,
          fullName: employees.fullName,
          localMobile: employees.localMobile,
          localEmail: employees.localEmail,
          employmentStatus: employees.employmentStatus,
        },
        route: {
          id: transportRoutes.id,
          name: transportRoutes.name,
          code: transportRoutes.code,
          destinationBranchId: transportRoutes.destinationBranchId,
        },
        vehicle: {
          id: transportVehicles.id,
          registrationNumber: transportVehicles.registrationNumber,
          vehicleType: transportVehicles.vehicleType,
          driverName: transportVehicles.driverName,
          driverPhone: transportVehicles.driverPhone,
        },
      })
      .from(employeeTransportAssignments)
      .leftJoin(employees, eq(employeeTransportAssignments.employeeId, employees.id))
      .leftJoin(transportRoutes, eq(employeeTransportAssignments.routeId, transportRoutes.id))
      .leftJoin(transportVehicles, eq(employeeTransportAssignments.vehicleId, transportVehicles.id))
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    if (rows.length === 0) {
      return jsonError(c, "NOT_FOUND", "Assignment not found", 404);
    }

    const r = rows[0];
    return jsonSuccess(c, {
      ...r.assignment,
      employee: r.employee,
      route: r.route,
      vehicle: r.vehicle?.id ? r.vehicle : null,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to get assignment", 500);
  }
});

transportRoutesHandler.post("/assignments", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const body = await c.req.json().catch(() => null);
    const parsed = createAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid assignment data", 400, parsed.error.flatten());
    }

    const {
      employeeId,
      routeId,
      vehicleId,
      pickupPoint,
      accommodation,
      shift = "GENERAL",
      effectiveFrom,
      effectiveTo,
      status = "active",
      notes,
    } = parsed.data;

    const db = getDb(c.env.DB);

    // Rule 1 & Rule 9: Employee must exist and not be inactive/terminated
    const employeeRows = await db
      .select({
        id: employees.id,
        fullName: employees.fullName,
        employmentStatus: employees.employmentStatus,
      })
      .from(employees)
      .where(eq(employees.id, employeeId))
      .limit(1);

    if (employeeRows.length === 0) {
      return jsonError(c, "EMPLOYEE_NOT_FOUND", "Employee does not exist", 404);
    }

    const emp = employeeRows[0];
    const inactiveStatuses = ["inactive", "terminated", "resigned"];
    if (inactiveStatuses.includes(emp.employmentStatus.toLowerCase())) {
      return jsonError(
        c,
        "EMPLOYEE_NOT_ACTIVE",
        `Cannot assign transport to an inactive or terminated employee (status: ${emp.employmentStatus})`,
        400
      );
    }

    // Rule 2: Route must exist and be ACTIVE
    const routeRows = await db
      .select({ id: transportRoutes.id, status: transportRoutes.status, name: transportRoutes.name })
      .from(transportRoutes)
      .where(eq(transportRoutes.id, routeId))
      .limit(1);

    if (routeRows.length === 0) {
      return jsonError(c, "ROUTE_NOT_FOUND", "Route does not exist", 404);
    }

    if (routeRows[0].status !== "active") {
      return jsonError(c, "ROUTE_INACTIVE", `Selected route "${routeRows[0].name}" is inactive`, 400);
    }

    // Rule 3: Vehicle, if provided, must exist and be ACTIVE
    if (vehicleId) {
      const vehicleRows = await db
        .select({
          id: transportVehicles.id,
          status: transportVehicles.status,
          registrationNumber: transportVehicles.registrationNumber,
        })
        .from(transportVehicles)
        .where(eq(transportVehicles.id, vehicleId))
        .limit(1);

      if (vehicleRows.length === 0) {
        return jsonError(c, "VEHICLE_NOT_FOUND", "Vehicle does not exist", 404);
      }

      if (vehicleRows[0].status !== "active") {
        return jsonError(
          c,
          "VEHICLE_INACTIVE",
          `Selected vehicle "${vehicleRows[0].registrationNumber}" is inactive`,
          400
        );
      }

      const vehicleCapacity = (await db
        .select({ capacity: transportVehicles.capacity })
        .from(transportVehicles)
        .where(eq(transportVehicles.id, vehicleId))
        .limit(1))[0]?.capacity ?? 0;
      const activeVehicleAssignments = await db
        .select({ count: sql<number>`count(*)` })
        .from(employeeTransportAssignments)
        .where(
          and(
            eq(employeeTransportAssignments.vehicleId, vehicleId),
            eq(employeeTransportAssignments.status, "active")
          )
        );
      if (Number(activeVehicleAssignments[0]?.count ?? 0) >= vehicleCapacity) {
        return jsonError(c, "VEHICLE_CAPACITY_EXCEEDED", "Selected vehicle has reached its passenger capacity", 409);
      }
    }

    // Rule 4, 6, 7: An employee should not have multiple overlapping ACTIVE transport assignments.
    // Check overlapping ACTIVE assignments for this employee
    if (status === "active") {
      const newStart = effectiveFrom;
      const newEnd = effectiveTo && effectiveTo.trim() !== "" ? effectiveTo : "9999-12-31";

      const existingActiveAssignments = await db
        .select()
        .from(employeeTransportAssignments)
        .where(
          and(
            eq(employeeTransportAssignments.employeeId, employeeId),
            eq(employeeTransportAssignments.status, "active")
          )
        );

      const hasOverlap = existingActiveAssignments.some((existing) => {
        const existStart = existing.effectiveFrom;
        const existEnd = existing.effectiveTo && existing.effectiveTo.trim() !== "" ? existing.effectiveTo : "9999-12-31";
        // Two ranges [A, B] and [C, D] overlap if A <= D and C <= B
        return existStart <= newEnd && newStart <= existEnd;
      });

      if (hasOverlap) {
        return jsonError(
          c,
          "ASSIGNMENT_OVERLAP",
          "Employee already has an active transport assignment that overlaps with this period. Please end or replace the existing assignment first.",
          409
        );
      }
    }

    const now = new Date().toISOString();
    const id = `eta_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`;

    const newAssignment = {
      id,
      employeeId,
      routeId,
      vehicleId: vehicleId || null,
      pickupPoint: pickupPoint || null,
      accommodation: accommodation || null,
      shift,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      status,
      notes: notes || null,
      createdAt: now,
      updatedAt: now,
    };

    await db.insert(employeeTransportAssignments).values(newAssignment);

    await logTransportAudit(c, "transport:assignment:created", "transport_assignment", id, {
      employeeId,
      employeeName: emp.fullName,
      routeId,
      vehicleId,
      pickupPoint,
      accommodation,
      shift,
      effectiveFrom,
      effectiveTo,
    });

    return jsonSuccess(c, newAssignment, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to create assignment", 500);
  }
});

transportRoutesHandler.put("/assignments/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = updateAssignmentSchema.safeParse(body);
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid assignment update data", 400, parsed.error.flatten());
    }

    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Assignment not found", 404);
    }

    const assignment = existing[0];

    // Check route if changed
    if (parsed.data.routeId && parsed.data.routeId !== assignment.routeId) {
      const routeRows = await db
        .select({ id: transportRoutes.id, status: transportRoutes.status, name: transportRoutes.name })
        .from(transportRoutes)
        .where(eq(transportRoutes.id, parsed.data.routeId))
        .limit(1);
      if (routeRows.length === 0) {
        return jsonError(c, "ROUTE_NOT_FOUND", "Route does not exist", 404);
      }
      if (routeRows[0].status !== "active") {
        return jsonError(c, "ROUTE_INACTIVE", `Route "${routeRows[0].name}" is inactive`, 400);
      }
    }

    // Check vehicle if changed
    if (parsed.data.vehicleId && parsed.data.vehicleId !== assignment.vehicleId) {
      const vehicleRows = await db
        .select({
          id: transportVehicles.id,
          status: transportVehicles.status,
          registrationNumber: transportVehicles.registrationNumber,
        })
        .from(transportVehicles)
        .where(eq(transportVehicles.id, parsed.data.vehicleId))
        .limit(1);
      if (vehicleRows.length === 0) {
        return jsonError(c, "VEHICLE_NOT_FOUND", "Vehicle does not exist", 404);
      }
      if (vehicleRows[0].status !== "active") {
        return jsonError(
          c,
          "VEHICLE_INACTIVE",
          `Vehicle "${vehicleRows[0].registrationNumber}" is inactive`,
          400
        );
      }
    }

    const targetStatus = parsed.data.status !== undefined ? parsed.data.status : assignment.status;
    const targetVehicleId = parsed.data.vehicleId !== undefined ? parsed.data.vehicleId : assignment.vehicleId;
    const targetStart = parsed.data.effectiveFrom !== undefined ? parsed.data.effectiveFrom : assignment.effectiveFrom;
    const targetEnd =
      parsed.data.effectiveTo !== undefined
        ? parsed.data.effectiveTo && parsed.data.effectiveTo.trim() !== ""
          ? parsed.data.effectiveTo
          : null
        : assignment.effectiveTo;

    // Check date consistency
    if (targetEnd && targetEnd < targetStart) {
      return jsonError(c, "VALIDATION_ERROR", "Effective to date cannot be before effective from date", 400);
    }

    // Check overlap if active
    if (targetStatus === "active") {
      const newStart = targetStart;
      const newEnd = targetEnd || "9999-12-31";

      const otherActive = await db
        .select()
        .from(employeeTransportAssignments)
        .where(
          and(
            eq(employeeTransportAssignments.employeeId, assignment.employeeId),
            eq(employeeTransportAssignments.status, "active"),
            ne(employeeTransportAssignments.id, id)
          )
        );

      const hasOverlap = otherActive.some((other) => {
        const existStart = other.effectiveFrom;
        const existEnd = other.effectiveTo && other.effectiveTo.trim() !== "" ? other.effectiveTo : "9999-12-31";
        return existStart <= newEnd && newStart <= existEnd;
      });

      if (hasOverlap) {
        return jsonError(
          c,
          "ASSIGNMENT_OVERLAP",
          "Update would cause an overlap with another active transport assignment for this employee",
          409
        );
      }

      if (targetVehicleId) {
        const vehicleCapacity = (await db
          .select({ capacity: transportVehicles.capacity })
          .from(transportVehicles)
          .where(eq(transportVehicles.id, targetVehicleId))
          .limit(1))[0]?.capacity ?? 0;
        const activeVehicleAssignments = await db
          .select({ count: sql<number>`count(*)` })
          .from(employeeTransportAssignments)
          .where(
            and(
              eq(employeeTransportAssignments.vehicleId, targetVehicleId),
              eq(employeeTransportAssignments.status, "active"),
              ne(employeeTransportAssignments.id, id),
              sql`${employeeTransportAssignments.effectiveFrom} <= ${targetEnd}`,
              or(
                sql`${employeeTransportAssignments.effectiveTo} IS NULL`,
                sql`${employeeTransportAssignments.effectiveTo} >= ${targetStart}`
              )
            )
          );
        if (Number(activeVehicleAssignments[0]?.count ?? 0) >= vehicleCapacity) {
          return jsonError(c, "VEHICLE_CAPACITY_EXCEEDED", "Selected vehicle has reached its passenger capacity", 409);
        }
      }
    }

    const updates: Partial<typeof employeeTransportAssignments.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };

    if (parsed.data.routeId !== undefined) updates.routeId = parsed.data.routeId;
    if (parsed.data.vehicleId !== undefined) updates.vehicleId = parsed.data.vehicleId || null;
    if (parsed.data.pickupPoint !== undefined) updates.pickupPoint = parsed.data.pickupPoint || null;
    if (parsed.data.accommodation !== undefined) updates.accommodation = parsed.data.accommodation || null;
    if (parsed.data.shift !== undefined) updates.shift = parsed.data.shift;
    if (parsed.data.effectiveFrom !== undefined) updates.effectiveFrom = parsed.data.effectiveFrom;
    if (parsed.data.effectiveTo !== undefined) updates.effectiveTo = parsed.data.effectiveTo || null;
    if (parsed.data.status !== undefined) updates.status = parsed.data.status;
    if (parsed.data.notes !== undefined) updates.notes = parsed.data.notes || null;

    await db
      .update(employeeTransportAssignments)
      .set(updates)
      .where(eq(employeeTransportAssignments.id, id));

    await logTransportAudit(c, "transport:assignment:updated", "transport_assignment", id, {
      employeeId: assignment.employeeId,
      updates,
    });

    const updated = await db
      .select()
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    return jsonSuccess(c, updated[0]);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to update assignment", 500);
  }
});

transportRoutesHandler.post("/assignments/:id/end", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const id = c.req.param("id");
    const body = await c.req.json().catch(() => null);
    const parsed = endAssignmentSchema.safeParse(body || {});
    if (!parsed.success) {
      return jsonError(c, "VALIDATION_ERROR", "Invalid end assignment data", 400, parsed.error.flatten());
    }

    const db = getDb(c.env.DB);
    const existing = await db
      .select()
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Assignment not found", 404);
    }

    const assignment = existing[0];
    if (assignment.status === "ended") {
      return jsonError(c, "ASSIGNMENT_ALREADY_ENDED", "Assignment has already ended", 400);
    }

    const today = new Date().toISOString().split("T")[0];
    let effectiveTo = parsed.data.effectiveTo || today;
    if (effectiveTo < assignment.effectiveFrom) {
      effectiveTo = assignment.effectiveFrom;
    }

    const updates: Partial<typeof employeeTransportAssignments.$inferInsert> = {
      status: "ended",
      effectiveTo,
      updatedAt: new Date().toISOString(),
    };
    if (parsed.data.notes) {
      updates.notes = parsed.data.notes;
    }

    await db
      .update(employeeTransportAssignments)
      .set(updates)
      .where(eq(employeeTransportAssignments.id, id));

    await logTransportAudit(c, "transport:assignment:ended", "transport_assignment", id, {
      employeeId: assignment.employeeId,
      routeId: assignment.routeId,
      effectiveTo,
    });

    const updated = await db
      .select()
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    return jsonSuccess(c, updated[0]);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to end assignment", 500);
  }
});

// ==========================================
// 5. ADMIN HARD DELETE — ASSIGNMENTS
// ==========================================

/**
 * DELETE /api/transport/assignments/:id
 * ADMIN-only: permanently remove a single transport assignment record.
 */
transportRoutesHandler.delete("/assignments/:id", requireRole(ROLES.ADMIN), async (c) => {
  try {
    const id = c.req.param("id");
    const db = getDb(c.env.DB);

    const existing = await db
      .select()
      .from(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id))
      .limit(1);

    if (existing.length === 0) {
      return jsonError(c, "NOT_FOUND", "Assignment not found", 404);
    }

    const assignment = existing[0];

    await db
      .delete(employeeTransportAssignments)
      .where(eq(employeeTransportAssignments.id, id));

    await logTransportAudit(c, "transport:assignment:hard_deleted", "transport_assignment", id, {
      employeeId: assignment.employeeId,
      routeId: assignment.routeId,
      vehicleId: assignment.vehicleId,
      status: assignment.status,
    });

    return jsonSuccess(c, {
      deleted: true,
      message: "Assignment permanently deleted",
      id,
    });
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to delete assignment", 500);
  }
});

// ==========================================
// 6. ROUTE STOPS & DAILY TRIPS
// ==========================================

transportRoutesHandler.get("/routes/:routeId/stops", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select().from(transportRouteStops)
    .where(eq(transportRouteStops.routeId, c.req.param("routeId")))
    .orderBy(asc(transportRouteStops.sequence));
  return jsonSuccess(c, rows);
});

transportRoutesHandler.post("/routes/:routeId/stops", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const parsed = createRouteStopSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid route stop data", 400, parsed.error.flatten());
    const db = getDb(c.env.DB);
    const routeId = c.req.param("routeId");
    const route = await db.select({ id: transportRoutes.id }).from(transportRoutes).where(eq(transportRoutes.id, routeId)).limit(1);
    if (!route.length) return jsonError(c, "NOT_FOUND", "Route not found", 404);
    const now = new Date().toISOString();
    const stop = { id: `stop_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, routeId, ...parsed.data, pickupTime: parsed.data.pickupTime || null, dropoffTime: parsed.data.dropoffTime || null, createdAt: now, updatedAt: now };
    await db.insert(transportRouteStops).values(stop);
    return jsonSuccess(c, stop, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to create route stop", 500);
  }
});

transportRoutesHandler.put("/route-stops/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  const parsed = updateRouteStopSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid route stop data", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select().from(transportRouteStops).where(eq(transportRouteStops.id, id)).limit(1);
  if (!existing.length) return jsonError(c, "NOT_FOUND", "Route stop not found", 404);
  await db.update(transportRouteStops).set({ ...parsed.data, pickupTime: parsed.data.pickupTime || null, dropoffTime: parsed.data.dropoffTime || null, updatedAt: new Date().toISOString() }).where(eq(transportRouteStops.id, id));
  const updated = await db.select().from(transportRouteStops).where(eq(transportRouteStops.id, id)).limit(1);
  return jsonSuccess(c, updated[0]);
});

transportRoutesHandler.delete("/route-stops/:id", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  const db = getDb(c.env.DB);
  const id = c.req.param("id");
  const existing = await db.select({ id: transportRouteStops.id }).from(transportRouteStops).where(eq(transportRouteStops.id, id)).limit(1);
  if (!existing.length) return jsonError(c, "NOT_FOUND", "Route stop not found", 404);
  await db.delete(transportRouteStops).where(eq(transportRouteStops.id, id));
  return jsonSuccess(c, { deleted: true, id });
});

transportRoutesHandler.get("/trips", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  const db = getDb(c.env.DB);
  const serviceDate = c.req.query("serviceDate");
  const conditions = serviceDate ? [eq(transportTrips.serviceDate, serviceDate)] : [];
  const rows = await db.select({
    trip: transportTrips,
    route: { id: transportRoutes.id, name: transportRoutes.name, code: transportRoutes.code },
    vehicle: { id: transportVehicles.id, registrationNumber: transportVehicles.registrationNumber, vehicleType: transportVehicles.vehicleType },
    passengerCount: sql<number>`(SELECT count(*) FROM transport_trip_passengers WHERE transport_trip_passengers.trip_id = ${transportTrips.id})`,
    boardedCount: sql<number>`(SELECT count(*) FROM transport_trip_passengers WHERE transport_trip_passengers.trip_id = ${transportTrips.id} AND transport_trip_passengers.boarding_status = 'boarded')`,
  }).from(transportTrips)
    .leftJoin(transportRoutes, eq(transportTrips.routeId, transportRoutes.id))
    .leftJoin(transportVehicles, eq(transportTrips.vehicleId, transportVehicles.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(transportTrips.serviceDate), asc(transportTrips.shift));
  return jsonSuccess(c, rows.map((row) => ({ ...row.trip, route: row.route, vehicle: row.vehicle?.id ? row.vehicle : null, passengerCount: Number(row.passengerCount || 0), boardedCount: Number(row.boardedCount || 0) })));
});

transportRoutesHandler.post("/trips", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  try {
    const parsed = createTransportTripSchema.safeParse(await c.req.json().catch(() => null));
    if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid transport trip data", 400, parsed.error.flatten());
    const db = getDb(c.env.DB);
    const data = parsed.data;
    const route = await db.select().from(transportRoutes).where(eq(transportRoutes.id, data.routeId)).limit(1);
    if (!route.length || route[0].status !== "active") return jsonError(c, "ROUTE_INACTIVE", "Route must be active", 400);
    let vehicle: typeof transportVehicles.$inferSelect | undefined;
    if (data.vehicleId) {
      vehicle = (await db.select().from(transportVehicles).where(eq(transportVehicles.id, data.vehicleId)).limit(1))[0];
      if (!vehicle || vehicle.status !== "active") return jsonError(c, "VEHICLE_INACTIVE", "Vehicle must be active", 400);
    }
    const assignments = await db.select().from(employeeTransportAssignments).where(and(
      eq(employeeTransportAssignments.routeId, data.routeId),
      eq(employeeTransportAssignments.shift, data.shift),
      eq(employeeTransportAssignments.status, "active"),
      sql`${employeeTransportAssignments.effectiveFrom} <= ${data.serviceDate}`,
      or(sql`${employeeTransportAssignments.effectiveTo} IS NULL`, sql`${employeeTransportAssignments.effectiveTo} >= ${data.serviceDate}`)
    ));
    if (vehicle && assignments.length > vehicle.capacity) return jsonError(c, "VEHICLE_CAPACITY_EXCEEDED", "Vehicle capacity is lower than the assigned labour roster", 409);
    const duplicate = await db.select({ id: transportTrips.id }).from(transportTrips).where(and(eq(transportTrips.routeId, data.routeId), eq(transportTrips.serviceDate, data.serviceDate), eq(transportTrips.shift, data.shift), eq(transportTrips.direction, data.direction))).limit(1);
    if (duplicate.length) return jsonError(c, "TRIP_EXISTS", "A trip already exists for this route, date, shift, and direction", 409);
    const now = new Date().toISOString();
    const trip = { id: `trip_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, routeId: data.routeId, vehicleId: data.vehicleId || null, serviceDate: data.serviceDate, shift: data.shift, direction: data.direction, driverName: vehicle?.driverName || null, driverPhone: vehicle?.driverPhone || null, status: "planned", notes: data.notes || null, createdAt: now, updatedAt: now } as const;
    await db.insert(transportTrips).values(trip);
    if (assignments.length) {
      await db.insert(transportTripPassengers).values(assignments.map((assignment) => ({ id: `pass_${crypto.randomUUID().replace(/-/g, "").slice(0, 12)}`, tripId: trip.id, employeeId: assignment.employeeId, assignmentId: assignment.id, boardingStatus: "planned" as const, boardedAt: null, notes: null, createdAt: now, updatedAt: now })));
    }
    return jsonSuccess(c, { ...trip, passengerCount: assignments.length }, 201);
  } catch (error: any) {
    return jsonError(c, "INTERNAL_ERROR", error.message || "Failed to create transport trip", 500);
  }
});

transportRoutesHandler.get("/trips/:id/passengers", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_READ), async (c) => {
  const db = getDb(c.env.DB);
  const rows = await db.select({ passenger: transportTripPassengers, employee: { id: employees.id, employeeCode: employees.employeeCode, fullName: employees.fullName } }).from(transportTripPassengers).leftJoin(employees, eq(transportTripPassengers.employeeId, employees.id)).where(eq(transportTripPassengers.tripId, c.req.param("id"))).orderBy(asc(employees.fullName));
  return jsonSuccess(c, rows.map((row) => ({ ...row.passenger, employee: row.employee })));
});

transportRoutesHandler.patch("/trips/:tripId/passengers/:passengerId", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  const parsed = updateBoardingStatusSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid boarding status", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const passenger = await db.select().from(transportTripPassengers).where(and(eq(transportTripPassengers.id, c.req.param("passengerId")), eq(transportTripPassengers.tripId, c.req.param("tripId")))).limit(1);
  if (!passenger.length) return jsonError(c, "NOT_FOUND", "Trip passenger not found", 404);
  await db.update(transportTripPassengers).set({ ...parsed.data, boardedAt: parsed.data.boardingStatus === "boarded" ? new Date().toISOString() : null, updatedAt: new Date().toISOString() }).where(eq(transportTripPassengers.id, c.req.param("passengerId")));
  return jsonSuccess(c, { id: c.req.param("passengerId"), ...parsed.data });
});

transportRoutesHandler.patch("/trips/:id/status", requirePermissionMiddleware(PERMISSIONS.TRANSPORT_MANAGE), async (c) => {
  const parsed = updateTripStatusSchema.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return jsonError(c, "VALIDATION_ERROR", "Invalid trip status", 400, parsed.error.flatten());
  const db = getDb(c.env.DB);
  const existing = await db.select().from(transportTrips).where(eq(transportTrips.id, c.req.param("id"))).limit(1);
  if (!existing.length) return jsonError(c, "NOT_FOUND", "Transport trip not found", 404);
  await db.update(transportTrips).set({ status: parsed.data.status, notes: parsed.data.notes ?? existing[0].notes, updatedAt: new Date().toISOString() }).where(eq(transportTrips.id, c.req.param("id")));
  return jsonSuccess(c, { ...existing[0], ...parsed.data });
});

