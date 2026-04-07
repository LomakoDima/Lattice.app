import { Router } from 'express';
<<<<<<< HEAD
import rateLimit from 'express-rate-limit';
=======
import { z } from 'zod';
>>>>>>> main
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { apiLimiter } from '../middleware/rateLimiters.js';
import * as taskService from '../services/taskService.js';
import type { TaskRow } from '../types/workspace.js';
import {
  createTaskSchema,
  parseOptionalDate,
  updateTaskSchema,
  uuidParam,
} from '../validation/workspace.js';

const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

export const tasksRouter = Router();

<<<<<<< HEAD
tasksRouter.use(apiLimiter);

tasksRouter.get('/', requireAuth, async (req, res, next) => {
=======
const paginationSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

tasksRouter.get('/', apiLimiter, requireAuth, async (req, res, next) => {
>>>>>>> main
  try {
    const { userId } = (req as AuthedRequest).auth;
    const { limit, offset } = paginationSchema.parse(req.query);
    const result = await taskService.listTasks(userId, { limit, offset });
    res.json(result); // { tasks, total, limit, offset }
  } catch (e) {
    next(e);
  }
});

tasksRouter.post('/', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const data = createTaskSchema.parse(req.body);
    const deadline = parseOptionalDate(data.deadline as string | null | undefined) ?? null;
    const task = await taskService.createTask(userId, {
      title: data.title,
      description: data.description,
      category: data.category,
      goal_id: data.goal_id ?? null,
      deadline,
      mode: data.mode,
      status: data.status as TaskRow['status'],
      priority: data.priority,
    });
    res.status(201).json({ task });
  } catch (e) {
    next(e);
  }
});

tasksRouter.get('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const task = await taskService.getTaskById(userId, id);
    if (!task) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ task });
  } catch (e) {
    next(e);
  }
});

tasksRouter.patch('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const data = updateTaskSchema.parse(req.body);

    const deadline =
      data.deadline === undefined ? undefined : parseOptionalDate(data.deadline as string | null | undefined);
    const started_at =
      data.started_at === undefined ? undefined : parseOptionalDate(data.started_at as string | null | undefined);
    const completed_at =
      data.completed_at === undefined
        ? undefined
        : parseOptionalDate(data.completed_at as string | null | undefined);

    const task = await taskService.updateTask(userId, id, {
      title: data.title,
      description: data.description,
      category: data.category,
      goal_id: data.goal_id === undefined ? undefined : data.goal_id ?? null,
      deadline: deadline === undefined ? undefined : deadline ?? null,
      mode: data.mode,
      status: data.status,
      priority: data.priority,
      progress: data.progress,
      current_step: data.current_step,
      total_steps: data.total_steps,
      result: data.result,
      error: data.error,
      metadata: data.metadata,
      started_at: started_at === undefined ? undefined : started_at ?? null,
      completed_at: completed_at === undefined ? undefined : completed_at ?? null,
    });
    if (!task) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ task });
  } catch (e) {
    next(e);
  }
});

tasksRouter.delete('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const ok = await taskService.deleteTask(userId, id);
    if (!ok) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
