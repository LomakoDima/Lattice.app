import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { apiLimiter } from '../middleware/rateLimiters.js';
import * as goalService from '../services/goalService.js';
import {
  createGoalSchema,
  parseOptionalDate,
  updateGoalSchema,
  uuidParam,
} from '../validation/workspace.js';

export const goalsRouter = Router();

const paginationSchema = z.object({
  limit:  z.coerce.number().int().min(1).max(200).optional(),
  offset: z.coerce.number().int().min(0).optional(),
});

goalsRouter.get('/', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const { limit, offset } = paginationSchema.parse(req.query);
    const result = await goalService.listGoals(userId, { limit, offset });
    res.json(result); // { goals, total, limit, offset }
  } catch (e) {
    next(e);
  }
});

goalsRouter.post('/', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const data = createGoalSchema.parse(req.body);
    const target_date = parseOptionalDate(data.target_date as string | null | undefined) ?? null;
    const goal = await goalService.createGoal(userId, {
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status,
      target_date,
    });
    res.status(201).json({ goal });
  } catch (e) {
    next(e);
  }
});

goalsRouter.get('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const goal = await goalService.getGoalById(userId, id);
    if (!goal) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ goal });
  } catch (e) {
    next(e);
  }
});

goalsRouter.patch('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const data = updateGoalSchema.parse(req.body);
    const target_date =
      data.target_date === undefined
        ? undefined
        : parseOptionalDate(data.target_date as string | null | undefined);

    const goal = await goalService.updateGoal(userId, id, {
      title: data.title,
      description: data.description,
      category: data.category,
      status: data.status,
      target_date: target_date === undefined ? undefined : target_date ?? null,
    });
    if (!goal) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.json({ goal });
  } catch (e) {
    next(e);
  }
});

goalsRouter.delete('/:id', apiLimiter, requireAuth, async (req, res, next) => {
  try {
    const id = uuidParam.parse(req.params.id);
    const { userId } = (req as AuthedRequest).auth;
    const ok = await goalService.deleteGoal(userId, id);
    if (!ok) {
      res.status(404).json({ error: 'Not found' });
      return;
    }
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});
