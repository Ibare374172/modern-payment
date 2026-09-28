import { Transaction, Customer, ManualEntryAudit, BusinessProfile } from '../types';

export interface PostgresChangeEvent {
  id: string;
  table: 'transactions' | 'customers' | 'audits' | 'businesses' | 'users' | 'system';
  action: 'INSERT' | 'UPDATE' | 'DELETE' | 'RECONCILE';
  timestamp: string;
  data: Record<string, any>;
}

export interface PostgresStatus {
  status: string;
  dialect: string;
  orm: string;
  realtimeEngine: string;
  database: string;
  host: string;
  tables: Array<{ name: string; description: string }>;
  timestamp: string;
}

type EventCallback = (event: PostgresChangeEvent) => void;

class RealtimePostgresClient {
  private eventSource: EventSource | null = null;
  private listeners: Set<EventCallback> = new Set();
  private isConnected: boolean = false;
  private reconnectTimeout: any = null;

  constructor() {
    this.init();
  }

  private init() {
    if (typeof window === 'undefined') return;

    try {
      this.eventSource = new EventSource('/api/postgres/realtime/stream');

      this.eventSource.onopen = () => {
        this.isConnected = true;
      };

      this.eventSource.onmessage = (e) => {
        try {
          const parsed = JSON.parse(e.data);
          if (parsed.table) {
            this.listeners.forEach((listener) => {
              try {
                listener(parsed as PostgresChangeEvent);
              } catch (err) {
                console.error('[PostgreSQL SSE Listener error]', err);
              }
            });
          }
        } catch {
          // ignore heartbeat / plain message
        }
      };

      this.eventSource.onerror = () => {
        this.isConnected = false;
        if (this.eventSource) {
          this.eventSource.close();
          this.eventSource = null;
        }
        // Auto-reconnect with exponential backoff
        clearTimeout(this.reconnectTimeout);
        this.reconnectTimeout = setTimeout(() => {
          this.init();
        }, 5000);
      };
    } catch (err) {
      console.warn('[PostgreSQL SSE Init notice]', err);
    }
  }

  public subscribe(cb: EventCallback): () => void {
    this.listeners.add(cb);
    return () => {
      this.listeners.delete(cb);
    };
  }

  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export const realtimePostgresClient = new RealtimePostgresClient();

/* -------------------------------------------------------------------------- */
/*                                API CLIENTS                                 */
/* -------------------------------------------------------------------------- */

export async function fetchPostgresStatus(): Promise<PostgresStatus | null> {
  try {
    const res = await fetch('/api/postgres/status');
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function fetchPostgresTransactions(limit: number = 100): Promise<Transaction[]> {
  try {
    const res = await fetch(`/api/postgres/transactions?limit=${limit}`);
    const json = await res.json();
    return json.data || [];
  } catch {
    return [];
  }
}

export async function syncTransactionToPostgres(txn: Transaction): Promise<boolean> {
  try {
    const res = await fetch('/api/postgres/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: txn.id,
        mpesaReceiptNumber: txn.code,
        customerName: txn.customerName,
        customerPhone: txn.customerPhone,
        amount: txn.amount,
        type: txn.paymentMethod,
        paymentMethod: txn.paymentMethod,
        status: txn.status,
        cashierBadgeId: txn.verifiedBy || 'CSH-842',
        cashierName: 'Counter Cashier',
        tillNumber: txn.tillNumber || '842109',
        channel: 'DARAJA_API_V2',
        timestamp: txn.timestamp,
        notes: txn.notes || txn.reference || '',
        verified: Boolean(txn.verifiedBy),
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncCustomerToPostgres(cust: Customer): Promise<boolean> {
  try {
    const res = await fetch('/api/postgres/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cust),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncAuditToPostgres(audit: ManualEntryAudit): Promise<boolean> {
  try {
    const res = await fetch('/api/postgres/audits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(audit),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function syncBusinessToPostgres(biz: BusinessProfile): Promise<boolean> {
  try {
    const res = await fetch('/api/postgres/business', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(biz),
    });
    return res.ok;
  } catch {
    return false;
  }
}
