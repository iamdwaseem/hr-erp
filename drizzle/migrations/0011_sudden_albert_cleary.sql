CREATE TABLE `attendance_imports` (
	`id` text PRIMARY KEY NOT NULL,
	`file_name` text NOT NULL,
	`mode` text DEFAULT 'leave_only' NOT NULL,
	`period_start` text NOT NULL,
	`period_end` text NOT NULL,
	`mapping` text NOT NULL,
	`checksum` text,
	`row_count` integer DEFAULT 0 NOT NULL,
	`accepted_count` integer DEFAULT 0 NOT NULL,
	`rejected_count` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'completed' NOT NULL,
	`imported_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`imported_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `attendance_import_period_idx` ON `attendance_imports` (`period_start`,`period_end`);--> statement-breakpoint
CREATE INDEX `attendance_import_created_idx` ON `attendance_imports` (`created_at`);--> statement-breakpoint
CREATE TABLE `attendance_records` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`attendance_date` text NOT NULL,
	`status` text DEFAULT 'present' NOT NULL,
	`leave_type_id` text,
	`source_import_id` text,
	`source_row_number` integer,
	`source_identifier` text,
	`remarks` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`source_import_id`) REFERENCES `attendance_imports`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attendance_employee_date_idx` ON `attendance_records` (`employee_id`,`attendance_date`);--> statement-breakpoint
CREATE INDEX `attendance_date_idx` ON `attendance_records` (`attendance_date`);--> statement-breakpoint
CREATE INDEX `attendance_status_idx` ON `attendance_records` (`status`);--> statement-breakpoint
CREATE INDEX `attendance_import_idx` ON `attendance_records` (`source_import_id`);--> statement-breakpoint
CREATE TABLE `leave_balances` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type_id` text NOT NULL,
	`year` integer NOT NULL,
	`opening` integer DEFAULT 0 NOT NULL,
	`accrued` integer DEFAULT 0 NOT NULL,
	`used` integer DEFAULT 0 NOT NULL,
	`adjusted` integer DEFAULT 0 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_balance_employee_type_year_idx` ON `leave_balances` (`employee_id`,`leave_type_id`,`year`);--> statement-breakpoint
CREATE INDEX `leave_balance_year_idx` ON `leave_balances` (`year`);--> statement-breakpoint
CREATE TABLE `leave_requests` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type_id` text NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`requested_days` integer NOT NULL,
	`reason` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`submitted_by` text,
	`reviewed_by` text,
	`reviewed_at` text,
	`review_note` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`submitted_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`reviewed_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leave_request_employee_date_idx` ON `leave_requests` (`employee_id`,`start_date`,`end_date`);--> statement-breakpoint
CREATE INDEX `leave_request_status_idx` ON `leave_requests` (`status`);--> statement-breakpoint
CREATE TABLE `leave_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`leave_type_id` text NOT NULL,
	`balance_id` text NOT NULL,
	`year` integer NOT NULL,
	`kind` text NOT NULL,
	`days` integer NOT NULL,
	`reference_id` text,
	`note` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`leave_type_id`) REFERENCES `leave_types`(`id`) ON UPDATE no action ON DELETE restrict,
	FOREIGN KEY (`balance_id`) REFERENCES `leave_balances`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `leave_transaction_balance_idx` ON `leave_transactions` (`balance_id`);--> statement-breakpoint
CREATE INDEX `leave_transaction_employee_year_idx` ON `leave_transactions` (`employee_id`,`year`);--> statement-breakpoint
CREATE TABLE `leave_types` (
	`id` text PRIMARY KEY NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`paid` integer DEFAULT true NOT NULL,
	`annual_entitlement` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `leave_type_code_idx` ON `leave_types` (`code`);--> statement-breakpoint
CREATE INDEX `leave_type_status_idx` ON `leave_types` (`status`);