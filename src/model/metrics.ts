import type { Mix, RotationId } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { BASE_EFFICIENCY, getScenarioData, type ScenarioData } from './sampleData';

export const UNITS = 20; // 5% steps
const R = ROTATION_IDS.length;

/** Every mix of 5 rotations in 5% steps: C(24, 4) = 10,626 mixes. Memoized. */
let mixUnits: Uint8Array | null = null;
export function enumerateMixes(): Uint8Array {
  if (mixUnits) return mixUnits;
  const out: number[] = [];
  for (let a = 0; a <= UNITS; a++)
    for (let b = 0; b <= UNITS - a; b++)
      for (let c = 0; c <= UNITS - a - b; c++)
        for (let d = 0; d <= UNITS - a - b - c; d++) out.push(a, b, c, d, UNITS - a - b - c - d);
  mixUnits = Uint8Array.from(out);
  return mixUnits;
}
export function mixCount(): number {
  return enumerateMixes().length / R;
}

export function mixAt(k: number): Mix {
  const u = enumerateMixes();
  const mix: Mix = {};
  ROTATION_IDS.forEach((id, i) => {
    const units = u[k * R + i];
    if (units > 0) mix[id] = units / UNITS;
  });
  return mix;
}

export function shareVector(mix: Mix): number[] {
  return ROTATION_IDS.map((id) => mix[id] ?? 0);
}

type Base = { profit: Float64Array; water: Float64Array; soil: Float64Array; n: number; years: number };
let base: Base | null = null;

/** Yearly profit and applied water for every mix, at base efficiency, no extra water cost. */
export function getBaseMatrices(data: ScenarioData = getScenarioData()): Base {
  if (base) return base;
  const u = enumerateMixes();
  const n = u.length / R;
  const Y = data.years.length;
  const profit = new Float64Array(n * Y);
  const water = new Float64Array(n * Y);
  const soil = new Float64Array(n);
  const P = ROTATION_IDS.map((id) => data.profit[id]);
  const W = ROTATION_IDS.map((id) => data.water[id]);
  const S = ROTATION_IDS.map((id) => data.soil[id]);
  for (let k = 0; k < n; k++) {
    let s = 0;
    for (let i = 0; i < R; i++) s += (u[k * R + i] / UNITS) * S[i];
    soil[k] = s;
    for (let t = 0; t < Y; t++) {
      let p = 0;
      let w = 0;
      for (let i = 0; i < R; i++) {
        const sh = u[k * R + i] / UNITS;
        if (sh === 0) continue;
        p += sh * P[i][t];
        w += sh * W[i][t];
      }
      profit[k * Y + t] = p;
      water[k * Y + t] = w;
    }
  }
  base = { profit, water, soil, n, years: Y };
  return base;
}

/** Mean of the worst 20% of values (the lowest 4 of 20 years). Equals -CVaR at 80%. */
export function worstShareMean(values: ArrayLike<number>): number {
  const k = Math.max(1, Math.round(values.length * 0.2));
  const sorted = Array.from(values).sort((a, b) => a - b);
  let s = 0;
  for (let i = 0; i < k; i++) s += sorted[i];
  return s / k;
}

export function mean(values: ArrayLike<number>): number {
  let s = 0;
  for (let i = 0; i < values.length; i++) s += values[i];
  return s / values.length;
}

export type Adjust = { waterCostPerAf: number; efficiency: number };
export const DEFAULT_ADJUST: Adjust = { waterCostPerAf: 0, efficiency: BASE_EFFICIENCY };

/** Better irrigation needs less applied water for the same crop. */
export function waterScale(efficiency: number): number {
  return BASE_EFFICIENCY / efficiency;
}

export type MixStats = {
  avg: Float64Array;
  worst: Float64Array;
  maxWater: Float64Array;
  soil: Float64Array;
};

const statsCache = new Map<string, MixStats>();

/** Per-mix summary over a subset of years (all years by default). Memoized. */
export function getMixStats(adjust: Adjust = DEFAULT_ADJUST, yearIdx?: number[]): MixStats {
  const b = getBaseMatrices();
  const idx = yearIdx ?? Array.from({ length: b.years }, (_, i) => i);
  const key = `${adjust.waterCostPerAf}|${adjust.efficiency}|${idx.join(',')}`;
  const hit = statsCache.get(key);
  if (hit) return hit;

  const scale = waterScale(adjust.efficiency);
  const avg = new Float64Array(b.n);
  const worst = new Float64Array(b.n);
  const maxWater = new Float64Array(b.n);
  const buf = new Float64Array(idx.length);
  for (let k = 0; k < b.n; k++) {
    let mw = 0;
    for (let j = 0; j < idx.length; j++) {
      const t = idx[j];
      const w = b.water[k * b.years + t] * scale;
      buf[j] = b.profit[k * b.years + t] - adjust.waterCostPerAf * w;
      if (w > mw) mw = w;
    }
    avg[k] = mean(buf);
    worst[k] = worstShareMean(buf);
    maxWater[k] = mw;
  }
  const stats = { avg, worst, maxWater, soil: b.soil };
  if (statsCache.size > 24) statsCache.clear();
  statsCache.set(key, stats);
  return stats;
}

/** Yearly profit and water for any mix (need not be on the 5% grid). */
export function seriesForMix(mix: Mix, adjust: Adjust = DEFAULT_ADJUST, data: ScenarioData = getScenarioData()) {
  const shares = shareVector(mix);
  const scale = waterScale(adjust.efficiency);
  return data.years.map((year, t) => {
    let p = 0;
    let w = 0;
    ROTATION_IDS.forEach((id, i) => {
      p += shares[i] * data.profit[id][t];
      w += shares[i] * data.water[id][t] * scale;
    });
    return { year, profit: p - adjust.waterCostPerAf * w, water: w };
  });
}

export function soilForMix(mix: Mix, data: ScenarioData = getScenarioData()): number {
  return ROTATION_IDS.reduce((s, id) => s + (mix[id] ?? 0) * data.soil[id], 0);
}

export function correlation(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < a.length; i++) {
    num += (a[i] - ma) * (b[i] - mb);
    da += (a[i] - ma) ** 2;
    db += (b[i] - mb) ** 2;
  }
  const den = Math.sqrt(da * db);
  return den === 0 ? 0 : Math.max(-1, Math.min(1, num / den));
}

export function rotationIndex(id: RotationId): number {
  return ROTATION_IDS.indexOf(id);
}
