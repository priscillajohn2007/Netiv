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
    photo_path TEXT,
    citizen_name TEXT,
    citizen_phone TEXT,
    status TEXT DEFAULT 'submitted',
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
`);

module.exports = db;
