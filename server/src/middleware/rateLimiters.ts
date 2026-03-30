import rateLimit from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthedRequest } from './requireAuth.js';

/**
 * Key function: prefer authenticated userId, fall back to IP.
 * This prevents one user from consuming the shared IP bucket,
 * and blocks per-user brute-force regardless of source IP/VPN.
 */
function userOrIpKey(req: Request): string {
  const authed = req as Partial<AuthedRequest>;
  if (authed.auth?.userId) return `uid:${authed.auth.userId}`;
  // X-Forwarded-For is trusted because app.set('trust proxy', 1)
  const ip = req.ip ?? req.socket.remoteAddress ?? 'unknown';
  return `ip:${ip}`;
}

/** General auth endpoints: 60 req / 15 min per user-or-IP */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
});

/**
 * Sensitive endpoints (login, register, 2FA verify): 10 req / 15 min per user-or-IP.
 * Tighter than the old limit (25) and now per-user so VPN/NAT can't share the budget.
 */
export const strictAuthLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many attempts. Please try again later.' },
});

/** API data endpoints: 300 req / 15 min per authenticated user */
export const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: userOrIpKey,
  standardHeaders: true,
  legacyHeaders: false,
  skip: (req) => !(req as Partial<AuthedRequest>).auth?.userId, // skip unauthenticated (requireAuth handles that)
});
