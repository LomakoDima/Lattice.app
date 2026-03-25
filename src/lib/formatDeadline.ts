function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * One-line schedule for task lists: "Today, 14:30" / "Tomorrow, 23:16" / "Mar 26, 18:00".
 * Uses local timezone. Pass `deadline ?? created_at` when a fallback is needed.
 */
export function formatTaskDeadlineLine(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    const t = new Date(iso);
    if (Number.isNaN(t.getTime())) return null;

    const today = startOfLocalDay(new Date());
    const day = startOfLocalDay(t);
    const diffDays = Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));

    const timePart = t.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });

    if (diffDays === 0) return `Today, ${timePart}`;
    if (diffDays === 1) return `Tomorrow, ${timePart}`;
    if (diffDays === -1) return `Yesterday, ${timePart}`;

    return `${t.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, ${timePart}`;
  } catch {
    return null;
  }
}

/** Format ISO deadline for UI (local timezone). */
export function formatTaskDeadline(iso: string | null | undefined): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return null;
  }
}

export type TaskTimeBucket = 'none' | 'past' | 'today' | 'future';

/** Classify by deadline calendar day in local time (no deadline → `none`). */
export function getTaskDeadlineTimeBucket(deadlineIso: string | null | undefined): TaskTimeBucket {
  if (!deadlineIso) return 'none';
  const t = new Date(deadlineIso);
  if (Number.isNaN(t.getTime())) return 'none';
  const today = startOfLocalDay(new Date());
  const day = startOfLocalDay(t);
  const diffDays = Math.round((day.getTime() - today.getTime()) / (24 * 60 * 60 * 1000));
  if (diffDays < 0) return 'past';
  if (diffDays === 0) return 'today';
  return 'future';
}

const OPEN_TASK_STATUSES = new Set(['pending', 'running', 'waiting_approval']);

/** Open task whose deadline is already in the past (local clock). */
export function isOpenTaskOverdue(task: { deadline: string | null; status: string }): boolean {
  if (!task.deadline || !OPEN_TASK_STATUSES.has(task.status)) return false;
  const t = new Date(task.deadline);
  if (Number.isNaN(t.getTime())) return false;
  return t.getTime() < Date.now();
}

const BUCKET_ORDER: Record<TaskTimeBucket, number> = { past: 0, today: 1, future: 2, none: 3 };

function deadlineMs(iso: string | null | undefined): number {
  if (!iso) return Number.POSITIVE_INFINITY;
  const t = new Date(iso);
  return Number.isNaN(t.getTime()) ? Number.POSITIVE_INFINITY : t.getTime();
}

/** Sort: Past → Today → Future → no date; within bucket by deadline time. */
export function compareTasksBySchedule<T extends { deadline: string | null; created_at: string }>(a: T, b: T): number {
  const ba = getTaskDeadlineTimeBucket(a.deadline);
  const bb = getTaskDeadlineTimeBucket(b.deadline);
  if (BUCKET_ORDER[ba] !== BUCKET_ORDER[bb]) return BUCKET_ORDER[ba] - BUCKET_ORDER[bb];
  if (ba === 'past') return deadlineMs(a.deadline) - deadlineMs(b.deadline);
  if (ba === 'today' || ba === 'future') return deadlineMs(a.deadline) - deadlineMs(b.deadline);
  return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
}
