import crypto from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { PublicUser } from '../types/user.js';

export type Pending2FAPayload = { sub: string; typ: '2fa_pending' };

const ACCESS_EXPIRES = '15m';

/** Refresh session length: DB row + httpOnly cookie (all login methods). */
export const REFRESH_SESSION_DAYS = 30;
export const REFRESH_COOKIE_MAX_MS = REFRESH_SESSION_DAYS * 24 * 60 * 60 * 1000;

export type AccessPayload = { sub: string; email: string; typ: 'access' };

export function hashRefreshToken(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

export function generateRefreshToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

export function signAccessToken(user: PublicUser): string {
  const payload: AccessPayload = {
    sub: user.id,
    email: user.email,
    typ: 'access',
  };
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, { expiresIn: ACCESS_EXPIRES });
}

export function verifyAccessToken(token: string): AccessPayload {
  const decoded = jwt.verify(token, env.JWT_ACCESS_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token');
  }
  const o = decoded as Record<string, unknown>;
  if (o.typ !== 'access' || typeof o.sub !== 'string' || typeof o.email !== 'string') {
    throw new Error('Invalid access token');
  }
  return { sub: o.sub, email: o.email, typ: 'access' };
}

export function refreshExpiresAt(): Date {
  const d = new Date();
  d.setDate(d.getDate() + REFRESH_SESSION_DAYS);
  return d;
}

export function signPending2FA(userId: string): string {
  const payload = { sub: userId, typ: '2fa_pending' as const };
  return jwt.sign(payload, env.SESSION_SECRET, { expiresIn: '5m' });
}

export function verifyPending2FA(token: string): Pending2FAPayload {
  const decoded = jwt.verify(token, env.SESSION_SECRET);
  if (typeof decoded !== 'object' || decoded === null) {
    throw new Error('Invalid token');
  }
  const o = decoded as Record<string, unknown>;
  if (o.typ !== '2fa_pending' || typeof o.sub !== 'string') {
    throw new Error('Invalid 2FA pending token');
  }
  return { sub: o.sub, typ: '2fa_pending' };
}
