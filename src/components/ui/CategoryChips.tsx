import { LATTICE_CATEGORIES } from '../../constants/categories';

export type CategoryChipsProps = {
  value: string;
  onChange: (categoryId: string) => void;
  /** First chip resets to `all` (task list filter). */
  includeAll?: boolean;
  /** For `aria-labelledby` when a visible label sits above the chips. */
  labelledBy?: string;
  className?: string;
};

const chipBase =
  'rounded-md border px-2.5 py-1 font-mono text-[11px] transition focus:outline-none focus-visible:ring-1 focus-visible:ring-nexus-accent/60';

export function CategoryChips({ value, onChange, includeAll = false, labelledBy, className = '' }: CategoryChipsProps) {
  return (
    <div
      role="group"
      aria-labelledby={labelledBy}
      aria-label={labelledBy ? undefined : includeAll ? 'Filter by category' : 'Choose category'}
      className={`flex flex-wrap items-center gap-1.5 ${className}`}
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
      {LATTICE_CATEGORIES.map((c) => {
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
    </div>
  );
}
