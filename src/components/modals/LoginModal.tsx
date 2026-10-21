import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  User,
  Lock,
  LogOut,
  CheckCircle2,
  AlertCircle,
  Mail,
  Building,
  Briefcase,
  LogIn,
  UserPlus,
  KeyRound,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserAccount, DEMO_USERS } from '../../types/mediaAsset';
import {
  signInWithEmail,
  registerWithEmail,
  signOutFromFirebase,
} from '../../services/firebase';

interface LoginModalProps {
  currentUser: UserAccount;
  initialMode?: 'client' | 'administrator' | 'signin' | 'register';
  onLogin: (user: UserAccount) => void;
  onClose: () => void;
  onOpenManageClients?: () => void;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  currentUser,
  initialMode = 'signin',
  onLogin,
  onClose,
  onOpenManageClients,
}) => {
  const [modalMode, setModalMode] = useState<'signin' | 'register'>(
    initialMode === 'register' ? 'register' : 'signin'
  );

  const [activeTab, setActiveTab] = useState<'client' | 'administrator'>(
    initialMode === 'administrator' ? 'administrator' : 'client'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [authError, setAuthError] = useState<string>('');
  const [authSuccess, setAuthSuccess] = useState<string>('');

  // Sign In Form fields - STRICTLY EMPTY BY DEFAULT
  const [email, setEmail] = useState<string>('');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Register Form fields - STRICTLY EMPTY BY DEFAULT
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regOrganization, setRegOrganization] = useState<string>('');
  const [regDesignation, setRegDesignation] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);

  const isAdmin =
    currentUser.role === 'administrator' &&
    currentUser.email?.toLowerCase().trim() === 'admin@blaze.com.pk';

  const handleTabSwitch = (tab: 'client' | 'administrator') => {
    setActiveTab(tab);
    setEmail('');
    setPassword('');
    setAuthError('');
    setAuthSuccess('');
  };

  // Handle Email & Password Sign-in
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setAuthError('Please enter both your email and password.');
      return;
    }

    setIsLoading(true);
    setAuthError('');
    setAuthSuccess('');

    const cleanEmail = email.toLowerCase().trim();

    if (activeTab === 'administrator' && cleanEmail !== 'admin@blaze.com.pk') {
      setActiveTab('client');
    }

    try {
      const account = await signInWithEmail(cleanEmail, password);
      onLogin(account);
      setAuthSuccess(
        account.role === 'administrator'
          ? `Administrator authenticated: ${account.name}`
          : `Client authenticated: ${account.name} (${account.organization})`
      );
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (err: any) {
      console.warn('Sign-in attempt notice, verifying credentials with backend fallback:', err.message);

      // Verify via backend server credentials API fallback
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            onLogin(data.user);
            setAuthSuccess(data.message || `Welcome, ${data.user.name}`);
            setTimeout(() => {
              onClose();
            }, 700);
            return;
          }
        } else {
          const errData = await resp.json().catch(() => ({}));
          setAuthError(errData.error || err.message || 'Invalid email or password.');
          setIsLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('Backend login fallback notice:', apiErr);
      }

      // Check credentials for admin fallback
      if (cleanEmail === 'admin@blaze.com.pk') {
        if (password === 'blaze@admin2026') {
          onLogin(DEMO_USERS.administrator);
          setAuthSuccess('Administrator authenticated: Engr. Tariq Latif');
          setTimeout(() => onClose(), 700);
          return;
        } else {
          setAuthError('Invalid password for administrator account.');
          setIsLoading(false);
          return;
        }
      }

      setAuthError(err.message || 'Invalid credentials. Please verify your email and password.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle New Client Registration
  // Every newly registered user receives the Client role automatically.
  // Users can never select, assign, or grant themselves administrator privileges.
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthSuccess('');

    if (!regName.trim()) {
      setAuthError('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setAuthError('Please enter your email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setAuthError('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    const cleanEmail = regEmail.toLowerCase().trim();

    try {
      const account = await registerWithEmail({
        name: regName.trim(),
        email: cleanEmail,
        password: regPassword,
        organization: regOrganization.trim() || 'Advertiser Agency Client',
        designation: regDesignation.trim() || 'Media Planning Executive',
      });

      onLogin(account);
      setAuthSuccess(`Client account created successfully! Welcome, ${account.name}.`);
      setTimeout(() => {
        onClose();
      }, 700);
    } catch (fbErr: any) {
      console.warn('Firebase registration notice:', fbErr.message);

      if (fbErr.code === 'auth/email-already-in-use') {
        setAuthError('An account with this email already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      }

      // Backend fallback
      try {
        const resp = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: regName.trim(),
            email: cleanEmail,
            organization: regOrganization.trim() || 'Advertiser Agency Client',
            designation: regDesignation.trim() || 'Media Planning Executive',
          }),
        });

        if (resp.ok) {
          const data = await resp.json();
          const fallbackClient: UserAccount = {
            id: data.user?.id || `usr_client_${Date.now().toString().slice(-6)}`,
            email: cleanEmail,
            name: regName.trim(),
            role: 'client',
            organization: regOrganization.trim() || 'Advertiser Agency Client',
            designation: regDesignation.trim() || 'Media Planning Executive',
            permissions: DEMO_USERS.client.permissions,
          };
          onLogin(fallbackClient);
          setAuthSuccess(`Client account registered! Welcome, ${fallbackClient.name}.`);
          setTimeout(() => onClose(), 700);
          return;
        }
      } catch {}

      setAuthError(fbErr.message || 'Registration failed. Please check your network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  // Sign out
  const handleSignOut = async () => {
    setIsLoading(true);
    setAuthError('');
    setAuthSuccess('');
    try {
      await signOutFromFirebase();
      onLogin(DEMO_USERS.client);
      setAuthSuccess('Signed out successfully.');
      setTimeout(() => onClose(), 600);
    } catch (err: any) {
      console.error('Sign out error:', err);
      setAuthError(err.message || 'Error signing out.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 md:p-6 overflow-y-auto select-none">
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl w-full max-w-lg flex flex-col overflow-hidden text-slate-200 text-xs my-auto animate-in fade-in zoom-in-95 duration-150">
        {/* Windows Title Bar Header */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-6 h-6 rounded flex items-center justify-center text-xs font-bold ${
                isAdmin ? 'bg-amber-500 text-slate-950' : 'bg-blue-600 text-white'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
            </div>
            <div>
              <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
                <span>Blaze OOH Authentication Desk</span>
              </h2>
              <span className="text-[11px] text-slate-400 font-mono">
                http://app2.blaze.com.pk/ · Windows Enterprise
              </span>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-md transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 md:p-6 space-y-4">
          {/* Active Session Status Card */}
          <div
            className={`p-3.5 rounded-lg border ${
              isAdmin
                ? 'bg-amber-950/25 border-amber-500/50 text-slate-100'
                : 'bg-slate-950/70 border-slate-800 text-slate-300'
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="space-y-0.5">
                <span className="text-[10px] text-slate-400 uppercase font-mono font-semibold block">
                  Current Session
                </span>
                <div className="flex items-center gap-1.5 font-bold text-xs">
                  {isAdmin ? (
                    <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                  ) : (
                    <User className="w-4 h-4 text-blue-400 shrink-0" />
                  )}
                  <span>{currentUser.name}</span>
                </div>
                <div className="text-[11px] text-slate-400">{currentUser.email}</div>
                <div className="text-[11px] text-slate-400">{currentUser.organization}</div>
              </div>

              <div className="flex flex-col items-end gap-1.5">
                <span
                  className={`px-2 py-0.5 rounded font-mono text-[10px] font-bold uppercase border ${
                    isAdmin
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                      : 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  }`}
                >
                  {isAdmin ? 'ADMINISTRATOR' : 'CLIENT ROLE'}
                </span>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={isLoading}
                  className="text-[10px] text-red-400 hover:text-red-300 hover:underline flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3 h-3" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

            <div className="mt-2.5 pt-2 border-t border-slate-800/80 text-[11px]">
              {isAdmin ? (
                <div className="flex items-center justify-between">
                  <div className="text-emerald-400 flex items-center gap-1.5 font-medium">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>Administrator: Full inventory, booking desk, and client management.</span>
                  </div>
                  {onOpenManageClients && (
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenManageClients();
                      }}
                      className="text-xs text-amber-400 hover:underline font-semibold ml-2 cursor-pointer shrink-0"
                    >
                      Manage Clients →
                    </button>
                  )}
                </div>
              ) : (
                <div className="text-slate-400 flex items-center gap-1.5 font-medium">
                  <CheckCircle2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                  <span>Client Role: Browse inventory, build media proposals, and submit booking requests.</span>
                </div>
              )}
            </div>
          </div>

          {/* Feedback Banners */}
          {authError && (
            <div className="p-3 bg-red-950/60 border border-red-800 text-red-300 rounded text-xs flex items-start gap-2 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{authError}</div>
            </div>
          )}

          {authSuccess && (
            <div className="p-3 bg-emerald-950/60 border border-emerald-800 text-emerald-300 rounded text-xs flex items-start gap-2 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{authSuccess}</div>
            </div>
          )}

          {/* Top-Level Mode Selector: Sign In vs Create Account */}
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setModalMode('signin');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalMode === 'signin'
                  ? 'bg-slate-800 text-amber-400 shadow-sm border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setModalMode('register');
                setAuthError('');
                setAuthSuccess('');
              }}
              className={`py-1.5 rounded-md font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                modalMode === 'register'
                  ? 'bg-blue-600 text-white shadow-sm border border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account / Sign Up</span>
            </button>
          </div>

          {/* MODE 1: SIGN IN FORM */}
          {modalMode === 'signin' && (
            <div className="space-y-3 pt-1">
              {/* Tab Selector: Client Login vs Administrator Login */}
              <div className="flex items-center bg-slate-950 p-1 rounded-lg border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleTabSwitch('client')}
                  className={`flex-1 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'client'
                      ? 'bg-slate-800 text-blue-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Client Login</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch('administrator')}
                  className={`flex-1 py-1.5 rounded-md font-semibold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                    activeTab === 'administrator'
                      ? 'bg-slate-800 text-amber-400 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  <span>Administrator Login</span>
                </button>
              </div>

              {/* Sign In Form - Clean, empty fields, password hidden by default with optional eye icon */}
              <form onSubmit={handleEmailSignIn} className="space-y-2.5">
                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">
                    {activeTab === 'administrator' ? 'Administrator Email' : 'Email Address'}
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-9 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className={`w-full py-2 font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer ${
                      activeTab === 'administrator'
                        ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                        : 'bg-blue-600 hover:bg-blue-500 text-white'
                    }`}
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>
                      {isLoading
                        ? 'Authenticating...'
                        : activeTab === 'administrator'
                        ? 'Sign In as Administrator'
                        : 'Sign In as Client'}
                    </span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* MODE 2: REGISTER NEW CLIENT FORM */}
          {modalMode === 'register' && (
            <div className="space-y-3 pt-1">
              <div className="p-2.5 rounded-lg bg-blue-950/25 border border-blue-500/40 text-blue-200 text-[11px] flex items-start gap-2">
                <User className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-0.5" />
                <div>
                  <strong className="text-white block">Client Role by Default:</strong>
                  All newly registered users are provisioned with the Client advertiser role automatically.
                  Administrator privileges cannot be self-selected.
                </div>
              </div>

              <form onSubmit={handleRegister} className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="e.g. Bilal Siddiqui"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Email Address *</label>
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="e.g. bilal@agency.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Organization</label>
                    <input
                      type="text"
                      value={regOrganization}
                      onChange={(e) => setRegOrganization(e.target.value)}
                      placeholder="e.g. Wavemaker / Unilever"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Designation</label>
                    <input
                      type="text"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      placeholder="e.g. Media Planning Director"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Password (min 6) *</label>
                    <div className="relative">
                      <input
                        type={showRegPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Enter password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-300 mb-0.5">Confirm Password *</label>
                    <div className="relative">
                      <input
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Confirm password"
                        className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-2.5 pr-8 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                        title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <UserPlus className="w-3.5 h-3.5" />
                    <span>{isLoading ? 'Creating Client Account...' : 'Register as Client'}</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Close button footer */}
          <div className="pt-2 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
