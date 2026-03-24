import type { LocalUser } from '../contexts/auth-types';

export function getGreetingForHour(hour: number): string {
  if (hour >= 5 && hour < 12) return 'Good morning';
  if (hour >= 12 && hour < 17) return 'Good afternoon';
  if (hour >= 17 && hour < 22) return 'Good evening';
  return 'Good night';
}

export function getGreetingName(user: LocalUser | null): string | null {
  if (!user) return null;
  const meta = user.user_metadata as Record<string, unknown> | undefined;
  const pick = (v: unknown) => (typeof v === 'string' && v.trim() ? v.trim() : '');
  const raw = pick(meta?.full_name) || pick(meta?.name) || pick(meta?.preferred_username);
  if (raw) {
    const first = raw.split(/\s+/)[0] ?? raw;
    return first.length > 28 ? `${first.slice(0, 25)}…` : first;
  }
  if (user.email) {
    const local = user.email.split('@')[0] ?? '';
    return local.length > 28 ? `${local.slice(0, 25)}…` : local;
  }
  return null;
}
