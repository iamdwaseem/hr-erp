CREATE TABLE `transport_routes` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`pickup_points` text,
	`destination_branch_id` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`destination_branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX `route_code_idx` ON `transport_routes` (`code`);--> statement-breakpoint
CREATE INDEX `route_name_idx` ON `transport_routes` (`name`);--> statement-breakpoint
CREATE INDEX `route_status_idx` ON `transport_routes` (`status`);--> statement-breakpoint
CREATE INDEX `route_branch_idx` ON `transport_routes` (`destination_branch_id`);--> statement-breakpoint
CREATE TABLE `transport_vehicles` (
	`id` text PRIMARY KEY NOT NULL,
	`registration_number` text NOT NULL,
	`vehicle_type` text NOT NULL,
	`capacity` integer NOT NULL,
	`driver_name` text,
	`driver_phone` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `vehicle_reg_num_idx` ON `transport_vehicles` (`registration_number`);--> statement-breakpoint
CREATE INDEX `vehicle_status_idx` ON `transport_vehicles` (`status`);--> statement-breakpoint
CREATE INDEX `vehicle_type_idx` ON `transport_vehicles` (`vehicle_type`);--> statement-breakpoint
CREATE TABLE `employee_transport_assignments` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`route_id` text NOT NULL,
	`vehicle_id` text,
	`pickup_point` text,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`vehicle_id`) REFERENCES `transport_vehicles`(`id`) ON UPDATE no action ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `assign_emp_idx` ON `employee_transport_assignments` (`employee_id`);--> statement-breakpoint
CREATE INDEX `assign_route_idx` ON `employee_transport_assignments` (`route_id`);--> statement-breakpoint
CREATE INDEX `assign_vehicle_idx` ON `employee_transport_assignments` (`vehicle_id`);--> statement-breakpoint
CREATE INDEX `assign_status_idx` ON `employee_transport_assignments` (`status`);--> statement-breakpoint
CREATE INDEX `assign_effective_from_idx` ON `employee_transport_assignments` (`effective_from`);
