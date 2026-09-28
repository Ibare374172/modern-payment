import React from 'react';
import { 
  X, 
  Store, 
  Smartphone, 
  BarChart3, 
  ShieldCheck, 
  Zap, 
  Database, 
  BookOpenCheck, 
  Server, 
  Layers, 
  CheckCircle2, 
  ArrowRight,
  ExternalLink
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface AboutWebsiteModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenDarajaConfig?: () => void;
}

export const AboutWebsiteModal: React.FC<AboutWebsiteModalProps> = ({
  isOpen,
  onClose,
  onOpenDarajaConfig,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] flex flex-col overflow-hidden border border-slate-200"
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="px-6 py-5 bg-gradient-to-r from-emerald-600 via-teal-600 to-indigo-700 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center backdrop-blur-md shadow-inner">
              <Store className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                About Zawadi Mart & Mobile Payments System
              </h2>
              <p className="text-xs text-emerald-100 font-medium">
                Comprehensive System Description & Architecture Overview
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              sounds.playClick();
              onClose();
            }}
            className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-slate-700">
          {/* Executive Summary */}
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-4">
            <h3 className="text-sm font-bold text-emerald-950 uppercase tracking-wider mb-2 flex items-center gap-2">
              <Zap className="w-4 h-4 text-emerald-600" />
              Website & System Description
            </h3>
            <p className="text-sm text-emerald-900 leading-relaxed">
              <strong>Zawadi Mart Mobile Payments</strong> is a high-performance, enterprise-grade digital point-of-sale (POS), transaction reconciliation, and retail analytics platform built specifically for modern African retail enterprises. It natively integrates with <strong>Safaricom M-Pesa Daraja 2.0 API</strong> to provide frictionless cashless checkout, real-time fraud mitigation, and dual-channel ledger reconciliation.
            </p>
          </div>

          {/* Clean Client-Server Architecture */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-600" />
              Clean Modular Architecture (Backend & Frontend Separated)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-indigo-700 font-bold text-sm mb-2">
                  <Server className="w-4 h-4" />
                  Dedicated Backend (<code className="text-xs bg-indigo-100 px-1 py-0.5 rounded">/backend</code>)
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Safaricom Daraja API Service:</strong> Secure OAuth token generation, password encryption, and STK push dispatch.</li>
                  <li><strong>STK Store & Webhook Controller:</strong> In-memory queue and callback receiver (<code className="text-[11px] bg-slate-200 px-1 rounded">/api/stkpush/callback</code>).</li>
                  <li><strong>Credential Validator:</strong> Instant sandbox & live API keys validation.</li>
                  <li><strong>Express Server:</strong> Lightweight REST endpoints and error middleware.</li>
                </ul>
              </div>

              <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
                <div className="flex items-center gap-2 text-emerald-700 font-bold text-sm mb-2">
                  <Smartphone className="w-4 h-4" />
                  Dedicated Frontend (<code className="text-xs bg-emerald-100 px-1 py-0.5 rounded">/src</code>)
                </div>
                <ul className="text-xs text-slate-600 space-y-1.5 list-disc list-inside">
                  <li><strong>Frontend API Client:</strong> Typed HTTP communication via <code className="text-[11px] bg-slate-200 px-1 rounded">src/services/apiClient.ts</code>.</li>
                  <li><strong>Authentication Gate:</strong> Firebase Auth with email/password and single sign-on.</li>
                  <li><strong>Multi-Account Workspaces:</strong> Dedicated views for Cashier, Manager, Customer, and Researcher.</li>
                  <li><strong>Real-time Cloud Sync:</strong> Google Cloud Firestore data synchronization.</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Four Dedicated Roles & Account Separation */}
          <div>
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              Four Isolated Operational Account Profiles
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-lg border border-emerald-100 bg-emerald-50/50">
                <div className="font-bold text-emerald-900 flex items-center gap-1.5 mb-1">
                  <Store className="w-3.5 h-3.5 text-emerald-600" />
                  1. POS Cashier Workspace
                </div>
                <p className="text-slate-600">
                  Instant cart checkout, M-Pesa STK Push prompt dispatch, dynamic QR codes, cash drawers, and manual receipt validation.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-indigo-100 bg-indigo-50/50">
                <div className="font-bold text-indigo-900 flex items-center gap-1.5 mb-1">
                  <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
                  2. Store Manager Dashboard
                </div>
                <p className="text-slate-600">
                  Executive KPI revenue summaries, hourly sales velocity, discrepancies audit reconciliation, and Daraja credentials management.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-amber-100 bg-amber-50/50">
                <div className="font-bold text-amber-900 flex items-center gap-1.5 mb-1">
                  <Smartphone className="w-3.5 h-3.5 text-amber-600" />
                  3. Customer Mobile Wallet
                </div>
                <p className="text-slate-600">
                  Personal digital receipts wallet, loyalty tier progression (Bronze, Silver, Gold), voucher redemption, and wallet top-ups.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-purple-100 bg-purple-50/50">
                <div className="font-bold text-purple-900 flex items-center gap-1.5 mb-1">
                  <BookOpenCheck className="w-3.5 h-3.5 text-purple-600" />
                  4. Academic Researcher Hub
                </div>
                <p className="text-slate-600">
                  Technology Acceptance Model (TAM) interactive simulator, statistical survey breakdown, and academic research digest.
                </p>
              </div>
            </div>
          </div>

          {/* Academic Foundation */}
          <div className="border border-slate-200 rounded-xl p-4 bg-slate-50/70">
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-2 flex items-center gap-2">
              <BookOpenCheck className="w-4 h-4 text-indigo-600" />
              Academic Research Foundation
            </h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              This system serves as an interactive empirical testbed based on research into <em>"The Effect of Mobile Payment Systems on the Performance of Small and Medium Enterprises (SMEs) in Kenya."</em> It demonstrates how automated M-Pesa integration eliminates manual bookkeeping errors, reduces queue times by up to 74%, and improves cash-flow reconciliation accuracy.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="text-xs text-slate-500 flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Full-Stack Node.js + Express + React 19 + Firebase
          </div>
          <div className="flex items-center gap-2">
            {onOpenDarajaConfig && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                  onOpenDarajaConfig();
                }}
                className="px-3 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
              >
                Configure Daraja API
              </button>
            )}
            <button
              onClick={() => {
                sounds.playClick();
                onClose();
              }}
              className="px-4 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
