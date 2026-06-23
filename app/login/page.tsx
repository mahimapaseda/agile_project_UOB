'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth-context';
import { Eye, EyeOff, AlertCircle, Mail, KeyRound } from 'lucide-react';
import { motion } from 'framer-motion';
import { AppWelcomeBranding } from '@/components/AppWelcomeBranding';
import { QuickPinLogin } from '@/components/auth/QuickPinLogin';
import { AccountType } from '@/types';
import { cn } from '@/lib/utils';

function loginErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : 'Login failed';
  if (msg.includes('invalid-credential') || msg.includes('user-not-found') || msg.includes('wrong-password')) {
    return 'Invalid email or password.';
  }
  if (msg.includes('too-many-requests')) {
    return 'Too many failed attempts. Please try again later.';
  }
  return 'Login failed. Please check your credentials.';
}

const FEATURES = ['Student Management', 'Staff Records', 'Exam Results', 'Role-based Access'];

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [loginMode, setLoginMode] = useState<'email' | 'pin'>('email');
  const { signIn, signInWithPin } = useAuth();
  const router = useRouter();

  const performSignIn = async (signInEmail: string, signInPassword: string) => {
    setError('');
    setLoading(true);
    try {
      await signIn(signInEmail, signInPassword);
      router.push('/dashboard');
    } catch (err: unknown) {
      setError(loginErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await performSignIn(email, password);
  };

  const handlePinLogin = async (linkedId: string, pin: string, accountType: AccountType) => {
    setError('');
    setLoading(true);
    try {
      await signInWithPin(linkedId, pin, accountType);
      router.push('/dashboard');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'PIN login failed.';
      if (msg.includes('not configured') || msg.includes('503')) {
        setError('Quick PIN is not available on this server. Use email login or contact admin.');
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page flex min-h-dvh min-h-[100dvh] flex-col bg-slate-100 md:flex-row md:overflow-hidden">
      {/* Brand panel — tablet & desktop */}
      <div className="surface-brand relative hidden min-h-0 flex-col items-center justify-center overflow-hidden p-8 md:flex md:w-[45%] lg:w-1/2 lg:p-12">
        <div className="pointer-events-none absolute inset-0 opacity-[0.07]">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full border-2 border-dashed border-white" />
          <div className="absolute -bottom-16 -right-16 h-56 w-56 rounded-full border-2 border-white" />
          <div className="absolute left-1/2 top-1/2 h-96 w-96 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white" />
        </div>
        <motion.div
          initial={false}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative z-10 max-w-sm text-center"
        >
          <AppWelcomeBranding variant="dark" logoSize={96} className="mb-8" />
          <ul className="mx-auto grid max-w-xs grid-cols-1 gap-2.5 text-left sm:grid-cols-2">
            {FEATURES.map((f, i) => (
              <motion.li
                key={f}
                initial={false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + i * 0.08 }}
                className="flex items-center gap-2 text-xs text-blue-200/90 lg:text-sm"
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-400" />
                {f}
              </motion.li>
            ))}
          </ul>
        </motion.div>
      </div>

      {/* Form panel — scroll on mobile; centered cluster on tablet/desktop */}
      <div className="login-page-panel scroll-touch md:w-[55%] lg:w-1/2">
        <div className="login-page-scroll">
          <div className="mb-4 shrink-0 sm:mb-6 md:hidden">
            <AppWelcomeBranding variant="light" logoSize={72} />
          </div>

          <div className="login-page-cluster">
          <div className="login-page-card shrink-0 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[var(--shadow-elevated)] sm:p-6 md:p-8">
            <div className="mb-5 sm:mb-6">
              <h2 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">Welcome back</h2>
              <p className="mt-1 text-xs text-slate-500 sm:text-sm">Sign in to continue to your portal</p>
            </div>

            {error && loginMode === 'email' && (
              <motion.div
                initial={false}
                animate={{ opacity: 1, y: 0 }}
                className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                role="alert"
              >
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                {error}
              </motion.div>
            )}

            <div className="mb-4 grid grid-cols-2 gap-1 rounded-xl bg-slate-100 p-1 sm:mb-5">
              {(['email', 'pin'] as const).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => {
                    setLoginMode(mode);
                    setError('');
                  }}
                  className={cn(
                    'flex min-h-[44px] items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-semibold transition-all sm:gap-2 sm:text-sm',
                    loginMode === mode
                      ? 'bg-white text-brand-800 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900',
                  )}
                >
                  {mode === 'email' ? <Mail className="h-4 w-4 shrink-0" /> : <KeyRound className="h-4 w-4 shrink-0" />}
                  <span className="truncate">
                    {mode === 'email' ? 'Email' : (
                      <>
                        <span className="sm:hidden">PIN</span>
                        <span className="hidden sm:inline">Quick PIN</span>
                      </>
                    )}
                  </span>
                </button>
              ))}
            </div>

            {loginMode === 'pin' ? (
              <QuickPinLogin loading={loading} error={error || undefined} onSubmit={handlePinLogin} />
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="your@email.com"
                    required
                    className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 text-sm transition-all focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-slate-700">Password</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                      className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 pr-11 text-sm transition-all focus:border-brand-600 focus:outline-none focus:ring-4 focus:ring-brand-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="touch-target-icon absolute right-1 top-1/2 flex -translate-y-1/2 items-center justify-center text-slate-400 hover:text-slate-600"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand-700 font-semibold text-white shadow-md transition-all hover:bg-brand-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Signing in…
                    </>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
            )}

            <p className="mt-6 border-t border-slate-100 pt-4 text-center text-[11px] text-slate-400 sm:text-xs">
              Authorized personnel only. Contact your administrator for access.
            </p>
          </div>

          <p className="login-page-roles mt-4 shrink-0 flex flex-wrap justify-center gap-x-2 gap-y-1 pb-2 text-center text-[10px] text-slate-400 sm:mt-5 sm:text-xs">
            {['Principal', 'Staff', 'Tech Officer', 'Student', 'Parent'].map((role, i, arr) => (
              <span key={role} className="inline-flex items-center gap-2">
                {role}
                {i < arr.length - 1 && <span className="text-slate-300">·</span>}
              </span>
            ))}
          </p>
          </div>
        </div>
      </div>
    </div>
  );
}
