import { Hono } from "hono";
import { asc } from "drizzle-orm";
import type { AppContext } from "../types";
import { requireAuth } from "../middleware/auth";
import { getDb } from "../db/client";
import { departments, designations, branches } from "../db/schema/masters";
import { jsonSuccess, jsonError } from "../utils/response";

export const mastersRoutes = new Hono<AppContext>();

mastersRoutes.use("*", requireAuth());

mastersRoutes.get("/departments", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const result = await db.select().from(departments).orderBy(asc(departments.name));
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

mastersRoutes.get("/designations", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const result = await db.select().from(designations).orderBy(asc(designations.name));
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

mastersRoutes.get("/branches", async (c) => {
  try {
    const db = getDb(c.env.DB);
    const result = await db.select().from(branches).orderBy(asc(branches.name));
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
