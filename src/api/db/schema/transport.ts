import { sqliteTable, text, integer, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { branches } from "./masters";
import { employees } from "./employees";

export const transportRoutes = sqliteTable(
  "transport_routes",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    code: text("code").notNull().unique(),
    description: text("description"),
    pickupPoints: text("pickup_points"),
    destinationBranchId: text("destination_branch_id").references(() => branches.id, {
      onDelete: "set null",
    }),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    codeIdx: uniqueIndex("route_code_idx").on(table.code),
    nameIdx: index("route_name_idx").on(table.name),
    statusIdx: index("route_status_idx").on(table.status),
    branchIdx: index("route_branch_idx").on(table.destinationBranchId),
  })
);

export const transportVehicles = sqliteTable(
  "transport_vehicles",
  {
    id: text("id").primaryKey(),
    registrationNumber: text("registration_number").notNull().unique(),
    vehicleType: text("vehicle_type").notNull(),
    capacity: integer("capacity").notNull(),
    driverName: text("driver_name"),
    driverPhone: text("driver_phone"),
    status: text("status").notNull().default("active"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    regNumIdx: uniqueIndex("vehicle_reg_num_idx").on(table.registrationNumber),
    statusIdx: index("vehicle_status_idx").on(table.status),
    typeIdx: index("vehicle_type_idx").on(table.vehicleType),
  })
);

export const employeeTransportAssignments = sqliteTable(
  "employee_transport_assignments",
  {
    id: text("id").primaryKey(),
    employeeId: text("employee_id")
      .notNull()
      .references(() => employees.id, { onDelete: "restrict" }),
    routeId: text("route_id")
      .notNull()
      .references(() => transportRoutes.id, { onDelete: "restrict" }),
    vehicleId: text("vehicle_id").references(() => transportVehicles.id, {
      onDelete: "set null",
    }),
    pickupPoint: text("pickup_point"),
    effectiveFrom: text("effective_from").notNull(),
    effectiveTo: text("effective_to"),
    status: text("status").notNull().default("active"),
    notes: text("notes"),
    createdAt: text("created_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
    updatedAt: text("updated_at")
      .notNull()
      .$defaultFn(() => new Date().toISOString()),
  },
  (table) => ({
    empIdx: index("assign_emp_idx").on(table.employeeId),
    routeIdx: index("assign_route_idx").on(table.routeId),
    vehicleIdx: index("assign_vehicle_idx").on(table.vehicleId),
    statusIdx: index("assign_status_idx").on(table.status),
    effectiveFromIdx: index("assign_effective_from_idx").on(table.effectiveFrom),
  })
);

export type TransportRouteEntity = typeof transportRoutes.$inferSelect;
export type NewTransportRouteEntity = typeof transportRoutes.$inferInsert;

export type TransportVehicleEntity = typeof transportVehicles.$inferSelect;
export type NewTransportVehicleEntity = typeof transportVehicles.$inferInsert;

export type EmployeeTransportAssignmentEntity =
  typeof employeeTransportAssignments.$inferSelect;
export type NewEmployeeTransportAssignmentEntity =
  typeof employeeTransportAssignments.$inferInsert;
