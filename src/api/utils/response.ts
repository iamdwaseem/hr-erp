import type { Context } from "hono";
import type { ContentfulStatusCode } from "hono/utils/http-status";
import type { ApiResponse, ApiMeta } from "../../shared/types/api";

export function jsonSuccess<T>(
  c: Context,
  data: T,
  metaOrStatus?: ApiMeta | ContentfulStatusCode,
  status: ContentfulStatusCode = 200
) {
  let meta: ApiMeta | undefined;
  let finalStatus: ContentfulStatusCode = status;
  if (typeof metaOrStatus === "number") {
    finalStatus = metaOrStatus as ContentfulStatusCode;
  } else if (metaOrStatus) {
    meta = metaOrStatus;
  }

  const payload: ApiResponse<T> = {
    success: true,
    data,
    ...(meta ? { meta } : {}),
  };
  return c.json(payload, finalStatus);
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
