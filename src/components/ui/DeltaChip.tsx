import { ArrowDown, ArrowUp, Minus } from 'lucide-react';

/**
 * Change vs. the current plan. Arrow icon + sign + color, so color is never the
 * only cue. `goodWhen` says which direction is good for this metric.
 */
export function DeltaChip({ value, text, goodWhen = 'up', label }: { value: number; text: string; goodWhen?: 'up' | 'down'; label: string }) {
  const flat = Math.abs(value) < 0.5;
  const good = flat ? null : goodWhen === 'up' ? value > 0 : value < 0;
  const Icon = flat ? Minus : value > 0 ? ArrowUp : ArrowDown;
  const tone = good === null ? 'bg-bg text-text-muted ring-border' : good ? 'bg-secondary-tint text-secondary ring-secondary/25' : 'bg-danger-tint text-danger ring-danger/25';
  return (
    <span className={`tnum inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-sm font-semibold ring-1 ring-inset ${tone}`}>
      <Icon aria-hidden="true" className="h-3.5 w-3.5" strokeWidth={2.5} />
      <span>{text}</span>
      <span className="sr-only">{label}</span>
    </span>
  );
}
