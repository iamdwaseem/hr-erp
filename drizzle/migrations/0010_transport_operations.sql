CREATE TABLE `transport_route_stops` (
  `id` text PRIMARY KEY NOT NULL,
  `route_id` text NOT NULL,
  `sequence` integer NOT NULL,
  `name` text NOT NULL,
  `location` text NOT NULL,
  `pickup_time` text,
  `dropoff_time` text,
  `status` text DEFAULT 'active' NOT NULL,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE cascade
);--> statement-breakpoint
CREATE INDEX `route_stop_sequence_idx` ON `transport_route_stops` (`route_id`,`sequence`);--> statement-breakpoint
CREATE INDEX `route_stop_status_idx` ON `transport_route_stops` (`route_id`,`status`);--> statement-breakpoint
ALTER TABLE `employee_transport_assignments` ADD `accommodation` text;--> statement-breakpoint
ALTER TABLE `employee_transport_assignments` ADD `shift` text DEFAULT 'GENERAL' NOT NULL;--> statement-breakpoint
CREATE TABLE `transport_trips` (
  `id` text PRIMARY KEY NOT NULL,
  `route_id` text NOT NULL,
  `vehicle_id` text,
  `service_date` text NOT NULL,
  `shift` text DEFAULT 'GENERAL' NOT NULL,
  `direction` text DEFAULT 'PICKUP' NOT NULL,
  `driver_name` text,
  `driver_phone` text,
  `status` text DEFAULT 'planned' NOT NULL,
  `notes` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`route_id`) REFERENCES `transport_routes`(`id`) ON DELETE restrict,
  FOREIGN KEY (`vehicle_id`) REFERENCES `transport_vehicles`(`id`) ON DELETE set null
);--> statement-breakpoint
CREATE INDEX `transport_trip_date_idx` ON `transport_trips` (`service_date`);--> statement-breakpoint
CREATE INDEX `transport_trip_route_date_idx` ON `transport_trips` (`route_id`,`service_date`);--> statement-breakpoint
CREATE INDEX `transport_trip_status_idx` ON `transport_trips` (`status`);--> statement-breakpoint
CREATE TABLE `transport_trip_passengers` (
  `id` text PRIMARY KEY NOT NULL,
  `trip_id` text NOT NULL,
  `employee_id` text NOT NULL,
  `assignment_id` text,
  `boarding_status` text DEFAULT 'planned' NOT NULL,
  `boarded_at` text,
  `notes` text,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  FOREIGN KEY (`trip_id`) REFERENCES `transport_trips`(`id`) ON DELETE cascade,
  FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE cascade,
  FOREIGN KEY (`assignment_id`) REFERENCES `employee_transport_assignments`(`id`) ON DELETE set null
);--> statement-breakpoint
CREATE UNIQUE INDEX `transport_trip_employee_idx` ON `transport_trip_passengers` (`trip_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `transport_passenger_trip_idx` ON `transport_trip_passengers` (`trip_id`);--> statement-breakpoint
CREATE INDEX `transport_passenger_employee_idx` ON `transport_trip_passengers` (`employee_id`);