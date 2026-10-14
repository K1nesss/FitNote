CREATE TABLE IF NOT EXISTS `fitnote_meta` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
ALTER TABLE `workout_exercises` ADD `archived_at` integer;--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_exercises_plan_idx` ON `workout_exercises` (`plan_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `meal_items_meal_idx` ON `meal_items` (`meal_id`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `meals_user_created_idx` ON `meals` (`user_id`,`created_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sessions_user_started_idx` ON `workout_sessions` (`user_id`,`started_at`);--> statement-breakpoint
CREATE INDEX IF NOT EXISTS `workout_sets_session_idx` ON `workout_sets` (`session_id`);