import React, { useState } from 'react';
import { BusinessProfile, Customer, Transaction } from '../types';
import { 
  Smartphone, 
  QrCode, 
  Send, 
  CheckCircle2, 
  CreditCard, 
  MessageSquare, 
  Gift, 
  Sparkles,
  Receipt,
  User,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface CustomerPortalProps {
  business: BusinessProfile;
  customers: Customer[];
  transactions: Transaction[];
  onTriggerStkPush: (data: { phone: string; amount: number; notes: string; method: 'MPESA_EXPRESS' | 'MPESA_TILL' | 'MPESA_PAYBILL' | 'QR_PAY'; isMyPhone?: boolean }) => void;
  onViewReceipt: (txn: Transaction) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  business,
  customers,
  transactions,
  onTriggerStkPush,
  onViewReceipt,
}) => {
  // Selected Simulated Customer
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>(customers[0]?.id || 'CUST-01');
  const activeCustomer = customers.find(c => c.id === selectedCustomerId) || customers[0];

  // Payment Form
  const [amount, setAmount] = useState<number>(450);
  const [paymentType, setPaymentType] = useState<'TILL' | 'STK' | 'PAYBILL' | 'QR'>('STK');
  const [paybillAcc, setPaybillAcc] = useState('ZAW-WESTLANDS');
  const [billNote, setBillNote] = useState('Supermarket Groceries');
  const [customPhone, setCustomPhone] = useState('');
  const [phoneTarget, setPhoneTarget] = useState<'PROFILE' | 'MY_PHONE'>('PROFILE');

  // Customer's transactions
  const customerTxns = transactions.filter(
    t => t.customerPhone.replace(/\s+/g, '') === activeCustomer.phone.replace(/\s+/g, '')
  );

  const effectivePhone = phoneTarget === 'MY_PHONE' && customPhone ? customPhone : activeCustomer.phone;

  const handlePayNow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;

    sounds.playClick();
    onTriggerStkPush({
      phone: effectivePhone,
      amount,
      notes: billNote,
      method: paymentType === 'STK' ? 'MPESA_EXPRESS' : paymentType === 'TILL' ? 'MPESA_TILL' : paymentType === 'PAYBILL' ? 'MPESA_PAYBILL' : 'QR_PAY',
      isMyPhone: phoneTarget === 'MY_PHONE',
    });
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Customer Simulation Control */}
      <div className="bg-emerald-900 text-white rounded-2xl p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-700/80 text-emerald-200">
              Customer Experience Simulator
            </span>
            <span className="text-xs text-emerald-300">
              Testing Perceived Ease of Use & Speed (TAM Model)
            </span>
          </div>
          <h2 className="text-xl font-bold mt-1 tracking-tight">
            Mobile Wallet & In-Store Pay Experience
          </h2>
          <p className="text-xs text-emerald-200 mt-0.5">
            Experience how customers pay via M-Pesa STK Prompt, Till number, or QR scan, and receive instant digital receipts.
          </p>
        </div>

        {/* Switch active customer profile */}
        <div className="flex items-center gap-2 bg-emerald-950/60 p-2.5 rounded-xl border border-emerald-800">
          <User className="w-4 h-4 text-emerald-400" />
          <div className="text-xs">
            <label className="text-[10px] text-emerald-300 uppercase block font-medium">Testing as:</label>
            <select
              id="customer-profile-select"
              value={selectedCustomerId}
              onChange={e => setSelectedCustomerId(e.target.value)}
              className="bg-transparent text-white font-bold outline-none cursor-pointer"
            >
              {customers.map(c => (
                <option key={c.id} value={c.id} className="text-stone-900">
                  {c.name} ({c.phone})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Pay Form & Mobile UI (7 cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Customer Loyalty & Balance Card */}
          <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-900 text-white p-6 rounded-2xl shadow-md border border-stone-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-48 h-48 bg-emerald-500/10 rounded-full blur-2xl"></div>
            
            <div className="flex justify-between items-start relative z-10">
              <div>
                <span className="text-[11px] text-emerald-400 font-mono uppercase tracking-wider">
                  M-PESA WALLET LINKED
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activeCustomer.name}</h3>
                <p className="text-xs text-stone-400 font-mono">{activeCustomer.phone}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-bold">
                  <Gift className="w-3.5 h-3.5" />
                  {activeCustomer.loyaltyPoints} Zawadi Points
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-5 pt-4 border-t border-stone-800/80 text-xs relative z-10">
              <div>
                <span className="text-stone-400 block text-[11px]">Total Spent at Merchant:</span>
                <span className="text-base font-bold font-mono text-white">
                  KES {activeCustomer.totalSpent.toLocaleString()}
                </span>
              </div>
              <div>
                <span className="text-stone-400 block text-[11px]">Visits / Orders:</span>
                <span className="text-base font-bold text-white">
                  {activeCustomer.transactionCount} transactions
                </span>
              </div>
            </div>
          </div>

          {/* Pay Merchant Box */}
          <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
            <h3 className="text-base font-bold text-stone-900 mb-1">
              Pay {business.name}
            </h3>
            <p className="text-xs text-stone-500 mb-4">
              Select your preferred mobile payment method
            </p>

            <form onSubmit={handlePayNow} className="space-y-4">
              {/* Payment Mode Selector */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {[
                  { id: 'STK' as const, label: 'STK Push', desc: 'Instant PIN Prompt' },
                  { id: 'TILL' as const, label: 'Buy Goods', desc: `Till ${business.tillNumber}` },
                  { id: 'PAYBILL' as const, label: 'Paybill', desc: `${business.paybillNumber}` },
                  { id: 'QR' as const, label: 'Scan QR', desc: 'Scan & Pay' },
                ].map(mode => (
                  <button
                    key={mode.id}
                    type="button"
                    id={`cust-pay-mode-${mode.id}`}
                    onClick={() => {
                      setPaymentType(mode.id);
                      sounds.playClick();
                    }}
                    className={`p-3 rounded-xl text-left border text-xs transition-all ${
                      paymentType === mode.id
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-semibold ring-1 ring-emerald-600'
                        : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                    }`}
                  >
                    <div className="font-bold text-stone-900">{mode.label}</div>
                    <div className="text-[10px] text-stone-500 mt-0.5">{mode.desc}</div>
                  </button>
                ))}
              </div>

              {/* Dynamic instruction based on mode */}
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-2">
                {paymentType === 'STK' && (
                  <div>
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2 pb-2 border-b border-stone-200">
                      <span className="font-semibold text-stone-800 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-emerald-600" />
                        Prompt Destination:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhoneTarget('PROFILE')}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            phoneTarget === 'PROFILE'
                              ? 'bg-stone-900 text-white'
                              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          Customer Profile ({activeCustomer.phone})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhoneTarget('MY_PHONE')}
                          className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                            phoneTarget === 'MY_PHONE'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          Push to My Real Phone
                        </button>
                      </div>
                    </div>

                    {phoneTarget === 'MY_PHONE' ? (
                      <div className="space-y-1">
                        <label className="text-[11px] text-stone-600 font-semibold block">
                          Enter your real Safaricom mobile number to receive the prompt:
                        </label>
                        <input
                          type="text"
                          value={customPhone}
                          onChange={e => setCustomPhone(e.target.value)}
                          placeholder="e.g. 0712345678 or 2547XXXXXXXX"
                          className="w-full px-3 py-1.5 rounded-lg border border-stone-300 font-mono text-xs bg-white focus:outline-emerald-600"
                        />
                      </div>
                    ) : (
                      <p className="text-stone-700">
                        Entering amount below will trigger a secure Safaricom prompt on <strong className="font-mono text-emerald-800">{activeCustomer.phone}</strong>.
                      </p>
                    )}
                  </div>
                )}
                {paymentType === 'TILL' && (
                  <p className="text-stone-700">
                    Go to M-Pesa &gt; Lipa na M-PESA &gt; Buy Goods and Services &gt; Enter Till Number <strong className="font-mono text-emerald-700">{business.tillNumber}</strong>.
                  </p>
                )}
                {paymentType === 'PAYBILL' && (
                  <div className="space-y-1">
                    <p className="text-stone-700">
                      Business Number: <strong className="font-mono text-amber-700">{business.paybillNumber}</strong> • Account: <strong className="font-mono">{paybillAcc}</strong>
                    </p>
                  </div>
                )}
                {paymentType === 'QR' && (
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white p-1 rounded border border-stone-300 flex items-center justify-center">
                      <QrCode className="w-10 h-10 text-stone-800" />
                    </div>
                    <p className="text-stone-700">
                      Merchant QR Code active. Point your camera or click below to simulate instant scan & pay.
                    </p>
                  </div>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="text-xs font-semibold text-stone-700 block mb-1">
                  Amount to Pay (KES)
                </label>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400 font-bold text-sm">
                    KES
                  </span>
                  <input
                    type="number"
                    id="customer-amount-input"
                    value={amount}
                    min="1"
                    onChange={e => setAmount(Number(e.target.value))}
                    className="w-full pl-14 pr-4 py-2.5 rounded-xl border border-stone-200 text-lg font-bold font-mono text-stone-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[100, 250, 500, 1200, 3500].map(val => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setAmount(val)}
                      className="px-2.5 py-1 text-xs rounded-lg border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
                    >
                      +{val}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                id="customer-pay-now-btn"
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Send className="w-4 h-4" />
                Pay KES {amount.toLocaleString()} via M-PESA
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Customer's Simulated Phone SMS Inbox & Receipt History (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Simulated SMS Notifications */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-stone-900">
                  {activeCustomer.name}&apos;s M-Pesa SMS Inbox
                </h3>
              </div>
              <span className="text-[11px] text-stone-500 font-mono">MPESA</span>
            </div>

            <div className="space-y-3">
              {customerTxns.length === 0 ? (
                <p className="text-xs text-stone-400 py-6 text-center">
                  No payment messages yet. Use the payment form to simulate your first transaction!
                </p>
              ) : (
                customerTxns.slice(0, 4).map(txn => (
                  <div
                    key={txn.id}
                    className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-1.5"
                  >
                    <div className="flex items-center justify-between text-[10px] text-stone-500">
                      <span className="font-bold text-emerald-700">MPESA (Sender)</span>
                      <span>{new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                    <p className="font-mono text-stone-800 text-[11px] leading-relaxed">
                      {txn.smsReceiptText}
                    </p>
                    <div className="flex justify-between items-center pt-1 text-[10px]">
                      <span className="font-bold text-stone-600 font-mono">Ref: {txn.code}</span>
                      <button
                        type="button"
                        onClick={() => {
                          sounds.playClick();
                          onViewReceipt(txn);
                        }}
                        className="text-emerald-700 font-bold hover:underline flex items-center gap-1"
                      >
                        <Receipt className="w-3 h-3" />
                        Digital Receipt
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Customer Past Receipts */}
          <div className="bg-white rounded-2xl p-5 border border-stone-200 shadow-xs">
            <h3 className="text-sm font-bold text-stone-900 mb-2">My Electronic Receipts</h3>
            <p className="text-xs text-stone-500 mb-3">
              Stored verified digital proofs of purchase
            </p>

            <div className="space-y-2">
              {customerTxns.map(t => (
                <div
                  key={t.id}
                  onClick={() => onViewReceipt(t)}
                  className="p-3 rounded-xl border border-stone-100 bg-stone-50/60 hover:bg-stone-100 flex items-center justify-between cursor-pointer transition-colors"
                >
                  <div className="text-xs">
                    <span className="font-mono font-bold text-stone-900 block">{t.code}</span>
                    <span className="text-[11px] text-stone-500">{new Date(t.timestamp).toLocaleDateString()}</span>
                  </div>
                  <div className="text-right text-xs">
                    <span className="font-bold font-mono text-emerald-700 block">
                      KES {t.amount.toLocaleString()}
                    </span>
                    <span className="text-[10px] text-stone-500">Tap to view</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
