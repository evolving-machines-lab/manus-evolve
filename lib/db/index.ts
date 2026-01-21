import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { eq } from 'drizzle-orm';
import * as schema from './schema';
import path from 'path';

// Database path - use data directory for persistence
const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'manus.db');

// Create SQLite database connection
const sqlite = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
sqlite.pragma('journal_mode = WAL');

// Create Drizzle ORM instance with schema
export const db = drizzle(sqlite, { schema });

// Default user ID used across the app
export const DEFAULT_USER_ID = 'default-user';

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

// Initialize on module load
ensureDefaultUser();

// Export schema for use in queries
export * from './schema';

// Export types for convenience
export type Database = typeof db;
