import { Router, type Request, type Response, type NextFunction } from 'express';
import passport from 'passport';
import { authLimiter, strictAuthLimiter } from '../middleware/rateLimiters.js';
import { env, getNormalizedFrontendOrigin, getOAuthCallbackUrl, isOAuthConfigured } from '../config/env.js';
import { z } from 'zod';
import * as authService from '../services/authService.js';
import * as passwordResetService from '../services/passwordResetService.js';
import { signPending2FA, verifyPending2FA } from '../services/tokenService.js';
import { revokeAllRefreshTokensForUserId } from '../services/refreshTokenService.js';
import { requireAuth, type AuthedRequest } from '../middleware/requireAuth.js';
import { authLog } from '../lib/authLog.js';
import {
  COOKIE_2FA_PENDING,
  COOKIE_ACCESS,
  COOKIE_REFRESH,
  accessCookieClearOpts,
  accessCookieOpts,
  pending2FACookieClearOpts,
  pending2FACookieOpts,
  refreshCookieClearOpts,
  refreshCookieOpts,
} from '../lib/authCookies.js';

function emailDomain(email: string): string {
  const i = email.indexOf('@');
  return i === -1 ? '?' : email.slice(i + 1);
}

function setAuthCookies(res: Response, tokens: { accessToken: string; refreshToken: string }): void {
  res.cookie(COOKIE_ACCESS, tokens.accessToken, accessCookieOpts());
  res.cookie(COOKIE_REFRESH, tokens.refreshToken, refreshCookieOpts());
}

function clearAllAuthCookies(res: Response): void {
  res.clearCookie(COOKIE_ACCESS, accessCookieClearOpts());
  res.clearCookie(COOKIE_REFRESH, refreshCookieClearOpts());
  res.clearCookie(COOKIE_2FA_PENDING, pending2FACookieClearOpts());
}

export const authRouter = Router();

authRouter.get('/oauth/config', authLimiter, (_req, res) => {
  res.json({
    frontendOrigin: getNormalizedFrontendOrigin(),
    googleClientId: env.GOOGLE_CLIENT_ID ?? null,
    githubClientId: env.GITHUB_CLIENT_ID ?? null,
  });
});

authRouter.post('/register', strictAuthLimiter, async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    authLog('password_register_ok', {
      userId: result.user.id,
      emailDomain: emailDomain(result.user.email),
    });
    setAuthCookies(res, result);
    res.status(201).json({ user: result.user });
  } catch (e) {
    authLog('password_register_failed', {
      message: e instanceof Error ? e.message : String(e),
    });
    next(e);
  }
});

authRouter.post('/login', strictAuthLimiter, async (req, res, next) => {
  try {
    const outcome = await authService.login(req.body);
    if ('needsTwoFactor' in outcome && outcome.needsTwoFactor) {
      const pending = signPending2FA(outcome.userId);
      res.cookie(COOKIE_2FA_PENDING, pending, pending2FACookieOpts());
      authLog('password_login_2fa_challenge', { userId: outcome.userId });
      res.status(200).json({ requiresTwoFactor: true });
      return;
    }
    const result = outcome as authService.AuthTokens;
    authLog('password_login_ok', {
      userId: result.user.id,
      emailDomain: emailDomain(result.user.email),
    });
    setAuthCookies(res, result);
    res.json({ user: result.user });
  } catch (e) {
    authLog('password_login_failed', {
      message: e instanceof Error ? e.message : String(e),
    });
    next(e);
  }
});

