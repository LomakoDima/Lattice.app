import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
loadDotenv({ path: resolve(__dirname, '../../../.env') });

const trim = (s: unknown) => (typeof s === 'string' ? s.trim() : s);

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  DATABASE_URL: z.preprocess(trim, z.string().min(1)),
  JWT_ACCESS_SECRET: z.string().min(16),
  SESSION_SECRET: z.string().min(16),
  FRONTEND_ORIGIN: z.preprocess(trim, z.string().url()),
  /** Public URL of this API (e.g. https://lattice-api.onrender.com). Set when the app is on Vercel and the API on Render — OAuth redirect_uri must point at the API host. If omitted, OAuth uses FRONTEND_ORIGIN (same-origin / dev proxy). */
  API_PUBLIC_URL: z.preprocess(trim, z.string().url().optional()),
  GOOGLE_CLIENT_ID: z.preprocess(trim, z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(trim, z.string().optional()),
  GOOGLE_CALLBACK_URL: z.preprocess(trim, z.string().url().optional()),
  GITHUB_CLIENT_ID: z.preprocess(trim, z.string().optional()),
  GITHUB_CLIENT_SECRET: z.preprocess(trim, z.string().optional()),
  GITHUB_CALLBACK_URL: z.preprocess(trim, z.string().url().optional()),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

const OAUTH_CALLBACK_PATHS = {
  google: '/api/auth/oauth/google/callback',
  github: '/api/auth/oauth/github/callback',
} as const;

export type OAuthCallbackProvider = keyof typeof OAUTH_CALLBACK_PATHS;

/** Scheme + host + port only — avoids redirect_uri_mismatch when FRONTEND_ORIGIN accidentally includes a path. */
export function getNormalizedFrontendOrigin(): string {
  try {
    return new URL(env.FRONTEND_ORIGIN).origin;
  } catch {
    return env.FRONTEND_ORIGIN.replace(/\/+$/, '');
  }
}

/** Base URL for OAuth callbacks: API host when API_PUBLIC_URL is set (split deploy), else frontend origin (proxied dev or same host). */
export function getOAuthCallbackOrigin(): string {
  if (env.API_PUBLIC_URL) {
    try {
      return new URL(env.API_PUBLIC_URL).origin;
    } catch {
      return env.API_PUBLIC_URL.replace(/\/+$/, '');
    }
  }
  return getNormalizedFrontendOrigin();
}

export function getOAuthCallbackUrl(provider: OAuthCallbackProvider): string {
  return `${getOAuthCallbackOrigin()}${OAUTH_CALLBACK_PATHS[provider]}`;
}

/** True when browser origin (FRONTEND_ORIGIN) differs from API origin — cookies need SameSite=None for credentialed fetch. */
export function isSplitOriginDeployment(): boolean {
  if (!env.API_PUBLIC_URL) return false;
  try {
    return new URL(env.API_PUBLIC_URL).origin !== getNormalizedFrontendOrigin();
  } catch {
    return true;
  }
}

export function isOAuthConfigured(provider: 'google' | 'github'): boolean {
  if (provider === 'google') {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}
