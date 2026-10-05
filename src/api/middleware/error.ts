import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";
import { ZodError } from "zod";
import type { AppContext } from "../types";
import { jsonError } from "../utils/response";

export const errorHandler: ErrorHandler<AppContext> = (err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.path}:`, err);

  if (err instanceof HTTPException) {
    return jsonError(
      c,
      "HTTP_EXCEPTION",
      err.message,
      err.status
    );
  }

  if (err instanceof ZodError) {
    return jsonError(
      c,
      "VALIDATION_ERROR",
      "Request validation failed",
      400,
      err.flatten()
    );
  }

  // Handle generic error
  const message =
    c.env?.ENVIRONMENT === "development"
      ? err.message || "An unexpected error occurred"
      : "Internal server error";

  return jsonError(
    c,
    "INTERNAL_SERVER_ERROR",
    message,
    500
  );
};
