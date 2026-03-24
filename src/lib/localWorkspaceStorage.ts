import type { Database } from '../types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];

const TASKS_KEY = 'nexus_local_tasks_by_user_v1';
const GOALS_KEY = 'nexus_local_goals_by_user_v1';

function readMap<T>(key: string): Record<string, T[]> {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
      return parsed as Record<string, T[]>;
    }
  } catch {
    /* ignore */
  }
  return {};
}

function writeMap<T>(key: string, map: Record<string, T[]>) {
  try {
    localStorage.setItem(key, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

export function getLocalTasks(userId: string): TaskRow[] {
  const map = readMap<TaskRow>(TASKS_KEY);
  return map[userId] ?? [];
}

export function getLocalGoals(userId: string): GoalRow[] {
  const map = readMap<GoalRow>(GOALS_KEY);
  return map[userId] ?? [];
}

/** Store a task row after successful create (or mirror). Prepends; dedupes by id. */
export function saveCreatedTask(userId: string, task: TaskRow) {
  const map = readMap<TaskRow>(TASKS_KEY);
  const prev = map[userId] ?? [];
  const without = prev.filter((t) => t.id !== task.id);
  map[userId] = [task, ...without];
  writeMap(TASKS_KEY, map);
}

/** Store a goal row after successful create. Prepends; dedupes by id. */
export function saveCreatedGoal(userId: string, goal: GoalRow) {
  const map = readMap<GoalRow>(GOALS_KEY);
  const prev = map[userId] ?? [];
  const without = prev.filter((g) => g.id !== goal.id);
  map[userId] = [goal, ...without];
  writeMap(GOALS_KEY, map);
}

/** Merge server rows with local-only rows (same id: server wins). Sorted by created_at desc. */
export function mergeTasksWithLocal(server: TaskRow[], userId: string): TaskRow[] {
  const local = getLocalTasks(userId);
  const serverIds = new Set(server.map((t) => t.id));
  const extra = local.filter((t) => !serverIds.has(t.id));
  const merged = [...server, ...extra];
  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function mergeGoalsWithLocal(server: GoalRow[], userId: string): GoalRow[] {
  const local = getLocalGoals(userId);
  const serverIds = new Set(server.map((g) => g.id));
  const extra = local.filter((g) => !serverIds.has(g.id));
  const merged = [...server, ...extra];
  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
