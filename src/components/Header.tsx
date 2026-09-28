import React from 'react';
import { UserRole, BusinessProfile } from '../types';
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
  CheckCircle2,
  Zap
} from 'lucide-react';
import { sounds } from '../utils/audio';
import { User } from 'firebase/auth';

interface HeaderProps {
  activeTab: 'cashier' | 'dashboard' | 'transactions' | 'customer' | 'research';
  setActiveTab: (tab: 'cashier' | 'dashboard' | 'transactions' | 'customer' | 'research') => void;
  activeRole: UserRole;
  setActiveRole: (role: UserRole) => void;
  business: BusinessProfile;
  soundEnabled: boolean;
  setSoundEnabled: (enabled: boolean) => void;
  todayCount: number;
  dbConnected: boolean;
  currentUser: User | null;
  onLogin: () => void;
  onLogout: () => void;
  onOpenDarajaConfig?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  activeRole,
  setActiveRole,
  business,
  soundEnabled,
  setSoundEnabled,
  todayCount,
  dbConnected,
  currentUser,
  onLogin,
  onLogout,
  onOpenDarajaConfig,
}) => {
  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sounds.enabled = next;
    if (next) sounds.playPaymentSuccess();
  };

  interface NavItem {
    id: 'cashier' | 'dashboard' | 'transactions' | 'customer' | 'research';
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    role?: UserRole;
    badge?: string;
  }

  const navItems: NavItem[] = [
    { id: 'cashier', label: 'Cashier Terminal', icon: Store, role: 'CASHIER', badge: 'Live POS' },
    { id: 'dashboard', label: 'Manager Analytics', icon: BarChart3, role: 'MANAGER' },
    { id: 'transactions', label: 'Transactions & Audit', icon: Receipt, badge: `${todayCount}` },
    { id: 'customer', label: 'Customer Pay App', icon: Smartphone, role: 'CUSTOMER', badge: 'Payer View' },
    { id: 'research', label: 'Research & TAM Study', icon: BookOpenCheck, role: 'RESEARCHER', badge: 'Ch. 1-5' },
  ];

  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-30 shadow-xs">
      {/* Top Banner with Business Identity & Live Channel Credentials */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between py-3 gap-3 border-b border-stone-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 flex items-center justify-center text-white shadow-sm font-bold text-lg tracking-tight">
              MP
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-lg font-bold text-stone-900 tracking-tight flex items-center gap-1.5">
                  {business.name}
                </h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Active Gateway
                </span>
                {/* Database connection badge */}
                <span 
                  title="Persistent Cloud Database linked and active"
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                    dbConnected 
                      ? 'bg-sky-50 text-sky-800 border-sky-200' 
                      : 'bg-stone-50 text-stone-600 border-stone-200'
                  }`}
                >
                  <Database className="w-3 h-3 text-sky-600" />
                  <span>{dbConnected ? 'Database Connected' : 'Connecting...'}</span>
                </span>
              </div>
              <p className="text-xs text-stone-500 flex items-center gap-2 mt-0.5 flex-wrap">
                <span>Till: <strong className="text-stone-800 font-mono">{business.tillNumber}</strong></span>
                <span>•</span>
                <span>Paybill: <strong className="text-stone-800 font-mono">{business.paybillNumber}</strong> ({business.accountRef})</span>
                <span>•</span>
                <span>{business.branch}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 self-end md:self-auto flex-wrap">
            {/* Audio chime toggle */}
            <button
              onClick={toggleSound}
              id="sound-toggle-btn"
              title={soundEnabled ? 'M-Pesa payment chime enabled' : 'Payment chime muted'}
              className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1.5 transition-colors ${
                soundEnabled 
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
                  : 'bg-stone-50 border-stone-200 text-stone-500'
              }`}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4 text-emerald-600" /> : <VolumeX className="w-4 h-4 text-stone-400" />}
              <span className="hidden sm:inline">{soundEnabled ? 'Chime On' : 'Muted'}</span>
            </button>

            {/* Quick Role Switcher */}
            <div className="flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
              <span className="text-[11px] font-medium text-stone-500 px-2">Role:</span>
              {(['CASHIER', 'MANAGER', 'CUSTOMER', 'RESEARCHER'] as UserRole[]).map(role => (
                <button
                  key={role}
                  id={`role-btn-${role.toLowerCase()}`}
                  onClick={() => {
                    setActiveRole(role);
                    if (role === 'CASHIER') setActiveTab('cashier');
                    else if (role === 'MANAGER') setActiveTab('dashboard');
                    else if (role === 'CUSTOMER') setActiveTab('customer');
                    else if (role === 'RESEARCHER') setActiveTab('research');
                    sounds.playClick();
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                    activeRole === role
                      ? 'bg-white text-stone-900 shadow-xs font-semibold'
                      : 'text-stone-600 hover:text-stone-900'
                  }`}
                >
                  {role === 'CASHIER' ? 'Cashier' : role === 'MANAGER' ? 'Manager' : role === 'CUSTOMER' ? 'Customer' : 'Research'}
                </button>
              ))}
            </div>

            {/* Daraja STK Gateway Configuration Trigger */}
            {onOpenDarajaConfig && (
              <button
                type="button"
                id="daraja-header-config-btn"
                onClick={onOpenDarajaConfig}
                title="Configure Safaricom Daraja API Keys & Push Target"
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-xs font-semibold text-emerald-800 transition-colors shadow-2xs"
              >
                <Zap className="w-3.5 h-3.5 text-emerald-600" />
                <span className="hidden sm:inline">STK Gateway</span>
              </button>
            )}

            {/* Cloud Firestore Live DB Indicator */}
            <div 
              title="Cloud Firestore Real-time Database: Transactions, Customers, Businesses, Settings, Audits & Verification logs live sync"
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-indigo-200 bg-indigo-50 text-xs font-semibold text-indigo-900 shadow-2xs"
            >
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              <span className="hidden md:inline">DB Synced</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>

            {/* Auth Pill */}
            {currentUser ? (
              <div className="flex items-center gap-2 bg-stone-50 border border-stone-200 rounded-lg py-1 px-2.5 text-xs">
                {currentUser.photoURL ? (
                  <img 
                    src={currentUser.photoURL} 
                    alt={currentUser.displayName || 'User'} 
                    className="w-5 h-5 rounded-full object-cover" 
                  />
                ) : (
                  <UserIcon className="w-4 h-4 text-stone-600" />
                )}
                <span className="font-medium text-stone-800 max-w-[120px] truncate hidden sm:inline">
                  {currentUser.displayName || currentUser.email}
                </span>
                <button
                  onClick={onLogout}
                  title="Sign out"
                  className="text-stone-400 hover:text-rose-600 ml-1"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={onLogin}
                id="staff-signin-btn"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-xs font-semibold text-stone-700 shadow-2xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5 text-emerald-600" />
                <span>Sign In</span>
              </button>
            )}
          </div>
        </div>

        {/* Primary Navigation Tabs */}
        <nav className="flex space-x-1 overflow-x-auto py-2 scrollbar-none" aria-label="Tabs">
          {navItems.map(item => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                id={`tab-${item.id}`}
                onClick={() => {
                  setActiveTab(item.id);
                  if (item.role) setActiveRole(item.role);
                  sounds.playClick();
                }}
                className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-stone-900 text-white shadow-xs'
                    : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-stone-500'}`} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? 'bg-stone-800 text-stone-200'
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
      </div>
    </header>
  );
};
