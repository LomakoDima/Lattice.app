import type { CookieOptions } from 'express';
import { env } from '../config/env.js';
import { REFRESH_COOKIE_MAX_MS } from '../services/tokenService.js';

const ACCESS_MAX_MS = 15 * 60 * 1000;

export const COOKIE_ACCESS = 'nexus_access';
export const COOKIE_REFRESH = 'nexus_refresh';
export const COOKIE_2FA_PENDING = 'nexus_2fa_pending';

function secureCookie(): boolean {
  return env.NODE_ENV === 'production';
}

export function refreshCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_MS,
  };
}

export function refreshCookieClearOpts(): CookieOptions {
  return {
    path: '/api/auth',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
  };
}

/** HttpOnly JWT access token — not readable by JS (mitigates XSS token theft). */
export function accessCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/api',
    maxAge: ACCESS_MAX_MS,
  };
}

export function accessCookieClearOpts(): CookieOptions {
  return {
    path: '/api',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
  };
}

export function pending2FACookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 5 * 60 * 1000,
  };
}

export function pending2FACookieClearOpts(): CookieOptions {
  return {
    path: '/api/auth',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: 'lax',
  };
}
