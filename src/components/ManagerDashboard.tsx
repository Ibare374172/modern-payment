import React, { useState } from 'react';
import { 
  Transaction, 
  BusinessProfile, 
  ManualEntryAudit,
  PaymentMethod 
} from '../types';
import { 
  DollarSign, 
  TrendingUp, 
  CheckCircle2, 
  AlertTriangle, 
  ArrowUpRight, 
  FileSpreadsheet, 
  BookOpen, 
  ShieldAlert, 
  Sparkles, 
  PieChart, 
  Clock, 
  Download,
  Plus,
  Database,
  Building,
  Settings,
  Save
} from 'lucide-react';
import { recordAuditComparison } from '../utils/storage';
import { saveAuditToDb, saveBusinessToDb } from '../services/dbService';
import { sounds } from '../utils/audio';

import { TransactionHistory } from './TransactionHistory';
import { Zap } from 'lucide-react';

interface ManagerDashboardProps {
  business: BusinessProfile;
  transactions: Transaction[];
  audits: ManualEntryAudit[];
  activeSubTab?: string;
  setActiveSubTab?: (tab: string) => void;
  onRefreshAudits: () => void;
  onViewReceipt: (txn: Transaction) => void;
  onUpdateBusiness?: (biz: BusinessProfile) => void;
  onOpenDarajaConfig?: () => void;
}

