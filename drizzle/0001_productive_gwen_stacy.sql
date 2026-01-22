CREATE TABLE `task_context_files` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`content` blob,
	`uploaded_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_artifacts` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`content` blob,
	`created_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_artifacts`("id", "task_id", "name", "path", "type", "size", "content", "created_at") SELECT "id", "task_id", "name", "path", "type", "size", "content", "created_at" FROM `artifacts`;--> statement-breakpoint
DROP TABLE `artifacts`;--> statement-breakpoint
ALTER TABLE `__new_artifacts` RENAME TO `artifacts`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE TABLE `__new_messages` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`role` text NOT NULL,
	`content_type` text DEFAULT 'text' NOT NULL,
	`content` text NOT NULL,
	`mime_type` text,
	`created_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_messages`("id", "task_id", "role", "content_type", "content", "mime_type", "created_at") SELECT "id", "task_id", "role", "content_type", "content", "mime_type", "created_at" FROM `messages`;--> statement-breakpoint
DROP TABLE `messages`;--> statement-breakpoint
ALTER TABLE `__new_messages` RENAME TO `messages`;--> statement-breakpoint
CREATE TABLE `__new_progress_items` (
	`id` text PRIMARY KEY NOT NULL,
	`task_id` text NOT NULL,
	`content` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`priority` text DEFAULT 'medium' NOT NULL,
	`created_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	`updated_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`task_id`) REFERENCES `tasks`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_progress_items`("id", "task_id", "content", "status", "priority", "created_at", "updated_at") SELECT "id", "task_id", "content", "status", "priority", "created_at", "updated_at" FROM `progress_items`;--> statement-breakpoint
DROP TABLE `progress_items`;--> statement-breakpoint
ALTER TABLE `__new_progress_items` RENAME TO `progress_items`;--> statement-breakpoint
CREATE TABLE `__new_project_files` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text NOT NULL,
	`name` text NOT NULL,
	`path` text NOT NULL,
	`type` text NOT NULL,
	`size` integer NOT NULL,
	`content` blob,
	`uploaded_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_project_files`("id", "project_id", "name", "path", "type", "size", "content", "uploaded_at") SELECT "id", "project_id", "name", "path", "type", "size", "content", "uploaded_at" FROM `project_files`;--> statement-breakpoint
DROP TABLE `project_files`;--> statement-breakpoint
ALTER TABLE `__new_project_files` RENAME TO `project_files`;--> statement-breakpoint
CREATE TABLE `__new_project_integrations` (
	`project_id` text NOT NULL,
	`integration_id` text NOT NULL,
	`enabled_at` text DEFAULT '2026-01-22T03:50:17.414Z' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`integration_id`) REFERENCES `integrations`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_project_integrations`("project_id", "integration_id", "enabled_at") SELECT "project_id", "integration_id", "enabled_at" FROM `project_integrations`;--> statement-breakpoint
DROP TABLE `project_integrations`;--> statement-breakpoint
ALTER TABLE `__new_project_integrations` RENAME TO `project_integrations`;--> statement-breakpoint
CREATE TABLE `__new_project_skills` (
	`project_id` text NOT NULL,
	`skill_id` text NOT NULL,
	`enabled_at` text DEFAULT '2026-01-22T03:50:17.414Z' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`skill_id`) REFERENCES `skills`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
INSERT INTO `__new_project_skills`("project_id", "skill_id", "enabled_at") SELECT "project_id", "skill_id", "enabled_at" FROM `project_skills`;--> statement-breakpoint
DROP TABLE `project_skills`;--> statement-breakpoint
ALTER TABLE `__new_project_skills` RENAME TO `project_skills`;--> statement-breakpoint
CREATE TABLE `__new_projects` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`created_at` text DEFAULT '2026-01-22T03:50:17.412Z' NOT NULL,
	`updated_at` text DEFAULT '2026-01-22T03:50:17.412Z' NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_projects`("id", "user_id", "name", "description", "created_at", "updated_at") SELECT "id", "user_id", "name", "description", "created_at", "updated_at" FROM `projects`;--> statement-breakpoint
DROP TABLE `projects`;--> statement-breakpoint
ALTER TABLE `__new_projects` RENAME TO `projects`;--> statement-breakpoint
CREATE TABLE `__new_tasks` (
	`id` text PRIMARY KEY NOT NULL,
	`project_id` text,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`prompt` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`agent` text NOT NULL,
	`model` text NOT NULL,
	`session_id` text,
	`browser_live_url` text,
	`browser_screenshot_url` text,
	`created_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	`updated_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`project_id`) REFERENCES `projects`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tasks`("id", "project_id", "user_id", "title", "prompt", "status", "agent", "model", "session_id", "browser_live_url", "browser_screenshot_url", "created_at", "updated_at") SELECT "id", "project_id", "user_id", "title", "prompt", "status", "agent", "model", "session_id", "browser_live_url", "browser_screenshot_url", "created_at", "updated_at" FROM `tasks`;--> statement-breakpoint
DROP TABLE `tasks`;--> statement-breakpoint
ALTER TABLE `__new_tasks` RENAME TO `tasks`;--> statement-breakpoint
CREATE TABLE `__new_tool_calls` (
	`id` text PRIMARY KEY NOT NULL,
	`message_id` text NOT NULL,
	`tool_call_id` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`kind` text DEFAULT 'other' NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`input` text,
	`output` text,
	`output_content` text,
	`file_path` text,
	`command` text,
	`locations` text,
	`created_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	`updated_at` text DEFAULT '2026-01-22T03:50:17.413Z' NOT NULL,
	FOREIGN KEY (`message_id`) REFERENCES `messages`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tool_calls`("id", "message_id", "tool_call_id", "name", "title", "kind", "status", "input", "output", "output_content", "file_path", "command", "locations", "created_at", "updated_at") SELECT "id", "message_id", "tool_call_id", "name", "title", "kind", "status", "input", "output", "output_content", "file_path", "command", "locations", "created_at", "updated_at" FROM `tool_calls`;--> statement-breakpoint
DROP TABLE `tool_calls`;--> statement-breakpoint
ALTER TABLE `__new_tool_calls` RENAME TO `tool_calls`;--> statement-breakpoint
CREATE TABLE `__new_users` (
	`id` text PRIMARY KEY NOT NULL,
	`email` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT '2026-01-22T03:50:17.411Z' NOT NULL,
	`updated_at` text DEFAULT '2026-01-22T03:50:17.412Z' NOT NULL
);
--> statement-breakpoint
INSERT INTO `__new_users`("id", "email", "name", "created_at", "updated_at") SELECT "id", "email", "name", "created_at", "updated_at" FROM `users`;--> statement-breakpoint
DROP TABLE `users`;--> statement-breakpoint
ALTER TABLE `__new_users` RENAME TO `users`;--> statement-breakpoint
CREATE UNIQUE INDEX `users_email_unique` ON `users` (`email`);