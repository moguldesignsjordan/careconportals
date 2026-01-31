import React, { useState } from 'react';
import {
  Mail,
  Lock,
  User,
  Loader2,
  Eye,
  EyeOff,
  HardHat,
  UserCircle,
  AlertCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';

type Mode = 'login' | 'signup' | 'role-select';

const LoginPage: React.FC = () => {
  const { loginWithEmail, signupWithEmail, loginWithGoogle } = useAuth();

  const [mode, setMode] = useState<Mode>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const roles = [
    {
      role: UserRole.CLIENT,
      label: 'Client',
      description: 'Track your home projects',
      icon: UserCircle,
    },
    {
      role: UserRole.CONTRACTOR,
      label: 'Contractor',
      description: 'Manage construction work',
      icon: HardHat,
    },
  ];

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(email, password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRole) {
      setError('Please choose whether you are a client or contractor.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setLoading(true);
    try {
      // ✅ NEW: correct signature
      await signupWithEmail(email, password, name, selectedRole);
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(selectedRole || UserRole.CLIENT);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setConfirm('');
    setName('');
    setError(null);
  };

  const goToSignup = () => {
    resetForm();
    setSelectedRole(null);
    setMode('role-select');
  };

  const goToLogin = () => {
    resetForm();
    setMode('login');
  };

  // Role selection step
  if (mode === 'role-select') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4">
        <div className="w-full max-w-3xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col md:flex-row">
          <div className="hidden md:flex md:w-1/2 flex-col justify-between bg-[#FDEEE9] p-8">
            <div>
              <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">
                Care Construction
              </p>
              <h1 className="mt-3 text-2xl font-black text-gray-900">
                Choose how you&apos;ll use the portal
              </h1>
              <p className="mt-3 text-sm text-gray-700">
                Clients track projects and approvals. Contractors share progress
                and documents from the field.
              </p>
            </div>
            <div className="mt-8 text-xs text-gray-600 space-y-1">
              <p>• Secure portal for your construction projects</p>
              <p>• Message, upload documents, and review updates</p>
              <p>• Built for Care General Construction clients & teams</p>
            </div>
          </div>

          <div className="w-full md:w-1/2 p-8">
            <div className="flex items-center justify-between mb-6 md:mb-8">
              <div>
                <h2 className="text-lg font-black text-gray-900">
                  Create your account
                </h2>
                <p className="text-xs text-gray-500 mt-1">
                  First, tell us who you are.
                </p>
              </div>
              <img src="/care.png" alt="Care Construction" className="h-8 w-auto" />
            </div>

            <div className="grid grid-cols-1 gap-4">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`
                      w-full flex items-start gap-3 rounded-2xl border px-4 py-4 text-left transition-all
                      ${
                        isActive
                          ? 'bg-orange-50 text-care-orange border-care-orange shadow-sm'
                          : 'border-gray-100 hover:border-care-orange/60 hover:bg-orange-50/40'
                      }
                    `}
                  >
                    <div className="mt-1 w-9 h-9 rounded-xl flex items-center justify-center bg-white text-care-orange">
                      <Icon size={18} />
                    </div>
                    <div>
                      <p className="text-sm font-black text-gray-900">
                        {r.label}
                      </p>
                      <p className="text-xs text-gray-600 mt-1">
                        {r.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mt-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
                <AlertCircle className="text-red-500 mt-[2px]" size={16} />
                <p className="text-xs text-red-700">{error}</p>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                onClick={() => selectedRole && setMode('signup')}
                disabled={!selectedRole}
                className={`
                  inline-flex items-center justify-center px-4 py-2.5 rounded-xl text-xs font-bold
                  ${
                    selectedRole
                      ? 'bg-care-orange text-white shadow-sm hover:shadow-md hover:bg-care-orange/90'
                      : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  }
                `}
              >
                Continue
              </button>

              <button
                type="button"
                onClick={goToLogin}
                className="text-xs text-gray-500 hover:text-gray-700 text-center"
              >
                Already have an account?{' '}
                <span className="font-semibold">Sign in</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Main auth layout
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
        {/* Left side */}
        <div className="hidden lg:flex lg:w-1/2 flex-col justify-between bg-[#FDEEE9] p-10">
          <div>
            <p className="text-xs font-black text-gray-400 uppercase tracking-[0.25em]">
              Care Construction
            </p>
            <h1 className="mt-3 text-3xl font-black text-gray-900">
              Client & Contractor Portal
            </h1>
            <p className="mt-3 text-sm text-gray-700 max-w-md">
              Securely track projects, share updates, and keep everyone aligned
              from kickoff to final walkthrough.
            </p>
          </div>

          <div className="mt-10 space-y-4 text-xs text-gray-700">
            <div className="flex items-start gap-2">
              <div className="mt-[2px] h-1.5 w-1.5 rounded-full bg-care-orange" />
              <p>Real-time project status and progress tracking.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-[2px] h-1.5 w-1.5 rounded-full bg-care-orange" />
              <p>Centralized messaging and document sharing.</p>
            </div>
            <div className="flex items-start gap-2">
              <div className="mt-[2px] h-1.5 w-1.5 rounded-full bg-care-orange" />
              <p>Built specifically for Care General Construction projects.</p>
            </div>
          </div>

          <div className="mt-8 flex items-center gap-3 text-xs text-gray-500">
            <img src="/care.png" alt="Care Construction" className="h-8" />
            <span>Powered by Care General Construction</span>
          </div>
        </div>

        {/* Right side - forms */}
        <div className="w-full lg:w-1/2 p-8 md:p-10">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-black text-gray-900">
                {mode === 'login' ? 'Sign in to your portal' : 'Create your account'}
              </h2>
              <p className="text-xs text-gray-500 mt-1">
                {mode === 'login'
                  ? 'Use the email associated with your Care Construction project.'
                  : 'We&apos;ll set up your profile so you can access projects.'}
              </p>
            </div>
            <img
              src="/care.png"
              alt="Care Construction"
              className="h-7 w-auto lg:hidden"
            />
          </div>

          {error && (
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-red-50 border border-red-100 px-3 py-2.5">
              <AlertCircle className="text-red-500 mt-[2px]" size={16} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {mode === 'login' ? (
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Mail size={14} className="text-care-orange" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                  placeholder="you@example.com"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Lock size={14} className="text-care-orange" />
                  Password
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                    placeholder="Enter your password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-care-orange text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:shadow-md hover:bg-care-orange/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                <span>Sign in</span>
              </button>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={goToSignup}
                  className="text-xs text-gray-500 hover:text-gray-700 text-left"
                >
                  New here?{' '}
                  <span className="font-semibold">Create an account</span>
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <User size={14} className="text-care-orange" />
                  Full name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                  placeholder="Your name"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                  <Mail size={14} className="text-care-orange" />
                  Email
                </label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                  placeholder="you@example.com"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700 flex items-center gap-1.5">
                    <Lock size={14} className="text-care-orange" />
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                      placeholder="Create a password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-gray-700">
                    Confirm password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? 'text' : 'password'}
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 px-3 py-2.5 pr-9 text-sm focus:outline-none focus:ring-2 focus:ring-care-orange/60 focus:border-care-orange"
                      placeholder="Repeat password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute inset-y-0 right-0 flex items-center px-3 text-gray-400 hover:text-gray-600"
                    >
                      {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {selectedRole && (
                <div className="rounded-xl bg-[#FDEEE9] border border-care-orange/40 px-3 py-2.5 text-xs text-gray-700 flex items-center justify-between">
                  <span>
                    Signing up as{' '}
                    <span className="font-semibold text-care-orange">
                      {selectedRole === UserRole.CLIENT ? 'Client' : 'Contractor'}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setMode('role-select')}
                    className="text-[11px] font-semibold text-care-orange hover:underline"
                  >
                    Change
                  </button>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="mt-2 w-full inline-flex items-center justify-center gap-2 rounded-xl bg-care-orange text-white text-xs font-bold px-4 py-2.5 shadow-sm hover:shadow-md hover:bg-care-orange/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                <span>Create account</span>
              </button>

              <div className="pt-4 border-t border-gray-100 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={goToLogin}
                  className="text-xs text-gray-500 hover:text-gray-700 text-left"
                >
                  Already have an account?{' '}
                  <span className="font-semibold">Sign in</span>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
