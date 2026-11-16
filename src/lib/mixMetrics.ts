import type { Mix, RotationCard } from '../api/types';

export type MixMetrics = { avg: number; worst: number; maxWater: number };

/**
 * Average-year profit, worst 1-in-5 years, and highest-year water for any mix,
 * from each rotation's yearly series (the same math as the optimizer). Null when
 * the rotation cards carry no yearly series.
 */
export function mixMetrics(mix: Mix, rotations: RotationCard[]): MixMetrics | null {
  const used = rotations.filter((r) => (mix[r.id] ?? 0) > 0);
  if (used.some((r) => !r.yearlyProfit || !r.yearlyWaterAf)) return null;
  const years = rotations.find((r) => r.yearlyProfit)?.yearlyProfit?.length ?? 0;
  if (years === 0) return null;
  const profit = Array<number>(years).fill(0);
  const water = Array<number>(years).fill(0);
  for (const r of used) {
    const sh = mix[r.id] ?? 0;
    for (let t = 0; t < years; t++) {
      profit[t] += sh * r.yearlyProfit![t];
      water[t] += sh * r.yearlyWaterAf![t];
    }
  }
  const k = Math.max(1, Math.round(years * 0.2));
  const worst = [...profit].sort((a, b) => a - b).slice(0, k);
  return {
    avg: profit.reduce((s, x) => s + x, 0) / years,
    worst: worst.reduce((s, x) => s + x, 0) / k,
    maxWater: Math.max(...water),
  };
}
