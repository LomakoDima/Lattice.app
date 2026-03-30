import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ReactNode,
} from 'react';
import {
  Timer,
  Coffee,
  Pause,
  Play,
  RotateCcw,
  Target,
  ListTodo,
  Music2,
  Upload,
  Link2,
  FileAudio,
  Copy,
  AlertCircle,
  AlertTriangle,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { showFocusSessionEndNotification } from '../../lib/focusNotifications';
import { apiListTasks, apiListGoals } from '../../lib/workspaceApi';
import { Database } from '../../types/database';
import {
  clearPomodoroUploadBlob,
  formatAudioFileSize,
  isRecognizedFocusStreamInput,
  loadPomodoroMusicPrefs,
  loadPomodoroUploadBlob,
  normalizeFocusMusicUrl,
  resolvedStreamUrl,
  savePomodoroMusicPrefs,
  savePomodoroUploadBlob,
  type PomodoroMusicPrefs,
  type PomodoroTrackSource,
} from '../../lib/pomodoroMusic';
import { Button } from '../ui/Button';

type Task = Database['public']['Tables']['tasks']['Row'];
type GoalPick = { id: string; title: string };

const WORK_DEFAULT_SEC = 25 * 60;
const BREAK_DEFAULT_SEC = 5 * 60;
const STORAGE_KEY = 'nexus-pomodoro-prefs';
const FOCUS_SESSION_KEY = 'nexus-pomodoro-focus';

const ACTIVE_TASK_STATUSES = new Set<Task['status']>(['pending', 'running', 'waiting_approval']);

type FocusMusicNoticeVariant = 'error' | 'warn' | 'loading' | 'ok';

function FocusMusicNotice({
  variant,
  title,
  children,
}: {
  variant: FocusMusicNoticeVariant;
  title: string;
  children: ReactNode;
}) {
  const cfg =
    variant === 'error'
      ? {
          box: 'border-amber-500/35 bg-gradient-to-br from-amber-500/[0.09] via-amber-950/[0.06] to-nexus-void/80',
          icon: 'text-amber-400',
          kicker: 'text-amber-200/75',
          body: 'text-amber-50/[0.92]',
        }
      : variant === 'warn'
        ? {
            box: 'border-amber-500/22 bg-amber-500/[0.045]',
            icon: 'text-amber-400/95',
            kicker: 'text-amber-200/65',
            body: 'text-neutral-200/90',
          }
        : variant === 'loading'
          ? {
              box: 'border-nexus-accent/18 bg-nexus-void/50',
              icon: 'text-nexus-accent',
              kicker: 'text-neutral-500',
              body: 'text-neutral-400',
            }
          : {
              box: 'border-transparent bg-emerald-500/[0.055]',
              icon: 'text-emerald-400',
              kicker: 'text-emerald-200/70',
              body: 'text-emerald-50/[0.92]',
            };

  const Icon =
    variant === 'error'
      ? AlertCircle
      : variant === 'warn'
        ? AlertTriangle
        : variant === 'loading'
          ? Loader2
          : CheckCircle2;

  return (
    <div
      role={variant === 'error' ? 'alert' : 'status'}
      className={`flex gap-3 rounded-xl border px-3.5 py-3 sm:gap-3.5 sm:px-4 ${cfg.box}`}
    >
      <Icon
        className={`mt-0.5 h-4 w-4 shrink-0 sm:h-[1.05rem] sm:w-[1.05rem] ${cfg.icon} ${variant === 'loading' ? 'motion-safe:animate-spin' : ''}`}
        strokeWidth={2}
        aria-hidden
      />
      <div className="min-w-0 flex-1 space-y-1">
        <p className={`font-mono text-[9px] uppercase tracking-[0.22em] ${cfg.kicker}`}>{title}</p>
        <p className={`text-[13px] leading-snug ${cfg.body}`}>{children}</p>
      </div>
    </div>
  );
}

type UrlStreamHint = { title: string; body: string };

const inputClass =
  'w-full rounded-xl border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const labelClass = 'mb-2 block font-mono text-[10px] uppercase tracking-[0.15em] text-neutral-500';

const chevronStyle = {
  backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`,
} as const;

function isActiveTask(t: Task) {
  return ACTIVE_TASK_STATUSES.has(t.status);
}

function shortAudioType(mime: string): string {
  const m = mime.toLowerCase();
  if (m.includes('mpeg') || m === 'audio/mp3') return 'MP3';
  if (m.includes('wav')) return 'WAV';
  if (m.includes('ogg')) return 'OGG';
  if (m.includes('mp4') || m.includes('m4a') || m.includes('x-m4a')) return 'M4A';
  if (m.includes('aac')) return 'AAC';
  if (m.includes('flac')) return 'FLAC';
  if (m.includes('webm')) return 'WebM';
  const tail = mime.split('/')[1];
  return tail ? tail.toUpperCase().slice(0, 8) : 'Audio';
}

/** Short label for the link card (hostname, file name, or Drive). */
function streamLinkHeading(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  try {
    const withProto = /^https?:\/\//i.test(t) ? t : `https://${t}`;
    const u = new URL(withProto);
    if (u.hostname.includes('drive.google.com') || u.hostname.includes('docs.google.com')) {
      return 'Google Drive';
    }
    const parts = u.pathname.split('/').filter(Boolean);
    const last = parts[parts.length - 1];
    if (last) {
      try {
        return decodeURIComponent(last).slice(0, 96) || u.hostname;
      } catch {
        return last.slice(0, 96) || u.hostname;
      }
    }
    return u.hostname;
  } catch {
    return t.length > 56 ? `${t.slice(0, 36)}…${t.slice(-14)}` : t;
  }
}

