CREATE INDEX `audit_created_at_idx` ON `audit_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `audit_user_id_idx` ON `audit_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `audit_action_idx` ON `audit_logs` (`action`);--> statement-breakpoint
CREATE INDEX `audit_resource_type_idx` ON `audit_logs` (`resource_type`);--> statement-breakpoint
CREATE INDEX `audit_resource_id_idx` ON `audit_logs` (`resource_id`);