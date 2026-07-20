CREATE TABLE `life_saves` (
	`user_email` text PRIMARY KEY NOT NULL,
	`display_name` text NOT NULL,
	`save_data` text NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
