import { ExternalLink, Info } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { SoilPartId } from '../../api/types';
import { SOIL_PART_IDS } from '../../api/types';
import { points, whole } from '../../lib/format';
import { usePlanContext } from '../../state/PlanContext';
import { Popover } from './Popover';

/**
 * Info button for a 0-100 soil score: its five parts, the points each earns
 * (out of 20), and the NRCS principle each follows. Opens on tap, focus, or hover.
 */
export function SoilScoreInfo({
  parts,
  score,
  align = 'center',
  reasons,
}: {
  parts: Record<SoilPartId, number>;
  score: number;
  align?: 'start' | 'center' | 'end';
  /** One sentence per part (a single rotation's card), shown under each part. */
  reasons?: Record<SoilPartId, string>;
}) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { controls } = usePlanContext();
  const all = controls.soilParts.length === SOIL_PART_IDS.length;
  return (
    <Popover
      label={t('soilInfo.label', { v: whole(score, lang) })}
      align={align}
      triggerClassName="-m-2 inline-flex h-11 w-11 items-center justify-center rounded-full text-text-muted transition-colors duration-fast hover:text-secondary"
      trigger={<Info aria-hidden="true" className="h-[18px] w-[18px]" strokeWidth={2} />}
    >
      <p className="font-semibold text-secondary">{t('soilInfo.title', { v: whole(score, lang) })}</p>
      <p className="mt-1 text-text">{t('glossary.soilScore.def')}</p>
      <ul className="mt-3 space-y-2 border-t border-border-soft pt-3">
        {SOIL_PART_IDS.map((p) => {
          const counted = controls.soilParts.includes(p);
          return (
            <li key={p} className={counted ? '' : 'opacity-60'}>
              <span className="flex items-baseline justify-between gap-3">
                <span className="font-semibold text-text">{t(`compare.soil.${p}`)}</span>
                <span className="tnum whitespace-nowrap font-semibold text-secondary">{t('soilInfo.points', { v: points(parts[p], lang) })}</span>
              </span>
              <span className="block text-text-muted">
                {t(`soilPrinciple.${p}`)}
                {!counted && ` (${t('compare.soil.notCounted')})`}
              </span>
              {reasons && <span className="mt-0.5 block text-text">{reasons[p]}</span>}
            </li>
          );
        })}
      </ul>
      <p className="mt-3 text-text-muted">{all ? t('soilInfo.sum') : t('soilInfo.rescaled')}</p>
      <a href={t('soilPrinciple.sourceUrl')} target="_blank" rel="noreferrer" className="mt-1 inline-flex min-h-[44px] items-center gap-1 font-semibold">
        {t('soilInfo.source')} <ExternalLink aria-hidden="true" className="h-4 w-4" />
      </a>
    </Popover>
  );
}
