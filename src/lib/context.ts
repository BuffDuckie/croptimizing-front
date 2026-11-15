import type { PlanResponse } from '../api/types';

type Ctx = PlanResponse['context'];

/** Drop in groundwater storage from the first to the last year's mean (cm), or null without data. */
export function graceDropCm(series: Ctx['graceTwsCm']): { cm: number; from: number; to: number } | null {
  const byYear = new Map<number, number[]>();
  for (const p of series) {
    const y = Number(p.date.slice(0, 4));
    byYear.set(y, [...(byYear.get(y) ?? []), p.value]);
  }
  const years = [...byYear.keys()].sort((a, b) => a - b);
  if (years.length < 2) return null;
  const m = (y: number) => {
    const v = byYear.get(y) ?? [];
    return v.reduce((s, x) => s + x, 0) / v.length;
  };
  return { cm: m(years[0]) - m(years[years.length - 1]), from: years[0], to: years[years.length - 1] };
}

/** Largest gap between modeled and satellite crop water use, in percent of the satellite value. */
export function etMaxGapPct(rows: Ctx['etCheck']): number | null {
  const ok = rows.filter((r) => r.satelliteMm > 0);
  if (ok.length === 0) return null;
  return Math.max(...ok.map((r) => (Math.abs(r.modeledMm - r.satelliteMm) / r.satelliteMm) * 100));
}
