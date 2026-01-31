import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types';
import { Mail, Lock, User, Loader2, Eye, EyeOff, HardHat, UserCircle, ShieldCheck, AlertCircle } from 'lucide-react';

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
    confirmPassword: ''
  });

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      await loginWithGoogle(selectedRole);
    } catch (err: any) {
      setError(err.message || 'Failed to sign in with Google');
    } finally {
      setLoading(false);
    }
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      await loginWithEmail(formData.email, formData.password);
    } catch (err: any) {
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password') {
        setError('Invalid email or password');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else {
        setError(err.message || 'Failed to sign in');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError('Please enter your name');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    try {
      await signupWithEmail(formData.email, formData.password, formData.name, selectedRole);
    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email already exists');
      } else if (err.code === 'auth/invalid-email') {
        setError('Invalid email address');
      } else if (err.code === 'auth/weak-password') {
        setError('Password is too weak');
      } else {
        setError(err.message || 'Failed to create account');
      }
    } finally {
      setLoading(false);
    }
  };

  const roles = [
    { 
      role: UserRole.CLIENT, 
      label: 'Client', 
      description: 'Track your home projects',
      icon: UserCircle,
      color: 'text-green-600',
      bg: 'bg-green-50',
      border: 'border-green-200 hover:border-green-400'
    },
    { 
      role: UserRole.CONTRACTOR, 
      label: 'Contractor', 
      description: 'Manage construction work',
      icon: HardHat,
      color: 'text-care-orange',
      bg: 'bg-orange-50',
      border: 'border-orange-200 hover:border-care-orange'
    },
    { 
      role: UserRole.ADMIN, 
      label: 'Administrator', 
      description: 'Full system access',
      icon: ShieldCheck,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      border: 'border-purple-200 hover:border-purple-400'
    },
  ];

  // Role selection screen for Google sign-in
  if (mode === 'role-select') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-3xl shadow-xl w-full max-w-md p-8">
          <div className="text-center mb-8">
            <img src="/care.png" alt="Care Construction" className="h-12 mx-auto mb-4" />
            <h1 className="text-2xl font-black text-gray-900">Select Your Role</h1>
            <p className="text-gray-500 mt-2">Choose how you'll use Care Construction Portal</p>
          </div>

          <div className="space-y-3 mb-8">
            {roles.map(r => (
              <button
                key={r.role}
                onClick={() => setSelectedRole(r.role)}
                className={`
                  w-full p-4 rounded-2xl border-2 text-left transition-all flex items-center gap-4
                  ${selectedRole === r.role ? `${r.border} ${r.bg}` : 'border-gray-100 hover:border-gray-200'}
                `}
              >
                <div className={`w-12 h-12 rounded-xl ${r.bg} flex items-center justify-center ${r.color}`}>
                  <r.icon size={24} />
                </div>
                <div>
                  <p className="font-bold text-gray-900">{r.label}</p>
                  <p className="text-sm text-gray-500">{r.description}</p>
                </div>
              </button>
            ))}
          </div>

          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className="w-full bg-care-orange text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 size={20} className="animate-spin" />
                Signing in...
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
                Continue with Google
              </>
            )}
          </button>

          <button
            onClick={() => setMode('login')}
            className="w-full mt-4 text-gray-500 text-sm font-medium hover:text-care-orange"
          >
            ← Back to login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-[#1A1A1A] p-12 flex-col justify-between relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-care-orange/10 rounded-full -mr-48 -mt-48" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-care-orange/5 rounded-full -ml-32 -mb-32" />
        
        <div className="relative z-10">
          <img src="/care.png" alt="Care Construction" className="h-12" />
        </div>
        
        <div className="relative z-10">
          <h1 className="text-5xl font-black text-white leading-tight mb-6">
            Build Dreams.<br />
            <span className="text-care-orange">Together.</span>
          </h1>
          <p className="text-gray-400 text-lg max-w-md leading-relaxed">
            Connect clients with contractors, manage projects seamlessly, and bring construction visions to life.
          </p>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-gray-500 text-sm">
          <span>© 2024 Care General Construction</span>
        </div>
      </div>

      {/* Right side - Auth form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="lg:hidden text-center mb-8">
            <img src="/care.png" alt="Care Construction" className="h-12 mx-auto" />
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8">
            <div className="text-center mb-8">
              <h2 className="text-2xl font-black text-gray-900">
                {mode === 'login' ? 'Welcome Back' : 'Create Account'}
              </h2>
              <p className="text-gray-500 mt-2">
                {mode === 'login' 
                  ? 'Sign in to access your dashboard' 
                  : 'Join Care Construction Portal'
                }
              </p>
            </div>

            {error && (
              <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center gap-3 text-red-600">
                <AlertCircle size={20} />
                <span className="text-sm font-medium">{error}</span>
              </div>
            )}

            {mode === 'signup' && (
              <div className="mb-6">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
                  I am a...
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {roles.map(r => (
                    <button
                      key={r.role}
                      type="button"
                      onClick={() => setSelectedRole(r.role)}
                      className={`
                        p-3 rounded-xl border-2 text-center transition-all
                        ${selectedRole === r.role 
                          ? `${r.border} ${r.bg}` 
                          : 'border-gray-100 hover:border-gray-200'
                        }
                      `}
                    >
                      <r.icon size={20} className={`mx-auto ${r.color}`} />
                      <p className="text-xs font-bold mt-1">{r.label}</p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <form onSubmit={mode === 'login' ? handleEmailLogin : handleEmailSignup}>
              {mode === 'signup' && (
                <div className="mb-4">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Full Name
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type="text"
                      placeholder="John Smith"
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                      value={formData.name}
                      onChange={e => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type="email"
                    placeholder="you@example.com"
                    required
                    className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                    value={formData.email}
                    onChange={e => setFormData({ ...formData, email: e.target.value })}
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    required
                    className="w-full pl-10 pr-12 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                    value={formData.password}
                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {mode === 'signup' && (
                <div className="mb-6">
                  <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      required
                      className="w-full pl-10 pr-4 py-3 bg-gray-50 border-2 border-gray-100 rounded-xl focus:border-care-orange focus:ring-0 transition-all text-sm font-medium"
                      value={formData.confirmPassword}
                      onChange={e => setFormData({ ...formData, confirmPassword: e.target.value })}
                    />
                  </div>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-care-orange text-white py-3 rounded-xl font-black uppercase tracking-widest text-xs hover:shadow-lg hover:shadow-care-orange/20 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={18} className="animate-spin" />
                    {mode === 'login' ? 'Signing in...' : 'Creating account...'}
                  </>
                ) : (
                  mode === 'login' ? 'Sign In' : 'Create Account'
                )}
              </button>
            </form>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-4 text-gray-400 font-bold tracking-widest">or</span>
              </div>
            </div>

            <button
              onClick={() => setMode('role-select')}
              disabled={loading}
              className="w-full border-2 border-gray-200 py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-3 hover:bg-gray-50 transition-all disabled:opacity-50"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google
            </button>

            <p className="text-center mt-6 text-sm text-gray-500">
              {mode === 'login' ? (
                <>
                  Don't have an account?{' '}
                  <button 
                    onClick={() => {
                      setMode('signup');
                      setError(null);
                    }}
                    className="text-care-orange font-bold hover:underline"
                  >
                    Sign up
                  </button>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <button 
                    onClick={() => {
                      setMode('login');
                      setError(null);
                    }}
                    className="text-care-orange font-bold hover:underline"
                  >
                    Sign in
                  </button>
                </>
              )}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
