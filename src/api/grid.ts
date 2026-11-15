// Grid used by static mode. scripts/export-sample.ts writes one file per point,
// and the client rounds each request to the nearest point.

export const STATIC_GRID = {
  // 0.6 to 6.0 in steps of 0.3 (includes the 2.4 default).
  water: Array.from({ length: 19 }, (_, i) => Math.round((0.6 + i * 0.3) * 10) / 10),
  // Slider units 0 to 100 (risk is sent to the model as 0 to 1).
  risk: [0, 20, 40, 60, 80, 100],
  soil: [0, 15, 30, 45, 60, 75, 90],
} as const;

export function nearest(values: readonly number[], x: number): number {
  return values.reduce((best, v) => (Math.abs(v - x) < Math.abs(best - x) ? v : best), values[0]);
}

export function staticPath(region: string, cap: number, risk100: number, soil: number): string {
  return `/results/${region}/w${cap.toFixed(1)}_r${Math.round(risk100)}_s${Math.round(soil)}.json`;
}
