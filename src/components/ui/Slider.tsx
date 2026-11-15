import { useId, type ReactNode } from 'react';

type Props = {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  /** What a screen reader says, in words. */
  valueText: string;
  /** Visible value (big). */
  display: ReactNode;
  unit?: string;
  minLabel?: string;
  maxLabel?: string;
  info?: ReactNode;
  tone?: 'money' | 'water' | 'soil';
  hint?: string;
};

const TONE: Record<NonNullable<Props['tone']>, { tint: string; text: string }> = {
  money: { tint: 'var(--c-primary)', text: 'text-primary' },
  water: { tint: 'var(--c-accent-strong)', text: 'text-accent-strong' },
  soil: { tint: 'var(--c-secondary)', text: 'text-secondary' },
};

/** Native range input with a visible numeric value and words for assistive tech. */
export function Slider({ label, value, min, max, step, onChange, valueText, display, unit, minLabel, maxLabel, info, tone = 'money', hint }: Props) {
  const id = useId();
  const fill = ((value - min) / (max - min)) * 100;
  const t = TONE[tone];
  return (
    <div className="space-y-1">
      <div className="flex items-end justify-between gap-3">
        <div className="flex items-center gap-1">
          <label htmlFor={id} className="text-base font-semibold text-text">
            {label}
          </label>
          {info}
        </div>
        <output htmlFor={id} className={`tnum text-2xl font-semibold tracking-tight ${t.text}`} aria-hidden="true">
          {display}
          {unit && <span className="ml-1 text-sm font-medium text-text-muted">{unit}</span>}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={valueText}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{ ['--fill' as string]: `${fill}%`, ['--tint' as string]: t.tint }}
      />
      {(minLabel || maxLabel) && (
        <div className="flex justify-between text-sm text-text-muted" aria-hidden="true">
          <span>{minLabel}</span>
          <span>{maxLabel}</span>
        </div>
      )}
      {hint && <p className="text-sm text-text-muted">{hint}</p>}
    </div>
  );
}
