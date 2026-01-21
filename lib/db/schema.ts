import { sqliteTable, text, integer, blob } from 'drizzle-orm/sqlite-core';
import { relations } from 'drizzle-orm';

// ============================================================================
// ENUMS (as text with type constraints in TypeScript)
// ============================================================================

export const taskStatusEnum = ['pending', 'running', 'paused', 'completed', 'failed'] as const;
export type TaskStatus = typeof taskStatusEnum[number];

export const agentTypeEnum = ['claude', 'codex', 'gemini', 'qwen'] as const;
export type AgentType = typeof agentTypeEnum[number];

export const messageRoleEnum = ['user', 'assistant', 'system'] as const;
export type MessageRole = typeof messageRoleEnum[number];

export const contentTypeEnum = ['text', 'image'] as const;
export type ContentType = typeof contentTypeEnum[number];

export const toolCallStatusEnum = ['pending', 'in_progress', 'completed', 'failed'] as const;
export type ToolCallStatus = typeof toolCallStatusEnum[number];

export const toolKindEnum = ['read', 'edit', 'delete', 'move', 'search', 'execute', 'think', 'fetch', 'switch_mode', 'other'] as const;
export type ToolKind = typeof toolKindEnum[number];

export const progressStatusEnum = ['pending', 'in_progress', 'completed'] as const;
export type ProgressStatus = typeof progressStatusEnum[number];

export const progressPriorityEnum = ['high', 'medium', 'low'] as const;
export type ProgressPriority = typeof progressPriorityEnum[number];

export const skillCategoryEnum = ['documents', 'research', 'design', 'business', 'development', 'media'] as const;
export type SkillCategory = typeof skillCategoryEnum[number];

// ============================================================================
// TABLES
// ============================================================================

// 1. Users
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
});

// 2. Projects
export const projects = sqliteTable('projects', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
});

// 3. Tasks
export const tasks = sqliteTable('tasks', {
  id: text('id').primaryKey(),
  projectId: text('project_id').references(() => projects.id, { onDelete: 'cascade' }),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  prompt: text('prompt').notNull(),
  status: text('status').$type<TaskStatus>().notNull().default('pending'),
  agent: text('agent').$type<AgentType>().notNull(),
  model: text('model').notNull(),
  sessionId: text('session_id'),
  browserLiveUrl: text('browser_live_url'),
  browserScreenshotUrl: text('browser_screenshot_url'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
});

// 4. Messages
export const messages = sqliteTable('messages', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  role: text('role').$type<MessageRole>().notNull(),
  contentType: text('content_type').$type<ContentType>().notNull().default('text'),
  content: text('content').notNull(),
  mimeType: text('mime_type'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

// 5. Tool Calls
export const toolCalls = sqliteTable('tool_calls', {
  id: text('id').primaryKey(),
  messageId: text('message_id').notNull().references(() => messages.id, { onDelete: 'cascade' }),
  toolCallId: text('tool_call_id').notNull(),
  name: text('name').notNull(),
  title: text('title'),
  kind: text('kind').$type<ToolKind>().notNull().default('other'),
  status: text('status').$type<ToolCallStatus>().notNull().default('pending'),
  input: text('input'), // JSON stringified
  output: text('output'), // JSON stringified
  locations: text('locations'), // JSON stringified array of {path, line}
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
});

// 6. Progress Items
export const progressItems = sqliteTable('progress_items', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  content: text('content').notNull(),
  status: text('status').$type<ProgressStatus>().notNull().default('pending'),
  priority: text('priority').$type<ProgressPriority>().notNull().default('medium'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
  updatedAt: text('updated_at').notNull().default(new Date().toISOString()),
});

// 7. Artifacts
export const artifacts = sqliteTable('artifacts', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  path: text('path').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

// 8. Project Files
export const projectFiles = sqliteTable('project_files', {
  id: text('id').primaryKey(),
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  path: text('path').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  content: blob('content'), // For small files, larger files use path reference
  uploadedAt: text('uploaded_at').notNull().default(new Date().toISOString()),
});

// 8b. Task Context Files (for standalone tasks)
export const taskContextFiles = sqliteTable('task_context_files', {
  id: text('id').primaryKey(),
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  path: text('path').notNull(),
  type: text('type').notNull(),
  size: integer('size').notNull(),
  content: blob('content'), // For small files
  uploadedAt: text('uploaded_at').notNull().default(new Date().toISOString()),
});

// 9. Integrations (Reference/Catalog)
export const integrations = sqliteTable('integrations', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  icon: text('icon'),
  category: text('category').notNull(),
});

// 10. Skills (Reference/Catalog)
export const skills = sqliteTable('skills', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  displayName: text('display_name').notNull(),
  description: text('description'),
  category: text('category').$type<SkillCategory>().notNull(),
});

// 11. User Integrations
export const userIntegrations = sqliteTable('user_integrations', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  integrationId: text('integration_id').notNull().references(() => integrations.id),
  connected: integer('connected', { mode: 'boolean' }).notNull().default(false),
  accountId: text('account_id'),
  connectedAt: text('connected_at'),
  expiresAt: text('expires_at'),
});

// 12. Project Integrations (Junction)
export const projectIntegrations = sqliteTable('project_integrations', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  integrationId: text('integration_id').notNull().references(() => integrations.id),
  enabledAt: text('enabled_at').notNull().default(new Date().toISOString()),
});

