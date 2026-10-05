import type { MiddlewareHandler } from "hono";
import type { AppContext } from "../types";

export function requestLogger(): MiddlewareHandler<AppContext> {
  return async (c, next) => {
    const requestId = crypto.randomUUID();
    c.set("requestId", requestId);
    c.header("X-Request-Id", requestId);

    const start = performance.now();
    await next();
    const duration = Math.round(performance.now() - start);

    const status = c.res.status;
    const method = c.req.method;
    const path = c.req.path;

    // Concise, production-safe edge log
    console.log(`[${requestId.slice(0, 8)}] ${method} ${path} -> ${status} (${duration}ms)`);
  };
}
