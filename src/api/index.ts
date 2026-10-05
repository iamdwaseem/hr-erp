import { Hono } from "hono";
import type { AppContext } from "./types";
import { requestLogger } from "./middleware/logger";
import { errorHandler } from "./middleware/error";
import { apiRouter } from "./routes";

const app = new Hono<AppContext>();

// Global Middlewares
app.use("*", requestLogger());
app.onError(errorHandler);

// API Routes namespace
app.route("/api", apiRouter);

// Fallback: If ASSETS binding is present (Cloudflare Workers Static Assets), pass through
app.all("*", async (c) => {
  if (c.env.ASSETS) {
    return c.env.ASSETS.fetch(c.req.raw);
  }
  return c.text("HR ERP API is running. Access API endpoints at /api", 200);
});

export default app;
