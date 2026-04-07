import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Search, Plus, Sparkles, Target, ChevronDown, Trash2,
  CheckCircle2, Circle, Clock, ListTodo,
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { CategoryChips } from '../ui/CategoryChips';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useAuth } from '../../contexts/useAuth';
import { useNavigation } from '../../contexts/NavigationContext';
import { useToast } from '../../contexts/ToastContext';
import { apiListGoals, apiListTasks, apiUpdateTask, apiDeleteTask, apiDeleteGoal } from '../../lib/workspaceApi';
import { WORKSPACE_CHANGED } from '../../lib/workspaceEvents';
import type { Database } from '../../types/database';
import { getCategoryLabel } from '../../constants/categories';

type Goal = Database['public']['Tables']['goals']['Row'];
type Task = Database['public']['Tables']['tasks']['Row'];

const searchInputClass =
  'w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 py-2.5 pl-10 pr-3 text-[14px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50';

const filterSelectClass =
  'w-full min-w-[130px] cursor-pointer appearance-none rounded-lg border border-white/[0.08] bg-nexus-void/90 bg-[length:0.875rem] bg-[right_0.65rem_center] bg-no-repeat px-3 py-2.5 pr-9 text-[13px] text-white transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50 [color-scheme:dark] sm:w-auto sm:min-w-[140px]';

const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;

function formatTaskTimestamp(iso: string) {
  return new Date(iso).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false });
}

function goalProgressPercent(linked: Task[]) {
  if (linked.length === 0) return 0;
  return Math.round((linked.filter((t) => t.status === 'completed').length / linked.length) * 100);
}

