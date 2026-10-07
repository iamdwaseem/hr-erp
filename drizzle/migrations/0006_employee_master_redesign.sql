ALTER TABLE `employees` ADD `local_email` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_mobile` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_address_line_1` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_address_line_2` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_city` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_state` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_postal_code` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `local_country` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_email` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_mobile` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_alternate_phone` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_address_line_1` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_address_line_2` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_city` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_state` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_postal_code` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `home_country` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_relationship` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_mobile` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_alternate_phone` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_email` text;--> statement-breakpoint
ALTER TABLE `employees` ADD `emergency_contact_address` text;--> statement-breakpoint
CREATE INDEX `emp_local_email_idx` ON `employees` (`local_email`);--> statement-breakpoint
UPDATE `employees`
SET
  `local_email` = COALESCE(`local_email`, `email`),
  `local_mobile` = COALESCE(`local_mobile`, `mobile`),
  `local_address_line_1` = COALESCE(`local_address_line_1`, `address_line`),
  `local_city` = COALESCE(`local_city`, `city`),
  `local_state` = COALESCE(`local_state`, `state`),
  `local_country` = COALESCE(`local_country`, `country`)
WHERE `local_email` IS NULL OR `local_mobile` IS NULL OR `local_address_line_1` IS NULL;
