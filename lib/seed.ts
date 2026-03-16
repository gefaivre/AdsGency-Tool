import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";

const DB_PATH = path.join(process.cwd(), "data", "agency.db");
const MOCK_PATH = path.join(process.cwd(), "data", "meta_mock.json");

// Remove existing DB (including WAL/SHM files to avoid I/O errors)
for (const suffix of ["", "-shm", "-wal"]) {
  const p = DB_PATH + suffix;
  if (fs.existsSync(p)) fs.unlinkSync(p);
}
console.log("🗑  Ancienne DB supprimée");

const db = new Database(DB_PATH);
db.pragma("journal_mode = WAL");

// Create schema
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
    status TEXT NOT NULL,
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
    format TEXT NOT NULL,
    status TEXT NOT NULL,
    assigned_to TEXT,
    due_date TEXT,
    notes TEXT,
    FOREIGN KEY (client_id) REFERENCES clients(id),
    FOREIGN KEY (campaign_id) REFERENCES campaigns(id)
  );
`);

const mock = JSON.parse(fs.readFileSync(MOCK_PATH, "utf-8"));

// Insert admin account
const adminHash = bcrypt.hashSync("admin2024", 10);
db.prepare("INSERT INTO admins (name, email, password_hash) VALUES (?, ?, ?)")
  .run("Directeur Spark Media", "admin@sparkmedia.com", adminHash);
console.log("✅ Admin créé: admin@sparkmedia.com");

// Insert agency
const agencyHash = bcrypt.hashSync(mock.agency.password, 10);
const agencyResult = db
  .prepare("INSERT INTO agencies (name, email, password_hash) VALUES (?, ?, ?)")
  .run(mock.agency.name, mock.agency.email, agencyHash);
const agencyId = agencyResult.lastInsertRowid as number;
console.log(`✅ Agence créée: ${mock.agency.name}`);

// Insert clients
for (const client of mock.clients) {
  const clientHash = bcrypt.hashSync(client.password, 10);
  const clientResult = db
    .prepare(
      "INSERT INTO clients (name, email, password_hash, agency_id, industry, logo_color) VALUES (?, ?, ?, ?, ?, ?)"
    )
    .run(client.name, client.email, clientHash, agencyId, client.industry, client.logo_color);
  const clientId = clientResult.lastInsertRowid as number;

  // Insert campaigns
  for (const campaign of client.campaigns) {
    const campaignResult = db
      .prepare(
        `INSERT INTO campaigns (client_id, name, status, objective, daily_budget, total_spend,
         impressions, reach, clicks, ctr, cpc, start_date, end_date)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      )
      .run(
        clientId,
        campaign.name,
        campaign.status,
        campaign.objective,
        campaign.daily_budget,
        campaign.total_spend,
        campaign.impressions,
        campaign.reach,
        campaign.clicks,
        campaign.ctr,
        campaign.cpc,
        campaign.start_date,
        campaign.end_date
      );
    const campaignId = campaignResult.lastInsertRowid as number;

    // Generate 30 days of daily metrics
    const endDate = new Date(campaign.end_date) < new Date() ? new Date(campaign.end_date) : new Date();
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - 29);

    const insertDaily = db.prepare(
      "INSERT INTO campaign_metrics_daily (campaign_id, date, impressions, reach, clicks, spend) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const totalDays = 30;
    for (let i = 0; i < totalDays; i++) {
      const d = new Date(startDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];

      // Distribute metrics with some variance
      const variance = 0.6 + Math.random() * 0.8;
      const dailyImpressions = Math.round((campaign.impressions / totalDays) * variance);
      const dailyReach = Math.round((campaign.reach / totalDays) * variance);
      const dailyClicks = Math.round((campaign.clicks / totalDays) * variance);
      const dailySpend = Math.round(((campaign.total_spend / totalDays) * variance) * 100) / 100;

      insertDaily.run(campaignId, dateStr, dailyImpressions, dailyReach, dailyClicks, dailySpend);
    }
  }

  // Insert creatives (link to campaign by name)
  for (const creative of client.creatives) {
    const campaignRow = db
      .prepare("SELECT id FROM campaigns WHERE client_id = ? AND name = ?")
      .get(clientId, creative.campaign) as { id: number } | undefined;

    db.prepare(
      `INSERT INTO creatives (client_id, campaign_id, title, format, status, assigned_to, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    ).run(
      clientId,
      campaignRow?.id ?? null,
      creative.title,
      creative.format,
      creative.status,
      creative.assigned_to ?? null,
      creative.due_date
    );
  }

  console.log(`  ✅ Client: ${client.name} (${client.campaigns.length} campagnes, ${client.creatives.length} créatifs)`);
}

// Insert client contracts (monthly retainers per client, matched by email)
const contractData: Record<string, { retainer: number; start: string }> = {
  "leblanc@demo.com":      { retainer: 2400,  start: "2024-09-01" },
  "eclat@demo.com":        { retainer: 1800,  start: "2024-11-01" },
  "provencal@demo.com":    { retainer: 900,   start: "2025-01-01" },
  "techstart@demo.com":    { retainer: 3500,  start: "2024-07-01" },
  "formeplus@demo.com":    { retainer: 1200,  start: "2024-10-01" },
  "dupont@demo.com":       { retainer: 2100,  start: "2025-02-01" },
  "autoprestige@demo.com": { retainer: 1500,  start: "2024-12-01" },
  "babel@demo.com":        { retainer: 1600,  start: "2024-08-01" },
  "decoandco@demo.com":    { retainer: 1300,  start: "2025-01-01" },
  "santeplus@demo.com":    { retainer: 2800,  start: "2024-06-01" },
};

const insertContract = db.prepare(
  "INSERT INTO client_contracts (client_id, monthly_retainer, contract_start) VALUES (?, ?, ?)"
);

for (const [email, data] of Object.entries(contractData)) {
  const row = db.prepare("SELECT id FROM clients WHERE email = ?").get(email) as { id: number } | undefined;
  if (row) {
    insertContract.run(row.id, data.retainer, data.start);
  }
}
console.log("✅ Contrats clients insérés");

console.log("\n🎉 Base de données initialisée avec succès !");
console.log(`📍 DB: ${DB_PATH}`);
console.log("\n🔑 Identifiants de démo:");
console.log(`  Admin  → admin@sparkmedia.com / admin2024`);
console.log(`  Agence → ${mock.agency.email} / ${mock.agency.password}`);
mock.clients.forEach((c: { email: string; password: string }) => {
  console.log(`  Client → ${c.email} / ${c.password}`);
});