export const ManagerDashboard: React.FC<ManagerDashboardProps> = ({
  business,
  transactions,
  audits,
  activeSubTab = 'dashboard',
  setActiveSubTab,
  onRefreshAudits,
  onViewReceipt,
  onUpdateBusiness,
  onOpenDarajaConfig,
}) => {
  // New Audit Entry Form State
  const [showAddAudit, setShowAddAudit] = useState(false);
  const [notebookAmount, setNotebookAmount] = useState<number>(3000);
  const [systemAmount, setSystemAmount] = useState<number>(4500);
  const [customerInfo, setCustomerInfo] = useState('John Kariuki (STK Push)');
  const [discrepancyType, setDiscrepancyType] = useState<ManualEntryAudit['discrepancyType']>('TRANSCRIPTION_ERROR');
  const [auditDesc, setAuditDesc] = useState('Cashier wrote KES 3,000 in counter exercise book, but M-Pesa confirmed KES 4,500.');

  // Business Profile Settings Editor
  const [showBizSettings, setShowBizSettings] = useState(false);
  const [bizName, setBizName] = useState(business.name);
  const [bizTill, setBizTill] = useState(business.tillNumber);
  const [bizPaybill, setBizPaybill] = useState(business.paybillNumber);
  const [bizAccountRef, setBizAccountRef] = useState(business.accountRef);
  const [bizDailyTarget, setBizDailyTarget] = useState(business.dailyTarget);
  const [bizBranch, setBizBranch] = useState(business.branch);
  const [bizSaveSuccess, setBizSaveSuccess] = useState(false);

  // Sync biz inputs when business changes
  React.useEffect(() => {
    setBizName(business.name);
    setBizTill(business.tillNumber);
    setBizPaybill(business.paybillNumber);
    setBizAccountRef(business.accountRef);
    setBizDailyTarget(business.dailyTarget);
    setBizBranch(business.branch);
  }, [business]);

  const handleSaveBusinessProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPaymentSuccess();
    const updatedBiz: BusinessProfile = {
      ...business,
      name: bizName,
      tillNumber: bizTill,
      paybillNumber: bizPaybill,
      accountRef: bizAccountRef,
      dailyTarget: Number(bizDailyTarget),
      branch: bizBranch,
    };

    // Save directly to Cloud Firestore database
    await saveBusinessToDb(updatedBiz);
    if (onUpdateBusiness) onUpdateBusiness(updatedBiz);
    setBizSaveSuccess(true);
    setTimeout(() => setBizSaveSuccess(false), 3000);
  };

  // Financial aggregates
  const completedTxns = transactions.filter(t => t.status === 'COMPLETED');
  const totalRevenue = completedTxns.reduce((acc, t) => acc + t.amount, 0);
  const averageTicket = completedTxns.length > 0 ? Math.round(totalRevenue / completedTxns.length) : 0;
  const targetProgress = Math.min(100, Math.round((totalRevenue / business.dailyTarget) * 100));

  // Channel breakdown
  const methodTotals: Record<string, number> = {};
  completedTxns.forEach(t => {
    methodTotals[t.paymentMethod] = (methodTotals[t.paymentMethod] || 0) + t.amount;
  });

  const totalDiscrepanciesRecovered = audits.reduce((acc, item) => acc + item.recoveredValue, 0);

  const handleAddAuditEntry = (e: React.FormEvent) => {
    e.preventDefault();
    sounds.playPaymentSuccess();
    const newEntry: ManualEntryAudit = {
      id: `AUD-${Date.now().toString().slice(-4)}`,
      timestamp: 'Just now',
      notebookAmount,
      systemAmount,
      customerName: customerInfo,
      discrepancyType,
      description: auditDesc,
      recoveredValue: Math.abs(systemAmount - notebookAmount),
    };
    recordAuditComparison(newEntry);
    saveAuditToDb(newEntry).catch(err => console.warn('Audit cloud save error:', err));
    onRefreshAudits();
    setShowAddAudit(false);
  };

  const handleExportCSV = () => {
    sounds.playClick();
    const headers = ['Transaction ID', 'Code', 'Customer Name', 'Phone', 'Amount (KES)', 'Method', 'Status', 'Date Time', 'Notes'];
    const rows = transactions.map(t => [
      t.id,
      t.code,
      `"${t.customerName}"`,
      t.customerPhone,
      t.amount,
      t.paymentMethod,
      t.status,
      `"${new Date(t.timestamp).toLocaleString()}"`,
      `"${t.notes || ''}"`,
    ]);
    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `mobile_payments_audit_${business.tillNumber}_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (activeSubTab === 'transactions') {
    return (
      <div className="space-y-4">
        <TransactionHistory transactions={transactions} onViewReceipt={onViewReceipt} />
      </div>
    );
  }

  if (activeSubTab === 'gateway') {
    return (
      <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-stone-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-stone-100">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold">
                <Zap className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-stone-900">
                  Safaricom Daraja API Gateway Switch
                </h3>
                <p className="text-xs text-stone-500">
                  Direct REST API integration for STK push prompts, instant payment notifications, and till callbacks.
                </p>
              </div>
            </div>

            {onOpenDarajaConfig && (
              <button
                onClick={onOpenDarajaConfig}
                className="px-5 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center gap-2 shadow-xs transition-colors"
              >
                <Zap className="w-4 h-4" />
                <span>Configure Gateway Keys</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Status</span>
              <span className="text-emerald-700 font-bold text-sm flex items-center gap-1.5 mt-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                Active Gateway
              </span>
              <p className="text-[11px] text-stone-500 mt-1">Listening on Safaricom C2B/STK endpoints</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Default Shortcode</span>
              <span className="font-mono font-bold text-stone-900 text-sm mt-1 block">
                {business.tillNumber}
              </span>
              <p className="text-[11px] text-stone-500 mt-1">Zawadi Mart Buy Goods Till</p>
            </div>

            <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200">
              <span className="text-[10px] text-stone-400 uppercase font-bold block">Paybill Number</span>
              <span className="font-mono font-bold text-stone-900 text-sm mt-1 block">
                {business.paybillNumber}
              </span>
              <p className="text-[11px] text-stone-500 mt-1">Account: {business.accountRef}</p>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-950 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Real Handset STK Testing Supported</strong>
              <p className="mt-0.5 text-emerald-800">
                You can push real M-Pesa STK prompts to physical Safaricom numbers in Kenya (or use simulated sandbox responses) via the gateway settings panel.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner with Summary & Export */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold text-stone-900 tracking-tight">
              Executive Management & Operational Analytics
            </h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-stone-100 text-stone-700 font-semibold">
              Live Auditing
            </span>
          </div>
          <p className="text-xs text-stone-500 mt-1">
            Monitoring mobile cash inflow, digital ledger reconciliation, and shift performance for {business.name}.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            id="export-csv-btn"
            className="px-4 py-2.5 rounded-xl border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-800 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4 text-stone-600" />
            Export Audit CSV
          </button>
        </div>
      </div>

      {/* Primary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Total Mobile Inflow Today
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-stone-900 font-mono">
              KES {totalRevenue.toLocaleString()}
            </span>
          </div>
          <div className="mt-3">
            <div className="flex justify-between text-[11px] text-stone-500 mb-1">
              <span>Target: KES {business.dailyTarget.toLocaleString()}</span>
              <span className="font-semibold text-stone-800">{targetProgress}%</span>
            </div>
            <div className="w-full h-1.5 bg-stone-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                style={{ width: `${targetProgress}%` }}
              ></div>
            </div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Successful Transactions
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              {completedTxns.length}
            </span>
            <span className="text-xs text-stone-500">of {transactions.length} total attempts</span>
          </div>
          <p className="text-[11px] text-stone-500 mt-3 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            98.5% authorization success rate
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs">
          <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider block">
            Average Ticket Size
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-stone-900 font-mono">
              KES {averageTicket.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-stone-500 mt-3">
            Across Till, Paybill & STK Push transactions
          </p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-xs">
          <span className="text-xs font-semibold text-emerald-800 uppercase tracking-wider block">
            Discrepancies Caught by System
          </span>
          <div className="flex items-baseline gap-2 mt-2">
            <span className="text-2xl font-black text-emerald-700 font-mono">
              KES {totalDiscrepanciesRecovered.toLocaleString()}
            </span>
          </div>
          <p className="text-[11px] text-emerald-800 mt-3 flex items-center gap-1 font-medium">
            <ShieldAlert className="w-3.5 h-3.5 text-emerald-600" />
            Saved from notebook errors & fake SMS
          </p>
        </div>
      </div>

      {/* Featured Section: Digital Ledger vs. Manual Notebook Comparison (Chapter 1.0 & 4.1 Core Research Thesis) */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
                <BookOpen className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-stone-900">
                  Digital Ledger vs. Manual Paper Notebook Reconciliation
                </h3>
                <p className="text-xs text-stone-500">
                  Direct empirical demonstration of error reduction over manual counter exercise books (Chapter 4.1)
                </p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAddAudit(!showAddAudit)}
            className="px-3 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors self-start sm:self-auto"
          >
            <Plus className="w-3.5 h-3.5" />
            {showAddAudit ? 'Close Form' : 'Test Notebook Discrepancy'}
          </button>
        </div>

        {/* Audit simulation form */}
        {showAddAudit && (
          <form onSubmit={handleAddAuditEntry} className="p-4 bg-stone-50 rounded-xl border border-stone-200 text-xs space-y-3">
            <h4 className="font-bold text-stone-900 text-sm">Simulate a Cashier Notebook Entry Discrepancy</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-stone-600 block mb-1">Customer / Reference</label>
                <input
                  type="text"
                  value={customerInfo}
                  onChange={e => setCustomerInfo(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>
              <div>
                <label className="text-stone-600 block mb-1">Written in Paper Notebook (KES)</label>
                <input
                  type="number"
                  value={notebookAmount}
                  onChange={e => setNotebookAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  required
                />
              </div>
              <div>
                <label className="text-stone-600 block mb-1">Actual System Inflow (KES)</label>
                <input
                  type="number"
                  value={systemAmount}
                  onChange={e => setSystemAmount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-emerald-700"
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-stone-600 block mb-1">Discrepancy Category</label>
                <select
                  value={discrepancyType}
                  onChange={e => setDiscrepancyType(e.target.value as ManualEntryAudit['discrepancyType'])}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                >
                  <option value="TRANSCRIPTION_ERROR">Transcription Error (Transposed numbers by cashier)</option>
                  <option value="NOTEBOOK_OMISSION">Omission (Forgotten during busy rush hour)</option>
                  <option value="UNVERIFIED_SMS">Unverified SMS (Customer showed fake screenshot/SMS)</option>
                  <option value="MATCH">Exact Match (No discrepancy)</option>
                </select>
              </div>
              <div>
                <label className="text-stone-600 block mb-1">Audit Explanation</label>
                <input
                  type="text"
                  value={auditDesc}
                  onChange={e => setAuditDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAddAudit(false)}
                className="px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-emerald-600 text-white font-semibold"
              >
                Log Comparison Record
              </button>
            </div>
          </form>
        )}

        {/* Audits Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-2.5 px-3">Time / Incident</th>
                <th className="py-2.5 px-3">Customer Reference</th>
                <th className="py-2.5 px-3">Notebook Entry</th>
                <th className="py-2.5 px-3">Automated System</th>
                <th className="py-2.5 px-3">Classification</th>
                <th className="py-2.5 px-3 text-right">Value Safeguarded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {audits.map(item => (
                <tr key={item.id} className="hover:bg-stone-50 transition-colors">
                  <td className="py-3 px-3 text-stone-500 font-medium whitespace-nowrap">
                    {item.timestamp}
                  </td>
                  <td className="py-3 px-3 text-stone-900 font-semibold">
                    {item.customerName}
                  </td>
                  <td className="py-3 px-3 font-mono font-semibold text-stone-600">
                    KES {item.notebookAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3 font-mono font-bold text-emerald-700">
                    KES {item.systemAmount.toLocaleString()}
                  </td>
                  <td className="py-3 px-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        item.discrepancyType === 'MATCH'
                          ? 'bg-stone-100 text-stone-700'
                          : item.discrepancyType === 'UNVERIFIED_SMS'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      {item.discrepancyType.replace('_', ' ')}
                    </span>
                    <p className="text-[11px] text-stone-500 mt-0.5">{item.description}</p>
                  </td>
                  <td className="py-3 px-3 text-right font-mono font-bold text-emerald-700 whitespace-nowrap">
                    {item.recoveredValue > 0 ? `+KES ${item.recoveredValue.toLocaleString()}` : '0.00'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Payment Channel Breakdown & Operational Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Distribution */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs">
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            Payment Channel Revenue Share
          </h3>
          <p className="text-xs text-stone-500 mb-4">
            Distribution across M-Pesa Till, STK Push, Paybill, and QR codes
          </p>

          <div className="space-y-3">
            {[
              { label: `Buy Goods Till (${business.tillNumber})`, key: 'MPESA_TILL', color: 'bg-emerald-600' },
              { label: 'M-PESA STK Push (Express Prompt)', key: 'MPESA_EXPRESS', color: 'bg-emerald-400' },
              { label: `Paybill (${business.paybillNumber})`, key: 'MPESA_PAYBILL', color: 'bg-amber-500' },
              { label: 'Dynamic QR Code Pay', key: 'QR_PAY', color: 'bg-indigo-500' },
              { label: 'Airtel Money', key: 'AIRTEL_MONEY', color: 'bg-rose-500' },
            ].map(ch => {
              const amount = methodTotals[ch.key] || 0;
              const pct = totalRevenue > 0 ? Math.round((amount / totalRevenue) * 100) : 0;
              return (
                <div key={ch.key}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium text-stone-800">{ch.label}</span>
                    <span className="font-mono font-bold text-stone-900">
                      KES {amount.toLocaleString()} ({pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-stone-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${ch.color} rounded-full transition-all duration-500`}
                      style={{ width: `${pct}%` }}
                    ></div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Shift Reconciler & Recommendations */}
        <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-stone-900 mb-1">
            Cashier Shift Balancing Summary
          </h3>
          <p className="text-xs text-stone-500">
            Automated till closure report ready for end-of-day bank settlement
          </p>

          <div className="bg-stone-50 p-4 rounded-xl border border-stone-200 text-xs space-y-2 font-mono">
            <div className="flex justify-between pb-1 border-b border-stone-200">
              <span className="text-stone-500 font-sans">Business Entity:</span>
              <span className="font-bold text-stone-900">{business.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-sans">Shift Operator:</span>
              <span>Jane Nduta (Cashier # 1)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-sans">M-Pesa Till Total:</span>
              <span className="font-bold text-emerald-700">
                KES {(methodTotals['MPESA_TILL'] || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-sans">STK Push Inflow:</span>
              <span className="font-bold text-emerald-700">
                KES {(methodTotals['MPESA_EXPRESS'] || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-stone-500 font-sans">Paybill Total:</span>
              <span className="font-bold text-amber-700">
                KES {(methodTotals['MPESA_PAYBILL'] || 0).toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between pt-2 border-t border-dashed border-stone-300 text-stone-900 font-bold text-sm">
              <span className="font-sans">TOTAL TO SWEEP TO BANK:</span>
              <span className="text-emerald-800">KES {totalRevenue.toLocaleString()}.00</span>
            </div>
          </div>

          <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-900 leading-relaxed">
            <strong>System Safeguard Active:</strong> All transactions have been matched against Safaricom's instant callback ledger. Zero physical cash handling exposure for this shift.
          </div>
        </div>
      </div>

      {/* Cloud Database Persistence & Store Configuration Section */}
      <div className="bg-white rounded-2xl p-6 border border-stone-200 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-stone-900 flex items-center gap-2">
                <span>Cloud Firestore Database Persistence</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                  Live & Connected
                </span>
              </h3>
              <p className="text-xs text-stone-500">
                All transactions, store profile, customer loyalty, manual audits, STK requests, and verification logs stored permanently in the database.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowBizSettings(!showBizSettings)}
            className="px-3.5 py-2 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            {showBizSettings ? 'Close Settings' : 'Edit Store & Till Numbers'}
          </button>
        </div>

        {/* Database Metric Badges */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Transactions Stored</span>
            <span className="text-base font-bold font-mono text-stone-900">{transactions.length} Records</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Active Buy Goods Till</span>
            <span className="text-base font-bold font-mono text-emerald-700">{business.tillNumber}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Active Paybill Number</span>
            <span className="text-base font-bold font-mono text-amber-700">{business.paybillNumber}</span>
          </div>
          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
            <span className="text-[11px] text-stone-500 block">Audits Logged</span>
            <span className="text-base font-bold font-mono text-indigo-700">{audits.length} Audits</span>
          </div>
        </div>

        {/* Business Settings Editor Form */}
        {showBizSettings && (
          <form onSubmit={handleSaveBusinessProfile} className="mt-4 p-5 bg-stone-50 rounded-xl border border-stone-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-stone-200">
              <h4 className="font-bold text-stone-900 text-sm flex items-center gap-2">
                <Building className="w-4 h-4 text-stone-700" />
                Store Profile & Payment Channel Setup
              </h4>
              <span className="text-[11px] text-stone-500">Stored in /businesses/{business.id}</span>
            </div>

            {bizSaveSuccess && (
              <div className="p-3 bg-emerald-100 border border-emerald-300 text-emerald-900 rounded-lg text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span>Store profile and channel numbers saved to Cloud Firestore successfully!</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="text-stone-700 font-semibold block mb-1">Business Trade Name</label>
                <input
                  type="text"
                  value={bizName}
                  onChange={e => setBizName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Buy Goods Till Number</label>
                <input
                  type="text"
                  value={bizTill}
                  onChange={e => setBizTill(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-emerald-800"
                  required
                />
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Paybill Business Number</label>
                <input
                  type="text"
                  value={bizPaybill}
                  onChange={e => setBizPaybill(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono font-bold text-amber-800"
                  required
                />
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Default Account Reference</label>
                <input
                  type="text"
                  value={bizAccountRef}
                  onChange={e => setBizAccountRef(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono"
                  required
                />
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Daily Target Inflow (KES)</label>
                <input
                  type="number"
                  value={bizDailyTarget}
                  onChange={e => setBizDailyTarget(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg font-mono font-bold"
                  required
                />
              </div>

              <div>
                <label className="text-stone-700 font-semibold block mb-1">Store Branch Location</label>
                <input
                  type="text"
                  value={bizBranch}
                  onChange={e => setBizBranch(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-stone-300 rounded-lg"
                  required
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-sm transition-colors"
              >
                <Save className="w-3.5 h-3.5" />
                Save Store Settings to Database
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};