authRouter.post('/2fa/login-verify', strictAuthLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE_2FA_PENDING] as string | undefined;
    if (!raw) {
      res.status(401).json({ error: 'Two-factor step expired or missing. Sign in again.' });
      return;
    }
    let userId: string;
    try {
      userId = verifyPending2FA(raw).sub;
    } catch {
      res.clearCookie(COOKIE_2FA_PENDING, pending2FACookieClearOpts());
      res.status(401).json({ error: 'Two-factor step expired. Sign in again.' });
      return;
    }
    const result = await authService.verifyTwoFactorLogin(userId, req.body?.code ?? '');
    res.clearCookie(COOKIE_2FA_PENDING, pending2FACookieClearOpts());
    res.cookie(COOKIE_ACCESS, result.accessToken, accessCookieOpts());
    res.cookie(COOKIE_REFRESH, result.refreshToken, refreshCookieOpts());
    authLog('password_login_2fa_ok', { userId: result.user.id });
    res.json({ user: result.user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/refresh', authLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE_REFRESH] as string | undefined;
    if (!raw) {
      res.status(204).end();
      return;
    }
    const result = await authService.refreshSession(raw);
    authLog('refresh_ok', {
      userId: result.user.id,
      emailDomain: emailDomain(result.user.email),
    });
    setAuthCookies(res, result);
    res.json({ user: result.user });
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    if (status === 401) {
      authLog('refresh_rejected', {
        reason: e instanceof Error ? e.message : String(e),
        clearedCookie: true,
      });
      clearAllAuthCookies(res);
      res.status(204).end();
      return;
    }
    authLog('refresh_error', {
      message: e instanceof Error ? e.message : String(e),
    });
    next(e);
  }
});

authRouter.post('/logout', authLimiter, async (req, res, next) => {
  try {
    const raw = req.cookies?.[COOKIE_REFRESH] as string | undefined;
    authLog('logout', { hadRefreshCookie: Boolean(raw) });
    await authService.logout(raw);
    clearAllAuthCookies(res);
    res.status(204).end();
  } catch (e) {
    authLog('logout_error', { message: e instanceof Error ? e.message : String(e) });
    next(e);
  }
});

authRouter.post('/logout-all', authLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    await revokeAllRefreshTokensForUserId(userId);
    clearAllAuthCookies(res);
    authLog('logout_all_devices', { userId });
    res.status(204).end();
  } catch (e) {
    next(e);
  }
});

authRouter.post('/2fa/setup', authLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const data = await authService.prepareTotpSetup(userId);
    res.json(data);
  } catch (e) {
    next(e);
  }
});

authRouter.post('/2fa/enable', authLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const user = await authService.confirmTotpEnable(userId, req.body);
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/2fa/disable', authLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const user = await authService.disableTotp(userId, req.body);
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/forgot-password', strictAuthLimiter, async (req, res, next) => {
  try {
    const { email } = z.object({ email: z.string().email() }).parse(req.body);
    await passwordResetService.requestPasswordReset(email);
    // Always 200 — do not reveal whether the email exists
    res.json({ message: 'If an account with that email exists, a reset link has been sent.' });
  } catch (e) {
    next(e);
  }
});

authRouter.post('/reset-password', strictAuthLimiter, async (req, res, next) => {
  try {
    const schema = z.object({
      token: z.string().min(1),
      password: z.string().min(8).max(128)
        .regex(/[a-zA-Z]/, 'Password must include at least one letter')
        .regex(/[0-9]/, 'Password must include at least one number'),
    });
    const { token, password } = schema.parse(req.body);
    const ok = await passwordResetService.resetPassword(token, password);
    if (!ok) {
      res.status(400).json({ error: 'Invalid or expired reset token.' });
      return;
    }
    authLog('password_reset_ok', {});
    res.json({ message: 'Password has been reset. Please sign in.' });
  } catch (e) {
    next(e);
  }
});

authRouter.get('/me', authLimiter, requireAuth, async (req, res, next) => {
  try {
    const { userId } = (req as AuthedRequest).auth;
    const user = await authService.getPublicUser(userId);
    if (!user) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }
    res.json({ user });
  } catch (e) {
    next(e);
  }
});

function oauthFailureRedirect(): string {
  return `${getNormalizedFrontendOrigin()}/auth?oauth=error`;
}

function oauthSuccessRedirect(): string {
  return `${getNormalizedFrontendOrigin()}/auth?oauth=success`;
}

function oauthLinkConflictRedirect(): string {
  return `${getNormalizedFrontendOrigin()}/auth?oauth=link_conflict`;
}

