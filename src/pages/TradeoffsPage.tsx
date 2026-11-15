import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { classicCaption } from '../components/charts/classicCaption';
import { ChartCard, DataTable } from '../components/charts/ChartCard';
import { FrontierChart } from '../components/charts/FrontierChart';
import { colors } from '../theme/tokens';
import { PageIntro } from '../components/layout/PageIntro';
import { WaterSlider } from '../components/plan/Controls';
import { Disclosure } from '../components/ui/Disclosure';
import { InfoTip } from '../components/ui/InfoTip';
import { Segmented } from '../components/ui/Segmented';
import { useUrlParam } from '../hooks/useUrlParam';
import { af, mixEntries, money, pct, whole } from '../lib/format';
import { usePlanContext, useCurrentLabel, usePlanSample } from '../state/PlanContext';

export default function TradeoffsPage() {
  const { t, i18n } = useTranslation();
  const planSample = usePlanSample();
  const curLabel = useCurrentLabel();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls, infeasible, softened } = usePlanContext();
  const [showClassic, setShowClassic] = useState(false);
  const [view, setView] = useUrlParam('view', ['risk', 'soil'] as const, 'risk');
  const classic = showClassic && data?.classic ? data.classic : null;

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
          {data && data.soilFrontier && (
            <Segmented
              label={t('trade.view.label')}
              value={view}
              onChange={setView}
              options={[
                { value: 'risk', label: t('trade.view.risk') },
                { value: 'soil', label: t('trade.view.soil') },
              ]}
              className="max-w-md"
            />
          )}
          {data && view === 'soil' && data.soilFrontier && <SoilView />}
          {data && (view === 'risk' || !data.soilFrontier) && (
            <ChartCard
              sample={planSample}
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
                  {classic && (
                    <li className="flex items-center gap-2">
                      <svg width="28" height="10">
                        <line x1="0" x2="28" y1="5" y2="5" stroke={colors['text-muted']} strokeWidth="2" strokeDasharray="7 5" />
                        <circle cx="14" cy="5" r="3.5" fill={colors.surface} stroke={colors['text-muted']} strokeWidth="1.5" />
                      </svg>
                      {t('trade.classic.legend')}
                    </li>
                  )}
                </ul>
              }
            >
              <FrontierChart
                frontier={frontier}
                current={{ worst1in5: data.current.metrics.worst1in5PerAcre, avgProfit: data.current.metrics.avgProfitPerAcre, mix: data.current.mix }}
                recommended={{ worst1in5: data.recommended.metrics.worst1in5PerAcre, avgProfit: data.recommended.metrics.avgProfitPerAcre, mix: data.recommended.mix }}
                waterKey={controls.water}
                classic={classic?.points}
              />
              {data.classic && (
                <div className="mt-4 rounded-ctl bg-bg p-4">
                  <label className="flex min-h-[44px] cursor-pointer items-center gap-3 text-base font-semibold text-text">
                    <input type="checkbox" className="h-5 w-5 accent-primary" checked={showClassic} onChange={(e) => setShowClassic(e.target.checked)} />
                    {t('trade.classic.toggle')}
                  </label>
                  <p className="mt-1 text-sm text-text-muted">{t('trade.classic.toggleHelp')}</p>
                  {classic && (
                    <p role="status" className="mt-3 text-base text-text">
                      {classicCaption(t, classic, lang)}
                    </p>
                  )}
                  {classic && (
                    <div className="sr-only">
                      <DataTable
                        caption={t('trade.classic.legend')}
                        head={[t('trade.colPlan'), t('trade.tipWorst'), t('trade.tipAvg')]}
                        rows={classic.points.map((p) => [mixEntries(p.mix).map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}`).join(', '), money(p.worst1in5, lang), money(p.avgProfit, lang)])}
                      />
                    </div>
                  )}
                </div>
              )}
            </ChartCard>
          )}
          {data && view === 'risk' && (
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

/** Profit vs. soil: the feasible mixes no other mix beats on both soil score and average profit. */
function SoilView() {
  const { t, i18n } = useTranslation();
  const planSample = usePlanSample();
  const curLabel = useCurrentLabel();
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls } = usePlanContext();
  if (!data?.soilFrontier) return null;
  const pts = [...data.soilFrontier].sort((a, b) => a.soilScore - b.soilScore);
  const rec = data.recommended.metrics;
  const cur = data.current.metrics;
  const top = pts[pts.length - 1];
  // Computed finding: what the highest soil score that fits would cost in an average year.
  const a = rec.soilScore;
  const title = !top
    ? t('trade.soil.titleNone')
    : top.soilScore - a < 0.5
      ? t('trade.soil.titleTop', { a: whole(a, lang) })
      : rec.avgProfitPerAcre - top.avgProfit < 0.5
        ? t('trade.soil.titleFree', { a: whole(a, lang), b: whole(top.soilScore, lang) })
        : t('trade.soil.title', { a: whole(a, lang), b: whole(top.soilScore, lang), c: money(rec.avgProfitPerAcre - top.avgProfit, lang) });
  const rows = pts.map((p) => [
    mixEntries(p.mix)
      .map((e) => `${t(`rotations.${e.id}`)} ${pct(e.share, lang)}`)
      .join(', '),
    whole(p.soilScore, lang),
    money(p.avgProfit, lang),
  ]);
  return (
    <>
      <ChartCard
        sample={planSample}
        title={title}
        subtitle={
          <span className="flex items-center gap-1">
            {t('trade.soil.subtitle', { water: af(controls.water, lang), soil: controls.soil })}
            <InfoTip term="soilScore" />
          </span>
        }
        howTo={
          <>
            <p>{t('trade.soil.how1')}</p>
            <p>{t('trade.soil.how2')}</p>
          </>
        }
        table={<DataTable caption={t('trade.soil.tableCaption')} head={[t('trade.colPlan'), t('trade.soil.tipX'), t('trade.tipAvg')]} rows={rows} />}
        footer={
          <ul className="flex flex-wrap gap-x-5 gap-y-2 text-sm text-text-muted" aria-hidden="true">
            <li className="flex items-center gap-2">
              <svg width="28" height="10">
                <line x1="0" x2="28" y1="5" y2="5" stroke={colors.primary} strokeWidth="3" />
                <circle cx="14" cy="5" r="4" fill={colors.primary} />
              </svg>
              {t('trade.soil.legend')}
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
          xKind="soil"
          frontier={pts.map((p) => ({ worst1in5: p.soilScore, avgProfit: p.avgProfit, mix: p.mix }))}
          current={{ worst1in5: cur.soilScore, avgProfit: cur.avgProfitPerAcre, mix: data.current.mix }}
          recommended={{ worst1in5: rec.soilScore, avgProfit: rec.avgProfitPerAcre, mix: data.recommended.mix }}
          waterKey={controls.water}
          ariaLabel={t('trade.soil.aria', {
            n: pts.length,
            recSoil: whole(rec.soilScore, lang),
            recAvg: money(rec.avgProfitPerAcre, lang),
            curSoil: whole(cur.soilScore, lang),
            curAvg: money(cur.avgProfitPerAcre, lang),
          })}
        />
      </ChartCard>
      <section className="card">
        <Disclosure>
          <div className="space-y-3 text-base">
            <p>{t('trade.soil.math')}</p>
            <div className="overflow-x-auto" tabIndex={0}>
              <DataTable caption={t('trade.soil.tableCaption')} head={[t('trade.colPlan'), t('trade.soil.tipX'), t('trade.tipAvg')]} rows={rows} />
            </div>
          </div>
        </Disclosure>
      </section>
    </>
  );
}
