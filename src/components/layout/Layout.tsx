import { type CSSProperties, type ReactNode, useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { SiteStatusNotice } from './SiteStatusNotice';
import { WorkspaceCelebration } from '../WorkspaceCelebration';
import { useNavigation, type Screen } from '../../contexts/NavigationContext';

interface LayoutProps {
  children: ReactNode;
}

const SCREEN_LABELS: Record<Screen, string> = {
  dashboard: 'Overview',
  pomodoro: 'Focus',
  'create-task': 'New task',
  'create-goal': 'New goal',
  tasks: 'Tasks',
  goals: 'Goals',
  settings: 'Settings',
};

/** Radial-only shell — layered glows (no grid) */
const APP_MAIN_BG: CSSProperties = {
  backgroundColor: '#050506',
  backgroundImage: [
    'radial-gradient(ellipse 110% 70% at 50% -5%, rgba(200,245,98,0.12), transparent 52%)',
    'radial-gradient(ellipse 45% 35% at 8% 12%, rgba(200,245,98,0.06), transparent 55%)',
    'radial-gradient(ellipse 45% 35% at 92% 10%, rgba(255,255,255,0.04), transparent 55%)',
    'radial-gradient(ellipse 50% 80% at 0% 45%, rgba(200,245,98,0.04), transparent 58%)',
    'radial-gradient(ellipse 50% 80% at 100% 48%, rgba(255,255,255,0.035), transparent 58%)',
    'radial-gradient(ellipse 70% 55% at 50% 42%, rgba(200,245,98,0.035), transparent 62%)',
    'radial-gradient(ellipse 55% 45% at 0% 100%, rgba(200,245,98,0.06), transparent 55%)',
    'radial-gradient(ellipse 50% 55% at 100% 100%, rgba(255,255,255,0.05), transparent 50%)',
    'radial-gradient(ellipse 90% 40% at 50% 105%, rgba(200,245,98,0.04), transparent 48%)',
  ].join(', '),
  backgroundRepeat: 'no-repeat',
};

export function Layout({ children }: LayoutProps) {
  const { currentScreen } = useNavigation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  useEffect(() => {
    setMobileNavOpen(false);
  }, [currentScreen]);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileNavOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [mobileNavOpen]);

  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)');
    const onChange = () => {
      if (mq.matches) setMobileNavOpen(false);
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    if (mobileNavOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [mobileNavOpen]);

  return (
    <div className="relative flex h-[100dvh] min-h-0 max-h-[100dvh] flex-col overflow-hidden bg-nexus-void lg:flex-row">
      {mobileNavOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[1px] lg:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      ) : null}

      <Sidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />

      <div className="relative z-10 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-nexus-void">
        <header className="flex shrink-0 items-center gap-3 border-b border-white/[0.06] bg-nexus-ink/95 px-3 py-3 pt-[max(0.75rem,env(safe-area-inset-top,0px))] backdrop-blur-sm lg:hidden">
          <button
            type="button"
            aria-expanded={mobileNavOpen}
            aria-controls="app-sidebar"
            onClick={() => setMobileNavOpen(true)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/60 text-neutral-300 transition hover:border-white/[0.14] hover:bg-white/[0.04] hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/40"
          >
            <Menu className="h-5 w-5" strokeWidth={2} aria-hidden />
          </button>
          <div className="min-w-0">
            <p className="font-display text-sm font-semibold leading-tight text-white">Lattice</p>
            <p className="truncate font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500">
              {SCREEN_LABELS[currentScreen]}
            </p>
          </div>
        </header>

        <main className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-nexus-void">
          <div
            className="min-h-0 flex-1 touch-pan-y overflow-y-auto overflow-x-hidden overscroll-y-contain [-webkit-overflow-scrolling:touch] lg:border-l lg:border-white/[0.04]"
            style={APP_MAIN_BG}
          >
            <div className="mx-auto w-full max-w-[1600px] px-4 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom,0px))] sm:px-5 sm:py-8 sm:pb-8 md:px-8 md:py-10 md:pb-10 lg:px-10 lg:pb-10 xl:px-12">
              {children}
            </div>
          </div>
        </main>
      </div>
      <WorkspaceCelebration />
      <SiteStatusNotice />
    </div>
  );
}
