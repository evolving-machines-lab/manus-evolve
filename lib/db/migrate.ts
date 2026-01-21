import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DATABASE_PATH || path.join(process.cwd(), 'data', 'manus.db');
const MIGRATIONS_PATH = path.join(process.cwd(), 'drizzle');

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Run migrations
export function runMigrations() {
  console.log('Running database migrations...');

  const sqlite = new Database(DB_PATH);
  sqlite.pragma('journal_mode = WAL');

  const db = drizzle(sqlite);

  try {
    migrate(db, { migrationsFolder: MIGRATIONS_PATH });
    console.log('Migrations completed successfully');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    sqlite.close();
  }
}

// Run if called directly
if (require.main === module) {
  runMigrations();
}
