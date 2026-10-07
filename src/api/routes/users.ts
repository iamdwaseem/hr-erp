import { Hono } from "hono";
import { eq, and, count, ne } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { requireRole } from "../middleware/rbac";
import { ROLES, USER_QUOTAS, type UserRole } from "../../shared/constants/roles";
import { getDb } from "../db/client";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { createUserSchema, updateUserSchema, resetPasswordSchema } from "../../shared/schemas/user";
import { hashPassword } from "../utils/password";
import { jsonSuccess, jsonError } from "../utils/response";
import type { SafeUser } from "../../shared/types/auth";

export const usersRoutes = new Hono<AppContext>();

// Strict authorization: ALL user administration endpoints require ADMIN role
usersRoutes.use("*", requireAuth(), requireRole(ROLES.ADMIN));

/**
 * GET /api/users
 * Returns list of all system users (never exposing password hashes).
 */
usersRoutes.get("/", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const allUsers = await db
      .select({
        id: users.id,
        email: users.email,
        fullName: users.fullName,
        role: users.role,
        isActive: users.isActive,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users);

    const safeUsers: SafeUser[] = allUsers.map((u) => ({
      ...u,
      role: u.role as UserRole,
    }));

    return jsonSuccess(c, safeUsers);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to list users",
      500
    );
  }
});

/**
 * POST /api/users
 * Create a new user account.
 * Strict rules:
 * - Only HR accounts can be created (cannot create a second ADMIN).
 * - Maximum 5 active HR accounts allowed in the entire system.
 */
usersRoutes.post("/", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = createUserSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid user creation payload",
      400,
      parseResult.error.flatten()
    );
  }

  const { email, fullName, password, role } = parseResult.data;
  const adminUser = c.get("user")!;
  const db = getDb(c.env.DB);

  // Rule: Cannot create second ADMIN
  if (role !== ROLES.HR) {
    return jsonError(
      c,
      "INVALID_ROLE",
      "Only HR user accounts can be created. Second Admin accounts are forbidden.",
      400
    );
  }

  const normalizedEmail = email.toLowerCase().trim();

  try {
    // Rule: Check if email already exists
    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);

    if (existing.length > 0) {
      return jsonError(
        c,
        "DUPLICATE_EMAIL",
        "A user with this email address already exists",
        400
      );
    }

    // Rule: Maximum 5 active HR accounts
    const activeHrCountResult = await db
      .select({ count: count() })
      .from(users)
      .where(and(eq(users.role, ROLES.HR), eq(users.isActive, true)));

    const activeHrCount = activeHrCountResult[0]?.count ?? 0;
    if (activeHrCount >= USER_QUOTAS.MAX_ACTIVE_HR) {
      return jsonError(
        c,
        "HR_LIMIT_EXCEEDED",
        `Maximum ${USER_QUOTAS.MAX_ACTIVE_HR} active HR user accounts allowed. Please deactivate an existing HR user before creating a new one.`,
        400
      );
    }

    const newId = `usr_hr_${crypto.randomUUID().replace(/-/g, "").substring(0, 12)}`;
    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    await db.insert(users).values({
      id: newId,
      email: normalizedEmail,
      passwordHash: hashedPassword,
      fullName: fullName.trim(),
      role: ROLES.HR,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminUser.sub,
        action: "USER_CREATED",
        resourceType: "users",
        resourceId: newId,
        details: JSON.stringify({ email: normalizedEmail, fullName: fullName.trim(), role: ROLES.HR }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const createdUser: SafeUser = {
      id: newId,
      email: normalizedEmail,
      fullName: fullName.trim(),
      role: ROLES.HR,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    };

    return jsonSuccess(c, createdUser, 201);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to create user",
      500
    );
  }
});

/**
 * PUT /api/users/:id
 * Edit display name or login email of a user.
 */
usersRoutes.put("/:id", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = updateUserSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid user update payload",
      400,
      parseResult.error.flatten()
    );
  }

  const { fullName, email } = parseResult.data;
  const adminUser = c.get("user")!;
  const db = getDb(c.env.DB);

  try {
    const existingUsers = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const targetUser = existingUsers[0];
    if (!targetUser) {
      return jsonError(c, "NOT_FOUND", "User not found", 404);
    }

    const updates: Partial<typeof users.$inferInsert> = {
      updatedAt: new Date().toISOString(),
    };
    let emailChanged = false;

    if (fullName !== undefined) {
      updates.fullName = fullName.trim();
    }

    if (email !== undefined) {
      const normalizedEmail = email.toLowerCase().trim();
      if (normalizedEmail !== targetUser.email) {
        const emailCheck = await db
          .select({ id: users.id })
          .from(users)
          .where(and(eq(users.email, normalizedEmail), ne(users.id, id)))
          .limit(1);

        if (emailCheck.length > 0) {
          return jsonError(c, "DUPLICATE_EMAIL", "A user with this email address already exists", 400);
        }

        updates.email = normalizedEmail;
        emailChanged = true;
      }
    }

    await db.update(users).set(updates).where(eq(users.id, id));

    const updatedUser: SafeUser = {
      id: targetUser.id,
      email: (updates.email as string) || targetUser.email,
      fullName: (updates.fullName as string) || targetUser.fullName,
      role: targetUser.role as UserRole,
      isActive: targetUser.isActive,
      createdAt: targetUser.createdAt,
      updatedAt: updates.updatedAt!,
    };

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminUser.sub,
        action: emailChanged ? "USER_LOGIN_ID_CHANGED" : "USER_UPDATED",
        resourceType: "users",
        resourceId: id,
        details: JSON.stringify({
          previousEmail: emailChanged ? targetUser.email : undefined,
          newEmail: emailChanged ? updates.email : undefined,
          fullName: updates.fullName,
        }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: updates.updatedAt!,
      });
    } catch {
      // Non-blocking
    }

    return jsonSuccess(c, updatedUser);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to update user",
      500
    );
  }
});

