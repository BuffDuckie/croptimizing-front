import { useTranslation } from 'react-i18next';
import { FALLBACK_WATER_PRESETS, WATER_PRESET_IDS } from '../config/waterPresets';
import { usePlanContext } from '../state/PlanContext';

export { presetBudget } from '../config/waterPresets';

export type Preset = { id: (typeof WATER_PRESET_IDS)[number]; afPerAcre: number; label: string; source: string | null; fromData: boolean };

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
