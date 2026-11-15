import { Download } from 'lucide-react';
import { lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { DataTable } from '../components/charts/ChartCard';
import { CorrelationHeatmap } from '../components/charts/CorrelationHeatmap';
import { SensitivityChart } from '../components/charts/SensitivityChart';
import { DataFlowDiagram } from '../components/charts/DataFlowDiagram';
import { classicCaption } from '../components/charts/classicCaption';
import { PageIntro } from '../components/layout/PageIntro';
import { af, money, whole } from '../lib/format';
import { useSourceRows } from '../hooks/useSourceRows';
import { usePlanContext, useCurrentLabel } from '../state/PlanContext';

const SECTIONS = ['idea', 'formulas', 'steps', 'sources', 'flow', 'correlations', 'backtest', 'sensitivity', 'why', 'risk', 'current', 'scenarios', 'assumptions'] as const;

// Formulas (KaTeX) load after the page text so the page paints fast.
const MathFormulas = lazy(() => import('../components/lazy/MathFormulas'));

export default function MethodPage() {
  const { t, i18n } = useTranslation();
  const curLabel = useCurrentLabel(true);
  const lang = i18n.language === 'es' ? 'es' : 'en';
  const { data, controls } = usePlanContext();

  const steps = t('method.stepsList', { returnObjects: true }) as string[];
  const limits = t('method.limits', { returnObjects: true }) as string[];
  // Status comes from each dataset's own source flag, so it updates when real data loads.
  const sources = useSourceRows().map((r) => r.cells);

  const downloadCsv = () => {
    if (!data) return;
    const head = ['year', 'suggested_profit_usd_per_acre', 'current_cut_to_fit_profit_usd_per_acre', 'current_as_farmed_profit_usd_per_acre', 'suggested_water_af_per_acre', 'current_cut_to_fit_water_af_per_acre', 'water_budget_af_per_acre', 'data_source'];
    const rows = data.stressTests.map((s) => {
      const asFarmed = data.currentAsFarmed?.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? '';
      return [s.year, s.recommendedProfit, s.currentProfit, asFarmed, s.recommendedWater, s.currentWater, controls.water, data.dataSource];
    });
    const csv = [head, ...rows].map((r) => r.join(',')).join('\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `croptimizing-scenarios-w${controls.water.toFixed(1)}-r${controls.risk}-s${controls.soil}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="container-content page-enter">
      <PageIntro title={t('pages.method.title')} intro={t('pages.method.intro')} />
      <div className="grid gap-10 lg:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={t('method.toc')} className="hidden lg:block">
          <ol className="sticky top-[136px] space-y-1 border-l border-border-soft">
            {SECTIONS.map((s) => (
              <li key={s}>
                <a href={`#${s}`} className="-ml-px block border-l-2 border-transparent py-1.5 pl-4 text-base font-medium text-text-muted no-underline transition-colors duration-fast hover:border-primary hover:text-primary">
                  {t(`method.sec.${s}`)}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <div className="min-w-0 space-y-12">
          <section id="idea" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.idea')}</h2>
            <p className="mt-3 max-w-3xl text-lg text-text">{t('method.idea')}</p>
          </section>

          <section id="formulas" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.formulas')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text-muted">{t('method.formulasIntro')}</p>
            <Suspense fallback={<div className="skeleton mt-5 h-[760px] rounded-ctl" aria-busy="true" />}>
              <MathFormulas />
            </Suspense>
          </section>

          <section id="steps" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.steps')}</h2>
            <ol className="mt-5 space-y-4">
              {steps.map((s, i) => (
                <li key={i} className="grid grid-cols-[2.25rem_1fr] gap-3">
                  <span className="tnum inline-flex h-8 w-8 items-center justify-center rounded-full bg-primary-tint text-base font-semibold text-primary">{i + 1}</span>
                  <p className="pt-0.5 text-base text-text">{s}</p>
                </li>
              ))}
            </ol>
          </section>

          <section id="sources" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.sources')}</h2>
            <div className="card mt-5 overflow-x-auto" tabIndex={0}>
              <DataTable caption={t('method.sourcesCaption')} head={t('method.sourceHead', { returnObjects: true }) as string[]} rows={sources} className="min-w-[640px] [&_td]:text-left [&_th]:text-left" />
            </div>
            <p className="mt-3 max-w-3xl text-base text-text-muted">{t('method.unitsNote')}</p>
          </section>

          <section id="flow" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.flow')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text">{t('method.flowIntro')}</p>
            <div className="mt-5">
              <DataFlowDiagram />
            </div>
          </section>

          {data ? (
            <>
          <section id="correlations" className="scroll-mt-36">
            <h2 className="mb-5 text-3xl font-semibold">{t('method.sec.correlations')}</h2>
            <CorrelationHeatmap correlations={data.correlations} />
          </section>

          <section id="backtest" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.backtest')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text">{t('method.backtestIntro')}</p>
            <div className="card mt-5 overflow-x-auto" tabIndex={0}>
              <DataTable
                caption={t('method.backtestCaption')}
                head={[t('method.strategy'), t('compare.stat.avg'), t('compare.stat.worst'), t('method.avgWater')]}
                rows={data.backtest.map((b) => [b.strategy, money(b.avgProfit, lang), money(b.worst1in5, lang), `${af(b.avgWater, lang)} AF`])}
                className="min-w-[560px]"
              />
            </div>
            {data.validation?.lpCrossCheck && (
              <p className="mt-4 max-w-3xl text-base text-text">
                {t('method.crossCheck', { x: whole(data.validation.lpCrossCheck.maxShareDifference * 100, lang) })} {data.validation.lpCrossCheck.note} ({data.validation.lpCrossCheck.method})
              </p>
            )}
          </section>

          {data.sensitivity && data.sensitivity.length > 0 && (
            <section id="sensitivity" className="scroll-mt-36">
              <h2 className="text-3xl font-semibold">{t('method.sec.sensitivity')}</h2>
              <p className="mt-3 max-w-3xl text-base text-text">{t('method.sens.intro')}</p>
              <div className="mt-5">
                <SensitivityChart rows={data.sensitivity} baseAvg={data.recommended.metrics.avgProfitPerAcre} baseWorst={data.recommended.metrics.worst1in5PerAcre} />
              </div>
            </section>
          )}

          {data.classic && (
            <section id="why" className="scroll-mt-36">
              <h2 className="text-3xl font-semibold">{t('method.sec.why')}</h2>
              <p className="mt-3 max-w-3xl text-base text-text">
                {t('method.whyRisk')} {classicCaption(t, data.classic, lang)}
              </p>
            </section>
          )}

          {data.riskMetrics && (
            <section id="risk" className="scroll-mt-36">
              <h2 className="text-3xl font-semibold">{t('method.sec.risk')}</h2>
              <p className="mt-3 max-w-3xl text-base text-text">{t('method.risk.intro', { fallow: money(data.riskMetrics.fallowAvg, lang) })}</p>
              <div className="card mt-5 overflow-x-auto" tabIndex={0}>
                <DataTable
                  caption={t('method.risk.caption')}
                  head={[t('method.risk.colMetric'), t('common.recommended'), curLabel]}
                  rows={(['sharpe', 'sortino', 'diversification'] as const).map((k) => {
                    const fmt = (v: number | null) =>
                      v === null ? (k === 'sortino' ? t('method.risk.noDownside') : '-') : k === 'diversification' ? `${whole(v * 100, lang)}%` : new Intl.NumberFormat(lang === 'es' ? 'es-US' : 'en-US', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(v);
                    return [t(`method.risk.${k}`), fmt(data.riskMetrics!.recommended[k]), fmt(data.riskMetrics!.current[k])];
                  })}
                  className="min-w-[520px]"
                />
              </div>
              <Suspense fallback={<div className="skeleton mt-5 h-[330px] rounded-ctl" aria-busy="true" />}>
                <MathFormulas keys={['sharpe', 'sortino', 'diversification']} />
              </Suspense>
            </section>
          )}

          {data.currentAsFarmed && (
            <section id="current" className="scroll-mt-36">
              <h2 className="text-3xl font-semibold">{t('method.asFarmedTitle')}</h2>
              <p className="mt-3 max-w-3xl text-base text-text">{t('method.asFarmedIntro')}</p>
              <div className="card mt-5 overflow-x-auto" tabIndex={0}>
                <DataTable
                  caption={t('method.asFarmedCaption')}
                  head={[t('trade.colPlan'), t('compare.stat.avg'), t('compare.stat.worst'), t('method.colHighWater'), t('method.colSoil')]}
                  rows={(
                    [
                      [t('common.recommended'), data.recommended.metrics],
                      [t('common.currentFitted'), data.current.metrics],
                      [t('method.asFarmedRow'), data.currentAsFarmed.metrics],
                    ] as const
                  ).map(([label, m]) => [label, money(m.avgProfitPerAcre, lang), money(m.worst1in5PerAcre, lang), `${af(m.maxWaterAfPerAcre, lang)} AF`, `${whole(m.soilScore, lang)}/100`])}
                  className="min-w-[640px]"
                />
              </div>
            </section>
          )}

          <section id="scenarios" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.scenarios')}</h2>
            <p className="mt-3 max-w-3xl text-base text-text">{t('method.scenariosIntro')}</p>
            <button type="button" onClick={downloadCsv} className="btn btn-primary mt-4">
              <Download aria-hidden="true" className="h-5 w-5" />
              {t('method.download')}
            </button>
            <div className="card mt-5 max-h-[480px] overflow-auto" tabIndex={0} role="region" aria-label={t('method.scenarioCaption')}>
              <DataTable
                caption={t('method.scenarioCaption')}
                head={[t('why.year'), `${t('common.recommended')} $/acre`, `${curLabel} $/acre`, `${t('common.recommended')} AF`, `${curLabel} AF`]}
                rows={data.stressTests.map((s) => [
                  s.year,
                  money(data.recommended.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? 0, lang),
                  money(data.current.metrics.yearlyProfit.find((y) => y.year === s.year)?.profit ?? 0, lang),
                  af(s.recommendedWater, lang),
                  af(s.currentWater, lang),
                ])}
                className="min-w-[560px]"
              />
            </div>
          </section>

          <section id="assumptions" className="scroll-mt-36">
            <h2 className="text-3xl font-semibold">{t('method.sec.assumptions')}</h2>
            <div className="mt-5 grid gap-6 md:grid-cols-2">
              <div className="card">
                <h3 className="text-xl font-semibold">{t('plan.assumptions')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-text">
                  {data.assumptions.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
              <div className="card">
                <h3 className="text-xl font-semibold">{t('method.limitsTitle')}</h3>
                <ul className="mt-3 list-disc space-y-2 pl-5 text-base text-text">
                  {limits.map((a) => (
                    <li key={a}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
            </>
          ) : (
            <div className="skeleton h-[1600px] rounded-card" aria-busy="true" />
          )}
        </div>
      </div>
    </div>
  );
}
