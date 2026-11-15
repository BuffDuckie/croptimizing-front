import type { ReactNode } from 'react';
import { InfoTip, type GlossaryKey } from '../ui/InfoTip';

/** Big number, unit, delta chip, and a line about the current plan. */
export function MetricCard({
  label,
  value,
  unit,
  delta,
  sub,
  tone = 'money',
  term,
  info,
  children,
}: {
  label: string;
  value: string;
  unit?: string;
  delta?: ReactNode;
  sub?: ReactNode;
  tone?: 'money' | 'water' | 'soil';
  term?: GlossaryKey;
  /** Replaces the glossary tip with a custom info button. */
  info?: ReactNode;
  children?: ReactNode;
}) {
  const color = tone === 'water' ? 'text-accent-strong' : tone === 'soil' ? 'text-secondary' : 'text-primary';
  const bar = tone === 'water' ? 'bg-accent' : tone === 'soil' ? 'bg-secondary' : 'bg-primary';
  return (
    <div className="card relative flex flex-col overflow-hidden">
      <span aria-hidden="true" className={`absolute inset-x-0 top-0 h-1 ${bar}`} />
      <div className="flex items-center gap-1">
        <h3 className="text-base font-semibold text-text">{label}</h3>
        {info ?? (term && <InfoTip term={term} />)}
      </div>
      <p className={`mt-2 flex items-baseline gap-1.5 ${color}`}>
        <span className="metric-value tnum text-metric font-semibold">{value}</span>
        {unit && <span className="text-base font-medium text-text-muted">{unit}</span>}
      </p>
      {delta && <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">{delta}</div>}
      {children && <div className="mt-4">{children}</div>}
      {sub && <p className="mt-auto pt-3 text-sm text-text-muted">{sub}</p>}
    </div>
  );
}
