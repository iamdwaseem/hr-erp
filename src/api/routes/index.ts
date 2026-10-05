import { Hono } from "hono";
import type { AppContext } from "../types";
import { healthRoutes } from "./health";
import { authRoutes } from "./auth";

export const apiRouter = new Hono<AppContext>();

apiRouter.route("/health", healthRoutes);
apiRouter.route("/auth", authRoutes);
