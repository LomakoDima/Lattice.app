import type { Request, Response, NextFunction } from 'express';
import { getNormalizedFrontendOrigin } from '../config/env.js';

/**
 * CSRF protection via Origin / Referer header check for state-changing requests.
 * GET and HEAD are safe (read-only) and skipped.
 * For split-origin deployments (SameSite=None), this is the primary CSRF defence.
 */
export function csrfProtection(req: Request, res: Response, next: NextFunction): void {
  const safe = req.method === 'GET' || req.method === 'HEAD' || req.method === 'OPTIONS';
  if (safe) {
    next();
    return;
  }

  const origin = req.headers['origin'] ?? req.headers['referer'];
  if (!origin) {
    res.status(403).json({ error: 'Forbidden: missing Origin header' });
    return;
  }

  const allowed = getNormalizedFrontendOrigin();
  let requestOrigin: string;
  try {
    requestOrigin = new URL(String(origin)).origin;
  } catch {
    res.status(403).json({ error: 'Forbidden: malformed Origin header' });
    return;
  }

  if (requestOrigin !== allowed) {
    res.status(403).json({ error: 'Forbidden: origin mismatch' });
    return;
  }

  next();
}
