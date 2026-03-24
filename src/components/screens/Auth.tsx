import { useState, useEffect, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Check, Eye, EyeOff, Github, Home, KeyRound, Shield, UserPlus } from 'lucide-react';
import type { OAuthProvider } from '../../contexts/auth-types';
import { useAuth } from '../../contexts/useAuth';

function GoogleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden>
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
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
      />
      <path
        fill="#EA4335"
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
      />
    </svg>
  );
}

const OAUTH: { provider: OAuthProvider; label: string; icon: ReactNode; hint: string }[] = [
  {
    provider: 'google',
    label: 'Google',
    hint: 'Google account',
    icon: <GoogleIcon className="h-5 w-5" />,
  },
  {
    provider: 'github',
    label: 'GitHub',
    hint: 'GitHub',
    icon: <Github className="h-5 w-5 text-white" />,
  },
];

/** Horizontal rule + centered pill — dark “recessed” lines, mono cyan‑gray label (design ref). */
function AuthSectionDivider({ label }: { label: string }) {
  return (
    <div className="my-8 flex items-center" role="separator">
      <div
        className="h-px min-w-[1rem] flex-1 bg-[#1F2937] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.45)]"
        aria-hidden
      />
      <span
        className={`mx-3 shrink-0 rounded-full border border-[#2D2D36] bg-[#0E0F11] py-1.5 font-mono font-semibold uppercase text-[#5A7B8F] shadow-[0_1px_0_0_rgba(255,255,255,0.04)] ${
          label.length > 10 ? 'px-3 text-[9px] tracking-[0.12em] sm:px-4 sm:text-[10px] sm:tracking-[0.16em]' : 'px-5 text-[10px] tracking-[0.2em]'
        }`}
      >
        {label}
      </span>
      <div
        className="h-px min-w-[1rem] flex-1 bg-[#1F2937] shadow-[inset_0_-1px_0_0_rgba(0,0,0,0.45)]"
        aria-hidden
      />
    </div>
  );
}

function AuthHomeLink() {
  return (
    <Link
      to="/"
      className="group inline-flex w-fit items-center gap-2 rounded-xl border border-white/[0.09] bg-nexus-panel/50 px-3 py-2 text-left shadow-[0_4px_24px_rgba(0,0,0,0.25)] backdrop-blur-md transition hover:border-nexus-accent/30 hover:bg-nexus-panel/70 hover:shadow-[0_8px_32px_rgba(200,245,98,0.06)] focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/40"
    >
      <span className="flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.08] bg-nexus-void/50 text-neutral-400 transition group-hover:border-nexus-accent/25 group-hover:text-nexus-accent">
        <Home className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
      </span>
      <span className="font-mono text-[10px] font-medium uppercase tracking-[0.2em] text-neutral-400 transition group-hover:text-neutral-100">
        Home
      </span>
    </Link>
  );
}

