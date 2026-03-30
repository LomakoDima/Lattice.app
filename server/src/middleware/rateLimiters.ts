import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import type { Request } from 'express';
import type { AuthedRequest } from './requireAuth.js';

/**
 * Key function: prefer authenticated userId, fall back to IP.
 * Uses ipKeyGenerator helper for correct IPv6 handling (required by express-rate-limit v7+).
 */
function userOrIpKey(req: Request): string {
  const authed = req as Partial<AuthedRequest>;
  if (authed.auth?.userId) return `uid:${authed.auth.userId}`;
  return `ip:${ipKeyGenerator(req)}`;
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
  skip: (req) => !(req as Partial<AuthedRequest>).auth?.userId,
});
