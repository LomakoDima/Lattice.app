import { z } from 'zod';

/** Allows built-in ids and client-defined custom category slugs (local storage). */
export const categorySchema = z.string().min(1).max(80);

export const createGoalSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional().default(''),
  category: categorySchema.optional().default('other'),
  status: z.enum(['active', 'completed', 'archived']).optional().default('active'),
  target_date: z.union([z.string(), z.null()]).optional(),
});

export const updateGoalSchema = createGoalSchema.partial().extend({
  title: z.string().min(1).max(500).optional(),
});

export const createTaskSchema = z.object({
  title: z.string().min(1).max(500),
  description: z.string().max(20000).optional().default(''),
  category: categorySchema.optional().default('other'),
  goal_id: z.string().uuid().nullable().optional(),
  deadline: z.union([z.string(), z.null()]).optional(),
  mode: z.enum(['autonomous', 'human_in_loop']).optional().default('human_in_loop'),
  status: z
    .enum(['pending', 'running', 'waiting_approval', 'completed', 'failed', 'cancelled'])
    .optional()
    .default('pending'),
  priority: z.enum(['low', 'medium', 'high', 'urgent']).optional().default('medium'),
});

export const updateTaskSchema = createTaskSchema.partial().extend({
  title: z.string().min(1).max(500).optional(),
  progress: z.number().int().min(0).max(100).optional(),
  current_step: z.number().int().min(0).optional(),
  total_steps: z.number().int().min(0).optional(),
  result: z.unknown().nullable().optional().refine(
    v => v === undefined || v === null || JSON.stringify(v).length <= 65536,
    'Result payload too large (max 64 KB)'
  ),
  error: z.string().max(10000).nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).optional().refine(
    v => v === undefined || JSON.stringify(v).length <= 65536,
    'Metadata too large (max 64 KB)'
  ),
  started_at: z.union([z.string(), z.null()]).optional(),
  completed_at: z.union([z.string(), z.null()]).optional(),
});

export const uuidParam = z.string().uuid();

export function parseOptionalDate(val: string | null | undefined): Date | null | undefined {
  if (val === undefined) return undefined;
  if (val === null || val === '') return null;
  const d = new Date(val);
  if (Number.isNaN(d.getTime())) return null;
  return d;
}
