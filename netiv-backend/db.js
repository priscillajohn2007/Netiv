// db.js — SQLite database setup for Netiv
// Uses better-sqlite3: no separate database server needed, file lives locally.

const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, 'netiv.db'));
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS reports (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    reference_no TEXT UNIQUE NOT NULL,
    user_id INTEGER NOT NULL,
    category_id TEXT NOT NULL,
    category_name TEXT NOT NULL,
    dept_name TEXT NOT NULL,
    description TEXT,
    lat REAL,
    lng REAL,
    house TEXT,
    area TEXT,
    landmark TEXT,
    city TEXT,
    pincode TEXT,
    photo_path TEXT,
    citizen_name TEXT,
    citizen_phone TEXT,
    status TEXT DEFAULT 'submitted',
    letter_text TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

// Safe migrations: if you already had a netiv.db from before these changes,
// CREATE TABLE IF NOT EXISTS won't add new columns on its own — add them here.
const migrations = [
  'ALTER TABLE reports ADD COLUMN letter_text TEXT',
  'ALTER TABLE reports ADD COLUMN house TEXT',
  'ALTER TABLE reports ADD COLUMN area TEXT',
  'ALTER TABLE reports ADD COLUMN landmark TEXT',
  'ALTER TABLE reports ADD COLUMN city TEXT',
  'ALTER TABLE reports ADD COLUMN pincode TEXT',
];
for (const stmt of migrations) {
  try { db.exec(stmt); } catch (err) { /* column already exists — safe to ignore */ }
}

module.exports = db;
