import { useTranslation } from 'react-i18next';
import type { RotationCard, SoilPartId } from '../../api/types';
import { SOIL_PART_IDS } from '../../api/types';

const PARTS = SOIL_PART_IDS;

/**
 * Five small bars (each out of 20) that add up to the 0-100 soil score. Parts
 * left out of the farmer's soil goals are dimmed; the score then counts only
 * the selected parts, rescaled to 0-100.
 */
export function SoilBreakdown({ soil, selected = SOIL_PART_IDS }: { soil: RotationCard['soil']; selected?: readonly SoilPartId[] }) {
  const { t } = useTranslation();
  const all = selected.length === SOIL_PART_IDS.length;
  return (
    <div>
      <dl className="space-y-2">
        {PARTS.map((p) => (
          <div key={p} className={`grid grid-cols-[minmax(0,9.5rem)_1fr_2.5rem] items-center gap-3 ${selected.includes(p) ? '' : 'opacity-45'}`}>
            <dt className="truncate text-sm text-text">
              {t(`compare.soil.${p}`)}
              {!selected.includes(p) && <span className="sr-only"> ({t('compare.soil.notCounted')})</span>}
            </dt>
            <dd className="relative h-2.5 rounded-full bg-secondary-tint" aria-hidden="true">
              <span className="meter-fill absolute inset-y-0 left-0 rounded-full bg-secondary" style={{ width: `${(soil[p] / 20) * 100}%` }} />
            </dd>
            <dd className="tnum text-right text-sm font-semibold text-text">
              {soil[p]}
              <span className="sr-only"> {t('compare.soil.of20')}</span>
            </dd>
          </div>
        ))}
      </dl>
      <p className="tnum mt-3 flex items-baseline justify-between border-t border-border-soft pt-2 text-sm">
        <span className="font-semibold text-text">{all ? t('compare.soil.total') : t('compare.soil.totalGoals')}</span>
        <span className="text-lg font-semibold text-secondary">
          {soil.total}
          <span className="text-sm font-medium text-text-muted">/100</span>
        </span>
      </p>
    </div>
  );
}
