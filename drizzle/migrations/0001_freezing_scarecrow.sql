CREATE TABLE `branches` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`city` text,
	`country` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `branches_name_unique` ON `branches` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `branches_code_unique` ON `branches` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `branch_name_idx` ON `branches` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `branch_code_idx` ON `branches` (`code`);--> statement-breakpoint
CREATE TABLE `departments` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `departments_name_unique` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `departments_code_unique` ON `departments` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `dept_name_idx` ON `departments` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `dept_code_idx` ON `departments` (`code`);--> statement-breakpoint
CREATE TABLE `designations` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `designations_name_unique` ON `designations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `designations_code_unique` ON `designations` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `desig_name_idx` ON `designations` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `desig_code_idx` ON `designations` (`code`);--> statement-breakpoint
CREATE TABLE `employees` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`employee_code` text NOT NULL,
	`employee_id` text NOT NULL,
	`full_name` text NOT NULL,
	`profile_photo_url` text,
	`gender` text,
	`date_of_birth` text,
	`nationality` text,
	`mobile` text,
	`email` text,
	`address_line` text,
	`city` text,
	`state` text,
	`country` text,
	`joining_date` text NOT NULL,
	`department_id` text,
	`designation_id` text,
	`branch_id` text,
	`employment_status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`department_id`) REFERENCES `departments`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`designation_id`) REFERENCES `designations`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`branch_id`) REFERENCES `branches`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_code_unique` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `employees_employee_id_unique` ON `employees` (`employee_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `emp_code_idx` ON `employees` (`employee_code`);--> statement-breakpoint
CREATE UNIQUE INDEX `emp_id_idx` ON `employees` (`employee_id`);--> statement-breakpoint
CREATE INDEX `emp_full_name_idx` ON `employees` (`full_name`);--> statement-breakpoint
CREATE INDEX `emp_dept_idx` ON `employees` (`department_id`);--> statement-breakpoint
CREATE INDEX `emp_desig_idx` ON `employees` (`designation_id`);--> statement-breakpoint
CREATE INDEX `emp_branch_idx` ON `employees` (`branch_id`);--> statement-breakpoint
CREATE INDEX `emp_status_idx` ON `employees` (`employment_status`);--> statement-breakpoint
CREATE INDEX `emp_nationality_idx` ON `employees` (`nationality`);--> statement-breakpoint
CREATE INDEX `emp_user_id_idx` ON `employees` (`user_id`);--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`password_hash` text NOT NULL,
	`full_name` text NOT NULL,
	`role` text DEFAULT 'EMPLOYEE' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "password_hash", "full_name", "role", "is_active", "created_at", "updated_at") SELECT "id", "email", "password_hash", "full_name", "role", "is_active", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);