CREATE TABLE `api_endpoints` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`definition` text NOT NULL,
	`published_definition` text,
	`published_method` text,
	`published_path` text,
	`revision` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`published_at` text,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "api_endpoints_revision_check" CHECK("api_endpoints"."revision" >= 1)
);
--> statement-breakpoint
CREATE INDEX `api_endpoints_project_id` ON `api_endpoints` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `api_endpoints_published_route_unique` ON `api_endpoints` (`project_id`,`published_method`,`published_path`);