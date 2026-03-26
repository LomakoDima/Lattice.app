import { useCallback, useEffect, useId, useState } from 'react';
import {
  Bell,
  BellOff,
  Copy,
  KeyRound,
  Loader2,
  LogOut,
  Palette,
  Plus,
  Shield,
  Sparkles,
  Tags,
  Trash2,
  UserRound,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { LocalUser } from '../../contexts/auth-types';
import { useAuth } from '../../contexts/useAuth';
import { applySettingsToDocument, loadSettings, saveSettings, type LatticeAppSettings } from '../../lib/appSettings';
import {
  focusNotificationsSupported,
  getFocusNotificationPermission,
  requestFocusNotificationPermission,
} from '../../lib/focusNotifications';
import { apiFetch } from '../../lib/api';
import {
  addCustomCategory,
  LATTICE_CATEGORIES_CHANGED,
  loadCustomCategories,
  removeCustomCategory,
  type CategoryOption,
} from '../../constants/categories';

function displayNameFromUser(u: LocalUser | null): string {
  if (!u) return '—';
  return (
    u.user_metadata?.full_name ||
    u.user_metadata?.name ||
    (u.email ? u.email.split('@')[0] : '') ||
    'Account'
  );
}

function initials(u: LocalUser | null): string {
  if (!u) return '?';
  const n = displayNameFromUser(u);
  const p = n.trim().split(/\s+/).filter(Boolean);
  if (p.length >= 2) return (p[0]![0]! + p[1]![0]!).toUpperCase();
  return n.slice(0, 2).toUpperCase();
}

function ToggleRow({
  id,
  label,
  description,
  checked,
  onChange,
}: {
  id: string;
  label: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-nexus-void/35 px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
        <div className="min-w-0">
          <label htmlFor={id} className="text-[13px] font-medium text-neutral-100">
            {label}
          </label>
          <p className="mt-1 text-xs leading-relaxed text-neutral-500">{description}</p>
        </div>
        <button
          id={id}
          type="button"
          role="switch"
          aria-checked={checked}
          onClick={() => onChange(!checked)}
          className={`relative h-7 w-12 shrink-0 rounded-full border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-nexus-accent/45 ${
            checked
              ? 'border-nexus-accent/45 bg-nexus-accent/20 shadow-[0_0_16px_-4px_rgba(200,245,98,0.35)]'
              : 'border-white/[0.1] bg-nexus-void/90'
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ease-out ${
              checked ? 'right-0.5 left-auto' : 'left-0.5'
            }`}
          />
        </button>
      </div>
    </div>
  );
}

export function Settings() {
  const { user, signOut, refreshUser, logoutAllDevices } = useAuth();
  const navigate = useNavigate();
  const baseId = useId();
  const [settings, setSettings] = useState<LatticeAppSettings>(() => loadSettings());
  const [twoFaSetup, setTwoFaSetup] = useState<{
    secret: string;
    otpauthUrl: string;
    qrDataUrl: string;
  } | null>(null);
  const [enrollCode, setEnrollCode] = useState('');
  const [disableCode, setDisableCode] = useState('');
  const [twoFaBusy, setTwoFaBusy] = useState(false);
  const [twoFaMsg, setTwoFaMsg] = useState('');
  const [notifPerm, setNotifPerm] = useState<ReturnType<typeof getFocusNotificationPermission>>(() =>
    getFocusNotificationPermission(),
  );
  const [focusNotifHint, setFocusNotifHint] = useState('');
  const [notifBusy, setNotifBusy] = useState(false);
  const [customCategories, setCustomCategories] = useState<CategoryOption[]>(() => loadCustomCategories());
  const [newCategoryName, setNewCategoryName] = useState('');
  const [categoryMsg, setCategoryMsg] = useState('');

  const refreshNotifPerm = useCallback(() => {
    setNotifPerm(getFocusNotificationPermission());
  }, []);

  useEffect(() => {
    refreshNotifPerm();
    const onVis = () => {
      if (document.visibilityState === 'visible') refreshNotifPerm();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, [refreshNotifPerm]);

  useEffect(() => {
    const sync = () => setCustomCategories(loadCustomCategories());
    window.addEventListener(LATTICE_CATEGORIES_CHANGED, sync);
    return () => window.removeEventListener(LATTICE_CATEGORIES_CHANGED, sync);
  }, []);

  const startTotpSetup = async () => {
    setTwoFaMsg('');
    setTwoFaBusy(true);
    try {
      const r = await apiFetch('/api/auth/2fa/setup', { method: 'POST' });
      const data = (await r.json()) as { secret?: string; otpauthUrl?: string; qrDataUrl?: string; error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Setup failed');
      if (!data.secret || !data.qrDataUrl) throw new Error('Invalid response');
      setTwoFaSetup({
        secret: data.secret,
        otpauthUrl: data.otpauthUrl ?? '',
        qrDataUrl: data.qrDataUrl,
      });
      setEnrollCode('');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Setup failed');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTotpEnable = async () => {
    if (!twoFaSetup) return;
    setTwoFaMsg('');
    setTwoFaBusy(true);
    try {
      const r = await apiFetch('/api/auth/2fa/enable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ secret: twoFaSetup.secret, code: enrollCode.replace(/\s/g, '') }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Could not enable 2FA');
      await refreshUser();
      setTwoFaSetup(null);
      setEnrollCode('');
      setTwoFaMsg('Two-factor authentication is now on.');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const confirmTotpDisable = async () => {
    setTwoFaMsg('');
    setTwoFaBusy(true);
    try {
      const r = await apiFetch('/api/auth/2fa/disable', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: disableCode.replace(/\s/g, '') }),
      });
      const data = (await r.json().catch(() => ({}))) as { error?: string };
      if (!r.ok) throw new Error(data.error ?? 'Could not disable 2FA');
      await refreshUser();
      setDisableCode('');
      setTwoFaMsg('Two-factor authentication is off.');
    } catch (e) {
      setTwoFaMsg(e instanceof Error ? e.message : 'Failed');
    } finally {
      setTwoFaBusy(false);
    }
  };

  const patch = useCallback((partial: Partial<LatticeAppSettings>) => {
    const next = saveSettings(partial);
    setSettings(next);
    applySettingsToDocument(next);
  }, []);

  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      /* ignore */
    }
  };

  const confirmEnableBrowserNotifications = () =>
    window.confirm(
      'Enable focus session reminders?\n\nYour browser will ask whether this site may show notifications.',
    );

  const handleAllowBrowserNotifications = async () => {
    if (!focusNotificationsSupported()) return;
    setFocusNotifHint('');
    if (getFocusNotificationPermission() !== 'default') return;
    if (!confirmEnableBrowserNotifications()) {
      setFocusNotifHint('Notifications were not enabled. You can try again when you’re ready.');
      return;
    }
    setNotifBusy(true);
    try {
      const perm = await requestFocusNotificationPermission();
      refreshNotifPerm();
      if (perm === 'granted') {
        patch({ focusEndNotifications: true });
      } else if (perm === 'denied') {
        setFocusNotifHint('Notifications are blocked — use Unblock in Chrome below.');
      }
    } finally {
      setNotifBusy(false);
    }
  };

  const handleRecheckNotificationPermission = () => {
    setFocusNotifHint('');
    refreshNotifPerm();
    const p = getFocusNotificationPermission();
    if (p === 'granted') {
      setFocusNotifHint('Browser now allows notifications. Turn on focus reminders above.');
    } else if (p === 'denied') {
      setFocusNotifHint(
        'Still blocked. In Chrome: click the icon left of the address bar, then Allow for this site.',
      );
    }
  };

  const handleFocusEndNotificationsChange = async (v: boolean) => {
    if (v && notifBusy) return;
    setFocusNotifHint('');
    if (!v) {
      patch({ focusEndNotifications: false });
      refreshNotifPerm();
      return;
    }
    if (!focusNotificationsSupported()) {
      setFocusNotifHint('Notifications are not available in this browser or context.');
      return;
    }
    if (getFocusNotificationPermission() === 'default' && !confirmEnableBrowserNotifications()) {
      setFocusNotifHint('Reminders stay off until you confirm.');
      return;
    }
    setNotifBusy(true);
    try {
      const perm = await requestFocusNotificationPermission();
      refreshNotifPerm();
      if (perm !== 'granted') {
        setFocusNotifHint(
          perm === 'denied'
            ? 'Notifications are blocked — use Unblock in Chrome below.'
            : 'Could not enable notifications.',
        );
        patch({ focusEndNotifications: false });
        return;
      }
      patch({ focusEndNotifications: true });
    } finally {
      setNotifBusy(false);
    }
  };

  const handleAddCustomCategory = () => {
    setCategoryMsg('');
    const result = addCustomCategory(newCategoryName);
    if (!result.ok) {
      setCategoryMsg(result.reason);
      return;
    }
    setNewCategoryName('');
  };

  const chromeUnblockSteps = (
    <div className="rounded-xl border border-white/[0.08] bg-nexus-void/45 px-3 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.03)]">
      <div className="flex gap-2">
        <BellOff className="mt-0.5 h-4 w-4 shrink-0 text-amber-400/90" strokeWidth={2} />
        <div className="min-w-0 space-y-2">
          <p className="text-[13px] font-medium text-neutral-200">Unblock in Chrome</p>
          <p className="text-xs leading-relaxed text-neutral-500">
            When notifications are blocked, the page cannot show the permission prompt again. Change it in Chrome’s
            site controls — the same panel as “Notifications blocked” next to the URL.
          </p>
          <ol className="list-decimal space-y-1.5 pl-4 text-xs leading-relaxed text-neutral-400">
            <li>
              Click the <span className="text-neutral-200">icon to the left of the address bar</span> (lock, tune, or
              blocked bell).
            </li>
            <li>
              Under Notifications, choose <span className="text-neutral-200">Allow for this site</span>.
            </li>
            <li>Come back here and use Check again so Lattice picks up the new permission.</li>
          </ol>
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="mt-1 w-fit gap-2 rounded-lg px-3 py-1.5 text-xs"
            onClick={handleRecheckNotificationPermission}
          >
            Check again
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="animate-fade-up space-y-10 pb-12">
      <header className="flex flex-col gap-6 border-b border-white/[0.06] pb-8 lg:flex-row lg:items-end lg:justify-between">
        <div className="min-w-0 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-neutral-600">Lattice · Settings</p>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-white sm:text-4xl">
            <span className="text-white">Tune your </span>
            <span className="text-nexus-accent">workspace</span>
          </h1>
          <p className="text-sm text-neutral-500">
            Profile from your account · preferences stay in this browser · same shell as Overview
          </p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:max-w-md lg:flex-1">
          <div className="rounded-xl border border-white/[0.06] bg-nexus-panel/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Theme</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-nexus-accent">Dark</p>
          </div>
          <div className="rounded-xl border border-white/[0.06] bg-nexus-panel/80 px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <p className="text-[10px] font-medium uppercase tracking-wider text-neutral-600">Alerts</p>
            <p className="mt-1 font-display text-lg font-semibold tabular-nums text-white">
              {settings.focusEndNotifications ? 'On' : 'Off'}
            </p>
          </div>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-12 lg:gap-5">
        {/* Profile — wide */}
        <Card glass className="relative overflow-hidden p-6 lg:col-span-7 lg:p-8">
          <div className="pointer-events-none absolute -right-10 -top-10 h-36 w-36 rounded-full bg-nexus-accent/[0.09] blur-3xl" />
          <div className="pointer-events-none absolute -bottom-16 left-1/3 h-28 w-28 rounded-full bg-white/[0.03] blur-2xl" />

          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-start sm:gap-8">
            <div className="flex shrink-0 flex-col items-center sm:items-start">
              <div className="relative">
                <div className="flex h-[5.5rem] w-[5.5rem] items-center justify-center rounded-2xl border border-nexus-accent/30 bg-gradient-to-br from-nexus-accent/[0.15] to-nexus-void/80 font-display text-2xl font-semibold uppercase tracking-tight text-nexus-accent shadow-[0_0_40px_-12px_rgba(200,245,98,0.45)]">
                  {initials(user)}
                </div>
                <span className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-lg border border-white/[0.1] bg-nexus-panel shadow-lg">
                  <UserRound className="h-3.5 w-3.5 text-nexus-accent/90" strokeWidth={2} />
                </span>
              </div>
              <p className="mt-4 text-center font-mono text-[9px] uppercase tracking-[0.18em] text-neutral-600 sm:text-left">
                Signed in
              </p>
            </div>

            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent">Identity</p>
              <h2 className="font-display mt-2 text-xl font-semibold text-white sm:text-2xl">Profile</h2>
              <p className="mt-1 text-xs text-neutral-500">
                Read-only fields from auth — use copy actions when you need to paste IDs elsewhere.
              </p>

              <dl className="mt-6 space-y-0 divide-y divide-white/[0.06] border-t border-white/[0.06]">
                <div className="flex flex-col gap-2 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
                  <div>
                    <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">Display name</dt>
                    <dd className="mt-1.5 text-[15px] font-medium text-neutral-100">{displayNameFromUser(user)}</dd>
                  </div>
                </div>
                <div className="py-4">
                  <dt className="font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">Email</dt>
                  <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all font-mono text-[13px] text-neutral-300">{user?.email ?? '—'}</span>
                    {user?.email ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-fit shrink-0 gap-2 rounded-lg px-3 py-1.5 text-xs"
                        onClick={() => void copy(user.email!)}
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                        Copy
                      </Button>
                    ) : null}
                  </dd>
                </div>
                <div className="py-4">
                  <dt className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.14em] text-neutral-600">
                    <KeyRound className="h-3 w-3 text-neutral-500" strokeWidth={2} />
                    User ID
                  </dt>
                  <dd className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                    <span className="break-all font-mono text-[11px] leading-relaxed text-neutral-500">{user?.id ?? '—'}</span>
                    {user?.id ? (
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        className="w-fit shrink-0 gap-2 rounded-lg px-3 py-1.5 text-xs"
                        onClick={() => void copy(user.id)}
                      >
                        <Copy className="h-3.5 w-3.5" strokeWidth={2} />
                        Copy
                      </Button>
                    ) : null}
                  </dd>
                </div>
              </dl>
            </div>
          </div>
        </Card>

        {/* Notifications */}
        <Card glass className="relative flex flex-col overflow-hidden p-6 lg:col-span-5 lg:p-8">
          <div className="pointer-events-none absolute right-0 top-0 h-24 w-24 rounded-full bg-white/[0.04] blur-2xl" />
          <div className="relative border-b border-white/[0.06] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent">Browser</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/60">
                <Bell className="h-[18px] w-[18px] text-neutral-300" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Notifications</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Preference is stored locally. Enabling may prompt your browser for permission to show alerts.
                </p>
              </div>
            </div>
          </div>
          <div className="relative mt-4 flex flex-1 flex-col gap-3">
            <ToggleRow
              id={`${baseId}-focus`}
              label="Focus session reminders"
              description="Desktop notification when a focus or break interval ends (Pomodoro timer reaches zero)."
              checked={settings.focusEndNotifications}
              onChange={(next) => void handleFocusEndNotificationsChange(next)}
            />
            {notifPerm !== 'unsupported' ? (
              <div className="space-y-1.5">
                <p className="text-xs text-neutral-500">
                  Browser permission:{' '}
                  <span className="text-neutral-300">
                    {notifPerm === 'granted'
                      ? 'allowed'
                      : notifPerm === 'denied'
                        ? 'blocked'
                        : 'not asked yet'}
                  </span>
                </p>
                {notifPerm === 'default' ? (
                  <p className="text-xs leading-relaxed text-neutral-500">
                    Turn on reminders or use Allow — we’ll ask here first, then your browser will prompt.
                  </p>
                ) : null}
                {notifPerm === 'denied' ? chromeUnblockSteps : null}
              </div>
            ) : (
              <p className="text-xs text-neutral-500">Browser notifications are not supported here.</p>
            )}
            {focusNotifHint ? (
              <p
                className={
                  focusNotifHint.startsWith('Browser now allows')
                    ? 'rounded-lg border border-emerald-500/25 bg-emerald-500/[0.06] px-3 py-2 text-xs text-emerald-100/95'
                    : 'rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200/95'
                }
              >
                {focusNotifHint}
              </p>
            ) : null}
            {notifPerm === 'default' ? (
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-fit gap-2 rounded-lg px-3 py-1.5 text-xs"
                disabled={notifBusy}
                onClick={() => void handleAllowBrowserNotifications()}
              >
                {notifBusy ? <Loader2 className="h-3.5 w-3.5 animate-spin" strokeWidth={2} /> : null}
                Allow in browser…
              </Button>
            ) : null}
          </div>
        </Card>

        {/* Appearance */}
        <Card glass className="relative overflow-hidden p-6 lg:col-span-5 lg:p-8">
          <div className="pointer-events-none absolute -left-8 bottom-0 h-32 w-32 rounded-full bg-nexus-accent/[0.06] blur-3xl" />
          <div className="relative border-b border-white/[0.06] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent">Surface</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/60">
                <Palette className="h-[18px] w-[18px] text-neutral-300" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Appearance</h2>
                <p className="mt-1 text-xs text-neutral-500">Lattice dark is the only theme for now — tuned for panels and focus.</p>
              </div>
            </div>
          </div>
          <div className="relative mt-4 space-y-3">
            <div className="rounded-xl border border-nexus-accent/20 bg-nexus-accent/[0.06] px-4 py-3 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-nexus-accent" strokeWidth={2} />
                <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-nexus-accent">Active theme</span>
              </div>
              <p className="mt-2 text-[13px] font-medium text-neutral-200">Lattice dark</p>
              <p className="mt-1 text-[11px] leading-relaxed text-neutral-500">
                Lime accent on charcoal — matches Overview cards and sidebar.
              </p>
            </div>
          </div>
        </Card>

        {/* Custom categories */}
        <Card glass className="relative overflow-hidden p-6 lg:col-span-7 lg:p-8">
          <div className="pointer-events-none absolute right-0 top-8 h-24 w-24 rounded-full bg-violet-500/[0.06] blur-2xl" />
          <div className="relative border-b border-white/[0.06] pb-4">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent/90">Workspace</p>
            <div className="mt-2 flex items-start gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-white/[0.08] bg-nexus-void/60">
                <Tags className="h-[18px] w-[18px] text-violet-300/90" strokeWidth={1.75} />
              </span>
              <div>
                <h2 className="font-display text-lg font-semibold text-white">Your categories</h2>
                <p className="mt-1 text-xs text-neutral-500">
                  Extra labels for tasks and goals appear as chips everywhere. Stored in this browser only.
                </p>
              </div>
            </div>
          </div>
          <div className="relative mt-4 space-y-4">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <div className="min-w-0 flex-1 space-y-1.5">
                <label htmlFor={`${baseId}-new-cat`} className="font-mono text-[10px] uppercase text-neutral-500">
                  New category
                </label>
                <input
                  id={`${baseId}-new-cat`}
                  type="text"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleAddCustomCategory();
                    }
                  }}
                  placeholder="e.g. Side project"
                  className="w-full rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-2.5 text-sm text-white placeholder:text-neutral-600"
                  maxLength={48}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="shrink-0 gap-2 rounded-lg px-4"
                onClick={handleAddCustomCategory}
              >
                <Plus className="h-4 w-4" strokeWidth={2} />
                Add
              </Button>
            </div>
            {categoryMsg ? (
              <p className="rounded-lg border border-amber-500/25 bg-amber-500/[0.06] px-3 py-2 text-xs text-amber-200/95">
                {categoryMsg}
              </p>
            ) : null}
            {customCategories.length === 0 ? (
              <p className="text-xs text-neutral-600">No custom categories yet — add one above.</p>
            ) : (
              <ul className="space-y-2">
                {customCategories.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between gap-3 rounded-lg border border-white/[0.06] bg-nexus-void/40 px-3 py-2.5"
                  >
                    <span className="min-w-0 truncate text-[13px] text-neutral-200">{c.label}</span>
                    <button
                      type="button"
                      aria-label={`Remove category ${c.label}`}
                      className="shrink-0 rounded-lg p-1.5 text-neutral-500 transition hover:bg-red-500/15 hover:text-red-300"
                      onClick={() => removeCustomCategory(c.id)}
                    >
                      <Trash2 className="h-4 w-4" strokeWidth={1.75} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        {/* Security — 2FA */}
        <Card glass className="relative overflow-hidden p-6 lg:col-span-7 lg:p-8">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-nexus-accent/25 bg-nexus-accent/[0.1]">
                <Shield className="h-5 w-5 text-nexus-accent" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-nexus-accent/90">Security</p>
                <h2 className="font-display mt-1 text-lg font-semibold text-white">Two-factor authentication</h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-500">
                  Use an authenticator app (TOTP). When enabled, sign-in requires your password and a 6-digit code.
                </p>
                {user?.twoFactorEnabled ? (
                  <p className="mt-2 font-mono text-[11px] text-emerald-400/90">2FA is active on this account.</p>
                ) : (
                  <p className="mt-2 font-mono text-[11px] text-neutral-600">2FA is not enabled.</p>
                )}
              </div>
            </div>
          </div>

          {twoFaMsg ? (
            <p className="mt-4 rounded-lg border border-white/[0.08] bg-nexus-void/50 px-3 py-2 text-xs text-neutral-300">
              {twoFaMsg}
            </p>
          ) : null}

          {!user?.twoFactorEnabled ? (
            <div className="mt-6 space-y-4">
              {!twoFaSetup ? (
                <Button
                  type="button"
                  variant="secondary"
                  className="gap-2 rounded-lg"
                  disabled={twoFaBusy}
                  onClick={() => void startTotpSetup()}
                >
                  {twoFaBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  Start setup
                </Button>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <img
                      src={twoFaSetup.qrDataUrl}
                      alt="Authenticator QR code"
                      className="h-44 w-44 shrink-0 rounded-xl border border-white/[0.08] bg-white p-2"
                    />
                    <div className="min-w-0 flex-1 space-y-2">
                      <p className="text-xs text-neutral-500">
                        Scan with your app, or enter the secret manually:
                      </p>
                      <code className="block break-all rounded-lg border border-white/[0.08] bg-nexus-void/80 px-3 py-2 font-mono text-[11px] text-neutral-300">
                        {twoFaSetup.secret}
                      </code>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label htmlFor={`${baseId}-totp-enroll`} className="font-mono text-[10px] uppercase text-neutral-500">
                      Code from app
                    </label>
                    <input
                      id={`${baseId}-totp-enroll`}
                      type="text"
                      inputMode="numeric"
                      autoComplete="one-time-code"
                      value={enrollCode}
                      onChange={(e) => setEnrollCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                      placeholder="000000"
                      className="w-full max-w-xs rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-2.5 font-mono text-lg tracking-[0.25em] text-white"
                      maxLength={6}
                    />
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="primary"
                      className="rounded-lg"
                      disabled={twoFaBusy || enrollCode.length < 6}
                      onClick={() => void confirmTotpEnable()}
                    >
                      Confirm &amp; enable
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      className="rounded-lg"
                      onClick={() => {
                        setTwoFaSetup(null);
                        setEnrollCode('');
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="mt-6 space-y-3">
              <div className="space-y-1.5">
                <label htmlFor={`${baseId}-totp-disable`} className="font-mono text-[10px] uppercase text-neutral-500">
                  Code to turn off 2FA
                </label>
                <input
                  id={`${baseId}-totp-disable`}
                  type="text"
                  inputMode="numeric"
                  value={disableCode}
                  onChange={(e) => setDisableCode(e.target.value.replace(/[^\d]/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="w-full max-w-xs rounded-lg border border-white/[0.08] bg-nexus-void/90 px-4 py-2.5 font-mono text-lg tracking-[0.25em] text-white"
                  maxLength={6}
                />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="rounded-lg border-red-500/20 text-red-200 hover:border-red-500/35 hover:bg-red-500/10"
                disabled={twoFaBusy || disableCode.length < 6}
                onClick={() => void confirmTotpDisable()}
              >
                Disable 2FA
              </Button>
            </div>
          )}
        </Card>

        {/* Session */}
        <Card
          glass
          className="relative overflow-hidden border-red-500/15 bg-red-950/[0.12] p-6 lg:col-span-7 lg:p-8"
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_100%_0%,rgba(239,68,68,0.08),transparent_55%)]" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between sm:gap-8">
            <div className="flex gap-4">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-red-500/25 bg-red-500/[0.12]">
                <LogOut className="h-5 w-5 text-red-300/95" strokeWidth={1.75} />
              </span>
              <div>
                <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-red-400/80">Session</p>
                <h2 className="font-display mt-1 text-lg font-semibold text-white">Sign out</h2>
                <p className="mt-2 max-w-md text-xs leading-relaxed text-neutral-500">
                  Ends this account session on this device. Tasks and goals in local storage stay in the browser until you
                  clear them.
                </p>
              </div>
            </div>
            <div className="flex shrink-0 flex-col gap-2 sm:items-end">
              <Button
                variant="secondary"
                className="gap-2 rounded-lg border-white/[0.12] bg-nexus-void/60 text-neutral-200 hover:border-white/[0.2]"
                onClick={async () => {
                  try {
                    await logoutAllDevices();
                    navigate('/auth', { replace: true });
                  } catch {
                    /* toast optional */
                  }
                }}
              >
                Sign out everywhere
              </Button>
              <Button
                variant="secondary"
                className="gap-2 rounded-lg border-red-500/25 bg-red-500/[0.15] text-red-100 hover:border-red-500/40 hover:bg-red-500/[0.22] focus:ring-red-500/40"
                onClick={async () => {
                  await signOut();
                  navigate('/', { replace: true });
                }}
              >
                <LogOut className="h-4 w-4" strokeWidth={1.75} />
                Sign out
              </Button>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
