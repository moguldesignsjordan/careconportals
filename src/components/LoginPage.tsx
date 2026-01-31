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

    if (!formData.name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail({
        email: formData.email,
        password: formData.password,
        name: formData.name,
        company: formData.company,
        role: selectedRole,
      });
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

  // Only client + contractor (no admin)
  const roles = [
    {
      role: UserRole.CLIENT,
      label: 'Client',
      description: 'Track your home projects',
      icon: UserCircle,
      // brand-friendly neutrals
      color: 'text-[#1A1A1A]',
      bg: 'bg-gray-50',
      border: 'border-gray-200 hover:border-gray-400',
    },
    {
      role: UserRole.CONTRACTOR,
      label: 'Contractor',
      description: 'Manage construction work',
      icon: HardHat,
      color: 'text-care-orange',
      bg: 'bg-care-orange/10',
      border: 'border-care-orange hover:border-care-orange',
    },
  ];

  // ==========================
  // ROLE SELECT (GOOGLE) VIEW
  // ==========================
  if (mode === 'role-select') {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 py-6 sm:py-10">
        <div className="w-full max-w-4xl bg-white rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden flex flex-col lg:flex-row">
          {/* Left panel */}
          <div className="w-full lg:w-1/2 bg-[#1A1A1A] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-6 sm:mb-8">
                <img src="/care.png" alt="CareCon" className="h-7 sm:h-8" />
                <div className="flex flex-col leading-tight">
                  <span className="text-[10px] sm:text-[11px] font-semibold text-white/60 uppercase tracking-[0.18em]">
                    CareCon
                  </span>
                  <span className="text-xs sm:text-sm font-semibold">
                    Construction Ops Portal
                  </span>
                </div>
              </div>

              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mb-2 sm:mb-3">
                Choose your role to continue
              </h1>
              <p className="text-xs sm:text-sm text-white/70 max-w-md">
                Tell us how you use CareCon so we can tailor the experience to your needs.
                You can always change your role later by contacting your project admin.
              </p>
            </div>

            <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 text-[10px] sm:text-xs text-white/50">
              <p>By continuing, you agree to our Terms of Service and Privacy Policy.</p>
            </div>
          </div>

          {/* Right panel */}
          <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-10 bg-white">
            <p className="text-[10px] sm:text-[11px] font-black text-gray-500 uppercase tracking-[0.18em] mb-3 sm:mb-4">
              I am a...
            </p>

            {/* ROLE CARDS – fixed text layout */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5 sm:mb-6">
              {roles.map((r) => {
                const Icon = r.icon;
                const isActive = selectedRole === r.role;

                return (
                  <button
                    key={r.role}
                    type="button"
                    onClick={() => setSelectedRole(r.role)}
                    className={`
                      w-full text-left rounded-2xl border-2 px-4 py-4 sm:py-5
                      flex items-start gap-3 transition-all bg-white
                      ${
                        isActive
                          ? `${r.border} shadow-lg shadow-care-orange/20`
                          : 'border-gray-100 hover:border-gray-300'
                      }
                    `}
                  >
                    <div
                      className={`h-9 w-9 flex-shrink-0 rounded-xl flex items-center justify-center ${
                        isActive ? r.bg : 'bg-gray-50'
                      }`}
                    >
                      <Icon className={isActive ? r.color : 'text-gray-400'} size={18} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-sm font-bold text-gray-900 truncate">
                          {r.label}
                        </span>
                        {isActive && (
                          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.18em] text-care-orange bg-care-orange/10 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            Selected
                          </span>
                        )}
                      </div>
                      <p className="mt-1 text-xs text-gray-500 leading-snug break-words">
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
              className="w-full bg-care-orange text-white py-2.5 sm:py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-care-orange/30 hover:shadow-care-orange/40 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <svg
                    className="w-4 h-4 bg-white rounded-full p-[2px]"
                    viewBox="0 0 24 24"
                  >
                    <path
                      fill="#EA4335"
                      d="M11.99 13.23v-3.4h8.21c.09.45.15.88.15 1.48 0 4.77-3.19 8.16-8.36 8.16a8.63 8.63 0 0 1-8.78-8.78A8.63 8.63 0 0 1 12 1.91a8.1 8.1 0 0 1 5.73 2.24L15.6 6.29A4.59 4.59 0 0 0 12 4.93a5.39 5.39 0 0 0-5.44 5.55A5.39 5.39 0 0 0 12 16a4.74 4.74 0 0 0 4.93-3.65Z"
                    />
                  </svg>
                  Continue with Google
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMode('login')}
              className="w-full mt-3 text-[11px] sm:text-xs text-gray-500 hover:text-gray-700 font-medium"
            >
              Back to email sign in
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ==========================
  // MAIN LOGIN / SIGNUP VIEW
  // ==========================
  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-4 py-6 sm:py-10">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl sm:shadow-2xl overflow-hidden flex flex-col lg:flex-row">
        {/* Left brand panel */}
        <div className="w-full lg:w-1/2 bg-[#1A1A1A] text-white p-6 sm:p-8 lg:p-10 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-6 sm:mb-8">
              <img src="/care.png" alt="CareCon" className="h-7 sm:h-8" />
              <div className="flex flex-col leading-tight">
                <span className="text-[10px] sm:text-[11px] font-semibold text-white/60 uppercase tracking-[0.18em]">
                  CareCon
                </span>
                <span className="text-xs sm:text-sm font-semibold">
                  Construction Ops Portal
                </span>
              </div>
            </div>

            <p className="text-[10px] sm:text-[11px] font-black text-care-orange uppercase tracking-[0.2em] mb-2 sm:mb-3">
              Field & Client Coordination
            </p>
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-black mb-2 sm:mb-3">
              Bring your construction projects into focus.
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mb-4 sm:mb-6 max-w-md">
              CareCon keeps your site updates, communications, and project documents in one place so
              your team and clients stay aligned from kickoff to handover.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px] sm:text-xs">
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="font-semibold mb-1">For Contractors</p>
                <p className="text-white/70">
                  Log site progress, upload photos, and keep clients informed in real-time.
                </p>
              </div>
              <div className="bg-white/5 rounded-2xl p-3 border border-white/10">
                <p className="font-semibold mb-1">For Homeowners</p>
                <p className="text-white/70">
                  Track milestones, review documents, and message your contractor from one secure
                  portal.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-6 sm:mt-8 pt-4 sm:pt-6 border-t border-white/10 text-[10px] sm:text-[11px] text-white/50">
            <p>Protected by secure authentication and role-based access.</p>
          </div>
        </div>

        {/* Right auth panel */}
        <div className="w-full lg:w-1/2 p-6 sm:p-8 lg:p-10 bg-white">
          <div className="flex items-center justify-between mb-5 sm:mb-6">
            <div>
              <p className="text-[10px] sm:text-[11px] font-black text-gray-400 uppercase tracking-[0.18em] mb-1">
                {mode === 'login' ? 'Welcome back' : 'Create your portal access'}
              </p>
              <h2 className="text-lg sm:text-xl lg:text-2xl font-black text-[#111827]">
                {mode === 'login' ? 'Sign in to CareCon' : 'Let’s get you set up'}
              </h2>
            </div>

            <div className="hidden sm:flex items-center gap-1 text-[11px] text-gray-500 bg-gray-50 rounded-full px-3 py-1 border border-gray-100">
              <span className="h-2 w-2 rounded-full bg-emerald-500" />
              Live project updates
            </div>
          </div>

          {/* Mode toggle */}
          <div className="inline-flex items-center bg-gray-50 rounded-full p-1 mb-5 sm:mb-6 border border-gray-100">
            <button
              type="button"
              onClick={() => setMode('login')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mode === 'login' ? 'bg-[#1A1A1A] text-white shadow' : 'text-gray-500'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className={`px-4 py-1.5 text-xs font-semibold rounded-full transition-all ${
                mode === 'signup' ? 'bg-[#1A1A1A] text-white shadow' : 'text-gray-500'
              }`}
            >
              Create Account
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
                      placeholder="Jordan C."
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1.5">
                    Company (optional)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <HardHat size={16} />
                    </span>
                    <input
                      type="text"
                      value={formData.company}
                      onChange={(e) => handleInputChange('company', e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 text-sm rounded-xl border border-gray-200 bg-white focus:border-care-orange focus:ring-0"
                      placeholder="Care General Construction"
                    />
                  </div>
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
                  placeholder={mode === 'login' ? 'Enter your password' : 'Create a strong password'}
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
              <div className="mb-4 sm:mb-6">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  I am a...
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {roles.map((r) => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setSelectedRole(r.role)}
                      className={`
                        p-3 rounded-xl border-2 text-center transition-all
                        ${
                          selectedRole === r.role
                            ? `${r.border} ${r.bg}`
                            : 'border-gray-100 hover:border-gray-200'
                        }
                      `}
                    >
                      <span className="text-xs font-semibold text-gray-900 block">
                        {r.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#1A1A1A] text-white py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold shadow-lg shadow-black/15 hover:shadow-black/25 transition-all disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 size={18} className="animate-spin" />
                  {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                </>
              ) : (
                <>{mode === 'login' ? 'Sign in' : 'Create account'}</>
              )}
            </button>
          </form>

          <div className="mt-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-[10px] sm:text-[11px] text-gray-400 uppercase tracking-[0.18em]">
                Or continue with
              </span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            <button
              type="button"
              onClick={() => setMode('role-select')}
              disabled={loading}
              className="w-full bg-white text-[#1A1A1A] py-2.5 rounded-xl flex items-center justify-center gap-2 text-sm font-semibold border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#EA4335"
                  d="M11.99 13.23v-3.4h8.21c.09.45.15.88.15 1.48 0 4.77-3.19 8.16-8.36 8.16a8.63 8.63 0 0 1-8.78-8.78A8.63 8.63 0 0 1 12 1.91a8.1 8.1 0 0 1 5.73 2.24L15.6 6.29A4.59 4.59 0 0 0 12 4.93a5.39 5.39 0 0 0-5.44 5.55A5.39 5.39 0 0 0 12 16a4.74 4.74 0 0 0 4.93-3.65Z"
                />
              </svg>
              Continue with Google
            </button>
          </div>

          {mode === 'login' ? (
            <p className="mt-4 text-xs text-gray-500">
              Don’t have an account?{' '}
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
  );
};

export default LoginPage;
