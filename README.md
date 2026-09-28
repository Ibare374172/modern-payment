# Zawadi Mart – Mobile Payment & Financial Ledger Platform

[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-v4.1-38bdf8.svg)](https://tailwindcss.com/)
[![Express](https://img.shields.io/badge/Express-4.21-000000.svg)](https://expressjs.com/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791.svg)](https://www.postgresql.org/)
[![Drizzle ORM](https://img.shields.io/badge/Drizzle_ORM-0.38-C5F74F.svg)](https://orm.drizzle.team/)
[![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

An enterprise-grade, full-stack mobile payments and reconciliation system designed for retail environments and Kenyan SMEs. The platform combines real-time M-Pesa Daraja STK Push prompt processing, Till QR checkouts, paper exercise book audit reconciliation, dual-layer PostgreSQL (Drizzle ORM) and Cloud Firestore persistence, and an academic Technology Acceptance Model (TAM) research simulator.

---

## 👨‍💻 Author

**Dennis Njuguna**  
*Lead Software Engineer & Researcher*

---

## 🌟 Key Capabilities & Workspaces

The platform enforces **strict role-based session isolation** across four dedicated workspaces:

### 1. 🛒 Cashier Station (Front-Counter POS)
- **Point of Sale Terminal**: Instant shopping cart checkout with dynamic total calculation and tax breakdown.
- **M-Pesa STK Push Dispatch**: Push instant USSD PIN prompts directly to customer mobile handsets via Safaricom Daraja API.
- **Dynamic Till QR Checkouts**: Real-time QR code display for Till `842109` and Paybill `522522`.
- **Anti-Fraud SMS Verification**: Verify customer MPesa SMS codes against the internal cryptographic ledger to eliminate falsified receipt fraud.
- **Shift Drawer Register**: Reconcile expected cash/mobile balances at shift end.

### 2. 📊 Store Manager Portal (Executive Oversight)
- **Live Revenue Telemetry**: Hourly sales velocity, target tracking, and payment method distribution charts.
- **Counter Book Reconciliation**: Dual-audit ledger comparing handwritten counter log amounts against M-Pesa digital SMS receipts to capture unrecorded sales and transcription errors.
- **Business & Till Configuration**: Edit Till Number, Paybill Number, store branch, and daily revenue targets.
- **Daraja Gateway Settings**: Switch between Safaricom Sandbox and Production environments with live credentials.
- **Real-Time PostgreSQL Console**: Live Change Data Capture (CDC) event feed and relational database schema inspector.

### 3. 📱 Customer Portal (Personal Mobile Wallet)
- **Interactive Handset Wallet**: Personal balance management, top-ups, and one-tap checkout payments.
- **Loyalty Program**: Real-time points accumulation across reward tiers (`BRONZE`, `SILVER`, `GOLD`, `PLATINUM`).
- **Electronic Thermal Receipts**: Detailed receipt view, PDF download, and print-ready transaction slips.

### 4. 🔬 Academic Research Hub (TAM & SME Study)
- **Technology Acceptance Model (TAM) Simulator**: Interactive sliders evaluating Perceived Usefulness (PU), Perceived Ease of Use (PEOU), Security Trust, and Cost Affordability.
- **Empirical Field Findings**: Longitudinal research survey data analyzing 120 Kenyan SMEs.
- **Thesis Documentation**: Integrated academic reference covering Chapters 1 through 5.

---

## 🛠️ Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend Framework** | **React 19**, **TypeScript 5.8**, **Vite 6** |
| **Styling & UI** | **Tailwind CSS v4**, **Lucide React Icons**, **Motion** (Framer Motion) |
| **Backend Server** | **Node.js**, **Express 4.21**, **TSX** |
| **Relational Database** | **PostgreSQL 16**, **Drizzle ORM**, **pg.Pool** (Object Method connection pooling) |
| **Real-Time Engine** | **Server-Sent Events (SSE)** Change Data Capture (CDC) stream |
| **Cloud & Auth** | **Firebase Authentication** (Google OAuth), **Cloud Firestore** |
| **Integrations** | **Safaricom Daraja API v2** (STK Push, C2B Buy Goods Till, Paybill B2C) |
| **Audio Engine** | Native Web Audio API payment confirmation chime |

---

## 🗄️ PostgreSQL Database Models (`src/db/schema.ts`)

The relational schema is defined using **Drizzle ORM** with full TypeScript type safety:

- **`users`**: Staff accounts, Firebase UIDs, badges, and roles (`CASHIER`, `MANAGER`, `CUSTOMER`, `RESEARCHER`).
- **`businesses`**: Enterprise store profiles, Till numbers, Paybill numbers, and targets.
- **`customers`**: Customer profiles, MSISDNs, loyalty tiers, points, and wallet balances.
- **`transactions`**: Immutable M-Pesa & Cash transaction records with verification states.
- **`audits`**: Physical exercise notebook logs matched against digital transactions.
- **`stk_requests`**: Safaricom checkout request IDs, merchant request IDs, and callback statuses.
- **`realtime_events`**: Change Data Capture (CDC) pub/sub event queue for SSE broadcasting.

---

## 🚀 Getting Started

### Prerequisites

Ensure you have the following installed on your machine:
- **Node.js**: `v18.0.0` or higher (`v20+` recommended)
- **npm**: `v9.0.0` or higher
- **PostgreSQL** *(Optional for local database instance; in-memory fallback included)*

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/mobile-payments-system.git
cd mobile-payments-system
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Server Port
PORT=3000

# PostgreSQL Connection Configuration (Object Method)
SQL_HOST=127.0.0.1
SQL_DB_NAME=zawadi_mart_db
SQL_USER=postgres
SQL_PASSWORD=postgres
SQL_ADMIN_USER=postgres
SQL_ADMIN_PASSWORD=postgres

# Safaricom Daraja API (Optional for custom keys; defaults to sandbox)
DARAJA_ENVIRONMENT=sandbox
DARAJA_SHORTCODE=174379
DARAJA_PASSKEY=bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919
```

### 4. Run the Development Server

Start the full-stack server (Express backend + Vite client middleware):

```bash
npm run dev
```

Open your browser and navigate to:
```
http://localhost:3000
```

---

## 📦 Scripts Reference

| Command | Description |
|---|---|
| `npm run dev` | Launches the full-stack Express server with Vite middleware on port 3000 |
| `npm run build` | Compiles the React client application into `dist/` |
| `npm start` | Runs the production Node.js server (`server.ts`) |
| `npm run lint` | Runs TypeScript compiler type verification (`tsc --noEmit`) |
| `npm run clean` | Cleans up the `dist/` build output |

---

## 📡 REST API & Real-Time Endpoints

### System & Health
- `GET /api/health` – Service status and gateway health check.
- `GET /api/postgres/status` – PostgreSQL dialect, connection pool state, and table metadata.

### Real-Time Event Stream
- `GET /api/postgres/realtime/stream` – Server-Sent Events (SSE) endpoint broadcasting live table mutations (`INSERT`, `UPDATE`, `RECONCILE`) with sub-5ms latency.

### Transactions
- `GET /api/postgres/transactions?limit=100` – Retrieve recent transactions.
- `POST /api/postgres/transactions` – Create a new transaction and broadcast a real-time CDC event.
- `PATCH /api/postgres/transactions/:id/status` – Update transaction reconciliation status.

### Customers & Audits
- `GET /api/postgres/customers` – Fetch registered customer profiles and balances.
- `POST /api/postgres/customers/:id/adjust-balance` – Credit or debit wallet balances and loyalty points.
- `GET /api/postgres/audits` – Retrieve physical counter log audits.
- `POST /api/postgres/audits` – Record a physical ledger audit comparison.

### Daraja M-Pesa Gateway
- `POST /api/stkpush/trigger` – Dispatch an STK push prompt to a Safaricom phone number.
- `POST /api/stkpush/callback` – Webhook listener for Safaricom async payment notifications.

---

## 🔒 Security & Access Guardrails

- **Strict Session Locking**: Once authenticated as Cashier, Manager, Customer, or Researcher, cross-role switching is disabled in the UI and enforced at the API layer. To change accounts, the user must explicitly sign out.
- **Anti-Fraud Verification**: Automatic verification matches incoming SMS receipts against Safaricom reference formats to prevent customer code falsification.
- **Connection Pool Isolation**: PostgreSQL connections are managed via pool objects with connection timeouts and idle client safeguards.

---

## 📄 License

This project is licensed under the **MIT License**.

---

*Designed and developed by **Dennis Njuguna**.*
