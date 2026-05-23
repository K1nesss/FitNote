CREATE TABLE `exercise_library` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text,
	`name` text NOT NULL,
	`muscle_group` text NOT NULL,
	`default_sets` integer NOT NULL,
	`default_reps` integer NOT NULL,
	`default_weight` real NOT NULL,
	`is_builtin` integer NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `nutrition_goals` (
	`user_id` text PRIMARY KEY NOT NULL,
	`calories` real NOT NULL,
	`protein` real NOT NULL,
	`carbs` real NOT NULL,
	`fat` real NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `users` ADD `height_cm` real;--> statement-breakpoint
ALTER TABLE `users` ADD `weight_kg` real;--> statement-breakpoint
ALTER TABLE `users` ADD `updated_at` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `library_exercise_id` text REFERENCES exercise_library(id);
