import { Hono } from "hono";
import type { AppContext } from "../types";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";
import { mastersRoutes } from "./masters";
import { employeesRoutes } from "./employees";

export const apiRouter = new Hono<AppContext>();

apiRouter.route("/health", healthRoutes);
apiRouter.route("/auth", authRoutes);
apiRouter.route("/masters", mastersRoutes);
apiRouter.route("/employees", employeesRoutes);
