import { useCallback, useEffect, useMemo, useState } from 'react';
import { Target, Plus, Zap, Timer } from 'lucide-react';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Progress } from '../ui/Progress';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { getGreetingForHour, getGreetingName } from '../../lib/greeting';
import { apiListTasks, apiListGoals } from '../../lib/workspaceApi';
import { WORKSPACE_CHANGED } from '../../lib/workspaceEvents';
import type { Database } from '../../types/database';
import { getCategoryLabel } from '../../constants/categories';
import { formatTaskDeadline, isOpenTaskOverdue } from '../../lib/formatDeadline';
import { taskStatusLabel } from '../../lib/task-status-label';

type Task = Database['public']['Tables']['tasks']['Row'];
type Goal = Database['public']['Tables']['goals']['Row'];

const ACTIVE_TASK = new Set<Task['status']>(['pending', 'running', 'waiting_approval']);

export function Dashboard() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [loading, setLoading] = useState(true);
  const [greetingTick, setGreetingTick] = useState(0);

  const loadDashboard = useCallback(async () => {
    if (!user?.id) {
      setTasks([]);
      setGoals([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [tasksRes, goalsRes] = await Promise.all([
        apiListTasks({ limit: 50 }),
        apiListGoals({ limit: 40 }),
      ]);
      setTasks(tasksRes.tasks);
      setGoals(goalsRes.goals);
    } catch {
      setTasks([]);
      setGoals([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadDashboard(); }, [loadDashboard]);

  // Refresh when tasks/goals change in other screens
  useEffect(() => {
    const handler = () => void loadDashboard();
    window.addEventListener(WORKSPACE_CHANGED, handler);
    return () => window.removeEventListener(WORKSPACE_CHANGED, handler);
  }, [loadDashboard]);

  // Update greeting every minute
  useEffect(() => {
    const id = window.setInterval(() => setGreetingTick((n) => n + 1), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const greetingParts = useMemo(() => ({
    phrase: getGreetingForHour(new Date().getHours()),
    displayName: getGreetingName(user),
  }), [user, greetingTick]);

  const activeGoals = useMemo(() => goals.filter((g) => g.status === 'active'), [goals]);
  const recentTasks = useMemo(() => tasks.slice(0, 9), [tasks]);

  const stats = useMemo(() => {
    const completed = tasks.filter((t) => t.status === 'completed').length;
    return { completed, total: tasks.length };
  }, [tasks]);

  const activeTaskCount = useMemo(
    () => tasks.filter((t) => ACTIVE_TASK.has(t.status)).length,
    [tasks],
  );

  const getStatusVariant = (status: Task['status']): 'pending' | 'running' | 'completed' | 'failed' | 'waiting' | 'cancelled' => {
    const map = { pending: 'pending', running: 'running', completed: 'completed', failed: 'failed', waiting_approval: 'waiting', cancelled: 'cancelled' } as const;
    return map[status];
  };

  const goTo = (screen: 'dashboard' | 'pomodoro' | 'tasks' | 'goals' | 'create-task' | 'create-goal' | 'settings') => setCurrentScreen(screen);
  const openCreateTaskForGoal = (goalId: string) => { sessionStorage.setItem('nexus-prefill-goal', goalId); goTo('create-task'); };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <LoadingSpinner size="lg" text="Loading workspace…" />
      </div>
    );
  }

  return (
    <div className="space-y-10 pb-12">
      <header className="flex flex-col gap-6 border-b border-white/[0.06] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">Lattice · Overview</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            <span className="text-white">{greetingParts.phrase}</span>
            {greetingParts.displayName ? (
              <>
                <span className="text-white">, </span>
                <span className="text-nexus-accent">{greetingParts.displayName}</span>
              </>
            ) : null}
          </h1>
          <p className="text-sm text-neutral-500">
            {activeTaskCount} open · {stats.total} tasks · {activeGoals.length} active goals · {stats.completed} completed
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" className="gap-2 rounded-lg" onClick={() => goTo('pomodoro')}>
            <Timer className="h-4 w-4" strokeWidth={2} />Focus session
          </Button>
          <Button variant="primary" className="gap-2 rounded-lg" onClick={() => goTo('create-task')}>
            <Plus className="h-4 w-4" strokeWidth={2} />New task
          </Button>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {([
          { label: 'Total tasks', value: stats.total, accent: false },
          { label: 'Open', value: activeTaskCount, accent: false },
          { label: 'Active goals', value: activeGoals.length, accent: true },
          { label: 'Completed', value: stats.completed, accent: false },
        ] as const).map((s) => (
          <div key={s.label} className="rounded-xl border border-white/[0.06] bg-nexus-panel/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">{s.label}</p>
            <p className={`mt-1 font-display text-2xl font-semibold tabular-nums ${s.accent ? 'text-nexus-accent' : 'text-white'}`}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card glass className="relative overflow-hidden p-6">
          <div className="pointer-events-none absolute -right-12 -top-12 h-32 w-32 rounded-full bg-nexus-accent/[0.07] blur-2xl" />
          <div className="relative">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent">Focus</p>
            <h2 className="font-display mt-2 text-lg font-semibold text-white">Pomodoro sessions</h2>
            <p className="mt-1 text-sm text-neutral-500">
              Run structured 25/5 intervals. Optionally tie each session to a goal or task for clear context and reporting.
            </p>
            <Button variant="primary" className="mt-5 w-full rounded-lg" onClick={() => goTo('pomodoro')}>
              <Timer className="mr-2 h-4 w-4" />Open focus session
            </Button>
          </div>
        </Card>

        <Card glass className="flex flex-col p-6">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="font-display text-lg font-semibold text-white">Goals</h2>
            <p className="mt-1 text-xs text-neutral-500">Link new tasks to goals when you create or edit them.</p>
          </div>
          <div className="mt-4 flex-1 space-y-0">
            {activeGoals.length === 0 ? (
              <div className="rounded-xl border border-dashed border-white/[0.08] bg-nexus-void/30 px-4 py-8 text-center">
                <p className="text-sm text-neutral-500">No goals defined</p>
                <p className="mt-2 text-xs text-neutral-600">
                  Add a goal from <span className="text-neutral-400">Quick actions</span> or open{' '}
                  <span className="text-neutral-400">Goals</span> in the sidebar.
                </p>
              </div>
            ) : (
              activeGoals.slice(0, 4).map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openCreateTaskForGoal(g.id)}
                  className="group flex w-full items-start gap-3 border-b border-white/[0.05] py-3 text-left last:border-0 hover:bg-white/[0.02]"
                >
                  <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-nexus-accent/80" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="line-clamp-2 text-[13px] font-medium text-neutral-200 group-hover:text-white">{g.title}</span>
                    <span className="mt-0.5 block font-mono text-[10px] text-neutral-600">{getCategoryLabel(g.category)}</span>
                  </span>
                </button>
              ))
            )}
          </div>
        </Card>

        <Card glass className="flex flex-col p-6">
          <div className="border-b border-white/[0.06] pb-4">
            <h2 className="font-display text-lg font-semibold text-white">Quick actions</h2>
            <p className="mt-1 text-xs text-neutral-500">Frequent workflows</p>
          </div>
          <div className="mt-3 flex flex-col gap-1">
            <Button variant="primary" className="w-full justify-start rounded-lg py-3" onClick={() => goTo('create-task')}>
              <Plus className="mr-2 h-[18px] w-[18px]" strokeWidth={2} />New task
            </Button>
            <Button variant="secondary" className="w-full justify-start rounded-lg py-3" onClick={() => goTo('create-goal')}>
              <Target className="mr-2 h-[18px] w-[18px]" strokeWidth={2} />New goal
            </Button>
          </div>
        </Card>
      </div>

      <section>
        <div className="mb-4">
          <h2 className="font-display text-xl font-semibold text-white">Recent activity</h2>
          <p className="mt-0.5 text-xs text-neutral-500">Latest tasks — open Tasks in the sidebar for the full list.</p>
        </div>

        {recentTasks.length === 0 ? (
          <Card glass className="p-10 text-center">
            <Zap className="mx-auto mb-3 h-10 w-10 text-nexus-accent/50" strokeWidth={1.25} />
            <p className="text-sm text-neutral-500">No tasks yet — create one to begin tracking work in Lattice.</p>
            <Button className="mt-5 rounded-lg" onClick={() => goTo('create-task')}>Create task</Button>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {recentTasks.map((task) => (
              <Card
                key={task.id}
                glass
                hover
                className="cursor-pointer p-5"
                onClick={() => goTo('tasks')}
              >
                <div className="mb-3 flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 font-medium leading-snug text-white">{task.title}</h3>
                    <p className="mt-1 font-mono text-[10px] text-neutral-500">{getCategoryLabel(task.category)}</p>
                    {task.deadline && formatTaskDeadline(task.deadline) ? (
                      <p className={`mt-0.5 flex flex-wrap items-center gap-2 font-mono text-[10px] ${isOpenTaskOverdue(task) ? 'text-red-400' : 'text-amber-500/90'}`}>
                        {isOpenTaskOverdue(task) ? (
                          <span className="rounded border border-red-500/40 bg-red-500/15 px-1.5 py-px text-[9px] font-semibold uppercase tracking-wide text-red-300">
                            Overdue
                          </span>
                        ) : null}
                        <span>Due {formatTaskDeadline(task.deadline)}</span>
                      </p>
                    ) : null}
                  </div>
                  <Badge variant={getStatusVariant(task.status)} pulse={task.status === 'running'}>
                    {taskStatusLabel(task.status)}
                  </Badge>
                </div>
                {task.description ? <p className="line-clamp-2 text-xs text-neutral-500">{task.description}</p> : null}
                {task.total_steps > 0 ? (
                  <div className="mt-4 space-y-2 border-t border-white/[0.06] pt-4">
                    <div className="flex justify-between text-[11px] text-neutral-500">
                      <span>Step {task.current_step} of {task.total_steps}</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
