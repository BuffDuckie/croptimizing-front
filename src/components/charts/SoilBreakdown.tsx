import { useTranslation } from 'react-i18next';
import type { RotationCard } from '../../api/types';

const PARTS = ['legume', 'livingRoots', 'residue', 'lowTillage', 'diversity'] as const;

/** Five small bars (each out of 20) that add up to the 0-100 soil score. */
export function SoilBreakdown({ soil }: { soil: RotationCard['soil'] }) {
  const { t } = useTranslation();
  return (
    <div>
      <dl className="space-y-2">
        {PARTS.map((p) => (
          <div key={p} className="grid grid-cols-[minmax(0,9.5rem)_1fr_2.5rem] items-center gap-3">
            <dt className="truncate text-sm text-text">{t(`compare.soil.${p}`)}</dt>
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
        <span className="font-semibold text-text">{t('compare.soil.total')}</span>
        <span className="text-lg font-semibold text-secondary">
          {soil.total}
          <span className="text-sm font-medium text-text-muted">/100</span>
        </span>
      </p>
    </div>
  );
}
