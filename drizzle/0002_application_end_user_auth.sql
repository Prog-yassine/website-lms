CREATE TABLE `app_auth_sessions` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`user_id` text NOT NULL,
	`refresh_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`,`user_id`) REFERENCES `app_auth_users`(`project_id`,`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth_sessions_refresh_hash_unique` ON `app_auth_sessions` (`refresh_hash`);--> statement-breakpoint
CREATE INDEX `app_auth_sessions_project_user` ON `app_auth_sessions` (`project_id`,`user_id`);--> statement-breakpoint
CREATE INDEX `app_auth_sessions_expires_at` ON `app_auth_sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `app_auth_settings` (
	`project_id` text PRIMARY KEY,
	`allowed_origins` text DEFAULT '[]' NOT NULL,
	`signup_enabled` integer DEFAULT 1 NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "app_auth_settings_signup_enabled_check" CHECK("app_auth_settings"."signup_enabled" IN (0, 1))
);
--> statement-breakpoint
CREATE TABLE `app_auth_users` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`name` text DEFAULT '' NOT NULL,
	`email` text COLLATE NOCASE NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL,
	`last_sign_in_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `app_auth_users_project_id` ON `app_auth_users` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth_users_project_email_unique` ON `app_auth_users` (`project_id`,`email`);--> statement-breakpoint
CREATE UNIQUE INDEX `app_auth_users_project_id_unique` ON `app_auth_users` (`project_id`,`id`);