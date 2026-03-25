import { useEffect, useState } from 'react';
import { getAllCategories, LATTICE_CATEGORIES_CHANGED } from '../../constants/categories';

const selectClass =
  'w-full rounded-xl border border-white/[0.08] bg-nexus-void/90 px-4 py-3 text-[15px] text-white transition focus:border-nexus-accent/40 focus:outline-none focus:ring-1 focus:ring-nexus-accent/50 cursor-pointer appearance-none bg-[length:1rem] bg-[right_0.75rem_center] bg-no-repeat pr-10';

const chevronBg = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%238a8a8f'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'/%3E%3C/svg%3E")`;

type CategorySelectProps = {
  id: string;
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export function CategorySelect({ id, value, onChange, className = '' }: CategorySelectProps) {
  const [categories, setCategories] = useState(() => getAllCategories());

  useEffect(() => {
    const sync = () => setCategories(getAllCategories());
    sync();
    window.addEventListener(LATTICE_CATEGORIES_CHANGED, sync);
    return () => window.removeEventListener(LATTICE_CATEGORIES_CHANGED, sync);
  }, []);

  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className={`${selectClass} ${className}`}
      style={{ backgroundImage: chevronBg }}
    >
      {value && !categories.some((c) => c.id === value) ? (
        <option value={value}>{value}</option>
      ) : null}
      {categories.map((c) => (
        <option key={c.id} value={c.id}>
          {c.label}
        </option>
      ))}
    </select>
  );
}
