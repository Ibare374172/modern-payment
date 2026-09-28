# Architecture & System Documentation

## Mobile Payments in Modern Businesses (Zawadi Mart POS & Enterprise Ledger)

This application is built with a strict separation between **Backend** and **Frontend** files, providing an enterprise-grade point-of-sale (POS) terminal, Safaricom Daraja M-Pesa mobile payments integration, and executive business analytics.

---

## 1. Directory Structure

```
├── backend/                       # Dedicated Server-Side Backend Files
│   ├── controllers/
│   │   ├── darajaController.ts    # Safaricom Daraja API credentials validation handler
│   │   └── stkController.ts       # STK Push dispatch, status query & webhook handler
│   ├── middleware/
│   │   └── errorHandler.ts        # Centralized Express error handler & request logging
│   ├── routes/
│   │   ├── darajaRoutes.ts        # Express router for /api/daraja/*
│   │   └── stkRoutes.ts           # Express router for /api/stkpush/*
│   ├── services/
│   │   ├── darajaService.ts       # Safaricom OAuth, STK push dispatch, phone formatting
│   │   └── stkStore.ts            # In-memory transaction status store
│   ├── types/
│   │   └── index.ts               # Backend TypeScript definitions
│   ├── app.ts                     # Express backend app creation and route configuration
│   └── index.ts                   # Backend module barrel export
│
├── src/                           # Dedicated Client-Side Frontend Files
│   ├── components/
│   │   ├── AboutWebsiteModal.tsx  # Website & architecture description modal
│   │   ├── AccountSwitcherModal.tsx # Multi-account profile switcher
│   │   ├── AuthGateway.tsx        # Authentication & Registration access gate
│   │   ├── CashierTerminal.tsx    # POS terminal & till cashier workspace
│   │   ├── CustomerPortal.tsx     # Mobile wallet, loyalty & receipts workspace
│   │   ├── DarajaConfigModal.tsx  # M-Pesa API credentials manager
│   │   ├── Header.tsx             # Role-adaptive navigation & status header
│   │   ├── ManagerDashboard.tsx   # Executive analytics & audit reconciliation
│   │   ├── ReceiptModal.tsx       # Printable digital receipt dialog
│   │   ├── ResearchExplorer.tsx   # Academic TAM framework & empirical dataset
│   │   ├── StkPushModal.tsx       # Handset interactive payment simulator
│   │   └── TransactionHistory.tsx # Searchable transaction ledger
│   ├── services/
│   │   ├── apiClient.ts           # Typed HTTP client communicating with backend /api/*
│   │   ├── dbService.ts           # Google Cloud Firestore SDK integration
│   │   └── stkService.ts          # M-Pesa client orchestration service
│   ├── utils/
│   │   ├── audio.ts               # Web Audio API sound effects
│   │   ├── mockData.ts            # Initial seeded mock profiles & transactions
│   │   └── storage.ts             # LocalStorage caching layer
│   ├── App.tsx                    # Top-level React application component
│   ├── firebase.ts                # Firebase Auth & Firestore client configuration
│   ├── index.css                  # Tailwind CSS style definitions
│   ├── main.tsx                   # React 19 entry point
│   └── types.ts                   # Frontend domain data models
│
├── server.ts                      # Full-stack server entry point (Node.js/Express + Vite)
├── firestore.rules                # Firebase Firestore Security Rules
├── firebase-blueprint.json        # Database schema specifications
├── package.json                   # Dependencies and scripts
└── tsconfig.json                  # TypeScript compiler configuration
```

---

## 2. Backend Responsibilities (`/backend`)
1. **Safaricom Daraja API Integration (`backend/services/darajaService.ts`)**:
   - OAuth 2.0 Client Credentials token generation (`/oauth/v1/generate`).
   - M-Pesa STK Push request dispatching (`/mpesa/stkpush/v1/processrequest`).
   - Kenyan mobile number normalization (`254XXXXXXXXX`).
   - Timestamp and encrypted password generation using Base64.
2. **STK Push Query & Webhook Callback (`backend/controllers/stkController.ts`)**:
   - Asynchronous callback receiver (`POST /api/stkpush/callback`) capturing `MpesaReceiptNumber` and transaction result codes.
   - Status polling endpoint (`GET /api/stkpush/query/:checkoutRequestId`).
3. **In-Memory Store (`backend/services/stkStore.ts`)**:
   - Stores dispatched checkout requests and live updates from webhooks.
4. **Credential Verification (`backend/controllers/darajaController.ts`)**:
   - Live testing of Safaricom Daraja consumer keys and secrets (`POST /api/daraja/test`).

---

## 3. Frontend Responsibilities (`/src`)
1. **Separated API Boundary (`src/services/apiClient.ts`)**:
   - Dedicated client calls only clean `/api/*` endpoints without leaking server secrets or directly calling 3P APIs.
2. **Authentication Gate (`src/components/AuthGateway.tsx`)**:
   - Enforces login and registration before granting access to operational systems.
3. **Four Dedicated Account Domains**:
   - **Cashier Station**: Barcode scanner, cart management, STK Push prompt, QR codes, till drawer.
   - **Store Manager**: Revenue velocity charts, sales summaries, discrepancy audit trail.
   - **Customer Portal**: Personal wallet balance, loyalty points, tier rewards, and digital receipts.
   - **Researcher Hub**: TAM simulation model, empirical survey sample analysis.
4. **Cloud Persistence (`src/services/dbService.ts`)**:
   - Real-time synchronization with Google Cloud Firestore database.

---

## 4. Website Description & Core Purpose
- **System Name**: Zawadi Mart Mobile Payments & Enterprise POS
- **Purpose**: Modernize retail transactions by replacing paper receipts and cash handling with instant M-Pesa STK push processing, automated audit logs, and digital loyalty programs.
- **Academic Foundation**: Demonstrates the measurable impact of mobile money adoption on Kenyan retail performance, eliminating manual bookkeeping discrepancies and accelerating point-of-sale throughput.
