import { ExternalLink } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { RotationCard } from '../../api/types';
import { SOIL_PART_IDS } from '../../api/types';
import { whole } from '../../lib/format';
import { ROT_BG } from './rotation';

/**
 * The soil-score rubric: each of the five parts, the NRCS principle it follows,
 * and every rotation's points with a one-line reason.
 */
export function SoilRubric({ rotations }: { rotations: RotationCard[] }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  return (
    <div>
      <div className="card overflow-x-auto" tabIndex={0} role="region" aria-label={t('method.soilRubric.caption')}>
        <table className="w-full min-w-[960px] border-collapse text-left text-sm">
          <caption className="mb-2 text-left font-semibold text-text">{t('method.soilRubric.caption')}</caption>
          <thead>
            <tr className="border-b border-border">
              <th scope="col" className="py-2 pr-4 font-semibold text-text-muted">
                {t('method.soilRubric.colPart')}
              </th>
              <th scope="col" className="py-2 pr-4 font-semibold text-text-muted">
                {t('method.soilRubric.colPrinciple')}
              </th>
              {rotations.map((r) => (
                <th key={r.id} scope="col" className="py-2 pr-4 font-semibold text-text-muted">
                  <span className="flex items-center gap-2">
                    <span aria-hidden="true" className={`h-2.5 w-2.5 shrink-0 rounded-full ${ROT_BG[r.id]}`} />
                    {r.name}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SOIL_PART_IDS.map((p) => (
              <tr key={p} className="border-b border-border-soft align-top last:border-0">
                <th scope="row" className="py-3 pr-4 font-semibold text-text">
                  {t(`compare.soil.${p}`)}
                </th>
                <td className="py-3 pr-4 text-text">{t(`soilPrinciple.${p}`)}</td>
                {rotations.map((r) => (
                  <td key={r.id} className="py-3 pr-4">
                    <span className="tnum block font-semibold text-secondary">{t('method.soilRubric.points', { v: whole(r.soil[p], lang) })}</span>
                    <span className="mt-1 block text-text-muted">{t(`method.soilRubric.reason.${r.id}.${p}`)}</span>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 max-w-3xl text-base text-text-muted">{t('method.soilRubric.reviewed')}</p>
      <a href={t('soilPrinciple.sourceUrl')} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-[44px] items-center gap-1.5 text-base font-semibold">
        {t('soilPrinciple.source')}
        <ExternalLink aria-hidden="true" className="h-4 w-4" />
      </a>
    </div>
  );
}
