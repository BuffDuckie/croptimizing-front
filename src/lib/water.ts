/** Gallons in one acre-foot. */
export const GALLONS_PER_AF = 325_851;

/** Years whose water use is at or under the budget (rounded the way the screen shows it). */
export function yearsFit(water: readonly number[], budget: number): number {
  return water.filter((w) => w <= budget + 0.005).length;
}

export function meanOf(xs: readonly number[]): number {
  return xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0;
}

/** Large gallon counts in words: "438 million". */
export function gallons(n: number, lang: 'en' | 'es'): string {
  return new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { notation: 'compact', compactDisplay: 'long', maximumFractionDigits: 0 }).format(Math.round(n));
}
