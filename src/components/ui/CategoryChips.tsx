import { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import {
  addCustomCategory,
  getAllCategories,
  LATTICE_CATEGORIES_CHANGED,
} from '../../constants/categories';

export type CategoryChipsProps = {
  value: string;
  onChange: (categoryId: string) => void;
  /** First chip resets to `all` (task list filter). */
  includeAll?: boolean;
  /** For `aria-labelledby` when a visible label sits above the chips. */
  labelledBy?: string;
  className?: string;
  /**
   * Inline “new category” control (name + add). On by default so creation is visible next to chips.
   * Turn off for ultra-compact UIs.
   */
  showAddCategory?: boolean;
};

const chipBase =
  'rounded-md border px-2.5 py-1 font-mono text-[11px] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-nexus-accent/60';

const addInputClass =
  'min-w-0 flex-1 rounded-lg border border-white/[0.1] bg-nexus-void/90 px-3 py-2 font-mono text-[12px] text-white placeholder:text-neutral-600 transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/45';

export function CategoryChips({
  value,
  onChange,
  includeAll = false,
  labelledBy,
  className = '',
  showAddCategory = true,
}: CategoryChipsProps) {
  const [categories, setCategories] = useState(() => getAllCategories());
  const [addOpen, setAddOpen] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [addBusy, setAddBusy] = useState(false);
  const [addError, setAddError] = useState('');

  useEffect(() => {
    const sync = () => setCategories(getAllCategories());
    sync();
    window.addEventListener(LATTICE_CATEGORIES_CHANGED, sync);
    return () => window.removeEventListener(LATTICE_CATEGORIES_CHANGED, sync);
  }, []);

  const submitNewCategory = () => {
    setAddError('');
    setAddBusy(true);
    try {
      const result = addCustomCategory(newLabel);
      if (!result.ok) {
        setAddError(result.reason);
        return;
      }
      setNewLabel('');
      setAddOpen(false);
      onChange(result.id);
    } finally {
      setAddBusy(false);
    }
  };

  return (
    <div className={`space-y-2.5 ${className}`}>
      <div
        role="group"
        aria-labelledby={labelledBy}
        aria-label={labelledBy ? undefined : includeAll ? 'Filter by category' : 'Choose category'}
        className="flex flex-wrap items-center gap-1.5"
      >
        {includeAll ? (
          <button
            type="button"
            onClick={() => onChange('all')}
            className={`${chipBase} ${
              value === 'all'
                ? 'border-nexus-accent/45 bg-nexus-accent/15 text-white'
                : 'border-white/[0.08] bg-nexus-void/50 text-neutral-400 hover:border-white/[0.14] hover:text-neutral-300'
            }`}
          >
            All
          </button>
        ) : null}
        {categories.map((c) => {
          const selected = value === c.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`${chipBase} ${
                selected
                  ? 'border-nexus-accent/45 bg-nexus-accent/15 text-white'
                  : 'border-white/[0.08] bg-nexus-void/50 text-neutral-400 hover:border-white/[0.14] hover:text-neutral-300'
              }`}
            >
              {c.label}
            </button>
          );
        })}
        {showAddCategory ? (
          <button
            type="button"
            onClick={() => {
              setAddError('');
              setAddOpen((o) => !o);
            }}
            className={`inline-flex items-center gap-1 ${chipBase} border-dashed border-nexus-accent/45 bg-nexus-accent/[0.06] text-nexus-accent hover:border-nexus-accent/65 hover:bg-nexus-accent/10`}
          >
            <Plus className="h-3 w-3 shrink-0 opacity-90" strokeWidth={2} />
            New category
          </button>
        ) : null}
      </div>

      {showAddCategory && addOpen ? (
        <div className="rounded-lg border border-nexus-accent/20 bg-nexus-accent/[0.04] p-3 sm:p-3.5">
          <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.14em] text-nexus-accent/80">
            Add a category
          </p>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <input
              type="text"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  submitNewCategory();
                }
              }}
              placeholder="Name (e.g. Side project)"
              maxLength={48}
              disabled={addBusy}
              className={addInputClass}
              autoComplete="off"
              aria-label="New category name"
            />
            <div className="flex shrink-0 flex-wrap gap-2">
              <button
                type="button"
                disabled={addBusy || !newLabel.trim()}
                onClick={() => submitNewCategory()}
                className="rounded-lg bg-nexus-accent px-3 py-2 font-mono text-[11px] font-semibold uppercase tracking-[0.08em] text-nexus-void transition enabled:hover:bg-[#d4f76f] disabled:cursor-not-allowed disabled:opacity-40"
              >
                Save
              </button>
              <button
                type="button"
                disabled={addBusy}
                onClick={() => {
                  setAddOpen(false);
                  setAddError('');
                  setNewLabel('');
                }}
                className="rounded-lg border border-white/[0.1] px-3 py-2 font-mono text-[11px] text-neutral-400 transition hover:border-white/[0.18] hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
          {addError ? (
            <p className="mt-2 text-[11px] text-amber-200/95" role="alert">
              {addError}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
