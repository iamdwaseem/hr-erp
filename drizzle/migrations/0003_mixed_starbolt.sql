CREATE TABLE `employee_passports` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`passport_number` text NOT NULL,
	`nationality` text NOT NULL,
	`issue_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`place_of_issue` text,
	`status` text DEFAULT 'VALID' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `passport_emp_id_idx` ON `employee_passports` (`employee_id`);--> statement-breakpoint
CREATE INDEX `passport_num_idx` ON `employee_passports` (`passport_number`);--> statement-breakpoint
CREATE INDEX `passport_expiry_idx` ON `employee_passports` (`expiry_date`);--> statement-breakpoint
CREATE TABLE `employee_visas` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`visa_number` text NOT NULL,
	`visa_type` text NOT NULL,
	`issuing_state` text,
	`profession` text,
	`issue_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`sponsor_name` text,
	`status` text DEFAULT 'VALID' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `visa_emp_id_idx` ON `employee_visas` (`employee_id`);--> statement-breakpoint
CREATE INDEX `visa_num_idx` ON `employee_visas` (`visa_number`);--> statement-breakpoint
CREATE INDEX `visa_expiry_idx` ON `employee_visas` (`expiry_date`);--> statement-breakpoint
CREATE TABLE `employee_work_permits` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`permit_number` text NOT NULL,
	`profession` text,
	`issue_date` text NOT NULL,
	`expiry_date` text NOT NULL,
	`status` text DEFAULT 'VALID' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `work_permit_emp_id_idx` ON `employee_work_permits` (`employee_id`);--> statement-breakpoint
CREATE INDEX `work_permit_num_idx` ON `employee_work_permits` (`permit_number`);--> statement-breakpoint
CREATE INDEX `work_permit_expiry_idx` ON `employee_work_permits` (`expiry_date`);