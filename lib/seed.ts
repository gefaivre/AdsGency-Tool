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

  CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    sender_role TEXT NOT NULL CHECK(sender_role IN ('agency', 'client')),
    content TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    read_by_agency INTEGER NOT NULL DEFAULT 1,
    read_by_client INTEGER NOT NULL DEFAULT 1,
    FOREIGN KEY (client_id) REFERENCES clients(id)
  );

  CREATE INDEX IF NOT EXISTS idx_messages_client_id ON messages(client_id);
  CREATE INDEX IF NOT EXISTS idx_messages_unread_agency ON messages(client_id, read_by_agency);
  CREATE INDEX IF NOT EXISTS idx_messages_unread_client ON messages(client_id, read_by_client);
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

// ─── Seed messages ──────────────────────────────────────────────────────────
const insertMessage = db.prepare(
  `INSERT INTO messages (client_id, sender_role, content, created_at, read_by_agency, read_by_client)
   VALUES (?, ?, ?, ?, ?, ?)`
);

// Helper: ISO datetime string offset by N days from today
function daysAgo(n: number, hour = "10:00:00"): string {
  const d = new Date("2026-03-16");
  d.setDate(d.getDate() - n);
  return `${d.toISOString().split("T")[0]} ${hour}`;
}

const seedMessages: Record<string, { role: "agency" | "client"; content: string; daysAgo: number; hour: string; readByAgency?: number; readByClient?: number }[]> = {

  "leblanc@demo.com": [
    { role: "agency",  content: "Bonjour Maison Leblanc, votre campagne 'Résidences Prestige Printemps' est maintenant live. Les premières impressions sont très prometteuses — on observe un CTR de 2,1% sur les audiences propriétaires 35-55 ans. On vous envoie le rapport complet vendredi.", daysAgo: 14, hour: "09:15:00" },
    { role: "client",  content: "Super nouvelle ! On a déjà eu deux appels entrants ce matin qui mentionnaient avoir vu la pub sur Instagram. Est-ce qu'on peut booster un peu le budget sur les visuels des appartements avec terrasse ? C'est clairement ce qui attire.", daysAgo: 14, hour: "11:42:00" },
    { role: "agency",  content: "Absolument, on a observé la même tendance côté analytics. On va réallouer 20% du budget quotidien vers les visuels terrasse/extérieur. On ajuste ça dans les prochaines heures.", daysAgo: 14, hour: "14:03:00" },
    { role: "client",  content: "Parfait. Au fait, pour les visuels du programme Châtelet — vous pensez qu'on peut avoir les maquettes pour validation cette semaine ? On a un salon immobilier le 28.", daysAgo: 10, hour: "08:55:00" },
    { role: "agency",  content: "On est sur le coup, les maquettes sont en finalisation chez l'équipe créa. Vous les aurez demain matin au plus tard, largement avant le salon. On intégrera aussi une déclinaison format Story pour Instagram.", daysAgo: 10, hour: "10:20:00" },
    { role: "client",  content: "Merci beaucoup. Je voulais aussi vous demander : est-ce qu'il serait pertinent de tester des campagnes YouTube pour ce type de bien ? On vend souvent grâce à la vidéo.", daysAgo: 6,  hour: "16:30:00" },
    { role: "agency",  content: "Très bonne intuition. YouTube Trueview est particulièrement efficace pour l'immobilier haut de gamme — on peut faire du ciblage par code postal et centre d'intérêt 'investissement'. On vous prépare une proposition de test pour la semaine prochaine.", daysAgo: 6,  hour: "17:45:00" },
    { role: "client",  content: "Excellent, j'attends ça avec impatience. Merci pour la réactivité comme toujours !", daysAgo: 5,  hour: "09:10:00" },
    { role: "agency",  content: "Voici le bilan de mi-mois : 148 000 impressions, 3 100 clics, 47 leads formulaire. Le coût par lead est à 12,40€ — dans la cible. On vous envoie le PDF complet par email.", daysAgo: 2,  hour: "11:00:00", readByClient: 0 },
  ],

  "eclat@demo.com": [
    { role: "client",  content: "Bonjour, je regardais les résultats de la campagne 'Collection Été' et je ne comprends pas bien la différence entre reach et impressions. Pouvez-vous m'expliquer ?", daysAgo: 18, hour: "10:05:00" },
    { role: "agency",  content: "Bien sûr ! Le reach, c'est le nombre de personnes uniques qui ont vu votre pub. Les impressions, c'est le nombre total d'affichages — une même personne peut voir la pub plusieurs fois. Votre fréquence actuelle est de 2,3 ce qui est dans la zone idéale pour de la notoriété mode.", daysAgo: 18, hour: "10:58:00" },
    { role: "client",  content: "OK c'est très clair merci ! Et notre CTR de 1,8% c'est bien pour notre secteur ?", daysAgo: 18, hour: "11:20:00" },
    { role: "agency",  content: "Oui, la moyenne fashion sur Meta tourne autour de 1,2-1,5%. Vous êtes au-dessus, notamment grâce aux visuels produit fond blanc qu'on a testés. Le carrousel 'looks complets' performe particulièrement bien.", daysAgo: 18, hour: "14:30:00" },
    { role: "client",  content: "Super ! On sort une nouvelle collection le 5 avril — robes de soirée et tenues de mariage. Il faudrait anticiper la campagne. On peut en parler ?", daysAgo: 9,  hour: "09:00:00" },
    { role: "agency",  content: "Absolument, on vous propose un call la semaine prochaine. En attendant, on peut déjà lancer une phase de teasing 'coming soon' dès le 25 mars pour chauffer l'audience. Vous avez des visuels backstage ou coulisses de création ?", daysAgo: 9,  hour: "09:45:00" },
    { role: "client",  content: "Oui on a des photos du showroom et des essayages. Je vous envoie ça par Wetransfer. Et pour le budget, on peut monter à 2 500€ sur avril ?", daysAgo: 9,  hour: "10:12:00" },
    { role: "agency",  content: "Parfait pour les visuels, on les reçoit et on prépare les formats. Pour le budget à 2 500€ en avril, on va décomposer : 800€ teasing, 1 200€ lancement et 500€ retargeting acheteurs existants. On vous soumet le plan complet lundi.", daysAgo: 8,  hour: "16:00:00" },
    { role: "client",  content: "Impeccable. Merci pour votre efficacité !", daysAgo: 7,  hour: "08:30:00" },
    { role: "agency",  content: "Votre plan de campagne avril est prêt et vous a été envoyé par email pour validation. N'hésitez pas si vous avez des ajustements.", daysAgo: 4,  hour: "11:30:00", readByClient: 0 },
    { role: "client",  content: "Je viens de le lire, c'est parfait ! On valide. Go pour le 25.", daysAgo: 3,  hour: "14:15:00", readByAgency: 0 },
  ],

  "provencal@demo.com": [
    { role: "agency",  content: "Bonjour Le Provençal, petit point rapide : votre campagne 'Menu Déjeuner' génère de très bons résultats le jeudi et vendredi. On recommande de concentrer le budget sur ces deux jours plutôt que de l'étaler sur la semaine. Accord ?", daysAgo: 20, hour: "09:30:00" },
    { role: "client",  content: "Oui complètement, le service du midi est effectivement plus chargé en fin de semaine. Vous pouvez faire cet ajustement directement.", daysAgo: 20, hour: "12:15:00" },
    { role: "agency",  content: "C'est fait ! Budget concentré jeudi-vendredi, on verra l'impact dès la semaine prochaine.", daysAgo: 20, hour: "14:00:00" },
    { role: "client",  content: "Au fait, on va lancer une soirée 'Carte blanche au chef' le premier vendredi de chaque mois. 35 couverts max, menu dégustation 7 plats. Est-ce qu'on peut faire quelque chose pour promouvoir ça ?", daysAgo: 12, hour: "10:45:00" },
    { role: "agency",  content: "C'est une excellente idée, ce type d'événement exclusif fonctionne très bien sur les audiences gastronomie. On peut faire une campagne dédiée par événement : visuel soigné, texte qui joue sur l'exclusivité et le nombre de places limité. Budget raisonnable, 150-200€ par soirée suffit.", daysAgo: 12, hour: "11:30:00" },
    { role: "client",  content: "Super. Et pour les réservations, on passe par notre site ou vous avez une solution ?", daysAgo: 12, hour: "15:00:00" },
    { role: "agency",  content: "On recommande de garder votre système de réservation habituel (TheFork ou téléphone) et on redirige simplement vers votre page. Le moins de friction possible pour le client final. On peut aussi tester un formulaire Meta Lead Ads si vous voulez capturer les emails directement.", daysAgo: 12, hour: "16:20:00" },
    { role: "client",  content: "Le formulaire Meta c'est bien. On va partir là-dessus. Prochaine soirée c'est le 4 avril.", daysAgo: 5,  hour: "09:00:00" },
    { role: "agency",  content: "Noté pour le 4 avril ! On lance la campagne le 24 mars pour avoir 10 jours de promotion. On vous enverra les visuels pour validation d'ici vendredi.", daysAgo: 4,  hour: "10:00:00", readByClient: 0 },
  ],

  "techstart@demo.com": [
    { role: "client",  content: "Bonjour, on vient de regarder les données de la campagne LinkedIn et le coût par lead est à 38€. C'est dans les normes pour du B2B SaaS selon vous ?", daysAgo: 22, hour: "08:45:00" },
    { role: "agency",  content: "Bonjour ! En B2B SaaS sur LinkedIn, le coût par lead qualifié tourne généralement entre 30€ et 80€ selon la taille d'entreprise ciblée. À 38€ vous êtes en bonne position. Cela dit, la vraie question c'est le taux de conversion lead → démo. Vous avez ce chiffre côté CRM ?", daysAgo: 22, hour: "09:30:00" },
    { role: "client",  content: "On est à environ 22% de leads qui demandent une démo. Et de la démo on close environ 1 sur 4. Donc roughly 5,5% du lead au client.", daysAgo: 22, hour: "10:00:00" },
    { role: "agency",  content: "Ce sont d'excellents ratios. À 38€ le lead, vous êtes à environ 690€ le client acquis — quel est votre LTV moyen ? Ça nous permettrait de calculer votre CAC/LTV ratio et de voir si on peut justifier d'augmenter les budgets.", daysAgo: 22, hour: "10:45:00" },
    { role: "client",  content: "LTV autour de 8 400€ (700€/mois × 12 mois de durée de vie moyenne). Donc ratio LTV/CAC à 12 — c'est bien ?", daysAgo: 21, hour: "09:15:00" },
    { role: "agency",  content: "C'est excellent — le ratio idéal est 3:1, vous êtes à 12:1. Vous sous-investissez probablement en acquisition. On recommande fortement d'augmenter le budget mensuel de 50% pour les 3 prochains mois et de mesurer l'impact sur le volume de leads. Le plafond n'est pas encore atteint.", daysAgo: 21, hour: "11:00:00" },
    { role: "client",  content: "Argument convaincant. On va soumettre ça au board. En parallèle, on réfléchit à tester Google Ads sur des mots-clés type 'logiciel RH PME' — vous avez de l'expérience sur ce type de campagne ?", daysAgo: 15, hour: "14:00:00" },
    { role: "agency",  content: "Oui, c'est un levier très complémentaire à LinkedIn. Le search capte la demande existante (les gens qui cherchent activement), LinkedIn crée la demande. On peut vous proposer un test avec 500€/mois sur des mots-clés transactionnels. On prépare une liste de mots-clés pour validation.", daysAgo: 15, hour: "15:30:00" },
    { role: "client",  content: "Go pour le test. Envoyez-nous la liste de mots-clés et on valide rapidement.", daysAgo: 14, hour: "09:00:00" },
    { role: "agency",  content: "Liste de 47 mots-clés envoyée par email, classés par volume et intention commerciale. On recommande de démarrer avec les 15 mots-clés 'haute intention' en phase 1.", daysAgo: 13, hour: "14:00:00" },
    { role: "client",  content: "Liste reçue et validée. On démarre quand vous voulez. Et merci pour l'analyse LTV/CAC, c'est exactement ce qu'on voulait montrer au board.", daysAgo: 12, hour: "08:30:00" },
    { role: "agency",  content: "Campagne Google Ads lancée hier. Premiers clics ce matin — CPC moyen à 4,20€ sur les mots-clés prioritaires. On vous fait un premier bilan dans 7 jours.", daysAgo: 3,  hour: "09:00:00", readByClient: 0 },
  ],

  "formeplus@demo.com": [
    { role: "agency",  content: "Bonjour Forme+ ! Bonne nouvelle : votre campagne de rentrée janvier a dépassé les objectifs — 2 340 clics pour un CPC de 0,87€. On recommande de maintenir la pression jusqu'à fin mars avant la baisse saisonnière de printemps.", daysAgo: 25, hour: "10:00:00" },
    { role: "client",  content: "Super nouvelles ! Est-ce qu'on peut ajouter une offre spéciale 'duo' — parrainage avec -30% pour l'ami ? Ça marche très bien dans nos clubs.", daysAgo: 25, hour: "11:30:00" },
    { role: "agency",  content: "Excellente idée, les offres de parrainage ont des taux d'engagement très élevés. On crée une variante de la campagne avec ce message. Il vous faut une landing page dédiée ou on peut rediriger vers votre page inscription habituelle ?", daysAgo: 25, hour: "14:15:00" },
    { role: "client",  content: "Page inscription habituelle c'est bien, on a juste besoin d'un code promo 'DUO30' qu'on va activer de notre côté.", daysAgo: 24, hour: "09:00:00" },
    { role: "agency",  content: "Parfait. Variante 'Offre Duo' lancée avec le code DUO30 en avant. On teste en A/B contre la version standard pendant 2 semaines.", daysAgo: 24, hour: "11:00:00" },
    { role: "client",  content: "On prépare aussi un défi 30 jours en avril — est-ce que c'est le bon moment pour une campagne vidéo courte type Reels ?", daysAgo: 8,  hour: "10:30:00" },
    { role: "agency",  content: "Les Reels sont parfaits pour ce type de défi — fort potentiel viral et très bon reach organique boosté. On recommande 3 Reels : teasing J-7, lancement J-1 et rappel J+15. Vous avez du contenu vidéo existant ou on part sur de la vidéo montée à partir de photos ?", daysAgo: 8,  hour: "11:30:00" },
    { role: "client",  content: "On a des vidéos de cours filmées par notre coach. Qualité iPhone mais dynamiques. Ça peut convenir ?", daysAgo: 7,  hour: "09:00:00" },
    { role: "agency",  content: "Tout à fait — le contenu authentique iPhone performe souvent mieux que le contenu très produit sur les Reels. Envoyez-nous les rushes et on se charge du montage avec sous-titres et musique.", daysAgo: 7,  hour: "10:00:00" },
    { role: "client",  content: "Envoyé via Wetransfer à l'instant. Hâte de voir le résultat !", daysAgo: 6,  hour: "14:00:00" },
    { role: "agency",  content: "Reçu ! On vous livre les 3 Reels montés pour validation jeudi. Le défi 30 jours va cartonner.", daysAgo: 5,  hour: "09:30:00", readByClient: 0 },
  ],

  "dupont@demo.com": [
    { role: "client",  content: "Bonjour, j'aimerais comprendre comment fonctionne le ciblage que vous utilisez pour le cabinet. Les règles déontologiques nous interdisent certaines formes de démarchage.", daysAgo: 30, hour: "09:00:00" },
    { role: "agency",  content: "Bonjour Maître Dupont, très bonne question. Nous utilisons exclusivement du ciblage par centre d'intérêt et par contexte (personnes recherchant des termes juridiques sur Google). Aucun démarchage direct, aucun ciblage par situation personnelle. Tout est conforme aux règles du Barreau sur la communication des avocats.", daysAgo: 30, hour: "10:30:00" },
    { role: "client",  content: "Parfait, c'est rassurant. Et concrètement, quelles recherches ciblez-vous sur Google ?", daysAgo: 29, hour: "11:00:00" },
    { role: "agency",  content: "On cible principalement : 'avocat droit du travail Lyon', 'licenciement abusif', 'conseil juridique entreprise', 'rupture conventionnelle'. Des termes informatifs où l'internaute est clairement en recherche d'aide. On évite tout ciblage de mots-clés pouvant désigner des situations personnelles sensibles.", daysAgo: 29, hour: "14:00:00" },
    { role: "client",  content: "C'est exactement le cadre souhaité. Nos résultats de ce mois sont corrects mais j'ai l'impression qu'on touche beaucoup de particuliers alors qu'on veut développer la clientèle entreprise (PME/ETI).", daysAgo: 16, hour: "08:30:00" },
    { role: "agency",  content: "Vous avez raison, l'audience actuelle est mixte. Pour basculer vers les entreprises : on peut activer le ciblage LinkedIn (décideurs RH et DAF de PME), et sur Google exclure les mots-clés typiquement B2C. On peut aussi tester des campagnes Display sur des sites RH et juridiques professionnels.", daysAgo: 16, hour: "10:00:00" },
    { role: "client",  content: "Le ciblage LinkedIn m'intéresse. Combien ça coûterait de tester ?", daysAgo: 16, hour: "11:15:00" },
    { role: "agency",  content: "On recommande un test à 600€/mois pendant 2 mois — ciblage DRH/DAF/Directeurs Juridiques de PME 50-500 salariés en région Auvergne-Rhône-Alpes. C'est suffisant pour avoir des données significatives. Le CPC LinkedIn est plus élevé (5-12€) mais la qualité du lead est bien supérieure.", daysAgo: 15, hour: "09:00:00" },
    { role: "client",  content: "D'accord pour le test. Je valide le budget de 600€/mois sur 2 mois. On peut commencer le 1er avril ?", daysAgo: 10, hour: "10:00:00" },
    { role: "agency",  content: "Noté, lancement LinkedIn le 1er avril. On vous prépare d'ici là les visuels et le texte pour validation — sobre, professionnel, adapté à votre secteur.", daysAgo: 9,  hour: "11:00:00", readByClient: 0 },
  ],

  "autoprestige@demo.com": [
    { role: "agency",  content: "Bonjour Auto Prestige ! Le bilan de votre campagne 'Portefeuille Premium Hiver' est très positif : 94 demandes de rappel générées, dont 31 ont abouti à une visite en concession. Taux de transformation lead→visite à 33%, au-dessus de la moyenne secteur.", daysAgo: 18, hour: "09:00:00" },
    { role: "client",  content: "Excellent ! On a d'ailleurs eu quelques ventes directement attribuées aux leads Meta, c'est concret. Question : on reçoit souvent des demandes pour des véhicules qu'on n'a pas en stock. Peut-on cibler différemment ?", daysAgo: 17, hour: "10:30:00" },
    { role: "agency",  content: "Bonne observation. On peut créer des groupes d'annonces par modèle en stock avec désactivation automatique quand un modèle est vendu. Ça nécessite un flux de votre inventaire (CSV ou API). Vous avez ça côté technique ?", daysAgo: 17, hour: "11:30:00" },
    { role: "client",  content: "On a un CSV mis à jour chaque lundi. C'est suffisant ?", daysAgo: 17, hour: "14:00:00" },
    { role: "agency",  content: "Oui, un CSV hebdomadaire c'est bien pour commencer. Vous nous l'envoyez chaque lundi matin et on met à jour les campagnes. À terme on peut automatiser, mais ça fonctionne très bien manuellement.", daysAgo: 16, hour: "09:00:00" },
    { role: "client",  content: "Parfait. On va aussi reprendre un stock de Mercedes Classe E et quelques Porsche Cayenne d'occasion ce mois-ci. Il faudrait une campagne spécifique 'sélection du mois' ?", daysAgo: 8,  hour: "11:00:00" },
    { role: "agency",  content: "Oui absolument, les campagnes 'sélection limitée' créent de l'urgence et fonctionnent très bien pour l'automobile premium. On fait des visuels type 'Arrivage exclusif' avec les photos des véhicules. Envoyez-nous les photos HD et les infos clés de chaque véhicule.", daysAgo: 8,  hour: "14:00:00" },
    { role: "client",  content: "Photos et fiches techniques envoyées par email. 4 véhicules en tout. On voudrait lancer ça dès lundi.", daysAgo: 5,  hour: "09:00:00" },
    { role: "agency",  content: "Reçu ! On prépare tout ce week-end et on vous envoie les visuels samedi pour validation. La campagne sera prête pour lundi matin.", daysAgo: 4,  hour: "10:00:00", readByClient: 0 },
  ],

  "babel@demo.com": [
    { role: "client",  content: "Bonjour, on approche de notre période de forte inscriptions (rentrée septembre). Est-ce qu'il faut commencer à préparer les campagnes maintenant même si on est en mars ?", daysAgo: 20, hour: "09:30:00" },
    { role: "agency",  content: "Oui, idéalement on commence à travailler sur la stratégie dès maintenant. La rentrée septembre se prépare en mai-juin pour les campagnes de notoriété, puis on monte en pression en juillet-août. L'objectif est d'être top-of-mind quand les gens décident en août.", daysAgo: 20, hour: "10:30:00" },
    { role: "client",  content: "On veut aussi attirer des profils adultes en reconversion professionnelle, pas seulement des étudiants. On a des formations intensives certifiantes. Comment on adapte le ciblage ?", daysAgo: 19, hour: "14:00:00" },
    { role: "agency",  content: "Pour la reconversion pro, on recommande LinkedIn avec ciblage 25-45 ans, actifs, et Facebook avec l'audience 'intéressés par la formation professionnelle'. Le message est différent : pas 'apprendre une langue' mais 'boostez votre carrière internationale'. On peut faire deux lignes créatives distinctes.", daysAgo: 19, hour: "15:30:00" },
    { role: "client",  content: "Excellente approche. On a justement un partenariat avec un organisme de formation certifié CPF — les cours sont finançables CPF. C'est un argument fort non ?", daysAgo: 12, hour: "09:00:00" },
    { role: "agency",  content: "Très fort ! 'Finançable CPF' est un des arguments les plus efficaces en ce moment sur les campagnes formation adulte. On le met en avant dès le titre de l'annonce. Il faut juste s'assurer d'avoir une page de destination dédiée qui mentionne clairement le CPF.", daysAgo: 12, hour: "10:15:00" },
    { role: "client",  content: "On a la page. Je vous envoie l'URL. Et pour les langues, on mise sur quoi ? On a 12 langues au catalogue.", daysAgo: 11, hour: "11:00:00" },
    { role: "agency",  content: "Pour la phase de lancement on recommande de concentrer sur les 3-4 langues les plus recherchées : anglais business, espagnol, mandarin et allemand. On peut tester les autres langues en phase 2 selon les résultats. Moins de dispersion = meilleur apprentissage algorithmique.", daysAgo: 11, hour: "14:00:00" },
    { role: "client",  content: "Logique. On valide cette approche. On peut caler un call pour aller plus loin dans la stratégie rentrée ?", daysAgo: 4,  hour: "10:00:00" },
    { role: "agency",  content: "Bien sûr ! On vous propose mardi 18 mars à 14h ou jeudi 20 mars à 10h. Dites-nous ce qui vous convient.", daysAgo: 3,  hour: "11:00:00", readByClient: 0 },
  ],

  "decoandco@demo.com": [
    { role: "agency",  content: "Bonjour Déco & Co ! On voulait partager une opportunité : Pinterest Ads est particulièrement sous-utilisé dans la déco d'intérieur alors que c'est la plateforme numéro 1 pour l'inspiration maison. Vous avez un profil Pinterest actif ?", daysAgo: 25, hour: "10:00:00" },
    { role: "client",  content: "On a un profil Pinterest mais on ne l'alimente pas régulièrement. On a environ 200 épingles de nos réalisations. C'est suffisant pour faire de la pub ?", daysAgo: 25, hour: "11:00:00" },
    { role: "agency",  content: "200 épingles c'est très bien comme base ! Pinterest Ads fonctionne avec vos épingles existantes — on les sponsorise et on les pousse sur des audiences 'rénovation maison', 'déco salon', 'inspiration cuisine'. Le CPC est souvent plus bas que Meta sur ce secteur.", daysAgo: 25, hour: "14:00:00" },
    { role: "client",  content: "Intéressant. Vous recommandez quel budget de test ?", daysAgo: 24, hour: "09:30:00" },
    { role: "agency",  content: "300€ pour un test d'un mois, c'est suffisant pour avoir des données. Si ça performe (ce qu'on pense), on peut monter progressivement. On garde les campagnes Meta en parallèle pendant le test.", daysAgo: 24, hour: "10:30:00" },
    { role: "client",  content: "Go pour le test Pinterest. En parallèle, on va avoir une belle réalisation à photographier la semaine prochaine — un appartement haussmannien qu'on vient de refaire entièrement. Un photographe professionnel passe. Ces photos peuvent servir aux campagnes ?", daysAgo: 15, hour: "14:00:00" },
    { role: "agency",  content: "Ces photos vont être de l'or pour vos campagnes ! Notamment pour Pinterest et Instagram. Si possible demandez des plans larges, des détails de matières et quelques shots lifestyle (verre de vin sur la table, plaid sur le canapé...). Ce type de contenu génère énormément d'engagement.", daysAgo: 15, hour: "15:30:00" },
    { role: "client",  content: "Parfait, je transmets les consignes au photographe. On devrait avoir les photos vendredi.", daysAgo: 14, hour: "09:00:00" },
    { role: "agency",  content: "Excellent ! Dès réception on les intègre dans les campagnes. On a hâte de voir le résultat.", daysAgo: 13, hour: "11:00:00" },
    { role: "client",  content: "Les photos sont magnifiques, je vous les envoie ! Je pense qu'on peut en faire un 'before/after' aussi — on a les photos avant travaux.", daysAgo: 7,  hour: "10:00:00" },
    { role: "agency",  content: "Before/after c'est le format qui performe le mieux dans la déco ! On fait un Reel + des posts carrousel. On s'en occupe cette semaine.", daysAgo: 6,  hour: "09:00:00", readByClient: 0 },
  ],

  "santeplus@demo.com": [
    { role: "client",  content: "Bonjour, on a un nouveau médecin spécialiste qui rejoint la clinique en mai — dermatologue. Comment on peut l'intégrer dans notre communication digitale de façon déontologiquement correcte ?", daysAgo: 28, hour: "08:30:00" },
    { role: "agency",  content: "Bonjour ! Pour le secteur médical, on reste dans le cadre du Code de la Santé Publique : information sur les services disponibles, pas de promesses de résultats ni de témoignages. On peut informer que la clinique propose désormais une consultation de dermatologie, les créneaux disponibles, et comment prendre rendez-vous. Pas de comparaisons ni de promotion de traitements spécifiques.", daysAgo: 28, hour: "10:00:00" },
    { role: "client",  content: "Parfait, c'est bien ce qu'on voulait faire. Pour Doctolib, vous pouvez nous aider à optimiser notre profil aussi ?", daysAgo: 27, hour: "09:15:00" },
    { role: "agency",  content: "L'optimisation Doctolib sort un peu de notre périmètre habituel, mais on peut vous guider sur les bonnes pratiques : photos professionnelles, description complète des spécialités, horaires à jour. Pour les campagnes Google, on peut aussi cibler des recherches type 'dermatologue Lyon' pour renvoyer vers votre page Doctolib.", daysAgo: 27, hour: "10:45:00" },
    { role: "client",  content: "On aimerait aussi développer notre communication sur la prévention — bilans de santé, vaccination etc. C'est un axe qui nous tient à cœur.", daysAgo: 14, hour: "11:00:00" },
    { role: "agency",  content: "C'est un axe excellent et particulièrement engageant sur les réseaux. Les contenus de prévention santé ont un très bon taux de partage. On peut créer une série de posts éducatifs mensuels — par exemple 'Bilan de santé : pourquoi le faire avant 45 ans'. Pas de promotion directe, juste de l'information utile qui renforce votre image d'expert.", daysAgo: 14, hour: "14:00:00" },
    { role: "client",  content: "C'est exactement dans cet esprit. On a aussi des infirmières qui pourraient contribuer — elles adorent partager des conseils santé.", daysAgo: 13, hour: "09:00:00" },
    { role: "agency",  content: "C'est formidable d'avoir des contributeurs internes ! On peut les aider à formater leurs contenus et s'assurer que tout reste dans le cadre réglementaire avant publication. Un contenu authentique de professionnels de santé est très bien perçu par les algorithmes et par le public.", daysAgo: 13, hour: "10:30:00" },
    { role: "client",  content: "On valide cette approche. Pouvez-vous nous préparer un calendrier éditorial pour avril-mai avec ces contenus prévention ?", daysAgo: 5,  hour: "09:00:00" },
    { role: "agency",  content: "Calendrier éditorial avril-mai en cours de préparation — 8 contenus prévention planifiés + l'annonce de l'arrivée du dermatologue. On vous soumet ça jeudi pour validation.", daysAgo: 4,  hour: "11:00:00", readByClient: 0 },
  ],
};

const getClientId = db.prepare("SELECT id FROM clients WHERE email = ?");

let totalMessages = 0;
for (const [email, messages] of Object.entries(seedMessages)) {
  const row = getClientId.get(email) as { id: number } | undefined;
  if (!row) continue;
  for (const msg of messages) {
    insertMessage.run(
      row.id,
      msg.role,
      msg.content,
      daysAgo(msg.daysAgo, msg.hour),
      msg.readByAgency ?? 1,
      msg.readByClient ?? 1
    );
    totalMessages++;
  }
}
console.log(`✅ ${totalMessages} messages de démonstration insérés`);

console.log("\n🎉 Base de données initialisée avec succès !");
console.log(`📍 DB: ${DB_PATH}`);
console.log("\n🔑 Identifiants de démo:");
console.log(`  Admin  → admin@sparkmedia.com / admin2024`);
console.log(`  Agence → ${mock.agency.email} / ${mock.agency.password}`);
mock.clients.forEach((c: { email: string; password: string }) => {
  console.log(`  Client → ${c.email} / ${c.password}`);
});
