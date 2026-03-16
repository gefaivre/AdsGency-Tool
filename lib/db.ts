import Database from "better-sqlite3";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "agency.db");

let db: Database.Database;

export function getDb(): Database.Database {
  if (!db) {
    db = new Database(DB_PATH);
    db.pragma("journal_mode = WAL");
    initSchema(db);
  }
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS client_contracts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL UNIQUE,
      monthly_retainer REAL NOT NULL,
      contract_start TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS agencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS clients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      agency_id INTEGER NOT NULL,
      industry TEXT NOT NULL,
      logo_color TEXT NOT NULL DEFAULT '#3B82F6',
      FOREIGN KEY (agency_id) REFERENCES agencies(id)
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('ACTIVE', 'PAUSED', 'ENDED')),
      objective TEXT NOT NULL,
      daily_budget REAL NOT NULL,
      total_spend REAL NOT NULL,
      impressions INTEGER NOT NULL,
      reach INTEGER NOT NULL,
      clicks INTEGER NOT NULL,
      ctr REAL NOT NULL,
      cpc REAL NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE TABLE IF NOT EXISTS campaign_metrics_daily (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL,
      date TEXT NOT NULL,
      impressions INTEGER NOT NULL,
      reach INTEGER NOT NULL,
      clicks INTEGER NOT NULL,
      spend REAL NOT NULL,
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS creatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      campaign_id INTEGER,
      title TEXT NOT NULL,
      format TEXT NOT NULL CHECK(format IN ('VIDEO', 'IMAGE', 'CAROUSEL', 'STORY')),
      status TEXT NOT NULL CHECK(status IN ('BRIEF', 'EN_PROD', 'REVIEW', 'VALIDE', 'LIVE')),
      assigned_to TEXT,
      due_date TEXT,
      notes TEXT,
      FOREIGN KEY (client_id) REFERENCES clients(id),
      FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
    );

    CREATE TABLE IF NOT EXISTS messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      client_id INTEGER NOT NULL,
      sender_role TEXT NOT NULL CHECK(sender_role IN ('agency', 'client')),
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      read_by_agency INTEGER NOT NULL DEFAULT 0,
      read_by_client INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (client_id) REFERENCES clients(id)
    );

    CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
    CREATE INDEX IF NOT EXISTS idx_messages_unread_agency ON messages(client_id, read_by_agency);
    CREATE INDEX IF NOT EXISTS idx_messages_unread_client ON messages(client_id, read_by_client);
  `);
}
