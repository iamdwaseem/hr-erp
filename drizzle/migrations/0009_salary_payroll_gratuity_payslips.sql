CREATE TABLE `employee_salaries` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`salary_structure_id` text,
	`basic_salary` integer DEFAULT 0 NOT NULL,
	`housing_allowance` integer DEFAULT 0 NOT NULL,
	`transport_allowance` integer DEFAULT 0 NOT NULL,
	`other_allowance` integer DEFAULT 0 NOT NULL,
	`gross_salary` integer DEFAULT 0 NOT NULL,
	`deductions` integer DEFAULT 0 NOT NULL,
	`net_salary` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'AED' NOT NULL,
	`effective_from` text NOT NULL,
	`effective_to` text,
	`status` text DEFAULT 'active' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`salary_structure_id`) REFERENCES `salary_structures`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `emp_sal_employee_idx` ON `employee_salaries` (`employee_id`);--> statement-breakpoint
CREATE INDEX `emp_sal_struct_idx` ON `employee_salaries` (`salary_structure_id`);--> statement-breakpoint
CREATE INDEX `emp_sal_status_idx` ON `employee_salaries` (`status`);--> statement-breakpoint
CREATE INDEX `emp_sal_effective_from_idx` ON `employee_salaries` (`effective_from`);--> statement-breakpoint
CREATE TABLE `gratuity_records` (
	`id` text PRIMARY KEY NOT NULL,
	`employee_id` text NOT NULL,
	`payroll_record_id` text,
	`joining_date` text NOT NULL,
	`last_working_date` text NOT NULL,
	`service_years` integer NOT NULL,
	`basic_salary_at_calculation` integer NOT NULL,
	`eligible_days` integer NOT NULL,
	`gratuity_amount` integer NOT NULL,
	`currency` text DEFAULT 'AED' NOT NULL,
	`status` text DEFAULT 'calculated' NOT NULL,
	`calculation_date` text NOT NULL,
	`policy_version` text DEFAULT 'uae_standard_v1' NOT NULL,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE INDEX `gratuity_emp_idx` ON `gratuity_records` (`employee_id`);--> statement-breakpoint
CREATE INDEX `gratuity_status_idx` ON `gratuity_records` (`status`);--> statement-breakpoint
CREATE INDEX `gratuity_calc_date_idx` ON `gratuity_records` (`calculation_date`);--> statement-breakpoint
CREATE TABLE `payroll_adjustments` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_record_id` text NOT NULL,
	`type` text NOT NULL,
	`name` text NOT NULL,
	`amount` integer NOT NULL,
	`reason` text,
	`created_by` text,
	`created_at` text NOT NULL,
	FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `payroll_adj_rec_idx` ON `payroll_adjustments` (`payroll_record_id`);--> statement-breakpoint
CREATE INDEX `payroll_adj_type_idx` ON `payroll_adjustments` (`type`);--> statement-breakpoint
CREATE TABLE `payroll_periods` (
	`id` text PRIMARY KEY NOT NULL,
	`period_year` integer NOT NULL,
	`period_month` integer NOT NULL,
	`start_date` text NOT NULL,
	`end_date` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`processed_at` text,
	`approved_at` text,
	`paid_at` text,
	`notes` text,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_period_year_month_idx` ON `payroll_periods` (`period_year`,`period_month`);--> statement-breakpoint
CREATE INDEX `payroll_period_status_idx` ON `payroll_periods` (`status`);--> statement-breakpoint
CREATE TABLE `payroll_records` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_period_id` text NOT NULL,
	`employee_id` text NOT NULL,
	`salary_record_id` text,
	`basic_salary` integer NOT NULL,
	`housing_allowance` integer DEFAULT 0 NOT NULL,
	`transport_allowance` integer DEFAULT 0 NOT NULL,
	`other_allowance` integer DEFAULT 0 NOT NULL,
	`gross_earnings` integer NOT NULL,
	`deductions` integer DEFAULT 0 NOT NULL,
	`gratuity_adjustment` integer DEFAULT 0 NOT NULL,
	`total_deductions` integer DEFAULT 0 NOT NULL,
	`net_salary` integer NOT NULL,
	`working_days` integer DEFAULT 30 NOT NULL,
	`payable_days` integer DEFAULT 30 NOT NULL,
	`unpaid_days` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'AED' NOT NULL,
	`status` text DEFAULT 'calculated' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`salary_record_id`) REFERENCES `employee_salaries`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payroll_rec_period_emp_idx` ON `payroll_records` (`payroll_period_id`,`employee_id`);--> statement-breakpoint
CREATE INDEX `payroll_rec_period_idx` ON `payroll_records` (`payroll_period_id`);--> statement-breakpoint
CREATE INDEX `payroll_rec_emp_idx` ON `payroll_records` (`employee_id`);--> statement-breakpoint
CREATE INDEX `payroll_rec_status_idx` ON `payroll_records` (`status`);--> statement-breakpoint
CREATE TABLE `payslips` (
	`id` text PRIMARY KEY NOT NULL,
	`payroll_record_id` text NOT NULL,
	`payslip_number` text NOT NULL,
	`employee_id` text NOT NULL,
	`payroll_period_id` text NOT NULL,
	`generated_at` text NOT NULL,
	`status` text DEFAULT 'generated' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`payroll_record_id`) REFERENCES `payroll_records`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`payroll_period_id`) REFERENCES `payroll_periods`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `payslips_payslip_number_unique` ON `payslips` (`payslip_number`);--> statement-breakpoint
CREATE UNIQUE INDEX `payslip_number_idx` ON `payslips` (`payslip_number`);--> statement-breakpoint
CREATE INDEX `payslip_rec_idx` ON `payslips` (`payroll_record_id`);--> statement-breakpoint
CREATE INDEX `payslip_emp_idx` ON `payslips` (`employee_id`);--> statement-breakpoint
CREATE INDEX `payslip_period_idx` ON `payslips` (`payroll_period_id`);--> statement-breakpoint
CREATE TABLE `salary_structures` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`code` text NOT NULL,
	`description` text,
	`basic_salary` integer DEFAULT 0 NOT NULL,
	`housing_allowance` integer DEFAULT 0 NOT NULL,
	`transport_allowance` integer DEFAULT 0 NOT NULL,
	`other_allowance` integer DEFAULT 0 NOT NULL,
	`other_deductions` integer DEFAULT 0 NOT NULL,
	`currency` text DEFAULT 'AED' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `salary_structures_code_unique` ON `salary_structures` (`code`);--> statement-breakpoint
CREATE UNIQUE INDEX `salary_structure_code_idx` ON `salary_structures` (`code`);--> statement-breakpoint
CREATE INDEX `salary_structure_name_idx` ON `salary_structures` (`name`);--> statement-breakpoint
CREATE INDEX `salary_structure_status_idx` ON `salary_structures` (`status`);