export function Auth() {
  const { signIn, signUp, signInWithOAuth, verifyTwoFactor } = useAuth();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [oauthProvider, setOauthProvider] = useState<OAuthProvider | null>(null);
  const [error, setError] = useState('');
  const [twoFactorStep, setTwoFactorStep] = useState(false);
  const [totpCode, setTotpCode] = useState('');

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    if (p.get('oauth') === 'link_conflict') {
      setError(
        'An account with this email already uses password sign-in. Sign in with email and password first, then you can add OAuth from settings when supported.',
      );
      window.history.replaceState({}, '', window.location.pathname + window.location.hash);
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
      } else {
        const result = await signIn(email, password);
        if (result === '2fa_required') {
          setTwoFactorStep(true);
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Authentication failed';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const handleTwoFactorSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyTwoFactor(totpCode.replace(/\s/g, ''));
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Invalid code';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const backFromTwoFactor = () => {
    setTwoFactorStep(false);
    setTotpCode('');
    setError('');
  };

  const handleOAuth = async (provider: OAuthProvider) => {
    setError('');
    setOauthProvider(provider);
    try {
      await signInWithOAuth(provider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'OAuth sign-in failed';
      setError(message);
      setOauthProvider(null);
    }
  };

  const oauthBusy = oauthProvider !== null;

  const switchMode = (signUp: boolean) => {
    setIsSignUp(signUp);
    setError('');
    setTwoFactorStep(false);
    setTotpCode('');
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-nexus-void font-auth text-neutral-200">
      {/* Radial ambient — sign-in: cool blue / sign-up: accent green */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-0">
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            isSignUp ? 'opacity-0' : 'opacity-100'
          }`}
          style={{
            background: [
              'radial-gradient(ellipse 85% 55% at 15% 12%, rgba(130, 170, 255, 0.11), transparent 58%)',
              'radial-gradient(ellipse 70% 50% at 92% 88%, rgba(200, 245, 98, 0.07), transparent 52%)',
              'radial-gradient(ellipse 55% 40% at 50% 100%, rgba(15, 23, 42, 0.45), transparent 65%)',
            ].join(', '),
          }}
        />
        <div
          className={`absolute inset-0 transition-opacity duration-500 ease-out ${
            isSignUp ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            background: [
              'radial-gradient(ellipse 90% 60% at 85% 8%, rgba(200, 245, 98, 0.14), transparent 55%)',
              'radial-gradient(ellipse 65% 45% at 10% 75%, rgba(200, 245, 98, 0.06), transparent 50%)',
              'radial-gradient(ellipse 50% 35% at 40% 100%, rgba(34, 197, 94, 0.05), transparent 60%)',
            ].join(', '),
          }}
        />
        <div className="absolute inset-0 bg-nexus-fade/40" />
      </div>

      <div
        className={`flex min-h-screen flex-col ${isSignUp ? 'lg:flex-row-reverse' : 'lg:flex-row'}`}
      >
        {/* Brand column — copy & decoration differ strongly by mode */}
        <aside
          className={`relative hidden overflow-hidden border-b border-white/[0.06] lg:flex lg:w-[44%] lg:flex-col lg:border-b-0 xl:w-[42%] ${
            isSignUp ? 'lg:border-l lg:border-white/[0.06]' : 'lg:border-r lg:border-white/[0.06]'
          }`}
        >
          {/* Sign-in: cool, minimal ambient */}
          {!isSignUp && (
            <>
              <div aria-hidden className="pointer-events-none absolute inset-0 bg-nexus-fade" />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.4] bg-[length:48px_48px] bg-nexus-grid"
                style={{ maskImage: 'linear-gradient(to bottom, black 35%, transparent)' }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -left-16 top-1/4 h-64 w-64 rounded-full bg-nexus-accent/[0.06] blur-[80px]"
              />
            </>
          )}
          {/* Sign-up: warmer, diagonal emphasis */}
          {isSignUp && (
            <>
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,rgba(200,245,98,0.07)_0%,transparent_42%,transparent_100%)]"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute bottom-0 right-0 h-[60%] w-[70%] opacity-30 bg-[length:32px_32px] bg-nexus-grid"
                style={{ maskImage: 'linear-gradient(to top left, black, transparent)' }}
              />
              <div
                aria-hidden
                className="pointer-events-none absolute -right-10 bottom-1/4 h-72 w-72 rounded-full bg-nexus-accent/10 blur-[100px]"
              />
            </>
          )}

          <div className="relative z-10 flex flex-1 flex-col justify-between px-10 py-14 xl:px-16 xl:py-16">
            {!isSignUp ? (
              <>
                <div>
                  <div className="mb-10 inline-flex items-center gap-3 border-b border-white/[0.08] pb-3">
                    <KeyRound className="h-4 w-4 text-nexus-accent/80" />
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
                      Returning session
                    </span>
                  </div>
                  <h1 className="font-display text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-tight text-white">
                    Goals, tasks,
                    <br />
                    <span className="text-neutral-500">&amp; focused time.</span>
                  </h1>
                  <p className="mt-8 max-w-[20rem] text-base leading-relaxed text-neutral-500 xl:max-w-md">
                    Continue to your Lattice workspace—goals, task list, and focus sessions. Your session is private and
                    secure.
                  </p>
                </div>
                <div className="relative mt-12">
                  <div className="absolute -left-1 top-0 h-24 w-px bg-gradient-to-b from-nexus-accent/50 to-transparent" />
                  <p className="pl-6 font-mono text-[11px] uppercase tracking-[0.2em] text-neutral-600">
                    Secure channel · TLS
                  </p>
                </div>
              </>
            ) : (
              <>
                <div>
                  <div className="mb-10 inline-flex items-center gap-3 border-b border-nexus-accent/20 pb-3">
                    <UserPlus className="h-4 w-4 text-nexus-accent" />
                    <span className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-nexus-accent/90">
                      New workspace
                    </span>
                  </div>
                  <h1 className="font-display text-[clamp(2rem,3.8vw,3.25rem)] font-semibold leading-[1.08] tracking-tight text-white">
                    Plan goals.
                    <br />
                    <span className="text-nexus-accent">Ship tasks.</span>
                  </h1>
                  <p className="mt-8 max-w-[20rem] text-base leading-relaxed text-neutral-500 xl:max-w-md">
                    One account for strategic goals, the tasks that deliver them, and timed focus blocks that keep work
                    on track.
                  </p>
                  <ul className="mt-10 space-y-3">
                    {[
                      'Overview of goals and tasks',
                      'Goals and tasks in one workspace',
                      'Pomodoro-style focus workflow',
                    ].map(
                      (line) => (
                        <li key={line} className="flex items-start gap-3 text-sm text-neutral-400">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded border border-nexus-accent/30 bg-nexus-accent/10">
                            <Check className="h-3 w-3 text-nexus-accent" strokeWidth={3} />
                          </span>
                          {line}
                        </li>
                      ),
                    )}
                  </ul>
                </div>
                <div className="mt-12 rounded-lg border border-white/[0.06] bg-nexus-void/40 px-4 py-3">
                  <p className="text-xs leading-relaxed text-neutral-600">
                    Registration stores the account data required for authentication. Configure OAuth client IDs in
                    the API environment for Google and GitHub sign-in.
                  </p>
                </div>
              </>
            )}

            <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
              <span>© {new Date().getFullYear()}</span>
              <span className="h-1 w-1 rounded-full bg-neutral-700" />
              <span>{isSignUp ? 'Onboarding' : 'Login'}</span>
            </div>
          </div>
        </aside>

        {/* Mobile hero — distinct per mode */}
        <header className="border-b border-white/[0.06] px-6 pb-8 pt-[max(1.5rem,env(safe-area-inset-top))] lg:hidden">
          <div className="mb-5">
            <AuthHomeLink />
          </div>
          <div className="mb-3 flex items-center gap-2">
            {!isSignUp ? (
              <KeyRound className="h-4 w-4 text-nexus-accent/80" />
            ) : (
              <UserPlus className="h-4 w-4 text-nexus-accent" />
            )}
            <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
              {isSignUp ? 'New workspace' : 'Returning session'}
            </p>
          </div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white">
            {isSignUp ? (
              <>
                Create <span className="text-nexus-accent">workspace</span>
              </>
            ) : (
              <>
                Sign in to <span className="text-nexus-accent">continue</span>
              </>
            )}
          </h1>
        </header>

        {/* Form column */}
        <main className="relative flex flex-1 flex-col justify-center px-6 py-12 sm:px-10 lg:px-16 xl:px-24">
          <div
            className={`animate-fade-up mx-auto w-full ${isSignUp ? 'max-w-[480px]' : 'max-w-[420px]'}`}
            style={{ animationDelay: '0.05s' }}
          >
            <div className="mb-6 hidden lg:block">
              <AuthHomeLink />
            </div>
            <div className="mb-8 hidden items-start justify-between gap-4 lg:flex">
              <div>
                <p className="font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500">
                  {isSignUp ? 'Onboarding' : 'Access'}
                </p>
                <h2 className="font-display mt-2 text-3xl font-semibold tracking-tight text-white">
                  {isSignUp ? 'Create workspace' : 'Sign in'}
                </h2>
                <p className="mt-2 max-w-sm text-sm text-neutral-500">
                  {isSignUp
                    ? 'Create your workspace with OAuth or email and password below.'
                    : 'Sign in with email and password or a linked identity provider.'}
                </p>
              </div>
              <div
                className={`hidden shrink-0 rounded-2xl border p-3 sm:flex ${
                  isSignUp
                    ? 'border-nexus-accent/25 bg-nexus-accent/[0.07]'
                    : 'border-white/[0.08] bg-nexus-void/60'
                }`}
              >
                {isSignUp ? (
                  <UserPlus className="h-8 w-8 text-nexus-accent" />
                ) : (
                  <KeyRound className="h-8 w-8 text-neutral-400" />
                )}
              </div>
            </div>

            <div
              className={`border p-6 shadow-[0_0_0_1px_rgba(255,255,255,0.03)_inset] backdrop-blur-xl sm:p-8 ${
                isSignUp
                  ? 'rounded-3xl border-nexus-accent/15 bg-gradient-to-b from-nexus-panel/95 to-nexus-void/90'
                  : 'rounded-2xl border-nexus-line bg-nexus-panel/90'
              }`}
            >
              {!twoFactorStep ? (
              <div className="mb-8 flex flex-wrap items-center justify-between gap-3 border-b border-white/[0.06] pb-6">
                <p className="text-sm text-neutral-400">
                  {isSignUp ? 'Already have an account?' : 'New here?'}
                </p>
                <button
                  type="button"
                  onClick={() => switchMode(!isSignUp)}
                  className="font-mono text-[11px] font-medium uppercase tracking-[0.14em] text-nexus-accent transition hover:text-[#d4f76f]"
                >
                  {isSignUp ? 'Sign in instead' : 'Create workspace'}
                </button>
              </div>
              ) : null}

              {twoFactorStep ? (
                <form onSubmit={handleTwoFactorSubmit} className="space-y-6">
                  <div className="flex items-start gap-3 rounded-xl border border-nexus-accent/20 bg-nexus-accent/[0.06] px-4 py-3">
                    <Shield className="mt-0.5 h-5 w-5 shrink-0 text-nexus-accent" strokeWidth={2} aria-hidden />
                    <div>
                      <p className="text-sm font-medium text-white">Two-factor authentication</p>
                      <p className="mt-1 text-xs leading-relaxed text-neutral-500">
                        Open your authenticator app and enter the 6-digit code for Lattice.
                      </p>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor="auth-totp" className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500">
                      Authentication code
                    </label>
                    <input
                      id="auth-totp"
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      placeholder="000000"
                      value={totpCode}
                      onChange={(e) => setTotpCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                      className="w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-center font-mono text-xl tracking-[0.3em] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50"
                      maxLength={6}
                      required
                      autoFocus
                    />
                  </div>
                  {error ? (
                    <div className="rounded-lg border border-red-500/25 bg-red-500/[0.07] px-4 py-3">
                      <p className="text-sm text-red-300/95">{error}</p>
                    </div>
                  ) : null}
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <button
                      type="button"
                      onClick={backFromTwoFactor}
                      className="rounded-lg border border-white/[0.1] px-4 py-3 text-sm font-medium text-neutral-400 transition hover:border-white/[0.18] hover:text-white"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      disabled={loading || totpCode.length < 6}
                      className="flex-1 rounded-lg bg-nexus-accent px-4 py-3 text-sm font-semibold text-nexus-void transition hover:bg-[#d4f76f] disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {loading ? 'Verifying…' : 'Verify and continue'}
                    </button>
                  </div>
                </form>
              ) : (
                <>
              {/* OAuth: compact row on sign-in, full-width rows on sign-up */}
              {!isSignUp ? (
                <div className="grid grid-cols-2 gap-2 sm:gap-3">
                  {OAUTH.map(({ provider, label, icon, hint }) => (
                    <button
                      key={provider}
                      type="button"
                      title={hint}
                      onClick={() => handleOAuth(provider)}
                      disabled={loading || oauthBusy}
                      className="group flex flex-col items-center gap-2 rounded-xl border border-white/[0.08] bg-nexus-void/80 px-2 py-3.5 transition-all hover:border-[rgba(200,245,98,0.25)] hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50 disabled:cursor-not-allowed disabled:opacity-40 sm:py-4"
                    >
                      {oauthProvider === provider ? (
                        <svg className="h-5 w-5 animate-spin text-nexus-accent" fill="none" viewBox="0 0 24 24">
                          <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                          />
                          <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                          />
                        </svg>
                      ) : (
                        <span className="transition-transform group-hover:scale-105">{icon}</span>
                      )}
                      <span className="text-center text-[10px] font-medium uppercase tracking-[0.12em] text-neutral-500 group-hover:text-neutral-300 sm:text-[11px]">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="space-y-2.5">
                  {OAUTH.map(({ provider, label, icon, hint }) => (
                    <button
                      key={provider}
                      type="button"
                      title={hint}
                      onClick={() => handleOAuth(provider)}
                      disabled={loading || oauthBusy}
                      className="group flex w-full items-center gap-4 rounded-xl border border-white/[0.08] bg-nexus-void/60 px-4 py-3.5 text-left transition-all hover:border-nexus-accent/30 hover:bg-white/[0.04] focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/40 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-white/[0.06] bg-nexus-panel">
                        {oauthProvider === provider ? (
                          <svg className="h-5 w-5 animate-spin text-nexus-accent" fill="none" viewBox="0 0 24 24">
                            <circle
                              className="opacity-25"
                              cx="12"
                              cy="12"
                              r="10"
                              stroke="currentColor"
                              strokeWidth="4"
                            />
                            <path
                              className="opacity-75"
                              fill="currentColor"
                              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                            />
                          </svg>
                        ) : (
                          icon
                        )}
                      </span>
                      <span className="text-sm font-medium text-neutral-200">
                        Continue with <span className="text-white">{label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <AuthSectionDivider label={isSignUp ? 'EMAIL & PASSWORD' : 'EMAIL'} />

              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="space-y-1.5">
                  <label
                    htmlFor="auth-email"
                    className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500"
                  >
                    Email
                  </label>
                  <input
                    id="auth-email"
                    type="email"
                    placeholder="name@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    autoComplete="email"
                    required
                    className="w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50"
                  />
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-baseline justify-between gap-2">
                    <label
                      htmlFor="auth-password"
                      className="font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500"
                    >
                      Password
                    </label>
                    {isSignUp && (
                      <span className="text-[10px] text-neutral-600">8+ chars · mixed case · number · symbol</span>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      id="auth-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="········"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      autoComplete={isSignUp ? 'new-password' : 'current-password'}
                      required
                      minLength={isSignUp ? 8 : undefined}
                      className="w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-3 pr-12 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-2 text-neutral-500 transition hover:bg-white/[0.05] hover:text-white"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                {isSignUp ? (
                  <p className="text-[11px] leading-relaxed text-neutral-600">
                    Use at least 8 characters including uppercase, lowercase, a number, and a special character.
                  </p>
                ) : null}

                {error && (
                  <div className="rounded-lg border border-red-500/25 bg-red-500/[0.07] px-4 py-3">
                    <p className="text-sm text-red-300/95">{error}</p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || oauthBusy}
                  className={`group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-lg px-4 py-3.5 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/60 focus-visible:ring-offset-2 focus-visible:ring-offset-nexus-panel disabled:cursor-not-allowed disabled:opacity-50 ${
                    isSignUp
                      ? 'border border-nexus-accent/40 bg-nexus-accent/10 text-nexus-accent hover:bg-nexus-accent/15'
                      : 'bg-nexus-accent text-nexus-void hover:bg-[#d4f76f]'
                  }`}
                >
                  {loading ? (
                    <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24" aria-hidden>
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      />
                    </svg>
                  ) : (
                    <>
                      {isSignUp ? 'Create workspace' : 'Enter workspace'}
                      <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                    </>
                  )}
                </button>
              </form>
                </>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
