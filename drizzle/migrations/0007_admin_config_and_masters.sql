ALTER TABLE `departments` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `designations` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
ALTER TABLE `branches` ADD `status` text DEFAULT 'active' NOT NULL;--> statement-breakpoint
CREATE TABLE `document_types` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);--> statement-breakpoint
CREATE UNIQUE INDEX `doc_type_name_idx` ON `document_types` (`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `doc_type_code_idx` ON `document_types` (`code`);--> statement-breakpoint
INSERT OR IGNORE INTO `document_types` (`id`, `name`, `code`, `description`, `status`, `created_at`, `updated_at`) VALUES
('doc_type_passport', 'Passport', 'PASSPORT', 'Official international travel passport', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_visa', 'Visa', 'VISA', 'Residence or entry permit visa', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_work_permit', 'Work Permit', 'WORK_PERMIT', 'Statutory labor card or work authorization', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_national_id', 'National ID', 'NATIONAL_ID', 'Government issued national identity card', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_emirates_id', 'Emirates ID', 'EMIRATES_ID', 'United Arab Emirates resident identity card', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_labour_card', 'Labour Card', 'LABOUR_CARD', 'Ministry labor card authorization', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_driving_license', 'Driving License', 'DRIVING_LICENSE', 'Official motor vehicle driving license', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_contract', 'Employment Contract', 'CONTRACT', 'Signed employment agreement and offer letter', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_insurance', 'Health Insurance Card', 'INSURANCE', 'Medical and health insurance card or policy', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('doc_type_other', 'Other Document', 'OTHER', 'General employee compliance or personal file', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');--> statement-breakpoint
INSERT OR IGNORE INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
('usr_hr_2_default', 'hr2@hr-erp.local', 'pbkdf2:15ceba5db8995ffe4d1e505a91252c45:ef91406aa31dfd2372c13212adf290e4f2155e3d0426166a662e70406fa12e56', 'HR Operations Lead', 'HR', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');--> statement-breakpoint
UPDATE `users` SET `is_active` = 0 WHERE `role` IN ('MANAGER', 'EMPLOYEE');--> statement-breakpoint
UPDATE `employees` SET `user_id` = NULL WHERE `user_id` = 'usr_employee_default';
