import React, { useState } from 'react';
import {
  ShieldCheck,
  User,
  CheckCircle2,
  AlertCircle,
  Mail,
  KeyRound,
  Building,
  Briefcase,
  LogIn,
  UserPlus,
  Eye,
  EyeOff,
} from 'lucide-react';
import { UserAccount, DEMO_USERS } from '../../types/mediaAsset';
import {
  signInWithEmail,
  registerWithEmail,
} from '../../services/firebase';

interface StartingLoginWindowProps {
  onLogin: (user: UserAccount) => void;
}

export const StartingLoginWindow: React.FC<StartingLoginWindowProps> = ({
  onLogin,
}) => {
  // Top-level Mode: 'signin' or 'register'
  const [authMode, setAuthMode] = useState<'signin' | 'register'>('signin');

  // Sign In role selection: 'client' or 'administrator'
  const [selectedRole, setSelectedRole] = useState<'client' | 'administrator'>('client');

  // Sign In Fields (empty by default)
  const [signInEmail, setSignInEmail] = useState<string>('');
  const [signInPassword, setSignInPassword] = useState<string>('');

  // Register Fields (empty by default)
  const [regName, setRegName] = useState<string>('');
  const [regEmail, setRegEmail] = useState<string>('');
  const [regOrganization, setRegOrganization] = useState<string>('');
  const [regDesignation, setRegDesignation] = useState<string>('');
  const [regPassword, setRegPassword] = useState<string>('');
  const [regConfirmPassword, setRegConfirmPassword] = useState<string>('');

  // Password visibility toggles (hidden by default)
  const [showSignInPassword, setShowSignInPassword] = useState<boolean>(false);
  const [showRegPassword, setShowRegPassword] = useState<boolean>(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');

  // Switch role tab in Sign In mode (keeps fields empty)
  const handleSelectRole = (role: 'client' | 'administrator') => {
    setSelectedRole(role);
    setSignInEmail('');
    setSignInPassword('');
    setErrorMessage('');
    setSuccessMessage('');
  };

  // Email / Password Sign In
  const handleEmailSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signInEmail.trim() || !signInPassword) {
      setErrorMessage('Please provide both email and password.');
      return;
    }

    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    const cleanEmail = signInEmail.toLowerCase().trim();

    // Verify role expectation for administrator
    if (selectedRole === 'administrator' && cleanEmail !== 'admin@blaze.com.pk') {
      setErrorMessage(
        'Access Denied: Only the official administrator account can authenticate in Administrator mode.'
      );
      setIsLoading(false);
      return;
    }

    try {
      // First attempt real Firebase Authentication
      const account = await signInWithEmail(cleanEmail, signInPassword);
      setSuccessMessage(
        account.role === 'administrator'
          ? `Administrator authenticated: ${account.name}`
          : `Client authenticated: ${account.name}`
      );
      setTimeout(() => {
        onLogin(account);
      }, 700);
    } catch (fbErr: any) {
      console.warn('Firebase Auth sign in notice, verifying via authentication server:', fbErr.message);

      // Verify via backend server credentials API
      try {
        const resp = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: signInPassword }),
        });

        if (resp.ok) {
          const data = await resp.json();
          if (data.user) {
            setSuccessMessage(data.message || `Welcome, ${data.user.name}`);
            setTimeout(() => {
              onLogin(data.user);
            }, 700);
            return;
          }
        } else {
          const errData = await resp.json();
          setErrorMessage(errData.error || 'Invalid email or password.');
          setIsLoading(false);
          return;
        }
      } catch (apiErr) {
        console.warn('Backend auth fallback notice:', apiErr);
      }

      // Check credentials for admin fallback
      if (selectedRole === 'administrator' && cleanEmail === 'admin@blaze.com.pk') {
        if (signInPassword === 'blaze@admin2026') {
          setSuccessMessage('Administrator session activated for Engr. Tariq Latif.');
          setTimeout(() => {
            onLogin(DEMO_USERS.administrator);
          }, 600);
          return;
        } else {
          setErrorMessage('Invalid password for administrator account.');
          setIsLoading(false);
          return;
        }
      }

      setErrorMessage('Invalid email or password. Please verify your credentials or register an account.');
    } finally {
      setIsLoading(false);
    }
  };

  // User Registration Handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');

    if (!regName.trim()) {
      setErrorMessage('Please enter your full name.');
      return;
    }
    if (!regEmail.trim()) {
      setErrorMessage('Please enter your email address.');
      return;
    }
    if (!regPassword || regPassword.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setErrorMessage('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const cleanEmail = regEmail.toLowerCase().trim();

    try {
      // Register with Firebase Auth and Firestore with Client-by-default role
      const account = await registerWithEmail({
        name: regName.trim(),
        email: cleanEmail,
        password: regPassword,
        organization: regOrganization.trim() || 'Advertiser Agency Client',
        designation: regDesignation.trim() || 'Media Planning Executive',
      });

      setSuccessMessage(`Account created successfully! Welcome, ${account.name} (Client Role).`);
      setTimeout(() => {
        onLogin(account);
      }, 800);
    } catch (fbErr: any) {
      console.warn('Firebase registration notice:', fbErr.message);

      if (fbErr.code === 'auth/email-already-in-use') {
        setErrorMessage('An account with this email already exists. Please sign in instead.');
        setIsLoading(false);
        return;
      } else if (fbErr.code === 'auth/invalid-email') {
        setErrorMessage('Invalid email address format.');
        setIsLoading(false);
        return;
      } else if (fbErr.code === 'auth/weak-password') {
        setErrorMessage('Password is too weak. Please use at least 6 characters.');
        setIsLoading(false);
        return;
      }

      // Fallback to backend registration if Firebase client offline
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
          setSuccessMessage(`Registration successful! Welcome, ${fallbackClient.name}.`);
          setTimeout(() => {
            onLogin(fallbackClient);
          }, 800);
          return;
        }
      } catch (apiErr) {
        console.warn('Backend register fallback notice:', apiErr);
      }

      setErrorMessage(
        fbErr.message || 'Unable to register account. Please check your network connection.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center p-3 md:p-6 overflow-y-auto select-none">
      {/* Background Subtle Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-amber-900/15 via-slate-950 to-slate-950 pointer-events-none" />

      {/* Main Authentication Card */}
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-700/90 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-200 text-xs my-auto animate-in fade-in zoom-in-95 duration-200">
        {/* Windows Title Bar */}
        <div className="px-5 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-5 h-5 rounded bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center text-slate-950 font-black text-[11px] shadow-sm">
              B
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-slate-100 text-xs">Blaze OOH Media Asset Manager</span>
              <span className="text-[10px] text-amber-400 font-mono hidden sm:inline">
                http://app2.blaze.com.pk/
              </span>
            </div>
          </div>

          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Windows Enterprise</span>
          </div>
        </div>

        {/* Portal Branding Banner */}
        <div className="px-6 pt-5 pb-3 text-center space-y-1">
          <h1 className="text-xl font-extrabold text-white tracking-tight">
            {authMode === 'signin' ? 'Sign In to Blaze Outdoor Network' : 'Create New Client Account'}
          </h1>
          <p className="text-slate-400 text-xs max-w-md mx-auto leading-relaxed">
            {authMode === 'signin'
              ? 'Enterprise outdoor media inventory, audience profiling, and commercial booking desk across Pakistan.'
              : 'Register as an advertiser or media agency to explore sites, build proposals, and request bookings.'}
          </p>
        </div>

        {/* Sign In vs Create Account Toggle */}
        <div className="px-6 pt-1">
          <div className="grid grid-cols-2 gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => {
                setAuthMode('signin');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'signin'
                  ? 'bg-slate-800 text-amber-400 shadow-md border border-slate-700'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setAuthMode('register');
                setErrorMessage('');
                setSuccessMessage('');
              }}
              className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                authMode === 'register'
                  ? 'bg-blue-600 text-white shadow-md border border-blue-500'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <UserPlus className="w-4 h-4" />
              <span>Create Account / Sign Up</span>
            </button>
          </div>
        </div>

        {/* Feedback Banners */}
        <div className="px-6 pt-3 space-y-2">
          {errorMessage && (
            <div className="p-3 bg-red-950/70 border border-red-800 text-red-200 rounded-lg text-xs flex items-start gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 shrink-0 text-red-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3 bg-emerald-950/70 border border-emerald-800 text-emerald-200 rounded-lg text-xs flex items-start gap-2.5 animate-in fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400 mt-0.5" />
              <div className="flex-1 leading-relaxed">{successMessage}</div>
            </div>
          )}
        </div>

        {/* MODE 1: SIGN IN FORM */}
        {authMode === 'signin' && (
          <div className="p-6 pt-3 space-y-4">
            {/* Role Sub-Selector: Client vs Administrator */}
            <div className="grid grid-cols-2 gap-2 bg-slate-950 p-1.5 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => handleSelectRole('client')}
                className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 border ${
                  selectedRole === 'client'
                    ? 'bg-slate-800/90 border-blue-500/60 shadow-md text-white'
                    : 'bg-transparent border-transparent hover:bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <User className={`w-3.5 h-3.5 ${selectedRole === 'client' ? 'text-blue-400' : 'text-slate-500'}`} />
                    <span>Client Login</span>
                  </div>
                  {selectedRole === 'client' && <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />}
                </div>
                <span className="text-[10px] text-slate-400">Advertisers & Agencies</span>
              </button>

              <button
                type="button"
                onClick={() => handleSelectRole('administrator')}
                className={`p-2.5 rounded-lg text-left transition-all cursor-pointer flex flex-col gap-0.5 border ${
                  selectedRole === 'administrator'
                    ? 'bg-slate-800/90 border-amber-500/60 shadow-md text-white'
                    : 'bg-transparent border-transparent hover:bg-slate-900/60 text-slate-400'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <ShieldCheck
                      className={`w-3.5 h-3.5 ${selectedRole === 'administrator' ? 'text-amber-400' : 'text-slate-500'}`}
                    />
                    <span>Administrator</span>
                  </div>
                  {selectedRole === 'administrator' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />}
                </div>
                <span className="text-[10px] text-slate-400">Operations HQ Management</span>
              </button>
            </div>

            {/* Role Header Banner */}
            <div
              className={`p-2.5 rounded-lg border flex items-start gap-2 text-[11px] ${
                selectedRole === 'administrator'
                  ? 'bg-amber-950/25 border-amber-500/40 text-amber-200'
                  : 'bg-blue-950/25 border-blue-500/40 text-blue-200'
              }`}
            >
              {selectedRole === 'administrator' ? (
                <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              ) : (
                <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              )}
              <div className="leading-tight">
                {selectedRole === 'administrator' ? (
                  <>
                    <strong className="text-amber-100">Restricted Administrator Access:</strong> Enter official
                    administrator credentials to manage inventory, import spreadsheets, and approve bookings.
                  </>
                ) : (
                  <>
                    <strong className="text-blue-100">Client Advertiser Access:</strong> Sign in with your registered
                    account to browse nationwide sites, build proposals, and request bookings.
                  </>
                )}
              </div>
            </div>

            {/* Email & Password Form */}
            <form onSubmit={handleEmailSignIn} className="space-y-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                  {selectedRole === 'administrator' ? 'Administrator Email' : 'Email Address'}
                </label>
                <div className="relative">
                  <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="name@company.com"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-amber-500 transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    title={showSignInPassword ? 'Hide password' : 'Show password'}
                  >
                    {showSignInPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={`w-full py-2.5 font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 ${
                  selectedRole === 'administrator'
                    ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>
                  {isLoading
                    ? 'Authenticating...'
                    : selectedRole === 'administrator'
                    ? 'Sign In as Administrator'
                    : 'Sign In as Client'}
                </span>
              </button>
            </form>

            {/* Bottom Actions */}
            <div className="pt-2 text-center text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setAuthMode('register')}
                className="text-blue-400 hover:underline cursor-pointer font-semibold"
              >
                New user? Create an account / Sign Up
              </button>
            </div>
          </div>
        )}

        {/* MODE 2: CREATE ACCOUNT / SIGN UP FORM */}
        {authMode === 'register' && (
          <div className="p-6 pt-3 space-y-3.5">
            <div className="p-3 rounded-lg bg-blue-950/30 border border-blue-500/40 text-blue-200 text-[11px] flex items-start gap-2.5">
              <User className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <div className="font-bold text-white flex items-center gap-2">
                  <span>Assigned Role: Client (Default)</span>
                  <span className="px-1.5 py-0.2 rounded text-[9px] font-mono bg-blue-500/20 text-blue-300 border border-blue-500/30">
                    PROTECTED
                  </span>
                </div>
                <p className="text-slate-300 text-[10px] leading-relaxed">
                  Every newly registered user receives the <strong>Client</strong> role automatically. Administrator
                  privileges cannot be self-selected.
                </p>
              </div>
            </div>

            <form onSubmit={handleRegister} className="space-y-2.5">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Full Name *</label>
                  <div className="relative">
                    <User className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your full name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Work Email *</label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="name@company.com"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Organization / Brand</label>
                  <div className="relative">
                    <Building className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regOrganization}
                      onChange={(e) => setRegOrganization(e.target.value)}
                      placeholder="Agency or advertiser name"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Designation</label>
                  <div className="relative">
                    <Briefcase className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={regDesignation}
                      onChange={(e) => setRegDesignation(e.target.value)}
                      placeholder="e.g. Media Planning Manager"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-3 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Password (min 6) *</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Enter password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-9 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegPassword(!showRegPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showRegPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Confirm Password *</label>
                  <div className="relative">
                    <KeyRound className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showRegConfirmPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Confirm password"
                      className="w-full bg-slate-950 border border-slate-700 rounded-lg pl-9 pr-9 py-1.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-hidden focus:border-blue-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                      title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showRegConfirmPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-lg shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 mt-2"
              >
                <UserPlus className="w-4 h-4" />
                <span>{isLoading ? 'Creating Client Account...' : 'Create Account & Sign In'}</span>
              </button>
            </form>

            {/* Bottom Actions */}
            <div className="pt-2 text-center text-[11px] text-slate-400">
              <button
                type="button"
                onClick={() => setAuthMode('signin')}
                className="text-amber-400 hover:underline cursor-pointer font-semibold"
              >
                Already have an account? Sign In
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
