import { Hono } from "hono";
import type { AppContext } from "../types";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";
import { mastersRoutes } from "./masters";
import { employeesRoutes } from "./employees";
import { expiryRoutes } from "./expiry";
import { auditLogsRoutes } from "./audit-logs";
import { usersRoutes } from "./users";

export const apiRouter = new Hono<AppContext>();

apiRouter.route("/health", healthRoutes);
apiRouter.route("/auth", authRoutes);
apiRouter.route("/masters", mastersRoutes);
apiRouter.route("/employees", employeesRoutes);
apiRouter.route("/expiry", expiryRoutes);
apiRouter.route("/audit-logs", auditLogsRoutes);
apiRouter.route("/users", usersRoutes);
