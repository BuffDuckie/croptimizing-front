import { RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Mix, SensitivityRow } from '../../api/types';
import { mixEntries, money, moneyDelta, pct } from '../../lib/format';
import { usePlanSample } from '../../state/PlanContext';
import { ChartCard, DataTable } from './ChartCard';

/** How the suggested plan's average profit moves when prices, water cost, or efficiency change. */
export function SensitivityChart({ rows, baseAvg, baseWorst }: { rows: SensitivityRow[]; baseAvg: number; baseWorst: number }) {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const planSample = usePlanSample();
  const label = (r: SensitivityRow) =>
    t(`method.sens.case.${r.case}`, { v: r.case.startsWith('efficiency') ? Math.round(r.value * 100) : money(r.value, lang) });
  const mixText = (m: Mix | null) =>
    m ? mixEntries(m).map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}`).join(', ') : t('method.sens.noPlan');
  const changed = rows.filter((r) => r.mixChanged).length;
  const title =
    changed === 0
      ? t('method.sens.titleNone', { total: rows.length })
      : changed * 3 > rows.length
        ? t('method.sens.titleMany', { n: changed, total: rows.length })
        : t('method.sens.titleFew', { n: changed, total: rows.length });
  const deltas = rows.map((r) => (r.avgProfit === null ? null : r.avgProfit - baseAvg));
  const maxAbs = Math.max(1, ...deltas.map((d) => Math.abs(d ?? 0)));

  return (
    <ChartCard
      title={title}
      subtitle={t('method.sens.sub', { avg: money(baseAvg, lang) })}
      sample={planSample}
      howTo={
        <>
          <p>{t('method.sens.how1')}</p>
          <p>{t('method.sens.how2')}</p>
        </>
      }
      table={
        <DataTable
          caption={t('method.sens.caption')}
          head={[t('method.sens.colCase'), t('compare.stat.avg'), t('compare.stat.worst'), t('method.sens.colMix'), t('method.sens.colChanged')]}
          rows={rows.map((r) => [
            label(r),
            r.avgProfit === null ? '-' : money(r.avgProfit, lang),
            r.worst1in5 === null ? '-' : money(r.worst1in5, lang),
            mixText(r.mix),
            r.mixChanged ? t('method.sens.yes') : t('method.sens.no'),
          ])}
        />
      }
    >
      <div role="img" aria-label={t('method.sens.aria', { n: changed, total: rows.length })}>
        <p className="mb-3 text-sm text-text-muted" aria-hidden="true">
          {t('method.sens.axis')}
        </p>
        <ul className="space-y-3" aria-hidden="true">
          {rows.map((r, i) => {
            const d = deltas[i];
            const w = d === null ? 0 : (Math.abs(d) / maxAbs) * 34;
            return (
              <li key={r.case} className="grid grid-cols-1 gap-1 sm:grid-cols-[minmax(0,16rem)_minmax(0,1fr)] sm:items-center sm:gap-4">
                <span className="flex flex-wrap items-center gap-1.5 text-sm font-medium text-text">
                  {label(r)}
                  {r.mixChanged && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-primary-tint px-2 py-0.5 text-sm font-semibold text-primary">
                      <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
                      {t('method.sens.newMix')}
                    </span>
                  )}
                </span>
                <span className="relative flex h-7 items-center">
                  <span className="absolute inset-y-0 left-1/2 w-px bg-text-muted" />
                  {d === null ? (
                    <span className="absolute left-[52%] text-sm text-text-muted">{t('method.sens.noPlan')}</span>
                  ) : (
                    <>
                      <span
                        className={`absolute inset-y-1 rounded-sm ${d < 0 ? 'bg-danger' : 'bg-primary'}`}
                        style={d < 0 ? { right: '50%', width: `${w}%` } : { left: '50%', width: `${w}%` }}
                      />
                      <span
                        className="tnum absolute whitespace-nowrap text-sm font-semibold text-text"
                        style={d < 0 ? { right: `calc(50% + ${w}% + 6px)` } : { left: `calc(50% + ${w}% + 6px)` }}
                      >
                        {moneyDelta(d, lang)}
                      </span>
                    </>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
        <p className="mt-4 text-sm text-text-muted" aria-hidden="true">
          {t('method.sens.baseLine', { worst: money(baseWorst, lang) })}
        </p>
      </div>
    </ChartCard>
  );
}
