import { useTranslation } from 'react-i18next';
import { ChartCard, DataTable } from '../components/charts/ChartCard';
import { FrontierChart } from '../components/charts/FrontierChart';
import { colors } from '../theme/tokens';
import { PageIntro } from '../components/layout/PageIntro';
import { WaterSlider } from '../components/plan/Controls';
import { Disclosure } from '../components/ui/Disclosure';
import { InfoTip } from '../components/ui/InfoTip';
import { af, mixEntries, money, pct } from '../lib/format';
import { usePlanContext, useCurrentLabel } from '../state/PlanContext';

export default function TradeoffsPage() {
  const { t, i18n } = useTranslation();
  const curLabel = useCurrentLabel();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls, infeasible, softened } = usePlanContext();

  const frontier = data?.frontier ?? [];
  const sorted = [...frontier].sort((a, b) => a.worst1in5 - b.worst1in5);
  const boldest = sorted[0];
  const safest = sorted[sorted.length - 1];
  const title =
    sorted.length > 1
      ? t('trade.title', {
          gain: money(safest.worst1in5 - boldest.worst1in5, lang),
          cost: money(boldest.avgProfit - safest.avgProfit, lang),
        })
      : t('trade.titleOne');

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.tradeoffs.title')} intro={t('pages.tradeoffs.intro')} />
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="min-w-0 space-y-6">
          {!data && <div className="min-h-[110vh]" aria-busy="true" />}
          {data && (
            <ChartCard
              title={title}
              subtitle={
                <span className="flex items-center gap-1">
                  {t('trade.subtitle', { water: af(controls.water, lang) })}
                  <InfoTip term="frontier" />
                </span>
              }
              howTo={
                <>
                  <p>{t('trade.how1')}</p>
                  <p>{t('trade.how2')}</p>
                  <p>{t('trade.how3')}</p>
                </>
              }
              table={
                <DataTable
                  caption={t('trade.tableCaption')}
                  head={[t('trade.colPlan'), t('trade.tipWorst'), t('trade.tipAvg')]}
                  rows={sorted.map((p) => [
                    mixEntries(p.mix)
                      .map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}`)
                      .join(', '),
                    money(p.worst1in5, lang),
                    money(p.avgProfit, lang),
                  ])}
                />
              }
              footer={
                <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted" aria-hidden="true">
                  <li className="flex items-center gap-2">
                    <svg width="28" height="10">
                      <line x1="0" x2="28" y1="5" y2="5" stroke={colors.primary} strokeWidth="3" />
                      <circle cx="14" cy="5" r="4" fill={colors.primary} />
                    </svg>
                    {t('trade.legendFrontier')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="18" height="18">
                      <path d="M9 1.5 L11 7 L16.5 7 L12 10.5 L13.8 16 L9 12.6 L4.2 16 L6 10.5 L1.5 7 L7 7 Z" fill={colors.accent} stroke={colors.primary} strokeWidth="1.5" />
                    </svg>
                    {t('common.recommended')}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="16" height="16">
                      <circle cx="8" cy="8" r="6" fill={colors.surface} stroke={colors.text} strokeWidth="2" />
                    </svg>
                    {curLabel}
                  </li>
                  <li className="flex items-center gap-2">
                    <svg width="28" height="10">
                      <line x1="0" x2="28" y1="5" y2="5" stroke={colors.primary} strokeWidth="2" strokeDasharray="5 5" opacity="0.5" />
                    </svg>
                    {t('trade.legendGhost')}
                  </li>
                </ul>
              }
            >
              <FrontierChart
                frontier={frontier}
                current={{ worst1in5: data.current.metrics.worst1in5PerAcre, avgProfit: data.current.metrics.avgProfitPerAcre, mix: data.current.mix }}
                recommended={{ worst1in5: data.recommended.metrics.worst1in5PerAcre, avgProfit: data.recommended.metrics.avgProfitPerAcre, mix: data.recommended.mix }}
                waterKey={controls.water}
              />
            </ChartCard>
          )}
          {data && (
            <section className="card">
              <h2 className="text-xl font-semibold">{t('trade.captionTitle')}</h2>
              <p className="mt-2 text-base text-text">{t('trade.caption')}</p>
              <div className="mt-4 border-t border-border-soft pt-3">
                <Disclosure>
                  <div className="space-y-3 text-base">
                    <p>{t('trade.math1')}</p>
                    <p>{t('trade.math2')}</p>
                    <div className="overflow-x-auto" tabIndex={0}>
                      <DataTable
                        caption={t('trade.tableCaption')}
                        head={[t('trade.colPlan'), t('trade.tipWorst'), t('trade.tipAvg')]}
                        rows={sorted.map((p) => [
                          mixEntries(p.mix)
                            .map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}`)
                            .join(', '),
                          money(p.worst1in5, lang),
                          money(p.avgProfit, lang),
                        ])}
                      />
                    </div>
                  </div>
                </Disclosure>
              </div>
            </section>
          )}
        </div>
        <aside className="space-y-4">
          <div className="card lg:sticky lg:top-[136px]">
            <h2 className="text-lg font-semibold">{t('trade.sliderTitle')}</h2>
            <p className="mb-5 mt-1 text-base text-text-muted">{t('trade.sliderHelp')}</p>
            <WaterSlider />
            {infeasible && <p className="mt-4 rounded-ctl bg-warning-tint p-3 text-sm text-warning">{softened ? t('plan.softened', { y: softened.soil }) : t('plan.infeasibleTitle')}</p>}
          </div>
        </aside>
      </div>
    </div>
  );
}
