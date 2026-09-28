import React, { useState } from 'react';
import { Transaction, PaymentMethod, TransactionStatus } from '../types';
import { 
  Search, 
  Filter, 
  Receipt, 
  Copy, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  FileText,
  RotateCcw,
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface TransactionHistoryProps {
  transactions: Transaction[];
  onViewReceipt: (txn: Transaction) => void;
}

export const TransactionHistory: React.FC<TransactionHistoryProps> = ({
  transactions,
  onViewReceipt,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMethod, setSelectedMethod] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filtered = transactions.filter(t => {
    const matchesSearch = 
      t.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.customerPhone.includes(searchTerm) ||
      (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesMethod = selectedMethod === 'ALL' || t.paymentMethod === selectedMethod;
    const matchesStatus = selectedStatus === 'ALL' || t.status === selectedStatus;

    return matchesSearch && matchesMethod && matchesStatus;
  });

  const totalFilteredSum = filtered
    .filter(t => t.status === 'COMPLETED')
    .reduce((sum, t) => sum + t.amount, 0);

  const handleCopy = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    sounds.playClick();
    setTimeout(() => setCopiedId(null), 1800);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-5 rounded-2xl border border-stone-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-stone-900 tracking-tight">
            Transaction Master Ledger & Audit Trail
          </h2>
          <p className="text-xs text-stone-500 mt-0.5">
            Immutable log of all mobile payment transactions, verification receipts, and status histories.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-stone-50 px-4 py-2 rounded-xl border border-stone-200">
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Filtered Inflow</span>
            <span className="text-base font-bold font-mono text-emerald-700">
              KES {totalFilteredSum.toLocaleString()}
            </span>
          </div>
          <div className="h-6 w-px bg-stone-200"></div>
          <div>
            <span className="text-[10px] text-stone-500 uppercase font-semibold block">Records</span>
            <span className="text-base font-bold text-stone-900">{filtered.length}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-stone-200 shadow-xs space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              id="search-transactions-input"
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              placeholder="Search by M-Pesa code (e.g. SB45...), name, or phone..."
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-stone-200 text-xs text-stone-900 focus:outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-50"
            />
          </div>

          {/* Payment Method Filter */}
          <div className="md:col-span-3">
            <select
              id="filter-method-select"
              value={selectedMethod}
              onChange={e => setSelectedMethod(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Payment Channels</option>
              <option value="MPESA_TILL">M-Pesa Buy Goods (Till)</option>
              <option value="MPESA_EXPRESS">M-Pesa STK Push</option>
              <option value="MPESA_PAYBILL">M-Pesa Paybill</option>
              <option value="QR_PAY">Dynamic QR Payment</option>
              <option value="AIRTEL_MONEY">Airtel Money</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="md:col-span-3">
            <select
              id="filter-status-select"
              value={selectedStatus}
              onChange={e => setSelectedStatus(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-stone-200 text-xs text-stone-700 bg-white focus:outline-none focus:border-emerald-600"
            >
              <option value="ALL">All Statuses</option>
              <option value="COMPLETED">Completed (Success)</option>
              <option value="FAILED">Failed / Declined</option>
              <option value="PENDING">Pending Verification</option>
              <option value="REVERSED">Reversed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Transaction Table */}
      <div className="bg-white rounded-2xl border border-stone-200 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-semibold uppercase tracking-wider">
                <th className="py-3 px-4">Code / Reference</th>
                <th className="py-3 px-4">Customer</th>
                <th className="py-3 px-4">Channel</th>
                <th className="py-3 px-4">Amount (KES)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Time</th>
                <th className="py-3 px-4 text-right">Receipt Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-400">
                    No transactions match your search or filter parameters.
                  </td>
                </tr>
              ) : (
                filtered.map(txn => {
                  const isSuccess = txn.status === 'COMPLETED';
                  return (
                    <tr key={txn.id} className="hover:bg-stone-50/80 transition-colors">
                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono">
                        <div className="flex items-center gap-1.5">
                          <span className="font-bold text-stone-900">{txn.code}</span>
                          <button
                            type="button"
                            onClick={() => handleCopy(txn.code, txn.id)}
                            title="Copy code"
                            className="text-stone-400 hover:text-stone-700 p-0.5"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {copiedId === txn.id && (
                            <span className="text-[10px] text-emerald-600 font-sans font-semibold">
                              Copied!
                            </span>
                          )}
                        </div>
                        <span className="text-[10px] text-stone-400 font-sans block">{txn.id}</span>
                      </td>

                      {/* Customer */}
                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-stone-900">{txn.customerName}</div>
                        <div className="text-[11px] text-stone-500 font-mono">{txn.customerPhone}</div>
                      </td>

                      {/* Channel */}
                      <td className="py-3.5 px-4">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-stone-100 text-stone-700 font-medium text-[11px]">
                          {txn.paymentMethod === 'MPESA_TILL' && 'Buy Goods Till'}
                          {txn.paymentMethod === 'MPESA_EXPRESS' && 'M-Pesa STK Push'}
                          {txn.paymentMethod === 'MPESA_PAYBILL' && 'Paybill 522522'}
                          {txn.paymentMethod === 'QR_PAY' && 'Dynamic QR'}
                          {txn.paymentMethod === 'AIRTEL_MONEY' && 'Airtel Money'}
                          {txn.paymentMethod === 'CARD' && 'Card'}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3.5 px-4 font-mono font-bold text-sm text-stone-900">
                        KES {txn.amount.toLocaleString()}.00
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            isSuccess
                              ? 'bg-emerald-100 text-emerald-800'
                              : txn.status === 'FAILED'
                              ? 'bg-rose-100 text-rose-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {isSuccess && <CheckCircle2 className="w-3 h-3" />}
                          {txn.status === 'FAILED' && <AlertTriangle className="w-3 h-3" />}
                          {txn.status}
                        </span>
                      </td>

                      {/* Time */}
                      <td className="py-3.5 px-4 text-stone-500 whitespace-nowrap text-[11px]">
                        {new Date(txn.timestamp).toLocaleString('en-KE', {
                          month: 'short',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => {
                            sounds.playClick();
                            onViewReceipt(txn);
                          }}
                          className="px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-100 text-stone-800 font-semibold text-xs inline-flex items-center gap-1.5 transition-colors shadow-2xs"
                        >
                          <Receipt className="w-3.5 h-3.5 text-emerald-600" />
                          View Receipt
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