export function GoalList() {
  const { user } = useAuth();
  const { setCurrentScreen } = useNavigation();
  const { showUndoToast } = useToast();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

  const loadAll = useCallback(async () => {
    if (!user?.id) { setGoals([]); setTasks([]); setLoading(false); return; }
    setLoading(true);
    try {
      const [goalsRes, tasksRes] = await Promise.all([
        apiListGoals({ limit: 200 }),
        apiListTasks({ limit: 200 }),
      ]);
      setGoals(goalsRes.goals);
      setTasks(tasksRes.tasks);
    } catch {
      setGoals([]); setTasks([]);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { void loadAll(); }, [loadAll]);

  useEffect(() => {
    const handler = () => void loadAll();
    window.addEventListener(WORKSPACE_CHANGED, handler);
    return () => window.removeEventListener(WORKSPACE_CHANGED, handler);
  }, [loadAll]);

  const tasksByGoalId = useMemo(() => {
    const m = new Map<string, Task[]>();
    for (const t of tasks) {
      if (!t.goal_id) continue;
      const list = m.get(t.goal_id) ?? [];
      list.push(t);
      m.set(t.goal_id, list);
    }
    for (const [, list] of m) list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    return m;
  }, [tasks]);

  const filteredGoals = useMemo(() => goals.filter((g) => {
    const matchesSearch = g.title.toLowerCase().includes(searchQuery.toLowerCase()) || g.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    const matchesCategory = categoryFilter === 'all' || g.category === categoryFilter;
    return matchesSearch && matchesStatus && matchesCategory;
  }), [goals, searchQuery, statusFilter, categoryFilter]);

  const hasActiveFilters = searchQuery.trim() !== '' || statusFilter !== 'all' || categoryFilter !== 'all';
  const stats = useMemo(() => ({ total: goals.length, active: goals.filter((g) => g.status === 'active').length, showing: filteredGoals.length }), [goals, filteredGoals.length]);

  const clearFilters = () => { setSearchQuery(''); setStatusFilter('all'); setCategoryFilter('all'); };
  const openCreateTaskForGoal = (goalId: string) => { sessionStorage.setItem('nexus-prefill-goal', goalId); setCurrentScreen('create-task'); };
  const isExpanded = (id: string) => expandedMap[id] !== false;
  const toggleExpanded = (id: string) => setExpandedMap((prev) => ({ ...prev, [id]: !isExpanded(id) }));

  const handleDeleteGoal = async (goal: Goal) => {
    setGoals((prev) => prev.filter((g) => g.id !== goal.id));
    showUndoToast('Goal deleted', async () => { await loadAll(); });
    try { await apiDeleteGoal(goal.id); }
    catch { await loadAll(); }
  };

  const toggleTaskDone = async (task: Task) => {
    const nextCompleted = task.status !== 'completed';
    const now = new Date().toISOString();
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, status: nextCompleted ? 'completed' : 'pending', completed_at: nextCompleted ? now : null, updated_at: now } : t));
    try { await apiUpdateTask(task.id, { status: nextCompleted ? 'completed' : 'pending', completed_at: nextCompleted ? now : null }); }
    catch { setTasks((prev) => prev.map((t) => t.id === task.id ? task : t)); }
  };

  const handleDeleteTask = async (task: Task) => {
    setTasks((prev) => prev.filter((t) => t.id !== task.id));
    showUndoToast('Task deleted', async () => { await loadAll(); });
    try { await apiDeleteTask(task.id); }
    catch { await loadAll(); }
  };

  if (loading) return <div className="flex min-h-[28rem] flex-col items-center justify-center"><LoadingSpinner size="lg" text="Loading goals…" /></div>;

  return (
    <div className="relative space-y-5 pb-12">
      <header className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">Goals</h1>
          <p className="mt-1 text-[13px] text-neutral-500">Strategic outcomes and milestones. Expand a goal to see linked tasks and progress.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-white/[0.08] bg-nexus-void/60 px-2.5 py-1 font-mono text-[11px] text-neutral-400">
            <span className="text-neutral-600">Total</span><span className="tabular-nums text-neutral-300">{stats.total}</span>
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-md border border-nexus-accent/25 bg-nexus-accent/[0.07] px-2.5 py-1 font-mono text-[11px] text-nexus-accent">
            <span className="text-nexus-accent/75">Active</span><span className="tabular-nums">{stats.active}</span>
          </span>
          <Button variant="secondary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-task')}><ListTodo className="h-3.5 w-3.5" />New task</Button>
          <Button variant="primary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-goal')}><Target className="h-3.5 w-3.5" />New goal</Button>
        </div>
      </header>

      <Card glass className="relative overflow-hidden p-3 sm:p-4">
        <div className="flex flex-col gap-2">
          <div className="relative min-w-0">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-neutral-600" />
            <input type="search" placeholder="Search by title or description…" value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)} className={searchInputClass} autoComplete="off" aria-label="Search goals" />
          </div>
          <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start sm:gap-x-5">
            <div className="min-w-0 space-y-1.5">
              <p id="goallist-category-label" className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">Categories</p>
              <CategoryChips includeAll value={categoryFilter} onChange={setCategoryFilter} labelledBy="goallist-category-label" />
            </div>
            <div className="min-w-0 space-y-1.5 sm:max-w-[min(100%,18rem)] sm:justify-self-end">
              <p id="goallist-status-label" className="font-mono text-[9px] uppercase tracking-[0.16em] text-neutral-600">Status</p>
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
                  className={filterSelectClass} style={{ backgroundImage: chevronBg }} aria-labelledby="goallist-status-label">
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="completed">Completed</option>
                  <option value="archived">Archived</option>
                </select>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] text-neutral-500">
                    <span className="tabular-nums text-neutral-300">{stats.showing}</span>
                    <span className="text-neutral-600"> of </span>
                    <span className="tabular-nums text-neutral-500">{stats.total}</span>
                  </span>
                  {hasActiveFilters ? <button type="button" onClick={clearFilters} className="shrink-0 font-mono text-[10px] uppercase tracking-[0.12em] text-nexus-accent/90 transition hover:text-nexus-accent">Clear</button> : null}
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {filteredGoals.length === 0 ? (
        <Card glass className="relative overflow-hidden px-5 py-12 text-center sm:px-8 sm:py-14">
          <div className="relative mx-auto max-w-sm">
            <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/80">
              <Sparkles className="h-5 w-5 text-nexus-accent/80" />
            </div>
            <h2 className="font-display text-lg font-semibold text-white">{hasActiveFilters ? 'No matching goals' : 'No goals yet'}</h2>
            <p className="mt-2 text-[13px] leading-relaxed text-neutral-500">
              {hasActiveFilters ? 'Adjust your search or clear filters.' : 'Create a goal to anchor tasks and focus sessions.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {hasActiveFilters ? <Button variant="ghost" size="sm" onClick={clearFilters}>Clear filters</Button> : null}
              <Button variant="primary" size="sm" className="gap-2" onClick={() => setCurrentScreen('create-goal')}><Plus className="h-3.5 w-3.5" />New goal</Button>
            </div>
          </div>
        </Card>
      ) : (
        <div className="grid gap-4">
          {filteredGoals.map((goal) => {
            const linked = tasksByGoalId.get(goal.id) ?? [];
            const pct = goalProgressPercent(linked);
            const expanded = isExpanded(goal.id);
            return (
              <Card key={goal.id} glass className="overflow-hidden border border-white/[0.06] bg-[#121212]/80 p-0">
                <div className="p-5 sm:p-6">
                  <div className="flex flex-wrap items-start gap-3">
                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-nexus-accent/40 bg-nexus-accent/10">
                      <Target className="h-5 w-5 text-nexus-accent" strokeWidth={2} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-display text-lg font-semibold leading-snug text-white sm:text-xl">{goal.title}</h3>
                        <span className="rounded-full border border-violet-500/40 bg-violet-600/30 px-2 py-0.5 text-[11px] font-medium text-violet-100">{getCategoryLabel(goal.category)}</span>
                      </div>
                      {goal.description ? <p className="mt-1.5 text-sm text-neutral-500">{goal.description}</p> : null}
                      <div className="mt-4 flex items-center gap-3">
                        <div className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-neutral-800">
                          <div className="h-full rounded-full bg-gradient-to-r from-nexus-accent-dim to-nexus-accent transition-[width]" style={{ width: `${pct}%` }} />
                        </div>
                        <span className="shrink-0 font-mono text-[12px] text-neutral-500 tabular-nums">{pct}%</span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <button type="button" aria-expanded={expanded} aria-label={expanded ? 'Collapse tasks' : 'Expand tasks'}
                        className="rounded-lg p-2 text-neutral-400 transition hover:bg-white/[0.06] hover:text-white"
                        onClick={(e) => { e.stopPropagation(); toggleExpanded(goal.id); }}>
                        <ChevronDown className={`h-5 w-5 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                      </button>
                      <button type="button" aria-label="Delete goal"
                        className="rounded-lg p-2 text-neutral-400 transition hover:bg-red-500/10 hover:text-red-400"
                        onClick={(e) => { e.stopPropagation(); void handleDeleteGoal(goal); }}>
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                {expanded ? (
                  <div className="border-t border-white/[0.06] bg-black/20 px-5 py-4 sm:px-6">
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">Tasks</p>
                      <button type="button" onClick={() => openCreateTaskForGoal(goal.id)}
                        className="font-mono text-[10px] uppercase tracking-[0.12em] text-nexus-accent/90 transition hover:text-nexus-accent">
                        Add task
                      </button>
                    </div>
                    {linked.length === 0 ? (
                      <p className="text-[13px] text-neutral-600">No tasks linked yet.</p>
                    ) : (
                      <ul className="space-y-2">
                        {linked.map((task) => {
                          const done = task.status === 'completed';
                          return (
                            <li key={task.id} className={`rounded-lg border px-3 py-2.5 transition ${done ? 'border-white/[0.04] bg-transparent' : 'border-white/[0.08] bg-nexus-void/40'}`}>
                              <div className="flex gap-3">
                                <button type="button" aria-label={done ? 'Mark incomplete' : 'Mark complete'}
                                  className="mt-0.5 shrink-0 text-neutral-500 hover:text-white"
                                  onClick={(e) => { e.stopPropagation(); void toggleTaskDone(task); }}>
                                  {done
                                    ? <CheckCircle2 className="h-5 w-5 text-emerald-500" strokeWidth={2} />
                                    : <Circle className="h-5 w-5 text-neutral-500" strokeWidth={1.75} />}
                                </button>
                                <div className="min-w-0 flex-1">
                                  <span className={`text-[14px] leading-snug ${done ? 'text-neutral-500 line-through' : 'text-white'}`}>{task.title}</span>
                                  <div className="mt-2 flex flex-wrap items-center gap-2">
                                    <span className="rounded-full border border-violet-500/40 bg-violet-600/30 px-2 py-0.5 text-[10px] font-medium text-violet-100">{getCategoryLabel(task.category)}</span>
                                    <span className="inline-flex items-center gap-1 font-mono text-[11px] text-neutral-500">
                                      <Clock className="h-3 w-3 shrink-0" />{formatTaskTimestamp(task.created_at)}
                                    </span>
                                  </div>
                                </div>
                                <button type="button" aria-label="Delete task"
                                  className="mt-0.5 shrink-0 self-start rounded-lg p-1.5 text-neutral-500 transition hover:bg-red-500/10 hover:text-red-400"
                                  onClick={(e) => { e.stopPropagation(); void handleDeleteTask(task); }}>
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
