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
  GOOGLE_CLIENT_ID: z.preprocess(trim, z.string().optional()),
  GOOGLE_CLIENT_SECRET: z.preprocess(trim, z.string().optional()),
  GOOGLE_CALLBACK_URL: z.preprocess(trim, z.string().url().optional()),
  GITHUB_CLIENT_ID: z.preprocess(trim, z.string().optional()),
  GITHUB_CLIENT_SECRET: z.preprocess(trim, z.string().optional()),
  GITHUB_CALLBACK_URL: z.preprocess(trim, z.string().url().optional()),
});

export type Env = z.infer<typeof envSchema>;

export const env: Env = envSchema.parse(process.env);

/** OAuth redirect_uri must match provider consoles — derived from FRONTEND_ORIGIN only (avoids localhost vs 127.0.0.1 drift vs separate *_CALLBACK_URL). */
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

export function getOAuthCallbackUrl(provider: OAuthCallbackProvider): string {
  return `${getNormalizedFrontendOrigin()}${OAUTH_CALLBACK_PATHS[provider]}`;
}

export function isOAuthConfigured(provider: 'google' | 'github'): boolean {
  if (provider === 'google') {
    return Boolean(env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET);
  }
  return Boolean(env.GITHUB_CLIENT_ID && env.GITHUB_CLIENT_SECRET);
}
