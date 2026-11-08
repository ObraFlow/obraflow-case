CREATE TABLE `approval_steps` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`position` integer NOT NULL,
	`approver_id` integer NOT NULL,
	`status` text NOT NULL,
	`decided_at` text,
	`reason` text,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`approver_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "approval_steps_status_ck" CHECK("approval_steps"."status" IN ('WAITING', 'PENDING', 'APPROVED', 'REJECTED', 'CANCELED')),
	CONSTRAINT "approval_steps_reason_ck" CHECK("approval_steps"."status" <> 'REJECTED' OR length(trim("approval_steps"."reason")) > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `approval_steps_position_uq` ON `approval_steps` (`order_id`,`position`);--> statement-breakpoint
CREATE TABLE `approval_tiers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` integer NOT NULL,
	`up_to_cents` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "tiers_limit_positive" CHECK("approval_tiers"."up_to_cents" IS NULL OR "approval_tiers"."up_to_cents" > 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tiers_site_limit_uq` ON `approval_tiers` (`site_id`,`up_to_cents`);--> statement-breakpoint
CREATE UNIQUE INDEX `tiers_site_open_uq` ON `approval_tiers` (`site_id`) WHERE "approval_tiers"."up_to_cents" IS NULL;--> statement-breakpoint
CREATE TABLE `order_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`type` text NOT NULL,
	`actor_id` integer NOT NULL,
	`reason` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`actor_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `order_events_order_idx` ON `order_events` (`order_id`);--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`order_id` integer NOT NULL,
	`position` integer NOT NULL,
	`description` text NOT NULL,
	`quantity_milli` integer NOT NULL,
	`unit` text NOT NULL,
	`unit_price_cents` integer NOT NULL,
	`total_cents` integer NOT NULL,
	FOREIGN KEY (`order_id`) REFERENCES `purchase_orders`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "order_items_qty_ck" CHECK("order_items"."quantity_milli" > 0),
	CONSTRAINT "order_items_price_ck" CHECK("order_items"."unit_price_cents" >= 0)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `order_items_position_uq` ON `order_items` (`order_id`,`position`);--> statement-breakpoint
CREATE TABLE `purchase_orders` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`site_id` integer NOT NULL,
	`supplier_id` integer NOT NULL,
	`requester_id` integer NOT NULL,
	`order_date` text NOT NULL,
	`notes` text,
	`total_cents` integer NOT NULL,
	`status` text DEFAULT 'PENDING' NOT NULL,
	`current_step` integer,
	`tier_id` integer,
	`tier_up_to_cents` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`site_id`) REFERENCES `sites`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`requester_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`tier_id`) REFERENCES `approval_tiers`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "orders_status_ck" CHECK("purchase_orders"."status" IN ('PENDING', 'APPROVED', 'REJECTED')),
	CONSTRAINT "orders_total_ck" CHECK("purchase_orders"."total_cents" >= 0),
	CONSTRAINT "orders_step_ck" CHECK(("purchase_orders"."status" = 'PENDING' AND "purchase_orders"."current_step" IS NOT NULL) OR ("purchase_orders"."status" <> 'PENDING' AND "purchase_orders"."current_step" IS NULL))
);
--> statement-breakpoint
CREATE INDEX `orders_status_site_idx` ON `purchase_orders` (`status`,`site_id`);--> statement-breakpoint
CREATE TABLE `sites` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`city` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sites_code_unique` ON `sites` (`code`);--> statement-breakpoint
CREATE TABLE `suppliers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`cnpj` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `suppliers_cnpj_unique` ON `suppliers` (`cnpj`);--> statement-breakpoint
CREATE TABLE `tier_approvers` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tier_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`tier_id`) REFERENCES `approval_tiers`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `tier_approvers_position_uq` ON `tier_approvers` (`tier_id`,`position`);--> statement-breakpoint
CREATE UNIQUE INDEX `tier_approvers_user_uq` ON `tier_approvers` (`tier_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`email` text NOT NULL,
	`role` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);