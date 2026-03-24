import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/useAuth';
import {
  ArrowUpRight,
  Check,
  CircleDot,
  Focus,
  Layers,
  Rocket,
  Sparkles,
  Timer,
  Zap,
} from 'lucide-react';

const features = [
  {
    title: 'Goals as north stars',
    body: 'Align execution with outcomes so every sprint maps to a defined objective.',
    icon: CircleDot,
    span: 'md:col-span-2',
    accent: 'from-nexus-accent/12 to-transparent',
  },
  {
    title: 'Structured focus',
    body: 'Default 25 / 5 cadence to keep deep work and recovery predictable.',
    icon: Timer,
    span: 'md:col-span-1',
    accent: 'from-white/[0.04] to-transparent',
  },
  {
    title: 'Unified task fabric',
    body: 'Statuses and focus sessions in one place.',
    icon: Layers,
    span: 'md:col-span-1',
    accent: 'from-white/[0.04] to-transparent',
  },
  {
    title: 'Signal-first UI',
    body: 'A restrained dark interface with accent only where it drives action.',
    icon: Focus,
    span: 'md:col-span-2',
    accent: 'from-nexus-accent/10 to-transparent',
  },
];

const freePerks = [
  'Unlimited tasks',
  'Unlimited goals',
  'Full Pomodoro and focus workflow',
  'Goals and tasks stored locally',
  'No credit card, no paywalled tiers',
];

