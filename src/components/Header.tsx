import React from 'react';
import { UserRole, BusinessProfile, StaffAccount, Customer } from '../types';
import { 
  Store, 
  Smartphone, 
  BarChart3, 
  Receipt, 
  BookOpenCheck, 
  Volume2, 
  VolumeX, 
  Database,
  LogIn,
  LogOut,
  User as UserIcon,
  ShieldCheck,
  Zap,
  Users,
  ChevronDown,
  Sparkles,
  Sliders,
  FileSpreadsheet,
  Settings,
  Gift,
  Info,
  Lock
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  activeStaffAccount: StaffAccount;
  activeCustomer: Customer;
  onOpenAccountSwitcher: () => void;
  activeSubTab: string;
  setActiveSubTab: (tab: string) => void;
  business: BusinessProfile;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  todayCount: number;
  dbConnected: boolean;
  currentUser: User | null;
  sessionUser?: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
  } | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenDarajaConfig?: () => void;
  onOpenAboutWebsite?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeRole,
  setActiveRole,
  activeStaffAccount,
  activeCustomer,
  onOpenAccountSwitcher,
  activeSubTab,
  setActiveSubTab,
  business,
  soundEnabled,
  setSoundEnabled,
  todayCount,
  dbConnected,
  currentUser,
  sessionUser,
  onLogin,
  onLogout,
  onOpenDarajaConfig,
  onOpenAboutWebsite,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playPaymentSuccess();
  };

  // Determine current active account presentation details
  const getAccountBadgeDetails = () => {
    switch (activeRole) {
      case 'CASHIER':
        return {
          name: activeStaffAccount.name,
          title: activeStaffAccount.title,
          subLabel: `Till #${business.tillNumber} • Badge #${activeStaffAccount.badgeId}`,
          roleLabel: 'Cashier Account',
          bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          avatarBg: 'bg-emerald-600 text-white',
          initials: activeStaffAccount.avatarInitials,
          icon: Store,
        };
      case 'MANAGER':
        return {
          name: activeStaffAccount.role === 'MANAGER' ? activeStaffAccount.name : 'James Kamau',
          title: 'Branch General Manager',
          subLabel: `Full Store Administration • ${business.branch}`,
          roleLabel: 'Manager Account',
          bgBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
          avatarBg: 'bg-indigo-600 text-white',
          initials: 'JK',
          icon: BarChart3,
        };
      case 'CUSTOMER':
        return {
          name: activeCustomer.name,
          title: `${activeCustomer.tier || 'Gold'} Member • ${activeCustomer.loyaltyPoints} pts`,
          subLabel: `${activeCustomer.phone} • Wallet Active`,
          roleLabel: 'Customer Account',
          bgBadge: 'bg-sky-50 text-sky-800 border-sky-200',
          avatarBg: 'bg-sky-600 text-white',
          initials: activeCustomer.avatarInitials || activeCustomer.name.slice(0, 2).toUpperCase(),
          icon: Smartphone,
        };
      case 'RESEARCHER':
        return {
          name: 'Dr. Margaret Otieno',
          title: 'Lead FinTech Researcher (PhD)',
          subLabel: 'Faculty of Computing • TAM Project',
          roleLabel: 'Researcher Account',
          bgBadge: 'bg-amber-50 text-amber-800 border-amber-200',
          avatarBg: 'bg-amber-600 text-white',
          initials: 'MO',
          icon: BookOpenCheck,
        };
    }
  };

  const accountInfo = getAccountBadgeDetails();
  const AccountIcon = accountInfo.icon;

  // Account-specific sub-navigation tabs
  const getNavigationTabs = () => {
    switch (activeRole) {
      case 'CASHIER':
        return [
          { id: 'pos', label: 'POS Terminal & Checkout', icon: Store, badge: 'Active Till' },
          { id: 'verify', label: 'Anti-Fraud Code Verification', icon: ShieldCheck },
          { id: 'drawer', label: 'Cashier Shift Register', icon: Receipt },
          { id: 'receipts', label: 'Today\'s Shift Receipts', icon: Receipt, badge: `${todayCount}` },
        ];
      case 'MANAGER':
        return [
          { id: 'dashboard', label: 'Executive Analytics', icon: BarChart3 },
          { id: 'audits', label: 'Reconciliation Audit', icon: FileSpreadsheet, badge: 'Book vs SMS' },
          { id: 'transactions', label: 'All Store Transactions', icon: Receipt, badge: `${todayCount}` },
          { id: 'postgres', label: 'PostgreSQL Real-Time', icon: Database, badge: 'Live SQL' },
          { id: 'settings', label: 'Business & Till Settings', icon: Settings },
          { id: 'gateway', label: 'Daraja STK Gateway', icon: Zap, badge: 'API' },
        ];
      case 'CUSTOMER':
        return [
          { id: 'wallet', label: 'My Wallet & Quick Pay', icon: Smartphone, badge: 'Instant Pay' },
          { id: 'loyalty', label: 'Loyalty Rewards & Tier', icon: Gift, badge: `${activeCustomer.loyaltyPoints} pts` },
          { id: 'receipts', label: 'My Digital Receipts', icon: Receipt },
          { id: 'switch_customer', label: 'Switch / Register Customer', icon: Users },
        ];
      case 'RESEARCHER':
        return [
          { id: 'simulator', label: 'TAM Adoption Simulator', icon: Sliders, badge: 'Interactive' },
          { id: 'empirical', label: 'Empirical Audit Findings', icon: FileSpreadsheet },
          { id: 'postgres', label: 'PostgreSQL Relational Models', icon: Database, badge: 'Drizzle' },
          { id: 'chapters', label: 'Thesis Chapters 1 – 5', icon: BookOpenCheck, badge: 'Full Study' },
          { id: 'survey', label: 'SME Survey Demographics', icon: Users, badge: '120 SMEs' },
        ];
    }
  };

  const currentTabs = getNavigationTabs();

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Operational Bar: Store Identity + Account Workspace Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-3 gap-3 border-b border-stone-100">
          
          {/* Store Branding */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-stone-900 flex items-center justify-center text-white shadow-xs font-bold text-base tracking-tight shrink-0">
              ZM
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-bold text-stone-900 tracking-tight text-base">
                  {business.name}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Till {business.tillNumber}
                </span>
                {/* Real-time DB indicator */}
                <span 
                  title="Persistent Cloud Database linked and active"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${
                    dbConnected 
                      ? 'bg-sky-50 text-sky-800 border-sky-200' 
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <Database className="w-3 h-3 text-sky-600" />
                  <span>{dbConnected ? 'Database Connected' : 'Connecting...'}</span>
                </span>
              </div>
              <p className="text-[11px] text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>Paybill: <strong className="text-stone-700 font-mono">{business.paybillNumber}</strong> ({business.accountRef})</span>
                <span>•</span>
                <span>{business.branch}</span>
              </p>
            </div>
          </div>

          {/* Active Account Identity & Quick Switcher Controls */}
          <div className="flex items-center gap-2.5 flex-wrap">
            
            {/* Account Selector Button */}
            <button
              onClick={onOpenAccountSwitcher}
              id="switch-account-modal-btn"
              title={
                sessionUser
                  ? `${accountInfo.roleLabel} Session: Locked to authenticated account (switching restricted)`
                  : 'Click to switch between Cashier, Manager, Customer, and Researcher accounts'
              }
              className={`flex items-center gap-2.5 p-1.5 pr-3 rounded-2xl border transition-all text-left group shadow-xs hover:shadow-sm ${accountInfo.bgBadge}`}
            >
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shadow-2xs ${accountInfo.avatarBg}`}>
                {accountInfo.initials}
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-bold uppercase tracking-wider opacity-80">
                    {accountInfo.roleLabel}
                  </span>
                  {sessionUser ? (
                    <span className="text-[9px] bg-stone-900/10 text-stone-800 px-1 py-0.2 rounded font-medium flex items-center gap-0.5">
                      <Lock className="w-2.5 h-2.5 text-stone-700" />
                      Locked
                    </span>
                  ) : (
                    <span className="text-[9px] bg-stone-900/10 px-1 py-0.2 rounded font-medium">
                      Demo
                    </span>
                  )}
                </div>
                <div className="text-xs font-bold text-stone-900 flex items-center gap-1">
                  <span>{accountInfo.name}</span>
                  <ChevronDown className="w-3.5 h-3.5 text-stone-500 group-hover:translate-y-0.5 transition-transform" />
                </div>
              </div>
            </button>

            {/* Quick Role Switcher or Locked Session Badge */}
            {sessionUser ? (
              <div 
                id="role-locked-session-badge"
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs shadow-2xs ${
                  sessionUser.role === 'CASHIER'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : sessionUser.role === 'MANAGER'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-900'
                    : sessionUser.role === 'CUSTOMER'
                    ? 'bg-sky-50 border-sky-200 text-sky-900'
                    : 'bg-amber-50 border-amber-200 text-amber-900'
                }`}
                title={`Security Policy: Authenticated as ${sessionUser.role}. Account switching to other roles is disabled.`}
              >
                <Lock className={`w-3.5 h-3.5 ${
                  sessionUser.role === 'CASHIER'
                    ? 'text-emerald-700'
                    : sessionUser.role === 'MANAGER'
                    ? 'text-indigo-700'
                    : sessionUser.role === 'CUSTOMER'
                    ? 'text-sky-700'
                    : 'text-amber-700'
                }`} />
                <span className="font-bold">
                  {sessionUser.role === 'CASHIER' && 'Cashier Station'}
                  {sessionUser.role === 'MANAGER' && 'Manager Portal'}
                  {sessionUser.role === 'CUSTOMER' && 'Customer Wallet'}
                  {sessionUser.role === 'RESEARCHER' && 'Academic Sandbox'}
                </span>
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono font-bold ${
                  sessionUser.role === 'CASHIER'
                    ? 'bg-emerald-200/80 text-emerald-800'
                    : sessionUser.role === 'MANAGER'
                    ? 'bg-indigo-200/80 text-indigo-800'
                    : sessionUser.role === 'CUSTOMER'
                    ? 'bg-sky-200/80 text-sky-800'
                    : 'bg-amber-200/80 text-amber-800'
                }`}>
                  {sessionUser.role === 'CASHIER' && `Till #${business.tillNumber}`}
                  {sessionUser.role === 'MANAGER' && 'Executive'}
                  {sessionUser.role === 'CUSTOMER' && 'Personal'}
                  {sessionUser.role === 'RESEARCHER' && 'Research'}
                </span>
                <span className="text-[10px] text-stone-500 font-medium hidden md:inline ml-1 border-l border-stone-300 pl-2">
                  Session Locked
                </span>
              </div>
            ) : (
              <div className="flex items-center bg-stone-100 p-1 rounded-xl border border-stone-200">
                {(['CASHIER', 'MANAGER', 'CUSTOMER', 'RESEARCHER'] as UserRole[]).map(role => {
                  const isSelected = activeRole === role;
                  const label = role === 'CASHIER' ? 'Cashier' : role === 'MANAGER' ? 'Manager' : role === 'CUSTOMER' ? 'Customer' : 'Research';
                  return (
                    <button
                      key={role}
                      id={`quick-switch-${role.toLowerCase()}`}
                      onClick={() => {
                        sounds.playClick();
                        setActiveRole(role);
                        if (role === 'CASHIER') setActiveSubTab('pos');
                        else if (role === 'MANAGER') setActiveSubTab('dashboard');
                        else if (role === 'CUSTOMER') setActiveSubTab('wallet');
                        else if (role === 'RESEARCHER') setActiveSubTab('simulator');
                      }}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        isSelected
                          ? 'bg-white text-stone-950 shadow-xs border border-stone-200'
                          : 'text-stone-600 hover:text-stone-900'
                      }`}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Audio Toggle */}
            <button
              onClick={toggleSound}
              id="sound-toggle-btn"
              title={soundEnabled ? 'M-Pesa payment chime enabled' : 'Payment chime muted'}
              className={`p-2 rounded-xl border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-stone-50 border-stone-200 text-stone-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
            </button>

            {/* About Website Description Dialog Trigger */}
            {onOpenAboutWebsite && (
              <button
                onClick={() => {
                  sounds.playClick();
                  onOpenAboutWebsite();
                }}
                id="about-website-btn"
                title="System Overview & Architecture Description"
                className="p-2 rounded-xl border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-700 text-xs font-medium flex items-center gap-1.5 transition-colors shadow-2xs"
              >
                <Info className="w-4 h-4 text-indigo-600" />
                <span className="hidden lg:inline text-xs font-semibold">About System</span>
              </button>
            )}

            {/* Auth Pill */}
            {(currentUser || sessionUser) ? (
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-xl py-1 px-2.5 text-xs">
                {currentUser?.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-5 h-5 rounded-full object-cover" 
                  />
                ) : (
                  <div className="w-5 h-5 rounded-full bg-stone-900 text-white flex items-center justify-center font-bold text-[9px]">
                    {(sessionUser?.displayName || currentUser?.displayName || 'U').slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className="font-semibold text-stone-800 max-w-[120px] truncate hidden xl:inline">
                  {sessionUser?.displayName || currentUser?.displayName || currentUser?.email}
                </span>
                <button
                  onClick={onLogout}
                  id="header-signout-btn"
                  title="Sign out and lock system"
                  className="flex items-center gap-1 text-stone-400 hover:text-rose-600 ml-1 font-semibold transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span className="text-[11px] text-rose-600 hidden sm:inline">Sign Out</span>
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                id="staff-signin-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Account-Specific Workspace Navigation Tabs */}
        <div className="flex items-center justify-between overflow-x-auto py-2 scrollbar-none gap-2">
          <nav className="flex space-x-1.5 overflow-x-auto scrollbar-none" aria-label="Account Tabs">
            {currentTabs.map(item => {
              const Icon = item.icon;
              const isActive = activeSubTab === item.id;
              return (
                <button
                  key={item.id}
                  id={`tab-${activeRole.toLowerCase()}-${item.id}`}
                  onClick={() => {
                    sounds.playClick();
                    setActiveSubTab(item.id);
                  }}
                  className={`flex items-center gap-2 px-3.5 py-1.5 text-xs sm:text-sm font-semibold rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-stone-900 text-white shadow-xs'
                      : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                  <span>{item.label}</span>
                  {item.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${
                        isActive
                          ? 'bg-stone-800 text-emerald-300'
                          : 'bg-stone-200 text-stone-700'
                      }`}
                    >
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Quick Account Context Pill on the right */}
          <div className="hidden md:flex items-center gap-2 text-xs text-stone-500 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>{accountInfo.subLabel}</span>
          </div>
        </div>
      </div>
    </header>
  );
};
