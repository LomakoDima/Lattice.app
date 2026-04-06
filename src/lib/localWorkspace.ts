import type { Database } from '../types/database';
import { notifyWorkspaceChanged } from './workspaceEvents';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];
const DEVICE_USER_ID_KEY = 'nexus_device_user_id_v1';
const SESSION_KEY = 'nexus_local_session_v1';
const TASKS_KEY = 'nexus_local_tasks_by_user_v1';
const GOALS_KEY = 'nexus_local_goals_by_user_v1';

export type LocalSession = {
  email: string;
  displayName?: string;
};

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

/** Stable per-browser id — all tasks/goals are keyed by this. */
export function getDeviceUserId(): string {
  try {
    let id = localStorage.getItem(DEVICE_USER_ID_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(DEVICE_USER_ID_KEY, id);
    }
    return id;
  } catch {
    return 'local-fallback-id';
  }
}

export function getSession(): LocalSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const p = JSON.parse(raw) as LocalSession;
    if (p && typeof p.email === 'string' && p.email.trim()) return p;
  } catch {
    /* ignore */
  }
  return null;
}

export function setSession(session: LocalSession) {
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  } catch {
    /* ignore */
  }
}

export function clearSession() {
  try {
    localStorage.removeItem(SESSION_KEY);
  } catch {
    /* ignore */
  }
}

export function listTasks(userId: string): TaskRow[] {
  const map = readMap<TaskRow>(TASKS_KEY);
  const list = map[userId] ?? [];
  return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function listGoals(userId: string): GoalRow[] {
  const map = readMap<GoalRow>(GOALS_KEY);
  const list = map[userId] ?? [];
  return [...list].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function getTask(userId: string, taskId: string): TaskRow | undefined {
  return listTasks(userId).find((t) => t.id === taskId);
}

export function upsertTask(userId: string, task: TaskRow) {
  const map = readMap<TaskRow>(TASKS_KEY);
  const prev = map[userId] ?? [];
  const without = prev.filter((t) => t.id !== task.id);
  map[userId] = [task, ...without];
  writeMap(TASKS_KEY, map);
  notifyWorkspaceChanged();
}

export function deleteTask(userId: string, taskId: string) {
  const map = readMap<TaskRow>(TASKS_KEY);
  const prev = map[userId] ?? [];
  map[userId] = prev.filter((t) => t.id !== taskId);
  writeMap(TASKS_KEY, map);
  notifyWorkspaceChanged();
}

export function upsertGoal(userId: string, goal: GoalRow) {
  const map = readMap<GoalRow>(GOALS_KEY);
  const prev = map[userId] ?? [];
  const without = prev.filter((g) => g.id !== goal.id);
  map[userId] = [goal, ...without];
  writeMap(GOALS_KEY, map);
  notifyWorkspaceChanged();
}

/** Removes the goal and unlinks tasks (goal_id → null). */
export function deleteGoal(userId: string, goalId: string) {
  const gMap = readMap<GoalRow>(GOALS_KEY);
  const goals = (gMap[userId] ?? []).filter((g) => g.id !== goalId);
  gMap[userId] = goals;
  writeMap(GOALS_KEY, gMap);

  const tMap = readMap<TaskRow>(TASKS_KEY);
  const now = new Date().toISOString();
  const tasks = (tMap[userId] ?? []).map((t) =>
    t.goal_id === goalId ? { ...t, goal_id: null, updated_at: now } : t
  );
  tMap[userId] = tasks;
  writeMap(TASKS_KEY, tMap);
  notifyWorkspaceChanged();
}

export function makeTaskRow(input: {
  userId: string;
  title: string;
  description: string;
  goalId: string | null;
  category: string;
  deadline: string | null;
}): TaskRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: input.userId,
    goal_id: input.goalId,
    category: input.category,
    title: input.title,
    description: input.description,
    mode: 'human_in_loop',
    status: 'pending',
    priority: 'medium',
    progress: 0,
    current_step: 0,
    total_steps: 0,
    result: null,
    error: null,
    metadata: {} as Database['public']['Tables']['tasks']['Row']['metadata'],
    created_at: now,
    updated_at: now,
    started_at: null,
    completed_at: null,
    deadline: input.deadline,
  };
}

export function makeGoalRow(input: {
  userId: string;
  title: string;
  description: string;
  category: string;
  targetDate: string | null;
}): GoalRow {
  const now = new Date().toISOString();
  return {
    id: crypto.randomUUID(),
    user_id: input.userId,
    title: input.title,
    description: input.description,
    category: input.category,
    status: 'active',
    target_date: input.targetDate,
    created_at: now,
    updated_at: now,
  };
}

export const saveCreatedTask = upsertTask;
export const saveCreatedGoal = upsertGoal;

/** Merge server rows with local-only rows (same id: server wins). Sorted by created_at desc. */
export function mergeTasksWithLocal(server: TaskRow[], userId: string): TaskRow[] {
  const local = listTasks(userId);
  const serverIds = new Set(server.map((t) => t.id));
  const extra = local.filter((t) => !serverIds.has(t.id));
  const merged = [...server, ...extra];
  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}

export function mergeGoalsWithLocal(server: GoalRow[], userId: string): GoalRow[] {
  const local = listGoals(userId);
  const serverIds = new Set(server.map((g) => g.id));
  const extra = local.filter((g) => !serverIds.has(g.id));
  const merged = [...server, ...extra];
  return merged.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
