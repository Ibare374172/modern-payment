import React, { useRef } from 'react';
import { Transaction, BusinessProfile } from '../types';
import { CheckCircle2, Printer, Share2, Download, X, ShieldCheck, Copy } from 'lucide-react';
import { sounds } from '../utils/audio';

interface ReceiptModalProps {
  transaction: Transaction | null;
  business: BusinessProfile;
  isOpen: boolean;
  onClose: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  business,
  isOpen,
  onClose,
}) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = React.useState(false);

  if (!isOpen || !transaction) return null;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(transaction.code);
    setCopied(true);
    sounds.playClick();
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => {
    sounds.playClick();
    window.print();
  };

  const formattedDate = new Date(transaction.timestamp).toLocaleString('en-KE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Bar */}
        <div className="px-5 py-3.5 bg-stone-50 border-b border-stone-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
            <span className="text-xs font-bold uppercase tracking-wider text-stone-700">
              Electronic Mobile Receipt
            </span>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-stone-700 p-1 rounded-md transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Printable Thermal Receipt Canvas */}
        <div ref={receiptRef} className="p-6 overflow-y-auto bg-stone-50/50 flex-1 print:p-0">
          <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs font-mono text-xs text-stone-800">
            {/* Header / Business Info */}
            <div className="text-center pb-4 border-b border-dashed border-stone-300">
              <h3 className="font-bold text-base text-stone-900 uppercase tracking-tight">
                {business.name}
              </h3>
              <p className="text-[11px] text-stone-500">{business.branch}</p>
              <p className="text-[11px] text-stone-500">Tel: {business.phone}</p>
              <div className="mt-2 inline-flex items-center gap-1 px-2.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[11px] font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" />
                VERIFIED CASHLESS RECEIPT
              </div>
            </div>

            {/* M-Pesa Code Hero */}
            <div className="my-4 py-3 bg-stone-50 border border-stone-200 rounded-lg text-center">
              <span className="text-[10px] text-stone-500 uppercase tracking-wider block">
                Transaction Reference
              </span>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-stone-900 tracking-wider">
                  {transaction.code}
                </span>
                <button
                  onClick={handleCopyCode}
                  title="Copy code"
                  className="p-1 hover:bg-stone-200 rounded text-stone-500"
                >
                  <Copy className="w-3.5 h-3.5" />
                </button>
              </div>
              {copied && <span className="text-[10px] text-emerald-600 font-sans block">Copied to clipboard</span>}
            </div>

            {/* Transaction Key Details */}
            <div className="space-y-1.5 py-2 border-b border-dashed border-stone-300 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-500">Date & Time:</span>
                <span className="font-semibold text-stone-900">{formattedDate}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Payment Channel:</span>
                <span className="font-semibold text-stone-900">
                  {transaction.paymentMethod === 'MPESA_TILL' && `M-PESA Buy Goods (Till ${business.tillNumber})`}
                  {transaction.paymentMethod === 'MPESA_PAYBILL' && `M-PESA Paybill (${business.paybillNumber})`}
                  {transaction.paymentMethod === 'MPESA_EXPRESS' && 'M-PESA STK Prompt'}
                  {transaction.paymentMethod === 'AIRTEL_MONEY' && 'Airtel Money Kenya'}
                  {transaction.paymentMethod === 'QR_PAY' && 'Dynamic QR Payment'}
                  {transaction.paymentMethod === 'CARD' && 'Contactless Card'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Customer Name:</span>
                <span className="font-semibold text-stone-900">{transaction.customerName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-500">Mobile Number:</span>
                <span className="font-semibold text-stone-900">{transaction.customerPhone}</span>
              </div>
              {transaction.notes && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Item / Note:</span>
                  <span className="font-semibold text-stone-900">{transaction.notes}</span>
                </div>
              )}
              {transaction.verifiedBy && (
                <div className="flex justify-between">
                  <span className="text-stone-500">Verified By:</span>
                  <span className="font-semibold text-emerald-700">{transaction.verifiedBy}</span>
                </div>
              )}
            </div>

            {/* Financial Summary */}
            <div className="py-3 border-b border-dashed border-stone-300 space-y-1">
              <div className="flex justify-between text-xs font-bold text-stone-900 pt-1">
                <span>TOTAL AMOUNT PAID:</span>
                <span className="text-base font-bold text-emerald-700">
                  KES {transaction.amount.toLocaleString()}.00
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-stone-500">
                <span>Transaction Surcharge:</span>
                <span>KES 0.00 (Zero fee to buyer)</span>
              </div>
            </div>

            {/* Raw Safaricom SMS Text snippet */}
            <div className="mt-3 p-2.5 bg-stone-100 rounded-lg text-[10px] text-stone-600 leading-relaxed">
              <div className="font-bold text-stone-700 mb-0.5">Safaricom Confirmation Broadcast:</div>
              <p className="italic">{transaction.smsReceiptText}</p>
            </div>

            {/* Barcode representation */}
            <div className="mt-4 pt-2 text-center">
              <div className="inline-flex gap-0.5 h-7 items-center opacity-70">
                {[2, 1, 3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 2, 4, 1, 3, 2, 1].map((w, idx) => (
                  <span key={idx} className="bg-stone-800 h-full inline-block" style={{ width: `${w * 1.5}px` }}></span>
                ))}
              </div>
              <p className="text-[9px] text-stone-400 mt-1">
                AUTHENTICATED BY CENTRAL DIGITAL SWITCH • AUDIT TRAIL # {transaction.id}
              </p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-white border-t border-stone-200 flex gap-2">
          <button
            onClick={handlePrint}
            id="print-receipt-btn"
            className="flex-1 py-2.5 px-4 rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            Print Thermal Receipt
          </button>
          <button
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-stone-900 hover:bg-stone-800 text-white text-xs font-semibold"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