function truncateMiddle(s: string, max = 64): string {
  if (s.length <= max) return s;
  const keep = max - 3;
  const head = Math.ceil(keep / 2);
  const tail = Math.floor(keep / 2);
  return `${s.slice(0, head)}…${s.slice(-tail)}`;
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
  const [playbackUrl, setPlaybackUrl] = useState('');
  const [uploadNonce, setUploadNonce] = useState(0);
  const [focusAudioError, setFocusAudioError] = useState<string | null>(null);
  const [focusAudioReady, setFocusAudioReady] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const blobUrlRef = useRef<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const pomoPhaseRef = useRef(pomoPhase);
  pomoPhaseRef.current = pomoPhase;
  const pomoRunningRef = useRef(pomoRunning);
  pomoRunningRef.current = pomoRunning;

  const loadTasksAndGoals = useCallback(async () => {
    setLoading(true);
    if (!user?.id) {
      setTasks([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    const [tasksRes, goalsRes] = await Promise.all([
      apiListTasks({ limit: 100 }),
      apiListGoals({ limit: 200 }),
    ]);
    const mergedTasks = tasksRes.tasks;
    const mergedGoals = goalsRes.goals.filter((g) => g.status === 'active');
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

  const setMusicSource = useCallback(
    (source: PomodoroTrackSource) => {
      if (source === 'off') {
        patchMusicPrefs({ source: 'off', customUrl: '', uploadMeta: null });
        return;
      }
      if (source === 'url') {
        patchMusicPrefs({
          source: 'url',
          customUrl: musicPrefs.customUrl,
          uploadMeta: null,
        });
        return;
      }
      patchMusicPrefs({
        source: 'file',
        customUrl: '',
        uploadMeta: musicPrefs.uploadMeta,
      });
    },
    [patchMusicPrefs, musicPrefs.customUrl, musicPrefs.uploadMeta],
  );

  const onMusicFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const f = e.target.files?.[0];
      e.target.value = '';
      if (!f) return;
      try {
        await savePomodoroUploadBlob(f);
        patchMusicPrefs({
          source: 'file',
          customUrl: '',
          uploadMeta: {
            name: (f.name && f.name.trim()) || 'Audio file',
            size: f.size,
            type: (f.type && f.type.trim()) || 'audio',
          },
        });
        setUploadNonce((n) => n + 1);
      } catch {
        /* ignore */
      }
    },
    [patchMusicPrefs],
  );

  const clearUploadedMusic = useCallback(async () => {
    try {
      await clearPomodoroUploadBlob();
    } catch {
      /* ignore */
    }
    patchMusicPrefs({ source: 'off', customUrl: '', uploadMeta: null });
    setUploadNonce((n) => n + 1);
  }, [patchMusicPrefs]);

  useEffect(() => {
    if (musicPrefs.source !== 'file') return;
    if (musicPrefs.uploadMeta) return;
    let cancelled = false;
    void (async () => {
      const blob = await loadPomodoroUploadBlob();
      if (cancelled || !blob?.size) return;
      patchMusicPrefs({
        uploadMeta: {
          name: 'Saved track',
          size: blob.size,
          type: blob.type || 'audio',
        },
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [musicPrefs.source, musicPrefs.uploadMeta, uploadNonce, patchMusicPrefs]);

  const resolvedLinkPreview = useMemo(
    () => (musicPrefs.source === 'url' ? normalizeFocusMusicUrl(musicPrefs.customUrl) : ''),
    [musicPrefs.source, musicPrefs.customUrl],
  );

  const streamLinkTitle = useMemo(
    () => (musicPrefs.source === 'url' ? streamLinkHeading(musicPrefs.customUrl) : ''),
    [musicPrefs.source, musicPrefs.customUrl],
  );

  const urlStreamRecognition = useMemo((): {
    recognized: boolean;
    hint: UrlStreamHint | null;
  } => {
    if (musicPrefs.source !== 'url') return { recognized: true, hint: null };
    const t = musicPrefs.customUrl.trim();
    if (!t) return { recognized: true, hint: null };
    if (isRecognizedFocusStreamInput(t)) return { recognized: true, hint: null };
    return {
      recognized: false,
      hint: {
        title: 'Link shape',
        body: 'Expected a direct audio URL (.mp3, .wav, …) or a Google Drive file link. Playback is still attempted.',
      },
    };
  }, [musicPrefs.source, musicPrefs.customUrl]);

  const copyText = useCallback(async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    const revokeBlob = () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };

    if (musicPrefs.source !== 'file') {
      revokeBlob();
      if (!cancelled) setPlaybackUrl(resolvedStreamUrl(musicPrefs));
      return () => {
        cancelled = true;
      };
    }

    setPlaybackUrl('');
    void (async () => {
      try {
        const blob = await loadPomodoroUploadBlob();
        if (cancelled) return;
        if (!blob || blob.size === 0) {
          setPlaybackUrl('');
          return;
        }
        revokeBlob();
        const u = URL.createObjectURL(blob);
        blobUrlRef.current = u;
        setPlaybackUrl(u);
      } catch {
        if (!cancelled) setPlaybackUrl('');
      }
    })();

    return () => {
      cancelled = true;
      revokeBlob();
    };
  }, [musicPrefs.source, musicPrefs.customUrl, uploadNonce]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;
    a.loop = true;
    const url = playbackUrl.trim();
    if (!url) {
      setFocusAudioError(null);
      setFocusAudioReady(false);
      a.removeAttribute('src');
      delete a.dataset.latticeSrc;
      a.pause();
      return;
    }
    setFocusAudioError(null);
    setFocusAudioReady(false);
    if (a.dataset.latticeSrc !== url) {
      a.dataset.latticeSrc = url;
      // Do not set crossOrigin for remote files: many hosts omit ACAO; anonymous CORS breaks playback.
      a.removeAttribute('crossOrigin');
      // Download sites often block requests that send your app as Referer; no-referrer mimics a direct open.
      a.referrerPolicy = 'no-referrer';
      a.src = url;
      a.load();
    }
    a.volume = musicPrefs.volume;
  }, [playbackUrl, musicPrefs.volume]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playbackUrl.trim()) return;

    const onError = () => {
      setFocusAudioReady(false);
      const err = a.error;
      let detail =
        'Try another URL, share Drive as “anyone with the link”, or drop an MP3 under My file.';
      if (err?.code === MediaError.MEDIA_ERR_SRC_NOT_SUPPORTED) {
        detail = 'This URL is not raw audio — the server often returns a web page instead.';
      } else if (err?.code === MediaError.MEDIA_ERR_NETWORK) {
        detail = 'Network failed or the host blocked playback from this page.';
      }
      setFocusAudioError(detail);
    };

    a.addEventListener('error', onError);
    return () => a.removeEventListener('error', onError);
  }, [playbackUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playbackUrl.trim()) {
      setFocusAudioReady(false);
      return;
    }
    const markReady = () => setFocusAudioReady(true);
    a.addEventListener('canplay', markReady);
    a.addEventListener('loadeddata', markReady);
    if (a.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setFocusAudioReady(true);
    return () => {
      a.removeEventListener('canplay', markReady);
      a.removeEventListener('loadeddata', markReady);
    };
  }, [playbackUrl]);

  useEffect(() => {
    const a = audioRef.current;
    if (!a || !playbackUrl.trim()) return;
    const shouldPlay = pomoPhase === 'work' && pomoRunning;

    if (!shouldPlay) {
      a.pause();
      return;
    }

    const tryPlay = () => {
      if (pomoPhaseRef.current !== 'work' || !pomoRunningRef.current) return;
      void a.play().catch(() => {
        /* autoplay or not ready */
      });
    };

    if (a.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
      tryPlay();
    } else {
      a.addEventListener('canplay', tryPlay, { once: true });
    }

    return () => {
      a.removeEventListener('canplay', tryPlay);
    };
  }, [pomoPhase, pomoRunning, playbackUrl]);

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
              Playback runs only during <span className="text-neutral-400">work</span> while the timer is on. Press{' '}
              <span className="text-neutral-400">Start</span> once so the browser may play audio.
            </p>
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label htmlFor="pomo-music-source" className={labelClass}>
              Source
            </label>
            <select
              id="pomo-music-source"
              value={musicPrefs.source}
              onChange={(e) => setMusicSource(e.target.value as PomodoroTrackSource)}
              className={`${inputClass} cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10`}
              style={chevronStyle}
            >
              <option value="off">Off</option>
              <option value="file">My file</option>
              <option value="url">Link (MP3 or Google Drive)</option>
            </select>
          </div>

          {musicPrefs.source === 'file' ? (
            <div>
              <p className={`${labelClass} mb-2`}>Audio file</p>
              <input
                ref={fileInputRef}
                type="file"
                accept="audio/*,.mp3,.m4a,.aac,.ogg,.wav,.opus,application/ogg"
                className="hidden"
                onChange={onMusicFileChange}
              />
              {musicPrefs.uploadMeta ? (
                <div className="relative overflow-hidden rounded-2xl border border-nexus-accent/25 bg-gradient-to-br from-nexus-accent/[0.07] via-nexus-void/40 to-nexus-void/85 p-1 shadow-[0_0_40px_-16px_rgba(200,245,98,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div
                    className="pointer-events-none absolute -right-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-nexus-accent/[0.12] blur-2xl"
                    aria-hidden
                  />
                  <div className="relative rounded-[0.875rem] border border-white/[0.06] bg-nexus-void/55 px-4 py-4 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-nexus-accent/30 bg-gradient-to-br from-nexus-accent/[0.12] to-nexus-void/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <FileAudio className="h-7 w-7 text-nexus-accent" strokeWidth={1.5} aria-hidden />
                          <span className="absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-md border border-emerald-500/35 bg-emerald-500/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]" />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-nexus-accent/85">
                            Loaded · local
                          </p>
                          <p
                            className="mt-1 font-display text-[15px] font-semibold leading-snug text-white sm:text-base"
                            title={musicPrefs.uploadMeta.name}
                          >
                            <span className="block truncate">{musicPrefs.uploadMeta.name}</span>
                          </p>
                          <p className="mt-1 font-mono text-[11px] text-neutral-500">
                            <span className="tabular-nums text-neutral-400">
                              {formatAudioFileSize(musicPrefs.uploadMeta.size)}
                            </span>
                            <span className="text-neutral-600"> · </span>
                            <span>{shortAudioType(musicPrefs.uploadMeta.type)}</span>
                            {playbackUrl.trim() ? null : (
                              <>
                                <span className="text-neutral-600"> · </span>
                                <span className="text-amber-400/90">preparing…</span>
                              </>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex h-10 shrink-0 items-end justify-end gap-1 max-sm:hidden" aria-hidden>
                        {[0.38, 0.72, 0.5, 0.92, 0.58].map((frac, i) => (
                          <span
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-nexus-accent/15 to-nexus-accent/90 motion-reduce:opacity-65"
                            style={{ height: `${frac * 100}%`, maxHeight: '2.5rem' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Replace
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500"
                        onClick={() => void clearUploadedMusic()}
                      >
                        Remove & turn off
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-dashed border-white/[0.12] bg-nexus-void/35 px-4 py-6 text-center">
                  <p className="text-sm text-neutral-500">No file loaded yet.</p>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    className="mt-3 gap-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <Upload className="h-3.5 w-3.5" strokeWidth={1.75} />
                    Choose file
                  </Button>
                </div>
              )}
              {focusAudioError && playbackUrl.trim() ? (
                <div className="mt-3">
                  <FocusMusicNotice variant="error" title="Playback failed">
                    {focusAudioError}
                  </FocusMusicNotice>
                </div>
              ) : null}
              <p className="mt-3 text-xs text-neutral-600">
                Stored in this browser only (IndexedDB). The same file survives reloads until you replace or clear it.
              </p>
            </div>
          ) : null}

          {musicPrefs.source === 'url' ? (
            <div>
              <label htmlFor="pomo-music-url" className={`${labelClass} flex items-center gap-2`}>
                <Link2 className="h-3.5 w-3.5 text-neutral-600" strokeWidth={1.75} />
                Audio link
              </label>
              <input
                id="pomo-music-url"
                type="text"
                inputMode="url"
                value={musicPrefs.customUrl}
                onChange={(e) => patchMusicPrefs({ source: 'url', customUrl: e.target.value })}
                placeholder="https://…/track.mp3 or Google Drive share link"
                className={inputClass}
                autoComplete="off"
              />
              {musicPrefs.customUrl.trim() ? (
                <div className="relative mt-3 overflow-hidden rounded-2xl border border-nexus-accent/25 bg-gradient-to-br from-nexus-accent/[0.07] via-nexus-void/40 to-nexus-void/85 p-1 shadow-[0_0_40px_-16px_rgba(200,245,98,0.35),inset_0_1px_0_rgba(255,255,255,0.06)]">
                  <div
                    className="pointer-events-none absolute -right-12 top-1/2 h-28 w-28 -translate-y-1/2 rounded-full bg-violet-500/[0.1] blur-2xl"
                    aria-hidden
                  />
                  <div className="relative rounded-[0.875rem] border border-white/[0.06] bg-nexus-void/55 px-4 py-4 sm:px-5 sm:py-4">
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                      <div className="flex min-w-0 flex-1 items-center gap-4">
                        <div className="relative flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-nexus-accent/30 bg-gradient-to-br from-nexus-accent/[0.12] to-nexus-void/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">
                          <Link2 className="h-7 w-7 text-nexus-accent" strokeWidth={1.65} aria-hidden />
                          <span
                            className={`absolute -bottom-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-md border ${
                              urlStreamRecognition.recognized
                                ? 'border-sky-500/35 bg-sky-500/15'
                                : 'border-amber-500/40 bg-amber-500/12'
                            }`}
                          >
                            <span
                              className={`h-1.5 w-1.5 rounded-full shadow-[0_0_8px_rgba(56,189,248,0.55)] ${
                                urlStreamRecognition.recognized ? 'bg-sky-400' : 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.45)]'
                              }`}
                            />
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-mono text-[9px] uppercase tracking-[0.18em] text-nexus-accent/85">
                            Stream · remote
                          </p>
                          <p
                            className="mt-1 font-display text-[15px] font-semibold leading-snug text-white sm:text-base"
                            title={streamLinkTitle}
                          >
                            <span className="block truncate">{streamLinkTitle}</span>
                          </p>
                          <p className="mt-1 break-all font-mono text-[11px] leading-relaxed text-neutral-500">
                            {resolvedLinkPreview ? (
                              <>
                                <span className="text-neutral-600">Playback </span>
                                <span className="text-neutral-400" title={resolvedLinkPreview}>
                                  {truncateMiddle(resolvedLinkPreview, 72)}
                                </span>
                              </>
                            ) : (
                              <span className="text-amber-400/90">No stream URL yet — check the link above.</span>
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="flex h-10 shrink-0 items-end justify-end gap-1 max-sm:hidden" aria-hidden>
                        {[0.42, 0.68, 0.48, 0.88, 0.55].map((frac, i) => (
                          <span
                            key={i}
                            className="w-[3px] rounded-full bg-gradient-to-t from-violet-400/20 to-nexus-accent/90 motion-reduce:opacity-65"
                            style={{ height: `${frac * 100}%`, maxHeight: '2.5rem' }}
                          />
                        ))}
                      </div>
                    </div>
                    <div className="relative mt-4 flex flex-wrap items-center gap-2 border-t border-white/[0.06] pt-4">
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="gap-2 font-mono text-[10px] uppercase tracking-[0.1em]"
                        disabled={!resolvedLinkPreview}
                        onClick={() => void copyText(resolvedLinkPreview)}
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={1.75} />
                        Copy stream URL
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="font-mono text-[10px] uppercase tracking-[0.1em] text-neutral-500"
                        onClick={() => patchMusicPrefs({ source: 'url', customUrl: '' })}
                      >
                        Clear link
                      </Button>
                    </div>
                  </div>
                </div>
              ) : null}
              {musicPrefs.customUrl.trim() ? (
                <div className="mt-3 space-y-3">
                  {focusAudioError && playbackUrl.trim() ? (
                    <FocusMusicNotice variant="error" title="Playback failed">
                      {focusAudioError}
                    </FocusMusicNotice>
                  ) : urlStreamRecognition.hint ? (
                    <FocusMusicNotice variant="warn" title={urlStreamRecognition.hint.title}>
                      {urlStreamRecognition.hint.body}
                    </FocusMusicNotice>
                  ) : urlStreamRecognition.recognized && playbackUrl.trim() && !focusAudioReady ? (
                    <FocusMusicNotice variant="loading" title="Buffering">
                      Pulling audio from the host…
                    </FocusMusicNotice>
                  ) : urlStreamRecognition.recognized &&
                    playbackUrl.trim() &&
                    focusAudioReady &&
                    !focusAudioError ? (
                    <FocusMusicNotice variant="ok" title="Stream ready">
                      Starts with the work timer.
                    </FocusMusicNotice>
                  ) : null}
                </div>
              ) : null}
              <p className="mt-3 text-xs leading-relaxed text-neutral-600">
                <strong className="font-medium text-neutral-500">Google Drive:</strong> share the file as &quot;Anyone with the
                link&quot; and paste the full browser link or the file id — we convert it to a download stream. Very large
                files sometimes show a virus-scan page; smaller MP3s work more reliably.
              </p>
            </div>
          ) : null}

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
            Spotify / YouTube page links are not raw audio. Use a direct file URL, Drive (as above), or an upload.
          </p>
        </div>
        <audio
          ref={audioRef}
          className="hidden"
          playsInline
          preload="auto"
          referrerPolicy="no-referrer"
        />
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
