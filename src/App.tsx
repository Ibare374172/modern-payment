import React, { useState, useEffect } from 'react';
import { 
  Transaction, 
  BusinessProfile, 
  Customer, 
  ManualEntryAudit, 
  UserRole,
  PaymentMethod,
  StaffAccount 
} from './types';
import { 
  getStoredTransactions, 
  saveTransaction, 
  getStoredBusiness, 
  getStoredCustomers, 
  getStoredAudits,
} from './utils/storage';
import { initialStaffAccounts } from './utils/mockData';
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
  saveBusinessToDb,
} from './services/dbService';
import { setCachedDarajaConfig } from './services/stkService';
import { Header } from './components/Header';
import { CashierTerminal } from './components/CashierTerminal';
import { ManagerDashboard } from './components/ManagerDashboard';
import { CustomerPortal } from './components/CustomerPortal';
import { ResearchExplorer } from './components/ResearchExplorer';
import { AccountSwitcherModal } from './components/AccountSwitcherModal';
import { AuthGateway } from './components/AuthGateway';
import { StkPushModal } from './components/StkPushModal';
import { ReceiptModal } from './components/ReceiptModal';
import { DarajaConfigModal } from './components/DarajaConfigModal';
import { sounds } from './utils/audio';

export default function App() {
  // Session & Authentication State (Must log in or register before using the systems)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionUser, setSessionUser] = useState<{
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
  } | null>(() => {
    try {
      const saved = localStorage.getItem('mp_user_session_v1');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Operational Workspace & Role State
  const [activeRole, setActiveRole] = useState<UserRole>(sessionUser?.role || 'CASHIER');
  const [activeSubTab, setActiveSubTab] = useState<string>(
    sessionUser?.role === 'MANAGER' ? 'dashboard' : sessionUser?.role === 'CUSTOMER' ? 'wallet' : sessionUser?.role === 'RESEARCHER' ? 'simulator' : 'pos'
  );

  // Multi-Account Profiles State
  const [staffAccounts, setStaffAccounts] = useState<StaffAccount[]>(initialStaffAccounts);
  const [activeStaffAccount, setActiveStaffAccount] = useState<StaffAccount>(initialStaffAccounts[0]);
  const [isAccountSwitcherOpen, setIsAccountSwitcherOpen] = useState<boolean>(false);

  // Persistence State
  const [business, setBusiness] = useState<BusinessProfile>(getStoredBusiness());
  const [transactions, setTransactions] = useState<Transaction[]>(getStoredTransactions());
  const [customers, setCustomers] = useState<Customer[]>(getStoredCustomers());
  const [audits, setAudits] = useState<ManualEntryAudit[]>(getStoredAudits());
  const [activeCustomerId, setActiveCustomerId] = useState<string>(customers[0]?.id || 'CUST-01');

  // Currently Active Customer
  const activeCustomer = customers.find(c => c.id === activeCustomerId) || customers[0];

  // Database Connection State
  const [dbConnected, setDbConnected] = useState<boolean>(false);

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
      if (user && !sessionUser) {
        const role: UserRole = user.email === 'hillary.makedi@gmail.com' ? 'CUSTOMER' : 'CASHIER';
        const session = {
          uid: user.uid,
          email: user.email || 'user@mpesa.ke',
          displayName: user.displayName || user.email?.split('@')[0] || 'Authorized User',
          role,
        };
        setSessionUser(session);
        try {
          localStorage.setItem('mp_user_session_v1', JSON.stringify(session));
        } catch {
          // Ignore
        }
      }
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

  const handleUserAuthenticated = (user: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
  }) => {
    setSessionUser(user);
    try {
      localStorage.setItem('mp_user_session_v1', JSON.stringify(user));
    } catch {
      // Ignore
    }

    // Set role & default subtab
    handleSelectRole(user.role);

    // If customer, ensure customer profile is registered & selected
    if (user.role === 'CUSTOMER') {
      const existing = customers.find(c => c.email === user.email || c.name.toLowerCase() === user.displayName.toLowerCase());
      if (existing) {
        setActiveCustomerId(existing.id);
      } else {
        const newCust: Customer = {
          id: `CUST-${Date.now().toString().slice(-4)}`,
          name: user.displayName,
          phone: user.phone || '+254 722 000 000',
          email: user.email,
          totalSpent: 0,
          transactionCount: 0,
          loyaltyPoints: 100,
          lastVisit: 'Just registered',
          tier: 'BRONZE',
          walletBalance: 12000,
          memberSince: 'Today',
          avatarInitials: user.displayName.slice(0, 2).toUpperCase(),
        };
        handleAddNewCustomer(newCust);
      }
    } else {
      // Create/update staff profile
      const staffAcc: StaffAccount = {
        id: `ACC-${user.uid.slice(0, 6)}`,
        name: user.displayName,
        role: user.role,
        email: user.email,
        title: user.role === 'CASHIER' ? 'Registered POS Cashier' : user.role === 'MANAGER' ? 'Registered Store Manager' : 'FinTech Researcher',
        badgeId: user.role === 'CASHIER' ? 'CSH-REG' : user.role === 'MANAGER' ? 'MGR-REG' : 'RES-REG',
        assignedTill: business.tillNumber,
        branch: business.branch,
        permissions: user.role === 'MANAGER' 
          ? ['FULL_STORE_ADMIN', 'REVENUE_ANALYTICS', 'AUDIT_RECONCILIATION'] 
          : user.role === 'CASHIER'
          ? ['POS_CHECKOUT', 'STK_PUSH_DISPATCH', 'CODE_VERIFICATION']
          : ['TAM_SIMULATOR', 'EMPIRICAL_AUDIT_DATA'],
        status: 'ON_DUTY',
        avatarInitials: user.displayName.slice(0, 2).toUpperCase(),
      };
      setActiveStaffAccount(staffAcc);
    }
  };

  const handleLogin = async () => {
    try {
      sounds.playClick();
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.warn('Sign-in completed or cancelled:', error);
    }
  };

  const handleLogout = async () => {
    try {
      sounds.playClick();
      await signOut(auth);
      setSessionUser(null);
      localStorage.removeItem('mp_user_session_v1');
    } catch (error) {
      console.warn('Sign out error:', error);
      setSessionUser(null);
      localStorage.removeItem('mp_user_session_v1');
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

  // Role Switcher Handler (Ensures proper default subtab for each separated account)
  const handleSelectRole = (role: UserRole) => {
    setActiveRole(role);
    if (role === 'CASHIER') {
      setActiveSubTab('pos');
    } else if (role === 'MANAGER') {
      setActiveSubTab('dashboard');
    } else if (role === 'CUSTOMER') {
      setActiveSubTab('wallet');
    } else if (role === 'RESEARCHER') {
      setActiveSubTab('simulator');
    }
  };

  // Customer Account Switcher & Creation
  const handleSelectCustomer = (cust: Customer) => {
    setActiveCustomerId(cust.id);
  };

  const handleAddNewCustomer = async (newCust: Customer) => {
    setCustomers(prev => [newCust, ...prev]);
    setActiveCustomerId(newCust.id);
    await saveCustomerToDb(newCust);
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
      const newPoints = current.loyaltyPoints + Math.floor(amount / 10);
      const newSpend = current.totalSpent + amount;
      const newTier: Customer['tier'] = newSpend > 50000 ? 'PLATINUM' : newSpend > 20000 ? 'GOLD' : newSpend > 10000 ? 'SILVER' : 'BRONZE';
      
      updatedCust = {
        ...current,
        totalSpent: newSpend,
        transactionCount: current.transactionCount + 1,
        loyaltyPoints: newPoints,
        walletBalance: Math.max(0, (current.walletBalance || 10000) - amount),
        tier: newTier,
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
        walletBalance: 15000,
        tier: 'BRONZE',
        memberSince: 'Today',
        avatarInitials: customerName ? customerName.slice(0, 2).toUpperCase() : 'VC',
        lastVisit: 'Just now',
      };
    }

    // Save to Firestore and local state
    await saveCustomerToDb(updatedCust);
    setCustomers(prev => {
      const idx = prev.findIndex(c => c.id === updatedCust.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = updatedCust;
        return copy;
      }
      return [updatedCust, ...prev];
    });
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

  // MANDATORY AUTHENTICATION GATE:
  // If user is not authenticated, show registration and login screen before accessing systems!
  const isAuthenticated = !!(sessionUser || currentUser);

  if (!isAuthenticated) {
    return (
      <AuthGateway
        onAuthenticated={handleUserAuthenticated}
        staffAccounts={staffAccounts}
        customers={customers}
        businessName={business.name}
        tillNumber={business.tillNumber}
      />
    );
  }

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

      {/* Main Navigation & Role Header */}
      <Header
        activeRole={activeRole}
        setActiveRole={handleSelectRole}
        activeStaffAccount={activeStaffAccount}
        activeCustomer={activeCustomer}
        onOpenAccountSwitcher={() => setIsAccountSwitcherOpen(true)}
        activeSubTab={activeSubTab}
        setActiveSubTab={setActiveSubTab}
        business={business}
        soundEnabled={soundEnabled}
        setSoundEnabled={setSoundEnabled}
        todayCount={todayTransactions.length}
        dbConnected={dbConnected}
        currentUser={currentUser}
        sessionUser={sessionUser}
        onLogin={handleLogin}
        onLogout={handleLogout}
        onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
      />

      {/* Main Workspace Area (Cleanly separated for each account) */}
      <main className="flex-1 pb-12">
        {/* 1. CASHIER WORKSPACE */}
        {activeRole === 'CASHIER' && (
          <CashierTerminal
            business={business}
            transactions={transactions}
            activeStaffAccount={activeStaffAccount}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            onTriggerStkPush={handleTriggerStkPush}
            onViewReceipt={handleOpenReceipt}
            onDirectRecordPayment={handleDirectRecordPayment}
            onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
          />
        )}

        {/* 2. MANAGER WORKSPACE */}
        {activeRole === 'MANAGER' && (
          <ManagerDashboard
            business={business}
            transactions={transactions}
            audits={audits}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            onRefreshAudits={refreshAudits}
            onViewReceipt={handleOpenReceipt}
            onUpdateBusiness={handleUpdateBusiness}
            onOpenDarajaConfig={() => setIsDarajaModalOpen(true)}
          />
        )}

        {/* 3. CUSTOMER WORKSPACE */}
        {activeRole === 'CUSTOMER' && (
          <CustomerPortal
            business={business}
            customers={customers}
            transactions={transactions}
            activeCustomer={activeCustomer}
            onSelectCustomer={handleSelectCustomer}
            onAddCustomer={handleAddNewCustomer}
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
            onTriggerStkPush={handleTriggerStkPush}
            onViewReceipt={handleOpenReceipt}
          />
        )}

        {/* 4. RESEARCHER WORKSPACE */}
        {activeRole === 'RESEARCHER' && (
          <ResearchExplorer
            activeSubTab={activeSubTab}
            setActiveSubTab={setActiveSubTab}
          />
        )}
      </main>

      {/* Multi-Account & Workspace Switcher Modal */}
      <AccountSwitcherModal
        isOpen={isAccountSwitcherOpen}
        onClose={() => setIsAccountSwitcherOpen(false)}
        activeRole={activeRole}
        onSelectRole={handleSelectRole}
        staffAccounts={staffAccounts}
        activeStaffAccount={activeStaffAccount}
        onSelectStaffAccount={(acc) => setActiveStaffAccount(acc)}
        customers={customers}
        activeCustomer={activeCustomer}
        onSelectCustomer={handleSelectCustomer}
      />

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
            Multi-Account Workspace Architecture • Till 842109 & Paybill 522522 with live sync.
          </p>
        </div>
      </footer>
    </div>
  );
}
