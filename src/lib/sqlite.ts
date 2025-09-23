// Conditional SQLite database for uploads - only available in development
let db: any = null;

// Only initialize SQLite in development environment
if (process.env.NODE_ENV === 'development' || process.env.USE_SQLITE === 'true') {
  try {
    // Dynamic import to avoid build issues in production
    const Database = require("better-sqlite3");
    const path = require("path");

    // Database file stored locally in project root
    db = new Database(path.join(process.cwd(), "uploads.db"));

    // Create table if not exists
    db.prepare(`
      CREATE TABLE IF NOT EXISTS documents (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        path TEXT NOT NULL,
        url TEXT,
        uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `).run();

    // Add url column to existing table if it doesn't exist
    try {
      db.prepare(`
        ALTER TABLE documents ADD COLUMN url TEXT
      `).run();
    } catch (error) {
      // Column already exists or other error, ignore
      console.log('URL column already exists or cannot be added:', (error as Error).message);
    }

    console.log('SQLite database initialized for file uploads');
  } catch (error) {
    console.warn('SQLite not available, file uploads will use file system only:', (error as Error).message);
    db = null;
  }
} else {
  console.log('SQLite disabled in production environment');
}

// Mock database interface for production
const mockDb = {
  prepare: (sql: string) => ({
    run: (...args: any[]) => ({
      lastInsertRowid: Date.now(), // Mock ID
      changes: 1
    }),
    all: (...args: any[]) => [],
    get: (...args: any[]) => null
  })
};

export default db || mockDb;
