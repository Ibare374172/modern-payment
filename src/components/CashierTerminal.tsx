import React, { useState } from 'react';
import { 
  Transaction, 
  BusinessProfile, 
  PaymentMethod,
  StaffAccount 
} from '../types';
import { 
  Send, 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  QrCode, 
  Receipt, 
  Sparkles,
  RefreshCw,
  PhoneCall,
  UserCheck,
  CreditCard,
  Building2,
  Smartphone,
  Zap,
  Settings2,
  User,
  Wallet,
  Lock,
  DollarSign
} from 'lucide-react';
import { verifyTransactionCode, generateMpesaCode } from '../utils/storage';
import { sounds } from '../utils/audio';
import { getStoredDarajaConfig } from '../services/stkService';
import { saveVerificationLogToDb } from '../services/dbService';

interface CashierTerminalProps {
  business: BusinessProfile;
  transactions: Transaction[];
  activeStaffAccount?: StaffAccount;
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  onTriggerStkPush: (data: { phone: string; amount: number; notes: string; method: PaymentMethod; isMyPhone?: boolean }) => void;
  onViewReceipt: (txn: Transaction) => void;
  onDirectRecordPayment: (txn: Transaction) => void;
  onOpenDarajaConfig?: () => void;
}

export const CashierTerminal: React.FC<CashierTerminalProps> = ({
  business,
  transactions,
  activeStaffAccount,
  activeSubTab = 'pos',
  setActiveSubTab,
  onTriggerStkPush,
  onViewReceipt,
  onDirectRecordPayment,
  onOpenDarajaConfig,
}) => {
  // POS Form State
  const [amount, setAmount] = useState<number | ''>(850);
  const [phone, setPhone] = useState('0723 458 912');
  const [customerName, setCustomerName] = useState('Wanjiku Mwangi');
  const [notes, setNotes] = useState('Counter checkout');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('MPESA_EXPRESS');
  const [targetPhoneMode, setTargetPhoneMode] = useState<'CUSTOMER' | 'MY_PHONE'>('CUSTOMER');
  
  // Verification Tool State (Anti-Fraud Checker)
  const [verifyInput, setVerifyInput] = useState('');
  const [verifyResult, setVerifyResult] = useState<{
    status: 'VERIFIED' | 'ALREADY_REDEEMED' | 'NOT_FOUND' | 'SUSPECTED_FAKE';
    transaction?: Transaction;
    message: string;
  } | null>(null);

  // Shift Drawer State
  const [openingFloat] = useState<number>(5000);
  const [drawerReconciled, setDrawerReconciled] = useState<boolean>(false);
  const [reconcileFeedback, setReconcileFeedback] = useState<string | null>(null);

  // Quick amounts
  const quickAmounts = [150, 300, 500, 1000, 2500, 5000];

  const cashierName = activeStaffAccount ? activeStaffAccount.name : "Sarah Ndung'u";
  const cashierBadge = activeStaffAccount ? activeStaffAccount.badgeId : 'CSH-104';

  const handleVerifySubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    sounds.playClick();
    const res = verifyTransactionCode(verifyInput, transactions);
    setVerifyResult(res);

    // Store anti-fraud verification check in Firestore database
    if (verifyInput.trim()) {
      saveVerificationLogToDb({
        id: `VERIF-${Date.now()}`,
        codeChecked: verifyInput.trim().toUpperCase(),
        status: res.status,
        amount: res.transaction?.amount,
        message: res.message,
        cashierName: `${cashierName} (Till 1)`,
        timestamp: new Date().toISOString(),
      }).catch(console.warn);
    }

    if (res.status === 'VERIFIED') {
      sounds.playPaymentSuccess();
    } else {
      sounds.playWarning();
    }
  };

  const handleCheckoutSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) {
      alert('Please enter a valid amount.');
      return;
    }

    if (paymentMethod === 'MPESA_EXPRESS') {
      sounds.playClick();
      onTriggerStkPush({
        phone: phone || '+254 700 000 000',
        amount: Number(amount),
        notes,
        method: paymentMethod,
        isMyPhone: targetPhoneMode === 'MY_PHONE',
      });
    } else {
      sounds.playPaymentSuccess();
      const newCode = generateMpesaCode();
      const newTxn: Transaction = {
        id: `TXN-${Date.now().toString().slice(-4)}`,
        code: newCode,
        customerPhone: phone || '+254 700 000 000',
        customerName: customerName || 'Walk-in Customer',
        businessId: business.id,
        businessName: business.name,
        amount: Number(amount),
        fee: 0,
        paymentMethod,
        status: 'COMPLETED',
        timestamp: new Date().toISOString(),
        reference: `REC-${Date.now().toString().slice(-5)}`,
        tillNumber: business.tillNumber,
        paybillNumber: business.paybillNumber,
        accountRef: business.accountRef,
        verifiedBy: `Cashier ${cashierName} (Till 1)`,
        verifiedAt: new Date().toISOString(),
        smsReceiptText: `${newCode} Confirmed. Ksh${Number(amount).toLocaleString()}.00 received for ${business.name}.`,
        notes,
      };
      onDirectRecordPayment(newTxn);
    }
  };

  const shiftTransactions = transactions.filter(t => {
    const d = new Date(t.timestamp);
    const now = new Date();
    return d.toDateString() === now.toDateString() && t.status === 'COMPLETED';
  });

  const shiftMobileTotal = shiftTransactions.reduce((acc, t) => acc + t.amount, 0);

  const handleReconcileShift = () => {
    sounds.playPaymentSuccess();
    setDrawerReconciled(true);
    setReconcileFeedback(`Shift drawer reconciled successfully! Opening float: KES ${openingFloat.toLocaleString()} + Mobile Inflow: KES ${shiftMobileTotal.toLocaleString()} = Total Shift Account: KES ${(openingFloat + shiftMobileTotal).toLocaleString()}.`);
    setTimeout(() => {
      setReconcileFeedback(null);
    }, 6000);
  };

  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Cashier Identity Header */}
      <div className="bg-stone-900 text-stone-100 rounded-3xl p-6 sm:px-7 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 border border-stone-800">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold text-lg shadow-sm">
            {activeStaffAccount?.avatarInitials || 'SN'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                Front Counter Station
              </span>
              <span className="text-xs text-stone-400">
                Operator: <strong className="text-white">{cashierName}</strong> (Badge #{cashierBadge})
              </span>
            </div>
            <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
              Cashier Point-of-Sale Terminal
            </h2>
            <p className="text-xs text-stone-400 mt-0.5">
              Assigned to Buy Goods Till <strong>{business.tillNumber}</strong> and Paybill <strong>{business.paybillNumber}</strong>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 bg-stone-800/80 p-3 rounded-2xl border border-stone-700/60 self-start md:self-auto">
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block uppercase font-bold">Shift Sales Today</span>
            <span className="text-lg font-bold font-mono text-emerald-400">
              KES {shiftMobileTotal.toLocaleString()}
            </span>
          </div>
          <div className="h-8 w-px bg-stone-700"></div>
          <div className="text-right">
            <span className="text-[10px] text-stone-400 block uppercase font-bold">Processed</span>
            <span className="text-lg font-bold font-mono text-white">
              {shiftTransactions.length} sales
            </span>
          </div>
        </div>
      </div>

      {/* Sub-view 1: POS TERMINAL & CHECKOUT */}
      {activeSubTab === 'pos' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: POS Payment Initiator (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                    <Smartphone className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-stone-900">Initiate Customer Payment</h3>
                    <p className="text-xs text-stone-500">Select payment channel & enter customer charge</p>
                  </div>
                </div>

                <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-stone-100 text-stone-700">
                  Ready for Input
                </span>
              </div>

              <form onSubmit={handleCheckoutSubmit} className="space-y-4">
                {/* Payment Method Selector */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-2">
                    Select Mobile Payment Channel
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { id: 'MPESA_EXPRESS' as PaymentMethod, label: 'M-PESA STK Push', badge: 'Fastest' },
                      { id: 'MPESA_TILL' as PaymentMethod, label: `Buy Goods (Till ${business.tillNumber})` },
                      { id: 'MPESA_PAYBILL' as PaymentMethod, label: `Paybill (${business.paybillNumber})` },
                      { id: 'QR_PAY' as PaymentMethod, label: 'Dynamic QR Code' },
                      { id: 'AIRTEL_MONEY' as PaymentMethod, label: 'Airtel Money' },
                      { id: 'CARD' as PaymentMethod, label: 'Contactless Card' },
                    ].map(method => (
                      <button
                        key={method.id}
                        type="button"
                        id={`method-btn-${method.id}`}
                        onClick={() => {
                          setPaymentMethod(method.id);
                          sounds.playClick();
                        }}
                        className={`p-2.5 rounded-2xl text-left border text-xs font-medium transition-all relative ${
                          paymentMethod === method.id
                            ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-bold shadow-xs ring-1 ring-emerald-600'
                            : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300 hover:bg-stone-50'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span>{method.label}</span>
                          {method.badge && (
                            <span className="text-[9px] px-1 py-0.2 rounded bg-emerald-600 text-white font-bold">
                              {method.badge}
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Amount Input & Quick Chips */}
                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Payable Amount (KES)
                    </label>
                    <span className="text-[11px] text-stone-500">Zero surcharge</span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                      KES
                    </span>
                    <input
                      type="number"
                      id="payable-amount-input"
                      value={amount}
                      onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0.00"
                      required
                      min="1"
                      className="w-full pl-14 pr-4 py-3 rounded-2xl border border-stone-300 text-stone-900 text-xl font-bold font-mono outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>

                  {/* Quick Chips */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {quickAmounts.map(val => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setAmount(val);
                          sounds.playClick();
                        }}
                        className="px-2.5 py-1 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200 text-stone-700 transition-colors"
                      >
                        +{val}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Details */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Customer Phone Number
                    </label>
                    <input
                      type="tel"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 0723 458 912"
                      required
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Customer Name
                    </label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Wanjiku Mwangi"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Push destination options */}
                {paymentMethod === 'MPESA_EXPRESS' && (
                  <div className="p-3 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2">
                    <span className="font-bold text-stone-800 block">
                      Target Handset for STK Prompt:
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setTargetPhoneMode('CUSTOMER')}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                          targetPhoneMode === 'CUSTOMER'
                            ? 'bg-stone-900 text-white'
                            : 'bg-white text-stone-700 border border-stone-300'
                        }`}
                      >
                        Customer Handset ({phone})
                      </button>
                      <button
                        type="button"
                        onClick={() => setTargetPhoneMode('MY_PHONE')}
                        className={`px-3 py-1.5 rounded-xl font-semibold transition-colors ${
                          targetPhoneMode === 'MY_PHONE'
                            ? 'bg-emerald-600 text-white'
                            : 'bg-white text-stone-700 border border-stone-300'
                        }`}
                      >
                        Push to My Real Phone (Daraja Live)
                      </button>
                    </div>
                  </div>
                )}

                {/* Submit Checkout */}
                <button
                  type="submit"
                  id="cashier-submit-btn"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    {paymentMethod === 'MPESA_EXPRESS' ? 'Trigger M-Pesa STK Prompt' : 'Record Counter Payment'}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Right Column: Live Payment Stream (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-3xl p-5 border border-stone-200 shadow-xs h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <h3 className="text-sm font-bold text-stone-900">Live POS Ledger Stream</h3>
                </div>
                <span className="text-[11px] text-stone-500">Till {business.tillNumber}</span>
              </div>

              <div className="space-y-2.5 flex-1 overflow-y-auto">
                {recentTransactions.map(txn => (
                  <div
                    key={txn.id}
                    className="p-3 rounded-2xl border border-stone-100 bg-stone-50/70 hover:bg-stone-100 transition-colors flex items-center justify-between gap-3 text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className="font-bold text-stone-900">{txn.customerName}</span>
                        <span className="text-[10px] font-mono text-stone-500 bg-stone-200/70 px-1 py-0.2 rounded">
                          {txn.code}
                        </span>
                      </div>
                      <div className="text-[11px] text-stone-500 flex items-center gap-1.5 mt-0.5">
                        <span>{txn.customerPhone}</span>
                        <span>•</span>
                        <span>{new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="font-bold text-sm text-stone-900 block font-mono">
                        KES {txn.amount.toLocaleString()}
                      </span>
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onViewReceipt(txn);
                        }}
                        className="text-[11px] text-emerald-700 font-semibold hover:underline inline-flex items-center gap-1 mt-0.5"
                      >
                        <Receipt className="w-3 h-3" />
                        Receipt
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: ANTI-FRAUD VERIFICATION SCANNER */}
      {activeSubTab === 'verify' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs max-w-3xl mx-auto space-y-6">
          <div className="flex items-center gap-3 pb-4 border-b border-stone-100">
            <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-stone-900">
                Anti-Fraud M-Pesa Receipt Code Verifier
              </h3>
              <p className="text-xs text-stone-500">
                Prevent fake SMS fraud by matching the customer&apos;s claimed transaction code against our cloud database:
              </p>
            </div>
          </div>

          <form onSubmit={handleVerifySubmit} className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                placeholder="Enter 10-character code e.g. SB45HG98LK"
                value={verifyInput}
                onChange={e => setVerifyInput(e.target.value.toUpperCase())}
                className="flex-1 px-4 py-3 rounded-2xl border border-stone-300 font-mono text-sm tracking-wider outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
              />
              <button
                type="submit"
                className="px-6 py-3 rounded-2xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-xs"
              >
                <Search className="w-4 h-4" />
                <span>Verify Code</span>
              </button>
            </div>

            {/* Quick sample chips */}
            <div className="flex items-center gap-2 text-xs text-stone-500 flex-wrap">
              <span>Quick test codes:</span>
              {['SB45HG98LK', 'TK90WM42XZ', 'RD72PQ11XM', 'FAKE99TEST'].map(sampleCode => (
                <button
                  key={sampleCode}
                  type="button"
                  onClick={() => {
                    setVerifyInput(sampleCode);
                    const res = verifyTransactionCode(sampleCode, transactions);
                    setVerifyResult(res);
                    if (res.status === 'VERIFIED') sounds.playPaymentSuccess();
                    else sounds.playWarning();
                  }}
                  className="font-mono px-2.5 py-1 rounded-xl bg-stone-100 hover:bg-stone-200 text-stone-700 font-semibold"
                >
                  {sampleCode}
                </button>
              ))}
            </div>

            {verifyResult && (
              <div
                className={`p-5 rounded-2xl border transition-all ${
                  verifyResult.status === 'VERIFIED'
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                    : 'bg-rose-50 border-rose-300 text-rose-950'
                }`}
              >
                <div className="flex items-start gap-3">
                  {verifyResult.status === 'VERIFIED' ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <AlertTriangle className="w-6 h-6 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-sm font-bold">
                        {verifyResult.status === 'VERIFIED' ? 'AUTHENTIC PAYMENT CONFIRMED' : 'VERIFICATION ALERT'}
                      </strong>
                      <span className="font-mono font-bold px-2 py-0.5 rounded bg-white/80">
                        {verifyInput}
                      </span>
                    </div>
                    <p className="mt-1 text-xs leading-relaxed">{verifyResult.message}</p>

                    {verifyResult.transaction && (
                      <div className="mt-3 pt-3 border-t border-emerald-200/80 flex items-center justify-between">
                        <span>
                          Amount: <strong>KES {verifyResult.transaction.amount.toLocaleString()}</strong> •{' '}
                          Customer: {verifyResult.transaction.customerName}
                        </span>
                        <button
                          type="button"
                          onClick={() => onViewReceipt(verifyResult.transaction!)}
                          className="px-3 py-1 rounded-xl bg-emerald-600 text-white font-bold text-xs hover:bg-emerald-500"
                        >
                          View Thermal Receipt
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </form>
        </div>
      )}

      {/* Sub-view 3: CASHIER SHIFT REGISTER & BALANCE */}
      {activeSubTab === 'drawer' && (
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-stone-100">
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Cashier Shift Register Drawer
                </h3>
                <p className="text-xs text-stone-500">
                  Daily reconciliation of physical cash float and verified mobile ledger receipts for {cashierName} (Till 1).
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                Shift #CSH-042 Active
              </span>
            </div>

            {reconcileFeedback && (
              <div className="p-4 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{reconcileFeedback}</span>
              </div>
            )}

            {/* Reconciliation KPI cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
                <span className="text-[11px] text-stone-500 uppercase font-bold block">Opening Cash Float</span>
                <span className="text-xl font-bold font-mono text-stone-900 mt-1 block">
                  KES {openingFloat.toLocaleString()}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">Physically issued at 08:00 AM</span>
              </div>

              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <span className="text-[11px] text-emerald-800 uppercase font-bold block">Mobile Receipts Total</span>
                <span className="text-xl font-bold font-mono text-emerald-700 mt-1 block">
                  KES {shiftMobileTotal.toLocaleString()}
                </span>
                <span className="text-[10px] text-emerald-600 mt-1 block">{shiftTransactions.length} digital receipts</span>
              </div>

              <div className="p-4 rounded-2xl bg-stone-900 text-white">
                <span className="text-[11px] text-stone-400 uppercase font-bold block">Expected Register Total</span>
                <span className="text-xl font-bold font-mono text-emerald-400 mt-1 block">
                  KES {(openingFloat + shiftMobileTotal).toLocaleString()}
                </span>
                <span className="text-[10px] text-stone-400 mt-1 block">Combined balance to account for</span>
              </div>
            </div>

            {/* End shift action */}
            <div className="p-5 rounded-2xl bg-stone-50 border border-stone-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h4 className="font-bold text-sm text-stone-900">Close Shift & Reconcile Till Drawer</h4>
                <p className="text-xs text-stone-500 mt-0.5">
                  Locks the current shift sales record and certifies cash drawer balance for manager sign-off.
                </p>
              </div>

              <button
                onClick={handleReconcileShift}
                className="px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors shrink-0"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Certify Shift Reconciliation</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 4: TODAY'S SHIFT RECEIPTS */}
      {activeSubTab === 'receipts' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                Today&apos;s Shift Receipts on Till {business.tillNumber}
              </h3>
              <p className="text-xs text-stone-500">
                All customer transactions recorded during this operational session
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-stone-100 text-stone-700">
              {shiftTransactions.length} Completed
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                  <th className="py-3 px-3">Receipt Code</th>
                  <th className="py-3 px-3">Customer</th>
                  <th className="py-3 px-3">Method</th>
                  <th className="py-3 px-3">Amount</th>
                  <th className="py-3 px-3">Time</th>
                  <th className="py-3 px-3 text-right">Receipt</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {shiftTransactions.map(t => (
                  <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-stone-900">{t.code}</td>
                    <td className="py-3 px-3">
                      <div className="font-semibold text-stone-900">{t.customerName}</div>
                      <div className="text-[10px] text-stone-500 font-mono">{t.customerPhone}</div>
                    </td>
                    <td className="py-3 px-3 font-semibold">{t.paymentMethod.replace('MPESA_', '')}</td>
                    <td className="py-3 px-3 font-bold font-mono text-stone-900">
                      KES {t.amount.toLocaleString()}
                    </td>
                    <td className="py-3 px-3 text-stone-500">
                      {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="py-3 px-3 text-right">
                      <button
                        onClick={() => {
                          sounds.playClick();
                          onViewReceipt(t);
                        }}
                        className="px-3 py-1 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800"
                      >
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </div>
  );
};
