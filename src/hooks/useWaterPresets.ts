import { useTranslation } from 'react-i18next';
import type { PlanResponse, WaterPresetId } from '../api/types';
import { FALLBACK_WATER_PRESETS, WATER_PRESET_IDS } from '../config/waterPresets';
import { usePlanContext } from '../state/PlanContext';

export type Preset = { id: WaterPresetId; afPerAcre: number; label: string; source: string | null; fromData: boolean };

/** Slider-ready budget: 0.5 to 6.0 AF/acre in 0.1 steps. */
export const presetBudget = (af: number) => Math.min(6, Math.max(0.5, Math.round(af * 10) / 10));

/** One preset from the data, or the TODO placeholder. */
export function presetFor(data: PlanResponse | null, id: WaterPresetId): { afPerAcre: number; fromData: boolean } {
  const p = data?.waterPresets?.[id];
  return p ? { afPerAcre: p.afPerAcre, fromData: true } : { afPerAcre: FALLBACK_WATER_PRESETS[id].afPerAcre, fromData: false };
}

/** Water situation presets: from the data file when it has them, otherwise TODO placeholders. */
export function useWaterPresets(): Preset[] {
  const { t, i18n } = useTranslation();
  const { data } = usePlanContext();
  return WATER_PRESET_IDS.map((id) => {
    const p = data?.waterPresets?.[id];
    if (!p) return { id, afPerAcre: FALLBACK_WATER_PRESETS[id].afPerAcre, label: t(`plan.preset.${id}`), source: null, fromData: false };
    // Labels in the data are English; Spanish uses our own translation of the same situation.
    return { id, afPerAcre: p.afPerAcre, label: i18n.language === 'es' ? t(`plan.preset.${id}`) : p.label, source: /^https?:\/\//.test(p.source) ? p.source : null, fromData: true };
  });
}
