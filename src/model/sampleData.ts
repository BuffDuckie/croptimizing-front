// PLACEHOLDER scenario data for building and testing the UI. These are NOT real
// estimates. The backend replaces them with NASA POWER weather, crop budgets,
// and USDA prices. Everything produced from this file is labeled "sample".

import type { RotationId } from '../api/types';
import { ROTATION_IDS } from '../api/types';
import { mulberry32, normalSource, standardize } from './rng';

export const SEED = 2026;
export const YEARS = Array.from({ length: 20 }, (_, i) => 2005 + i);
/** Applied water in the sample data assumes this irrigation efficiency. */
export const BASE_EFFICIENCY = 0.75;

type RotationParams = {
  profitMean: number;
  profitSd: number;
  waterMean: number;
  waterSd: number;
  soil: number;
  /** How strongly profit follows the shared price factor. */
  priceLoad: number;
  /** How strongly profit falls in hot years. */
  heatLoad: number;
  /** How strongly water need rises in hot years. */
  waterHeatLoad: number;
};

// Retuned with the team (Nov 15) so the placeholders show a real trade-off:
// cotton is the high-return, high-risk option; winter grains are steadier and
// less exposed to summer heat. Water and soil numbers are exactly as briefed.
export const PARAMS: Record<RotationId, RotationParams> = {
  alfalfa: { profitMean: 450, profitSd: 150, waterMean: 5.2, waterSd: 0.4, soil: 85, priceLoad: 0.35, heatLoad: 0.7, waterHeatLoad: 0.9 },
  cotton_barley: { profitMean: 500, profitSd: 320, waterMean: 4.4, waterSd: 0.35, soil: 55, priceLoad: 0.5, heatLoad: 0.3, waterHeatLoad: 0.8 },
  durum_sorghum: { profitMean: 300, profitSd: 110, waterMean: 3.6, waterSd: 0.3, soil: 60, priceLoad: 0.45, heatLoad: 0.1, waterHeatLoad: 0.4 },
  barley_fallow: { profitMean: 140, profitSd: 60, waterMean: 1.9, waterSd: 0.2, soil: 35, priceLoad: 0.45, heatLoad: 0, waterHeatLoad: 0.2 },
  fallow: { profitMean: -40, profitSd: 10, waterMean: 0, waterSd: 0, soil: 15, priceLoad: 0, heatLoad: 0, waterHeatLoad: 0 },
};

/** Named-year heat overrides so the sample stories hold (2020, 2023, 2024 hot). */
const HEAT_OVERRIDES: Record<number, number> = { 2020: 2.3, 2023: 1.7, 2024: 2.0 };

export type ScenarioData = {
  years: number[];
  heat: number[];
  price: number[];
  /** profit[rotation][yearIndex], USD per acre */
  profit: Record<RotationId, number[]>;
  /** water[rotation][yearIndex], applied AF per acre at BASE_EFFICIENCY */
  water: Record<RotationId, number[]>;
  soil: Record<RotationId, number>;
};

let cached: ScenarioData | null = null;

export function getScenarioData(): ScenarioData {
  if (cached) return cached;
  const normal = normalSource(mulberry32(SEED));
  const n = YEARS.length;

  const heat = YEARS.map((y) => {
    const h = normal();
    return HEAT_OVERRIDES[y] ?? h;
  });
  const price = YEARS.map(() => normal());

  const profit = {} as Record<RotationId, number[]>;
  const water = {} as Record<RotationId, number[]>;
  const soil = {} as Record<RotationId, number>;

  for (const id of ROTATION_IDS) {
    const p = PARAMS[id];
    const epsP = Array.from({ length: n }, () => normal());
    const epsW = Array.from({ length: n }, () => normal());
    const idioP = Math.sqrt(Math.max(0, 1 - p.priceLoad ** 2 - p.heatLoad ** 2));
    const idioW = Math.sqrt(Math.max(0, 1 - p.waterHeatLoad ** 2));
    // Exact moments: standardize the composite so the 20-year mean and sd match the parameters.
    const zP = standardize(epsP.map((e, t) => p.priceLoad * price[t] - p.heatLoad * heat[t] + idioP * e));
    const zW = standardize(epsW.map((e, t) => p.waterHeatLoad * heat[t] + idioW * e));
    profit[id] = zP.map((z) => p.profitMean + p.profitSd * z);
    water[id] = zW.map((z) => Math.max(0, p.waterMean + p.waterSd * z));
    soil[id] = p.soil;
  }

  cached = { years: [...YEARS], heat, price, profit, water, soil };
  return cached;
}

