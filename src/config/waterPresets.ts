import type { PlanResponse, WaterPresetId } from '../api/types';

export const WATER_PRESET_IDS: WaterPresetId[] = ['full', 'cut2022', 'zero2023'];

/**
 * TODO(team): PLACEHOLDER water budgets (AF/acre) used only until
 * public/data/real_data.json supplies waterPresets with sources. These are not
 * real allotments; the UI shows them with a Sample badge and no source link.
 */
export const FALLBACK_WATER_PRESETS: Record<WaterPresetId, { afPerAcre: number; source: string }> = {
  full: { afPerAcre: 4.5, source: 'TODO' },
  cut2022: { afPerAcre: 3.2, source: 'TODO' },
  zero2023: { afPerAcre: 2.0, source: 'TODO' },
};

/** The past year a "zero canal water" budget is modeled on (its weather is used for the headline). */
export const ZERO_CANAL_YEAR = 2023;

/** Slider-ready budget: 0.5 to 6.0 AF/acre in 0.1 steps. */
export const presetBudget = (af: number) => Math.min(6, Math.max(0.5, Math.round(af * 10) / 10));

/** One preset from the data, or the TODO placeholder. */
export function presetFor(data: PlanResponse | null, id: WaterPresetId): { afPerAcre: number; fromData: boolean } {
  const p = data?.waterPresets?.[id];
  return p ? { afPerAcre: p.afPerAcre, fromData: true } : { afPerAcre: FALLBACK_WATER_PRESETS[id].afPerAcre, fromData: false };
}
