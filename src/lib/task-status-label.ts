import type { Database } from '../types/database';

type TaskStatus = Database['public']['Tables']['tasks']['Row']['status'];

/** Consistent, product-style labels for task statuses (UI only). */
export function taskStatusLabel(status: TaskStatus): string {
  const map: Record<TaskStatus, string> = {
    pending: 'Queued',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    waiting_approval: 'Awaiting approval',
    cancelled: 'Cancelled',
  };
  return map[status];
}

type StepStatus = Database['public']['Tables']['task_steps']['Row']['status'];

export function stepStatusLabel(status: StepStatus): string {
  const map: Record<StepStatus, string> = {
    pending: 'Pending',
    running: 'Running',
    completed: 'Completed',
    failed: 'Failed',
    skipped: 'Skipped',
  };
  return map[status];
}

type TaskMode = Database['public']['Tables']['tasks']['Row']['mode'];

export function taskModeLabel(mode: TaskMode): string {
  const map: Record<TaskMode, string> = {
    human_in_loop: 'Human in the loop',
    autonomous: 'Autonomous',
  };
  return map[mode];
}
