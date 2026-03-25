/** Shared taxonomy for goals and tasks (stored as `category` in local storage). */
export const LATTICE_CATEGORIES = [
  { id: 'work', label: 'Work' },
  { id: 'personal', label: 'Personal' },
  { id: 'health', label: 'Health' },
  { id: 'learning', label: 'Learning' },
  { id: 'finance', label: 'Finance' },
  { id: 'other', label: 'Other' },
] as const;

export type LatticeCategoryId = (typeof LATTICE_CATEGORIES)[number]['id'];

export type CategoryOption = { id: string; label: string };

export const DEFAULT_CATEGORY: LatticeCategoryId = 'other';

const CUSTOM_KEY = 'lattice_custom_categories_v1';

export const LATTICE_CATEGORIES_CHANGED = 'lattice-categories-changed';

function builtInList(): CategoryOption[] {
  return LATTICE_CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
}

export function loadCustomCategories(): CategoryOption[] {
  try {
    const raw = localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw) as unknown;
    if (!Array.isArray(p)) return [];
    return p.filter(
      (x): x is CategoryOption =>
        Boolean(x) &&
        typeof x === 'object' &&
        typeof (x as CategoryOption).id === 'string' &&
        typeof (x as CategoryOption).label === 'string',
    );
  } catch {
    return [];
  }
}

export function saveCustomCategories(categories: CategoryOption[]) {
  try {
    localStorage.setItem(CUSTOM_KEY, JSON.stringify(categories));
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(LATTICE_CATEGORIES_CHANGED));
}

export function getAllCategories(): CategoryOption[] {
  const built = builtInList();
  const custom = loadCustomCategories();
  const builtIds = new Set(built.map((c) => c.id));
  return [...built, ...custom.filter((c) => !builtIds.has(c.id))];
}

export function addCustomCategory(
  label: string,
): { ok: true; id: string } | { ok: false; reason: string } {
  const trimmed = label.trim();
  if (trimmed.length < 1) return { ok: false, reason: 'Enter a category name.' };
  if (trimmed.length > 48) return { ok: false, reason: 'Name is too long (max 48 characters).' };
  const slug =
    'custom_' +
    trimmed
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '_')
      .replace(/[^a-z0-9_]/g, '')
      .slice(0, 40);
  const baseId = slug.length > 'custom_'.length ? slug : `custom_${crypto.randomUUID().slice(0, 8)}`;
  let id = baseId;
  const existing = new Set(getAllCategories().map((c) => c.id));
  if (existing.has(id)) {
    id = `${baseId}_${crypto.randomUUID().slice(0, 6)}`;
  }
  const next = [...loadCustomCategories(), { id, label: trimmed }];
  saveCustomCategories(next);
  return { ok: true, id };
}

export function removeCustomCategory(id: string) {
  const next = loadCustomCategories().filter((c) => c.id !== id);
  saveCustomCategories(next);
}

export function isBuiltInCategoryId(id: string): boolean {
  return LATTICE_CATEGORIES.some((c) => c.id === id);
}

export function getCategoryLabel(id: string | null | undefined): string {
  if (!id) return 'Other';
  const found = getAllCategories().find((c) => c.id === id);
  if (found) return found.label;
  return id.replace(/^custom_/, '').replace(/_/g, ' ');
}
