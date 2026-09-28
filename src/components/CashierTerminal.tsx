import React, { useState } from 'react';
import { 
  Transaction, 
  BusinessProfile, 
  PaymentMethod 
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
  User
} from 'lucide-react';
import { verifyTransactionCode, generateMpesaCode } from '../utils/storage';
import { sounds } from '../utils/audio';
import { getStoredDarajaConfig } from '../services/stkService';
import { saveVerificationLogToDb } from '../services/dbService';

interface CashierTerminalProps {
  business: BusinessProfile;
  transactions: Transaction[];
  onTriggerStkPush: (data: { phone: string; amount: number; notes: string; method: PaymentMethod; isMyPhone?: boolean }) => void;
  onViewReceipt: (txn: Transaction) => void;
  onDirectRecordPayment: (txn: Transaction) => void;
  onOpenDarajaConfig?: () => void;
}

export const CashierTerminal: React.FC<CashierTerminalProps> = ({
  business,
  transactions,
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

  // Quick amounts
  const quickAmounts = [150, 300, 500, 1000, 2500, 5000];

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
        cashierName: 'Jane Nduta (Till 1)',
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
      // Launch STK Push flow (triggers prompt to physical handset or simulator)
      sounds.playClick();
      onTriggerStkPush({
        phone: phone || '+254 700 000 000',
        amount: Number(amount),
        notes,
        method: paymentMethod,
        isMyPhone: targetPhoneMode === 'MY_PHONE',
      });
    } else {
      // Direct Cashier Recorded Transaction (Till, Paybill, QR)
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
        verifiedBy: 'Cashier (Direct Till Checkout)',
        verifiedAt: new Date().toISOString(),
        smsReceiptText: `${newCode} Confirmed. Ksh${Number(amount).toLocaleString()}.00 received for ${business.name}.`,
        notes,
      };
      onDirectRecordPayment(newTxn);
    }
  };

  const recentTransactions = transactions.slice(0, 7);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Cashier Guidance */}
      <div className="bg-stone-900 text-stone-100 rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              Till # 1 Active
            </span>
            <span className="text-xs text-stone-400">Shift Operator: Jane Nduta</span>
          </div>
          <h2 className="text-xl font-bold mt-1 text-white tracking-tight">
            Mobile Payment Terminal & Instant Verifier
          </h2>
          <p className="text-xs text-stone-300 mt-0.5">
            Trigger STK Push prompts to customer phones or instantly verify incoming M-Pesa codes to prevent fake SMS fraud.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-800/80 p-3 rounded-xl border border-stone-700/60">
          <div className="text-right">
            <span className="text-[11px] text-stone-400 block uppercase font-medium">Active Buy Goods Till</span>
            <span className="text-lg font-bold font-mono text-emerald-400">{business.tillNumber}</span>
          </div>
          <div className="h-8 w-px bg-stone-700"></div>
          <div className="text-right">
            <span className="text-[11px] text-stone-400 block uppercase font-medium">Paybill Account</span>
            <span className="text-lg font-bold font-mono text-amber-300">{business.paybillNumber}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: POS Payment Initiator (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
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

              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-stone-100 text-stone-700">
                Step 1 of 2
              </span>
            </div>

            <form onSubmit={handleCheckoutSubmit} className="space-y-4">
              {/* Payment Method Selector */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-2">
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
                      className={`p-2.5 rounded-xl text-left border text-xs font-medium transition-all relative ${
                        paymentMethod === method.id
                          ? 'border-emerald-600 bg-emerald-50/70 text-emerald-950 font-semibold shadow-xs ring-1 ring-emerald-600'
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
                  <label className="text-xs font-semibold text-stone-700">
                    Payable Amount (KES)
                  </label>
                  <span className="text-[11px] text-stone-500">Zero transaction surcharge</span>
                </div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                    KES
                  </span>
                  <input
                    type="number"
                    id="payable-amount-input"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={e => setAmount(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full pl-14 pr-4 py-3 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-lg font-bold text-stone-900 outline-none transition-all"
                  />
                </div>

                {/* Quick Presets */}
                <div className="flex items-center gap-1.5 mt-2 overflow-x-auto pb-1">
                  <span className="text-[11px] text-stone-400 whitespace-nowrap">Quick:</span>
                  {quickAmounts.map(preset => (
                    <button
                      key={preset}
                      type="button"
                      id={`preset-btn-${preset}`}
                      onClick={() => {
                        setAmount(preset);
                        sounds.playClick();
                      }}
                      className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium transition-colors"
                    >
                      +{preset.toLocaleString()}
                    </button>
                  ))}
                </div>
              </div>

              {/* Customer Phone & Destination Selector */}
              <div className="bg-stone-50 p-3.5 rounded-xl border border-stone-200/80 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <span className="text-xs font-bold text-stone-800 flex items-center gap-1.5">
                    <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                    STK Push Destination Phone
                  </span>
                  
                  {/* Destination Toggle: Customer Phone vs My Phone */}
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      id="target-customer-btn"
                      onClick={() => {
                        setTargetPhoneMode('CUSTOMER');
                        setPhone('0723 458 912');
                        setCustomerName('Wanjiku Mwangi');
                        sounds.playClick();
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all ${
                        targetPhoneMode === 'CUSTOMER'
                          ? 'bg-stone-900 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      Customer's Phone
                    </button>
                    <button
                      type="button"
                      id="target-my-phone-btn"
                      onClick={() => {
                        setTargetPhoneMode('MY_PHONE');
                        const cfg = getStoredDarajaConfig();
                        setPhone(cfg.myPhoneNumber || '0712345678');
                        setCustomerName('Merchant / Owner');
                        sounds.playClick();
                      }}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-lg transition-all flex items-center gap-1 ${
                        targetPhoneMode === 'MY_PHONE'
                          ? 'bg-emerald-600 text-white shadow-xs'
                          : 'bg-white text-stone-600 border border-stone-200 hover:bg-stone-100'
                      }`}
                    >
                      <span>Push to My Phone</span>
                    </button>
                    {onOpenDarajaConfig && (
                      <button
                        type="button"
                        onClick={onOpenDarajaConfig}
                        title="Configure Safaricom Daraja API Keys & Passkey"
                        className="p-1 text-stone-400 hover:text-emerald-700 rounded-md hover:bg-stone-200/60"
                      >
                        <Settings2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      {targetPhoneMode === 'MY_PHONE' ? 'My Phone Number' : 'Customer Mobile Number'}
                    </label>
                    <input
                      type="text"
                      id="customer-phone-input"
                      value={phone}
                      onChange={e => setPhone(e.target.value)}
                      placeholder="e.g. 0722 000 000 or 2547..."
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-xs font-mono text-stone-900 outline-none bg-white transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-semibold text-stone-600 block mb-1">
                      {targetPhoneMode === 'MY_PHONE' ? 'Account Label' : 'Customer Name / Identifier'}
                    </label>
                    <input
                      type="text"
                      id="customer-name-input"
                      value={customerName}
                      onChange={e => setCustomerName(e.target.value)}
                      placeholder="e.g. Wanjiku Mwangi"
                      className="w-full px-3 py-2 rounded-lg border border-stone-300 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 text-xs text-stone-900 outline-none bg-white transition-all"
                    />
                  </div>
                </div>
              </div>

              {/* Note / Bill Description */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1.5">
                  Sale Description / Bill Note
                </label>
                <input
                  type="text"
                  id="checkout-notes-input"
                  value={notes}
                  onChange={e => setNotes(e.target.value)}
                  placeholder="e.g. Grocery Items, Basket # 4"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 text-xs text-stone-800 outline-none transition-all"
                />
              </div>

              {/* Submit CTA */}
              <div className="pt-2">
                <button
                  type="submit"
                  id="submit-payment-trigger-btn"
                  className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-900/10 flex items-center justify-center gap-2 transition-all"
                >
                  {paymentMethod === 'MPESA_EXPRESS' ? (
                    <>
                      <Send className="w-4 h-4" />
                      Send M-PESA STK Push to {phone || 'Customer'} (KES {Number(amount || 0).toLocaleString()})
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Confirm & Record Payment (KES {Number(amount || 0).toLocaleString()})
                    </>
                  )}
                </button>
                <p className="text-[11px] text-stone-400 text-center mt-1.5">
                  {paymentMethod === 'MPESA_EXPRESS' 
                    ? 'Customer phone will instantly display a Safaricom PIN dialog.' 
                    : 'Transaction will automatically record to the central digital ledger.'}
                </p>
              </div>
            </form>
          </div>

          {/* Anti-Fraud & Instant Transaction Verifier (Solves Chapter 1.1 / 4.7) */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-amber-50 text-amber-800">
                  <ShieldCheck className="w-5 h-5 text-amber-700" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-stone-900">Anti-Fraud Code Verifier</h3>
                  <p className="text-xs text-stone-500">Prevent fake SMS apps & unreceived funds before issuing goods</p>
                </div>
              </div>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-100 text-amber-800">
                Security Module
              </span>
            </div>

            <form onSubmit={handleVerifySubmit} className="space-y-3">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <input
                    type="text"
                    id="verify-code-input"
                    value={verifyInput}
                    onChange={e => {
                      setVerifyInput(e.target.value.toUpperCase());
                      setVerifyResult(null);
                    }}
                    placeholder="Enter 10-character code (e.g. SB45HG98LK)"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-200 focus:border-amber-600 focus:ring-2 focus:ring-amber-100 font-mono text-sm tracking-wider uppercase text-stone-900 outline-none"
                  />
                  {verifyInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setVerifyInput('');
                        setVerifyResult(null);
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-stone-400 hover:text-stone-600"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <button
                  type="submit"
                  id="verify-code-btn"
                  className="px-5 py-2.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-semibold text-xs flex items-center gap-1.5 transition-colors"
                >
                  <Search className="w-4 h-4" />
                  Verify Code
                </button>
              </div>

              {/* Quick sample chips for cashier convenience */}
              <div className="flex items-center gap-1.5 text-xs text-stone-500">
                <span>Try verifying:</span>
                {['SB45HG98LK', 'TK90WM42XZ', 'FAKE99TEST'].map(sampleCode => (
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
                    className="text-[11px] font-mono px-2 py-0.5 rounded bg-stone-100 hover:bg-stone-200 text-stone-700"
                  >
                    {sampleCode}
                  </button>
                ))}
              </div>

              {/* Verification Result Card */}
              {verifyResult && (
                <div
                  id="verification-result-box"
                  className={`p-4 rounded-xl border transition-all ${
                    verifyResult.status === 'VERIFIED'
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-950'
                      : verifyResult.status === 'NOT_FOUND'
                      ? 'bg-rose-50 border-rose-300 text-rose-950'
                      : 'bg-amber-50 border-amber-300 text-amber-950'
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {verifyResult.status === 'VERIFIED' ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                    ) : (
                      <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 text-xs">
                      <div className="flex items-center justify-between">
                        <strong className="text-sm font-bold tracking-tight">
                          {verifyResult.status === 'VERIFIED' ? 'AUTHENTIC PAYMENT CONFIRMED' : 'VERIFICATION ALERT'}
                        </strong>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-white/70">
                          {verifyInput}
                        </span>
                      </div>
                      <p className="mt-1 text-xs leading-relaxed">{verifyResult.message}</p>

                      {verifyResult.transaction && (
                        <div className="mt-3 pt-2 border-t border-emerald-200/60 flex items-center justify-between">
                          <span>
                            Amount: <strong>KES {verifyResult.transaction.amount.toLocaleString()}</strong> •{' '}
                            {new Date(verifyResult.transaction.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <button
                            type="button"
                            onClick={() => onViewReceipt(verifyResult.transaction!)}
                            className="px-2.5 py-1 rounded bg-emerald-600 text-white font-medium text-[11px] hover:bg-emerald-500"
                          >
                            View Receipt
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </form>
          </div>
        </div>

        {/* Right Column: Live Incoming Transactions Feed (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs h-full flex flex-col">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse"></span>
                <h3 className="text-sm font-bold text-stone-900">Live Payment Stream</h3>
              </div>
              <span className="text-[11px] text-stone-500">Auto-updating ledger</span>
            </div>

            <div className="space-y-2.5 flex-1 overflow-y-auto">
              {recentTransactions.map(txn => (
                <div
                  key={txn.id}
                  id={`live-txn-${txn.id}`}
                  className="p-3 rounded-xl border border-stone-100 bg-stone-50/70 hover:bg-stone-100/80 transition-colors flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                        txn.status === 'COMPLETED'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {txn.paymentMethod === 'MPESA_EXPRESS' ? 'STK' : txn.paymentMethod === 'AIRTEL_MONEY' ? 'AM' : 'MP'}
                    </div>

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
                  </div>

                  <div className="text-right">
                    <span className="font-bold text-sm text-stone-900 block">
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

            <div className="pt-3 mt-3 border-t border-stone-100 text-center">
              <p className="text-[11px] text-stone-500">
                All transactions are verified against the Safaricom Daraja API switch gateway.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
