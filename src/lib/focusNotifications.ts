import { loadSettings } from './appSettings';

const NOTIFICATION_TAG = 'lattice-focus-session';

/** Whether the Browser Notifications API is available (requires secure context in production). */
export function focusNotificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export function getFocusNotificationPermission(): NotificationPermission | 'unsupported' {
  if (!focusNotificationsSupported()) return 'unsupported';
  return Notification.permission;
}

/**
 * Ask the user for permission to show focus-end alerts. Call from Settings when enabling reminders.
 * Returns final permission state.
 */
export async function requestFocusNotificationPermission(): Promise<NotificationPermission | 'unsupported'> {
  if (!focusNotificationsSupported()) return 'unsupported';
  if (Notification.permission === 'granted') return 'granted';
  if (Notification.permission === 'denied') return 'denied';
  try {
    return await Notification.requestPermission();
  } catch {
    return 'denied';
  }
}

/**
 * Show a desktop notification when a work or break interval completes (timer hits zero).
 * Respects `focusEndNotifications` in local settings and requires `granted` permission.
 */
export function showFocusSessionEndNotification(phase: 'work' | 'break'): void {
  if (!focusNotificationsSupported()) return;
  const settings = loadSettings();
  if (!settings.focusEndNotifications) return;
  if (Notification.permission !== 'granted') return;

  const title = phase === 'work' ? 'Focus block finished' : 'Break finished';
  const body =
    phase === 'work'
      ? 'Time for a short break — or start another focus block when you’re ready.'
      : 'Break is over. Start another focus session or take more time.';

  try {
    new Notification(title, {
      body,
      tag: NOTIFICATION_TAG,
      renotify: true,
    });
  } catch {
    /* ignore — e.g. quota or policy */
  }
}

/** Optional: quick test from Settings to verify permission and copy. */
export function showTestFocusNotification(): void {
  if (!focusNotificationsSupported() || Notification.permission !== 'granted') return;
  try {
    new Notification('Lattice — test', {
      body: 'Focus reminders are enabled. You’ll see a message when each timer ends.',
      tag: `${NOTIFICATION_TAG}-test`,
    });
  } catch {
    /* ignore */
  }
}
