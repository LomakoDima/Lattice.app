import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as GitHubStrategy } from 'passport-github2';
import { env, getOAuthCallbackUrl, isOAuthConfigured } from '../config/env.js';
import type { OAuthProfileInput } from '../services/authService.js';

async function fetchGitHubPrimaryEmail(accessToken: string): Promise<string | null> {
  const r = await fetch('https://api.github.com/user/emails', {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });
  if (!r.ok) return null;
  const data = (await r.json()) as {
    email?: string;
    primary?: boolean;
    verified?: boolean;
  }[];
  const primary = data.find((e) => e.primary && e.verified);
  const verified = data.find((e) => e.verified);
  return primary?.email ?? verified?.email ?? null;
}

export function registerPassportStrategies(): void {
  if (isOAuthConfigured('google')) {
    passport.use(
      new GoogleStrategy(
        {
          clientID: env.GOOGLE_CLIENT_ID!,
          clientSecret: env.GOOGLE_CLIENT_SECRET!,
          callbackURL: getOAuthCallbackUrl('google'),
          scope: ['profile', 'email'],
        },
        (
          _accessToken: string,
          _refreshToken: string,
          profile: { id: string; displayName?: string; emails?: { value: string }[] },
          done: (err: Error | null, user?: OAuthProfileInput) => void
        ) => {
          const email = profile.emails?.[0]?.value;
          if (!email) {
            done(new Error('Google did not return an email'));
            return;
          }
          const payload: OAuthProfileInput = {
            provider: 'google',
            providerUserId: profile.id,
            email,
            displayName: profile.displayName ?? undefined,
          };
          done(null, payload);
        }
      )
    );
  }

  if (isOAuthConfigured('github')) {
    passport.use(
      new GitHubStrategy(
        {
          clientID: env.GITHUB_CLIENT_ID!,
          clientSecret: env.GITHUB_CLIENT_SECRET!,
          callbackURL: getOAuthCallbackUrl('github'),
          scope: ['user:email'],
        },
        async (
          accessToken: string,
          _refreshToken: string,
          profile: {
            id: string | number;
            displayName?: string;
            username?: string;
            emails?: { value: string }[];
          },
          done: (err: Error | null, user?: OAuthProfileInput) => void
        ) => {
          try {
            let email = profile.emails?.[0]?.value ?? null;
            if (!email) {
              email = await fetchGitHubPrimaryEmail(accessToken);
            }
            if (!email) {
              done(new Error('GitHub did not return a verified email'));
              return;
            }
            const payload: OAuthProfileInput = {
              provider: 'github',
              providerUserId: String(profile.id),
              email,
              displayName: profile.displayName ?? profile.username ?? undefined,
            };
            done(null, payload);
          } catch (e) {
            done(e as Error);
          }
        }
      )
    );
  }
}
