import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Timer, Coffee, Pause, Play, RotateCcw, Target, ListTodo, Music2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { showFocusSessionEndNotification } from '../../lib/focusNotifications';
import { listGoals, listTasks } from '../../lib/localWorkspace';
import { Database } from '../../types/database';
import { loadPomodoroMusicPrefs, savePomodoroMusicPrefs, type PomodoroMusicPrefs } from '../../lib/pomodoroMusic';

type Task = Database['public']['Tables']['tasks']['Row'];
type GoalPick = { id: string; title: string };

const WORK_DEFAULT_SEC = 25 * 60;
const BREAK_DEFAULT_SEC = 5 * 60;
const STORAGE_KEY = 'nexus-pomodoro-prefs';
const FOCUS_SESSION_KEY = 'nexus-pomodoro-focus';

const ACTIVE_TASK_STATUSES = new Set<Task['status']>(['pending', 'running', 'waiting_approval']);

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500';

const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
} as const;

function isActiveTask(t: Task) {
  return ACTIVE_TASK_STATUSES.has(t.status);
}

export function Pomodoro() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [pomoSeconds, setPomoSeconds] = useState(WORK_DEFAULT_SEC);
  const [pomoPhase, setPomoPhase] = useState<'work' | 'break'>('work');
  const [pomoRunning, setPomoRunning] = useState(false);

  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<GoalPick[]>([]);
  const [selectedGoalId, setSelectedGoalId] = useState('');
  const [selectedTaskId, setSelectedTaskId] = useState('');
  const [musicPrefs, setMusicPrefs] = useState<PomodoroMusicPrefs>(() => loadPomodoroMusicPrefs());
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const pomoPhaseRef = useRef(pomoPhase);
  pomoPhaseRef.current = pomoPhase;

  const loadTasksAndGoals = useCallback(async () => {
    setLoading(true);
    if (!user?.id) {
      setTasks([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    const mergedTasks = listTasks(user.id).slice(0, 100);
    const mergedGoals = listGoals(user.id).filter((g) => g.status === 'active');
    const taskList = mergedTasks.filter(isActiveTask);
    const goalList: GoalPick[] = mergedGoals.map((g) => ({ id: g.id, title: g.title }));
    setTasks(taskList);
    setGoals(goalList);

    try {
      const raw = sessionStorage.getItem(FOCUS_SESSION_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { goalId?: string; taskId?: string };
        const goalValid = p.goalId && goalList.some((g) => g.id === p.goalId);
        if (goalValid) setSelectedGoalId(p.goalId!);
        if (p.taskId) {
          const task = taskList.find((x) => x.id === p.taskId);
          if (task && isActiveTask(task)) {
            if (!goalValid || task.goal_id === p.goalId) setSelectedTaskId(p.taskId);
          }
        }
      }
    } catch {
      /* ignore */
    }

    setLoading(false);
  }, [user?.id]);

  useEffect(() => {
    loadTasksAndGoals();
  }, [loadTasksAndGoals]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const p = JSON.parse(raw) as { workMin?: number; breakMin?: number };
        if (typeof p.workMin === 'number' && p.workMin > 0) {
          setPomoSeconds(Math.round(p.workMin * 60));
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    if (loading) return;
    try {
      sessionStorage.setItem(
        FOCUS_SESSION_KEY,
        JSON.stringify({
          goalId: selectedGoalId || undefined,
          taskId: selectedTaskId || undefined,
        }),
      );
    } catch {
      /* ignore */
    }
  }, [selectedGoalId, selectedTaskId, loading]);

  useEffect(() => {
    if (!selectedTaskId) return;
    const t = tasks.find((x) => x.id === selectedTaskId);
    if (!t || !isActiveTask(t)) {
      setSelectedTaskId('');
      return;
    }
    if (selectedGoalId && t.goal_id !== selectedGoalId) {
      setSelectedTaskId('');
    }
  }, [selectedGoalId, selectedTaskId, tasks]);

  const filteredTasks = useMemo(() => {
    if (!selectedGoalId) return tasks;
    return tasks.filter((t) => t.goal_id === selectedGoalId);
  }, [tasks, selectedGoalId]);

  const selectedGoalLabel = useMemo(
    () => (selectedGoalId ? goals.find((g) => g.id === selectedGoalId)?.title ?? null : null),
    [goals, selectedGoalId],
  );

  const selectedTaskLabel = useMemo(
    () => (selectedTaskId ? tasks.find((t) => t.id === selectedTaskId)?.title ?? null : null),
    [tasks, selectedTaskId],
  );

  const openSelectedTask = () => {
    if (!selectedTaskId) return;
    setCurrentScreen('tasks');
  };

  const patchMusicPrefs = useCallback((partial: Partial<PomodoroMusicPrefs>) => {
    setMusicPrefs((prev) => {
      const next = { ...prev, ...partial };
      savePomodoroMusicPrefs(next);
      return next;
    });
  }, []);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    const url = musicPrefs.url.trim();
    if (!url) {
      a.removeAttribute('src');
      a.pause();
      return;
    }
    if (a.dataset.latticeSrc !== url) {
      a.dataset.latticeSrc = url;
      a.src = url;
    }
    a.volume = musicPrefs.volume;
  }, [musicPrefs.url, musicPrefs.volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !musicPrefs.url.trim()) return;
    const shouldPlay = pomoPhase === 'work' && pomoRunning;
    if (shouldPlay) {
      void a.play().catch(() => {
        /* invalid URL, CORS, or autoplay policy */
      });
    } else {
      a.pause();
    }
  }, [pomoPhase, pomoRunning, musicPrefs.url]);

  useEffect(() => {
    if (!pomoRunning) return;
    const id = window.setInterval(() => {
      setPomoSeconds((s) => {
        if (s <= 1) {
          setPomoRunning(false);
          const endedPhase = pomoPhaseRef.current;
          queueMicrotask(() => {
            showFocusSessionEndNotification(endedPhase);
          });
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [pomoRunning]);

  const formatTime = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const pomoTotal = pomoPhase === 'work' ? WORK_DEFAULT_SEC : BREAK_DEFAULT_SEC;
  const pomoProgress = pomoTotal > 0 ? Math.min(100, ((pomoTotal - pomoSeconds) / pomoTotal) * 100) : 0;

  const resetPomo = () => {
    setPomoRunning(false);
    setPomoPhase('work');
    setPomoSeconds(WORK_DEFAULT_SEC);
  };

  const switchPhase = (next: 'work' | 'break') => {
    setPomoRunning(false);
    setPomoPhase(next);
    setPomoSeconds(next === 'work' ? WORK_DEFAULT_SEC : BREAK_DEFAULT_SEC);
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading session data…" />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6 pb-8 md:space-y-8">
      <header className="space-y-2">
        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nexus-accent">Pomodoro</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-3xl">Focus block</h1>
        <p className="text-sm text-neutral-500">
          Pick a goal and/or task for this session, then run the timer. Default 25 / 5 minutes.
        </p>
      </header>

      <Card glass className="p-6 sm:p-7">
        <div className="mb-5 flex flex-col gap-1 border-b border-white/[0.06] pb-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nexus-accent/90">Context</p>
            <h2 className="font-display mt-1 text-lg font-semibold text-white">Tasks and goals</h2>
          </div>
          <button
            type="button"
            onClick={() => loadTasksAndGoals()}
            className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-500 transition hover:text-nexus-accent"
          >
            Refresh
          </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label htmlFor="pomo-goal" className={`${labelClass} flex items-center gap-2`}>
              <Target className="h-3.5 w-3.5 text-nexus-accent/80" strokeWidth={1.75} />
              Goal
            </label>
            <select
              id="pomo-goal"
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
              style={chevronStyle}
            >
              <option value="">All active goals</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
            {goals.length === 0 ? (
              <p className="mt-2 text-xs text-neutral-600">
                No active goals —{' '}
                <button
                  type="button"
                  className="text-nexus-accent underline decoration-nexus-accent/40 underline-offset-2 hover:text-[#d4f76f]"
                  onClick={() => {
                    setCurrentScreen('create-goal');
                  }}
                >
                  Create a goal
                </button>
              </p>
            ) : (
              <p className="mt-2 text-xs text-neutral-600">
                {selectedGoalId ? 'Showing tasks linked to this goal only.' : 'Showing all open tasks.'}
              </p>
            )}
          </div>
          <div>
            <label htmlFor="pomo-task" className={`${labelClass} flex items-center gap-2`}>
              <ListTodo className="h-3.5 w-3.5 text-nexus-accent/80" strokeWidth={1.75} />
              Task
            </label>
            <select
              id="pomo-task"
              value={selectedTaskId}
              onChange={(e) => setSelectedTaskId(e.target.value)}
              className={`${inputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
              style={chevronStyle}
            >
              <option value="">None selected</option>
              {filteredTasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))}
            </select>
            {tasks.length === 0 ? (
              <p className="mt-2 text-xs text-neutral-600">
                No open tasks —{' '}
                <button
                  type="button"
                  className="text-nexus-accent underline decoration-nexus-accent/40 underline-offset-2 hover:text-[#d4f76f]"
                  onClick={() => {
                    setCurrentScreen('create-task');
                  }}
                >
                  Create a task
                </button>
              </p>
            ) : filteredTasks.length === 0 ? (
              <p className="mt-2 text-xs text-amber-500/90">
                No tasks match this goal. Choose another goal or clear the goal filter.
              </p>
            ) : selectedTaskId ? (
              <button
                type="button"
                onClick={openSelectedTask}
                className="mt-2 font-mono text-[10px] uppercase tracking-[0.12em] text-nexus-accent/90 underline decoration-nexus-accent/30 underline-offset-2 hover:text-[#d4f76f]"
              >
                Open in task list
              </button>
            ) : null}
          </div>
        </div>
      </Card>

      <Card glass className="p-6 sm:p-7">
        <div className="mb-4 flex items-start gap-3 border-b border-white/[0.06] pb-4">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/60">
            <Music2 className="h-[18px] w-[18px] text-violet-300/90" strokeWidth={1.75} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent/90">Optional</p>
            <h2 className="font-display mt-1 text-lg font-semibold text-white">Focus music</h2>
            <p className="mt-1 text-xs text-neutral-500">
              Paste a direct link to an audio file or stream. Plays only during <span className="text-neutral-400">work</span>{' '}
              while the timer is running — pauses on break or pause.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="pomo-music-url" className={labelClass}>
              Audio URL
            </label>
            <input
              id="pomo-music-url"
              type="url"
              inputMode="url"
              value={musicPrefs.url}
              onChange={(e) => patchMusicPrefs({ url: e.target.value })}
              placeholder="https://…/focus.mp3"
              className={inputClass}
              autoComplete="off"
            />
          </div>
          <div>
            <label htmlFor="pomo-music-vol" className={labelClass}>
              Volume{' '}
              <span className="font-normal text-neutral-600">
                ({Math.round(musicPrefs.volume * 100)}%)
              </span>
            </label>
            <input
              id="pomo-music-vol"
              type="range"
              min={0}
              max={100}
              value={Math.round(musicPrefs.volume * 100)}
              onChange={(e) => patchMusicPrefs({ volume: Number(e.target.value) / 100 })}
              className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full bg-nexus-ink/80 accent-nexus-accent"
            />
          </div>
          <p className="font-mono text-[10px] leading-relaxed text-neutral-600">
            Tip: use an HTTPS link your browser can play (MP3, AAC, or Icecast). Some hosts block embedding — try
            another URL or a file you host yourself.
          </p>
        </div>
        <audio ref={audioRef} className="hidden" playsInline preload="none" />
      </Card>

      <Card glass className="relative flex flex-col overflow-hidden p-6 sm:p-8">
        <div className="absolute -right-16 top-0 h-48 w-48 rounded-full bg-nexus-accent/[0.06] blur-3xl" aria-hidden />
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-nexus-accent">Session</p>
            <h2 className="font-display mt-2 text-xl font-semibold text-white">
              {pomoPhase === 'work' ? 'Work interval' : 'Break'}
            </h2>
            <p className="mt-1 text-xs text-neutral-500">
              {pomoPhase === 'break' ? (
                <>
                  Step away before the next work block. <span className="text-neutral-600">· 25 / 5 min</span>
                </>
              ) : selectedTaskLabel || selectedGoalLabel ? (
                <>
                  <span className="text-neutral-600">Session · </span>
                  <span className="text-neutral-300">
                    {[selectedGoalLabel, selectedTaskLabel].filter(Boolean).join(' · ')}
                  </span>
                  <span className="text-neutral-600"> · 25 / 5 min</span>
                </>
              ) : (
                <>
                  Optional — select a goal or task above.{' '}
                  <span className="text-neutral-600">· 25 / 5 min</span>
                </>
              )}
            </p>
          </div>
          <div
            className={`shrink-0 self-start rounded-xl border p-2 sm:self-auto ${pomoPhase === 'work' ? 'border-nexus-accent/30 bg-nexus-accent/10' : 'border-amber-500/25 bg-amber-500/10'}`}
          >
            {pomoPhase === 'work' ? (
              <Timer className="h-6 w-6 text-nexus-accent" />
            ) : (
              <Coffee className="h-6 w-6 text-amber-400" />
            )}
          </div>
        </div>
        <div className="relative mt-8 flex flex-col items-center">
          <div className="relative flex h-44 w-44 items-center justify-center sm:h-52 sm:w-52">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 100 100">
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                className="text-nexus-ink"
              />
              <circle
                cx="50"
                cy="50"
                r="44"
                fill="none"
                stroke="currentColor"
                strokeWidth="3"
                strokeLinecap="round"
                strokeDasharray={`${(pomoProgress / 100) * 276.46} 276.46`}
                className={pomoPhase === 'work' ? 'text-nexus-accent' : 'text-amber-400'}
              />
            </svg>
            <span className="font-display text-4xl font-semibold tabular-nums tracking-tight text-white sm:text-5xl">
              {formatTime(pomoSeconds)}
            </span>
          </div>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <button
              type="button"
              onClick={() => {
                if (!pomoRunning && pomoSeconds === 0) {
                  setPomoSeconds(pomoPhase === 'work' ? WORK_DEFAULT_SEC : BREAK_DEFAULT_SEC);
                }
                setPomoRunning((r) => !r);
              }}
              className="inline-flex items-center gap-2 rounded-xl bg-nexus-accent px-5 py-2.5 font-mono text-[11px] font-semibold uppercase tracking-[0.12em] text-nexus-void transition hover:bg-[#d4f76f]"
            >
              {pomoRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {pomoRunning ? 'Pause' : 'Start'}
            </button>
            <button
              type="button"
              onClick={resetPomo}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.1] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-400 transition hover:border-white/[0.18] hover:text-white"
            >
              <RotateCcw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() => switchPhase(pomoPhase === 'work' ? 'break' : 'work')}
              className="inline-flex items-center gap-2 rounded-xl border border-white/[0.08] px-4 py-2.5 font-mono text-[11px] uppercase tracking-[0.1em] text-neutral-500 transition hover:text-neutral-300"
            >
              {pomoPhase === 'work' ? 'Break (5 min)' : 'Work (25 min)'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
