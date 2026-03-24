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