export function Landing() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-nexus-void font-auth text-neutral-300 antialiased">
      {/* Ambient */}
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-nexus-fade opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.22] bg-[length:56px_56px] bg-nexus-grid"
        style={{ maskImage: 'radial-gradient(ellipse 70% 60% at 50% 0%, black, transparent 72%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-24 top-1/4 h-[28rem] w-[28rem] rounded-full bg-nexus-accent/[0.07] blur-[120px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -left-32 bottom-0 h-80 w-80 rounded-full bg-violet-600/[0.06] blur-[100px]"
      />

      <header className="fixed left-0 right-0 top-0 z-50 border-b border-white/[0.06] bg-nexus-void/75 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
          <Link to="/" className="group flex items-center">
            <span className="font-display text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Lattice<span className="text-nexus-accent">.app</span>
            </span>
          </Link>
          <nav className="hidden items-center gap-8 md:flex">
            <a href="#work" className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-white">
              Work
            </a>
            <a href="#pricing" className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-white">
              Pricing
            </a>
            <a href="#access" className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-white">
              Access
            </a>
            <Link
              to="/news"
              className="font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500 transition hover:text-nexus-accent"
            >
              News
            </Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link
              to="/news"
              className="font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition hover:text-nexus-accent md:hidden"
            >
              News
            </Link>
            {!user ? (
              <Link
                to="/auth"
                className="hidden font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition hover:text-white sm:inline"
              >
                Sign in
              </Link>
            ) : null}
            <Link
              to={user ? '/app' : '/auth'}
              className="inline-flex items-center gap-2 rounded-full border border-nexus-accent/40 bg-nexus-accent/10 px-4 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-nexus-accent transition hover:bg-nexus-accent/20"
            >
              Open app
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* Hero — asymmetric, not a centered hero card */}
        <section className="relative px-5 pb-24 pt-28 sm:px-8 sm:pt-32 lg:pb-32 lg:pt-40">
          <div className="mx-auto max-w-6xl">
            <div className="grid items-end gap-12 lg:grid-cols-12 lg:gap-8">
              <div className="lg:col-span-7">
                <p className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/[0.08] bg-nexus-ink/80 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.28em] text-[#5A7B8F]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-nexus-accent shadow-[0_0_8px_rgba(200,245,98,0.7)]" />
                  Lattice
                </p>
                <h1 className="font-display text-[clamp(2.5rem,6vw,4.25rem)] font-semibold leading-[0.95] tracking-tight text-white">
                  Rhythm for
                  <br />
                  <span className="bg-gradient-to-r from-white via-neutral-200 to-neutral-500 bg-clip-text text-transparent">
                    serious
                  </span>{' '}
                  <span className="text-nexus-accent">work.</span>
                </h1>
                <p className="mt-8 max-w-xl text-lg leading-relaxed text-neutral-500">
                  Lattice is a focused workspace for outcomes and execution: priorities stay visible, work stays
                  traceable, and focus sessions keep time accountable.
                </p>
                <div className="mt-10 flex flex-wrap items-center gap-4">
                  <Link
                    to={user ? '/app' : '/auth'}
                    className="group inline-flex items-center gap-3 rounded-2xl bg-nexus-accent px-7 py-4 font-display text-sm font-semibold text-nexus-void shadow-[0_0_40px_-8px_rgba(200,245,98,0.55)] transition hover:bg-[#d4f76f]"
                  >
                    {user ? 'Open app' : 'Get started — free'}
                    <Zap className="h-4 w-4 transition group-hover:rotate-12" />
                  </Link>
                  <a
                    href="#work"
                    className="inline-flex items-center gap-2 rounded-2xl border border-white/[0.1] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.16em] text-neutral-400 transition hover:border-white/[0.18] hover:text-white"
                  >
                    See the layout
                  </a>
                </div>
              </div>
              <div className="relative lg:col-span-5">
                <div className="relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br from-nexus-panel/90 to-nexus-void p-1 shadow-2xl shadow-black/40">
                  <div className="rounded-[1.35rem] bg-nexus-ink/90 p-6 sm:p-8">
                    <div className="mb-6 flex items-center justify-between border-b border-white/[0.06] pb-4">
                      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">
                        Focus block
                      </span>
                      <span className="rounded-md border border-nexus-accent/25 bg-nexus-accent/10 px-2 py-0.5 font-mono text-[10px] text-nexus-accent">
                        25:00
                      </span>
                    </div>
                    <div className="space-y-4 font-mono text-[11px] leading-relaxed text-neutral-500">
                      <div className="flex items-center gap-2 text-neutral-400">
                        <Check className="h-3.5 w-3.5 text-nexus-accent" strokeWidth={3} />
                        Ship landing outline
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="h-3.5 w-3.5 rounded border border-neutral-600" />
                        Wire Pomodoro presets
                      </div>
                      <div className="flex items-center gap-2 opacity-50">
                        <span className="h-3.5 w-3.5 rounded border border-neutral-700" />
                        Review Q2 goal delta
                      </div>
                    </div>
                    <div className="mt-8 h-2 overflow-hidden rounded-full bg-nexus-void">
                      <div className="h-full w-[62%] rounded-full bg-gradient-to-r from-nexus-accent to-nexus-accent-dim" />
                    </div>
                    <p className="mt-3 text-right font-mono text-[10px] text-neutral-600">62% · sprint calm</p>
                  </div>
                </div>
                {/* Floating tag */}
                <div className="absolute -bottom-4 -left-4 hidden rotate-[-6deg] rounded-2xl border border-white/[0.09] bg-nexus-panel px-4 py-3 shadow-xl sm:block">
                  <p className="font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-500">Pattern</p>
                  <p className="mt-1 font-display text-sm text-white">Goals → Tasks → Timer</p>
                </div>
              </div>
            </div>

            {/* Marquee strip */}
            <div className="mt-20 overflow-hidden border-y border-white/[0.05] bg-nexus-ink/40 py-4">
              <div className="flex w-max animate-marquee font-mono text-[11px] uppercase tracking-[0.35em] text-neutral-600">
                {[0, 1].map((dup) => (
                  <div key={dup} className="flex shrink-0 items-center gap-12 pr-12">
                    {['tasks', 'goals', 'pomodoro', 'focus', 'sprints', 'calm', 'flow'].map((word) => (
                      <span key={`${dup}-${word}`} className="flex items-center gap-12">
                        <span>{word}</span>
                        <span className="text-nexus-accent/40">✦</span>
                      </span>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Bento */}
        <section id="work" className="scroll-mt-24 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="mb-14 max-w-2xl">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-nexus-accent/90">The surface</p>
              <h2 className="font-display mt-3 text-3xl font-semibold tracking-tight text-white sm:text-4xl">
                Designed as a focused workspace —{' '}
                <span className="text-neutral-500">not a generic dashboard.</span>
              </h2>
            </div>
            <div className="grid gap-4 md:grid-cols-3">
              {features.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className={`group relative overflow-hidden rounded-3xl border border-white/[0.06] bg-gradient-to-br ${f.accent} p-6 sm:p-8 ${f.span}`}
                  >
                    <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-nexus-accent/[0.04] blur-2xl transition group-hover:bg-nexus-accent/[0.08]" />
                    <Icon className="relative h-7 w-7 text-nexus-accent" strokeWidth={1.5} />
                    <h3 className="relative mt-6 font-display text-xl text-white">{f.title}</h3>
                    <p className="relative mt-2 max-w-sm text-sm leading-relaxed text-neutral-500">{f.body}</p>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Pricing — fully free */}
        <section id="pricing" className="scroll-mt-24 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="mb-12 text-center">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-500">Pricing</p>
              <h2 className="font-display mt-3 text-3xl font-semibold text-white sm:text-4xl">
                Free. Full stop.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-neutral-400">
                Lattice is <span className="text-white">free to use</span>. Core productivity features—tasks, goals, and
                focus sessions—are included without tiers, usage caps, or forced upgrades.
              </p>
            </div>
            <div className="relative overflow-hidden rounded-[2rem] border border-nexus-accent/25 bg-gradient-to-b from-nexus-accent/[0.09] via-nexus-panel/50 to-nexus-void p-[1px] shadow-[0_0_80px_-24px_rgba(200,245,98,0.25)]">
              <div className="rounded-[1.95rem] bg-nexus-ink/95 px-8 py-12 sm:px-12">
                <div className="flex flex-col items-center text-center sm:flex-row sm:items-start sm:justify-between sm:text-left">
                  <div>
                    <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nexus-accent">The whole product</p>
                    <p className="font-display mt-2 text-5xl font-semibold tracking-tight text-white sm:text-6xl">
                      $0
                    </p>
                    <p className="mt-1 font-mono text-[11px] uppercase tracking-[0.18em] text-neutral-500">forever · no limits</p>
                  </div>
                  <p className="mt-8 max-w-sm text-sm leading-relaxed text-neutral-400 sm:mt-0 sm:pl-8 sm:text-right">
                    Your account includes the full core product: unlimited tasks and goals and structured focus sessions.
                    Any future paid offerings would be optional extensions—not a requirement
                    for basic use.
                  </p>
                </div>
                <ul className="mt-10 grid gap-3 sm:grid-cols-1">
                  {freePerks.map((p) => (
                    <li
                      key={p}
                      className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-nexus-void/60 px-4 py-3 text-left text-sm text-neutral-300"
                    >
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-nexus-accent" strokeWidth={2.5} />
                      {p}
                    </li>
                  ))}
                </ul>
                <div className="mt-10 flex justify-center">
                  <Link
                    to={user ? '/app' : '/auth'}
                    className="inline-flex items-center gap-2 rounded-2xl bg-nexus-accent px-8 py-4 font-display text-sm font-semibold text-nexus-void transition hover:bg-[#d4f76f]"
                  >
                    {user ? 'Open app' : 'Open Lattice'}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Auth CTA block */}
        <section id="access" className="scroll-mt-24 px-5 py-24 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="relative overflow-hidden rounded-[2rem] border border-nexus-accent/20 bg-gradient-to-br from-nexus-accent/[0.08] via-nexus-ink/80 to-nexus-void p-[1px]">
              <div className="relative rounded-[1.95rem] bg-nexus-ink/95 px-8 py-16 text-center sm:px-16">
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 opacity-30 bg-[length:40px_40px] bg-nexus-grid"
                  style={{ maskImage: 'linear-gradient(to bottom, black, transparent)' }}
                />
                <Sparkles className="relative mx-auto h-10 w-10 text-nexus-accent" />
                <h2 className="relative mt-6 font-display text-3xl font-semibold text-white sm:text-4xl">
                  {user ? "You're signed in." : 'Authentication, on a dedicated screen.'}
                </h2>
                <p className="relative mx-auto mt-4 max-w-lg text-neutral-400">
                  {user
                    ? 'Jump back into your workspace—goals, tasks, and focus sessions are ready.'
                    : 'Sign in or register with OAuth or email. The same Lattice visual language and a clear layout—minimal distraction, maximum clarity.'}
                </p>
                <div className="relative mt-10 flex flex-wrap justify-center gap-4">
                  <Link
                    to={user ? '/app' : '/auth'}
                    className="inline-flex items-center gap-2 rounded-2xl bg-nexus-accent px-8 py-4 font-display text-sm font-semibold text-nexus-void transition hover:bg-[#d4f76f]"
                  >
                    {user ? 'Open app' : 'Sign in or register'}
                    <ArrowUpRight className="h-4 w-4" />
                  </Link>
                  <Link
                    to="/"
                    className="inline-flex items-center rounded-2xl border border-white/[0.1] px-6 py-4 font-mono text-[11px] uppercase tracking-[0.14em] text-neutral-400 transition hover:text-white"
                  >
                    Back to top
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-white/[0.06] bg-nexus-void px-5 py-14 sm:px-8">
        <div className="mx-auto flex max-w-6xl flex-col gap-12 md:flex-row md:justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-lg font-semibold text-white">Lattice</span>
              <span className="font-mono text-[10px] text-neutral-600">/ productivity OS</span>
            </div>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-neutral-500">
              Lattice brings goals, tasks, and focus into one disciplined workspace—without the noise of typical SaaS
              marketing.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-10 sm:grid-cols-3">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Product</p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li>
                  <a href="#work" className="transition hover:text-nexus-accent">
                    Work
                  </a>
                </li>
                <li>
                  <a href="#pricing" className="transition hover:text-nexus-accent">
                    Pricing
                  </a>
                </li>
                <li>
                  <Link to={user ? '/app' : '/auth'} className="transition hover:text-nexus-accent">
                    {user ? 'Open app' : 'Sign in'}
                  </Link>
                </li>
                <li>
                  <Link to="/news" className="transition hover:text-nexus-accent">
                    News
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Legal</p>
              <ul className="mt-4 space-y-2 text-sm text-neutral-400">
                <li>
                  <span className="cursor-not-allowed opacity-50">Privacy</span>
                </li>
                <li>
                  <span className="cursor-not-allowed opacity-50">Terms</span>
                </li>
              </ul>
            </div>
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">Colophon</p>
              <p className="mt-4 text-sm text-neutral-500">
                Outfit · Inter · IBM Plex Mono
                <br />
                <span className="text-neutral-600">Lime on void. Always.</span>
              </p>
            </div>
          </div>
        </div>
        <p className="mx-auto mt-14 max-w-6xl border-t border-white/[0.04] pt-8 text-center font-mono text-[10px] uppercase tracking-[0.25em] text-neutral-600">
          © {new Date().getFullYear()} lattice.app
        </p>
      </footer>

      <Link
        to="/news"
        className="group fixed bottom-[max(1.25rem,env(safe-area-inset-bottom,0px))] right-[max(1.25rem,env(safe-area-inset-right,0px))] z-[100] w-[min(22rem,calc(100vw-2rem))] animate-launch-toast overflow-hidden rounded-3xl border border-nexus-accent/30 bg-gradient-to-br from-nexus-panel/98 via-nexus-ink/98 to-nexus-void/98 p-5 shadow-[0_24px_64px_-16px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.04)_inset] backdrop-blur-2xl transition hover:border-nexus-accent/50 hover:shadow-[0_28px_72px_-12px_rgba(200,245,98,0.12),0_24px_64px_-16px_rgba(0,0,0,0.75)] motion-reduce:animate-none motion-reduce:opacity-100 motion-reduce:transform-none sm:bottom-8 sm:right-8 sm:w-[min(28rem,calc(100vw-3rem))] sm:p-6"
      >
        <div
          aria-hidden
          className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-nexus-accent/[0.12] blur-3xl transition group-hover:bg-nexus-accent/[0.18]"
        />
        <div className="relative flex gap-4 sm:gap-5">
          <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-nexus-accent/35 bg-nexus-accent/[0.12] shadow-[0_0_32px_-8px_rgba(200,245,98,0.35)] sm:h-16 sm:w-16">
            <Rocket className="h-7 w-7 text-nexus-accent sm:h-8 sm:w-8" strokeWidth={1.5} />
          </span>
          <span className="min-w-0 flex-1 pt-0.5 text-left">
            <span className="block font-mono text-[10px] uppercase tracking-[0.28em] text-nexus-accent sm:text-[11px]">
              Launch
            </span>
            <span className="mt-2 block font-display text-xl font-semibold leading-[1.15] tracking-tight text-white sm:text-2xl">
              We&apos;re live
            </span>
            <span className="mt-2 block text-[13px] leading-snug text-neutral-500 sm:text-sm">
              Release notes, scope, and product direction.
            </span>
          </span>
          <span className="flex shrink-0 flex-col items-end justify-between self-stretch pt-1">
            <ArrowUpRight className="h-5 w-5 text-neutral-500 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-nexus-accent sm:h-6 sm:w-6" />
            <span className="hidden font-mono text-[9px] uppercase tracking-[0.2em] text-neutral-600 sm:block">News</span>
          </span>
        </div>
        <div className="relative mt-4 flex items-center justify-between border-t border-white/[0.06] pt-4 font-mono text-[10px] uppercase tracking-[0.18em] text-neutral-600 sm:mt-5 sm:pt-5">
          <span>Read release notes</span>
          <span className="text-nexus-accent/80 transition group-hover:text-nexus-accent">→</span>
        </div>
      </Link>
    </div>
  );
}
