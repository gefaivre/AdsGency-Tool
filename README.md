# Agency Reporting Dashboard

An open source multi-role dashboard for digital advertising agencies. Built to centralize campaign performance tracking, creative production, and client communication in a single modern interface.

> **Note**: The Meta Ads (Metabusiness) and PostHog connectors are architected and represented in the UI, but real-time data synchronization is not yet implemented. All visualizations, charts, and tables are in place and functional with demo data.

---

## Three interfaces, one tool

The project provides **three distinct spaces** based on the user's role:

| Interface | Role | Access |
|---|---|---|
| **Owner** | Director / Admin | Full financial overview, per-client profitability |
| **Employees** | Agency team | Multi-client management, Kanban, messaging |
| **Client** | Advertisers | Their own campaign and creative tracking |

Each interface is isolated via JWT authentication and automatic role-based routing. A client can never access another client's data, nor see financial data reserved for the agency.

---

## Tech stack

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Frontend**: React 19, TailwindCSS, Recharts
- **Backend**: Next.js API Routes, SQLite (better-sqlite3)
- **Auth**: JWT (jose) + bcrypt
- **Drag & Drop**: @dnd-kit (Kanban)
- **Icons**: Lucide React

---

## Installation

### Prerequisites

- Node.js >= 18
- npm or yarn

### Clone and install

```bash
git clone https://github.com/your-username/agency-reporting.git
cd agency-reporting
npm install
```

### Seed the database with demo data

```bash
npm run seed
```

This command creates the SQLite file `data/agency.db` and populates it with sample clients, campaigns, creatives, and messages.

### Run in development

```bash
npm run dev
```

