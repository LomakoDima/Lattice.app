import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';

const releaseMeta = {
  label: 'General availability',
  code: '2026.03',
  date: 'March 23, 2026',
  status: 'Stable',
};

const scopeItems = [
  'Goals, tasks, categories, and optional goal linkage on tasks',
  'Deadlines and task statuses (including completed)',
  'Dashboard overview and Pomodoro focus sessions',
  'Supabase-backed authentication — email and OAuth',
];

const highlights = [
  {
    k: 'Product',
    v: 'A single workspace for strategic goals and day-to-day execution.',
  },
  {
    k: 'Data',
    v: 'Records are scoped to your account; row-level security applies where supported.',
  },
];

export function News() {
  return (
    <div className="min-h-screen bg-nexus-void font-auth text-neutral-300 antialiased">
      <div aria-hidden className="pointer-events-none fixed inset-0 bg-nexus-fade opacity-80" />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 opacity-[0.12] bg-[length:48px_48px] bg-nexus-grid"
        style={{ maskImage: 'radial-gradient(ellipse 80% 50% at 50% 0%, black, transparent 70%)' }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed -right-32 top-1/4 h-[32rem] w-[32rem] rounded-full bg-nexus-accent/[0.06] blur-[140px]"
      />
      <div
        aria-hidden
        className="pointer-events-none fixed bottom-0 left-0 h-72 w-72 rounded-full bg-violet-600/[0.05] blur-[100px]"
      />

      <header className="relative border-b border-white/[0.05] bg-nexus-void/70 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5 sm:h-16 sm:px-8">
          <Link
            to="/"
            className="group inline-flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-500 transition hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
            Lattice
          </Link>
          <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-neutral-600">Release notes</span>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-5 pb-28 pt-16 sm:px-8 sm:py-24 lg:pb-36">
        <div className="lg:grid lg:grid-cols-12 lg:gap-x-12 lg:gap-y-16">
          {/* Hero column */}
          <div className="lg:col-span-12">
            <p className="font-mono text-[10px] uppercase tracking-[0.35em] text-neutral-600">Product</p>
            <h1 className="font-display mt-4 text-[clamp(2.25rem,5vw,3.75rem)] font-semibold leading-[1.05] tracking-tight text-white">
              {releaseMeta.label}
            </h1>
            <p className="mt-6 max-w-2xl text-[15px] leading-relaxed text-neutral-500 sm:text-base">
              Lattice is now generally available. The production application matches the public experience: a focused
              workspace where goals remain visible, tasks stay actionable, and time is managed with structured focus
              sessions.
            </p>

            <dl className="mt-10 flex flex-wrap gap-x-10 gap-y-3 border-t border-white/[0.06] pt-8 font-mono text-[11px]">
              <div>
                <dt className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Release</dt>
                <dd className="mt-1 text-neutral-300">{releaseMeta.code}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Date</dt>
                <dd className="mt-1 text-neutral-300">{releaseMeta.date}</dd>
              </div>
              <div>
                <dt className="text-[9px] uppercase tracking-[0.2em] text-neutral-600">Channel</dt>
                <dd className="mt-1 text-emerald-400/90">{releaseMeta.status}</dd>
              </div>
            </dl>
          </div>

          {/* Body + sidebar */}
          <div className="mt-6 border-t border-white/[0.06] pt-14 lg:col-span-5 lg:mt-0 lg:border-t-0 lg:border-r lg:border-white/[0.06] lg:pr-10 lg:pt-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-nexus-accent/90">In scope</p>
            <ul className="mt-6 space-y-4">
              {scopeItems.map((line) => (
                <li
                  key={line}
                  className="relative pl-5 font-mono text-[13px] leading-relaxed text-neutral-400 before:absolute before:left-0 before:top-[0.55em] before:h-1 before:w-1 before:rounded-full before:bg-nexus-accent/70"
                >
                  {line}
                </li>
              ))}
            </ul>

            <div className="mt-12 border-t border-white/[0.06] pt-10">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-600">At a glance</p>
              <ul className="mt-5 space-y-5">
                {highlights.map((h) => (
                  <li key={h.k}>
                    <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-neutral-600">{h.k}</p>
                    <p className="mt-1.5 text-sm leading-relaxed text-neutral-400">{h.v}</p>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-14 lg:col-span-7 lg:mt-0 lg:pl-2">
            <div className="relative">
              <span
                aria-hidden
                className="pointer-events-none absolute -left-4 hidden select-none font-display text-[8rem] font-extrabold leading-none text-white/[0.03] sm:block lg:-left-8"
              >
                01
              </span>
              <span className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-600">Editorial</span>
              <h2 className="font-display relative mt-3 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
                Why this matters
              </h2>
              <div className="relative mt-8 space-y-6 text-[15px] leading-[1.75] text-neutral-400 sm:text-base">
                <p>
                  Most productivity tools optimize for volume. Lattice optimizes for <span className="text-neutral-300">clarity</span>
                  — a small set of primitives (goals, tasks, categories, deadlines) so you can reason about what to do
                  next without re-learning a system every week.
                </p>
                <p>
                  The Pomodoro block on the dashboard isn&apos;t decoration; it&apos;s how we expect work to be chunked.
                  Goals and tasks stay visible so you always see what you committed to next.
                </p>
              </div>

              <div className="relative mt-12 border-l-2 border-nexus-accent/40 pl-6 py-1">
                <p className="font-display text-lg italic leading-snug text-neutral-200 sm:text-xl">
                  Ship quietly. Measure honestly. Repeat.
                </p>
                <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.2em] text-neutral-600">— Lattice team</p>
              </div>

              <div className="mt-14">
                <h3 className="font-mono text-[10px] uppercase tracking-[0.28em] text-neutral-600">Forward</h3>
                <p className="mt-4 text-[15px] leading-relaxed text-neutral-500 sm:text-base">
                  We&apos;ll post substantive updates here — not marketing fluff. If something changes in how Lattice works,
                  you&apos;ll read it on this page first.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-20 flex flex-col items-start justify-between gap-6 border-t border-white/[0.06] pt-12 sm:flex-row sm:items-center">
          <p className="max-w-md text-sm leading-relaxed text-neutral-500">
            Already have an account?{' '}
            <Link to="/app" className="text-neutral-300 underline decoration-white/20 underline-offset-4 transition hover:text-nexus-accent hover:decoration-nexus-accent/50">
              Open the app
            </Link>
            . New here?{' '}
            <Link to="/auth" className="text-neutral-300 underline decoration-white/20 underline-offset-4 transition hover:text-nexus-accent hover:decoration-nexus-accent/50">
              Sign in or register
            </Link>
            .
          </p>
          <Link
            to="/auth"
            className="group inline-flex items-center gap-2 rounded-xl border border-white/[0.1] bg-nexus-panel/80 px-5 py-3 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-white transition hover:border-nexus-accent/35 hover:bg-nexus-accent/10"
          >
            Enter Lattice
            <ArrowUpRight className="h-4 w-4 text-neutral-500 transition group-hover:text-nexus-accent" />
          </Link>
        </div>
      </main>
    </div>
  );
}
