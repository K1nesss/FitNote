CREATE TABLE IF NOT EXISTS `body_weights` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date_key` text NOT NULL,
	`weight` real NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS `body_weights_user_date_idx` ON `body_weights` (`user_id`,`date_key`);--> statement-breakpoint
CREATE TABLE IF NOT EXISTS `water_logs` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`date_key` text NOT NULL,
	`ml` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `exercise_library` ADD `kind` text DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `kind` text DEFAULT 'strength' NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD `duration_sec` integer;--> statement-breakpoint
ALTER TABLE `workout_sets` ADD `distance_m` real;