/** Fired after local tasks/goals mutate (same tab). */
export const WORKSPACE_CHANGED = 'lattice-workspace-changed';

export function notifyWorkspaceChanged() {
  window.dispatchEvent(new CustomEvent(WORKSPACE_CHANGED));
}
