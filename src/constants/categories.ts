/** Shared taxonomy for goals and tasks (stored as `category` in Supabase). */
export const LATTICE_CATEGORIES = [
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'health', label: 'Health' },
  { id: 'learning', label: 'Learning' },
  { id: 'finance', label: 'Finance' },
  { id: 'other', label: 'Other' },
] as const;

export type LatticeCategoryId = (typeof LATTICE_CATEGORIES)[number]['id'];

export const DEFAULT_CATEGORY: LatticeCategoryId = 'other';

export function getCategoryLabel(id: string | null | undefined): string {
  const found = LATTICE_CATEGORIES.find((c) => c.id === id);
  return found?.label ?? 'Other';
}
