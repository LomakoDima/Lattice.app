import bcrypt from 'bcrypt';
import { z } from 'zod';
import { pool } from '../db/pool.js';
import type { PublicUser } from '../types/user.js';
import * as userService from './userService.js';
import * as oauthAccountService from './oauthAccountService.js';
import {
  generateRefreshToken,
  saveRefreshToken,
  consumeRefreshToken,
  deleteRefreshTokenByHash,
  revokeAllRefreshTokensForUser,
} from './refreshTokenService.js';
import { signAccessToken } from './tokenService.js';
import {
  buildTotpEnrollment,
  generateTotpSecret,
  normalizeTotpSecret,
  verifyTotpCode,
  verifyTotpCodeOnce,
  verifyTotpCodeOnceSetup,
} from './twoFactorService.js';
import { isTotpBlocked, recordTotpFailure, clearTotpFailures } from '../lib/totpBruteGuard.js';
<<<<<<< HEAD
import { isLoginBlocked, recordLoginFailure, clearLoginFailures } from '../lib/loginBruteGuard.js';

const DUMMY_HASH = '$2b$12$KIXTnMOLsDyz2kDIYPGuna.USxqnvISiGH3O2nQTnOOyyVGJZJB6e';
=======
>>>>>>> main

const strongPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .max(128)
  .regex(/[a-zA-Z]/, 'Password must include at least one letter')
  .regex(/[0-9]/, 'Password must include at least one number');

