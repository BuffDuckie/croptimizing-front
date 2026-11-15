import type { ReactNode } from 'react';

/**
 * A row of toggle buttons where exactly one is on (views, goals). Wraps to two
 * columns on phones when there are more than two options. aria-pressed carries
 * the state, so color is never the only cue (the active one is also bold, filled).
 */
export function Segmented<T extends string>({
  options,
  value,
  onChange,
  label,
  className = '',
}: {
  options: { value: T; label: ReactNode }[];
  value: T;
  onChange: (v: T) => void;
  label: string;
  className?: string;
}) {
  const cols = options.length === 3 ? 'grid-cols-2 sm:grid-cols-3' : options.length >= 4 ? 'grid-cols-2 sm:grid-cols-4' : 'grid-cols-2';
  return (
    <div role="group" aria-label={label} className={`grid gap-1 rounded-ctl bg-bg p-1 ring-1 ring-inset ring-border-soft ${cols} ${className}`}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            aria-pressed={on}
            onClick={() => onChange(o.value)}
            className={`min-h-[44px] rounded-[6px] px-3 py-1.5 text-base leading-tight transition-colors duration-fast ${
              on ? 'bg-primary font-semibold text-white shadow-sm' : 'font-medium text-text hover:bg-surface'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
