import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
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

// Export schema for use in queries
export * from './schema';

// Export types for convenience
export type Database = typeof db;
