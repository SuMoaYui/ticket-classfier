/**
 * Database migrations — creates tables if they don't exist.
 */
export function runMigrations(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tickets (
      id TEXT PRIMARY KEY,
      subject TEXT NOT NULL,
      body TEXT NOT NULL,
      customer_email TEXT NOT NULL,
      urgency TEXT DEFAULT 'medium',
      sentiment TEXT DEFAULT 'neutral',
      department TEXT DEFAULT 'general',
      status TEXT DEFAULT 'open',
      confidence REAL DEFAULT 0,
      reasoning TEXT DEFAULT '',
      llm_raw_response TEXT DEFAULT '',
      metadata TEXT DEFAULT '{}',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status);
    CREATE INDEX IF NOT EXISTS idx_tickets_urgency ON tickets(urgency);
    CREATE INDEX IF NOT EXISTS idx_tickets_department ON tickets(department);
    CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at);

    CREATE TABLE IF NOT EXISTS api_keys (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT (datetime('now'))
    );
  `);

  // Seed a default development API key if none exists (ONLY IN DEVELOPMENT)
  if (process.env.NODE_ENV === 'development') {
    const existing = db.prepare('SELECT COUNT(*) as count FROM api_keys').get();
    if (existing.count === 0) {
      db.prepare(
        'INSERT INTO api_keys (key, name) VALUES (?, ?)'
      ).run('dev-api-key-123', 'Development Key');
    }
  }
}
