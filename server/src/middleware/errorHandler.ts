import type { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction
): void {
  if (err instanceof ZodError) {
    res.status(400).json({
      error: 'Validation failed',
      details: err.flatten(),
    });
    return;
  }
  if (err instanceof Error) {
    const status = (err as Error & { status?: number }).status ?? 500;
    if (status >= 500) {
      console.error(err);
    }
    const code = (err as Error & { code?: string }).code;
    res.status(status).json({
      error: err.message,
      ...(code ? { code } : {}),
    });
    return;
  }
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
}
