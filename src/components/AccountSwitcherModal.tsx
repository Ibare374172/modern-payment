import React from 'react';
import { UserRole, Customer, StaffAccount } from '../types';
import { 
  Store, 
  BarChart3, 
  Smartphone, 
  BookOpenCheck, 
  CheckCircle2, 
  X, 
  ShieldCheck, 
  Users, 
  Lock,
  ChevronRight,
  LogOut
} from 'lucide-react';
import { sounds } from '../utils/audio';

interface AccountSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeRole: UserRole;
  onSelectRole: (role: UserRole) => void;
  staffAccounts: StaffAccount[];
  activeStaffAccount: StaffAccount;
  onSelectStaffAccount: (acc: StaffAccount) => void;
  customers: Customer[];
  activeCustomer: Customer;
  onSelectCustomer: (cust: Customer) => void;
  sessionRole?: UserRole;
  sessionUser?: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
  } | null;
  onLogout?: () => void;
  onOpenNewCustomerModal?: () => void;
}

export const AccountSwitcherModal: React.FC<AccountSwitcherModalProps> = ({
  isOpen,
  onClose,
  activeRole,
  onSelectRole,
  staffAccounts,
  activeStaffAccount,
  onSelectStaffAccount,
  customers,
  activeCustomer,
  onSelectCustomer,
  sessionRole,
  sessionUser,
  onLogout,
}) => {
  if (!isOpen) return null;

  const isSessionLocked = Boolean(sessionRole);

  const getRoleDisplayName = (role?: UserRole) => {
    switch (role) {
      case 'CASHIER': return 'Cashier Station';
      case 'MANAGER': return 'Store Manager';
      case 'CUSTOMER': return 'Customer Wallet';
      case 'RESEARCHER': return 'Academic Researcher';
      default: return 'Demo User';
    }
  };

  const handleSwitchToStaff = (acc: StaffAccount) => {
    // If logged in, you CANNOT switch to another role's account
    if (isSessionLocked && acc.role !== sessionRole) {
      sounds.playWarning();
      return;
    }
    sounds.playClick();
    onSelectStaffAccount(acc);
    onSelectRole(acc.role);
    onClose();
  };

  const handleSwitchToCustomer = (cust: Customer) => {
    // If logged in as non-customer, you CANNOT switch to customer
    if (isSessionLocked && sessionRole !== 'CUSTOMER') {
      sounds.playWarning();
      return;
    }
    sounds.playClick();
    onSelectCustomer(cust);
    onSelectRole('CUSTOMER');
    onClose();
  };

  const cashierAccounts = staffAccounts.filter(a => a.role === 'CASHIER');
  const managerAccount = staffAccounts.find(a => a.role === 'MANAGER');
  const researcherAccount = staffAccounts.find(a => a.role === 'RESEARCHER');

  const isCashierLocked = isSessionLocked && sessionRole !== 'CASHIER';
  const isManagerLocked = isSessionLocked && sessionRole !== 'MANAGER';
  const isCustomerLocked = isSessionLocked && sessionRole !== 'CUSTOMER';
  const isResearcherLocked = isSessionLocked && sessionRole !== 'RESEARCHER';

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-950/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-3xl shadow-2xl border border-stone-200 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={e => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-stone-900 text-white p-6 sm:px-8 flex items-center justify-between border-b border-stone-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 font-bold text-lg">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                  Role-Based Workspaces
                </span>
                {isSessionLocked ? (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1">
                    <Lock className="w-2.5 h-2.5" /> Session Locked to {sessionRole}
                  </span>
                ) : (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-800 text-stone-300">
                    4 Isolated Accounts
                  </span>
                )}
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mt-0.5">
                {isSessionLocked ? `Authenticated Workspace (${getRoleDisplayName(sessionRole)})` : 'Switch Operational Account'}
              </h2>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body: The 4 Separate Accounts */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-6 flex-1 bg-stone-50/60">
          {/* Security policy notice if logged in */}
          {isSessionLocked ? (
            <div className="bg-amber-50 border border-amber-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-amber-950 text-xs shadow-xs animate-in fade-in">
              <div className="flex items-start gap-3.5">
                <div className="w-9 h-9 rounded-xl bg-amber-200/80 text-amber-900 flex items-center justify-center shrink-0 mt-0.5">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-sm text-amber-950">Cross-Account Switching Blocked</span>
                    <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-mono font-bold">
                      ROLE LOCKDOWN: {sessionRole}
                    </span>
                  </div>
                  <p className="text-amber-900 mt-1 leading-relaxed">
                    You are authenticated as <strong>{sessionUser?.displayName || sessionUser?.email || getRoleDisplayName(sessionRole)}</strong> ({sessionRole}). 
                    For financial safety and access compliance, active sessions cannot switch between <strong>Cashier</strong>, <strong>Manager</strong>, <strong>Customer</strong>, or <strong>Researcher</strong> accounts. To access another role, sign out first.
                  </p>
                </div>
              </div>
              {onLogout && (
                <button
                  onClick={() => {
                    sounds.playClick();
                    onClose();
                    onLogout();
                  }}
                  id="modal-signout-switch-btn"
                  className="shrink-0 px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-2 shadow-xs"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out & Switch</span>
                </button>
              )}
            </div>
          ) : (
            <p className="text-xs text-stone-600">
              Each account is isolated with dedicated permissions, transaction views, and operational tooling. Select an account below to switch your active workspace session:
            </p>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 1. CASHIER ACCOUNT */}
            <div 
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between ${
                isCashierLocked
                  ? 'bg-stone-100/90 border-stone-300 opacity-60'
                  : activeRole === 'CASHIER'
                  ? 'bg-emerald-50/70 border-emerald-400 shadow-md ring-2 ring-emerald-400/20'
                  : 'bg-white border-stone-200 hover:border-emerald-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                      isCashierLocked ? 'bg-stone-400 text-white' : 'bg-emerald-600 text-white'
                    }`}>
                      <Store className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCashierLocked ? 'bg-stone-200 text-stone-700' : 'text-emerald-800 bg-emerald-100'
                        }`}>
                          Front Counter
                        </span>
                        {isCashierLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> RESTRICTED
                          </span>
                        ) : activeRole === 'CASHIER' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-white border border-emerald-300 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-stone-900 mt-1 flex items-center gap-2">
                        <span>Cashier Station (Till POS)</span>
                        {isCashierLocked && <Lock className="w-4 h-4 text-stone-500" />}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-500 mt-3">
                  Front-desk sale terminal for M-Pesa STK push prompt dispatch, dynamic QR checkout, SMS receipt anti-fraud verification, and daily cash drawer balance reconciliation.
                </p>

                {/* Sub-operators */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    {isCashierLocked ? 'Cashier Operators (Access Blocked):' : 'Select Cashier Operator:'}
                  </div>
                  {cashierAccounts.map(csh => (
                    <button
                      key={csh.id}
                      disabled={isCashierLocked}
                      onClick={() => handleSwitchToStaff(csh)}
                      className={`w-full text-left p-2.5 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isCashierLocked
                          ? 'bg-stone-200/70 border-stone-300 text-stone-500 cursor-not-allowed'
                          : activeRole === 'CASHIER' && activeStaffAccount.id === csh.id
                          ? 'bg-emerald-600 text-white border-emerald-600 font-semibold'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-bold ${
                          isCashierLocked
                            ? 'bg-stone-300 text-stone-600'
                            : activeRole === 'CASHIER' && activeStaffAccount.id === csh.id
                            ? 'bg-white text-emerald-700'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {csh.avatarInitials}
                        </span>
                        <div>
                          <div>{csh.name}</div>
                          <div className={`text-[10px] ${
                            isCashierLocked ? 'text-stone-500' : activeRole === 'CASHIER' && activeStaffAccount.id === csh.id ? 'text-emerald-100' : 'text-stone-500'
                          }`}>
                            Badge #{csh.badgeId} • Till {csh.assignedTill}
                          </div>
                        </div>
                      </div>
                      {isCashierLocked ? (
                        <Lock className="w-4 h-4 text-stone-400" />
                      ) : activeRole === 'CASHIER' && activeStaffAccount.id === csh.id ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                    </button>
                  ))}
                </div>

                {isCashierLocked && (
                  <div className="mt-3 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Restricted: Cannot switch to Cashier while logged in as {sessionRole}.</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                <span>Till 842109 Terminal</span>
                <span className={isCashierLocked ? 'text-stone-400' : 'font-mono text-emerald-700 font-medium'}>
                  {isCashierLocked ? 'Access Denied' : 'Auto-Callback Active'}
                </span>
              </div>
            </div>

            {/* 2. STORE MANAGER ACCOUNT */}
            <div 
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between relative ${
                isManagerLocked
                  ? 'bg-stone-100/90 border-stone-300 opacity-60'
                  : activeRole === 'MANAGER'
                  ? 'bg-indigo-50/70 border-indigo-400 shadow-md ring-2 ring-indigo-400/20'
                  : 'bg-white border-stone-200 hover:border-indigo-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                      isManagerLocked ? 'bg-stone-400 text-white' : 'bg-indigo-600 text-white'
                    }`}>
                      <BarChart3 className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isManagerLocked ? 'bg-stone-200 text-stone-700' : 'text-indigo-800 bg-indigo-100'
                        }`}>
                          Store Executive
                        </span>
                        {isManagerLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> RESTRICTED
                          </span>
                        ) : activeRole === 'MANAGER' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 bg-white border border-indigo-300 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-stone-900 mt-1 flex items-center gap-2">
                        <span>Store Manager Portal</span>
                        {isManagerLocked && <Lock className="w-4 h-4 text-stone-500" />}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-500 mt-3">
                  Executive oversight with live revenue telemetry, counter exercise book audit reconciliation, business settings (Till 842109, Paybill 522522), and Daraja STK gateway configuration.
                </p>

                {managerAccount && (
                  <div className="mt-4">
                    <button
                      disabled={isManagerLocked}
                      onClick={() => handleSwitchToStaff(managerAccount)}
                      title={isManagerLocked ? `Restricted: Cannot switch to Manager while logged in as ${sessionRole}` : 'Switch to Store Manager'}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isManagerLocked
                          ? 'bg-stone-200/70 border-stone-300 text-stone-500 cursor-not-allowed'
                          : activeRole === 'MANAGER'
                          ? 'bg-indigo-600 text-white border-indigo-600 font-semibold'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isManagerLocked
                            ? 'bg-stone-300 text-stone-600'
                            : activeRole === 'MANAGER'
                            ? 'bg-white text-indigo-700'
                            : 'bg-indigo-100 text-indigo-800'
                        }`}>
                          {managerAccount.avatarInitials}
                        </span>
                        <div>
                          <div className="font-semibold">{managerAccount.name}</div>
                          <div className={`text-[10px] ${
                            isManagerLocked ? 'text-stone-500' : activeRole === 'MANAGER' ? 'text-indigo-100' : 'text-stone-500'
                          }`}>
                            {managerAccount.title} • {managerAccount.email}
                          </div>
                        </div>
                      </div>
                      {isManagerLocked ? (
                        <Lock className="w-4 h-4 text-stone-400" />
                      ) : activeRole === 'MANAGER' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                    </button>
                  </div>
                )}

                {isManagerLocked && (
                  <div className="mt-3 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Restricted: Cannot switch to Store Manager while logged in as {sessionRole}.</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                <span>Access: Super Administrator</span>
                <span className={isManagerLocked ? 'text-stone-400' : 'text-indigo-700 font-semibold'}>
                  {isManagerLocked ? 'Access Denied' : 'Ledger & Gateway Admin'}
                </span>
              </div>
            </div>

            {/* 3. CUSTOMER PERSONAL ACCOUNT */}
            <div 
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between relative ${
                isCustomerLocked
                  ? 'bg-stone-100/90 border-stone-300 opacity-60'
                  : activeRole === 'CUSTOMER'
                  ? 'bg-sky-50/70 border-sky-400 shadow-md ring-2 ring-sky-400/20'
                  : 'bg-white border-stone-200 hover:border-sky-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                      isCustomerLocked ? 'bg-stone-400 text-white' : 'bg-sky-600 text-white'
                    }`}>
                      <Smartphone className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isCustomerLocked ? 'bg-stone-200 text-stone-700' : 'text-sky-800 bg-sky-100'
                        }`}>
                          Personal Wallet
                        </span>
                        {isCustomerLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> RESTRICTED
                          </span>
                        ) : activeRole === 'CUSTOMER' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-sky-700 bg-white border border-sky-300 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-sky-500 animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-stone-900 mt-1 flex items-center gap-2">
                        <span>Customer Account & Wallet</span>
                        {isCustomerLocked && <Lock className="w-4 h-4 text-stone-500" />}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-500 mt-3">
                  Personal customer view: Send payments via STK push prompt or Till 842109, earn loyalty points, access your thermal electronic receipts, and download proof of payment.
                </p>

                {/* Customer Selector */}
                <div className="mt-4 space-y-2">
                  <div className="text-[11px] font-semibold text-stone-500 uppercase tracking-wider">
                    {isCustomerLocked ? 'Customer Accounts (Access Blocked):' : 'Select Customer Account:'}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-40 overflow-y-auto pr-1">
                    {customers.map(cust => (
                      <button
                        key={cust.id}
                        disabled={isCustomerLocked}
                        onClick={() => handleSwitchToCustomer(cust)}
                        title={isCustomerLocked ? `Restricted: Cannot switch to Customer while logged in as ${sessionRole}` : `Switch to ${cust.name}`}
                        className={`text-left p-2 rounded-xl border text-xs flex items-center justify-between transition-colors ${
                          isCustomerLocked
                            ? 'bg-stone-200/70 border-stone-300 text-stone-500 cursor-not-allowed'
                            : activeRole === 'CUSTOMER' && activeCustomer.id === cust.id
                            ? 'bg-sky-600 text-white border-sky-600 font-semibold'
                            : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                        }`}
                      >
                        <div className="truncate">
                          <div className="truncate font-medium">{cust.name}</div>
                          <div className={`text-[10px] truncate ${
                            isCustomerLocked ? 'text-stone-400' : activeRole === 'CUSTOMER' && activeCustomer.id === cust.id ? 'text-sky-100' : 'text-stone-500'
                          }`}>
                            {cust.phone} • {cust.loyaltyPoints} pts
                          </div>
                        </div>
                        {isCustomerLocked ? (
                          <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0 ml-1" />
                        ) : activeRole === 'CUSTOMER' && activeCustomer.id === cust.id ? (
                          <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1" />
                        ) : null}
                      </button>
                    ))}
                  </div>
                </div>

                {isCustomerLocked && (
                  <div className="mt-3 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Restricted: Cannot switch to Customer Accounts while logged in as {sessionRole}.</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                <span>Active: {activeCustomer.name}</span>
                <span className={isCustomerLocked ? 'text-stone-400' : 'font-semibold text-sky-700'}>
                  {isCustomerLocked ? 'Access Denied' : `Tier: ${activeCustomer.tier || 'Member'}`}
                </span>
              </div>
            </div>

            {/* 4. ACADEMIC RESEARCHER ACCOUNT */}
            <div 
              className={`rounded-2xl border transition-all p-5 flex flex-col justify-between relative ${
                isResearcherLocked
                  ? 'bg-stone-100/90 border-stone-300 opacity-60'
                  : activeRole === 'RESEARCHER'
                  ? 'bg-amber-50/70 border-amber-400 shadow-md ring-2 ring-amber-400/20'
                  : 'bg-white border-stone-200 hover:border-amber-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-xs ${
                      isResearcherLocked ? 'bg-stone-400 text-white' : 'bg-amber-600 text-white'
                    }`}>
                      <BookOpenCheck className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5">
                        <span className={`text-[11px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md ${
                          isResearcherLocked ? 'bg-stone-200 text-stone-700' : 'text-amber-800 bg-amber-100'
                        }`}>
                          Academic & Audit
                        </span>
                        {isResearcherLocked ? (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-100 border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <Lock className="w-2.5 h-2.5" /> RESTRICTED
                          </span>
                        ) : activeRole === 'RESEARCHER' && (
                          <span className="flex items-center gap-1 text-[10px] font-bold text-amber-700 bg-white border border-amber-300 px-1.5 py-0.5 rounded-full">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                            ACTIVE
                          </span>
                        )}
                      </div>
                      <h3 className="font-bold text-base text-stone-900 mt-1 flex items-center gap-2">
                        <span>Research & TAM Sandbox</span>
                        {isResearcherLocked && <Lock className="w-4 h-4 text-stone-500" />}
                      </h3>
                    </div>
                  </div>
                </div>

                <p className="text-xs text-stone-500 mt-3">
                  Academic investigation into Mobile Payments in Modern Businesses: Interactive TAM model adoption simulator, thesis chapters 1–5, and empirical audit error rates across 120 Kenyan SMEs.
                </p>

                {researcherAccount && (
                  <div className="mt-4">
                    <button
                      disabled={isResearcherLocked}
                      onClick={() => handleSwitchToStaff(researcherAccount)}
                      title={isResearcherLocked ? `Restricted: Cannot switch to Research while logged in as ${sessionRole}` : 'Switch to Academic Research'}
                      className={`w-full text-left p-3 rounded-xl border flex items-center justify-between text-xs transition-colors ${
                        isResearcherLocked
                          ? 'bg-stone-200/70 border-stone-300 text-stone-500 cursor-not-allowed'
                          : activeRole === 'RESEARCHER'
                          ? 'bg-amber-600 text-white border-amber-600 font-semibold'
                          : 'bg-stone-50 hover:bg-stone-100 border-stone-200 text-stone-800'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold ${
                          isResearcherLocked
                            ? 'bg-stone-300 text-stone-600'
                            : activeRole === 'RESEARCHER'
                            ? 'bg-white text-amber-700'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {researcherAccount.avatarInitials}
                        </span>
                        <div>
                          <div className="font-semibold">{researcherAccount.name}</div>
                          <div className={`text-[10px] ${
                            isResearcherLocked ? 'text-stone-500' : activeRole === 'RESEARCHER' ? 'text-amber-100' : 'text-stone-500'
                          }`}>
                            {researcherAccount.title} • {researcherAccount.branch}
                          </div>
                        </div>
                      </div>
                      {isResearcherLocked ? (
                        <Lock className="w-4 h-4 text-stone-400" />
                      ) : activeRole === 'RESEARCHER' ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-400" />
                      )}
                    </button>
                  </div>
                )}

                {isResearcherLocked && (
                  <div className="mt-3 p-2 bg-amber-50/80 border border-amber-200 rounded-xl text-amber-900 text-[11px] flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                    <span>Restricted: Cannot switch to Academic Research while logged in as {sessionRole}.</span>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-3 border-t border-stone-200/60 flex items-center justify-between text-[11px] text-stone-500">
                <span>Model: TAM & UTAUT Framework</span>
                <span className={isResearcherLocked ? 'text-stone-400' : 'text-amber-700 font-semibold'}>
                  {isResearcherLocked ? 'Access Denied' : '120 SME Survey Data'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="bg-stone-100 px-6 py-4 border-t border-stone-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-stone-500">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>
              {isSessionLocked
                ? `Account Locked to ${sessionRole} Session • Sign out to change role`
                : 'Multi-Account Session Isolation Active'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {isSessionLocked && onLogout && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onClose();
                  onLogout();
                }}
                className="px-3.5 py-2 rounded-xl bg-stone-200 hover:bg-stone-300 text-stone-800 font-semibold transition-colors flex items-center gap-1.5"
              >
                <LogOut className="w-3.5 h-3.5 text-stone-600" />
                <span>Sign Out</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-stone-900 text-white font-semibold hover:bg-stone-800 transition-colors shadow-xs"
            >
              {isSessionLocked ? `Return to ${getRoleDisplayName(sessionRole)}` : 'Continue with Selected Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
