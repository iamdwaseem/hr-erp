import { defineConfig } from "drizzle-kit";

export default defineConfig({
  schema: "./src/api/db/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "sqlite",
});
