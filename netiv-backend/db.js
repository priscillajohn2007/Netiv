// db.js — Turso (libSQL) database setup for Netiv.
// Works identically against a real Turso cloud database (production) or a
// local file (development/testing) — same client, same query API, just a
// different connection URL. All queries elsewhere in the app are async.

const { createClient } = require('@libsql/client');

const db = createClient({
  url: process.env.TURSO_DATABASE_URL || 'file:netiv.local.db',
  authToken: process.env.TURSO_AUTH_TOKEN || undefined,
});

async function initSchema() {
  await db.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT,
      password_hash TEXT NOT NULL,
      token_version INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    )
  `);

  await db.execute(`
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
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS password_resets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      otp_hash TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      used INTEGER NOT NULL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS report_reminders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      reference_no TEXT,
      email TEXT NOT NULL,
      zone TEXT,
      address TEXT,
      filed_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_reminder_sent TEXT,
      reminder_count INTEGER NOT NULL DEFAULT 0,
      resolved INTEGER NOT NULL DEFAULT 0
    )
  `);
}

const ready = initSchema();

module.exports = { db, ready };
