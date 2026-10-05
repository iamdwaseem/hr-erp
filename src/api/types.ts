import type { JWTPayload } from "../shared/types/auth";

export interface Env {
  // Cloudflare D1 Database binding
  DB: D1Database;
  // Cloudflare R2 Bucket binding
  BUCKET: R2Bucket;
  // Cloudflare Static Assets binding (optional in dev, present in worker assets)
  ASSETS?: Fetcher;
  // Environment variables
  ENVIRONMENT?: string;
  JWT_SECRET: string;
}

export interface AppVariables {
  user?: JWTPayload;
  requestId: string;
}

export type AppContext = {
  Bindings: Env;
  Variables: AppVariables;
};
