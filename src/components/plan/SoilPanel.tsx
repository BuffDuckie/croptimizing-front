import { useTranslation } from 'react-i18next';
import type { Mix, PlanResponse } from '../../api/types';
import { af, afDelta, whole, wholeDelta } from '../../lib/format';
import { soilSummary } from '../../lib/soil';
import { isSample } from '../../lib/sources';
import { useCurrentLabel } from '../../state/PlanContext';
import { ChartCard } from '../charts/ChartCard';
import { DeltaChip } from '../ui/DeltaChip';

/**
 * "What this plan does for your soil": the plan next to the current plan (cut
 * back to fit), acre-weighted from each rotation's calendar and soil parts.
 */
export function SoilPanel({ data, mix, acres, planLabel }: { data: PlanResponse; mix: Mix; acres: number; planLabel: string }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const curLabel = useCurrentLabel();
  const rec = soilSummary(mix, data.rotations, acres);
  const cur = soilSummary(data.current.mix, data.rotations, acres);

  const covered = cur.bareMonths - rec.bareMonths;
  const nMore = rec.nitrogenAcres - cur.nitrogenAcres;
  const famMore = rec.families !== null && cur.families !== null ? rec.families - cur.families : 0;
  const resMore = rec.residue - cur.residue;
  // The title names the biggest real improvement, in this order; neutral when nothing improves.
  const title =
    covered >= 0.05
      ? t('plan.soilPanel.title.cover', { n: af(covered, lang) })
      : nMore >= 0.5
        ? t('plan.soilPanel.title.nitrogen', { n: whole(nMore, lang) })
        : famMore >= 1
          ? t('plan.soilPanel.title.families', { count: famMore, n: whole(famMore, lang) })
          : resMore >= 0.5
            ? t('plan.soilPanel.title.residue')
            : t('plan.soilPanel.title.neutral');

  const tiles = [
    {
      key: 'bare',
      value: af(rec.bareMonths, lang),
      unit: t('plan.soilPanel.bareUnit'),
      delta: <DeltaChip value={(rec.bareMonths - cur.bareMonths) * 10} goodWhen="down" text={afDelta(rec.bareMonths - cur.bareMonths, lang)} label={t('plan.vsCurrent')} />,
      was: af(cur.bareMonths, lang),
    },
    {
      key: 'nitrogen',
      value: whole(rec.nitrogenAcres, lang),
      unit: t('common.acres'),
      delta: <DeltaChip value={nMore} text={wholeDelta(nMore, lang)} label={t('plan.vsCurrent')} />,
      was: whole(cur.nitrogenAcres, lang),
    },
    ...(rec.families !== null && cur.families !== null
      ? [
          {
            key: 'families',
            value: whole(rec.families, lang),
            unit: t('plan.soilPanel.familiesUnit', { count: rec.families }),
            delta: <DeltaChip value={famMore} text={wholeDelta(famMore, lang)} label={t('plan.vsCurrent')} />,
            was: whole(cur.families, lang),
          },
        ]
      : []),
    {
      key: 'residue',
      value: af(rec.residue, lang),
      unit: t('plan.soilPanel.residueUnit'),
      delta: <DeltaChip value={resMore * 10} text={afDelta(resMore, lang)} label={t('plan.vsCurrent')} />,
      was: af(cur.residue, lang),
    },
  ];

  return (
    <ChartCard
      id="soil-panel"
      title={title}
      subtitle={t('plan.soilPanel.sub', { plan: planLabel, current: curLabel })}
      sample={isSample(data, ['soil'])}
      howTo={
        <>
          <p>{t('plan.soilPanel.how1')}</p>
          <p className="mt-2">{t('plan.soilPanel.how2')}</p>
        </>
      }
    >
      <dl className="grid gap-3 sm:grid-cols-2">
        {tiles.map((x) => (
          <div key={x.key} className="rounded-ctl bg-bg p-4 ring-1 ring-inset ring-border-soft">
            <dt className="text-base font-semibold text-text">{t(`plan.soilPanel.${x.key}`)}</dt>
            <dd className="mt-1 flex items-baseline gap-1.5 text-secondary">
              <span className="metric-value tnum text-3xl font-semibold">{x.value}</span>
              <span className="text-base font-medium text-text-muted">{x.unit}</span>
            </dd>
            <dd className="mt-2 flex flex-wrap items-center gap-2 text-sm text-text-muted">
              {x.delta}
              <span>{t('plan.soilPanel.was', { v: x.was })}</span>
            </dd>
          </div>
        ))}
      </dl>
    </ChartCard>
  );
}
