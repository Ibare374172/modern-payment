import { BusinessProfile, Customer, ManualEntryAudit, Transaction, PaymentMethod } from '../types';
import { initialBusiness, initialCustomers, initialTransactions, initialAudits } from './mockData';

const STORAGE_KEYS = {
  TRANSACTIONS: 'mp_biz_transactions_v1',
  BUSINESS: 'mp_biz_profile_v1',
  CUSTOMERS: 'mp_biz_customers_v1',
  AUDITS: 'mp_biz_audits_v1',
};

// Generate realistic alphanumeric M-Pesa 10-char receipt code (e.g. QK89LM23X1)
export function generateMpesaCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  // 2 uppercase letters + 2 numbers + 4 letters + 2 numbers
  for (let i = 0; i < 10; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function getStoredTransactions(): Transaction[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TRANSACTIONS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(initialTransactions));
      return initialTransactions;
    }
    return JSON.parse(raw);
  } catch {
    return initialTransactions;
  }
}

export function saveTransaction(txn: Transaction): Transaction[] {
  const current = getStoredTransactions();
  const updated = [txn, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.TRANSACTIONS, JSON.stringify(updated));
  } catch {
    // Local storage full or private mode
  }
  return updated;
}

export function getStoredBusiness(): BusinessProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.BUSINESS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(initialBusiness));
      return initialBusiness;
    }
    return JSON.parse(raw);
  } catch {
    return initialBusiness;
  }
}

export function updateStoredBusiness(profile: BusinessProfile): BusinessProfile {
  try {
    localStorage.setItem(STORAGE_KEYS.BUSINESS, JSON.stringify(profile));
  } catch {
    // Ignore
  }
  return profile;
}

export function getStoredCustomers(): Customer[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOMERS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(initialCustomers));
      return initialCustomers;
    }
    return JSON.parse(raw);
  } catch {
    return initialCustomers;
  }
}

export function updateCustomerAfterPayment(phone: string, name: string, amount: number) {
  const customers = getStoredCustomers();
  const existingIndex = customers.findIndex(c => c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));

  if (existingIndex >= 0) {
    customers[existingIndex].totalSpent += amount;
    customers[existingIndex].transactionCount += 1;
    customers[existingIndex].loyaltyPoints += Math.floor(amount / 10);
    customers[existingIndex].lastVisit = 'Just now';
  } else {
    customers.unshift({
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: name || 'Valued Customer',
      phone,
      totalSpent: amount,
      transactionCount: 1,
      loyaltyPoints: Math.floor(amount / 10),
      lastVisit: 'Just now',
    });
  }

  try {
    localStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
  } catch {
    // Ignore
  }
}

export function getStoredAudits(): ManualEntryAudit[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AUDITS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.AUDITS, JSON.stringify(initialAudits));
      return initialAudits;
    }
    return JSON.parse(raw);
  } catch {
    return initialAudits;
  }
}

export function recordAuditComparison(audit: ManualEntryAudit): ManualEntryAudit[] {
  const current = getStoredAudits();
  const updated = [audit, ...current];
  try {
    localStorage.setItem(STORAGE_KEYS.AUDITS, JSON.stringify(updated));
  } catch {
    // Ignore
  }
  return updated;
}

// Verification function solving the problem in Chapter 1.1 / 4.7 (Fake SMS & Transaction verification)
export function verifyTransactionCode(code: string, transactions: Transaction[]): {
  status: 'VERIFIED' | 'ALREADY_REDEEMED' | 'NOT_FOUND' | 'SUSPECTED_FAKE';
  transaction?: Transaction;
  message: string;
} {
  const cleanCode = code.trim().toUpperCase();
  if (!cleanCode) {
    return { status: 'NOT_FOUND', message: 'Please enter a transaction code.' };
  }

  // Basic check for M-Pesa format (10 alphanumeric chars)
  if (cleanCode.length < 8) {
    return {
      status: 'SUSPECTED_FAKE',
      message: 'Invalid code length. Genuine M-Pesa / Airtel Money codes are 10 alphanumeric characters.',
    };
  }

  const match = transactions.find(t => t.code.toUpperCase() === cleanCode);

  if (match) {
    if (match.status === 'COMPLETED') {
      return {
        status: 'VERIFIED',
        transaction: match,
        message: `Authentic transaction verified! Received KES ${match.amount.toLocaleString()} from ${match.customerName} (${match.customerPhone}).`,
      };
    } else {
      return {
        status: 'SUSPECTED_FAKE',
        transaction: match,
        message: `Warning: This transaction exists in records but has status: ${match.status}. Goods should NOT be released.`,
      };
    }
  }

  // Not in records
  return {
    status: 'NOT_FOUND',
    message: `Code "${cleanCode}" NOT FOUND in the business transaction server. Customer may have sent to wrong Till or received a fabricated SMS.`,
  };
}
