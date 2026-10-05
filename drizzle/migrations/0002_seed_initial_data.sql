-- Seed Master Data: Departments
INSERT OR IGNORE INTO `departments` (`id`, `name`, `code`, `created_at`, `updated_at`) VALUES
('dept_eng', 'Engineering', 'ENG', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('dept_hr', 'Human Resources', 'HR', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('dept_ops', 'Operations', 'OPS', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('dept_fin', 'Finance', 'FIN', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

--> statement-breakpoint

-- Seed Master Data: Designations
INSERT OR IGNORE INTO `designations` (`id`, `name`, `code`, `created_at`, `updated_at`) VALUES
('desig_swe', 'Software Engineer', 'SWE', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('desig_hr_lead', 'Senior HR Specialist', 'SHRS', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('desig_ops_mgr', 'Operations Lead', 'OPL', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('desig_fin_an', 'Financial Analyst', 'FA', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

--> statement-breakpoint

-- Seed Master Data: Branches
INSERT OR IGNORE INTO `branches` (`id`, `name`, `code`, `city`, `country`, `created_at`, `updated_at`) VALUES
('branch_hq', 'Dubai Headquarters', 'DXB-HQ', 'Dubai', 'United Arab Emirates', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('branch_ad', 'Abu Dhabi Regional', 'AUH-01', 'Abu Dhabi', 'United Arab Emirates', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('branch_sg', 'Singapore Hub', 'SIN-01', 'Singapore', 'Singapore', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

--> statement-breakpoint

-- Seed Initial Users (password hash placeholder, auth route supports dev passwords)
INSERT OR IGNORE INTO `users` (`id`, `email`, `password_hash`, `full_name`, `role`, `is_active`, `created_at`, `updated_at`) VALUES
('usr_admin_default', 'admin@hr-erp.local', 'dev_hash_admin', 'System Administrator', 'ADMIN', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('usr_hr_default', 'hr@hr-erp.local', 'dev_hash_hr', 'HR Specialist', 'HR', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('usr_manager_default', 'manager@hr-erp.local', 'dev_hash_manager', 'Operations Manager', 'MANAGER', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
('usr_employee_default', 'employee@hr-erp.local', 'dev_hash_employee', 'John Doe', 'EMPLOYEE', 1, '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z');

--> statement-breakpoint

-- Seed Sample Employees
INSERT OR IGNORE INTO `employees` (
  `id`, `user_id`, `employee_code`, `employee_id`, `full_name`, `profile_photo_url`,
  `gender`, `date_of_birth`, `nationality`, `mobile`, `email`,
  `address_line`, `city`, `state`, `country`, `joining_date`,
  `department_id`, `designation_id`, `branch_id`, `employment_status`, `created_at`, `updated_at`
) VALUES
(
  'emp_001', 'usr_employee_default', 'EMP001', 'ID-1001', 'John Doe', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
  'Male', '1992-05-14', 'Emirati', '+971501234567', 'employee@hr-erp.local',
  'Villa 42, Al Barsha 2', 'Dubai', 'Dubai', 'United Arab Emirates', '2023-03-15',
  'dept_eng', 'desig_swe', 'branch_hq', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
),
(
  'emp_002', NULL, 'EMP002', 'ID-1002', 'Sarah Jenkins', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
  'Female', '1989-11-23', 'British', '+971509876543', 'sarah.jenkins@company.com',
  'Apartment 1204, Marina Heights', 'Dubai', 'Dubai', 'United Arab Emirates', '2022-08-01',
  'dept_hr', 'desig_hr_lead', 'branch_hq', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
),
(
  'emp_003', NULL, 'EMP003', 'ID-1003', 'Marcus Wong', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
  'Male', '1995-02-18', 'Singaporean', '+6591234567', 'marcus.wong@company.com',
  '18 Orchard Boulevard', 'Singapore', 'Central', 'Singapore', '2024-01-10',
  'dept_ops', 'desig_ops_mgr', 'branch_sg', 'probation', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
),
(
  'emp_004', NULL, 'EMP004', 'ID-1004', 'Elena Rostova', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
  'Female', '1993-07-09', 'Canadian', '+971502345678', 'elena.rostova@company.com',
  'Corniche Road West, Tower 3', 'Abu Dhabi', 'Abu Dhabi', 'United Arab Emirates', '2021-11-20',
  'dept_fin', 'desig_fin_an', 'branch_ad', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
),
(
  'emp_005', NULL, 'EMP005', 'ID-1005', 'Tariq Al-Mansoor', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
  'Male', '1990-09-30', 'Emirati', '+971504567890', 'tariq.almansoor@company.com',
  'Street 12, Jumeirah 1', 'Dubai', 'Dubai', 'United Arab Emirates', '2020-04-01',
  'dept_eng', 'desig_swe', 'branch_hq', 'active', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'
);
