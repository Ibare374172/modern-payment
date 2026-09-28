import React, { useState, useEffect } from 'react';
import { 
  Transaction, 
  BusinessProfile, 
  Customer, 
  ManualEntryAudit, 
  UserRole,
  PaymentMethod 
} from './types';
import { 
  getStoredTransactions, 
  saveTransaction, 
  getStoredBusiness, 
  getStoredCustomers, 
  getStoredAudits,
} from './utils/storage';
import { 
  testConnection, 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signOut 
} from './firebase';
import { onAuthStateChanged, User } from 'firebase/auth';
import { 
  seedInitialDatabaseIfEmpty,
  subscribeToTransactions,
  subscribeToBusiness,
  subscribeToCustomers,
  subscribeToAudits,
  subscribeToGatewayConfig,
  saveTransactionToDb,
  saveCustomerToDb,
  saveAuditToDb,
  saveBusinessToDb,
} from './services/dbService';
import { setCachedDarajaConfig } from './services/stkService';
import { Header } from './components/Header';
import { CashierTerminal } from './components/CashierTerminal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { TransactionHistory } from './components/TransactionHistory';
import { CustomerPortal } from './components/CustomerPortal';
import { ResearchExplorer } from './components/ResearchExplorer';
import { StkPushModal } from './components/StkPushModal';
import { ReceiptModal } from './components/ReceiptModal';
import { DarajaConfigModal } from './components/DarajaConfigModal';
import { sounds } from './utils/audio';

