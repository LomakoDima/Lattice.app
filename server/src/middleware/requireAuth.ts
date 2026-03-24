import type { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../services/tokenService.js';
import { COOKIE_ACCESS } from '../lib/authCookies.js';

export type AuthedRequest = Request & {
  auth: { userId: string; email: string };
};

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const h = req.headers.authorization;
  const bearer = h?.startsWith('Bearer ') ? h.slice(7) : null;
  const cookieToken = req.cookies?.[COOKIE_ACCESS] as string | undefined;
  const token = cookieToken || bearer;
  if (!token) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  try {
    const payload = verifyAccessToken(token);
    (req as AuthedRequest).auth = { userId: payload.sub, email: payload.email };
    next();
  } catch {
    res.status(401).json({ error: 'Unauthorized' });
  }
}
