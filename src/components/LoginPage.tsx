import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
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

const LoginPage: React.FC = () => {
  const { loginWithGoogle, loginWithEmail, signupWithEmail } = useAuth();

  const [mode, setMode] = useState<'login' | 'signup' | 'role-select'>('login');
  const [selectedRole, setSelectedRole] = useState<UserRole>(UserRole.CLIENT);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
    company: '',
  });

  const handleInputChange = (field: keyof typeof formData, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await loginWithEmail(formData.email, formData.password);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      // ✅ matches AuthContext: signupWithEmail(email, pass, name, role)
      await signupWithEmail(
        formData.email,
        formData.password,
        formData.name,
        selectedRole,
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create account. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      await loginWithGoogle(selectedRole);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google.');
    } finally {
      setLoading(false);
    }
  };

  // ✅ Only brand colors: care-orange, peach, dark gray/black, white
  const roles = [
    {
      role: UserRole.CLIENT,
      label: 'Client',
      description: 'Track your home projects',
      icon: UserCircle,
      color: 'text-[#1A1A1A]',
      bg: 'bg-[#FDEEE9]',
      border: 'border-care-orange/40 hover:border-care-orange',
    },
    {
      role: UserRole.CONTRACTOR,
      label: 'Contractor',
      description: 'Manage construction work',
      icon: HardHat,
      color: 'text-care-orange',
      bg: 'bg-white',
      border: 'border-gray-200 hover:border-care-orange/60',
    },
  ];

  // ROLE SELECT SCREEN (for Google sign-in)
  if (mode === 'role-select') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
        <div className="max-w-4xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
          {/* Left brand panel */}
          <div className="w-full lg:w-1/2 bg-gradient-to-br from-[#1A1A1A] to-[#111827] text-white p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-8">
                <img src="/care.png" alt="CareCon" className="h-8" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.18em]">
                    CAREGENCON
                  </span>
                  <span className="text-sm font-semibold">
                    OPERATIONS
                  </span>
                </div>
              </div>

              <p className="text-[11px] font-black text-care-orange uppercase tracking-[0.2em] mb-3">
                Sign in with Google
              </p>
              <h1 className="text-2xl lg:text-3xl font-black mb-3">
                Choose your role to continue
              </h1>
              <p className="text-sm text-white/70">
                Tell us how you use CareCon so we can tailor the experience for
                you. You can always change your role later by contacting your
                project admin.
              </p>
            </div>

            <div className="mt-8 pt-6 border-t border-white/10 text-xs text-white/50">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>

          {/* Right role + Google panel */}
          <div className="w-full lg:w-1/2 p-6 lg:p-8 bg-[#FDEEE9]">
            <p className="text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-4">
              I am a...
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = selectedRole === r.role;
                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`w-full flex items-start gap-3 rounded-2xl border px-4 py-3 text-left transition-all bg-white ${
                      isActive
                        ? 'border-care-orange shadow-md shadow-care-orange/20'
                        : 'border-gray-200 hover:border-care-orange/50'
                    }`}
                  >
                    <div
                      className={`mt-1 w-9 h-9 rounded-xl flex items-center justify-center bg-[#FDEEE9] text-care-orange`}
                    >
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-bold text-gray-900">
                          {r.label}
                        </span>
                        {isActive && (
                          <span className="text-[10px] font-bold text-care-orange bg-care-orange/10 px-1.5 py-0.5 rounded-full">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {r.description}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

            {error && (
              <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
                <AlertCircle size={14} />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full bg-care-orange text-white py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 shadow-md shadow-care-orange/40 hover:bg-care-orange/90 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 bg-white rounded-full p-[2px]" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M11.99 13.23v-3.4h8.22c.09.45.16.98.16 1.62C20.37 14.96 18.52 18 12 18a5.99 5.99 0 0 1-6-6 6 6 0 0 1 6-6c1.62 0 2.8.63 3.67 1.47l-1.56 1.56C13.6 8.39 12.92 8 12 8a3.6 3.6 0 0 0 0 7.2c2.37 0 3.25-1.7 3.39-2.67Z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M6.3 9.39 4.05 7.66A5.99 5.99 0 0 1 12 6v2c-1.62 0-3.01.63-3.99 1.39Z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 18c-2.55 0-4.74-1.44-5.71-3.55l2.25-1.73C8.99 13.6 10.3 14.4 12 14.4c1.2 0 2.05-.4 2.67-.97l2.06 1.6C15.76 16.78 14.14 18 12 18Z"
                    />
                    <path
                      fill="#4285F4"
                      d="M16.73 13.43A3.72 3.72 0 0 0 16.92 12c0-.41-.07-.8-.19-1.17L19 9.09A6.01 6.01 0 0 1 18 12c0 1.01-.27 2.02-.77 2.93Z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full mt-4 text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Back to email sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // MAIN LOGIN / SIGNUP SCREEN
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-8">
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-2xl border border-gray-100 overflow-hidden flex flex-col lg:flex-row">
        {/* Left brand panel */}
        <div className="w-full lg:w-1/2 bg-[#1A1A1A] text-white p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <img src="/care.png" alt="CareCon" className="h-8" />
              <div className="flex flex-col leading-tight">
                <span className="text-[11px] font-semibold text-white/60 uppercase tracking-[0.18em]">
                  CAREGENCON
                </span>
                <span className="text-sm font-semibold">Operations</span>
              </div>
            </div>

            <p className="text-[11px] font-black text-care-orange uppercase tracking-[0.2em] mb-3">
              Field & Client Coordination
            </p>
            <h1 className="text-2xl lg:text-3xl font-black mb-3">
              Your projects, all in one place.
            </h1>
            <p className="text-sm text-white/70 mb-6">
              Care General Construction keeps your site updates, communication, and approvals organized so
              your team and clients stay aligned from kickoff to handover.
            </p>

            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="font-semibold mb-1">For Contractors</p>
                <p className="text-white/70">
                  Log site progress, upload photos, and keep clients informed in real time.
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="font-semibold mb-1">For Homeowners</p>
                <p className="text-white/70">
                  Track milestones, review documents, and message your contractor from one
                  secure portal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t border-white/10 text-[11px] text-white/50">
            <p>Protected by secure authentication and role-based access.</p>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="w-full lg:w-1/2 p-6 lg:p-8 bg-[#FDEEE9]">
          <div className="flex items-center justify-between mb-6">
            <div>
              <p className="text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create your portal access'}
              </p>
              <h2 className="text-xl font-black text-[#1A1A1A]">
                {mode === 'login' ? 'Sign in to CAREGENCON' : 'Join the CareGenCon portal'}
              </h2>
            </div>
            <img src="/care.png" alt="CareCon" className="h-7 w-auto" />
          </div>

          {/* Mode toggle */}
          <div className="inline-flex items-center gap-1 rounded-full bg-white/60 p-1 mb-4">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mode === 'login'
                  ? 'bg-[#1A1A1A] text-white shadow'
                  : 'text-gray-500'
              }`}
            >
              Sign in
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mode === 'signup'
                  ? 'bg-[#1A1A1A] text-white shadow'
                  : 'text-gray-500'
              }`}
            >
              Create account
            </button>
          </div>

          {error && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-red-50 border border-red-200 px-3 py-2 text-xs text-red-700">
              <AlertCircle size={14} />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form
            onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}
            className="space-y-4"
          >
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Full name
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <User size={16} />
                    </span>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                      placeholder="Your name"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Company (optional)
                  </label>
                  <input
                    type="text"
                    value={formData.company}
                    onChange={(e) => handleInputChange('company', e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                    placeholder="Company name"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Email
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Mail size={16} />
                </span>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                  placeholder="you@example.com"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">
                Password
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                  <Lock size={16} />
                </span>
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={formData.password}
                  onChange={(e) => handleInputChange('password', e.target.value)}
                  className="w-full pl-9 pr-10 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                  placeholder={
                    mode === 'login'
                      ? 'Enter your password'
                      : 'Create a strong password'
                  }
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((prev) => !prev)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {mode === 'signup' && (
                <p className="mt-1 text-[11px] text-gray-500">
                  Minimum 6 characters. Use a mix of letters and numbers.
                </p>
              )}
            </div>

            {mode === 'signup' && (
              <div className="mb-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => {
                    const Icon = r.icon;
                    const isActive = selectedRole === r.role;
                    return (
                      <button
                        key={r.role}
                        type="button"
                        onClick={() => setSelectedRole(r.role)}
                        className={`w-full flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs transition-all bg-white ${
                          isActive
                            ? 'border-care-orange shadow-sm shadow-care-orange/30'
                            : 'border-gray-200 hover:border-care-orange/60'
                        }`}
                      >
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center bg-[#FDEEE9] text-care-orange">
                          <Icon size={16} />
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900">
                            {r.label}
                          </span>
                          <span className="text-[11px] text-gray-500">
                            {r.description}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-care-orange text-white text-xs font-bold px-4 py-2.5 shadow-sm shadow-care-orange/40 hover:shadow-md hover:bg-care-orange/90 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              <span>{mode === 'login' ? 'Sign in' : 'Create account'}</span>
            </button>
          </form>

          {/* Divider + Google entry point */}
          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[11px] text-gray-500 uppercase tracking-[0.18em]">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* This button leads into role-select, then Google auth */}
            <button
              type="button"
              onClick={() => setMode('role-select')}
              disabled={loading}
              className="w-full bg-white text-[#1A1A1A] py-2.5 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M11.99 13.23v-3.4h8.22c.09.45.16.98.16 1.62C20.37 14.96 18.52 18 12 18a5.99 5.99 0 0 1-6-6 6 6 0 0 1 6-6c1.62 0 2.8.63 3.67 1.47l-1.56 1.56C13.6 8.39 12.92 8 12 8a3.6 3.6 0 0 0 0 7.2c2.37 0 3.25-1.7 3.39-2.67Z"
                />
                <path
                  fill="#FBBC05"
                  d="M6.3 9.39 4.05 7.66A5.99 5.99 0 0 1 12 6v2c-1.62 0-3.01.63-3.99 1.39Z"
                />
                <path
                  fill="#34A853"
                  d="M12 18c-2.55 0-4.74-1.44-5.71-3.55l2.25-1.73C8.99 13.6 10.3 14.4 12 14.4c1.2 0 2.05-.4 2.67-.97l2.06 1.6C15.76 16.78 14.14 18 12 18Z"
                />
                <path
                  fill="#4285F4"
                  d="M16.73 13.43A3.72 3.72 0 0 0 16.92 12c0-.41-.07-.8-.19-1.17L19 9.09A6.01 6.01 0 0 1 18 12c0 1.01-.27 2.02-.77 2.93Z"
                />
              </svg>
              Continue with Google
            </button>

            {mode === 'login' ? (
              <p className="mt-4 text-xs text-gray-500">
                Don&apos;t have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="text-care-orange font-semibold hover:underline"
                >
                  Create one
                </button>
              </p>
            ) : (
              <p className="mt-4 text-xs text-gray-500">
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="text-care-orange font-semibold hover:underline"
                >
                  Sign in
                </button>
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
 