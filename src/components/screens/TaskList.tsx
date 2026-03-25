import { useEffect, useMemo, useState } from 'react';
import { Search, Clock, Circle, CheckCircle2, Plus, Sparkles, Target, Trash2 } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CategoryChips } from '../ui/CategoryChips';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { useToast } from '../../contexts/ToastContext';
import { deleteTask, listTasks, upsertTask } from '../../lib/localWorkspace';
import { Database } from '../../types/database';
import { getCategoryLabel } from '../../constants/categories';
import { formatTaskDeadlineLine } from '../../lib/formatDeadline';

type Task = Database['public']['Tables']['tasks']['Row'];

const searchInputClass =
  'w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 py-2.5 pl-10 pr-3 text-[14px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const filterSelectClass =
  'min-w-[130px] flex-1 rounded-lg border border-white/[0.08] bg-nexus-void/90 px-3 py-2.5 text-[13px] text-white transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50 sm:min-w-[140px] sm:flex-none cursor-pointer appearance-none bg-[length:0.875rem] bg-[right_0.65rem_center] bg-no-repeat pr-9 [color-scheme:dark]';

const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;

function priorityDot(task: Task) {
  if (task.status === 'completed') return false;
  return task.priority === 'high' || task.priority === 'urgent';
}

export function TaskList() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const { showUndoToast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    void loadTasks();
  }, [user?.id]);

  const loadTasks = async () => {
    setLoading(true);
    if (user?.id) setTasks(listTasks(user.id));
    else setTasks([]);
    setLoading(false);
  };

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch =
      task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      task.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || task.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const hasActiveFilters =
    searchQuery.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';

  const stats = useMemo(() => {
    const open = tasks.filter((t) =>
      ['pending', 'running', 'waiting_approval'].includes(t.status),
    ).length;
    const done = tasks.filter((t) => t.status === 'completed').length;
    return { total: tasks.length, open, done, showing: filteredTasks.length };
  }, [tasks, filteredTasks.length]);

  const clearFilters = () => {
    setSearchQuery('');
    setStatusFilter('all');
    setCategoryFilter('all');
  };

  const toggleTaskDone = (task: Task) => {
    if (!user?.id) return;
    const now = new Date().toISOString();
    const nextCompleted = task.status !== 'completed';
    upsertTask(user.id, {
      ...task,
      status: nextCompleted ? 'completed' : 'pending',
      completed_at: nextCompleted ? now : null,
      updated_at: now,
    });
    setTasks(listTasks(user.id));
  };

  const handleDeleteTask = (task: Task) => {
    if (!user?.id) return;
    const snapshot = { ...task };
    deleteTask(user.id, task.id);
    setTasks(listTasks(user.id));
    showUndoToast('Task deleted', () => {
      if (!user?.id) return;
      upsertTask(user.id, snapshot);
      setTasks(listTasks(user.id));
    });
  };

  if (loading) {
    return (
      <div className="flex min-h-[28rem] flex-col items-center justify-center">
        <LoadingSpinner size="lg" text="Loading tasks…" />
      </div>
    );
  }

  return (
    <div className="relative space-y-5 pb-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 top-0 h-56 w-56 rounded-full bg-nexus-accent/[0.05] blur-3xl"
      />

      <header className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">Tasks</h1>
          <p className="mt-1 text-[13px] text-neutral-500">
            Filter by category or status.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-nexus-void/60 px-2.5 py-1 font-mono text-[11px] text-neutral-400">
            <span className="text-neutral-600">Total</span>
            <span className="tabular-nums text-neutral-300">{stats.total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-nexus-accent/25 bg-nexus-accent/[0.07] px-2.5 py-1 font-mono text-[11px] text-nexus-accent">
            <span className="text-nexus-accent/75">Open</span>
            <span className="tabular-nums">{stats.open}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-emerald-500/20 bg-emerald-500/[0.06] px-2.5 py-1 font-mono text-[11px] text-emerald-400/90">
            <span className="text-emerald-500/70">Done</span>
            <span className="tabular-nums">{stats.done}</span>
          </span>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-goal')}>
            <Target className="h-3.5 w-3.5" />
            New goal
          </Button>
          <Button variant="primary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-task')}>
            <Plus className="h-3.5 w-3.5" />
            New task
          </Button>
        </div>
      </header>

      <Card glass className="relative overflow-hidden p-3 sm:p-4">
        <div className="flex flex-col gap-3">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
            <input
              type="search"
              placeholder="Search by title or description…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={searchInputClass}
              autoComplete="off"
              aria-label="Search tasks"
            />
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-start sm:gap-3">
            <div className="min-w-0 flex-1 space-y-1.5">
              <p id="tasklist-category-label" className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">
                Categories
              </p>
              <CategoryChips
                includeAll
                value={categoryFilter}
                onChange={setCategoryFilter}
                labelledBy="tasklist-category-label"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={filterSelectClass}
              style={{ backgroundImage: chevronBg }}
              aria-label="Filter by status"
            >
              <option value="all">All statuses</option>
              <option value="pending">Queued</option>
              <option value="running">Running</option>
              <option value="waiting_approval">Awaiting approval</option>
              <option value="completed">Completed</option>
              <option value="failed">Failed</option>
              <option value="cancelled">Cancelled</option>
            </select>
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <p className="font-mono text-[10px] text-neutral-600">
                <span className="text-neutral-400">{stats.showing}</span>
                <span className="text-neutral-600"> / </span>
                {stats.total}
              </p>
              {hasActiveFilters ? (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="font-mono text-[10px] uppercase tracking-[0.12em] text-nexus-accent/90 transition hover:text-nexus-accent"
                >
                  Clear
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </Card>

      {filteredTasks.length === 0 ? (
        <Card glass className="relative overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-14">
          <div className="relative mx-auto max-w-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/80">
              <Sparkles className="h-5 w-5 text-nexus-accent/80" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">
              {hasActiveFilters ? 'No matching tasks' : 'No tasks yet'}
            </h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              {hasActiveFilters
                ? 'Adjust your search or clear filters to see more results.'
                : 'Create a task from the sidebar or the overview. It will appear in this list.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {hasActiveFilters ? (
                <Button variant="ghost" size="sm" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : null}
              <Button variant="primary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-task')}>
                <Plus className="h-3.5 w-3.5" />
                Create task
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-3">
          {filteredTasks.map((task) => {
            const done = task.status === 'completed';
            const schedule = formatTaskDeadlineLine(task.deadline ?? task.created_at);
            const showPriorityDot = priorityDot(task);

            return (
              <Card
                key={task.id}
                className="!rounded-xl border border-white/[0.07] bg-[#0f0f12] p-4 shadow-none"
              >
                <div className="flex items-start gap-3 sm:gap-4">
                  <button
                    type="button"
                    aria-label={done ? 'Mark as not done' : 'Mark as done'}
                    aria-pressed={done}
                    className="flex shrink-0 items-center justify-center rounded-lg text-neutral-500 outline-none transition hover:text-white focus-visible:ring-2 focus-visible:ring-nexus-accent/50"
                    onClick={() => toggleTaskDone(task)}
                  >
                    {done ? (
                      <CheckCircle2 className="h-6 w-6 text-emerald-500" strokeWidth={2} />
                    ) : (
                      <Circle className="h-6 w-6" strokeWidth={1.75} />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5">
                      <span
                        className={`font-display text-[15px] font-semibold leading-snug sm:text-base ${
                          done ? 'text-neutral-500 line-through' : 'text-white'
                        }`}
                      >
                        {task.title}
                      </span>
                      {showPriorityDot ? (
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full bg-red-500 align-middle"
                          title="High priority"
                        />
                      ) : null}
                    </div>

                    <div className="mt-1 flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-violet-500/40 bg-violet-950/50 px-2 py-0.5 text-[11px] font-medium text-violet-200">
                        {getCategoryLabel(task.category)}
                      </span>
                      {schedule ? (
                        <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500">
                          <Clock className="h-3 w-3 shrink-0 opacity-80" strokeWidth={1.75} />
                          {schedule}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    aria-label="Delete task"
                    className="shrink-0 rounded-lg p-2 text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                    onClick={() => handleDeleteTask(task)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
