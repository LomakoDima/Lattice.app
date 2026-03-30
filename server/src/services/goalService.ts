import crypto from 'node:crypto';
import { pool } from '../db/pool.js';
import type { GoalRow } from '../types/workspace.js';

const GOAL_COLS = `id, user_id, title, description, category, status, target_date, created_at, updated_at`;

export const LIST_PAGE_SIZE = 50;

export type ListGoalsResult = {
  goals: GoalRow[];
  total: number;
  limit: number;
  offset: number;
};

export async function listGoals(
  userId: string,
  opts: { limit?: number; offset?: number } = {}
): Promise<ListGoalsResult> {
  const limit = Math.min(Math.max(1, opts.limit ?? LIST_PAGE_SIZE), 200);
  const offset = Math.max(0, opts.offset ?? 0);

  const [dataRes, countRes] = await Promise.all([
    pool.query<GoalRow>(
      `SELECT ${GOAL_COLS}
       FROM goals
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT $2 OFFSET $3`,
      [userId, limit, offset]
    ),
    pool.query<{ count: string }>(
      `SELECT COUNT(*)::text AS count FROM goals WHERE user_id = $1`,
      [userId]
    ),
  ]);

  return {
    goals: dataRes.rows,
    total: parseInt(countRes.rows[0]?.count ?? '0', 10),
    limit,
    offset,
  };
}

export async function getGoalById(userId: string, goalId: string): Promise<GoalRow | null> {
  const { rows } = await pool.query<GoalRow>(
    `SELECT ${GOAL_COLS} FROM goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  return rows[0] ?? null;
}

export async function createGoal(
  userId: string,
  input: {
    title: string;
    description: string;
    category: string;
    status: 'active' | 'completed' | 'archived';
    target_date: Date | null;
  }
): Promise<GoalRow> {
  const id = crypto.randomUUID();
  const { rows } = await pool.query<GoalRow>(
    `INSERT INTO goals (id, user_id, title, description, category, status, target_date)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING ${GOAL_COLS}`,
    [id, userId, input.title, input.description, input.category, input.status, input.target_date]
  );
  const r = rows[0];
  if (!r) throw new Error('Failed to create goal');
  return r;
}

export async function updateGoal(
  userId: string,
  goalId: string,
  patch: Partial<{
    title: string;
    description: string;
    category: string;
    status: 'active' | 'completed' | 'archived';
    target_date: Date | null | undefined;
  }>
): Promise<GoalRow | null> {
  const current = await getGoalById(userId, goalId);
  if (!current) return null;

  const title       = patch.title       ?? current.title;
  const description = patch.description ?? current.description;
  const category    = patch.category    ?? current.category;
  const status      = patch.status      ?? current.status;
  const target_date = patch.target_date !== undefined ? patch.target_date : current.target_date;

  const { rows } = await pool.query<GoalRow>(
    `UPDATE goals SET
       title = $2, description = $3, category = $4, status = $5, target_date = $6, updated_at = NOW()
     WHERE id = $1 AND user_id = $7
     RETURNING ${GOAL_COLS}`,
    [goalId, title, description, category, status, target_date, userId]
  );
  return rows[0] ?? null;
}

export async function deleteGoal(userId: string, goalId: string): Promise<boolean> {
  const { rowCount } = await pool.query(
    `DELETE FROM goals WHERE id = $1 AND user_id = $2`,
    [goalId, userId]
  );
  return (rowCount ?? 0) > 0;
}
