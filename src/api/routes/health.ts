import { Hono } from "hono";
import type { AppContext } from "../types";
import { jsonSuccess, jsonError } from "../utils/response";

export const healthRoutes = new Hono<AppContext>();

healthRoutes.get("/", async (c) => {
  try {
    let d1Status = "unknown";
    try {
      if (c.env.DB) {
        // Simple ping to D1
        await c.env.DB.prepare("SELECT 1").first();
        d1Status = "connected";
      } else {
        d1Status = "unbound";
      }
    } catch (dbErr) {
      d1Status = `error: ${dbErr instanceof Error ? dbErr.message : "failed"}`;
    }

    const r2Status = c.env.BUCKET ? "bound" : "unbound";

    return jsonSuccess(c, {
      status: "healthy",
      service: "hr-erp-api",
      timestamp: new Date().toISOString(),
      environment: c.env.ENVIRONMENT || "development",
      bindings: {
        d1: d1Status,
        r2: r2Status,
      },
    });
  } catch (err) {
    return jsonError(
      c,
      "HEALTH_CHECK_FAILED",
      err instanceof Error ? err.message : "Health check failed",
      503
    );
  }
});
