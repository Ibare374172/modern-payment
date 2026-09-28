import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Activity, 
  Layers, 
  CheckCircle2, 
  Radio, 
  RefreshCw, 
  Table, 
  Key, 
  ArrowRightLeft, 
  Sparkles,
  ExternalLink,
  Code2,
  Clock,
  Zap,
  Server
} from 'lucide-react';
import { 
  realtimePostgresClient, 
  PostgresChangeEvent, 
  fetchPostgresStatus, 
  PostgresStatus,
  syncTransactionToPostgres
} from '../services/realtimePostgres';
import { Transaction } from '../types';
import { sounds } from '../utils/audio';

export const PostgresRealtimeConsole: React.FC = () => {
  const [status, setStatus] = useState<PostgresStatus | null>(null);
  const [events, setEvents] = useState<PostgresChangeEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'models' | 'live-stream' | 'query'>('models');
  const [selectedTable, setSelectedTable] = useState<string>('transactions');
  const [isEmitting, setIsEmitting] = useState(false);

  useEffect(() => {
    fetchPostgresStatus().then(res => {
      if (res) setStatus(res);
    });

    const unsubscribe = realtimePostgresClient.subscribe((event) => {
      setEvents(prev => [event, ...prev.slice(0, 49)]);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleTriggerTestEvent = async () => {
    setIsEmitting(true);
    sounds.playClick();
    const testTxn: Transaction = {
      id: `TXN-${Date.now().toString().slice(-6)}`,
      code: `PG${Math.random().toString(36).substring(2, 9).toUpperCase()}`,
      customerName: 'PostgreSQL Real-Time Test User',
      customerPhone: '+254 712 999 888',
      businessId: 'biz-zawadi-01',
      businessName: 'Zawadi Mart Supermarket',
      amount: 1500,
      fee: 0,
      paymentMethod: 'MPESA_EXPRESS',
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      reference: 'TILL-842109',
      tillNumber: '842109',
      verifiedBy: 'CSH-842',
      smsReceiptText: 'Confirmed. Ksh 1,500 sent to Zawadi Mart',
      notes: 'Real-time test transaction emitted via PostgreSQL event stream',
    };

    await syncTransactionToPostgres(testTxn);
    setIsEmitting(false);
  };

  const tableDefinitions = [
    {
      name: 'transactions',
      description: 'Master ledger for M-Pesa Till, Paybill STK push, and counter cash sales.',
      columns: [
        { name: 'id', type: 'text', key: 'PRIMARY KEY', desc: 'e.g. TXN-842109' },
        { name: 'mpesa_receipt_number', type: 'text', key: 'UNIQUE', desc: 'e.g. SHK4912091' },
        { name: 'customer_id', type: 'text', key: 'FOREIGN KEY', desc: 'references customers(id)' },
        { name: 'customer_name', type: 'text', key: '', desc: 'Full customer name' },
        { name: 'customer_phone', type: 'text', key: '', desc: '+254 format MSISDN' },
        { name: 'amount', type: 'numeric(12,2)', key: '', desc: 'Transaction value in KES' },
        { name: 'type', type: 'text', key: '', desc: 'BUY_GOODS_TILL | PAYBILL_STK' },
        { name: 'payment_method', type: 'text', key: '', desc: 'MPESA_STK | MPESA_TILL | CASH' },
        { name: 'status', type: 'text', key: '', desc: 'PENDING | COMPLETED | FAILED' },
        { name: 'cashier_badge_id', type: 'text', key: '', desc: 'Assigned operator badge' },
        { name: 'till_number', type: 'text', key: '', desc: '842109' },
        { name: 'timestamp', type: 'text', key: '', desc: 'Local ISO timestamp' },
        { name: 'verified', type: 'boolean', key: '', desc: 'SMS anti-fraud code match' },
        { name: 'created_at', type: 'timestamp', key: 'DEFAULT NOW()', desc: 'DB creation timestamp' },
      ],
    },
    {
      name: 'customers',
      description: 'Customer profiles, wallet balances, loyalty points, and lifetime spend.',
      columns: [
        { name: 'id', type: 'text', key: 'PRIMARY KEY', desc: 'e.g. CUST-001' },
        { name: 'name', type: 'text', key: '', desc: 'Full shopper name' },
        { name: 'phone', type: 'text', key: 'UNIQUE', desc: 'Unique customer MSISDN' },
        { name: 'email', type: 'text', key: '', desc: 'Optional email' },
        { name: 'wallet_balance', type: 'numeric(12,2)', key: '', desc: 'Available balance' },
        { name: 'loyalty_points', type: 'integer', key: '', desc: 'Cumulative reward points' },
        { name: 'total_spent', type: 'numeric(12,2)', key: '', desc: 'Lifetime gross spend' },
        { name: 'transaction_count', type: 'integer', key: '', desc: 'Completed checkouts' },
        { name: 'tier', type: 'text', key: '', desc: 'BRONZE | SILVER | GOLD | PLATINUM' },
        { name: 'created_at', type: 'timestamp', key: 'DEFAULT NOW()', desc: 'Registration timestamp' },
      ],
    },
    {
      name: 'audits',
      description: 'Physical paper counter log variance audits and reconciliation matches.',
      columns: [
        { name: 'id', type: 'text', key: 'PRIMARY KEY', desc: 'e.g. AUD-2026-001' },
        { name: 'transaction_id', type: 'text', key: 'FOREIGN KEY', desc: 'references transactions(id)' },
        { name: 'physical_log_number', type: 'text', key: '', desc: 'Exercise book line ref' },
        { name: 'recorded_amount', type: 'numeric(12,2)', key: '', desc: 'Bookkeeper entry' },
        { name: 'actual_amount', type: 'numeric(12,2)', key: '', desc: 'M-Pesa system entry' },
        { name: 'discrepancy_amount', type: 'numeric(12,2)', key: '', desc: 'Variance delta' },
        { name: 'status', type: 'text', key: '', desc: 'MATCHED | DISCREPANCY' },
        { name: 'date', type: 'text', key: '', desc: 'Audit date' },
      ],
    },
    {
      name: 'businesses',
      description: 'Enterprise business profile, Till 842109, Paybill 522522, and cash float.',
      columns: [
        { name: 'id', type: 'text', key: 'PRIMARY KEY', desc: 'biz-zawadi-01' },
        { name: 'name', type: 'text', key: '', desc: 'Zawadi Mart Supermarket' },
        { name: 'till_number', type: 'text', key: '', desc: '842109' },
        { name: 'paybill_number', type: 'text', key: '', desc: '522522' },
        { name: 'account_ref', type: 'text', key: '', desc: 'ZAWADI' },
        { name: 'initial_float', type: 'numeric(12,2)', key: '', desc: 'Starting daily float' },
        { name: 'current_float', type: 'numeric(12,2)', key: '', desc: 'Real-time float balance' },
      ],
    },
    {
      name: 'stk_requests',
      description: 'Daraja STK push prompt dispatch telemetry and result callbacks.',
      columns: [
        { name: 'id', type: 'text', key: 'PRIMARY KEY', desc: 'UUID' },
        { name: 'checkout_request_id', type: 'text', key: 'UNIQUE', desc: 'Safaricom WS reference' },
        { name: 'phone', type: 'text', key: '', desc: 'Target handset' },
        { name: 'amount', type: 'numeric(12,2)', key: '', desc: 'Requested amount' },
        { name: 'status', type: 'text', key: '', desc: 'PENDING | SUCCESS | CANCELLED' },
        { name: 'result_code', type: 'integer', key: '', desc: '0 for success' },
      ],
    },
    {
      name: 'realtime_events',
      description: 'Change Data Capture (CDC) event stream for live reactive subscribers.',
      columns: [
        { name: 'id', type: 'serial', key: 'PRIMARY KEY', desc: 'Incremental event sequence' },
        { name: 'channel', type: 'text', key: '', desc: 'transactions | customers | audits' },
        { name: 'action', type: 'text', key: '', desc: 'INSERT | UPDATE | DELETE' },
        { name: 'record_id', type: 'text', key: '', desc: 'Target row primary key' },
        { name: 'payload', type: 'jsonb', key: '', desc: 'JSON object payload' },
        { name: 'timestamp', type: 'timestamp', key: 'DEFAULT NOW()', desc: 'Event timestamp' },
      ],
    },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Top Banner: Real-time PostgreSQL Status */}
      <div className="bg-slate-900 text-white rounded-3xl p-6 sm:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400 font-bold text-2xl shadow-inner shrink-0">
              <Database className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                  Real-Time Engine Online
                </span>
                <span className="text-[11px] font-mono text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full border border-slate-700">
                  Drizzle ORM + pg.Pool
                </span>
                <span className="text-[11px] font-mono text-sky-400 bg-sky-950/60 px-2 py-0.5 rounded-full border border-sky-800">
                  SSE Live Stream: Connected
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mt-1">
                PostgreSQL Relational Models & Real-Time Sync
              </h2>
              <p className="text-sm text-slate-400 mt-1 max-w-2xl">
                High-concurrency PostgreSQL architecture with object-method connection pooling, type-safe Drizzle ORM schemas, and instantaneous Server-Sent Events (SSE) broadcasting for payment settlements.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleTriggerTestEvent}
              disabled={isEmitting}
              className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 transition-all shadow-md active:scale-95 disabled:opacity-50"
            >
              <Zap className="w-4 h-4 text-emerald-200" />
              <span>{isEmitting ? 'Broadcasting...' : 'Emit Real-Time Event'}</span>
            </button>
          </div>
        </div>

        {/* Quick Specs Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-800 text-xs">
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-slate-400 text-[11px]">Dialect</div>
            <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>PostgreSQL 16+</span>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-slate-400 text-[11px]">ORM & Schema</div>
            <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>Drizzle ORM (Type-Safe)</span>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-slate-400 text-[11px]">Connection Pool</div>
            <div className="font-bold text-white mt-0.5 flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-sky-400" />
              <span>pg.Pool (Object Method)</span>
            </div>
          </div>
          <div className="bg-slate-800/60 rounded-xl p-3 border border-slate-700/60">
            <div className="text-slate-400 text-[11px]">Event Latency</div>
            <div className="font-bold text-emerald-400 mt-0.5 flex items-center gap-1.5">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>&lt; 5ms (SSE Broadcast)</span>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs */}
      <div className="flex items-center gap-2 border-b border-stone-200 pb-2">
        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('models');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'models'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Table className="w-4 h-4" />
          <span>Relational Models ({tableDefinitions.length})</span>
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('live-stream');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'live-stream'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Radio className="w-4 h-4 text-emerald-500 animate-pulse" />
          <span>Live CDC Event Stream</span>
          {events.length > 0 && (
            <span className="bg-emerald-500/20 text-emerald-700 px-2 py-0.5 rounded-full text-[11px] font-bold">
              {events.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            sounds.playClick();
            setActiveTab('query');
          }}
          className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
            activeTab === 'query'
              ? 'bg-stone-900 text-white shadow-xs'
              : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
          }`}
        >
          <Code2 className="w-4 h-4" />
          <span>Drizzle Schema Code</span>
        </button>
      </div>

      {/* TAB 1: RELATIONAL MODELS */}
      {activeTab === 'models' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Table List Sidebar */}
          <div className="lg:col-span-1 space-y-2">
            <div className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-2">
              PostgreSQL Tables
            </div>
            {tableDefinitions.map(t => (
              <button
                key={t.name}
                onClick={() => {
                  sounds.playClick();
                  setSelectedTable(t.name);
                }}
                className={`w-full text-left p-3 rounded-2xl border transition-all ${
                  selectedTable === t.name
                    ? 'bg-indigo-50 border-indigo-300 text-indigo-950 font-bold shadow-xs'
                    : 'bg-white border-stone-200 hover:bg-stone-50 text-stone-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs">{t.name}</span>
                  <span className="text-[10px] bg-stone-100 px-2 py-0.5 rounded text-stone-600">
                    {t.columns.length} cols
                  </span>
                </div>
                <div className="text-[11px] text-stone-500 font-normal mt-1 truncate">
                  {t.description}
                </div>
              </button>
            ))}
          </div>

          {/* Table Details Viewer */}
          <div className="lg:col-span-3">
            {(() => {
              const currentTable = tableDefinitions.find(t => t.name === selectedTable) || tableDefinitions[0];
              return (
                <div className="bg-white rounded-3xl border border-stone-200 shadow-sm overflow-hidden">
                  <div className="p-5 border-b border-stone-100 bg-stone-50/70 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold uppercase tracking-wider text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-md">
                          pgTable
                        </span>
                        <h3 className="font-mono font-bold text-base text-stone-900">
                          public.{currentTable.name}
                        </h3>
                      </div>
                      <p className="text-xs text-stone-500 mt-1">
                        {currentTable.description}
                      </p>
                    </div>
                    <span className="text-xs font-mono text-stone-400 bg-white border border-stone-200 px-2.5 py-1 rounded-xl shadow-2xs">
                      schema.ts
                    </span>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 font-bold">
                          <th className="py-2.5 px-4">Column Name</th>
                          <th className="py-2.5 px-4">PostgreSQL Type</th>
                          <th className="py-2.5 px-4">Constraints</th>
                          <th className="py-2.5 px-4">Description</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-stone-100 font-mono">
                        {currentTable.columns.map((col, idx) => (
                          <tr key={idx} className="hover:bg-stone-50/80 transition-colors">
                            <td className="py-2.5 px-4 font-bold text-stone-900 flex items-center gap-1.5">
                              {col.key === 'PRIMARY KEY' && <Key className="w-3 h-3 text-amber-500 shrink-0" />}
                              {col.key === 'FOREIGN KEY' && <ArrowRightLeft className="w-3 h-3 text-sky-500 shrink-0" />}
                              <span>{col.name}</span>
                            </td>
                            <td className="py-2.5 px-4 text-indigo-600 font-semibold">{col.type}</td>
                            <td className="py-2.5 px-4">
                              {col.key ? (
                                <span className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                                  col.key === 'PRIMARY KEY'
                                    ? 'bg-amber-100 text-amber-900'
                                    : col.key === 'FOREIGN KEY'
                                    ? 'bg-sky-100 text-sky-900'
                                    : 'bg-emerald-100 text-emerald-900'
                                }`}>
                                  {col.key}
                                </span>
                              ) : (
                                <span className="text-stone-400 text-[10px]">nullable</span>
                              )}
                            </td>
                            <td className="py-2.5 px-4 font-sans text-stone-500">{col.desc}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* TAB 2: LIVE CDC EVENT STREAM */}
      {activeTab === 'live-stream' && (
        <div className="bg-white rounded-3xl border border-stone-200 shadow-sm p-6 space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-stone-100 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="font-bold text-base text-stone-900">
                  Live Change Data Capture (CDC) Event Feed
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Every settlement, customer deposit, and reconciliation record writes to PostgreSQL and pushes down this SSE stream.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleTriggerTestEvent}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>Simulate M-Pesa Insert</span>
              </button>
            </div>
          </div>

          {events.length === 0 ? (
            <div className="text-center py-12 text-stone-400 space-y-3">
              <Radio className="w-10 h-10 mx-auto text-emerald-400 animate-pulse opacity-60" />
              <div className="text-sm font-semibold text-stone-600">
                Listening for real-time PostgreSQL mutations...
              </div>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Trigger a checkout in the Cashier POS, send an STK prompt from the Customer Wallet, or click "Simulate M-Pesa Insert" above to see live events.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
              {events.map((evt) => (
                <div 
                  key={evt.id}
                  className="bg-stone-50 border border-stone-200 rounded-2xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs animate-in slide-in-from-top-2 duration-200"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-7 h-7 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-[10px] shrink-0 mt-0.5">
                      {evt.action === 'INSERT' ? '+' : evt.action === 'UPDATE' ? '⟳' : '•'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-stone-900 font-mono">
                          {evt.table}
                        </span>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded font-mono ${
                          evt.action === 'INSERT' 
                            ? 'bg-emerald-100 text-emerald-800' 
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {evt.action}
                        </span>
                        <span className="text-[10px] text-stone-400 font-mono">
                          ID: {evt.recordId}
                        </span>
                      </div>
                      <div className="text-stone-600 text-[11px] font-mono mt-1 break-all bg-white p-1.5 rounded-lg border border-stone-200/80">
                        {JSON.stringify(evt.data)}
                      </div>
                    </div>
                  </div>
                  <div className="text-[10px] font-mono text-stone-400 shrink-0">
                    {new Date(evt.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: DRIZZLE SCHEMA CODE */}
      {activeTab === 'query' && (
        <div className="bg-stone-950 text-stone-100 rounded-3xl p-6 border border-stone-800 shadow-xl overflow-x-auto">
          <div className="flex items-center justify-between pb-4 border-b border-stone-800 mb-4">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-emerald-400" />
              <span className="text-xs font-mono font-bold text-stone-300">
                src/db/schema.ts • Drizzle PostgreSQL Schema
              </span>
            </div>
            <span className="text-[11px] bg-stone-800 text-emerald-400 px-2 py-0.5 rounded font-mono">
              Active ORM Models
            </span>
          </div>

          <pre className="font-mono text-xs leading-relaxed text-emerald-300/90 whitespace-pre">
{`// src/db/schema.ts
import { relations } from 'drizzle-orm';
import { pgTable, serial, text, integer, timestamp, numeric, boolean, jsonb } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: serial('id').primaryKey(),
  uid: text('uid').notNull().unique(), // Firebase Auth UID
  email: text('email').notNull(),
  displayName: text('display_name').notNull().default(''),
  role: text('role').notNull().default('CASHIER'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const transactions = pgTable('transactions', {
  id: text('id').primaryKey(),
  mpesaReceiptNumber: text('mpesa_receipt_number').notNull().unique(),
  customerId: text('customer_id').references(() => customers.id),
  customerName: text('customer_name').notNull(),
  customerPhone: text('customer_phone').notNull(),
  amount: numeric('amount', { precision: 12, scale: 2 }).notNull(),
  type: text('type').notNull(),
  paymentMethod: text('payment_method').notNull(),
  status: text('status').notNull().default('COMPLETED'),
  tillNumber: text('till_number').notNull().default('842109'),
  timestamp: text('timestamp').notNull(),
  verified: boolean('verified').notNull().default(true),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const customers = pgTable('customers', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  phone: text('phone').notNull().unique(),
  walletBalance: numeric('wallet_balance', { precision: 12, scale: 2 }).notNull(),
  loyaltyPoints: integer('loyalty_points').notNull().default(0),
  tier: text('tier').notNull().default('BRONZE'),
});

export const audits = pgTable('audits', {
  id: text('id').primaryKey(),
  transactionId: text('transaction_id').references(() => transactions.id),
  physicalLogNumber: text('physical_log_number').notNull(),
  recordedAmount: numeric('recorded_amount', { precision: 12, scale: 2 }).notNull(),
  actualAmount: numeric('actual_amount', { precision: 12, scale: 2 }).notNull(),
  status: text('status').notNull().default('MATCHED'),
});`}
          </pre>
        </div>
      )}
    </div>
  );
};
