import { sqliteTable, text, index } from "drizzle-orm/sqlite-core";
import { users } from "./users";

export const auditLogs = sqliteTable(
  "audit_logs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    resourceType: text("resource_type").notNull(),
    resourceId: text("resource_id"),
    details: text("details"), // JSON payload string
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    createdAtIdx: index("audit_created_at_idx").on(table.createdAt),
    userIdIdx: index("audit_user_id_idx").on(table.userId),
    actionIdx: index("audit_action_idx").on(table.action),
    resourceTypeIdx: index("audit_resource_type_idx").on(table.resourceType),
    resourceIdIdx: index("audit_resource_id_idx").on(table.resourceId),
  })
);

export type AuditLogEntity = typeof auditLogs.$inferSelect;
export type NewAuditLogEntity = typeof auditLogs.$inferInsert;
