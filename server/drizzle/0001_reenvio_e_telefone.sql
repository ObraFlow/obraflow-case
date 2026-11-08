ALTER TABLE `purchase_orders` ADD `resubmission_of_id` integer REFERENCES purchase_orders(id);--> statement-breakpoint
ALTER TABLE `users` ADD `phone` text;