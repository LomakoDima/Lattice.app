import { useCallback, useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useAuth } from '../contexts/useAuth';
import { getGreetingName } from '../lib/greeting';
import { listGoals, listTasks } from '../lib/localWorkspace';
import { WORKSPACE_CHANGED } from '../lib/workspaceEvents';

const DISMISS_PREFIX = 'lattice-celebration-dismissed-session';

function dismissStorageKey(userId: string) {
  return `${DISMISS_PREFIX}:${userId}`;
}

const OPEN_TASK = new Set(['pending', 'running', 'waiting_approval']);

function isFullyWrappedUp(userId: string): boolean {
  const tasks = listTasks(userId);
  const goals = listGoals(userId);
  if (tasks.length === 0 && goals.length === 0) return false;
  const anyOpenTask = tasks.some((t) => OPEN_TASK.has(t.status));
  const anyActiveGoal = goals.some((g) => g.status === 'active');
  return !anyOpenTask && !anyActiveGoal;
}

export function WorkspaceCelebration() {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  const sync = useCallback(() => {
    const uid = user?.id;
    if (!uid) {
      setVisible(false);
      return;
    }
    const done = isFullyWrappedUp(uid);
    if (!done) {
      try {
        sessionStorage.removeItem(dismissStorageKey(uid));
      } catch {
        /* ignore */
      }
      setVisible(false);
      return;
    }
    try {
      if (sessionStorage.getItem(dismissStorageKey(uid)) === '1') {
        setVisible(false);
        return;
      }
    } catch {
      /* ignore */
    }
    setVisible(true);
  }, [user?.id]);

  useEffect(() => {
    sync();
  }, [sync]);

  useEffect(() => {
    const onChanged = () => sync();
    window.addEventListener(WORKSPACE_CHANGED, onChanged);
    return () => window.removeEventListener(WORKSPACE_CHANGED, onChanged);
  }, [sync]);

  const dismiss = () => {
    const uid = user?.id;
    if (uid) {
      try {
        sessionStorage.setItem(dismissStorageKey(uid), '1');
      } catch {
        /* ignore */
      }
    }
    setVisible(false);
  };

  if (!visible) return null;

  const name = getGreetingName(user) ?? 'there';

  return (
    <div
      className="fixed inset-0 z-[500] flex flex-col items-center justify-center px-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lattice-celebrate-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#050506]/88 backdrop-blur-[6px] motion-reduce:backdrop-blur-none"
        onClick={dismiss}
      />

      <div className="relative z-10 mx-auto flex max-w-md flex-col items-center text-center">
        {/* Single soft bloom — premium, not busy */}
        <div
          className="pointer-events-none absolute left-1/2 top-[2.5rem] h-44 w-44 -translate-x-1/2 rounded-full bg-nexus-accent/[0.12] blur-[48px] motion-reduce:opacity-80 lattice-celebrate-bloom"
          aria-hidden
        />

        <div className="relative mb-10 lattice-celebrate-hero-wrap motion-reduce:opacity-100">
          <div className="lattice-celebrate-hero-inner">
            <div className="flex h-[5.25rem] w-[5.25rem] items-center justify-center rounded-full border border-white/[0.12] bg-gradient-to-b from-white/[0.09] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
              <div className="flex h-[4.25rem] w-[4.25rem] items-center justify-center rounded-full border border-nexus-accent/30 bg-nexus-accent/[0.08] lattice-celebrate-breathe motion-reduce:animate-none">
                <Check className="h-9 w-9 text-nexus-accent" strokeWidth={2.25} aria-hidden />
              </div>
            </div>
          </div>
        </div>

        <p
          className="lattice-celebrate-line font-mono text-[10px] font-medium uppercase tracking-[0.28em] text-neutral-500 opacity-0 motion-reduce:opacity-100"
          style={{ animationDelay: '0.12s' }}
        >
          All clear
        </p>

        <h2
          id="lattice-celebrate-title"
          className="lattice-celebrate-line mt-4 font-display text-[1.65rem] font-semibold leading-snug tracking-tight text-white opacity-0 motion-reduce:opacity-100 sm:text-3xl"
          style={{ animationDelay: '0.22s' }}
        >
          Nice work,{' '}
          <span className="text-nexus-accent">{name}</span>
        </h2>

        <p
          className="lattice-celebrate-line mt-3 text-[15px] leading-relaxed text-neutral-500 opacity-0 motion-reduce:opacity-100"
          style={{ animationDelay: '0.32s' }}
        >
          Everything is wrapped up — tasks and goals are off your plate.
        </p>

        <button
          type="button"
          onClick={dismiss}
          className="lattice-celebrate-line pointer-events-auto mt-9 rounded-full bg-nexus-accent px-10 py-3 font-display text-sm font-semibold text-nexus-void opacity-0 transition hover:bg-[#d4f76f] hover:brightness-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#050506] motion-reduce:opacity-100"
          style={{ animationDelay: '0.42s' }}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