The app runs at [http://localhost:3000](http://localhost:3000).

### Production build

```bash
npm run build
npm start
```

---

## Demo accounts

| Role | Email | Password |
|---|---|---|
| Owner (Admin) | `admin@sparkmedia.com` | `admin2024` |
| Employee (Agency) | `agence@demo.com` | `agence123` |
| Client | `techstart@demo.com` | `client123` |

---

## Feature breakdown

### Owner interface — `/admin`

Reserved for leadership. Provides a consolidated financial view of the agency.

**Global KPIs**
- MRR (Monthly Recurring Revenue)
- Cumulative revenue (management fees billed)
- Managed ad budget (total Meta Ads spend under management)
- Estimated gross margin (after 40% operational costs)
- Average margin rate across all active clients

**Profitability chart**
Bar chart comparing management fees vs. managed ad budget per client, to visualize margin allocation at a glance.

**Detailed client table**
Per client: monthly retainer, months active, cumulative fees, managed ad budget, total billed, gross margin in euros and %, and a margin profile badge (Good / Fair / Low).

---

### Employee interface — `/agency`

The daily workspace for the agency team. Manage multiple clients from a unified sidebar with unread message indicators.

#### Overview — `/agency`

**Aggregated KPIs across the full portfolio**
- Number of clients managed
- Total impressions
- Total reach
- Total clicks
- Total spend

**Unread messages**: dedicated section listing clients with pending messages, showing a preview of the last message and an unread count badge.

**Client table**: summary view of each client with their campaign metrics and a direct link to their individual dashboard.

**Sidebar**: client list with real-time blue badges for unread messages (polled every 5 seconds).

#### Individual client dashboard — `/agency/clients/[id]`

Full performance view for a given client, with access to all financial data (budget and spend visible, unlike the client view).

**Tab navigation**: Dashboard · Kanban · Calendar · Funnel

**Dashboard**
- KPI Cards: Impressions, Reach, Clicks, Avg CTR, Avg CPC, Daily Budget, Total Spend
- 30-day performance chart (multi-line: impressions, reach, clicks)
- Campaign breakdown bar chart
- Full campaign table with statuses (ACTIVE / PAUSED / ENDED), objectives, and all metrics

**Embedded chat**: messaging panel in the right sidebar to communicate directly with the client. Messages are automatically marked as read when the panel opens.

#### Creative Kanban — `/agency/clients/[id]/kanban`

Drag-and-drop Kanban board to track ad creative production.

**5 status columns**:
1. Brief (slate)
2. In prod (blue)
3. Review (yellow)
4. Approved (purple)
5. Live (green)

Each card shows: creative title, format (VIDEO / IMAGE / CAROUSEL / STORY), assignee, due date, associated campaign. Dragging a card between columns updates its status in the database via the API.

#### Campaign calendar — `/agency/clients/[id]/calendar`

Gantt chart over a 6-month sliding window, with navigation (previous / next / Today) and a current date indicator.

Campaign bars are color-coded by status: green (active), yellow (paused), gray (ended). Hover to see the campaign name and date range.

#### Marketing funnel — `/agency/clients/[id]/funnel`

3-stage visual conversion funnel with trapezoid connectors:

1. **Awareness** (Blue) — Source: Meta Ads — Metric: Impressions
2. **Consideration** (Purple) — Source: Meta Ads — Metric: Reach
3. **Conversion** (Green) — Source: PostHog — Metric: Clicks

Displays conversion rates between stages (red < 20%, yellow 20–50%, green > 50%), campaigns attached to each stage, average CTR per stage, and connected data source badges.

---

### Client interface — `/client`

A simplified, clean view for advertisers. Budget data (daily budget, total spend) is hidden. The Kanban is read-only.

#### Dashboard — `/client`

**Tab navigation**: Dashboard · Creatives · Calendar · Funnel

**Dashboard**
- KPI Cards: Impressions, Reach, Clicks, Avg CTR, Avg CPC (no budget or spend)
- 30-day performance chart
- Campaign breakdown (impressions and clicks only, no spend)
- Campaign table without financial columns

**Floating chat**: bubble anchored to the bottom-right corner, expandable into a full messaging panel. Shows an unread badge. Polls every 3 seconds when the panel is open. Lets the client contact their agency directly.

#### Creatives — `/client/kanban`

Same Kanban as the agency view, but **read-only**: clients can see the progress of their creatives without being able to move cards.

#### Calendar — `/client/calendar`

Same Gantt chart as the agency view: clients can visualize their campaign schedule.

#### Funnel — `/client/funnel`

Same funnel as the agency view: visualization of the Awareness → Consideration → Conversion stages with conversion rates.

---

## Real-time messaging

Built-in two-way chat system between the agency and each client.

- **Agency side**: embedded chat panel in the sidebar on every client page
- **Client side**: floating bubble in the bottom-right corner on all pages
- Messages are automatically marked as read on open
- Unread badge on the agency sidebar (polled every 5 s)
- Timestamps displayed in locale format
- Messages grouped by sender

---

## Meta Ads (Metabusiness) and PostHog integrations

The project is architected to connect to two external data sources:

**Meta Ads / Metabusiness**
- Would feed campaign metrics: impressions, reach, clicks, CTR, CPC, budgets, and spend
- Used in the Awareness and Consideration stages of the funnel

**PostHog**
- Would feed conversion metrics (Conversion stage of the funnel)
- Allows cross-referencing ad data with on-site behavioral data

> The "Meta Ads" and "PostHog" badges are already visible in the funnel UI. The connectors and real-time data ingestion are yet to be implemented. Current data comes from the static seed script.

---

## Project structure

```
agency-reporting/
├── app/
│   ├── admin/             # Owner interface
│   ├── agency/            # Employee interface
│   │   └── clients/[id]/  # Per-client dashboard (kanban, calendar, funnel)
│   ├── client/            # Client interface
│   ├── login/             # Authentication page
│   └── api/               # API Routes (auth, clients, messages, creatives)
├── components/
│   ├── dashboard/         # KpiCards, PerformanceChart, CampaignBreakdown, CampaignTable
│   ├── kanban/            # KanbanBoard, KanbanColumn, KanbanCard
│   ├── calendar/          # CampaignCalendar (Gantt)
│   ├── funnel/            # FunnelFlow
│   ├── chat/              # ClientChatBubble, ClientChatEmbed
│   └── layout/            # Navbar, ClientSidebar, TabNav
├── lib/
│   ├── db.ts              # SQLite initialization and schema
│   ├── auth.ts            # JWT helpers
│   ├── seed.ts            # Seed script
│   └── utils.ts           # Utilities
├── data/                  # agency.db (generated by seed)
└── middleware.ts           # Role-based routing
```

---

## Contributing

Contributions are welcome! Feel free to open issues or pull requests to:

- Implement the Meta Ads and PostHog connectors
- Add new creative formats or campaign objectives
- Improve visualizations
- Internationalize the UI

---

## License

MIT
