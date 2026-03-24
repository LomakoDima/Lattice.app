import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronUp,
  Copy,
  Home,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Newspaper,
  Settings,
  Target,
  Timer,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNavigation, type Screen } from '../../contexts/NavigationContext';
import type { LocalUser } from '../../contexts/auth-types';
import { useAuth } from '../../contexts/useAuth';
import { listGoals, listTasks } from '../../lib/localWorkspace';

export interface SidebarProps {
  /** When true, mobile drawer is visible (lg+ ignores this). */
  mobileOpen?: boolean;
  /** Called after navigating or when drawer should close. */
  onMobileClose?: () => void;
}

function userInitials(u: LocalUser): string {
  const name = u.user_metadata?.full_name || u.user_metadata?.name || u.email || '';
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
  }
  return trimmed.slice(0, 2).toUpperCase();
}

function displayName(u: LocalUser): string {
  return (
    u.user_metadata?.full_name ||
    u.user_metadata?.name ||
    (u.email ? u.email.split('@')[0] : '') ||
    'Account'
  );
}

export function Sidebar({ mobileOpen = false, onMobileClose }: SidebarProps = {}) {
  const navigate = useNavigate();
  const { currentScreen, setCurrentScreen } = useNavigation();
  const { signOut, user } = useAuth();

  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const [taskPreview, setTaskPreview] = useState<{ count: number; lines: string[] }>({ count: 0, lines: [] });
  const [goalPreview, setGoalPreview] = useState<{ count: number; lines: string[] }>({ count: 0, lines: [] });

  const loadPinned = useCallback(async () => {
    if (!user) return;

    const mergedTasks = listTasks(user.id);
    const mergedGoals = listGoals(user.id).filter((g) => g.status === 'active');

    setTaskPreview({
      count: mergedTasks.length,
      lines: mergedTasks.slice(0, 2).map((r) => r.title).filter(Boolean),
    });
    setGoalPreview({
      count: mergedGoals.length,
      lines: mergedGoals.slice(0, 2).map((r) => r.title).filter(Boolean),
    });
  }, [user]);

  useEffect(() => {
    void loadPinned();
  }, [loadPinned, currentScreen]);

  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState === 'visible') void loadPinned();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [loadPinned]);

  useEffect(() => {
    if (!accountMenuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (accountMenuRef.current && !accountMenuRef.current.contains(e.target as Node)) {
        setAccountMenuOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setAccountMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [accountMenuOpen]);

  const menuItems: { id: Screen; icon: typeof LayoutDashboard; label: string }[] = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Overview' },
    { id: 'pomodoro', icon: Timer, label: 'Focus' },
    { id: 'settings', icon: Settings, label: 'Settings' },
  ];

  const navigateTo = (id: Screen) => {
    setCurrentScreen(id);
    onMobileClose?.();
  };

  const closeAccountMenu = () => setAccountMenuOpen(false);

  const accountMenuItemClass =
    'flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-neutral-300 transition hover:bg-white/[0.06] hover:text-white';

  const copyEmail = async () => {
    if (!user?.email) return;
    try {
      await navigator.clipboard.writeText(user.email);
    } catch {
      /* ignore */
    }
    closeAccountMenu();
  };

  return (
    <aside
      id="app-sidebar"
      className={`fixed inset-y-0 left-0 z-50 flex h-[100dvh] w-[min(17rem,calc(100vw-1.25rem))] max-w-[17rem] shrink-0 flex-col border-r border-white/[0.06] bg-nexus-ink shadow-[4px_0_32px_rgba(0,0,0,0.45)] transition-transform duration-300 ease-out will-change-transform lg:relative lg:z-20 lg:h-screen lg:w-[17rem] lg:max-w-none lg:translate-x-0 lg:shadow-none ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
      } ${!mobileOpen ? 'pointer-events-none lg:pointer-events-auto' : ''}`}
    >
      <div className="border-b border-white/[0.06] px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/[0.08] bg-nexus-panel">
            <span className="font-display text-xs font-semibold text-nexus-accent">L</span>
          </div>
          <div>
            <h1 className="font-display text-[15px] font-semibold tracking-tight text-white">Lattice</h1>
            <p className="text-[11px] text-neutral-600">Workspace</p>
          </div>
        </div>
      </div>

      <div className="border-b border-white/[0.06] px-3 py-3">
        <p className="px-2 pb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-600">Library</p>
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => navigateTo('tasks')}
            className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
              currentScreen === 'tasks'
                ? 'border-nexus-accent/35 bg-nexus-accent/[0.08]'
                : 'border-white/[0.08] bg-nexus-void/40 hover:border-white/[0.12] hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <ListTodo className="h-4 w-4 shrink-0 text-nexus-accent" strokeWidth={1.75} />
                Tasks
              </span>
              <span className="font-mono text-[11px] tabular-nums text-nexus-accent">{taskPreview.count}</span>
            </div>
            <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
              {taskPreview.lines.length === 0 ? (
                <p className="line-clamp-2 text-[11px] leading-snug text-neutral-600">No tasks yet</p>
              ) : (
                taskPreview.lines.map((line, i) => (
                  <p key={i} className="line-clamp-1 text-[11px] leading-snug text-neutral-500">
                    {line}
                  </p>
                ))
              )}
            </div>
          </button>

          <button
            type="button"
            onClick={() => navigateTo('goals')}
            className={`w-full rounded-xl border px-3 py-2.5 text-left transition ${
              currentScreen === 'goals'
                ? 'border-nexus-accent/35 bg-nexus-accent/[0.08]'
                : 'border-white/[0.08] bg-nexus-void/40 hover:border-white/[0.12] hover:bg-white/[0.03]'
            }`}
          >
            <div className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-[13px] font-semibold text-white">
                <Target className="h-4 w-4 shrink-0 text-nexus-accent" strokeWidth={1.75} />
                Goals
              </span>
              <span className="font-mono text-[11px] tabular-nums text-nexus-accent">{goalPreview.count}</span>
            </div>
            <div className="mt-2 space-y-1 border-t border-white/[0.06] pt-2">
              {goalPreview.lines.length === 0 ? (
                <p className="line-clamp-2 text-[11px] leading-snug text-neutral-600">No active goals</p>
              ) : (
                goalPreview.lines.map((line, i) => (
                  <p key={i} className="line-clamp-1 text-[11px] leading-snug text-neutral-500">
                    {line}
                  </p>
                ))
              )}
            </div>
          </button>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto p-3">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentScreen === item.id;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => navigateTo(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-left text-[13px] transition-colors duration-150 ${
                isActive
                  ? 'bg-white/[0.07] text-white'
                  : 'text-neutral-500 hover:bg-white/[0.04] hover:text-neutral-200'
              }`}
            >
              <Icon className={`h-[18px] w-[18px] shrink-0 ${isActive ? 'text-nexus-accent' : ''}`} strokeWidth={1.75} />
              <span className="font-medium">{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="relative border-t border-white/[0.06] p-3">
        <div ref={accountMenuRef} className="relative">
          <button
            type="button"
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            className="flex w-full items-center gap-2.5 rounded-xl border border-white/[0.08] bg-nexus-void/50 px-2.5 py-2 text-left transition hover:border-white/[0.12] hover:bg-white/[0.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/40"
          >
            <span
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-nexus-accent/25 bg-nexus-accent/[0.12] font-display text-[11px] font-semibold uppercase tracking-tight text-nexus-accent"
              aria-hidden
            >
              {user ? userInitials(user) : '?'}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[12px] font-semibold text-white">{user ? displayName(user) : '—'}</p>
              {user?.email && (
                <p className="truncate font-mono text-[10px] text-neutral-500">{user.email}</p>
              )}
            </div>
            <ChevronUp
              className={`h-4 w-4 shrink-0 text-neutral-500 transition-transform duration-200 ${
                accountMenuOpen ? 'rotate-0' : 'rotate-180'
              }`}
              strokeWidth={2}
              aria-hidden
            />
          </button>

          {accountMenuOpen && (
            <div
              role="menu"
              className="absolute bottom-full left-0 right-0 z-50 mb-1.5 max-h-[min(70vh,22rem)] overflow-y-auto overflow-x-hidden rounded-xl border border-white/[0.1] bg-nexus-panel/95 py-1 shadow-[0_-8px_32px_rgba(0,0,0,0.45)] backdrop-blur-md"
            >
              <p className="px-3 pb-1 pt-1.5 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                Workspace
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateTo('dashboard');
                  closeAccountMenu();
                }}
                className={accountMenuItemClass}
              >
                <LayoutDashboard className="h-4 w-4 shrink-0 text-nexus-accent/90" strokeWidth={1.75} />
                Overview
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateTo('tasks');
                  closeAccountMenu();
                }}
                className={accountMenuItemClass}
              >
                <ListTodo className="h-4 w-4 shrink-0 text-nexus-accent/90" strokeWidth={1.75} />
                Tasks
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateTo('goals');
                  closeAccountMenu();
                }}
                className={accountMenuItemClass}
              >
                <Target className="h-4 w-4 shrink-0 text-nexus-accent/90" strokeWidth={1.75} />
                Goals
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateTo('pomodoro');
                  closeAccountMenu();
                }}
                className={accountMenuItemClass}
              >
                <Timer className="h-4 w-4 shrink-0 text-nexus-accent/90" strokeWidth={1.75} />
                Focus
              </button>

              <div className="my-1 h-px bg-white/[0.08]" role="separator" />

              <p className="px-3 pb-1 pt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                App
              </p>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigate('/landing');
                  closeAccountMenu();
                  onMobileClose?.();
                }}
                className={accountMenuItemClass}
              >
                <Home className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                Home
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigate('/news');
                  closeAccountMenu();
                  onMobileClose?.();
                }}
                className={accountMenuItemClass}
              >
                <Newspaper className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                News
              </button>
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  navigateTo('settings');
                  closeAccountMenu();
                }}
                className={accountMenuItemClass}
              >
                <Settings className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                Settings
              </button>

              {user?.email ? (
                <>
                  <div className="my-1 h-px bg-white/[0.08]" role="separator" />
                  <p className="px-3 pb-1 pt-0.5 font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                    Account
                  </p>
                  <button type="button" role="menuitem" onClick={() => void copyEmail()} className={accountMenuItemClass}>
                    <Copy className="h-4 w-4 shrink-0 text-neutral-500" strokeWidth={1.75} />
                    Copy email
                  </button>
                </>
              ) : null}

              <div className="my-1 h-px bg-white/[0.08]" role="separator" />

              <button
                type="button"
                role="menuitem"
                onClick={async () => {
                  closeAccountMenu();
                  onMobileClose?.();
                  await signOut();
                  navigate('/', { replace: true });
                }}
                className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left text-[13px] font-medium text-red-300/95 transition hover:bg-red-500/[0.12] hover:text-red-200"
              >
                <LogOut className="h-4 w-4 shrink-0 text-red-400/80" strokeWidth={1.75} />
                Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