export default function App() {
  // Navigation & Role State
  const [activeTab, setActiveTab] = useState<'cashier' | 'dashboard' | 'transactions' | 'customer' | 'research'>('cashier');
  const [activeRole, setActiveRole] = useState<UserRole>('CASHIER');

  // Persistence State
  const [business, setBusiness] = useState<BusinessProfile>(getStoredBusiness());
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions());
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers());
  const [audits, setAudits] = useState<ManualEntryAudit[]>(getStoredAudits());

  // Database Connection & Auth State
  const [dbConnected, setDbConnected] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  // Audio Preference
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Modal States
  const [activeReceiptTxn, setActiveReceiptTxn] = useState<Transaction | null>(null);
  const [isDarajaModalOpen, setIsDarajaModalOpen] = useState<boolean>(false);
  const [stkModalData, setStkModalData] = useState<{
    isOpen: boolean;
    phone: string;
    amount: number;
    notes: string;
    method: PaymentMethod;
    isMyPhone?: boolean;
  }>({
    isOpen: false,
    phone: '',
    amount: 0,
    notes: '',
    method: 'MPESA_EXPRESS',
    isMyPhone: false,
  });

  // Recent Toast Notification for live payment
  const [incomingToast, setIncomingToast] = useState<{
    code: string;
    amount: number;
    customer: string;
  } | null>(null);

  // Initialize Firestore and Listeners
  useEffect(() => {
    // 1. Check Firestore connection on boot
    testConnection().then(connected => {
      setDbConnected(connected);
    });

    // 2. Track Firebase Auth state
    const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
    });

    // 3. Seed initial records if empty
    seedInitialDatabaseIfEmpty();

    // 4. Attach real-time Firestore listeners
    const unsubTxns = subscribeToTransactions((remoteTxns) => {
      if (remoteTxns && remoteTxns.length > 0) {
        setTransactions(remoteTxns);
      }
    });

    const unsubBiz = subscribeToBusiness(business.id, (remoteBiz) => {
      if (remoteBiz) {
        setBusiness(remoteBiz);
      }
    });

    const unsubCustomers = subscribeToCustomers((remoteCustomers) => {
      if (remoteCustomers && remoteCustomers.length > 0) {
        setCustomers(remoteCustomers);
      }
    });

    const unsubAudits = subscribeToAudits((remoteAudits) => {
      if (remoteAudits && remoteAudits.length > 0) {
        setAudits(remoteAudits);
      }
    });

    const unsubGateway = subscribeToGatewayConfig((cfg) => {
      if (cfg) {
        setCachedDarajaConfig(cfg);
      }
    });

    return () => {
      unsubscribeAuth();
      unsubTxns();
      unsubBiz();
      unsubCustomers();
      unsubAudits();
      unsubGateway();
    };
  }, []);

  const handleUpdateBusiness = async (updatedBiz: BusinessProfile) => {
    setBusiness(updatedBiz);
    await saveBusinessToDb(updatedBiz);
  };

  const handleLogin = async () => {
    try {
      sounds.playClick();
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn('Google sign-in completed or cancelled:', error);
    }
  };

  const handleLogout = async () => {
    try {
      sounds.playClick();
      await signOut(auth);
    } catch (error) {
      console.warn('Sign out error:', error);
    }
  };

  const refreshAudits = () => {
    setAudits(getStoredAudits());
  };

  const handleOpenReceipt = (txn: Transaction) => {
    setActiveReceiptTxn(txn);
  };

  const handleCloseReceipt = () => {
    setActiveReceiptTxn(null);
  };

  // Trigger STK Push prompt (customer enters PIN)
  const handleTriggerStkPush = (data: { phone: string; amount: number; notes: string; method: PaymentMethod; isMyPhone?: boolean }) => {
    setStkModalData({
      isOpen: true,
      phone: data.phone,
      amount: data.amount,
      notes: data.notes,
      method: data.method,
      isMyPhone: data.isMyPhone ?? false,
    });
  };

  // Helper to update customer spend and loyalty
  const updateCustomerData = async (phone: string, customerName: string, amount: number) => {
    const existingIndex = customers.findIndex(c => c.phone.replace(/\s+/g, '') === phone.replace(/\s+/g, ''));
    let updatedCust: Customer;

    if (existingIndex >= 0) {
      const current = customers[existingIndex];
      updatedCust = {
        ...current,
        totalSpent: current.totalSpent + amount,
        transactionCount: current.transactionCount + 1,
        loyaltyPoints: current.loyaltyPoints + Math.floor(amount / 10),
        lastVisit: 'Just now',
      };
    } else {
      updatedCust = {
        id: `CUST-${Date.now().toString().slice(-4)}`,
        name: customerName || 'Valued Customer',
        phone,
        totalSpent: amount,
        transactionCount: 1,
        loyaltyPoints: Math.floor(amount / 10),
        lastVisit: 'Just now',
      };
    }

    // Save to Firestore and local state
    await saveCustomerToDb(updatedCust);
  };

  // Callback after PIN is entered in STK prompt
  const handleStkPaymentSuccess = async (mpesaCode: string, _pin: string) => {
    const formattedPhone = stkModalData.phone || '+254 722 000 000';
    const foundCustomer = customers.find(c => c.phone.replace(/\s+/g, '') === formattedPhone.replace(/\s+/g, ''));
    const customerName = foundCustomer ? foundCustomer.name : 'M-Pesa Customer';

    const newTxn: Transaction = {
      id: `TXN-${Date.now().toString().slice(-4)}`,
      code: mpesaCode,
      customerPhone: formattedPhone,
      customerName,
      businessId: business.id,
      businessName: business.name,
      amount: stkModalData.amount,
      fee: 0,
      paymentMethod: stkModalData.method,
      status: 'COMPLETED',
      timestamp: new Date().toISOString(),
      reference: `POS-REC-${Date.now().toString().slice(-5)}`,
      tillNumber: business.tillNumber,
      paybillNumber: business.paybillNumber,
      accountRef: business.accountRef,
      verifiedBy: 'Safaricom STK Instant Callback',
      verifiedAt: new Date().toISOString(),
      smsReceiptText: `${mpesaCode} Confirmed. Ksh${stkModalData.amount.toLocaleString()}.00 paid to ${business.name} Till ${business.tillNumber} on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}.`,
      notes: stkModalData.notes || 'Mobile Counter Sale',
    };

    // 1. Save to Cloud Firestore
    await saveTransactionToDb(newTxn);
    await updateCustomerData(formattedPhone, customerName, stkModalData.amount);

    // 2. Also keep local storage updated
    saveTransaction(newTxn);

    // 3. Show toast alert
    setIncomingToast({
      code: mpesaCode,
      amount: stkModalData.amount,
      customer: customerName,
    });
    setTimeout(() => setIncomingToast(null), 5000);

    // 4. Open receipt
    setActiveReceiptTxn(newTxn);
  };

  // Direct payment recording (Till, Paybill, QR)
  const handleDirectRecordPayment = async (newTxn: Transaction) => {
    // 1. Save to Cloud Firestore
    await saveTransactionToDb(newTxn);
    await updateCustomerData(newTxn.customerPhone, newTxn.customerName, newTxn.amount);

    // 2. Local storage
    saveTransaction(newTxn);

    setIncomingToast({
      code: newTxn.code,
      amount: newTxn.amount,
      customer: newTxn.customerName,
    });
    setTimeout(() => setIncomingToast(null), 5000);

    setActiveReceiptTxn(newTxn);
  };

  const todayTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString();
  });

  return (
    <div className="min-h-screen bg-stone-100/70 text-stone-900 font-sans flex flex-col">
      {/* Toast Alert for incoming payment */}
      {incomingToast && (
        <div 
          id="incoming-payment-toast"
          className="fixed bottom-5 right-5 z-50 bg-emerald-900 text-white px-4 py-3 rounded-2xl shadow-xl border border-emerald-700 flex items-center gap-3 animate-in slide-in-from-bottom-5 duration-300"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500 text-stone-950 flex items-center justify-center font-bold text-sm">
            KES
          </div>
          <div className="text-xs">
            <div className="font-bold flex items-center gap-1.5">
              <span>Payment Received</span>
              <span className="font-mono text-emerald-300">({incomingToast.code})</span>
            </div>
            <p className="text-emerald-100">
              <strong>KES {incomingToast.amount.toLocaleString()}</strong> from {incomingToast.customer}
            </p>
          </div>
          <button
            onClick={() => setIncomingToast(null)}
            className="text-emerald-300 hover:text-white text-sm font-bold pl-2"
          >
            ×
          </button>
        </div>
      )}

      {/* Main Navigation Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        activeRole={activeRole}
        setActiveRole={setActiveRole}
        business={business}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        todayCount={todayTransactions.length}
        dbConnected={dbConnected}
        currentUser={currentUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 pb-12">
        {activeTab === 'cashier' && (
          <CashierTerminal
            business={business}
            transactions={transactions}
            onTriggerStkPush={handleTriggerStkPush}
            onViewReceipt={handleOpenReceipt}
            onDirectRecordPayment={handleDirectRecordPayment}
            onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
          />
        )}

        {activeTab === 'dashboard' && (
          <ManagerDashboard
            business={business}
            transactions={transactions}
            audits={audits}
            onRefreshAudits={refreshAudits}
            onViewReceipt={handleOpenReceipt}
            onUpdateBusiness={handleUpdateBusiness}
          />
        )}

        {activeTab === 'transactions' && (
          <TransactionHistory
            transactions={transactions}
            onViewReceipt={handleOpenReceipt}
          />
        )}

        {activeTab === 'customer' && (
          <CustomerPortal
            business={business}
            customers={customers}
            transactions={transactions}
            onTriggerStkPush={handleTriggerStkPush}
            onViewReceipt={handleOpenReceipt}
          />
        )}

        {activeTab === 'research' && (
          <ResearchExplorer />
        )}
      </main>

      {/* STK Push Phone Simulation & Real Handset Modal */}
      <StkPushModal
        isOpen={stkModalData.isOpen}
        onClose={() => setStkModalData(prev => ({ ...prev, isOpen: false }))}
        phone={stkModalData.phone}
        amount={stkModalData.amount}
        businessName={business.name}
        tillNumber={business.tillNumber}
        paybillNumber={business.paybillNumber}
        accountRef={business.accountRef}
        isMyPhone={stkModalData.isMyPhone}
        onPaymentSuccess={handleStkPaymentSuccess}
        onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
      />

      {/* Daraja API Gateway Configuration Modal */}
      <DarajaConfigModal
        isOpen={isDarajaModalOpen}
        onClose={() => setIsDarajaModalOpen(false)}
      />

      {/* Thermal Electronic Receipt Modal */}
      <ReceiptModal
        isOpen={!!activeReceiptTxn}
        onClose={handleCloseReceipt}
        transaction={activeReceiptTxn}
        business={business}
      />

      {/* System Footer */}
      <footer className="bg-white border-t border-stone-200 py-4 text-xs text-stone-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-stone-700">
              Mobile Payments in Modern Businesses
            </span>
            <span>•</span>
            <span className="text-emerald-700 font-medium">Real-Time Cloud Ledger Connected</span>
          </div>
          <p className="text-[11px] text-stone-400">
            Persistent cloud ledger supporting M-Pesa Till 842109 & Paybill 522522 with live sync.
          </p>
        </div>
      </footer>
    </div>
  );
}
