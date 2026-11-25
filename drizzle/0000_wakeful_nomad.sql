CREATE TABLE `study_fields` (
	`user_id` text NOT NULL,
	`unit_id` text NOT NULL,
	`field` text NOT NULL,
	`value` text NOT NULL,
	`revision` integer NOT NULL,
	`mutation_id` text NOT NULL,
	PRIMARY KEY(`user_id`, `unit_id`, `field`)
);
