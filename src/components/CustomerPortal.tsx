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
  ChevronRight,
  Plus,
  Wallet,
  ArrowUpRight,
  Copy,
  Clock,
  ExternalLink,
  Award,
  Users
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface CustomerPortalProps {
  business: BusinessProfile;
  customers: Customer[];
  transactions: Transaction[];
  activeCustomer: Customer;
  onSelectCustomer: (cust: Customer) => void;
  onAddCustomer?: (newCust: Customer) => void;
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  onTriggerStkPush: (data: { phone: string; amount: number; notes: string; method: 'MPESA_EXPRESS' | 'MPESA_TILL' | 'MPESA_PAYBILL' | 'QR_PAY'; isMyPhone?: boolean }) => void;
  onViewReceipt: (txn: Transaction) => void;
}

export const CustomerPortal: React.FC<CustomerPortalProps> = ({
  business,
  customers,
  transactions,
  activeCustomer,
  onSelectCustomer,
  onAddCustomer,
  activeSubTab = 'wallet',
  setActiveSubTab,
  onTriggerStkPush,
  onViewReceipt,
}) => {
  // Payment Form State
  const [amount, setAmount] = useState<number>(450);
  const [paymentType, setPaymentType] = useState<'TILL' | 'STK' | 'PAYBILL' | 'QR'>('STK');
  const [paybillAcc, setPaybillAcc] = useState('ZAW-WESTLANDS');
  const [billNote, setBillNote] = useState('Supermarket Groceries');
  const [customPhone, setCustomPhone] = useState('');
  const [phoneTarget, setPhoneTarget] = useState<'PROFILE' | 'MY_PHONE'>('PROFILE');
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // New Customer Form State
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('+254 7');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustDeposit, setNewCustDeposit] = useState<number>(5000);
  const [showRegisterSuccess, setShowRegisterSuccess] = useState(false);

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

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    sounds.playClick();
    setTimeout(() => setCopiedCode(null), 1800);
  };

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustName.trim() || !newCustPhone.trim()) return;

    sounds.playPaymentSuccess();
    const initials = newCustName
      .split(' ')
      .map(n => n[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();

    const created: Customer = {
      id: `CUST-${Date.now().toString().slice(-4)}`,
      name: newCustName.trim(),
      phone: newCustPhone.trim(),
      email: newCustEmail.trim() || `${newCustName.toLowerCase().replace(/\s+/g, '.')}@gmail.com`,
      totalSpent: 0,
      transactionCount: 0,
      loyaltyPoints: 50, // welcome bonus
      lastVisit: 'Just registered',
      tier: 'BRONZE',
      walletBalance: newCustDeposit,
      memberSince: 'Today',
      avatarInitials: initials,
    };

    if (onAddCustomer) {
      onAddCustomer(created);
    }
    onSelectCustomer(created);
    setShowRegisterSuccess(true);
    setNewCustName('');
    setNewCustPhone('+254 7');
    setNewCustEmail('');
    setTimeout(() => {
      setShowRegisterSuccess(false);
      if (setActiveSubTab) setActiveSubTab('wallet');
    }, 1500);
  };

  const getTierColor = (tier?: string) => {
    switch (tier) {
      case 'PLATINUM':
        return 'bg-purple-100 text-purple-900 border-purple-300';
      case 'GOLD':
        return 'bg-amber-100 text-amber-900 border-amber-300';
      case 'SILVER':
        return 'bg-slate-100 text-slate-900 border-slate-300';
      default:
        return 'bg-emerald-100 text-emerald-900 border-emerald-300';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* Customer Account Identity Card */}
      <div className="bg-gradient-to-r from-stone-900 via-stone-800 to-stone-950 text-white rounded-3xl p-6 sm:p-7 shadow-lg border border-stone-800 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-sky-500 to-emerald-600 text-white flex items-center justify-center font-bold text-2xl shadow-md border border-white/20">
              {activeCustomer.avatarInitials || activeCustomer.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider text-sky-400">
                  Customer Personal Account
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTierColor(activeCustomer.tier)}`}>
                  {activeCustomer.tier || 'Member'} Tier
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                  M-Pesa Verified
                </span>
              </div>
              <h2 className="text-2xl font-black text-white mt-1 tracking-tight">
                {activeCustomer.name}
              </h2>
              <p className="text-xs text-stone-400 font-mono mt-0.5 flex items-center gap-2">
                <span>{activeCustomer.phone}</span>
                <span>•</span>
                <span>{activeCustomer.email || 'customer@mpesa.ke'}</span>
              </p>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-3 gap-3 bg-stone-800/80 p-3.5 rounded-2xl border border-stone-700/80 text-xs">
            <div className="text-center px-2">
              <span className="text-[10px] text-stone-400 uppercase block font-semibold">Wallet Balance</span>
              <span className="text-sm sm:text-base font-bold text-emerald-400 font-mono">
                KES {(activeCustomer.walletBalance || 18450).toLocaleString()}
              </span>
            </div>
            <div className="text-center px-2 border-x border-stone-700">
              <span className="text-[10px] text-stone-400 uppercase block font-semibold">Loyalty Points</span>
              <span className="text-sm sm:text-base font-bold text-amber-300 font-mono">
                {activeCustomer.loyaltyPoints} pts
              </span>
            </div>
            <div className="text-center px-2">
              <span className="text-[10px] text-stone-400 uppercase block font-semibold">Store Orders</span>
              <span className="text-sm sm:text-base font-bold text-white font-mono">
                {activeCustomer.transactionCount || customerTxns.length}
              </span>
            </div>
          </div>
        </div>

        {/* Switch Account Hint Banner */}
        <div className="mt-5 pt-4 border-t border-stone-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-stone-400">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span>You are currently managing <strong>{activeCustomer.name}&apos;s</strong> isolated customer account.</span>
          </div>
          {setActiveSubTab && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('switch_customer')}
                className="text-sky-400 hover:text-sky-300 font-semibold underline underline-offset-2 flex items-center gap-1"
              >
                <Users className="w-3.5 h-3.5" />
                Switch to another customer account
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Sub-view 1: WALLET & QUICK PAY */}
      {activeSubTab === 'wallet' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left: Payment Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <div className="flex items-center justify-between pb-4 mb-5 border-b border-stone-100">
                <div>
                  <h3 className="text-base font-bold text-stone-900">
                    Pay {business.name}
                  </h3>
                  <p className="text-xs text-stone-500">
                    Initiate payment via STK PIN prompt, Till {business.tillNumber}, or Paybill
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Instant Callback
                </span>
              </div>

              <form onSubmit={handlePayNow} className="space-y-4">
                {/* Method selector */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-2">
                    Payment Method
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {[
                      { id: 'STK' as const, label: 'STK Push', desc: 'Instant PIN Prompt' },
                      { id: 'TILL' as const, label: 'Buy Goods', desc: `Till ${business.tillNumber}` },
                      { id: 'PAYBILL' as const, label: 'Paybill', desc: `${business.paybillNumber}` },
                      { id: 'QR' as const, label: 'Scan QR', desc: 'Dynamic QR' },
                    ].map(mode => (
                      <button
                        key={mode.id}
                        type="button"
                        id={`cust-pay-mode-${mode.id}`}
                        onClick={() => {
                          setPaymentType(mode.id);
                          sounds.playClick();
                        }}
                        className={`p-3 rounded-2xl text-left border text-xs transition-all ${
                          paymentType === mode.id
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                            : 'border-stone-200 hover:border-stone-300 text-stone-700 bg-white'
                        }`}
                      >
                        <div className="font-bold text-stone-900">{mode.label}</div>
                        <div className="text-[10px] text-stone-500 mt-0.5">{mode.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Destination configuration for STK push */}
                {paymentType === 'STK' && (
                  <div className="p-3.5 bg-stone-50 rounded-2xl border border-stone-200 text-xs space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-stone-200">
                      <span className="font-bold text-stone-800 flex items-center gap-1.5">
                        <Smartphone className="w-4 h-4 text-emerald-600" />
                        Prompt Destination Handset:
                      </span>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setPhoneTarget('PROFILE')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                            phoneTarget === 'PROFILE'
                              ? 'bg-stone-900 text-white'
                              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          Customer Handset ({activeCustomer.phone})
                        </button>
                        <button
                          type="button"
                          onClick={() => setPhoneTarget('MY_PHONE')}
                          className={`px-2.5 py-1 rounded-xl text-xs font-semibold transition-colors ${
                            phoneTarget === 'MY_PHONE'
                              ? 'bg-emerald-600 text-white'
                              : 'bg-white text-stone-600 border border-stone-300 hover:bg-stone-100'
                          }`}
                        >
                          Push to My Real Phone
                        </button>
                      </div>
                    </div>

                    {phoneTarget === 'MY_PHONE' && (
                      <div>
                        <label className="text-[11px] font-semibold text-stone-700 block mb-1">
                          Enter your real Safaricom mobile number (format: 07XXXXXXXX or +2547XXXXXXXX):
                        </label>
                        <input
                          type="tel"
                          placeholder="e.g. 0712345678"
                          value={customPhone}
                          onChange={e => setCustomPhone(e.target.value)}
                          className="w-full px-3 py-2 rounded-xl border border-emerald-300 bg-white text-stone-900 text-xs font-mono outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    )}
                  </div>
                )}

                {/* Amount input */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Amount to Pay (KES)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500 font-bold text-sm">
                      KES
                    </span>
                    <input
                      type="number"
                      id="cust-payable-amount"
                      value={amount || ''}
                      onChange={e => setAmount(Number(e.target.value))}
                      className="w-full pl-14 pr-4 py-3 rounded-2xl border border-stone-300 text-stone-900 text-lg font-bold font-mono outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600"
                    />
                  </div>
                  {/* Quick amounts */}
                  <div className="flex items-center gap-1.5 mt-2 flex-wrap">
                    {[150, 350, 850, 1500, 3200, 5000].map(val => (
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

                {/* Bill Note */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Note / Purpose of Payment
                  </label>
                  <input
                    type="text"
                    value={billNote}
                    onChange={e => setBillNote(e.target.value)}
                    placeholder="e.g. Supermarket Groceries"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600"
                  />
                </div>

                {/* Submit Pay */}
                <button
                  type="submit"
                  id="customer-pay-now-btn"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <Send className="w-4 h-4" />
                  <span>
                    Pay KES {amount.toLocaleString()} via{' '}
                    {paymentType === 'STK' ? 'STK Push' : paymentType === 'TILL' ? `Till ${business.tillNumber}` : paymentType === 'PAYBILL' ? 'Paybill' : 'QR'}
                  </span>
                </button>
              </form>
            </div>
          </div>

          {/* Right: Personal Recent Receipts for this Customer (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs h-full flex flex-col">
              <div className="flex items-center justify-between pb-3 border-b border-stone-100 mb-3">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-600" />
                  <h3 className="text-sm font-bold text-stone-900">
                    My Recent Receipts
                  </h3>
                </div>
                <span className="text-[11px] text-stone-500">
                  {customerTxns.length} records
                </span>
              </div>

              {customerTxns.length === 0 ? (
                <div className="text-center py-12 flex-1 flex flex-col items-center justify-center text-stone-400">
                  <Receipt className="w-10 h-10 mb-2 opacity-40" />
                  <p className="text-xs font-medium">No transactions recorded yet for this customer profile.</p>
                  <p className="text-[11px] text-stone-400 mt-1">Make a payment on the left to receive your first digital receipt!</p>
                </div>
              ) : (
                <div className="space-y-2.5 flex-1 overflow-y-auto">
                  {customerTxns.map(txn => (
                    <div
                      key={txn.id}
                      className="p-3 rounded-2xl border border-stone-100 bg-stone-50/70 hover:bg-stone-100 transition-colors flex items-center justify-between gap-3 text-xs"
                    >
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-stone-900">{txn.code}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded-md bg-emerald-100 text-emerald-800 font-semibold">
                            {txn.paymentMethod.replace('MPESA_', '')}
                          </span>
                        </div>
                        <div className="text-[11px] text-stone-500 mt-0.5">
                          {new Date(txn.timestamp).toLocaleDateString()} • {new Date(txn.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
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
                          View Receipt
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="pt-3 mt-3 border-t border-stone-100 text-center">
                <p className="text-[11px] text-stone-400">
                  Transactions sync automatically with the store&apos;s real-time cloud database.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 2: LOYALTY REWARDS & TIER */}
      {activeSubTab === 'loyalty' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Tier Card */}
            <div className="md:col-span-1 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-2.5 py-1 rounded-xl border border-amber-200">
                    Zawadi Rewards Club
                  </span>
                  <Award className="w-6 h-6 text-amber-500" />
                </div>
                <h3 className="text-xl font-black text-stone-900 mt-4">
                  {activeCustomer.tier || 'Member'} Tier
                </h3>
                <p className="text-xs text-stone-500 mt-1">
                  Earn 1 Zawadi Point for every KES 10 spent via M-Pesa.
                </p>

                <div className="mt-6 p-4 rounded-2xl bg-stone-50 border border-stone-200">
                  <div className="flex justify-between items-center text-xs mb-1.5">
                    <span className="text-stone-600 font-medium">Progress to Next Tier</span>
                    <span className="font-bold text-stone-900">{activeCustomer.loyaltyPoints} / 1000 pts</span>
                  </div>
                  <div className="w-full h-2.5 bg-stone-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-amber-500 to-emerald-500 rounded-full transition-all"
                      style={{ width: `${Math.min(100, (activeCustomer.loyaltyPoints / 1000) * 100)}%` }}
                    ></div>
                  </div>
                  <span className="text-[10px] text-stone-400 mt-1 block">
                    Spend KES {Math.max(0, (1000 - activeCustomer.loyaltyPoints) * 10).toLocaleString()} more to reach Platinum Tier.
                  </span>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
                <span>Member Since: {activeCustomer.memberSince || '2024'}</span>
                <span className="font-semibold text-emerald-700">Perks Active</span>
              </div>
            </div>

            {/* Redeemable Vouchers */}
            <div className="md:col-span-2 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs">
              <h3 className="text-base font-bold text-stone-900 mb-1">
                Redeemable Loyalty Vouchers
              </h3>
              <p className="text-xs text-stone-500 mb-4">
                Apply your available points toward in-store grocery discounts
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {[
                  { title: 'KES 100 Discount', cost: 100, desc: 'Valid on grocery bills above KES 500' },
                  { title: 'KES 250 Discount', cost: 250, desc: 'Valid on store bills above KES 1,000' },
                  { title: 'KES 500 Gift Card', cost: 500, desc: 'Valid across all store departments' },
                ].map(v => {
                  const canRedeem = activeCustomer.loyaltyPoints >= v.cost;
                  return (
                    <div
                      key={v.title}
                      className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                        canRedeem
                          ? 'border-emerald-300 bg-emerald-50/50 text-stone-900'
                          : 'border-stone-200 bg-stone-50/50 text-stone-400 opacity-70'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs">{v.title}</span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            canRedeem ? 'bg-emerald-600 text-white' : 'bg-stone-200 text-stone-600'
                          }`}>
                            {v.cost} pts
                          </span>
                        </div>
                        <p className="text-[11px] text-stone-500 mt-2">{v.desc}</p>
                      </div>

                      <button
                        disabled={!canRedeem}
                        onClick={() => {
                          sounds.playPaymentSuccess();
                          alert(`Voucher redeemed! KES ${v.cost} discount applied to your account.`);
                        }}
                        className={`mt-4 w-full py-2 rounded-xl text-xs font-bold transition-colors ${
                          canRedeem
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'bg-stone-200 text-stone-400 cursor-not-allowed'
                        }`}
                      >
                        {canRedeem ? 'Redeem Voucher' : 'Need More Points'}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Sub-view 3: MY DIGITAL RECEIPTS */}
      {activeSubTab === 'receipts' && (
        <div className="bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
            <div>
              <h3 className="text-base font-bold text-stone-900">
                {activeCustomer.name}&apos;s Digital Electronic Receipts
              </h3>
              <p className="text-xs text-stone-500">
                All confirmed mobile receipts linked to {activeCustomer.phone}
              </p>
            </div>
            <span className="text-xs font-bold px-3 py-1 rounded-xl bg-stone-100 text-stone-700">
              {customerTxns.length} Transactions Found
            </span>
          </div>

          {customerTxns.length === 0 ? (
            <div className="text-center py-16 text-stone-400">
              <Receipt className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-stone-700">No Receipts on File</p>
              <p className="text-xs text-stone-400 mt-1">Make your first payment to generate a verifiable digital receipt.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-400 uppercase text-[10px] font-bold">
                    <th className="py-3 px-3">Receipt Code</th>
                    <th className="py-3 px-3">Channel</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Date & Time</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {customerTxns.map(t => (
                    <tr key={t.id} className="hover:bg-stone-50/80 transition-colors">
                      <td className="py-3 px-3 font-mono font-bold text-stone-900">
                        <div className="flex items-center gap-1.5">
                          <span>{t.code}</span>
                          <button
                            onClick={() => handleCopyCode(t.code)}
                            title="Copy code"
                            className="text-stone-400 hover:text-stone-700"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-stone-100 text-stone-700 text-[10px]">
                          {t.paymentMethod.replace('MPESA_', '')}
                        </span>
                      </td>
                      <td className="py-3 px-3 font-bold font-mono text-stone-900">
                        KES {t.amount.toLocaleString()}
                      </td>
                      <td className="py-3 px-3 text-stone-500">
                        {new Date(t.timestamp).toLocaleDateString()} {new Date(t.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                      <td className="py-3 px-3">
                        <span className="px-2 py-0.5 rounded-full font-bold text-[10px] bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {t.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={() => {
                            sounds.playClick();
                            onViewReceipt(t);
                          }}
                          className="px-3 py-1 rounded-xl bg-stone-900 text-white font-semibold text-xs hover:bg-stone-800"
                        >
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Sub-view 4: SWITCH / REGISTER CUSTOMER */}
      {activeSubTab === 'switch_customer' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* List of customer accounts (7 cols) */}
          <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-100">
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Switch Active Customer Account
                </h3>
                <p className="text-xs text-stone-500">
                  Select any existing customer profile to enter their isolated wallet and view their receipts:
                </p>
              </div>
              <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-sky-50 text-sky-800 border border-sky-200">
                {customers.length} Profiles
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {customers.map(cust => {
                const isSelected = activeCustomer.id === cust.id;
                return (
                  <button
                    key={cust.id}
                    onClick={() => {
                      sounds.playClick();
                      onSelectCustomer(cust);
                    }}
                    className={`p-4 rounded-2xl border text-left transition-all ${
                      isSelected
                        ? 'border-sky-500 bg-sky-50/70 shadow-xs ring-2 ring-sky-400/20'
                        : 'border-stone-200 bg-white hover:border-stone-300 hover:bg-stone-50'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-10 h-10 rounded-xl bg-sky-600 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          {cust.avatarInitials || cust.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-stone-900 text-xs">{cust.name}</div>
                          <div className="text-[10px] text-stone-500 font-mono">{cust.phone}</div>
                        </div>
                      </div>
                      {isSelected && (
                        <span className="text-[10px] font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                          ACTIVE
                        </span>
                      )}
                    </div>

                    <div className="mt-3 pt-2 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                      <span>{cust.loyaltyPoints} points</span>
                      <span className="font-semibold text-stone-700">
                        KES {(cust.totalSpent || 0).toLocaleString()} spent
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Register New Customer Account (5 cols) */}
          <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-stone-200 shadow-xs space-y-4">
            <div>
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-emerald-600" />
                <h3 className="text-base font-bold text-stone-900">
                  Register New Customer Account
                </h3>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                Create a distinct customer profile with personalized wallet and loyalty tracking:
              </p>
            </div>

            {showRegisterSuccess && (
              <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Account registered successfully! Switching to new wallet...</span>
              </div>
            )}

            <form onSubmit={handleCreateCustomer} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Full Customer Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Grace Njeri"
                  value={newCustName}
                  onChange={e => setNewCustName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Mobile Number (M-Pesa) *
                </label>
                <input
                  type="tel"
                  required
                  placeholder="+254 7XX XXX XXX"
                  value={newCustPhone}
                  onChange={e => setNewCustPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="grace.n@gmail.com"
                  value={newCustEmail}
                  onChange={e => setNewCustEmail(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-700 block mb-1">
                  Initial Simulated M-Pesa Balance (KES)
                </label>
                <input
                  type="number"
                  value={newCustDeposit}
                  onChange={e => setNewCustDeposit(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-stone-300 text-xs font-mono outline-none focus:border-emerald-600"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 rounded-xl bg-stone-900 hover:bg-stone-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Create & Switch to Account</span>
              </button>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
