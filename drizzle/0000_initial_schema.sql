CREATE TABLE `customers` (
	`project_id` text NOT NULL,
	`id` integer NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`project_id` text NOT NULL,
	`id` integer NOT NULL,
	`customer_id` integer NOT NULL,
	`product_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`amount` real NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`project_id`,`customer_id`) REFERENCES `customers`(`project_id`,`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`project_id`,`product_id`) REFERENCES `products`(`project_id`,`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "orders_quantity_check" CHECK("orders"."quantity" > 0),
	CONSTRAINT "orders_amount_check" CHECK("orders"."amount" >= 0)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`project_id` text NOT NULL,
	`id` integer NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`price` real NOT NULL,
	`stock` integer NOT NULL,
	`status` text NOT NULL,
	`created_at` text NOT NULL,
	PRIMARY KEY(`project_id`, `id`),
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "products_price_check" CHECK("products"."price" >= 0),
	CONSTRAINT "products_stock_check" CHECK("products"."stock" >= 0)
);
--> statement-breakpoint
CREATE TABLE `projects` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`database_type` text DEFAULT 'SQLite' NOT NULL,
	`environment` text DEFAULT 'test' NOT NULL,
	`seeded` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "projects_seeded_check" CHECK("projects"."seeded" IN (0, 1))
);
--> statement-breakpoint
CREATE INDEX `projects_user_id` ON `projects` (`user_id`);--> statement-breakpoint
CREATE TABLE `rate_limits` (
	`bucket_key` text NOT NULL,
	`window_start` integer NOT NULL,
	`request_count` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`bucket_key`, `window_start`)
);
--> statement-breakpoint
CREATE TABLE `sessions` (
	`id` text PRIMARY KEY,
	`user_id` text NOT NULL,
	`refresh_hash` text NOT NULL,
	`expires_at` integer NOT NULL,
	`revoked_at` integer,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_refresh_hash_unique` ON `sessions` (`refresh_hash`);--> statement-breakpoint
CREATE INDEX `sessions_user_id` ON `sessions` (`user_id`);--> statement-breakpoint
CREATE INDEX `sessions_expires_at` ON `sessions` (`expires_at`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` text PRIMARY KEY,
	`name` text NOT NULL,
	`email` text COLLATE NOCASE NOT NULL,
	`password_hash` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);