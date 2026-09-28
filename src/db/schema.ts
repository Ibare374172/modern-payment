import { relations } from 'drizzle-orm';
import { 
  pgTable, 
  serial, 
  text, 
  integer, 
  timestamp, 
  numeric, 
  boolean,
  jsonb
} from 'drizzle-orm/pg-core';

/**
 * 1. USERS TABLE
 * Stores authenticated system staff and customers with their role-based credentials.
 */
export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').notNull().default('CASHIER'), // 'CASHIER' | 'MANAGER' | 'CUSTOMER' | 'RESEARCHER'
  phone: text('phone'),
  avatarInitials: text('avatar_initials'),
  badgeId: text('badge_id'),
  assignedTill: text('assigned_till'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 2. BUSINESS PROFILE TABLE
 * Store configurations, M-Pesa Till & Paybill numbers, daily target.
 */
export const businesses = pgTable('businesses', {
  id: text('id').primaryKey(), // e.g. 'BIZ-254-001'
  name: text('name').notNull(),
  category: text('category').notNull().default('Retail & Grocery'),
  tillNumber: text('till_number').notNull(),
  paybillNumber: text('paybill_number').notNull(),
  accountRef: text('account_ref').notNull(),
  currency: text('currency').notNull().default('KES'),
  branch: text('branch').notNull(),
  phone: text('phone').notNull(),
  email: text('email').notNull(),
  address: text('address').notNull(),
  dailyTarget: numeric('daily_target', { precision: 12, scale: 2 }).notNull().default('150000.00'),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

/**
 * 3. CUSTOMERS TABLE
 * Registered shoppers, their loyalty points, tiers, and wallet balances.
 */
export const customers = pgTable('customers', {
  id: text('id').primaryKey(), // e.g. 'CUST-001'
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  email: text('email'),
  walletBalance: numeric('wallet_balance', { precision: 12, scale: 2 }).notNull().default('10000.00'),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  totalSpent: numeric('total_spent', { precision: 12, scale: 2 }).notNull().default('0.00'),
  transactionCount: integer('transaction_count').notNull().default(0),
  tier: text('tier').notNull().default('BRONZE'), // 'BRONZE' | 'SILVER' | 'GOLD' | 'PLATINUM'
  lastVisit: text('last_visit').notNull().default('Today'),
  avatarInitials: text('avatar_initials').notNull().default('CU'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 4. TRANSACTIONS TABLE
 * Real-time ledger of M-Pesa STK push, Till QR checkouts, and Cash sales.
 */
export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(), // e.g. 'TXN-984210'
  mpesaReceiptNumber: text('mpesa_receipt_number').notNull().unique(), // e.g. 'SHK4912091'
  customerId: text('customer_id').references(() => customers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(), // 'BUY_GOODS_TILL' | 'PAYBILL_STK' | 'CASH' | 'REFUND'
  paymentMethod: text('payment_method').notNull(), // 'MPESA_STK' | 'MPESA_TILL' | 'MPESA_PAYBILL' | 'CASH'
  status: text('status').notNull().default('COMPLETED'), // 'PENDING' | 'COMPLETED' | 'FAILED' | 'RECONCILED'
  cashierBadgeId: text('cashier_badge_id').notNull().default('CSH-842'),
  cashierName: text('cashier_name').notNull().default('Till Operator'),
  tillNumber: text('till_number').notNull().default('842109'),
  channel: text('channel').notNull().default('DARAJA_API_V2'),
  timestamp: text('timestamp').notNull(),
  notes: text('notes'),
  verified: boolean('verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 5. MANUAL AUDITS TABLE
 * Counter exercise book physical ledger reconciliation & variance logs.
 */
export const audits = pgTable('audits', {
  id: text('id').primaryKey(), // e.g. 'AUD-2026-001'
  transactionId: text('transaction_id').references(() => transactions.id),
  physicalLogNumber: text('physical_log_number').notNull(),
  recordedAmount: numeric('recorded_amount', { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric('actual_amount', { precision: 12, scale: 2 }).notNull(),
  discrepancyAmount: numeric('discrepancy_amount', { precision: 12, scale: 2 }).notNull().default('0.00'),
  discrepancyReason: text('discrepancy_reason'),
  cashierName: text('cashier_name').notNull(),
  cashierBadgeId: text('cashier_badge_id').notNull(),
  status: text('status').notNull().default('MATCHED'), // 'MATCHED' | 'DISCREPANCY' | 'INVESTIGATING'
  date: text('date').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 6. STK REQUESTS TABLE
 * Daraja STK Push prompt dispatch telemetry & callback records.
 */
export const stkRequests = pgTable('stk_requests', {
  id: text('id').primaryKey(),
  checkoutRequestId: text('checkout_request_id').notNull().unique(),
  merchantRequestId: text('merchant_request_id').notNull(),
  phone: text('phone').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  accountReference: text('account_reference').notNull(),
  transactionDesc: text('transaction_desc').notNull(),
  status: text('status').notNull().default('PENDING'), // 'PENDING' | 'SUCCESS' | 'CANCELLED' | 'TIMEOUT'
  resultCode: integer('result_code'),
  resultDesc: text('result_desc'),
  mpesaReceiptNumber: text('mpesa_receipt_number'),
  timestamp: text('timestamp').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

/**
 * 7. REALTIME AUDIT & CDC EVENTS TABLE
 * Pub/Sub event queue for instant real-time PostgreSQL notifications & SSE streaming.
 */
export const realtimeEvents = pgTable('realtime_events', {
  id: serial('id').primaryKey(),
  channel: text('channel').notNull(), // 'transactions' | 'customers' | 'audits' | 'system'
  action: text('action').notNull(), // 'INSERT' | 'UPDATE' | 'DELETE' | 'RECONCILE'
  recordId: text('record_id').notNull(),
  payload: jsonb('payload').notNull(),
  timestamp: timestamp('timestamp').defaultNow().notNull(),
});

/* -------------------------------------------------------------------------- */
/*                                 RELATIONS                                  */
/* -------------------------------------------------------------------------- */

export const usersRelations = relations(users, ({ many }) => ({
  auditsLogged: many(audits),
}));

export const customersRelations = relations(customers, ({ many }) => ({
  transactions: many(transactions),
}));

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  customer: one(customers, {
    fields: [transactions.customerId],
    references: [customers.id],
  }),
  audits: many(audits),
}));

export const auditsRelations = relations(audits, ({ one }) => ({
  transaction: one(transactions, {
    fields: [audits.transactionId],
    references: [transactions.id],
  }),
}));
