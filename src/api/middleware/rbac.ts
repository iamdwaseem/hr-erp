import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../types";
import { type UserRole, type Permission, hasPermission } from "../../shared/constants/roles";
import { jsonError } from "../utils/response";

export function requireRole(...roles: UserRole[]): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return jsonError(c, "UNAUTHORIZED", "User must be authenticated", 401);
    }

    if (!roles.includes(user.role)) {
      return jsonError(
        c,
        "FORBIDDEN",
        `Access denied. Requires one of roles: ${roles.join(", ")}`,
        403
      );
    }

    await next();
  };
}

export function requirePermissionMiddleware(permission: Permission): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const user = c.get("user");
    if (!user) {
      return jsonError(c, "UNAUTHORIZED", "User must be authenticated", 401);
    }

    if (!hasPermission(user.role, permission)) {
      return jsonError(
        c,
        "FORBIDDEN",
        `Access denied. Requires permission: ${permission}`,
        403
      );
    }

    await next();
  };
}