async function handleOAuthCallback(req: Request, res: Response, next: NextFunction) {
  try {
    const profile = req.user as authService.OAuthProfileInput | undefined;
    if (!profile) {
      authLog('oauth_callback_no_profile', {
        path: req.path,
        queryKeys: Object.keys(req.query ?? {}),
      });
      res.redirect(oauthFailureRedirect());
      return;
    }
    const result = await authService.loginOrRegisterOAuth(profile);
    authLog('oauth_callback_ok', {
      provider: profile.provider,
      userId: result.user.id,
      emailDomain: emailDomain(profile.email),
    });
    setAuthCookies(res, result);
    res.redirect(oauthSuccessRedirect());
  } catch (e) {
    const status = (e as Error & { status?: number }).status;
    const code = (e as Error & { code?: string }).code;
    if (status === 409 && code === 'OAUTH_EMAIL_PASSWORD_CONFLICT') {
      authLog('oauth_link_conflict', { message: (e as Error).message });
      res.redirect(oauthLinkConflictRedirect());
      return;
    }
    authLog('oauth_callback_error', {
      message: e instanceof Error ? e.message : String(e),
    });
    next(e);
  }
}

authRouter.get(
  '/oauth/google',
  authLimiter,
  (req, res, next) => {
    if (!isOAuthConfigured('google')) {
      authLog('oauth_unconfigured', { provider: 'google' });
      res.redirect(`${getNormalizedFrontendOrigin()}/auth?oauth=unconfigured`);
      return;
    }
    authLog('oauth_authorize_redirect', {
      provider: 'google',
      redirectUri: getOAuthCallbackUrl('google'),
    });
    passport.authenticate(
      'google',
      {
        scope: ['profile', 'email'],
        session: false,
        callbackURL: getOAuthCallbackUrl('google'),
        prompt: 'select_account',
      } as never
    )(req, res, next);
  }
);

function logOAuthProviderError(provider: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const err = req.query?.error;
    if (err) {
      authLog('oauth_provider_error', {
        provider,
        error: String(err),
        description: req.query.error_description ? String(req.query.error_description) : undefined,
      });
    }
    next();
  };
}

/** Callback URLs are hit by Google/GitHub even when env is missing — skip passport or "Unknown strategy" crashes. */
function oauthCallbackRequiresProvider(provider: 'google' | 'github') {
  return (_req: Request, res: Response, next: NextFunction) => {
    if (!isOAuthConfigured(provider)) {
      authLog('oauth_callback_unconfigured', { provider });
      res.redirect(`${getNormalizedFrontendOrigin()}/auth?oauth=unconfigured`);
      return;
    }
    next();
  };
}

authRouter.get(
  '/oauth/google/callback',
  authLimiter,
  oauthCallbackRequiresProvider('google'),
  logOAuthProviderError('google'),
  passport.authenticate('google', {
    failureRedirect: oauthFailureRedirect(),
    session: false,
    callbackURL: getOAuthCallbackUrl('google'),
    prompt: 'select_account',
  } as never),
  handleOAuthCallback
);

authRouter.get(
  '/oauth/github',
  authLimiter,
  (req, res, next) => {
    if (!isOAuthConfigured('github')) {
      authLog('oauth_unconfigured', { provider: 'github' });
      res.redirect(`${getNormalizedFrontendOrigin()}/auth?oauth=unconfigured`);
      return;
    }
    authLog('oauth_authorize_redirect', {
      provider: 'github',
      redirectUri: getOAuthCallbackUrl('github'),
    });
    passport.authenticate(
      'github',
      {
        scope: ['user:email'],
        session: false,
        callbackURL: getOAuthCallbackUrl('github'),
      } as never
    )(req, res, next);
  }
);

authRouter.get(
  '/oauth/github/callback',
  authLimiter,
  oauthCallbackRequiresProvider('github'),
  logOAuthProviderError('github'),
  passport.authenticate('github', {
    failureRedirect: oauthFailureRedirect(),
    session: false,
    callbackURL: getOAuthCallbackUrl('github'),
  } as never),
  handleOAuthCallback
);
