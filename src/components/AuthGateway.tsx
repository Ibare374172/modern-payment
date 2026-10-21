import React, { useState } from 'react';
import { UserRole, StaffAccount, Customer, UserProfile, RegisteredAccount } from '../types';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  Eye, 
  EyeOff, 
  User, 
  AlertCircle, 
  Phone, 
  LogIn, 
  UserPlus, 
  BadgeCheck,
  CheckCircle2
} from 'lucide-react';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  updateProfile 
} from '../firebase';
import { saveUserProfileToDb, saveCustomerToDb } from '../services/dbService';
import { syncUserToPostgres } from '../services/realtimePostgres';
import { 
  saveRegisteredAccount, 
  verifyRegisteredAccount, 
  findRegisteredAccount 
} from '../utils/storage';
import { sounds } from '../utils/audio';

interface AuthGatewayProps {
  onAuthenticated: (user: {
    uid: string;
    email: string;
    displayName: string;
    role: UserRole;
    phone?: string;
  }) => void;
  staffAccounts: StaffAccount[];
  customers: Customer[];
  businessName: string;
  tillNumber: string;
}

export const AuthGateway: React.FC<AuthGatewayProps> = ({
  onAuthenticated,
  businessName,
  tillNumber,
}) => {
  const [authMode, setAuthMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');

  // Login Form State
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Register Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regPhone, setRegPhone] = useState('+254 7');
  const [regRole, setRegRole] = useState<UserRole>('CASHIER');

  // Status & Error
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Handle Email/Password Login (Production)
  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) return;

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sounds.playClick();

    const cleanEmail = loginEmail.trim().toLowerCase();

    // Check if account matches registered account registry first or as fallback
    const localMatch = verifyRegisteredAccount(cleanEmail, loginPassword);

    try {
      // Try Firebase Auth first
      let firebaseUser = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, loginPassword);
        firebaseUser = userCredential.user;
      } catch (fbErr: any) {
        // If Firebase provider isn't enabled or client offline, but local credentials match, authenticate!
        if (localMatch) {
          sounds.playPaymentSuccess();
          onAuthenticated({
            uid: localMatch.uid,
            email: localMatch.email,
            displayName: localMatch.name,
            role: localMatch.role,
            phone: localMatch.phone,
          });
          return;
        }
        throw fbErr;
      }

      if (firebaseUser) {
        sounds.playPaymentSuccess();
        // Determine role: use saved account role if exists, or check administrative accounts
        let role: UserRole = localMatch?.role || 'CASHIER';
        if (!localMatch) {
          if (cleanEmail.includes('manager') || cleanEmail.includes('admin') || cleanEmail.includes('james') || cleanEmail.includes('hillary') || cleanEmail.includes('dennis') || cleanEmail.includes('njuguna')) {
            role = 'MANAGER';
          } else if (cleanEmail.includes('research') || cleanEmail.includes('otieno') || cleanEmail.includes('edu')) {
            role = 'RESEARCHER';
          } else if (cleanEmail.includes('cust') || cleanEmail.includes('wanjiku')) {
            role = 'CUSTOMER';
          }
        }

        onAuthenticated({
          uid: firebaseUser.uid,
          email: firebaseUser.email || cleanEmail,
          displayName: firebaseUser.displayName || localMatch?.name || cleanEmail.split('@')[0],
          role,
          phone: localMatch?.phone,
        });
      }
    } catch (err: unknown) {
      console.warn('Login error:', err);
      if (localMatch) {
        sounds.playPaymentSuccess();
        onAuthenticated({
          uid: localMatch.uid,
          email: localMatch.email,
          displayName: localMatch.name,
          role: localMatch.role,
          phone: localMatch.phone,
        });
        return;
      }

      const errorMsg = err instanceof Error ? err.message : String(err);
      if (errorMsg.includes('auth/invalid-credential') || errorMsg.includes('auth/wrong-password') || errorMsg.includes('auth/user-not-found')) {
        setErrorMessage('Invalid email or password. Please verify your credentials or create a new account.');
      } else if (errorMsg.includes('auth/invalid-email')) {
        setErrorMessage('Please enter a valid email address.');
      } else {
        setErrorMessage('Could not sign in with these credentials. Please check your password or create a new account.');
      }
      sounds.playWarning();
    } finally {
      setIsLoading(false);
    }
  };

  // 2. Handle New User Registration (Production)
  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regPassword || !regName) return;

    if (regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanName = regName.trim();
    const cleanPhone = regPhone.trim();

    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sounds.playClick();

    let uid = `USR-${Date.now().toString(36).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    try {
      // 1. Attempt Firebase Auth registration
      try {
        const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, regPassword);
        if (userCredential.user) {
          uid = userCredential.user.uid;
          await updateProfile(userCredential.user, {
            displayName: cleanName,
          }).catch(e => console.warn('Profile name update note:', e));
        }
      } catch (fbErr: any) {
        if (fbErr?.code === 'auth/email-already-in-use') {
          const existing = findRegisteredAccount(cleanEmail);
          if (existing && existing.password === regPassword) {
            sounds.playPaymentSuccess();
            onAuthenticated({
              uid: existing.uid,
              email: existing.email,
              displayName: existing.name,
              role: existing.role,
              phone: existing.phone,
            });
            return;
          }
          setErrorMessage('An account with this email already exists. Please switch to "Sign In" to access your workspace.');
          setIsLoading(false);
          sounds.playWarning();
          return;
        }
      }

      // 2. Build User Profile & Registered Account Record
      const initials = cleanName.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'ZM';
      const badgeId = regRole === 'CASHIER' 
        ? `CSH-${Math.floor(100 + Math.random() * 900)}` 
        : regRole === 'MANAGER' 
          ? `MGR-${Math.floor(100 + Math.random() * 900)}` 
          : undefined;

      const profile: UserProfile = {
        uid,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: regRole,
        badgeId,
        assignedTill: regRole === 'CASHIER' ? tillNumber : undefined,
        createdAt: new Date().toISOString(),
        avatarInitials: initials,
      };

      const accountRecord: RegisteredAccount = {
        uid,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: regRole,
        password: regPassword,
        badgeId,
        assignedTill: regRole === 'CASHIER' ? tillNumber : undefined,
        createdAt: new Date().toISOString(),
        provider: 'password',
      };

      // 3. Persist to local accounts store
      saveRegisteredAccount(accountRecord);

      // 4. Save to Cloud Firestore
      await saveUserProfileToDb(profile);

      // 5. Replicate to PostgreSQL user registry
      await syncUserToPostgres({
        uid,
        email: cleanEmail,
        displayName: cleanName,
        role: regRole,
      });

      // 6. If registered role is CUSTOMER, initialize customer wallet & points record
      if (regRole === 'CUSTOMER') {
        const newCustomer: Customer = {
          id: `CUST-${uid.slice(-4)}`,
          name: cleanName,
          phone: cleanPhone,
          email: cleanEmail,
          totalSpent: 0,
          transactionCount: 0,
          loyaltyPoints: 100, // Welcome loyalty points
          lastVisit: 'Just registered',
          walletBalance: 2500, // Initial balance
          tier: 'BRONZE',
          memberSince: new Date().toLocaleDateString('en-KE', { month: 'short', year: 'numeric' }),
          avatarInitials: initials,
        };
        await saveCustomerToDb(newCustomer);
      }

      sounds.playPaymentSuccess();
      setSuccessMessage('Account created successfully! Entering workspace...');

      setTimeout(() => {
        onAuthenticated({
          uid,
          email: cleanEmail,
          displayName: cleanName,
          role: regRole,
          phone: cleanPhone,
        });
      }, 350);

    } catch (err: unknown) {
      console.error('Registration error:', err);
      const fallbackAccount: RegisteredAccount = {
        uid,
        name: cleanName,
        email: cleanEmail,
        phone: cleanPhone,
        role: regRole,
        password: regPassword,
        createdAt: new Date().toISOString(),
        provider: 'password',
      };
      saveRegisteredAccount(fallbackAccount);
      sounds.playPaymentSuccess();
      onAuthenticated({
        uid,
        email: cleanEmail,
        displayName: cleanName,
        role: regRole,
        phone: cleanPhone,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 3. Handle Google SSO Sign-in / Sign-up (Production)
  const handleGoogleAuth = async (desiredRole?: UserRole) => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    sounds.playClick();

    try {
      const userCredential = await signInWithPopup(auth, googleProvider);
      const user = userCredential.user;
      sounds.playPaymentSuccess();

      const userEmail = (user.email || 'user@mpesa.ke').toLowerCase();
      const existing = findRegisteredAccount(userEmail);

      let finalRole: UserRole = desiredRole || existing?.role || (userEmail.includes('hillary') || userEmail.includes('dennis') || userEmail.includes('njuguna') ? 'MANAGER' : 'CASHIER');

      const cleanName = user.displayName || userEmail.split('@')[0] || 'Authorized User';
      const initials = cleanName.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || 'GU';

      const accountRecord: RegisteredAccount = {
        uid: user.uid,
        name: cleanName,
        email: userEmail,
        phone: user.phoneNumber || existing?.phone || '+254 700 000 000',
        role: finalRole,
        createdAt: new Date().toISOString(),
        provider: 'google',
      };

      saveRegisteredAccount(accountRecord);

      const profile: UserProfile = {
        uid: user.uid,
        name: cleanName,
        email: userEmail,
        phone: accountRecord.phone,
        role: finalRole,
        badgeId: finalRole === 'CASHIER' ? `CSH-${user.uid.slice(-3)}` : finalRole === 'MANAGER' ? `MGR-01` : undefined,
        assignedTill: finalRole === 'CASHIER' ? tillNumber : undefined,
        createdAt: new Date().toISOString(),
        avatarInitials: initials,
      };

      saveUserProfileToDb(profile).catch(e => console.warn('Firestore profile note:', e));
      syncUserToPostgres({
        uid: user.uid,
        email: userEmail,
        displayName: cleanName,
        role: finalRole,
      }).catch(e => console.warn('Postgres user note:', e));

      onAuthenticated({
        uid: user.uid,
        email: userEmail,
        displayName: cleanName,
        role: finalRole,
        phone: accountRecord.phone,
      });
    } catch (err: any) {
      console.warn('Google sign-in completed or cancelled:', err);
      if (err?.code !== 'auth/popup-closed-by-user') {
        setErrorMessage('Google Authentication was cancelled or could not complete.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-stone-100 flex flex-col justify-between p-4 sm:p-6 lg:p-8 font-sans">
      
      {/* Top Brand Bar */}
      <div className="max-w-6xl mx-auto w-full flex items-center justify-between py-2">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-stone-950 flex items-center justify-center font-black text-base shadow-sm">
            ZM
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white block">
              {businessName}
            </span>
            <span className="text-[11px] text-stone-400 font-mono">
              Buy Goods Till {tillNumber} • Production Enterprise Gateway
            </span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs font-semibold">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span>Daraja API & Production Security Switch</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="max-w-xl mx-auto w-full my-6 sm:my-8">
        <div className="bg-white text-stone-900 rounded-3xl shadow-2xl border border-stone-200/80 overflow-hidden">
          
          {/* Header Banner */}
          <div className="bg-stone-900 text-white p-6 sm:p-7 border-b border-stone-800 relative overflow-hidden">
            <div className="absolute right-0 top-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none"></div>

            <div className="relative z-10">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Secure Access
                </span>
                <span className="text-xs text-stone-400">
                  Role-Protected Enterprise Access
                </span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-white mt-2">
                Zawadi Mart Access Portal
              </h1>
              <p className="text-xs text-stone-300 mt-1">
                Sign in to your authorized workspace or create a new operational account.
              </p>
            </div>

            {/* Navigation Tabs (Sign In / Create Account) */}
            <div className="grid grid-cols-2 gap-1.5 p-1 bg-stone-950/80 rounded-2xl border border-stone-800 mt-5">
              <button
                type="button"
                id="auth-tab-login"
                onClick={() => {
                  setAuthMode('LOGIN');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  sounds.playClick();
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'LOGIN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Sign In</span>
              </button>
              <button
                type="button"
                id="auth-tab-register"
                onClick={() => {
                  setAuthMode('REGISTER');
                  setErrorMessage(null);
                  setSuccessMessage(null);
                  sounds.playClick();
                }}
                className={`py-2.5 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer ${
                  authMode === 'REGISTER'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-stone-400 hover:text-white'
                }`}
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>Create Account</span>
              </button>
            </div>
          </div>

          {/* Form Body */}
          <div className="p-6 sm:p-8 space-y-5">
            
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{errorMessage}</div>
              </div>
            )}

            {/* Success Message Alert */}
            {successMessage && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-300 rounded-2xl text-emerald-950 text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <div className="flex-1 font-medium">{successMessage}</div>
              </div>
            )}

            {/* TAB 1: SIGN IN */}
            {authMode === 'LOGIN' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="njugunadennis73@gmail.com"
                      value={loginEmail}
                      onChange={e => setLoginEmail(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="text-xs font-bold text-stone-700">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => setAuthMode('REGISTER')}
                      className="text-[11px] text-emerald-700 hover:underline font-semibold"
                    >
                      Need an account? Register
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={e => setLoginPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-3 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  id="auth-submit-login-btn"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  <LogIn className="w-4 h-4" />
                  <span>{isLoading ? 'Verifying Credentials...' : 'Sign In to Workspace'}</span>
                </button>

                <div className="relative my-4">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-stone-400 font-medium">Or continue with</span>
                  </div>
                </div>

                {/* Google SSO Button */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth()}
                  disabled={isLoading}
                  className="w-full py-3 rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign in with Google Single Sign-On</span>
                </button>
              </form>
            )}

            {/* TAB 2: CREATE ACCOUNT (REGISTRATION) */}
            {authMode === 'REGISTER' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-4">
                
                {/* Information Callout */}
                <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-[11px] text-emerald-900">
                  <BadgeCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span>
                    New accounts are immediately active. Choose your workspace role below to configure your permissions.
                  </span>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Full Legal / Official Name *
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Dennis Njuguna"
                      value={regName}
                      onChange={e => setRegName(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      Email Address *
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        required
                        placeholder="njugunadennis73@gmail.com"
                        value={regEmail}
                        onChange={e => setRegEmail(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-medium"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-700 block mb-1">
                      M-Pesa Mobile Number *
                    </label>
                    <div className="relative">
                      <Phone className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="tel"
                        required
                        placeholder="+254 7XX XXX XXX"
                        value={regPhone}
                        onChange={e => setRegPhone(e.target.value)}
                        className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1">
                    Password (Min 6 Characters) *
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      placeholder="Create secure password"
                      value={regPassword}
                      onChange={e => setRegPassword(e.target.value)}
                      className="w-full pl-10 pr-10 py-2.5 rounded-2xl border border-stone-300 text-xs text-stone-900 outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Role Selection */}
                <div>
                  <label className="text-xs font-bold text-stone-700 block mb-1.5">
                    Select Your Operational Account Role *
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {[
                      { role: 'CASHIER' as UserRole, label: 'Cashier (Till POS)', desc: 'Front desk sales, STK push & verify' },
                      { role: 'MANAGER' as UserRole, label: 'Store Manager', desc: 'Financial KPIs, audits & settings' },
                      { role: 'CUSTOMER' as UserRole, label: 'Customer Wallet', desc: 'Pay till, earn points & e-receipts' },
                      { role: 'RESEARCHER' as UserRole, label: 'Researcher', desc: 'TAM simulation & academic study' },
                    ].map(r => (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => {
                          setRegRole(r.role);
                          sounds.playClick();
                        }}
                        className={`p-2.5 rounded-2xl text-left border text-xs transition-all cursor-pointer ${
                          regRole === r.role
                            ? 'border-emerald-600 bg-emerald-50 text-emerald-950 font-bold ring-1 ring-emerald-600'
                            : 'border-stone-200 bg-white hover:border-stone-300 text-stone-700'
                        }`}
                      >
                        <div className="font-bold flex items-center justify-between">
                          <span>{r.label}</span>
                          {regRole === r.role && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-700" />}
                        </div>
                        <div className="text-[10px] text-stone-500 mt-0.5">{r.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Primary Register Button */}
                <button
                  type="submit"
                  disabled={isLoading}
                  id="auth-submit-register-btn"
                  className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-sm transition-all disabled:opacity-60 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>{isLoading ? 'Creating Account...' : 'Complete Registration & Enter System'}</span>
                </button>

                <div className="relative my-3">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-stone-200"></div>
                  </div>
                  <div className="relative flex justify-center text-xs">
                    <span className="px-3 bg-white text-stone-400 font-medium">Or 1-Click Register</span>
                  </div>
                </div>

                {/* 1-Click Google Sign-up with selected role */}
                <button
                  type="button"
                  onClick={() => handleGoogleAuth(regRole)}
                  disabled={isLoading}
                  className="w-full py-2.5 rounded-2xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 font-bold text-xs flex items-center justify-center gap-2 transition-colors shadow-2xs cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                  <span>Sign up as {regRole} with Google Single Sign-On</span>
                </button>
              </form>
            )}

          </div>

          {/* Card Footer */}
          <div className="bg-stone-50 px-6 sm:px-8 py-3.5 border-t border-stone-200/80 flex items-center justify-between text-[11px] text-stone-500">
            <div className="flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              <span>TLS 256-bit Encrypted Enterprise Session</span>
            </div>
            <span>Zawadi Mart Ltd</span>
          </div>
        </div>
      </div>

      {/* Page Footer */}
      <div className="max-w-6xl mx-auto w-full text-center text-xs text-stone-500 py-2">
        <p>
          Mobile Payments in Modern Businesses • Cloud Database & Safaricom Daraja API Gateway Switch
        </p>
      </div>
    </div>
  );
};
