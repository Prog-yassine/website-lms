CREATE TABLE `storage_buckets` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `storage_buckets_project_id` ON `storage_buckets` (`project_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `storage_buckets_project_name_unique` ON `storage_buckets` (`project_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `storage_buckets_project_id_unique` ON `storage_buckets` (`project_id`,`id`);--> statement-breakpoint
CREATE TABLE `storage_objects` (
	`id` text PRIMARY KEY,
	`project_id` text NOT NULL,
	`bucket_id` text NOT NULL,
	`object_key` text NOT NULL,
	`name` text NOT NULL,
	`size` integer NOT NULL,
	`content_type` text NOT NULL,
	`state` text DEFAULT 'uploading' NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`,`bucket_id`) REFERENCES `storage_buckets`(`project_id`,`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "storage_objects_size_check" CHECK("storage_objects"."size" > 0 AND "storage_objects"."size" <= 5242880),
	CONSTRAINT "storage_objects_state_check" CHECK("storage_objects"."state" IN ('uploading', 'ready'))
);
--> statement-breakpoint
CREATE UNIQUE INDEX `storage_objects_object_key_unique` ON `storage_objects` (`object_key`);--> statement-breakpoint
CREATE INDEX `storage_objects_project_bucket` ON `storage_objects` (`project_id`,`bucket_id`);--> statement-breakpoint
CREATE INDEX `storage_objects_project_state` ON `storage_objects` (`project_id`,`state`);