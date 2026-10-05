import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../types";
import { verifyJwt } from "../utils/jwt";
import { jsonError } from "../utils/response";

export function requireAuth(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return jsonError(
        c,
        "UNAUTHORIZED",
        "Authentication token required",
        401
      );
    }

    const token = authHeader.substring(7).trim();
    if (!token) {
      return jsonError(
        c,
        "UNAUTHORIZED",
        "Authentication token missing",
        401
      );
    }

    const secret = c.env.JWT_SECRET;
    if (!secret) {
      return jsonError(
        c,
        "CONFIGURATION_ERROR",
        "JWT_SECRET is not configured",
        500
      );
    }

    const user = await verifyJwt(token, secret);
    if (!user) {
      return jsonError(
        c,
        "UNAUTHORIZED",
        "Invalid or expired authentication token",
        401
      );
    }

    c.set("user", user);
    await next();
  };
}

export function optionalAuth(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const authHeader = c.req.header("Authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7).trim();
      const secret = c.env.JWT_SECRET;
      if (token && secret) {
        const user = await verifyJwt(token, secret);
        if (user) {
          c.set("user", user);
        }
      }
    }
    await next();
  };
}