const registerSchema = z.object({
  email: z.string().email(),
  password: strongPassword,
  displayName: z.string().max(255).optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const totpEnableSchema = z.object({
  secret: z.string().min(16),
  code: z.string().min(6).max(12),
});

const totpCodeSchema = z.object({
  code: z.string().min(6).max(12),
});

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
  user: PublicUser;
};

export type LoginOutcome = AuthTokens | { needsTwoFactor: true; userId: string };

export async function register(input: unknown): Promise<AuthTokens> {
  const data = registerSchema.parse(input);
  const passwordHash = await bcrypt.hash(data.password, 12);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const existing = await userService.findUserByEmail(client, data.email);
    if (existing) {
      await client.query('ROLLBACK');
<<<<<<< HEAD
      const err = new Error('Registration failed. Please check your input and try again.');
      (err as Error & { status: number }).status = 400;
=======
      const err = new Error('Invalid email or password');
      (err as Error & { status: number }).status = 409;
>>>>>>> main
      throw err;
    }
    const user = await userService.createUserWithPassword(client, {
      email: data.email,
      passwordHash,
      displayName: data.displayName,
    });
    await revokeAllRefreshTokensForUser(client, user.id);
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(client, user.id, refreshToken);
    const accessToken = signAccessToken(user);
    await client.query('COMMIT');
    return { accessToken, refreshToken, user };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function login(input: unknown): Promise<LoginOutcome> {
  const data = loginSchema.parse(input);

  if (isLoginBlocked(data.email)) {
    await bcrypt.compare(data.password, DUMMY_HASH);
    const err = new Error('Too many failed attempts. Try again later.');
    (err as Error & { status: number }).status = 403;
    throw err;
  }

  const client = await pool.connect();
  try {
    const row = await userService.findUserByEmail(client, data.email);
    if (!row?.password_hash) {
      await bcrypt.compare(data.password, DUMMY_HASH);
      recordLoginFailure(data.email);
      const err = new Error('Invalid email or password');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    const ok = await bcrypt.compare(data.password, row.password_hash);
    if (!ok) {
      recordLoginFailure(data.email);
      const err = new Error('Invalid email or password');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    clearLoginFailures(data.email);
    if (row.two_factor_enabled && row.totp_secret) {
      return { needsTwoFactor: true, userId: row.id };
    }
    const user = userService.rowToPublic(row);
    await client.query('BEGIN');
    try {
      // Do NOT revoke all sessions here — saveRefreshToken enforces the
      // session cap (MAX_SESSIONS) and evicts the oldest token automatically.
      const refreshToken = generateRefreshToken();
      await saveRefreshToken(client, user.id, refreshToken);
      const accessToken = signAccessToken(user);
      await client.query('COMMIT');
      return { accessToken, refreshToken, user };
    } catch (e) {
      try {
        await client.query('ROLLBACK');
      } catch {
        /* no active transaction */
      }
      throw e;
    }
  } finally {
    client.release();
  }
}

export async function verifyTwoFactorLogin(userId: string, codeRaw: string): Promise<AuthTokens> {
  if (isTotpBlocked(userId)) {
    const err = new Error('Too many failed attempts. Try again later.');
    (err as Error & { status: number }).status = 403;
    throw err;
  }
  const code = totpCodeSchema.parse({ code: codeRaw }).code;
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await userService.findUserById(client, userId);
    if (!row?.two_factor_enabled || !row.totp_secret) {
      await client.query('ROLLBACK');
      const err = new Error('Two-factor authentication is not active for this account');
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    if (!await verifyTotpCodeOnce(client, userId, row.totp_secret, code)) {
      await client.query('ROLLBACK');
      recordTotpFailure(userId);
      const err = new Error('Invalid authentication code');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    clearTotpFailures(userId);
    const user = userService.rowToPublic(row);
    // Session cap enforced inside saveRefreshToken — no revokeAll needed.
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(client, user.id, refreshToken);
    const accessToken = signAccessToken(user);
    await client.query('COMMIT');
    return { accessToken, refreshToken, user };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function refreshSession(refreshTokenRaw: string | undefined): Promise<AuthTokens> {
  if (!refreshTokenRaw) {
    const err = new Error('Missing refresh token');
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const consumed = await consumeRefreshToken(client, refreshTokenRaw);
    if (!consumed) {
      await client.query('ROLLBACK');
      const err = new Error('Invalid or expired session');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    const row = await userService.findUserById(client, consumed.user_id);
    if (!row) {
      await client.query('ROLLBACK');
      const err = new Error('User not found');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    const user = userService.rowToPublic(row);
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(client, user.id, refreshToken);
    const accessToken = signAccessToken(user);
    await client.query('COMMIT');
    return { accessToken, refreshToken, user };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function logout(refreshTokenRaw: string | undefined): Promise<void> {
  if (!refreshTokenRaw) return;
  const client = await pool.connect();
  try {
    await deleteRefreshTokenByHash(client, refreshTokenRaw);
  } finally {
    client.release();
  }
}

export type OAuthProfileInput = {
  provider: 'google' | 'github';
  providerUserId: string;
  email: string;
  displayName?: string | null;
};

export async function loginOrRegisterOAuth(input: OAuthProfileInput): Promise<AuthTokens> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    const err = new Error('OAuth provider did not return an email');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const linked = await oauthAccountService.findOAuthAccount(
      client,
      input.provider,
      input.providerUserId
    );
    if (linked) {
      const row = await userService.findUserById(client, linked.user_id);
      if (!row) {
        await client.query('ROLLBACK');
        throw new Error('User missing');
      }
      const user = userService.rowToPublic(row);
      // Session cap enforced inside saveRefreshToken.
      const refreshToken = generateRefreshToken();
      await saveRefreshToken(client, user.id, refreshToken);
      const accessToken = signAccessToken(user);
      await client.query('COMMIT');
      return { accessToken, refreshToken, user };
    }

    const existingByEmail = await userService.findUserByEmail(client, email);
    if (existingByEmail?.password_hash) {
      await client.query('ROLLBACK');
      const err = new Error('Sign in failed. Try a different method or check your credentials.');
      (err as Error & { status: number }).status = 409;
      (err as Error & { code: string }).code = 'OAUTH_EMAIL_PASSWORD_CONFLICT';
      throw err;
    }

    let user: PublicUser;
    if (existingByEmail) {
      user = userService.rowToPublic(existingByEmail);
      await oauthAccountService.linkOAuthAccount(
        client,
        user.id,
        input.provider,
        input.providerUserId
      );
    } else {
      user = await userService.createUserOAuthOnly(client, {
        email,
        displayName: input.displayName,
      });
      await oauthAccountService.linkOAuthAccount(
        client,
        user.id,
        input.provider,
        input.providerUserId
      );
    }
    // Session cap enforced inside saveRefreshToken.
    const refreshToken = generateRefreshToken();
    await saveRefreshToken(client, user.id, refreshToken);
    const accessToken = signAccessToken(user);
    await client.query('COMMIT');
    return { accessToken, refreshToken, user };
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function getPublicUser(userId: string): Promise<PublicUser | null> {
  const row = await userService.findUserById(pool, userId);
  return row ? userService.rowToPublic(row) : null;
}

export async function prepareTotpSetup(userId: string): Promise<{ secret: string; otpauthUrl: string; qrDataUrl: string }> {
  const row = await userService.findUserById(pool, userId);
  if (!row) {
    const err = new Error('User not found');
    (err as Error & { status: number }).status = 404;
    throw err;
  }
  if (row.two_factor_enabled) {
    const err = new Error('Two-factor authentication is already enabled');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const secret = generateTotpSecret();
  const { otpauthUrl, qrDataUrl } = await buildTotpEnrollment(row.email, secret);
  return { secret, otpauthUrl, qrDataUrl };
}

export async function confirmTotpEnable(userId: string, input: unknown): Promise<PublicUser> {
  const { secret, code } = totpEnableSchema.parse(input);
  if (!await verifyTotpCodeOnceSetup(userId, secret, code)) {
    const err = new Error('Invalid authentication code');
    (err as Error & { status: number }).status = 400;
    throw err;
  }
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await userService.findUserById(client, userId);
    if (!row) {
      await client.query('ROLLBACK');
      const err = new Error('User not found');
      (err as Error & { status: number }).status = 404;
      throw err;
    }
    if (row.two_factor_enabled) {
      await client.query('ROLLBACK');
      const err = new Error('Two-factor authentication is already enabled');
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    await userService.enableUserTotp(client, userId, normalizeTotpSecret(secret));
    const updated = await userService.findUserById(client, userId);
    await client.query('COMMIT');
    return updated ? userService.rowToPublic(updated) : userService.rowToPublic(row);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}

export async function disableTotp(userId: string, input: unknown): Promise<PublicUser> {
  const { code } = totpCodeSchema.parse(input);
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const row = await userService.findUserById(client, userId);
    if (!row?.two_factor_enabled || !row.totp_secret) {
      await client.query('ROLLBACK');
      const err = new Error('Two-factor authentication is not enabled');
      (err as Error & { status: number }).status = 400;
      throw err;
    }
    if (!await verifyTotpCodeOnce(client, userId, row.totp_secret, code)) {
      await client.query('ROLLBACK');
      const err = new Error('Invalid authentication code');
      (err as Error & { status: number }).status = 401;
      throw err;
    }
    await userService.disableUserTotp(client, userId);
    const updated = await userService.findUserById(client, userId);
    await client.query('COMMIT');
    if (!updated) throw new Error('User not found');
    return userService.rowToPublic(updated);
  } catch (e) {
    await client.query('ROLLBACK');
    throw e;
  } finally {
    client.release();
  }
}
