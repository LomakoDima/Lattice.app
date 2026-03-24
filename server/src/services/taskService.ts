import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import type { TaskRow } from '../types/workspace.js';
import * as goalService from './goalService.js';

export async function listTasks(userId: string): Promise<TaskRow[]> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT id, user_id, goal_id, category, title, description, mode, status, priority,
            progress, current_step, total_steps, result, error, metadata,
            created_at, updated_at, started_at, completed_at, deadline
     FROM tasks WHERE user_id = $1 ORDER BY created_at DESC`,
    [userId]
  );
  return rows;
}

export async function getTaskById(userId: string, taskId: string): Promise<TaskRow | null> {
  const { rows } = await pool.query<TaskRow>(
    `SELECT id, user_id, goal_id, category, title, description, mode, status, priority,
            progress, current_step, total_steps, result, error, metadata,
            created_at, updated_at, started_at, completed_at, deadline
     FROM tasks WHERE id = $1 AND user_id = $2`,
    [taskId, userId]
  );
  return rows[0] ?? null;
}

export async function createTask(
  userId: string,
  input: {
    title: string;
    description: string;
    category: string;
    goal_id: string | null;
    deadline: Date | null;
    mode: 'autonomous' | 'human_in_loop';
    status: TaskRow['status'];
    priority: TaskRow['priority'];
  }
): Promise<TaskRow> {
  if (input.goal_id) {
    const g = await goalService.getGoalById(userId, input.goal_id);
    if (!g) {
      const err = new Error('Goal not found');
      (err as Error & { status: number }).status = 404;
      throw err;
    }
  }

  const id = crypto.randomUUID();
  const metadata: Record<string, unknown> = {};
  const { rows } = await pool.query<TaskRow>(
    `INSERT INTO tasks (
       id, user_id, goal_id, category, title, description, mode, status, priority,
       progress, current_step, total_steps, metadata, deadline
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,0,0,0,$10::jsonb,$11)
     RETURNING id, user_id, goal_id, category, title, description, mode, status, priority,
               progress, current_step, total_steps, result, error, metadata,
               created_at, updated_at, started_at, completed_at, deadline`,
    [
      id,
      userId,
      input.goal_id,
      input.category,
      input.title,
      input.description,
      input.mode,
      input.status,
      input.priority,
      JSON.stringify(metadata),
      input.deadline,
    ]
  );
  const r = rows[0];
  if (!r) throw new Error('Failed to create task');
  return r;
}

export async function updateTask(
  userId: string,
  taskId: string,
  patch: Partial<{
    title: string;
    description: string;
    category: string;
    goal_id: string | null;
    deadline: Date | null;
    mode: TaskRow['mode'];
    status: TaskRow['status'];
    priority: TaskRow['priority'];
    progress: number;
    current_step: number;
    total_steps: number;
    result: unknown | null;
    error: string | null;
    metadata: Record<string, unknown>;
    started_at: Date | null;
    completed_at: Date | null;
  }>
): Promise<TaskRow | null> {
  const current = await getTaskById(userId, taskId);
  if (!current) return null;

  if (patch.goal_id !== undefined && patch.goal_id !== null) {
    const g = await goalService.getGoalById(userId, patch.goal_id);
    if (!g) {
      const err = new Error('Goal not found');
      (err as Error & { status: number }).status = 404;
      throw err;
    }
  }

  const goal_id = patch.goal_id !== undefined ? patch.goal_id : current.goal_id;
  const title = patch.title ?? current.title;
  const description = patch.description ?? current.description;
  const category = patch.category ?? current.category;
  const deadline = patch.deadline !== undefined ? patch.deadline : current.deadline;
  const mode = patch.mode ?? current.mode;
  const status = patch.status ?? current.status;
  const priority = patch.priority ?? current.priority;
  const progress = patch.progress ?? current.progress;
  const current_step = patch.current_step ?? current.current_step;
  const total_steps = patch.total_steps ?? current.total_steps;
  const result = patch.result !== undefined ? patch.result : current.result;
  const error = patch.error !== undefined ? patch.error : current.error;
  const metadata = patch.metadata ?? current.metadata;
  const started_at = patch.started_at !== undefined ? patch.started_at : current.started_at;
  const completed_at = patch.completed_at !== undefined ? patch.completed_at : current.completed_at;

  const resultJson =
    result === null || result === undefined ? null : JSON.stringify(result);

  const { rows } = await pool.query<TaskRow>(
    `UPDATE tasks SET
       goal_id = $2,
       category = $3,
       title = $4,
       description = $5,
       mode = $6,
       status = $7,
       priority = $8,
       progress = $9,
       current_step = $10,
       total_steps = $11,
       result = $12::jsonb,
       error = $13,
       metadata = $14::jsonb,
       deadline = $15,
       started_at = $16,
       completed_at = $17,
       updated_at = NOW()
     WHERE id = $1 AND user_id = $18
     RETURNING id, user_id, goal_id, category, title, description, mode, status, priority,
               progress, current_step, total_steps, result, error, metadata,
               created_at, updated_at, started_at, completed_at, deadline`,
    [
      taskId,
      goal_id,
      category,
      title,
      description,
      mode,
      status,
      priority,
      progress,
      current_step,
      total_steps,
      resultJson,
      error,
      JSON.stringify(metadata),
      deadline,
      started_at,
      completed_at,
      userId,
    ]
  );
  return rows[0] ?? null;
}

export async function deleteTask(userId: string, taskId: string): Promise<boolean> {
  const { rowCount } = await pool.query(`DELETE FROM tasks WHERE id = $1 AND user_id = $2`, [
    taskId,
    userId,
  ]);
  return (rowCount ?? 0) > 0;
}
