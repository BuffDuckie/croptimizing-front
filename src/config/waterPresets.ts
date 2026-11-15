import type { WaterPresetId } from '../api/types';

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
