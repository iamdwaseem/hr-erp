import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse, ApiMeta } from "../../shared/types/api";

export function jsonSuccess<T>(
  c: Context,
  data: T,
  meta?: ApiMeta,
  status: ContentfulStatusCode = 200
) {
  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return c.json(payload, status);
}

export function jsonError(
  c: Context,
  code: string,
  message: string,
  status: ContentfulStatusCode = 400,
  details?: unknown
) {
  const payload: ApiResponse<never> = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };
  return c.json(payload, status);
}