/** Soil-health breakdown per rotation. Five parts, each 0 to 20, summing to the score. */
export const SOIL_PARTS: Record<RotationId, { legume: number; livingRoots: number; residue: number; lowTillage: number; diversity: number }> = {
  alfalfa: { legume: 20, livingRoots: 20, residue: 12, lowTillage: 18, diversity: 15 },
  cotton_barley: { legume: 0, livingRoots: 14, residue: 13, lowTillage: 10, diversity: 18 },
  durum_sorghum: { legume: 0, livingRoots: 15, residue: 17, lowTillage: 10, diversity: 18 },
  barley_fallow: { legume: 0, livingRoots: 8, residue: 12, lowTillage: 10, diversity: 5 },
  fallow: { legume: 0, livingRoots: 0, residue: 5, lowTillage: 10, diversity: 0 },
};

const G = 'grow' as const;
const B = 'bare' as const;
/** Illustrative calendars, Jan to Dec. The science teammate will confirm. */
export const CALENDARS: Record<RotationId, ('grow' | 'bare')[]> = {
  alfalfa: [G, G, G, G, G, G, G, G, G, G, G, G],
  // Barley Dec to Mar, cotton Apr to Oct, bare Nov.
  cotton_barley: [G, G, G, G, G, G, G, G, G, G, B, G],
  // Durum Dec to May, bare Jun, sorghum Jul to Oct, bare Nov.
  durum_sorghum: [G, G, G, G, G, B, G, G, G, G, B, G],
  // Barley Dec to May, bare Jun to Nov.
  barley_fallow: [G, G, G, G, G, B, B, B, B, B, B, G],
  fallow: [B, B, B, B, B, B, B, B, B, B, B, B],
};
export const HEAT_RISK_MONTHS = [6, 7, 8];

/** Sample context series for the Why page (all labeled sample in the UI). */
export function getSampleContext() {
  const d = getScenarioData();
  const rand = mulberry32(SEED + 1);
  const graceTwsCm: { date: string; value: number }[] = [];
  for (let y = 2005; y <= 2024; y++) {
    for (let m = 1; m <= 12; m++) {
      const t = y - 2005 + (m - 1) / 12;
      const v = 4 - 0.85 * t + 2.2 * Math.sin((2 * Math.PI * (m - 3)) / 12) + (rand() - 0.5) * 1.2;
      graceTwsCm.push({ date: `${y}-${String(m).padStart(2, '0')}`, value: Math.round(v * 10) / 10 });
    }
  }
  const heatDaysPerYear = d.years.map((year, i) => ({
    year,
    days: Math.max(0, Math.round(16 + 0.75 * (year - 2005) + 5 * d.heat[i])),
  }));
  const et0 = [72, 96, 150, 198, 248, 272, 256, 228, 192, 142, 88, 66];
  const et0MonthlyMm = et0.map((mm, i) => ({ month: i + 1, mm }));
  const etCheck = [
    { crop: 'alfalfa', modeledMm: 1710, satelliteMm: 1585 },
    { crop: 'cotton', modeledMm: 1140, satelliteMm: 1236 },
    { crop: 'durum', modeledMm: 640, satelliteMm: 602 },
    { crop: 'sorghum', modeledMm: 565, satelliteMm: 611 },
    { crop: 'barley', modeledMm: 515, satelliteMm: 478 },
  ];
  // Three other farm regions, sample only. Labels are placeholders for the team to confirm.
  const other = mulberry32(SEED + 2);
  const otherRegions = [
    { id: 'region_a', label: 'TODO: region A', slope: -0.6 },
    { id: 'region_b', label: 'TODO: region B', slope: -0.45 },
    { id: 'region_c', label: 'TODO: region C', slope: -0.7 },
  ].map((r) => {
    const series: { date: string; value: number }[] = [];
    for (let y = 2005; y <= 2024; y++) {
      for (let m = 1; m <= 12; m++) {
        const t = y - 2005 + (m - 1) / 12;
        const v = 3 + r.slope * t + 1.8 * Math.sin((2 * Math.PI * (m - 3)) / 12) + (other() - 0.5) * 1.2;
        series.push({ date: `${y}-${String(m).padStart(2, '0')}`, value: Math.round(v * 10) / 10 });
      }
    }
    return { id: r.id, label: r.label, series, source: 'sample' as const };
  });
  return { graceTwsCm, heatDaysPerYear, et0MonthlyMm, etCheck, otherRegions };
}
