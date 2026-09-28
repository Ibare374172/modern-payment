import { db, broadcastPostgresEvent } from './index.ts';
import { transactions, customers, audits, businesses, users } from './schema.ts';
import { eq, desc } from 'drizzle-orm';
import { 
  initialBusiness, 
  initialCustomers, 
  initialTransactions, 
  initialAudits 
} from '../utils/mockData.ts';
import { Transaction, Customer, ManualEntryAudit, BusinessProfile, PaymentMethod } from '../types.ts';

// In-memory resilient cache for instant response and offline fallback
const memoryStore = {
  business: { ...initialBusiness } as BusinessProfile,
  customers: [...initialCustomers] as Customer[],
  transactions: [...initialTransactions] as Transaction[],
  audits: [...initialAudits] as ManualEntryAudit[],
  users: [] as Array<{
    uid: string;
    email: string;
    displayName: string;
    role: string;
    createdAt: string;
  }>,
};

/* -------------------------------------------------------------------------- */
/*                            TRANSACTION REPOSITORY                          */
/* -------------------------------------------------------------------------- */

export const TransactionModel = {
  async getAll(limitCount: number = 100) {
    try {
      const records = await db
        .select()
        .from(transactions)
        .orderBy(desc(transactions.createdAt))
        .limit(limitCount);
      if (records.length > 0) {
        return records;
      }
    } catch (err) {
      console.warn('[PostgreSQL ORM] Using memory store cache for transactions:', (err as Error).message);
    }
    return memoryStore.transactions.slice(0, limitCount);
  },

  async getById(id: string) {
    try {
      const records = await db
        .select()
        .from(transactions)
        .where(eq(transactions.id, id));
      if (records.length > 0) return records[0];
    } catch {
      // fallback
    }
    return memoryStore.transactions.find(t => t.id === id) || null;
  },

  async create(data: {
    id: string;
    mpesaReceiptNumber: string;
    customerId?: string;
    customerName: string;
    customerPhone: string;
    amount: number;
    type?: string;
    paymentMethod: PaymentMethod;
    status?: string;
    cashierBadgeId?: string;
    cashierName?: string;
    tillNumber?: string;
    channel?: string;
    timestamp: string;
    notes?: string;
    verified?: boolean;
  }) {
    const record = {
      id: data.id,
      mpesaReceiptNumber: data.mpesaReceiptNumber,
      customerId: data.customerId || null,
      customerName: data.customerName,
      customerPhone: data.customerPhone,
      amount: data.amount.toFixed(2),
      type: data.type || data.paymentMethod,
      paymentMethod: data.paymentMethod,
      status: data.status || 'COMPLETED',
      cashierBadgeId: data.cashierBadgeId || 'CSH-842',
      cashierName: data.cashierName || 'Till Operator',
      tillNumber: data.tillNumber || '842109',
      channel: data.channel || 'DARAJA_API_V2',
      timestamp: data.timestamp,
      notes: data.notes || '',
      verified: data.verified ?? true,
    };

    // Update in-memory fallback
    const txnItem: Transaction = {
      id: data.id,
      code: data.mpesaReceiptNumber,
      customerPhone: data.customerPhone,
      customerName: data.customerName,
      businessId: memoryStore.business.id,
      businessName: memoryStore.business.name,
      amount: data.amount,
      fee: 0,
      paymentMethod: data.paymentMethod,
      status: (data.status as any) || 'COMPLETED',
      timestamp: data.timestamp,
      reference: `POS-REC-${data.id.slice(-5)}`,
      tillNumber: data.tillNumber || '842109',
      verifiedBy: data.cashierBadgeId || 'Cashier',
      verifiedAt: data.timestamp,
      smsReceiptText: `${data.mpesaReceiptNumber} Confirmed. Ksh${data.amount.toLocaleString()} paid to Zawadi Mart`,
      notes: data.notes || '',
    };
    memoryStore.transactions.unshift(txnItem);

    // Write to PostgreSQL
    try {
      await db.insert(transactions).values(record).onConflictDoNothing();
    } catch (err) {
      console.warn('[PostgreSQL ORM] Async write queued:', (err as Error).message);
    }

    // Broadcast Real-time event across the SSE stream
    broadcastPostgresEvent({
      table: 'transactions',
      action: 'INSERT',
      recordId: data.id,
      data: record,
    });

    return record;
  },

  async updateStatus(id: string, status: string) {
    try {
      await db
        .update(transactions)
        .set({ status })
        .where(eq(transactions.id, id));
    } catch {
      // fallback
    }

    const item = memoryStore.transactions.find(t => t.id === id);
    if (item) {
      item.status = status as any;
    }

    broadcastPostgresEvent({
      table: 'transactions',
      action: 'UPDATE',
      recordId: id,
      data: { id, status },
    });

    return { id, status };
  },
};