/**
 * POST /api/users/:id/reset-password
 * Reset an HR user's password.
 */
usersRoutes.post("/:id/reset-password", async (c) => {
  const id = c.req.param("id");
  const body = await c.req.json().catch(() => null);
  const parseResult = resetPasswordSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid password payload",
      400,
      parseResult.error.flatten()
    );
  }

  const password = parseResult.data.password || parseResult.data.newPassword;
  if (!password) {
    return jsonError(c, "VALIDATION_ERROR", "Password is required", 400);
  }
  const adminUser = c.get("user")!;
  const db = getDb(c.env.DB);

  try {
    const existingUsers = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const targetUser = existingUsers[0];
    if (!targetUser) {
      return jsonError(c, "NOT_FOUND", "User not found", 404);
    }

    const hashedPassword = await hashPassword(password);
    const now = new Date().toISOString();

    await db
      .update(users)
      .set({
        passwordHash: hashedPassword,
        updatedAt: now,
      })
      .where(eq(users.id, id));

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminUser.sub,
        action: "USER_PASSWORD_RESET",
        resourceType: "users",
        resourceId: id,
        details: JSON.stringify({ targetEmail: targetUser.email }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    return jsonSuccess(c, { message: "Password reset successfully" });
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to reset password",
      500
    );
  }
});

/**
 * POST /api/users/:id/disable
 * Deactivate a user account.
 * Strict rule: The Admin account CANNOT be deactivated.
 */
usersRoutes.post("/:id/disable", async (c) => {
  const id = c.req.param("id");
  const adminUser = c.get("user")!;
  const db = getDb(c.env.DB);

  try {
    const existingUsers = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const targetUser = existingUsers[0];
    if (!targetUser) {
      return jsonError(c, "NOT_FOUND", "User not found", 404);
    }

    if (targetUser.role === ROLES.ADMIN) {
      return jsonError(
        c,
        "CANNOT_DISABLE_ADMIN",
        "The System Administrator account cannot be disabled",
        400
      );
    }

    const now = new Date().toISOString();
    await db.update(users).set({ isActive: false, updatedAt: now }).where(eq(users.id, id));

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminUser.sub,
        action: "USER_DISABLED",
        resourceType: "users",
        resourceId: id,
        details: JSON.stringify({ targetEmail: targetUser.email }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const updatedUser: SafeUser = {
      id: targetUser.id,
      email: targetUser.email,
      fullName: targetUser.fullName,
      role: targetUser.role as UserRole,
      isActive: false,
      createdAt: targetUser.createdAt,
      updatedAt: now,
    };

    return jsonSuccess(c, updatedUser);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to disable user",
      500
    );
  }
});

/**
 * POST /api/users/:id/enable
 * Reactivate an inactive user account.
 * Strict rule: Cannot exceed maximum 5 active HR users.
 */
usersRoutes.post("/:id/enable", async (c) => {
  const id = c.req.param("id");
  const adminUser = c.get("user")!;
  const db = getDb(c.env.DB);

  try {
    const existingUsers = await db.select().from(users).where(eq(users.id, id)).limit(1);
    const targetUser = existingUsers[0];
    if (!targetUser) {
      return jsonError(c, "NOT_FOUND", "User not found", 404);
    }

    if (targetUser.isActive) {
      const alreadyActive: SafeUser = {
        id: targetUser.id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role as UserRole,
        isActive: true,
        createdAt: targetUser.createdAt,
        updatedAt: targetUser.updatedAt,
      };
      return jsonSuccess(c, alreadyActive);
    }

    if (targetUser.role === ROLES.HR) {
      const activeHrCountResult = await db
        .select({ count: count() })
        .from(users)
        .where(and(eq(users.role, ROLES.HR), eq(users.isActive, true)));

      const activeHrCount = activeHrCountResult[0]?.count ?? 0;
      if (activeHrCount >= USER_QUOTAS.MAX_ACTIVE_HR) {
        return jsonError(
          c,
          "HR_LIMIT_EXCEEDED",
          `Maximum ${USER_QUOTAS.MAX_ACTIVE_HR} active HR user accounts allowed. Please deactivate an active HR user before re-enabling this account.`,
          400
        );
      }
    }

    const now = new Date().toISOString();
    await db.update(users).set({ isActive: true, updatedAt: now }).where(eq(users.id, id));

    // Record audit log
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: adminUser.sub,
        action: "USER_ENABLED",
        resourceType: "users",
        resourceId: id,
        details: JSON.stringify({ targetEmail: targetUser.email }),
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: now,
      });
    } catch {
      // Non-blocking
    }

    const updatedUser: SafeUser = {
      id: targetUser.id,
      email: targetUser.email,
      fullName: targetUser.fullName,
      role: targetUser.role as UserRole,
      isActive: true,
      createdAt: targetUser.createdAt,
      updatedAt: now,
    };

    return jsonSuccess(c, updatedUser);
  } catch (err) {
    return jsonError(
      c,
      "DB_ERROR",
      err instanceof Error ? err.message : "Failed to enable user",
      500
    );
  }
});
