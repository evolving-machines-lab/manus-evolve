import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import path from 'path';
import fs from 'fs';
import { AVAILABLE_SKILLS } from '../skills';
import { AVAILABLE_INTEGRATIONS } from '../integrations';

// Database path - use data directory for persistence
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'manus.db');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle ORM instance with schema
export const db = drizzle(sqlite, { schema });

// Default user ID used across the app
export const DEFAULT_USER_ID = 'default-user';

// Check if a table exists
function tableExists(tableName: string): boolean {
  const result = sqlite.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name=?"
  ).get(tableName);
  return !!result;
}

// Create all tables if they don't exist
function ensureTablesExist() {
  if (tableExists('users')) {
    return; // Tables already exist
  }

  console.log('Creating database tables...');

  // Create all tables using raw SQL
  sqlite.exec(`
    -- Users
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Projects
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tasks
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      title TEXT NOT NULL,
      prompt TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      agent TEXT NOT NULL,
      model TEXT NOT NULL,
      session_id TEXT,
      browser_live_url TEXT,
      browser_screenshot_url TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Messages
    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      role TEXT NOT NULL,
      content_type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      mime_type TEXT,
      parts TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Tool Calls
    CREATE TABLE IF NOT EXISTS tool_calls (
      id TEXT PRIMARY KEY,
      message_id TEXT NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
      tool_call_id TEXT NOT NULL,
      name TEXT NOT NULL,
      title TEXT,
      kind TEXT NOT NULL DEFAULT 'other',
      status TEXT NOT NULL DEFAULT 'pending',
      input TEXT,
      output TEXT,
      output_content TEXT,
      file_path TEXT,
      command TEXT,
      locations TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Progress Items
    CREATE TABLE IF NOT EXISTS progress_items (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pending',
      priority TEXT NOT NULL DEFAULT 'medium',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Artifacts
    CREATE TABLE IF NOT EXISTS artifacts (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Project Files
    CREATE TABLE IF NOT EXISTS project_files (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Task Context Files (for standalone tasks)
    CREATE TABLE IF NOT EXISTS task_context_files (
      id TEXT PRIMARY KEY,
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      type TEXT NOT NULL,
      size INTEGER NOT NULL,
      content BLOB,
      uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Integrations (Catalog)
    CREATE TABLE IF NOT EXISTS integrations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      icon TEXT,
      category TEXT NOT NULL
    );

    -- Skills (Catalog)
    CREATE TABLE IF NOT EXISTS skills (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      display_name TEXT NOT NULL,
      description TEXT,
      category TEXT NOT NULL
    );

    -- User Integrations
    CREATE TABLE IF NOT EXISTS user_integrations (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      integration_id TEXT NOT NULL REFERENCES integrations(id),
      connected INTEGER NOT NULL DEFAULT 0,
      account_id TEXT,
      connected_at TEXT,
      expires_at TEXT
    );

    -- Project Integrations
    CREATE TABLE IF NOT EXISTS project_integrations (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      integration_id TEXT NOT NULL REFERENCES integrations(id),
      enabled_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Task Integrations
    CREATE TABLE IF NOT EXISTS task_integrations (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      integration_id TEXT NOT NULL REFERENCES integrations(id),
      used_at TEXT
    );

    -- Project Skills
    CREATE TABLE IF NOT EXISTS project_skills (
      project_id TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id),
      enabled_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    -- Task Skills
    CREATE TABLE IF NOT EXISTS task_skills (
      task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      skill_id TEXT NOT NULL REFERENCES skills(id),
      used_at TEXT
    );
  `);

  console.log('Database tables created successfully.');
}

// Ensure default user exists
function ensureDefaultUser() {
  const existing = db.select().from(schema.users).where(eq(schema.users.id, DEFAULT_USER_ID)).get();
  if (!existing) {
    const now = new Date().toISOString();
    db.insert(schema.users).values({
      id: DEFAULT_USER_ID,
      email: 'user@manus.local',
      name: 'Default User',
      createdAt: now,
      updatedAt: now,
    }).run();
  }
}

// Seed skills catalog
function seedSkills() {
  const count = db.select().from(schema.skills).all().length;
  if (count === 0) {
    console.log('Seeding skills catalog...');
    for (const skill of AVAILABLE_SKILLS) {
      db.insert(schema.skills).values({
        id: skill.id,
        name: skill.name,
        displayName: skill.displayName,
        description: skill.description,
        category: skill.category as schema.SkillCategory,
      }).run();
    }
  }
}

// Seed integrations catalog
function seedIntegrations() {
  const count = db.select().from(schema.integrations).all().length;
  if (count === 0) {
    console.log('Seeding integrations catalog...');
    for (const integration of AVAILABLE_INTEGRATIONS) {
      db.insert(schema.integrations).values({
        id: integration.id,
        name: integration.name,
        displayName: integration.displayName,
        description: integration.description,
        category: 'general',
      }).run();
    }
  }
}

// Ensure new tables exist (for migrations)
function ensureNewTables() {
  if (!tableExists('task_context_files')) {
    console.log('Creating task_context_files table...');
    sqlite.exec(`
      CREATE TABLE IF NOT EXISTS task_context_files (
        id TEXT PRIMARY KEY,
        task_id TEXT NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        type TEXT NOT NULL,
        size INTEGER NOT NULL,
        content BLOB,
        uploaded_at TEXT NOT NULL DEFAULT (datetime('now'))
      );
    `);
  }
}

// Check if a column exists in a table
function columnExists(tableName: string, columnName: string): boolean {
  const columns = sqlite.prepare(`PRAGMA table_info(${tableName})`).all() as { name: string }[];
  return columns.some(col => col.name === columnName);
}

// Run migrations to add new columns to existing tables
function runMigrations() {
  // Add new columns to tool_calls table
  if (tableExists('tool_calls')) {
    if (!columnExists('tool_calls', 'output_content')) {
      console.log('Adding output_content column to tool_calls...');
      sqlite.exec('ALTER TABLE tool_calls ADD COLUMN output_content TEXT');
    }
    if (!columnExists('tool_calls', 'file_path')) {
      console.log('Adding file_path column to tool_calls...');
      sqlite.exec('ALTER TABLE tool_calls ADD COLUMN file_path TEXT');
    }
    if (!columnExists('tool_calls', 'command')) {
      console.log('Adding command column to tool_calls...');
      sqlite.exec('ALTER TABLE tool_calls ADD COLUMN command TEXT');
    }
  }

  // Add parts column to messages table
  if (tableExists('messages')) {
    if (!columnExists('messages', 'parts')) {
      console.log('Adding parts column to messages...');
      sqlite.exec('ALTER TABLE messages ADD COLUMN parts TEXT');
    }
  }
}

// Initialize database on module load
ensureTablesExist();
ensureNewTables();
runMigrations();
ensureDefaultUser();
seedSkills();
seedIntegrations();

// Export schema for use in queries
export * from './schema';

// Export types for convenience
export type Database = typeof db;