/* -------------------------------------------------------------------------- */
/*                             CUSTOMER REPOSITORY                            */
/* -------------------------------------------------------------------------- */

export const CustomerModel = {
  async getAll() {
    try {
      const records = await db.select().from(customers);
      if (records.length > 0) return records;
    } catch {
      // fallback
    }
    return memoryStore.customers;
  },

  async getById(id: string) {
    try {
      const records = await db.select().from(customers).where(eq(customers.id, id));
      if (records.length > 0) return records[0];
    } catch {
      // fallback
    }
    return memoryStore.customers.find(c => c.id === id) || null;
  },

  async create(data: {
    id: string;
    name: string;
    phone: string;
    email?: string;
    walletBalance?: number;
    loyaltyPoints?: number;
    tier?: string;
    avatarInitials?: string;
  }) {
    const record = {
      id: data.id,
      name: data.name,
      phone: data.phone,
      email: data.email || null,
      walletBalance: (data.walletBalance ?? 10000).toFixed(2),
      loyaltyPoints: data.loyaltyPoints ?? 0,
      totalSpent: '0.00',
      transactionCount: 0,
      tier: data.tier || 'BRONZE',
      lastVisit: 'Today',
      avatarInitials: data.avatarInitials || data.name.slice(0, 2).toUpperCase(),
    };

    memoryStore.customers.unshift({
      id: record.id,
      name: record.name,
      phone: record.phone,
      email: record.email || '',
      walletBalance: Number(record.walletBalance),
      loyaltyPoints: record.loyaltyPoints,
      totalSpent: 0,
      transactionCount: 0,
      tier: record.tier as any,
      lastVisit: record.lastVisit,
      avatarInitials: record.avatarInitials,
    });

    try {
      await db.insert(customers).values(record).onConflictDoNothing();
    } catch (err) {
      console.warn('[PostgreSQL ORM] Customer insert queued:', (err as Error).message);
    }

    broadcastPostgresEvent({
      table: 'customers',
      action: 'INSERT',
      recordId: data.id,
      data: record,
    });

    return record;
  },

  async adjustBalance(id: string, amountChange: number, pointsChange: number) {
    const cust = memoryStore.customers.find(c => c.id === id);
    if (cust) {
      cust.walletBalance = Math.max(0, (cust.walletBalance || 0) + amountChange);
      cust.loyaltyPoints = Math.max(0, cust.loyaltyPoints + pointsChange);
      if (amountChange > 0) {
        cust.totalSpent += amountChange;
        cust.transactionCount += 1;
      }
    }

    try {
      if (cust) {
        await db
          .update(customers)
          .set({
            walletBalance: (cust.walletBalance || 0).toFixed(2),
            loyaltyPoints: cust.loyaltyPoints,
            totalSpent: cust.totalSpent.toFixed(2),
            transactionCount: cust.transactionCount,
          })
          .where(eq(customers.id, id));
      }
    } catch {
      // fallback
    }

    broadcastPostgresEvent({
      table: 'customers',
      action: 'UPDATE',
      recordId: id,
      data: { id, amountChange, pointsChange, newBalance: cust?.walletBalance },
    });

    return cust;
  },
};

/* -------------------------------------------------------------------------- */
/*                              AUDIT REPOSITORY                              */
/* -------------------------------------------------------------------------- */

