import type { CookieOptions } from 'express';
import { env, isSplitOriginDeployment } from '../config/env.js';
import { REFRESH_COOKIE_MAX_MS } from '../services/tokenService.js';

/** Cross-origin frontend (e.g. Vercel) + API (e.g. Render) requires SameSite=None + Secure for credentialed requests. */
function sameSiteAttr(): 'lax' | 'none' {
  if (env.NODE_ENV === 'production' && isSplitOriginDeployment()) return 'none';
  return 'lax';
}

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
    sameSite: sameSiteAttr(),
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_MS,
  };
}

export function refreshCookieClearOpts(): CookieOptions {
  return {
    path: '/api/auth',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: sameSiteAttr(),
  };
}

/** HttpOnly JWT access token — not readable by JS (mitigates XSS token theft). */
export function accessCookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: sameSiteAttr(),
    path: '/api',
    maxAge: ACCESS_MAX_MS,
  };
}

export function accessCookieClearOpts(): CookieOptions {
  return {
    path: '/api',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: sameSiteAttr(),
  };
}

export function pending2FACookieOpts(): CookieOptions {
  return {
    httpOnly: true,
    secure: secureCookie(),
    sameSite: sameSiteAttr(),
    path: '/api/auth',
    maxAge: 5 * 60 * 1000,
  };
}

export function pending2FACookieClearOpts(): CookieOptions {
  return {
    path: '/api/auth',
    httpOnly: true,
    secure: secureCookie(),
    sameSite: sameSiteAttr(),
  };
}
