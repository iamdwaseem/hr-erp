import { sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const departments = sqliteTable(
  "departments",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    nameIdx: uniqueIndex("dept_name_idx").on(table.name),
    codeIdx: uniqueIndex("dept_code_idx").on(table.code),
  })
);

export const designations = sqliteTable(
  "designations",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    nameIdx: uniqueIndex("desig_name_idx").on(table.name),
    codeIdx: uniqueIndex("desig_code_idx").on(table.code),
  })
);

export const branches = sqliteTable(
  "branches",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    city: text("city"),
    country: text("country"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    nameIdx: uniqueIndex("branch_name_idx").on(table.name),
    codeIdx: uniqueIndex("branch_code_idx").on(table.code),
  })
);

export const documentTypes = sqliteTable(
  "document_types",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull().unique(),
    code: text("code").notNull().unique(),
    description: text("description"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    nameIdx: uniqueIndex("doc_type_name_idx").on(table.name),
    codeIdx: uniqueIndex("doc_type_code_idx").on(table.code),
  })
);

export type DepartmentEntity = typeof departments.$inferSelect;
export type NewDepartmentEntity = typeof departments.$inferInsert;

export type DesignationEntity = typeof designations.$inferSelect;
export type NewDesignationEntity = typeof designations.$inferInsert;

export type BranchEntity = typeof branches.$inferSelect;
export type NewBranchEntity = typeof branches.$inferInsert;

export type DocumentTypeEntity = typeof documentTypes.$inferSelect;
export type NewDocumentTypeEntity = typeof documentTypes.$inferInsert;
