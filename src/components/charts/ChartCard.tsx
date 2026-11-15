import type { ReactNode } from 'react';
import { HowToRead } from '../ui/InfoTip';

/**
 * Every chart: a title that states the finding, units on the axes, a
 * "How to read this" tip, and a visually hidden table for screen readers.
 */
export function ChartCard({
  title,
  subtitle,
  howTo,
  children,
  table,
  footer,
  className = '',
  headingLevel = 2,
}: {
  title: string;
  subtitle?: ReactNode;
  howTo?: ReactNode;
  children: ReactNode;
  table?: ReactNode;
  footer?: ReactNode;
  className?: string;
  headingLevel?: 2 | 3;
}) {
  const H = headingLevel === 2 ? 'h2' : 'h3';
  return (
    <section className={`card ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <H className="text-xl font-semibold leading-snug">{title}</H>
          {subtitle && <div className="mt-1 text-base text-text-muted">{subtitle}</div>}
        </div>
        {howTo && (
          <div className="-mr-2 -mt-2 shrink-0">
            <HowToRead>{howTo}</HowToRead>
          </div>
        )}
      </div>
      <div className="mt-5">{children}</div>
      {table && <div className="sr-only">{table}</div>}
      {footer && <div className="mt-4 border-t border-border-soft pt-3">{footer}</div>}
    </section>
  );
}

/** Plain data table (visually hidden inside charts, visible inside "Show the math"). */
export function DataTable({ caption, head, rows, className = '' }: { caption: string; head: string[]; rows: (string | number)[][]; className?: string }) {
  return (
    <table className={`w-full border-collapse text-left text-sm ${className}`}>
      <caption className="mb-2 text-left font-semibold text-text">{caption}</caption>
      <thead>
        <tr className="border-b border-border">
          {head.map((h, i) => (
            <th key={h} scope="col" className={`py-2 pr-4 font-semibold text-text-muted ${i > 0 ? 'text-right' : ''}`}>
              {h}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} className="border-b border-border-soft last:border-0">
            {r.map((c, j) =>
              j === 0 ? (
                <th key={j} scope="row" className="py-2 pr-4 font-medium text-text">
                  {c}
                </th>
              ) : (
                <td key={j} className="tnum py-2 pr-4 text-right text-text">
                  {c}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
