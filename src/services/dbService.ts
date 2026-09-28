import { 
  collection, 
  doc, 
  setDoc, 
  getDoc,
  onSnapshot, 
  getDocs, 
  query, 
  orderBy, 
  limit 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase';
import { 
  Transaction, 
  BusinessProfile, 
  Customer, 
  ManualEntryAudit, 
  GatewayConfig, 
  StkRequest, 
  VerificationLog,
  UserProfile 
} from '../types';
import { initialBusiness, initialCustomers, initialTransactions, initialAudits } from '../utils/mockData';

export const COLLECTIONS = {
  TRANSACTIONS: 'transactions',
  BUSINESSES: 'businesses',
  CUSTOMERS: 'customers',
  AUDITS: 'audits',
  SETTINGS: 'settings',
  STK_REQUESTS: 'stk_requests',
  VERIFICATIONS: 'verifications',
  USERS: 'users',
};

// Seed initial database records if empty
export async function seedInitialDatabaseIfEmpty() {
  try {
    const txnSnap = await getDocs(collection(db, COLLECTIONS.TRANSACTIONS));
    if (txnSnap.empty) {
      console.log('Seeding initial data into Cloud Firestore...');
      // Seed business
      await setDoc(doc(db, COLLECTIONS.BUSINESSES, initialBusiness.id), initialBusiness);

      // Seed transactions
      for (const txn of initialTransactions) {
        await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, txn.id), txn);
      }

      // Seed customers
      for (const cust of initialCustomers) {
        await setDoc(doc(db, COLLECTIONS.CUSTOMERS, cust.id), cust);
      }

      // Seed audits
      for (const audit of initialAudits) {
        await setDoc(doc(db, COLLECTIONS.AUDITS, audit.id), audit);
      }

      // Seed initial default gateway configuration if none exists
      await setDoc(doc(db, COLLECTIONS.SETTINGS, 'daraja'), {
        id: 'daraja',
        environment: 'sandbox',
        shortcode: '174379',
        passkey: 'bfb279f9aa9bdbcf158e97dd71a467cd2e0c893059b10f78e6b72ada1ed2c919',
        updatedAt: new Date().toISOString(),
      });

      console.log('Initial data seeded to Cloud Firestore successfully.');
    }
  } catch (error) {
    console.warn('Database seed skipped or error handled:', error);
  }
}

// Subscriptions
export function subscribeToTransactions(onUpdate: (txns: Transaction[]) => void) {
  const path = COLLECTIONS.TRANSACTIONS;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(150));
  
  return onSnapshot(
    q,
    (snapshot) => {
      const items: Transaction[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as Transaction);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToBusiness(businessId: string, onUpdate: (biz: BusinessProfile) => void) {
  const path = `${COLLECTIONS.BUSINESSES}/${businessId}`;
  return onSnapshot(
    doc(db, COLLECTIONS.BUSINESSES, businessId),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as BusinessProfile);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToCustomers(onUpdate: (customers: Customer[]) => void) {
  const path = COLLECTIONS.CUSTOMERS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: Customer[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as Customer);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export function subscribeToAudits(onUpdate: (audits: ManualEntryAudit[]) => void) {
  const path = COLLECTIONS.AUDITS;
  return onSnapshot(
    collection(db, path),
    (snapshot) => {
      const items: ManualEntryAudit[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as ManualEntryAudit);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Gateway settings subscription & storage
export function subscribeToGatewayConfig(onUpdate: (config: GatewayConfig | null) => void) {
  const path = `${COLLECTIONS.SETTINGS}/daraja`;
  return onSnapshot(
    doc(db, COLLECTIONS.SETTINGS, 'daraja'),
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate(snapshot.data() as GatewayConfig);
      } else {
        onUpdate(null);
      }
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

export async function getGatewayConfigFromDb(): Promise<GatewayConfig | null> {
  const path = `${COLLECTIONS.SETTINGS}/daraja`;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.SETTINGS, 'daraja'));
    if (snap.exists()) {
      return snap.data() as GatewayConfig;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function saveGatewayConfigToDb(config: GatewayConfig): Promise<void> {
  const path = `${COLLECTIONS.SETTINGS}/daraja`;
  try {
    const payload = {
      ...config,
      id: 'daraja',
      updatedAt: new Date().toISOString(),
    };
    await setDoc(doc(db, COLLECTIONS.SETTINGS, 'daraja'), payload, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// STK Request logs in database
export async function saveStkRequestToDb(request: StkRequest): Promise<void> {
  const path = `${COLLECTIONS.STK_REQUESTS}/${request.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.STK_REQUESTS, request.id), request, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToStkRequests(onUpdate: (requests: StkRequest[]) => void) {
  const path = COLLECTIONS.STK_REQUESTS;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: StkRequest[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as StkRequest);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Anti-Fraud Verification logs in database
export async function saveVerificationLogToDb(log: VerificationLog): Promise<void> {
  const path = `${COLLECTIONS.VERIFICATIONS}/${log.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.VERIFICATIONS, log.id), log);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export function subscribeToVerificationLogs(onUpdate: (logs: VerificationLog[]) => void) {
  const path = COLLECTIONS.VERIFICATIONS;
  const q = query(collection(db, path), orderBy('timestamp', 'desc'), limit(50));
  return onSnapshot(
    q,
    (snapshot) => {
      const items: VerificationLog[] = [];
      snapshot.forEach(docSnap => {
        items.push(docSnap.data() as VerificationLog);
      });
      onUpdate(items);
    },
    (error) => {
      handleFirestoreError(error, OperationType.GET, path);
    }
  );
}

// Write operations for core entities
export async function saveTransactionToDb(txn: Transaction): Promise<void> {
  const path = `${COLLECTIONS.TRANSACTIONS}/${txn.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.TRANSACTIONS, txn.id), txn);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveCustomerToDb(customer: Customer): Promise<void> {
  const path = `${COLLECTIONS.CUSTOMERS}/${customer.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.CUSTOMERS, customer.id), customer);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveAuditToDb(audit: ManualEntryAudit): Promise<void> {
  const path = `${COLLECTIONS.AUDITS}/${audit.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.AUDITS, audit.id), audit);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveBusinessToDb(biz: BusinessProfile): Promise<void> {
  const path = `${COLLECTIONS.BUSINESSES}/${biz.id}`;
  try {
    await setDoc(doc(db, COLLECTIONS.BUSINESSES, biz.id), biz);
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function saveUserProfileToDb(profile: UserProfile): Promise<void> {
  const path = `${COLLECTIONS.USERS}/${profile.uid}`;
  try {
    await setDoc(doc(db, COLLECTIONS.USERS, profile.uid), profile, { merge: true });
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function getUserProfileFromDb(uid: string): Promise<UserProfile | null> {
  const path = `${COLLECTIONS.USERS}/${uid}`;
  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}