// 13. Task Integrations (Junction)
export const taskIntegrations = sqliteTable('task_integrations', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  integrationId: text('integration_id').notNull().references(() => integrations.id),
  usedAt: text('used_at'),
});

// 14. Project Skills (Junction)
export const projectSkills = sqliteTable('project_skills', {
  projectId: text('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  enabledAt: text('enabled_at').notNull().default(new Date().toISOString()),
});

// 15. Task Skills (Junction)
export const taskSkills = sqliteTable('task_skills', {
  taskId: text('task_id').notNull().references(() => tasks.id, { onDelete: 'cascade' }),
  skillId: text('skill_id').notNull().references(() => skills.id),
  usedAt: text('used_at'),
});

// ============================================================================
// RELATIONS
// ============================================================================

export const usersRelations = relations(users, ({ many }) => ({
  projects: many(projects),
  tasks: many(tasks),
  userIntegrations: many(userIntegrations),
}));

export const projectsRelations = relations(projects, ({ one, many }) => ({
  user: one(users, { fields: [projects.userId], references: [users.id] }),
  tasks: many(tasks),
  files: many(projectFiles),
  integrations: many(projectIntegrations),
  skills: many(projectSkills),
}));

export const tasksRelations = relations(tasks, ({ one, many }) => ({
  project: one(projects, { fields: [tasks.projectId], references: [projects.id] }),
  user: one(users, { fields: [tasks.userId], references: [users.id] }),
  messages: many(messages),
  progressItems: many(progressItems),
  artifacts: many(artifacts),
  integrations: many(taskIntegrations),
  skills: many(taskSkills),
  contextFiles: many(taskContextFiles),
}));

export const messagesRelations = relations(messages, ({ one, many }) => ({
  task: one(tasks, { fields: [messages.taskId], references: [tasks.id] }),
  toolCalls: many(toolCalls),
}));

export const toolCallsRelations = relations(toolCalls, ({ one }) => ({
  message: one(messages, { fields: [toolCalls.messageId], references: [messages.id] }),
}));

export const progressItemsRelations = relations(progressItems, ({ one }) => ({
  task: one(tasks, { fields: [progressItems.taskId], references: [tasks.id] }),
}));

export const artifactsRelations = relations(artifacts, ({ one }) => ({
  task: one(tasks, { fields: [artifacts.taskId], references: [tasks.id] }),
}));

export const projectFilesRelations = relations(projectFiles, ({ one }) => ({
  project: one(projects, { fields: [projectFiles.projectId], references: [projects.id] }),
}));

export const taskContextFilesRelations = relations(taskContextFiles, ({ one }) => ({
  task: one(tasks, { fields: [taskContextFiles.taskId], references: [tasks.id] }),
}));

export const integrationsRelations = relations(integrations, ({ many }) => ({
  userIntegrations: many(userIntegrations),
  projectIntegrations: many(projectIntegrations),
  taskIntegrations: many(taskIntegrations),
}));

export const skillsRelations = relations(skills, ({ many }) => ({
  projectSkills: many(projectSkills),
  taskSkills: many(taskSkills),
}));

export const userIntegrationsRelations = relations(userIntegrations, ({ one }) => ({
  user: one(users, { fields: [userIntegrations.userId], references: [users.id] }),
  integration: one(integrations, { fields: [userIntegrations.integrationId], references: [integrations.id] }),
}));

export const projectIntegrationsRelations = relations(projectIntegrations, ({ one }) => ({
  project: one(projects, { fields: [projectIntegrations.projectId], references: [projects.id] }),
  integration: one(integrations, { fields: [projectIntegrations.integrationId], references: [integrations.id] }),
}));

export const taskIntegrationsRelations = relations(taskIntegrations, ({ one }) => ({
  task: one(tasks, { fields: [taskIntegrations.taskId], references: [tasks.id] }),
  integration: one(integrations, { fields: [taskIntegrations.integrationId], references: [integrations.id] }),
}));

export const projectSkillsRelations = relations(projectSkills, ({ one }) => ({
  project: one(projects, { fields: [projectSkills.projectId], references: [projects.id] }),
  skill: one(skills, { fields: [projectSkills.skillId], references: [skills.id] }),
}));

export const taskSkillsRelations = relations(taskSkills, ({ one }) => ({
  task: one(tasks, { fields: [taskSkills.taskId], references: [tasks.id] }),
  skill: one(skills, { fields: [taskSkills.skillId], references: [skills.id] }),
}));
