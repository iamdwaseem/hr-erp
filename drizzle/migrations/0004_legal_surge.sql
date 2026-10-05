CREATE TABLE `employee_documents` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`document_type` text NOT NULL,
	`document_number` text,
	`issue_date` text,
	`expiry_date` text,
	`r2_key` text NOT NULL,
	`original_file_name` text NOT NULL,
	`mime_type` text NOT NULL,
	`file_size` integer NOT NULL,
	`verification_status` text DEFAULT 'PENDING' NOT NULL,
	`uploaded_by` text NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `doc_emp_id_idx` ON `employee_documents` (`employee_id`);--> statement-breakpoint
CREATE INDEX `doc_type_idx` ON `employee_documents` (`document_type`);--> statement-breakpoint
CREATE INDEX `doc_expiry_idx` ON `employee_documents` (`expiry_date`);--> statement-breakpoint
CREATE INDEX `doc_verification_idx` ON `employee_documents` (`verification_status`);