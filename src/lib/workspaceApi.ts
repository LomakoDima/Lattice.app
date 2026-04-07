/**
 * Typed API client for tasks and goals.
 * All mutations go to the server; local workspace is used only as
 * an optimistic cache that gets replaced on the next server fetch.
 */
import { apiFetch } from './api';
import type { Database } from '../types/database';

type TaskRow = Database['public']['Tables']['tasks']['Row'];
type GoalRow = Database['public']['Tables']['goals']['Row'];

export type PagedTasks = { tasks: TaskRow[]; total: number; limit: number; offset: number };
export type PagedGoals = { goals: GoalRow[]; total: number; limit: number; offset: number };

// ---------------------------------------------------------------------------
// Tasks
// ---------------------------------------------------------------------------

export async function apiListTasks(opts: { limit?: number; offset?: number } = {}): Promise<PagedTasks> {
  const params = new URLSearchParams();
  if (opts.limit  != null) params.set('limit',  String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const res = await apiFetch(`/api/tasks${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  return res.json() as Promise<PagedTasks>;
}

export async function apiCreateTask(input: {
  title: string;
  description?: string;
  category?: string;
  goal_id?: string | null;
  deadline?: string | null;
  priority?: TaskRow['priority'];
}): Promise<TaskRow> {
  const res = await apiFetch('/api/tasks', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  const data = await res.json() as { task: TaskRow };
  return data.task;
}

export async function apiUpdateTask(id: string, patch: Partial<{
  title: string;
  description: string;
  category: string;
  goal_id: string | null;
  deadline: string | null;
  status: TaskRow['status'];
  priority: TaskRow['priority'];
  progress: number;
  completed_at: string | null;
  started_at: string | null;
}>): Promise<TaskRow> {
  const res = await apiFetch(`/api/tasks/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  const data = await res.json() as { task: TaskRow };
  return data.task;
}

export async function apiDeleteTask(id: string): Promise<void> {
  const res = await apiFetch(`/api/tasks/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, await extractMessage(res));
}

// ---------------------------------------------------------------------------
// Goals
// ---------------------------------------------------------------------------

export async function apiListGoals(opts: { limit?: number; offset?: number } = {}): Promise<PagedGoals> {
  const params = new URLSearchParams();
  if (opts.limit  != null) params.set('limit',  String(opts.limit));
  if (opts.offset != null) params.set('offset', String(opts.offset));
  const qs = params.toString();
  const res = await apiFetch(`/api/goals${qs ? `?${qs}` : ''}`);
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  return res.json() as Promise<PagedGoals>;
}

export async function apiCreateGoal(input: {
  title: string;
  description?: string;
  category?: string;
  target_date?: string | null;
}): Promise<GoalRow> {
  const res = await apiFetch('/api/goals', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  });
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  const data = await res.json() as { goal: GoalRow };
  return data.goal;
}

export async function apiUpdateGoal(id: string, patch: Partial<{
  title: string;
  description: string;
  category: string;
  status: GoalRow['status'];
  target_date: string | null;
}>): Promise<GoalRow> {
  const res = await apiFetch(`/api/goals/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  if (!res.ok) throw new ApiError(res.status, await extractMessage(res));
  const data = await res.json() as { goal: GoalRow };
  return data.goal;
}

export async function apiDeleteGoal(id: string): Promise<void> {
  const res = await apiFetch(`/api/goals/${id}`, { method: 'DELETE' });
  if (!res.ok && res.status !== 404) throw new ApiError(res.status, await extractMessage(res));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export class ApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function extractMessage(res: Response): Promise<string> {
  try {
    const body = await res.json() as { error?: string };
    return body.error ?? `HTTP ${res.status}`;
  } catch {
    return `HTTP ${res.status}`;
  }
}