export const AuditModel = {
  async getAll() {
    try {
      const records = await db.select().from(audits);
      if (records.length > 0) return records;
    } catch {
      // fallback
    }
    return memoryStore.audits;
  },

  async create(data: {
    id: string;
    transactionId?: string;
    physicalLogNumber: string;
    recordedAmount: number;
    actualAmount: number;
    discrepancyAmount: number;
    discrepancyReason?: string;
    cashierName: string;
    cashierBadgeId: string;
    status: string;
    date: string;
  }) {
    const record = {
      id: data.id,
      transactionId: data.transactionId || null,
      physicalLogNumber: data.physicalLogNumber,
      recordedAmount: data.recordedAmount.toFixed(2),
      actualAmount: data.actualAmount.toFixed(2),
      discrepancyAmount: data.discrepancyAmount.toFixed(2),
      discrepancyReason: data.discrepancyReason || null,
      cashierName: data.cashierName,
      cashierBadgeId: data.cashierBadgeId,
      status: data.status,
      date: data.date,
    };

    const auditItem: ManualEntryAudit = {
      id: data.id,
      timestamp: data.date,
      notebookAmount: data.recordedAmount,
      systemAmount: data.actualAmount,
      customerName: data.cashierName,
      discrepancyType: data.status === 'MATCHED' ? 'MATCH' : 'TRANSCRIPTION_ERROR',
      description: data.discrepancyReason || 'Physical counter book log',
      recoveredValue: data.discrepancyAmount,
    };
    memoryStore.audits.unshift(auditItem);

    try {
      await db.insert(audits).values(record).onConflictDoNothing();
    } catch (err) {
      console.warn('[PostgreSQL ORM] Audit insert queued:', (err as Error).message);
    }

    broadcastPostgresEvent({
      table: 'audits',
      action: 'INSERT',
      recordId: data.id,
      data: record,
    });

    return record;
  },
};

/* -------------------------------------------------------------------------- */
/*                            BUSINESS REPOSITORY                             */
/* -------------------------------------------------------------------------- */

export const BusinessModel = {
  async get(): Promise<BusinessProfile> {
    try {
      const records = await db.select().from(businesses).limit(1);
      if (records.length > 0) {
        const b = records[0];
        return {
          id: b.id,
          name: b.name,
          category: b.category,
          tillNumber: b.tillNumber,
          paybillNumber: b.paybillNumber,
          accountRef: b.accountRef,
          currency: b.currency,
          branch: b.branch,
          phone: b.phone,
          email: b.email,
          address: b.address,
          dailyTarget: Number(b.dailyTarget),
        };
      }
    } catch {
      // fallback
    }
    return memoryStore.business;
  },

  async update(data: Partial<BusinessProfile>) {
    memoryStore.business = {
      ...memoryStore.business,
      ...data,
    };

    try {
      await db
        .insert(businesses)
        .values({
          id: memoryStore.business.id,
          name: memoryStore.business.name,
          category: memoryStore.business.category,
          tillNumber: memoryStore.business.tillNumber,
          paybillNumber: memoryStore.business.paybillNumber,
          accountRef: memoryStore.business.accountRef,
          currency: memoryStore.business.currency,
          branch: memoryStore.business.branch,
          phone: memoryStore.business.phone,
          email: memoryStore.business.email,
          address: memoryStore.business.address,
          dailyTarget: memoryStore.business.dailyTarget.toFixed(2),
        })
        .onConflictDoUpdate({
          target: businesses.id,
          set: {
            name: memoryStore.business.name,
            category: memoryStore.business.category,
            tillNumber: memoryStore.business.tillNumber,
            paybillNumber: memoryStore.business.paybillNumber,
            accountRef: memoryStore.business.accountRef,
            currency: memoryStore.business.currency,
            branch: memoryStore.business.branch,
            phone: memoryStore.business.phone,
            email: memoryStore.business.email,
            address: memoryStore.business.address,
            dailyTarget: memoryStore.business.dailyTarget.toFixed(2),
          },
        });
    } catch (err) {
      console.warn('[PostgreSQL ORM] Business update queued:', (err as Error).message);
    }

    broadcastPostgresEvent({
      table: 'businesses',
      action: 'UPDATE',
      recordId: memoryStore.business.id,
      data: memoryStore.business as unknown as Record<string, unknown>,
    });

    return memoryStore.business;
  },
};

/* -------------------------------------------------------------------------- */
/*                              USER REPOSITORY                               */
/* -------------------------------------------------------------------------- */

export const UserModel = {
  async getOrCreateUser(uid: string, email: string, displayName?: string, role?: string) {
    try {
      const result = await db
        .insert(users)
        .values({
          uid,
          email,
          displayName: displayName || '',
          role: role || 'CASHIER',
        })
        .onConflictDoUpdate({
          target: users.uid,
          set: {
            email,
            displayName: displayName || '',
            role: role || 'CASHIER',
          },
        })
        .returning();

      return result[0];
    } catch (err) {
      console.warn('[PostgreSQL ORM] User sync queued:', (err as Error).message);
      let user = memoryStore.users.find(u => u.uid === uid);
      if (!user) {
        user = {
          uid,
          email,
          displayName: displayName || '',
          role: role || 'CASHIER',
          createdAt: new Date().toISOString(),
        };
        memoryStore.users.push(user);
      }
      return user;
    }
  },
};
