import { Hono } from "hono";
import { eq } from "drizzle-orm";
import type { AppContext } from "../types";
import { loginSchema } from "../../shared/schemas/auth";
import { jsonSuccess, jsonError } from "../utils/response";
import { signJwt, verifyJwt } from "../utils/jwt";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../db/client";
import { users } from "../db/schema/users";
import { auditLogs } from "../db/schema/audit";
import { ROLES, type UserRole } from "../../shared/constants/roles";
import type { SafeUser } from "../../shared/types/auth";

import { verifyPassword } from "../utils/password";

export const authRoutes = new Hono<AppContext>();

// Exactly three authorized login accounts: 1 ADMIN and 2 HR
const DEMO_USERS: Record<
  string,
  { id: string; email: string; password: string; fullName: string; role: UserRole; isActive: boolean }
> = {
  "admin@hr-erp.local": {
    id: "usr_admin_default",
    email: "admin@hr-erp.local",
    password: "AdminPassword123!",
    fullName: "System Administrator",
    role: ROLES.ADMIN,
    isActive: true,
  },
  "hr@hr-erp.local": {
    id: "usr_hr_default",
    email: "hr@hr-erp.local",
    password: "HrPassword123!",
    fullName: "HR Specialist",
    role: ROLES.HR,
    isActive: true,
  },
  "hr2@hr-erp.local": {
    id: "usr_hr_2_default",
    email: "hr2@hr-erp.local",
    password: "Hr2Password123!",
    fullName: "HR Operations Lead",
    role: ROLES.HR,
    isActive: true,
  },
};

authRoutes.post("/login", async (c) => {
  const body = await c.req.json().catch(() => null);
  const parseResult = loginSchema.safeParse(body);
  if (!parseResult.success) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Invalid login parameters",
      400,
      parseResult.error.flatten()
    );
  }

  const { email, password } = parseResult.data;
  const db = getDb(c.env.DB);

  let matchedUser: SafeUser | null = null;
  const normalizedEmail = email.toLowerCase();

  try {
    // Check D1 database for user
    const dbUsers = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
    const dbUser = dbUsers[0];

    if (dbUser) {
      if (dbUser.role !== ROLES.ADMIN && dbUser.role !== ROLES.HR) {
        return jsonError(c, "ACCESS_DENIED", "Access is restricted to Administrator and HR personnel only", 403);
      }
      if (!dbUser.isActive) {
        return jsonError(c, "ACCOUNT_INACTIVE", "Your account has been deactivated", 403);
      }

      let isValidPassword = false;
      if (dbUser.passwordHash) {
        isValidPassword = await verifyPassword(password, dbUser.passwordHash);
      }
      if (!isValidPassword) {
        const demoAccount = DEMO_USERS[normalizedEmail];
        if (demoAccount && password === demoAccount.password) {
          isValidPassword = true;
        }
      }

      if (!isValidPassword) {
        return jsonError(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
      }

      matchedUser = {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role as UserRole,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      };
    } else {
      const demoAccount = DEMO_USERS[normalizedEmail];
      if (demoAccount && password === demoAccount.password) {
        matchedUser = {
          id: demoAccount.id,
          email: demoAccount.email,
          fullName: demoAccount.fullName,
          role: demoAccount.role,
          isActive: demoAccount.isActive,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
      }
    }
  } catch {
    const demoAccount = DEMO_USERS[normalizedEmail];
    if (demoAccount && password === demoAccount.password) {
      matchedUser = {
        id: demoAccount.id,
        email: demoAccount.email,
        fullName: demoAccount.fullName,
        role: demoAccount.role,
        isActive: demoAccount.isActive,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
    }
  }

  if (!matchedUser) {
    return jsonError(c, "INVALID_CREDENTIALS", "Invalid email or password", 401);
  }

  if (matchedUser.role !== ROLES.ADMIN && matchedUser.role !== ROLES.HR) {
    return jsonError(c, "ACCESS_DENIED", "Access is restricted to Administrator and HR personnel only", 403);
  }

    // Sign JWT
    const token = await signJwt(
      {
        sub: matchedUser.id,
        email: matchedUser.email,
        role: matchedUser.role,
        fullName: matchedUser.fullName,
      },
      c.env.JWT_SECRET || "hr-erp-default-jwt-secret-key-32-chars-minimum"
    );

    // Record audit log entry asynchronously
    try {
      await db.insert(auditLogs).values({
        id: crypto.randomUUID(),
        userId: matchedUser.id,
        action: "LOGIN",
        resourceType: "auth",
        resourceId: matchedUser.id,
        ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
        userAgent: c.req.header("user-agent") || "unknown",
        createdAt: new Date().toISOString(),
      });
    } catch {
      // Non-blocking for login flow
    }

    const expiresAt = Date.now() + 8 * 60 * 60 * 1000; // 8 hours

    return jsonSuccess(c, {
      user: matchedUser,
      token,
      expiresAt,
    });
  }
);

authRoutes.get("/me", requireAuth(), async (c) => {
  const jwtUser = c.get("user")!;
  const db = getDb(c.env.DB);

  try {
    const dbUsers = await db.select().from(users).where(eq(users.id, jwtUser.sub)).limit(1);
    const dbUser = dbUsers[0];
    if (dbUser) {
      return jsonSuccess(c, {
        id: dbUser.id,
        email: dbUser.email,
        fullName: dbUser.fullName,
        role: dbUser.role as UserRole,
        isActive: dbUser.isActive,
        createdAt: dbUser.createdAt,
        updatedAt: dbUser.updatedAt,
      });
    }
  } catch {
    // If DB is offline, return the JWT payload user data
  }

  return jsonSuccess(c, {
    id: jwtUser.sub,
    email: jwtUser.email,
    fullName: jwtUser.fullName,
    role: jwtUser.role,
    isActive: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
});

authRoutes.post("/logout", async (c) => {
  try {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const payload = await verifyJwt(
        token,
        c.env.JWT_SECRET || "hr-erp-default-jwt-secret-key-32-chars-minimum"
      );
      if (payload) {
        const db = getDb(c.env.DB);
        await db.insert(auditLogs).values({
          id: crypto.randomUUID(),
          userId: payload.sub,
          action: "LOGOUT",
          resourceType: "auth",
          resourceId: payload.sub,
          ipAddress: c.req.header("cf-connecting-ip") || "127.0.0.1",
          userAgent: c.req.header("user-agent") || "unknown",
          createdAt: new Date().toISOString(),
        });
      }
    }
  } catch {
    // Non-blocking
  }
  return jsonSuccess(c, { message: "Logged out successfully" });
});
