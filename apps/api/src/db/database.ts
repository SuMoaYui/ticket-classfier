import Database, { type Database as DatabaseType } from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import config from '../config/index.js';
import { runMigrations } from './migrations.js';

let db: DatabaseType | null = null;

/**
 * Get or create the SQLite database connection (singleton).
 * Creates the data directory if it doesn't exist.
 */
export function getDatabase(): DatabaseType {
  if (db) return db;

  const dbPath = config.isTest
    ? ':memory:'
    : path.resolve(config.dbPath);

  // Ensure directory exists for file-based DB
  if (!config.isTest) {
    const dir = path.dirname(dbPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  db = new Database(dbPath);

  // Enable WAL mode for better concurrent read performance
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');

  // Run migrations
  runMigrations(db);

  return db;
}

/**
 * Close the database connection.
 */
export function closeDatabase(): void {
  if (db) {
    db.close();
    db = null;
  }
}

/**
 * Reset the database singleton (for testing).
 */
export function resetDatabase(): DatabaseType {
  closeDatabase();
  return getDatabase();
}
